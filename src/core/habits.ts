import type { LogEntry } from './progress'
import type { Task } from './sync/tasks'
import { readRepeat, type Repeat } from './taskFields'
import { addDays, localDay } from './today'

// Habits (stage 6): a repeating task tracked as a habit. Each time it is finished the app logs it (spec task-fields),
// and a skip is logged with the note "skipped". From those entries come the streak and the heatmap. Plain functions.

export const SKIPPED = 'skipped'

export const isHabit = (task: Pick<Task, 'repeat'>) => readRepeat(task.repeat)?.habit === true
export const isPaused = (task: Pick<Task, 'repeat'>) => readRepeat(task.repeat)?.paused === true

const dayOf = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}
const daysBetween = (a: string, b: string) => Math.round((Date.UTC(...ymd(b)) - Date.UTC(...ymd(a))) / 86_400_000)
const ymd = (iso: string): [number, number, number] => {
  const [y, m, d] = iso.split('-').map(Number)
  return [y, m - 1, d]
}

// Whether the habit is due on `day`, given the day it started from (`anchor`).
export function occursOn(day: string, repeat: Repeat, anchor: string): boolean {
  if (day < anchor) return false
  const n = repeat.interval ?? 1
  const weekday = dayOf(day).getDay()
  switch (repeat.every) {
    case 'day':
      return daysBetween(anchor, day) % n === 0
    case 'weekday':
      return weekday !== 0 && weekday !== 6
    case 'week':
      if (repeat.days?.length) return repeat.days.includes(weekday)
      return weekday === dayOf(anchor).getDay() && Math.floor(daysBetween(anchor, day) / 7) % n === 0
    case 'month': {
      const want = dayOf(anchor).getDate()
      const d = dayOf(day)
      const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
      return d.getDate() === Math.min(want, last)
    }
  }
}

// The day a habit counts from: when it was made (or its first due date, if that is earlier).
export function anchorOf(task: Pick<Task, 'created_at' | 'due_date'>, today: string): string {
  const made = task.created_at ? localDay(new Date(task.created_at)) : today
  return task.due_date && task.due_date < made ? task.due_date : made
}

export type HabitStats = { streak: number; best: number; done: Set<string>; skipped: Set<string> }

// How the habit is going: the days it was done and skipped, the streak (due days in a row that were kept, done or
// skipped, counting back from today; today does not break it while it is still to do) and the best streak.
export function habitStats(task: Task, logs: LogEntry[], today: string): HabitStats {
  const repeat = readRepeat(task.repeat)
  const done = new Set<string>()
  const skipped = new Set<string>()
  for (const e of logs) {
    if (!e || e.deleted || e.task_id !== task.id) continue
    if (e.note === SKIPPED) skipped.add(e.day)
    else if (e.progress_after === 100) done.add(e.day)
  }
  if (!repeat) return { streak: 0, best: 0, done, skipped }
  const anchor = anchorOf(task, today)
  const kept = (d: string) => done.has(d) || skipped.has(d)
  let streak = 0
  let counting = true
  let run = 0
  let best = 0
  // Walk back at most two years; a run ends at the first due day that was neither done nor skipped.
  for (let i = 0, d = today; i < 730 && d >= anchor; i++, d = addDays(d, -1)) {
    if (!occursOn(d, repeat, anchor)) continue
    if (kept(d)) {
      run++
      if (counting) streak++
    } else if (d === today) {
      continue // still to do today
    } else {
      counting = false
      best = Math.max(best, run)
      run = 0
    }
  }
  best = Math.max(best, run, streak)
  return { streak, best, done, skipped }
}

export type HeatDay = { day: string; state: 'done' | 'skipped' | 'missed' | 'due' | 'off' | 'future' }

// The last `weeks` weeks, Monday first, one row per week: what happened on each day.
export function heatmap(task: Task, stats: HabitStats, today: string, weeks = 12): HeatDay[][] {
  const repeat = readRepeat(task.repeat)
  const anchor = anchorOf(task, today)
  const mondayOffset = (dayOf(today).getDay() + 6) % 7
  const start = addDays(today, -mondayOffset - (weeks - 1) * 7)
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, i) => {
      const day = addDays(start, w * 7 + i)
      if (day > today) return { day, state: 'future' as const }
      if (stats.done.has(day)) return { day, state: 'done' as const }
      if (stats.skipped.has(day)) return { day, state: 'skipped' as const }
      if (!repeat || !occursOn(day, repeat, anchor)) return { day, state: 'off' as const }
      return { day, state: day === today ? ('due' as const) : ('missed' as const) }
    }),
  )
}

// "12 days in a row" (or "5 in a row" for one that is not daily) for the row's meta line, from two in a row.
export function streakLabel(streak: number, repeat: Repeat | null): string {
  if (streak < 2) return ''
  return repeat?.every === 'day' && !repeat.interval ? `${streak} days in a row` : `${streak} in a row`
}
