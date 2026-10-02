import { v4 as uuidv4 } from 'uuid'
import { batch, observable, syncState } from '@legendapp/state'
import { syncedSupabase } from '@legendapp/state/sync-plugins/supabase'
import { supabase } from '../db/supabase'
import './syncConfig'
import { createPersistPlugin } from './persistPlugin'

export type TaskKind = 'quick' | 'deep'

export type Task = {
  id: string
  user_id?: string
  title: string
  note: string
  due_date: string | null // YYYY-MM-DD
  due_time: string | null // HH:MM, only with a due date
  kind: TaskKind
  done_at: string | null
  project_id: string | null // null means "No project"
  parent_id: string | null // null means a top level task
  deleted?: boolean
  created_at?: string | null
  updated_at?: string | null
}

export type Project = {
  id: string
  user_id?: string
  name: string
  color: string
  deleted?: boolean
  created_at?: string | null
  updated_at?: string | null
}

export type NewTask = {
  title: string
  note?: string
  dueDate?: string | null
  dueTime?: string | null
  kind?: TaskKind
  projectId?: string | null
  parentId?: string | null
}

export type TaskEdit = { title?: string; note?: string; dueDate?: string | null; dueTime?: string | null }

// The plugin sends all new rows at once. A subtask (or a task in a new project) added in the same offline session as its
// parent can arrive first, and the database refuses it until the parent exists (`check_task_links`). So a refusal that
// says the parent or project does not exist is retried for a few seconds, which gives the parent's own insert time to
// land. Network errors still throw, so the plugin retries them as before.
const LINK_RETRIES = 8
const insertsInFlight = new Map<string, Promise<unknown>>()

async function saveRow(table: 'tasks' | 'projects', row: unknown, mode: 'insert' | 'upsert') {
  const query = supabase.from(table)
  const { data, error } = await (mode === 'insert' ? query.insert(row as never) : query.upsert(row as never)).select()
  if (error?.message?.includes('Failed to fetch')) throw error
  return { data: data?.[0], error }
}

// A task changed while its first insert is still in flight is sent as a whole new insert again. The server already has
// the row (duplicate key) and the change would stay pending forever. So a repeat insert of a row that exists is saved
// as an upsert, which keeps the latest values.
const createWhenLinksExist = (table: 'tasks' | 'projects') => async (input: unknown) => {
  const key = `${table}:${(input as { id: string }).id}`
  const earlier = insertsInFlight.get(key)
  const run = async () => {
    if (earlier) {
      await earlier.catch(() => undefined)
      return saveRow(table, input, 'upsert')
    }
    for (let attempt = 1; ; attempt++) {
      const result = await saveRow(table, input, 'insert')
      const code = result.error?.code
      if (code === '23505') return saveRow(table, input, 'upsert') // the row is already there
      // the parent or project is not saved yet, or the parent's switch to deep has not landed yet
      const waiting = /does not exist|only a deep task/.test(result.error?.message ?? '')
      if (!waiting || attempt >= LINK_RETRIES) return result
      await new Promise((resolve) => setTimeout(resolve, 400 * attempt))
    }
  }
  const promise = run()
  insertsInFlight.set(key, promise)
  try {
    return await promise
  } finally {
    if (insertsInFlight.get(key) === promise) insertsInFlight.delete(key)
  }
}

// One store per signed-in user (see decisions.md): their tasks and projects, kept on the device, queued and synced with
// Supabase in the background. The rules below mirror the database (`check_task_links` in 0003_tasks.sql), so a wrong
// action fails at once on the device, offline too. The database still has the last word.
export function createTasksStore(userId: string) {
  const tasksName = `tasks-${userId}`
  const projectsName = `projects-${userId}`
  const tasks$ = observable(
    syncedSupabase({
      supabase,
      collection: 'tasks',
      create: createWhenLinksExist('tasks') as never,
      realtime: true,
      persist: { name: tasksName, plugin: createPersistPlugin(tasksName), retrySync: true },
    }),
  )
  const projects$ = observable(
    syncedSupabase({
      supabase,
      collection: 'projects',
      realtime: true,
      persist: { name: projectsName, plugin: createPersistPlugin(projectsName), retrySync: true },
    }),
  )

  const liveTasks = (): Task[] =>
    Object.values((tasks$.peek() ?? {}) as Record<string, Task>).filter((t) => t && !t.deleted)
  const liveProjects = (): Project[] =>
    Object.values((projects$.peek() ?? {}) as Record<string, Project>).filter((p) => p && !p.deleted)
  const getTask = (id: string): Task | undefined => {
    const t = (tasks$.peek() as Record<string, Task> | undefined)?.[id]
    return t && !t.deleted ? t : undefined
  }

  function children(id: string): Task[] {
    return liveTasks().filter((t) => t.parent_id === id)
  }

  // Every live task beneath `id`, at any depth.
  function descendantIds(id: string): string[] {
    const found: string[] = []
    const queue = [id]
    while (queue.length) {
      const next = queue.shift()!
      for (const c of children(next)) {
        if (!found.includes(c.id)) {
          found.push(c.id)
          queue.push(c.id)
        }
      }
    }
    return found
  }

  function checkDue(dueDate: string | null | undefined, dueTime: string | null | undefined) {
    if (dueTime && !dueDate) throw new Error('A due time needs a due date')
  }

  function checkParent(taskId: string | null, parentId: string | null | undefined) {
    if (!parentId) return
    const parent = getTask(parentId)
    if (!parent) throw new Error('That parent task does not exist')
    if (parent.kind !== 'deep') throw new Error('Only a deep task can have subtasks')
    if (taskId && (parentId === taskId || descendantIds(taskId).includes(parentId))) {
      throw new Error('A task cannot go under itself or one of its own subtasks')
    }
  }

  function checkProject(projectId: string | null | undefined) {
    if (projectId && !liveProjects().some((p) => p.id === projectId)) throw new Error('That project does not exist')
  }

  return {
    userId,
    tasks$,
    projects$,

    // ----- reading -----
    subtasksOf: (id: string): Task[] => children(id),
    subtaskCount: (id: string): number => children(id).length,
    descendantIds,

    // ----- tasks -----
    addTask(input: NewTask): string {
      checkDue(input.dueDate, input.dueTime)
      checkParent(null, input.parentId)
      checkProject(input.projectId)
      const id = uuidv4()
      tasks$[id].set({
        id,
        title: input.title,
        note: input.note ?? '',
        due_date: input.dueDate ?? null,
        due_time: input.dueTime ?? null,
        kind: input.kind ?? 'quick',
        done_at: null,
        project_id: input.projectId ?? null,
        parent_id: input.parentId ?? null,
        created_at: null,
        updated_at: null,
      })
      return id
    },

    editTask(id: string, patch: TaskEdit) {
      const task = getTask(id)
      if (!task) throw new Error('That task does not exist')
      const dueDate = patch.dueDate !== undefined ? patch.dueDate : task.due_date
      const dueTime = patch.dueTime !== undefined ? patch.dueTime : task.due_time
      checkDue(dueDate, dueTime)
      batch(() => {
        if (patch.title !== undefined) tasks$[id].title.set(patch.title)
        if (patch.note !== undefined) tasks$[id].note.set(patch.note)
        if (patch.dueDate !== undefined) tasks$[id].due_date.set(patch.dueDate)
        if (patch.dueTime !== undefined) tasks$[id].due_time.set(patch.dueTime)
      })
    },

    setDone(id: string, done: boolean) {
      if (!getTask(id)) throw new Error('That task does not exist')
      tasks$[id].done_at.set(done ? new Date().toISOString() : null)
    },

    setKind(id: string, kind: TaskKind) {
      if (!getTask(id)) throw new Error('That task does not exist')
      if (kind === 'quick' && children(id).length > 0) throw new Error('A task with subtasks must stay deep')
      tasks$[id].kind.set(kind)
    },

    moveToProject(id: string, projectId: string | null) {
      if (!getTask(id)) throw new Error('That task does not exist')
      checkProject(projectId)
      tasks$[id].project_id.set(projectId)
    },

    moveUnder(id: string, parentId: string | null) {
      if (!getTask(id)) throw new Error('That task does not exist')
      checkParent(id, parentId)
      tasks$[id].parent_id.set(parentId)
    },

    // Hides the task and everything beneath it at once. Calling the returned `undo` brings them all back. The screen
    // keeps `undo` available for 5 seconds.
    deleteTask(id: string): { ids: string[]; undo: () => void } {
      if (!getTask(id)) throw new Error('That task does not exist')
      const ids = [id, ...descendantIds(id)]
      batch(() => ids.forEach((i) => tasks$[i].deleted.set(true)))
      return { ids, undo: () => batch(() => ids.forEach((i) => tasks$[i].deleted.set(false))) }
    },

    // ----- projects -----
    addProject(name: string, color = 'slate'): string {
      const id = uuidv4()
      projects$[id].set({ id, name, color, created_at: null, updated_at: null })
      return id
    },

    renameProject(id: string, name: string) {
      projects$[id].name.set(name)
    },

    setProjectColor(id: string, color: string) {
      projects$[id].color.set(color)
    },

    // Deleting a project keeps its tasks: they move to "No project".
    deleteProject(id: string) {
      batch(() => {
        liveTasks()
          .filter((t) => t.project_id === id)
          .forEach((t) => tasks$[t.id].project_id.set(null))
        projects$[id].deleted.set(true)
      })
    },

    // The Supabase sync plugin does not fetch again after its realtime channel joins, so a change another device saves
    // between the first load and the join is never seen (see decisions.md). One channel of our own watches both tables
    // and syncs both once it is joined, and once more shortly after. Call it while signed in.
    catchUpAfterRealtime(): () => void {
      let later: ReturnType<typeof setTimeout> | undefined
      const syncBoth = () => {
        void syncState(tasks$).sync()
        void syncState(projects$).sync()
      }
      const channel = supabase
        .channel(`tasks-catch-up-${userId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {})
        .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {})
        .subscribe((status) => {
          if (status !== 'SUBSCRIBED') return
          syncBoth()
          later = setTimeout(syncBoth, 1500)
        })
      return () => {
        clearTimeout(later)
        void supabase.removeChannel(channel)
      }
    },

    // Forgets this user's tasks and projects on this device (used at sign out). Nothing is deleted on the server.
    async dispose(): Promise<void> {
      await Promise.all([syncState(tasks$).reset(), syncState(projects$).reset()])
    },
  }
}

export type TasksStore = ReturnType<typeof createTasksStore>
