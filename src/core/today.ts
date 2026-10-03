import { percentOf } from './progress'
import type { Task } from './sync/tasks'

// What the Today screen shows and how it words it (design 11.6, 7.14). Plain functions of the tasks and the clock, so
// they can be tested without a screen.

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const pad = (n: number) => String(n).padStart(2, '0')

// The calendar day on the device, as YYYY-MM-DD (due dates are plain dates with no time zone).
export function localDay(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function addDays(day: string, days: number): string {
  const [y, m, d] = day.split('-').map(Number)
  return localDay(new Date(y, m - 1, d + days))
}

export function greeting(now: Date): string {
  const h = now.getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

// "Fri 2 Oct"
export function dateLine(now: Date): string {
  return `${WEEKDAYS[now.getDay()]} ${now.getDate()} ${MONTHS[now.getMonth()]}`
}

// "4 PM", "5:30 PM"
export function timeLabel(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}${m ? `:${pad(m)}` : ''} ${h < 12 ? 'AM' : 'PM'}`
}

// "Today", "Tomorrow", "Yesterday", otherwise "Wed 8 Oct", with the time after a comma. No date: "No date".
export function dueLabel(task: Pick<Task, 'due_date' | 'due_time'>, now: Date): string {
  if (!task.due_date) return 'No date'
  const today = localDay(now)
  const [y, m, d] = task.due_date.split('-').map(Number)
  const base =
    task.due_date === today
      ? 'Today'
      : task.due_date === addDays(today, 1)
        ? 'Tomorrow'
        : task.due_date === addDays(today, -1)
          ? 'Yesterday'
          : `${WEEKDAYS[new Date(y, m - 1, d).getDay()]} ${d} ${MONTHS[m - 1]}`
  return task.due_time ? `${base}, ${timeLabel(task.due_time)}` : base
}

export const isOverdue = (task: Pick<Task, 'due_date' | 'done_at'>, now: Date) =>
  !task.done_at && !!task.due_date && task.due_date < localDay(now)

export type TodayGroups = {
  overdue: Task[]
  dueToday: Task[]
  inProgress: Task[]
  comingUp: Task[]
  anytime: Task[]
  doneToday: Task[]
}

export const byCreated = (a: Task, b: Task) =>
  (a.created_at ?? '~').localeCompare(b.created_at ?? '~') || a.id.localeCompare(b.id)
// Earlier first, a task with a time before one without on the same day, then oldest first.
export const byDue = (a: Task, b: Task) =>
  (a.due_date ?? '').localeCompare(b.due_date ?? '') ||
  (a.due_time ?? '99:99').localeCompare(b.due_time ?? '99:99') ||
  byCreated(a, b)

// Top level tasks only: a subtask lives under its parent. A task is in one group: Overdue, Due today, In progress,
// Coming up or Anytime. Deleted tasks never show. A done task shows only on the day
// it was finished (in "Done today"), after that it is found in its project.
const paused = (t: Task) => (t.repeat as { paused?: boolean } | null | undefined)?.paused === true

export function groupTasks(tasks: Task[], now: Date): TodayGroups {
  const today = localDay(now)
  // A paused habit is off every list until it is resumed (stage 6).
  const live = tasks.filter((t) => t && !t.deleted && !t.parent_id && !paused(t))
  const open = live.filter((t) => !t.done_at)
  const overdue = open.filter((t) => t.due_date && t.due_date < today)
  const dueToday = open.filter((t) => t.due_date === today)
  // Partly done tasks that are not late and not due today (design 11.6, "In progress"). They leave their date group.
  const inProgress = open.filter((t) => {
    const p = percentOf(t, tasks)
    return p > 0 && p < 100 && !(t.due_date && t.due_date <= today)
  })
  const placed = new Set(inProgress.map((t) => t.id))
  return {
    overdue: overdue.sort(byDue),
    dueToday: dueToday.sort(byDue),
    // dated ones first, soonest first, then the ones with no date
    inProgress: inProgress.sort((a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999') || byDue(a, b)),
    comingUp: open.filter((t) => t.due_date && t.due_date > today && !placed.has(t.id)).sort(byDue),
    anytime: open.filter((t) => !t.due_date && !placed.has(t.id)).sort(byCreated),
    doneToday: live
      .filter((t) => t.done_at && localDay(new Date(t.done_at)) === today)
      .sort((a, b) => (a.done_at ?? '').localeCompare(b.done_at ?? '')),
  }
}

// The next days as chip choices: Today, Tomorrow, then the weekday and date ("Fri 3").
export function nextDays(now: Date, count = 7): { day: string; label: string }[] {
  const today = localDay(now)
  return Array.from({ length: count }, (_, i) => {
    const day = addDays(today, i)
    const [y, m, d] = day.split('-').map(Number)
    const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : `${WEEKDAYS[new Date(y, m - 1, d).getDay()]} ${d}`
    return { day, label }
  })
}
