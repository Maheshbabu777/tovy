import type { Task } from './sync/tasks'
import { addDays, byCreated, byDue, dueLabel, localDay } from './today'

// What the Inbox and Upcoming screens and the navigation counts show. Plain functions of the tasks and the clock.

const openTopLevel = (tasks: Task[]) => tasks.filter((t) => t && !t.deleted && !t.parent_id && !t.done_at)

// Inbox: captured tasks that are not filed in a project yet, oldest first.
export function inboxTasks(tasks: Task[]): Task[] {
  return openTopLevel(tasks)
    .filter((t) => !t.project_id)
    .sort(byCreated)
}

// The number next to Today in the navigation: what is late or due today.
export function todayCount(tasks: Task[], now: Date): number {
  const today = localDay(now)
  return openTopLevel(tasks).filter((t) => t.due_date && t.due_date <= today).length
}

export type UpcomingDay = { day: string; title: string; tasks: Task[] }

// Upcoming: late tasks first, then every one of the next `days` days (empty ones too, so the week reads as a week),
// then any later day that has something on it.
export function upcoming(tasks: Task[], now: Date, days = 7): { overdue: Task[]; days: UpcomingDay[] } {
  const today = localDay(now)
  const open = openTopLevel(tasks).filter((t) => t.due_date)
  const byDay = new Map<string, Task[]>()
  for (const t of open) {
    if (t.due_date! < today) continue
    byDay.set(t.due_date!, [...(byDay.get(t.due_date!) ?? []), t])
  }
  const week = Array.from({ length: days }, (_, i) => addDays(today, i))
  const later = [...byDay.keys()].filter((d) => !week.includes(d)).sort()
  return {
    overdue: open.filter((t) => t.due_date! < today).sort(byDue),
    days: [...week, ...later].map((day) => ({
      day,
      title: dayTitle(day, now),
      tasks: (byDay.get(day) ?? []).sort(byDue),
    })),
  }
}

// "Today · Sat 3 Oct", "Tomorrow · Sun 4 Oct", otherwise "Mon 5 Oct".
export function dayTitle(day: string, now: Date): string {
  const today = localDay(now)
  const plain = dueLabel({ due_date: day, due_time: null }, new Date(2000, 0, 1))
  if (day === today) return `Today · ${plain}`
  if (day === addDays(today, 1)) return `Tomorrow · ${plain}`
  return plain
}

// The Today title: a line that fits the time of day, with the first name when it is known.
//   0:00 to 4:59 "Up late", 5:00 to 11:59 "Good morning", 12:00 to 16:59 "Good afternoon", 17:00 to 21:59 "Good
//   evening", 22:00 to 23:59 "Winding down".
export function timelyGreeting(now: Date, firstName?: string | null): string {
  const h = now.getHours()
  const line =
    h < 5 ? 'Up late' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 22 ? 'Good evening' : 'Winding down'
  const name = firstName?.trim()
  return name ? `${line}, ${name}` : line
}

// One line under the Today title: what is late, what is due and what is done today. Parts that are zero are left out.
export function daySummary(g: { overdue: unknown[]; dueToday: unknown[]; doneToday: unknown[] }): string {
  const parts = [
    g.overdue.length ? `${g.overdue.length} overdue` : '',
    g.dueToday.length ? `${g.dueToday.length} due today` : '',
    g.doneToday.length ? `${g.doneToday.length} done` : '',
  ].filter(Boolean)
  return parts.length ? parts.join(' · ') : 'Nothing due today'
}

// The next `count` days for the Upcoming week strip, with whether each has an open task.
export function weekStrip(
  tasks: Task[],
  now: Date,
  count = 7,
): { day: string; weekday: string; date: number; busy: boolean }[] {
  const today = localDay(now)
  const open = new Set(openTopLevel(tasks).map((t) => t.due_date))
  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return Array.from({ length: count }, (_, i) => {
    const day = addDays(today, i)
    const [y, m, d] = day.split('-').map(Number)
    return { day, weekday: WEEKDAYS[new Date(y, m - 1, d).getDay()], date: d, busy: open.has(day) }
  })
}
