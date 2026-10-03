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

// Upcoming: late tasks first, then every one of the next `days` days (empty ones too, so the calendar reads as days in
// a row), then any later day that has something on it. The screen asks for more days as the person scrolls or jumps.
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

// The line under the Today title (Paper, Today): "Saturday 3 October · 5 tasks", counting what is late, due today and
// already done today.
export function todayLine(now: Date, count: number): string {
  const day = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()]
  const tasks = count === 0 ? 'nothing due' : count === 1 ? '1 task' : `${count} tasks`
  return `${day} ${now.getDate()} ${MONTHS[now.getMonth()]} · ${tasks}`
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

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const parts = (day: string) => day.split('-').map(Number) as [number, number, number]

// The Monday of the week a day is in. Weeks in the calendar start on Monday.
export function weekStart(day: string): string {
  const [y, m, d] = parts(day)
  const weekday = new Date(y, m - 1, d).getDay() // 0 is Sunday
  return addDays(day, -((weekday + 6) % 7))
}

// "October 2026" for any day in that month.
export function monthTitle(day: string): string {
  const [y, m] = parts(day)
  return `${MONTHS[m - 1]} ${y}`
}

// The first day of the month `months` away from the month a day is in ("2026-10-17", 2 → "2026-12-01").
export function shiftMonth(day: string, months: number): string {
  const [y, m] = parts(day)
  return localDay(new Date(y, m - 1 + months, 1))
}

export type CalendarDay = {
  day: string
  weekday: string
  date: number
  busy: boolean // an open task is due that day
  past: boolean // before today
  today: boolean
}

const calendarDay = (day: string, today: string, busy: Set<string | null>): CalendarDay => {
  const [y, m, d] = parts(day)
  return {
    day,
    weekday: WEEKDAYS[new Date(y, m - 1, d).getDay()],
    date: d,
    busy: busy.has(day),
    past: day < today,
    today: day === today,
  }
}

const busyDays = (tasks: Task[]) => new Set(openTopLevel(tasks).map((t) => t.due_date))

// The Upcoming week strip: Monday to Sunday of the week that starts on `start` (this week when left out), with
// whether each day has an open task, is already over or is today.
export function weekStrip(tasks: Task[], now: Date, start?: string): CalendarDay[] {
  const today = localDay(now)
  const monday = weekStart(start ?? today)
  const busy = busyDays(tasks)
  return Array.from({ length: 7 }, (_, i) => calendarDay(addDays(monday, i), today, busy))
}

// The month picker: the weeks (Monday first) that cover the month a day is in. Days of the next and previous month
// that fill the first and last week have `inMonth` false.
export function monthGrid(tasks: Task[], now: Date, month: string): (CalendarDay & { inMonth: boolean })[][] {
  const today = localDay(now)
  const first = shiftMonth(month, 0)
  const next = shiftMonth(month, 1)
  const busy = busyDays(tasks)
  const weeks: (CalendarDay & { inMonth: boolean })[][] = []
  for (let monday = weekStart(first); monday < next; monday = addDays(monday, 7)) {
    weeks.push(
      Array.from({ length: 7 }, (_, i) => {
        const day = addDays(monday, i)
        return { ...calendarDay(day, today, busy), inMonth: day >= first && day < next }
      }),
    )
  }
  return weeks
}

// How many days from today to `day`, counting both (today itself is 1).
export function daysThrough(now: Date, day: string): number {
  const today = localDay(now)
  const [y, m, d] = parts(day)
  const [ty, tm, td] = parts(today)
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 86_400_000) + 1
}

// The Completed page: finished top level tasks grouped by the day they were finished, newest day first, newest first
// within a day, for the last `days` days.
export function completedByDay(tasks: Task[], now: Date, days = 30): UpcomingDay[] {
  const since = addDays(localDay(now), -(days - 1))
  const byDay = new Map<string, Task[]>()
  for (const t of tasks) {
    if (!t || t.deleted || t.parent_id || !t.done_at) continue
    const day = localDay(new Date(t.done_at))
    if (day < since) continue
    byDay.set(day, [...(byDay.get(day) ?? []), t])
  }
  return [...byDay.keys()]
    .sort()
    .reverse()
    .map((day) => ({
      day,
      title: day === localDay(now) ? 'Today' : day === addDays(localDay(now), -1) ? 'Yesterday' : dayTitle(day, now),
      tasks: byDay.get(day)!.sort((a, b) => (b.done_at ?? '').localeCompare(a.done_at ?? '')),
    }))
}
