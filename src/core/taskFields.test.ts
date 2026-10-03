import {
  byPriority,
  cleanLabel,
  deadlineInfo,
  firstOccurrence,
  labelCounts,
  nextOccurrence,
  priorityOf,
  readRepeat,
  repeatLabel,
} from './taskFields'

const today = '2026-10-03' // a Saturday
const now = new Date(2026, 9, 3, 10)

describe('repeats', () => {
  it('finds the next date, counted from the due date and never on or before today', () => {
    expect(nextOccurrence('2026-10-03', { every: 'day' }, today)).toBe('2026-10-04')
    expect(nextOccurrence('2026-09-20', { every: 'day', interval: 3 }, today)).toBe('2026-10-05')
    expect(nextOccurrence('2026-10-02', { every: 'weekday' }, today)).toBe('2026-10-05')
    expect(nextOccurrence('2026-10-03', { every: 'week' }, today)).toBe('2026-10-10')
    expect(nextOccurrence('2026-10-05', { every: 'week', days: [1, 4] }, today)).toBe('2026-10-08')
    expect(nextOccurrence('2026-08-31', { every: 'month' }, today)).toBe('2026-10-31')
    expect(nextOccurrence('2026-01-31', { every: 'month' }, '2026-01-31')).toBe('2026-02-28')
    expect(nextOccurrence(null, { every: 'day' }, today)).toBe('2026-10-04')
  })

  it('starts a new repeating task on the first day that fits', () => {
    expect(firstOccurrence({ every: 'day' }, today)).toBe(today)
    expect(firstOccurrence({ every: 'weekday' }, today)).toBe('2026-10-05')
    expect(firstOccurrence({ every: 'week', days: [1] }, today)).toBe('2026-10-05')
    expect(firstOccurrence({ every: 'week', days: [6] }, today)).toBe(today)
  })

  it('names repeats and reads stored ones defensively', () => {
    expect(repeatLabel({ every: 'day' })).toBe('Daily')
    expect(repeatLabel({ every: 'day', interval: 3 })).toBe('Every 3 days')
    expect(repeatLabel({ every: 'weekday' })).toBe('Weekdays')
    expect(repeatLabel({ every: 'week', days: [1, 4] })).toBe('Every Mon, Thu')
    expect(repeatLabel({ every: 'month' })).toBe('Every month')
    expect(readRepeat({ every: 'week', days: [4, 1, 9, 1] })).toEqual({ every: 'week', days: [1, 4] })
    expect(readRepeat('daily')).toBeNull()
    expect(readRepeat({ every: 'year' })).toBeNull()
  })
})

describe('priority, deadline and labels', () => {
  it('sorts by priority and keeps the order within one', () => {
    const rows = [{ id: 'a' }, { id: 'b', priority: 1 }, { id: 'c', priority: 3 }, { id: 'd', priority: 1 }]
    expect(byPriority(rows).map((r) => r.id)).toEqual(['b', 'd', 'c', 'a'])
    expect(priorityOf({ priority: 7 })).toBe(4)
  })

  it('words a deadline and marks it when close', () => {
    expect(deadlineInfo('2026-10-03', now)).toEqual({ label: 'Deadline today', soon: true })
    expect(deadlineInfo('2026-10-05', now)).toEqual({ label: 'Deadline Mon 5 Oct', soon: true })
    expect(deadlineInfo('2026-10-09', now)).toEqual({ label: 'Deadline Fri 9 Oct', soon: false })
  })

  it('cleans labels and counts them on open tasks', () => {
    expect(cleanLabel('@Deep Work!')).toBe('deep-work')
    const tasks = [
      { labels: ['home', 'calls'], done_at: null },
      { labels: ['home'], done_at: null },
      { labels: ['home'], done_at: 'x' },
    ]
    expect(labelCounts(tasks)).toEqual([
      { label: 'home', count: 2 },
      { label: 'calls', count: 1 },
    ])
  })
})
