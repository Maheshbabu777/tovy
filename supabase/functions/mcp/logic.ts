// Rules the MCP server shares with the app. The function cannot import from `src/` (it runs on Deno, apart from the app
// bundle), so these are small copies of `src/core/progress.ts` (percentOf, rootOf) and the checks in
// `src/core/sync/tasks.ts`. Keep them in step: `logic.test.ts` uses the same cases as the app's tests.

export type TaskRow = {
  id: string
  user_id?: string
  title: string
  note: string
  due_date: string | null
  due_time: string | null
  kind: 'quick' | 'deep'
  done_at: string | null
  progress: number
  project_id: string | null
  parent_id: string | null
  deleted?: boolean
  created_by?: string | null
  // Spec task-fields (migration 0011).
  priority?: number | null
  deadline?: string | null
  labels?: string[] | null
  repeat?: Repeat | null
  created_at?: string | null
  updated_at?: string | null
}

export type Repeat = { every: 'day' | 'weekday' | 'week' | 'month'; days?: number[]; interval?: number }

const plusDays = (d: string, n: number) => {
  const t = new Date(`${d}T00:00:00Z`)
  t.setUTCDate(t.getUTCDate() + n)
  return t.toISOString().slice(0, 10)
}
const weekdayOf = (d: string) => new Date(`${d}T00:00:00Z`).getUTCDay()

// When a repeating task comes back after it is finished: counted from its due date (today without one), never on or
// before today. A copy of `nextOccurrence` in `src/core/taskFields.ts`; keep them in step.
export function nextOccurrence(from: string | null, repeat: Repeat, today: string): string {
  const n = repeat.interval ?? 1
  const start = from ?? today
  const step = (d: string): string => {
    if (repeat.every === 'day') return plusDays(d, n)
    if (repeat.every === 'weekday') {
      let next = plusDays(d, 1)
      while ([0, 6].includes(weekdayOf(next))) next = plusDays(next, 1)
      return next
    }
    if (repeat.every === 'week') {
      if (!repeat.days?.length) return plusDays(d, 7 * n)
      let next = plusDays(d, 1)
      for (let i = 0; i < 7 * n + 7 && !repeat.days.includes(weekdayOf(next)); i++) next = plusDays(next, 1)
      return next
    }
    const [y, m] = d.split('-').map(Number)
    const want = Number(start.slice(8, 10))
    const last = new Date(Date.UTC(y, m - 1 + n + 1, 0)).getUTCDate()
    return new Date(Date.UTC(y, m - 1 + n, Math.min(want, last))).toISOString().slice(0, 10)
  }
  let at = start
  do at = step(at)
  while (at <= today)
  return at
}

export type ProjectRow = { id: string; name: string; color: string; deleted?: boolean }

export type LogRow = {
  task_id: string
  delta: number
  progress_after: number
  note: string
  source: string
  day: string
  created_at?: string | null
}

const childrenOf = (id: string, all: TaskRow[]) => all.filter((t) => !t.deleted && t.parent_id === id)

// How far a task is, 0 to 100. Done is 100, a task with subtasks is the average of them, anything else its own number.
export function percentOf(task: TaskRow, all: TaskRow[]): number {
  if (task.done_at) return 100
  const kids = childrenOf(task.id, all)
  if (kids.length > 0) return Math.round(kids.reduce((sum, k) => sum + percentOf(k, all), 0) / kids.length)
  return Math.max(0, Math.min(100, Math.round(task.progress ?? 0)))
}

// The top level task a task belongs to (progress is logged there, however deep the change was).
export function rootOf(task: TaskRow, all: TaskRow[]): TaskRow {
  let current = task
  const seen = new Set<string>()
  while (current.parent_id && !seen.has(current.id)) {
    seen.add(current.id)
    const parent = all.find((t) => !t.deleted && t.id === current.parent_id)
    if (!parent) break
    current = parent
  }
  return current
}

export const hasSubtasks = (task: TaskRow, all: TaskRow[]) => childrenOf(task.id, all).length > 0

// Every live task beneath `id`, at any depth.
export function descendantIds(id: string, all: TaskRow[]): string[] {
  const found: string[] = []
  const queue = [id]
  while (queue.length) {
    const next = queue.shift()!
    for (const c of childrenOf(next, all)) {
      if (!found.includes(c.id)) {
        found.push(c.id)
        queue.push(c.id)
      }
    }
  }
  return found
}

// A real calendar day as YYYY-MM-DD (rejects 2026-02-30).
export function isDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const d = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value
}

export const isTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value)

export const utcDay = (now: Date) => now.toISOString().slice(0, 10)

// Finds a project by id, by name (any case) or by a name prefix that only one project has. "inbox" or "none" means no
// project. Returns undefined when nothing matches, so the caller can list what exists.
export function findProject(ref: string, projects: ProjectRow[]): { id: string | null } | undefined {
  const wanted = ref.trim().toLowerCase()
  if (wanted === 'inbox' || wanted === 'none' || wanted === '') return { id: null }
  const live = projects.filter((p) => !p.deleted)
  const byId = live.find((p) => p.id === ref.trim())
  if (byId) return { id: byId.id }
  const byName = live.filter((p) => p.name.trim().toLowerCase() === wanted)
  if (byName.length === 1) return { id: byName[0].id }
  const byPrefix = live.filter((p) => p.name.trim().toLowerCase().startsWith(wanted))
  if (byPrefix.length === 1) return { id: byPrefix[0].id }
  return undefined
}

// One task as a line an AI app can read back and refer to: title, id, then only what is set.
export function taskLine(task: TaskRow, all: TaskRow[], projects: ProjectRow[], today: string): string {
  const bits: string[] = []
  if (task.done_at) bits.push('done')
  if (task.due_date) {
    const when =
      task.due_date === today
        ? 'today'
        : task.due_date < today && !task.done_at
          ? `overdue, ${task.due_date}`
          : task.due_date
    bits.push(`due ${when}${task.due_time ? ` ${task.due_time.slice(0, 5)}` : ''}`)
  }
  if (task.priority && task.priority < 4) bits.push(`P${task.priority}`)
  if (task.deadline) bits.push(`deadline ${task.deadline}`)
  if (task.labels?.length) bits.push(task.labels.map((l) => `@${l}`).join(' '))
  if (task.repeat) {
    bits.push(`repeats ${task.repeat.every}${task.repeat.days ? ` on ${task.repeat.days.join(',')}` : ''}`)
  }
  const percent = percentOf(task, all)
  if (!task.done_at && percent > 0) bits.push(`${percent}%`)
  const kids = childrenOf(task.id, all)
  if (kids.length) bits.push(`${kids.filter((k) => k.done_at).length} of ${kids.length} subtasks done`)
  const project = projects.find((p) => p.id === task.project_id)
  bits.push(project ? `project ${project.name}` : 'Inbox')
  return `- ${task.title} [${task.id}] (${bits.join(', ')})`
}
