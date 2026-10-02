import type { Task } from './sync/tasks'

// Design 0 and 11.9: 1% of progress is 1.5 points, a whole task is 150 points, and 150 points in a day close the ring.
export const POINTS_PER_PERCENT = 1.5
export const DAILY_GOAL = 150

// One logged change. Never edited or removed (the table has no update or delete rule).
export type LogEntry = {
  id: string
  user_id?: string
  task_id: string
  delta: number // percent points gained, or lost (negative)
  progress_after: number
  note: string
  source: string // 'you', or the name of an AI app
  day: string // the person's local day, YYYY-MM-DD
  deleted?: boolean
  created_at?: string | null
  updated_at?: string | null
}

const live = (all: Task[]) => all.filter((t) => t && !t.deleted)
const childrenOf = (id: string, all: Task[]) => live(all).filter((t) => t.parent_id === id)

// How far a task is, 0 to 100. Done is 100. A task with subtasks is the average of them (each counts the same, so
// four subtasks are 25% each). Anything else is the progress it holds.
export function percentOf(task: Task, all: Task[]): number {
  if (task.done_at) return 100
  const kids = childrenOf(task.id, all)
  if (kids.length > 0) return Math.round(kids.reduce((sum, k) => sum + percentOf(k, all), 0) / kids.length)
  return Math.max(0, Math.min(100, Math.round(task.progress ?? 0)))
}

// The top level task a task belongs to. Points are earned on it, however deep the change was.
export function rootOf(task: Task, all: Task[]): Task {
  let current = task
  const seen = new Set<string>()
  while (current.parent_id && !seen.has(current.id)) {
    seen.add(current.id)
    const parent = live(all).find((t) => t.id === current.parent_id)
    if (!parent) break
    current = parent
  }
  return current
}

export const hasSubtasks = (task: Task, all: Task[]) => childrenOf(task.id, all).length > 0

export const pointsFor = (percent: number) => Math.round(percent * POINTS_PER_PERCENT)

// Points earned on a day: every change that day, never below 0.
export function pointsOnDay(entries: LogEntry[], day: string): number {
  const sum = entries.filter((e) => e && !e.deleted && e.day === day).reduce((total, e) => total + e.delta, 0)
  return Math.max(0, pointsFor(sum))
}

export const ringPercent = (points: number) => Math.min(100, Math.round((points / DAILY_GOAL) * 100))
export const pointsToClose = (points: number) => Math.max(0, DAILY_GOAL - points)
export const ringClosed = (points: number) => points >= DAILY_GOAL

// "+30 pts" or "-10 pts" for one log entry.
export const pointsLabel = (delta: number) => `${delta >= 0 ? '+' : '-'}${Math.abs(pointsFor(delta))} pts`

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
// "Tue 3:15 PM" for the progress log. An entry the server has not stamped yet shows its day.
export function logStamp(entry: Pick<LogEntry, 'created_at' | 'day'>): string {
  if (!entry.created_at) return entry.day
  const d = new Date(entry.created_at)
  const hours = d.getHours()
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${WEEKDAYS[d.getDay()]} ${hours % 12 === 0 ? 12 : hours % 12}:${minutes} ${hours < 12 ? 'AM' : 'PM'}`
}

// "2 of 5": how many of a task's direct subtasks are done. Total 0 means it has none.
export function subtaskCount(task: Task, all: Task[]): { done: number; total: number } {
  const kids = childrenOf(task.id, all)
  return { done: kids.filter((k) => k.done_at).length, total: kids.length }
}
