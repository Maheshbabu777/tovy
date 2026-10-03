import { addDays, localDay } from './today'

// Priorities, deadlines, labels and repeats (spec task-fields). Plain functions, so they can be tested.

export type Priority = 1 | 2 | 3 | 4 // 1 highest, 4 none

// How a task comes back. `days` (0 Sunday to 6 Saturday) only for a weekly repeat on chosen days; `interval` repeats
// every n days or weeks (1 when left out).
export type Repeat = { every: 'day' | 'weekday' | 'week' | 'month'; days?: number[]; interval?: number }

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const dayOf = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}
const weekdayOf = (iso: string) => dayOf(iso).getDay()

// Read a stored repeat defensively: anything that is not a known shape counts as no repeat.
export function readRepeat(value: unknown): Repeat | null {
  if (!value || typeof value !== 'object') return null
  const r = value as Partial<Repeat>
  if (r.every !== 'day' && r.every !== 'weekday' && r.every !== 'week' && r.every !== 'month') return null
  const days = Array.isArray(r.days) ? r.days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6) : undefined
  const interval = Number.isInteger(r.interval) && (r.interval as number) > 1 ? r.interval : undefined
  return {
    every: r.every,
    ...(days?.length ? { days: [...new Set(days)].sort() } : {}),
    ...(interval ? { interval } : {}),
  }
}

export const priorityOf = (task: { priority?: number | null }): Priority =>
  task.priority === 1 || task.priority === 2 || task.priority === 3 ? task.priority : 4

// The date a repeating task comes back on after it is finished, counted from its due date (or today when it has none).
// Never on or before today: finishing late moves it to the next time still ahead.
export function nextOccurrence(from: string | null, repeat: Repeat, today: string): string {
  let at = from ?? today
  const n = repeat.interval ?? 1
  const step = (d: string) => {
    switch (repeat.every) {
      case 'day':
        return addDays(d, n)
      case 'weekday': {
        let next = addDays(d, 1)
        while ([0, 6].includes(weekdayOf(next))) next = addDays(next, 1)
        return next
      }
      case 'week': {
        if (!repeat.days?.length) return addDays(d, 7 * n)
        let next = addDays(d, 1)
        for (let i = 0; i < 7 * n + 7; i++) {
          if (repeat.days.includes(weekdayOf(next))) return next
          next = addDays(next, 1)
        }
        return next
      }
      case 'month': {
        const day = dayOf(d)
        const want = dayOf(from ?? today).getDate()
        const target = new Date(day.getFullYear(), day.getMonth() + n, 1)
        const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
        return localDay(new Date(target.getFullYear(), target.getMonth(), Math.min(want, last)))
      }
    }
  }
  do at = step(at)
  while (at <= today)
  return at
}

// The first day a new repeating task is due when no date was given: today if it fits, else the next day that does.
export function firstOccurrence(repeat: Repeat, today: string): string {
  if (repeat.every === 'weekday' && [0, 6].includes(weekdayOf(today))) return nextOccurrence(today, repeat, today)
  if (repeat.every === 'week' && repeat.days?.length && !repeat.days.includes(weekdayOf(today)))
    return nextOccurrence(today, repeat, today)
  return today
}

// "Every day", "Every 3 days", "Weekdays", "Every Mon, Thu", "Every 2 weeks", "Every month".
export function repeatLabel(repeat: Repeat): string {
  const n = repeat.interval ?? 1
  switch (repeat.every) {
    case 'day':
      return n > 1 ? `Every ${n} days` : 'Every day'
    case 'weekday':
      return 'Weekdays'
    case 'week':
      if (repeat.days?.length) return `Every ${repeat.days.map((d) => WEEKDAY[d]).join(', ')}`
      return n > 1 ? `Every ${n} weeks` : 'Every week'
    case 'month':
      return n > 1 ? `Every ${n} months` : 'Every month'
  }
}

// "Deadline Fri 9 Oct", and whether it is close enough to show in red (today, tomorrow, the day after, or past).
export function deadlineInfo(deadline: string, now: Date): { label: string; soon: boolean } {
  const d = dayOf(deadline)
  const today = localDay(now)
  const label =
    deadline === today
      ? 'Deadline today'
      : deadline === addDays(today, 1)
        ? 'Deadline tomorrow'
        : `Deadline ${WEEKDAY[d.getDay()]} ${d.getDate()} ${MONTH[d.getMonth()]}`
  return { label, soon: deadline <= addDays(today, 2) }
}

// A label as it is kept: lower case, no @, letters, digits and dashes.
export const cleanLabel = (word: string) =>
  word
    .replace(/^@/, '')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}-]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)

// Every label in use on open tasks, with how many tasks have it, most used first.
export function labelCounts(tasks: { labels?: string[] | null; deleted?: boolean; done_at: string | null }[]) {
  const counts = new Map<string, number>()
  for (const t of tasks) {
    if (!t || t.deleted || t.done_at) continue
    for (const l of t.labels ?? []) counts.set(l, (counts.get(l) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

// Stable sort by priority: P1 first, tasks with the same priority keep their order.
export function byPriority<T extends { priority?: number | null }>(rows: T[]): T[] {
  return rows
    .map((row, i) => ({ row, i }))
    .sort((a, b) => priorityOf(a.row) - priorityOf(b.row) || a.i - b.i)
    .map((x) => x.row)
}
