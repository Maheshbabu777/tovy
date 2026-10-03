import { anchorOf, habitStats, heatmap, occursOn, SKIPPED, streakLabel } from './habits'
import type { LogEntry } from './progress'
import type { Task } from './sync/tasks'

const today = '2026-10-03' // Saturday
const habit = (repeat: Task['repeat'], extra: Partial<Task> = {}): Task => ({
  id: 'h',
  title: 'Read 20 pages',
  note: '',
  due_date: today,
  due_time: null,
  kind: 'quick',
  done_at: null,
  project_id: null,
  parent_id: null,
  created_at: '2026-09-01T09:00:00',
  repeat,
  ...extra,
})
let n = 0
const log = (day: string, note = ''): LogEntry => ({
  id: `l${++n}`,
  task_id: 'h',
  delta: 100,
  progress_after: note === SKIPPED ? 0 : 100,
  note,
  source: 'you',
  day,
})

describe('habits', () => {
  it('knows the days a habit is due', () => {
    expect(occursOn('2026-10-05', { every: 'weekday' }, '2026-09-01')).toBe(true)
    expect(occursOn('2026-10-04', { every: 'weekday' }, '2026-09-01')).toBe(false)
    expect(occursOn('2026-10-03', { every: 'day', interval: 2 }, '2026-10-01')).toBe(true)
    expect(occursOn('2026-10-02', { every: 'day', interval: 2 }, '2026-10-01')).toBe(false)
    expect(occursOn('2026-10-31', { every: 'month' }, '2026-08-31')).toBe(true)
    expect(occursOn('2026-09-30', { every: 'month' }, '2026-08-31')).toBe(true)
    expect(occursOn('2026-09-01', { every: 'day' }, '2026-09-02')).toBe(false)
    expect(anchorOf(habit({ every: 'day' }), today)).toBe('2026-09-01')
  })

  it('counts the streak back from today, with skips kept and today still open', () => {
    const t = habit({ every: 'day', habit: true })
    const logs = [
      log('2026-09-28'),
      log('2026-09-29'),
      log('2026-09-30', SKIPPED),
      log('2026-10-01'),
      log('2026-10-02'),
    ]
    expect(habitStats(t, logs, today)).toMatchObject({ streak: 5, best: 5 })
    expect(habitStats(t, [...logs, log('2026-10-03')], today).streak).toBe(6)
    const broken = [log('2026-09-20'), log('2026-09-21'), log('2026-09-22'), log('2026-10-02')]
    expect(habitStats(t, broken, today)).toMatchObject({ streak: 1, best: 3 })
    expect(streakLabel(12, { every: 'day' })).toBe('12 days in a row')
    expect(streakLabel(4, { every: 'week', days: [1] })).toBe('4 in a row')
    expect(streakLabel(1, { every: 'day' })).toBe('')
  })

  it('draws twelve weeks, Monday first', () => {
    const t = habit({ every: 'weekday', habit: true })
    const stats = habitStats(t, [log('2026-10-01'), log('2026-09-30', SKIPPED)], today)
    const grid = heatmap(t, stats, today)
    expect(grid).toHaveLength(12)
    const week = grid[11]
    expect(week.map((d) => d.day)).toEqual([
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
    ])
    expect(week.map((d) => d.state)).toEqual(['missed', 'missed', 'skipped', 'done', 'missed', 'off', 'future'])
  })
})
