import { dayTitle } from './views'
import { addDays, localDay } from './today'
import type { Task } from './sync/tasks'

// AI apps (spec mcp-server): what the app shows about them, worked out without the network so it can be tested.
// The calls to the server are in `aiApi.ts`.

export type AiAccess = 'write' | 'read' | 'none'

export type AiTool =
  | 'add_task'
  | 'update_task'
  | 'complete_task'
  | 'reopen_task'
  | 'log_progress'
  | 'delete_task'
  | 'restore_task'
  | 'add_project'
  | 'update_project'
  | 'delete_project'

// One change an AI app made, as the database recorded it (table ai_actions, written by triggers in migration 0009).
export type AiAction = {
  id: string
  client_id: string
  client_name: string
  tool: AiTool
  task_id: string | null
  project_id: string | null
  summary: string
  before: Record<string, unknown>
  after: Record<string, unknown>
  created_at: string
  undone_at: string | null
}

// What taking an action back means, step by step. The screen runs the steps through the tasks store (so the change
// shows at once and is logged like any other) or, for deleted rows the store no longer holds, on the server.
export type UndoStep =
  | { kind: 'removeTask'; id: string } // the app added it
  | { kind: 'restoreTasks'; ids: string[] } // the app deleted them
  | { kind: 'setTask'; id: string; fields: TaskFields }
  | { kind: 'setProject'; id: string; fields: ProjectFields }

export type ProjectFields = { name?: string; color?: string; deleted?: boolean }

export type TaskFields = Partial<
  Pick<Task, 'title' | 'note' | 'due_date' | 'due_time' | 'project_id' | 'parent_id' | 'kind' | 'progress' | 'done_at'>
>

const TASK_FIELDS = [
  'title',
  'note',
  'due_date',
  'due_time',
  'project_id',
  'parent_id',
  'kind',
  'progress',
  'done_at',
] as const

// The row an action is about is always its task_id or project_id (set by the database), never an id inside the
// before or after fields.
export function undoPlan(action: AiAction): UndoStep[] {
  const taskId = action.task_id
  const projectId = action.project_id
  switch (action.tool) {
    case 'add_task':
    case 'restore_task':
      return taskId ? [{ kind: 'removeTask', id: taskId }] : []
    case 'add_project':
      return projectId ? [{ kind: 'setProject', id: projectId, fields: { deleted: true } }] : []
    case 'update_project':
    case 'delete_project': {
      if (!projectId) return []
      const fields: ProjectFields = {}
      if (typeof action.before.name === 'string') fields.name = action.before.name
      if (typeof action.before.color === 'string') fields.color = action.before.color
      if (typeof action.before.deleted === 'boolean') fields.deleted = action.before.deleted
      return Object.keys(fields).length ? [{ kind: 'setProject', id: projectId, fields }] : []
    }
    case 'delete_task': {
      if (!taskId) return []
      // The subtasks deleted with it, as the database listed them; the task itself always comes back.
      const listed = Array.isArray(action.before.ids)
        ? (action.before.ids as unknown[]).filter((i) => typeof i === 'string')
        : []
      return [{ kind: 'restoreTasks', ids: [taskId, ...(listed as string[]).filter((i) => i !== taskId)] }]
    }
    default: {
      if (!taskId) return []
      const fields: TaskFields = {}
      for (const key of TASK_FIELDS) {
        if (key in action.before) (fields as Record<string, unknown>)[key] = action.before[key]
      }
      // A time as Postgres returns it ("15:00:00") is kept as the app stores it ("15:00").
      if (typeof fields.due_time === 'string') fields.due_time = fields.due_time.slice(0, 5)
      return Object.keys(fields).length ? [{ kind: 'setTask', id: taskId, fields }] : []
    }
  }
}

// Undo is offered while the action is not undone yet, and only if there is something to undo.
export const canUndo = (action: AiAction) => !action.undone_at && undoPlan(action).length > 0

export type ActivityDay = { day: string; title: string; actions: AiAction[] }

// The activity feed, newest day first, newest first within a day.
export function activityByDay(actions: AiAction[], now: Date): ActivityDay[] {
  const today = localDay(now)
  const byDay = new Map<string, AiAction[]>()
  for (const a of [...actions].sort((x, y) => y.created_at.localeCompare(x.created_at))) {
    const day = localDay(new Date(a.created_at))
    byDay.set(day, [...(byDay.get(day) ?? []), a])
  }
  return [...byDay.keys()]
    .sort()
    .reverse()
    .map((day) => ({
      day,
      title: day === today ? 'Today' : day === addDays(today, -1) ? 'Yesterday' : dayTitle(day, now),
      actions: byDay.get(day)!,
    }))
}

// "Claude", or a stand-in when the consent screen never saw the app's name.
export const appName = (name: string | null | undefined) => (name && name.trim() ? name.trim() : 'An AI app')

export type TrashItem = { task: Task; ids: string[]; subtasks: number }

// Trash shows each deleted task once, with the deleted subtasks that go with it (restoring the task brings them back
// too). A subtask whose parent is also in Trash is not listed on its own.
export function trashItems(deleted: Task[]): TrashItem[] {
  const inTrash = new Set(deleted.map((t) => t.id))
  const childrenOf = (id: string) => deleted.filter((t) => t.parent_id === id)
  const below = (id: string): string[] => childrenOf(id).flatMap((c) => [c.id, ...below(c.id)])
  return deleted
    .filter((t) => !t.parent_id || !inTrash.has(t.parent_id))
    .sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? ''))
    .map((task) => {
      const ids = [task.id, ...below(task.id)]
      return { task, ids, subtasks: ids.length - 1 }
    })
}

// Days left before a deleted task leaves Trash (30 days after it was deleted).
export function daysLeft(deletedAt: string | null | undefined, now: Date): number {
  if (!deletedAt) return 30
  const gone = new Date(deletedAt).getTime() + 30 * 24 * 60 * 60 * 1000
  return Math.max(0, Math.ceil((gone - now.getTime()) / (24 * 60 * 60 * 1000)))
}

// Where AI apps connect: the MCP Edge Function of this Supabase project.
export const mcpUrl = (supabaseUrl: string | undefined) =>
  supabaseUrl ? `${supabaseUrl.replace(/\/+$/, '')}/functions/v1/mcp` : ''

// The address people paste into an AI app. On the web it is Tovy's own site (`/mcp` forwards to the server, see
// api/mcp.ts), so the app shows Tovy's name and icon. Elsewhere, or on a local dev server, the server's own address.
export function connectAddress(origin: string | undefined, supabaseUrl: string | undefined): string {
  if (origin && /^https:\/\//.test(origin) && !/localhost|127\.0\.0\.1/.test(origin)) return `${origin}/mcp`
  return mcpUrl(supabaseUrl)
}

// The server side is not switched on yet: the migration has not reached this database (the table is missing), or the
// OAuth server is off in the dashboard. The screens then explain instead of showing an error.
export function isNotSetUp(error: { code?: string; message?: string; status?: number } | null | undefined): boolean {
  if (!error) return false
  if (error.code === '42P01' || error.code === 'PGRST205' || error.code === 'PGRST204') return true
  if (error.status === 404) return true
  return /does not exist|could not find the table|oauth.*(disabled|not enabled)|not found/i.test(error.message ?? '')
}

export const ACCESS_LABEL: Record<AiAccess, string> = {
  write: 'Can make changes',
  read: 'Read only',
  none: 'No access',
}
