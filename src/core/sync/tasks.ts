import { v4 as uuidv4 } from 'uuid'
import { batch, observable, syncState } from '@legendapp/state'
import { syncedSupabase } from '@legendapp/state/sync-plugins/supabase'
import { supabase } from '../db/supabase'
import './syncConfig'
import { createPersistPlugin } from './persistPlugin'
import { hasSubtasks, percentOf, rootOf, type LogEntry } from '../progress'
import { localDay } from '../today'
import { nextOccurrence, readRepeat, type Priority, type Repeat } from '../taskFields'

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
  progress?: number // 0 to 100, how far a deep task is (the server default is 0)
  project_id: string | null // null means "No project"
  parent_id: string | null // null means a top level task
  // The AI app that added it (its OAuth client id), set only by the MCP server. The app never writes it, so it works
  // before and after migration 0009.
  created_by?: string | null
  // Spec task-fields (migration 0011). Optional: rows saved on a device before the migration may not have them.
  priority?: number | null // 1 highest to 4 none
  deadline?: string | null // YYYY-MM-DD, must be done by
  labels?: string[] | null
  repeat?: Repeat | null
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
  priority?: Priority
  deadline?: string | null
  labels?: string[]
  repeat?: Repeat | null
}

export type TaskEdit = {
  title?: string
  note?: string
  dueDate?: string | null
  dueTime?: string | null
  priority?: Priority
  deadline?: string | null
  labels?: string[]
  repeat?: Repeat | null
}

// The plugin does not wait for one save to finish before it sends the next, and a save takes about half a second. So a
// quick sequence (add a task, make it deep, add a subtask, delete, undo) reaches the server in any order: an update
// before its insert changes nothing (and is lost), a subtask arrives before its parent and is refused, a task is
// inserted twice, and the last of three quick changes to one task is not always the one that wins. That left changes
// stuck as pending, or the server and the screen disagreeing. So every save of a store goes through one queue, one at a
// time, in the order the changes were made.
const LINK_RETRIES = 8
// The server changes a row's `updated_at` on every save and tells us, and the plugin can read that as a new change and
// send the same update again, over and over (seen with a task and its subtasks deleted together, the status stayed
// "pending" and the Undo bar never went away). Sending the very same update for a row again within this time, after it
// was saved successfully, changes nothing on the server, so it is not sent.
const REPEAT_UPDATE_MS = 2000
type Table = 'tasks' | 'projects' | 'progress_log'

function createServerWrites() {
  let tail: Promise<unknown> = Promise.resolve()
  const serial = <T>(job: () => Promise<T>): Promise<T> => {
    const run = tail.then(job, job)
    tail = run.catch(() => undefined)
    return run
  }

  async function save(table: Table, row: unknown, mode: 'insert' | 'update' | 'upsert') {
    const query = supabase.from(table)
    const { id } = row as { id: string }
    const request =
      mode === 'insert'
        ? query.insert(row as never)
        : mode === 'upsert'
          ? query.upsert(row as never)
          : query.update(row as never).eq('id', id)
    const { data, error } = await request.select()
    if (error?.message?.includes('Failed to fetch')) throw error // offline: the plugin retries later
    return { data: data?.[0], error }
  }

  return {
    // Resolves when every save queued so far has finished.
    idle: () => tail.then(() => undefined),
    // A subtask (or a task in a new project) can still be refused because its parent is not saved yet, or its parent's
    // switch to deep has not landed yet (they are in the same batch of changes). The queue is free while we wait, so
    // the parent's own save goes through, then this one is tried again.
    create: (table: Table) => async (input: unknown) => {
      for (let attempt = 1; ; attempt++) {
        const result = await serial(() => save(table, input, 'insert'))
        if (result.error?.code === '23505') return serial(() => save(table, input, 'upsert')) // already saved
        const waiting = /does not exist|only a deep task/.test(result.error?.message ?? '')
        if (!waiting || attempt >= LINK_RETRIES) return result
        await new Promise((resolve) => setTimeout(resolve, 400 * attempt))
      }
    },
    update: (table: Table) => {
      const lastSaved = new Map<string, { body: string; at: number; result: Awaited<ReturnType<typeof save>> }>()
      return async (input: unknown) =>
        serial(async () => {
          const { id } = input as { id: string }
          const body = JSON.stringify(input)
          const last = lastSaved.get(id)
          if (last && last.body === body && Date.now() - last.at < REPEAT_UPDATE_MS) return last.result
          const result = await save(table, input, 'update')
          if (result.data) lastSaved.set(id, { body, at: Date.now(), result })
          else lastSaved.delete(id)
          return result
        })
    },
  }
}

// One store per signed-in user (see decisions.md): their tasks and projects, kept on the device, queued and synced with
// Supabase in the background. The rules below mirror the database (`check_task_links` in 0003_tasks.sql), so a wrong
// action fails at once on the device, offline too. The database still has the last word.
export function createTasksStore(userId: string) {
  const writes = createServerWrites()
  const tasksName = `tasks-${userId}`
  const projectsName = `projects-${userId}`
  const tasks$ = observable(
    syncedSupabase({
      supabase,
      collection: 'tasks',
      create: writes.create('tasks') as never,
      update: writes.update('tasks') as never,
      realtime: true,
      persist: { name: tasksName, plugin: createPersistPlugin(tasksName), retrySync: true },
    }),
  )
  const projects$ = observable(
    syncedSupabase({
      supabase,
      collection: 'projects',
      create: writes.create('projects') as never,
      update: writes.update('projects') as never,
      realtime: true,
      persist: { name: projectsName, plugin: createPersistPlugin(projectsName), retrySync: true },
    }),
  )

  // The progress log: entries are only ever added. The server refuses edits, and the plugin must never try one.
  const logsName = `progress-log-${userId}`
  const logs$ = observable(
    syncedSupabase({
      supabase,
      collection: 'progress_log',
      create: writes.create('progress_log') as never,
      update: (async (input: unknown) => ({ data: input, error: null })) as never,
      realtime: true,
      persist: { name: logsName, plugin: createPersistPlugin(logsName), retrySync: true },
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

  // Counts deletes per task, so an Undo's late re-check can tell that the person deleted that task again since and
  // stand down for it.
  const deleteEpoch = new Map<string, number>()

  // Runs a change to a task and, if it moved the top level task it belongs to, logs how far (design 11.9: "Each logged
  // change adds a log entry"). Points are earned on the top level task, however deep the change was.
  function applyChange(id: string, mutate: () => void, opts: { note?: string; source?: string } = {}) {
    const rootId = rootOf(getTask(id)!, liveTasks()).id
    const before = percentOf(getTask(rootId)!, liveTasks())
    batch(() => {
      mutate()
      const root = getTask(rootId)
      if (!root) return
      const after = percentOf(root, liveTasks())
      if (after === before) return
      const entryId = uuidv4()
      const entry: LogEntry = {
        id: entryId,
        task_id: rootId,
        delta: after - before,
        progress_after: after,
        note: opts.note?.trim() ?? '',
        source: opts.source ?? 'you',
        day: localDay(new Date()),
      }
      logs$[entryId].set(entry)
    })
  }

  return {
    userId,
    tasks$,
    projects$,
    logs$,

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
        priority: input.priority ?? 4,
        deadline: input.deadline ?? null,
        labels: input.labels ?? [],
        repeat: input.repeat ?? null,
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
        if (patch.priority !== undefined) tasks$[id].priority.set(patch.priority)
        if (patch.deadline !== undefined) tasks$[id].deadline.set(patch.deadline)
        if (patch.labels !== undefined) tasks$[id].labels.set(patch.labels)
        if (patch.repeat !== undefined) tasks$[id].repeat.set(patch.repeat)
      })
    },

    // Finishing a task is worth the rest of its progress, reopening it takes that back (design 7.14).
    // A repeating task is not closed: it moves to its next date, and the finish is logged (spec task-fields). Returns
    // that next date, so the screen can say when it comes back and undo it.
    setDone(id: string, done: boolean): { next: string | null } {
      const task = getTask(id)
      if (!task) throw new Error('That task does not exist')
      const repeat = readRepeat(task.repeat)
      if (done && repeat && !task.done_at) {
        const next = nextOccurrence(task.due_date, repeat, localDay(new Date()))
        batch(() => {
          tasks$[id].due_date.set(next)
          tasks$[id].progress.set(0)
          const entryId = uuidv4()
          logs$[entryId].set({
            id: entryId,
            task_id: rootOf(task, liveTasks()).id,
            delta: 100 - (task.progress ?? 0),
            progress_after: 100,
            note: '',
            source: 'you',
            day: localDay(new Date()),
          } as LogEntry)
        })
        return { next }
      }
      applyChange(id, () => {
        tasks$[id].done_at.set(done ? new Date().toISOString() : null)
        tasks$[id].progress.set(done ? 100 : 0)
      })
      return { next: null }
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
      ids.forEach((i) => deleteEpoch.set(i, (deleteEpoch.get(i) ?? 0) + 1))
      // Once the server confirms a delete the plugin drops the row from the store, so an Undo has to bring the whole
      // row back, not just switch `deleted` off.
      const snapshot = ids.map((i) => ({ ...(tasks$[i].peek() as Task) }))
      batch(() => ids.forEach((i) => tasks$[i].deleted.set(true)))
      const gone = () => snapshot.filter((t) => !tasks$[t.id].peek() || tasks$[t.id].deleted.peek() === true)
      const restoreTasks = (rows: Task[]) =>
        batch(() =>
          rows.forEach((t) => {
            if (tasks$[t.id].peek()) tasks$[t.id].deleted.set(false)
            else tasks$[t.id].set({ ...t, deleted: false })
          }),
        )
      const restore = () => restoreTasks(gone())
      return {
        ids,
        undo: () => {
          restore()
          const epochAtUndo = new Map(ids.map((i) => [i, deleteEpoch.get(i) ?? 0]))
          // An Undo made while the delete is still being saved can be taken for "no change" by the plugin, and the
          // saved delete then comes back from the server. Once the saves are done, put the task back again if so.
          void (async () => {
            await writes.idle()
            await new Promise((resolve) => setTimeout(resolve, 600))
            // only the tasks not deleted again since this Undo
            const lost = gone().filter((t) => (deleteEpoch.get(t.id) ?? 0) === epochAtUndo.get(t.id))
            if (lost.length) restoreTasks(lost)
          })()
        },
      }
    },

    // Sets how far a task is, 0 to 100, and logs the change. A quick task becomes deep (only a deep task can be partly
    // done), 100 finishes it and going back below 100 reopens it. A task with subtasks follows them, so it is refused.
    setProgress(id: string, value: number, opts: { note?: string; source?: string } = {}) {
      const task = getTask(id)
      if (!task) throw new Error('That task does not exist')
      if (hasSubtasks(task, liveTasks())) throw new Error('Progress follows the subtasks of this task')
      const progress = Math.max(0, Math.min(100, Math.round(value)))
      applyChange(
        id,
        () => {
          if (task.kind === 'quick' && progress > 0 && progress < 100) tasks$[id].kind.set('deep')
          tasks$[id].progress.set(progress)
          if (progress === 100 && !task.done_at) tasks$[id].done_at.set(new Date().toISOString())
          if (progress < 100 && task.done_at) tasks$[id].done_at.set(null)
        },
        opts,
      )
    },

    // ----- projects -----
    addProject(name: string, color = 'slate'): string {
      const id = uuidv4()
      projects$[id].set({ id, name, color })
      return id
    },

    renameProject(id: string, name: string) {
      projects$[id].name.set(name)
    },

    setProjectColor(id: string, color: string) {
      projects$[id].color.set(color)
    },

    // Deleting a project keeps its tasks: they move to "No project". `undo` puts the project and those tasks back.
    deleteProject(id: string): { undo: () => void } {
      const project = { ...(projects$[id].peek() as Project) }
      const moved = liveTasks()
        .filter((t) => t.project_id === id)
        .map((t) => t.id)
      batch(() => {
        moved.forEach((i) => tasks$[i].project_id.set(null))
        projects$[id].deleted.set(true)
      })
      const restore = () =>
        batch(() => {
          if (projects$[id].peek()) projects$[id].deleted.set(false)
          else projects$[id].set({ ...project, deleted: false })
          moved.forEach((i) => tasks$[i].peek() && tasks$[i].project_id.set(id))
        })
      return { undo: restore }
    },

    // The Supabase sync plugin does not fetch again after its realtime channel joins, so a change another device saves
    // between the first load and the join is never seen (see decisions.md). One channel of our own watches both tables
    // and syncs both once it is joined, and once more shortly after. Call it while signed in.
    catchUpAfterRealtime(): () => void {
      let later: ReturnType<typeof setTimeout> | undefined
      // Seen in the request log: a fetch that landed while saves were still going out left the row saved last without
      // its server `created_at`, and its next change was then sent as a second insert. Cause not proven. The fetch now
      // waits until nothing is waiting to be saved.
      const unsent = () =>
        (syncState(tasks$).numPendingSets.peek() ?? 0) +
        (syncState(projects$).numPendingSets.peek() ?? 0) +
        (syncState(logs$).numPendingSets.peek() ?? 0)
      const syncBoth = (tries = 0) => {
        if (unsent() > 0 && tries < 20) {
          later = setTimeout(() => syncBoth(tries + 1), 500)
          return
        }
        void syncState(tasks$).sync()
        void syncState(projects$).sync()
        void syncState(logs$).sync()
      }
      const channel = supabase
        .channel(`tasks-catch-up-${userId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {})
        .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {})
        .on('postgres_changes', { event: '*', schema: 'public', table: 'progress_log' }, () => {})
        .subscribe((status) => {
          if (status !== 'SUBSCRIBED') return
          syncBoth()
          later = setTimeout(() => syncBoth(), 1500)
        })
      return () => {
        clearTimeout(later)
        void supabase.removeChannel(channel)
      }
    },

    // Forgets this user's tasks and projects on this device (used at sign out). Nothing is deleted on the server.
    async dispose(): Promise<void> {
      await Promise.all([syncState(tasks$).reset(), syncState(projects$).reset(), syncState(logs$).reset()])
    },
  }
}

export type TasksStore = ReturnType<typeof createTasksStore>
