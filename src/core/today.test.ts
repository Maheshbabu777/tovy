import type { Task } from './sync/tasks'
import { addDays, dateLine, dueLabel, greeting, groupTasks, isOverdue, localDay, timeLabel } from './today'

const NOW = new Date(2026, 9, 2, 10, 30) // Fri 2 Oct 2026, 10:30

const task = (id: string, extra: Partial<Task> = {}): Task => ({
  id,
  title: id,
  note: '',
  due_date: null,
  due_time: null,
  kind: 'quick',
  done_at: null,
  project_id: null,
  parent_id: null,
  ...extra,
})

describe('dates and words', () => {
  it('names the part of the day', () => {
    expect(greeting(new Date(2026, 9, 2, 0, 5))).toBe('Good morning')
    expect(greeting(new Date(2026, 9, 2, 11, 59))).toBe('Good morning')
    expect(greeting(new Date(2026, 9, 2, 12, 0))).toBe('Good afternoon')
    expect(greeting(new Date(2026, 9, 2, 17, 59))).toBe('Good afternoon')
    expect(greeting(new Date(2026, 9, 2, 18, 0))).toBe('Good evening')
  })

  it('writes the date line and local days', () => {
    expect(dateLine(NOW)).toBe('Fri 2 Oct')
    expect(localDay(NOW)).toBe('2026-10-02')
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
  })

  it('writes times the way the design does', () => {
    expect(timeLabel('16:00')).toBe('4 PM')
    expect(timeLabel('17:30')).toBe('5:30 PM')
    expect(timeLabel('00:05')).toBe('12:05 AM')
    expect(timeLabel('12:00')).toBe('12 PM')
  })

  it('words a due date', () => {
    expect(dueLabel({ due_date: '2026-10-02', due_time: null }, NOW)).toBe('Today')
    expect(dueLabel({ due_date: '2026-10-02', due_time: '16:00' }, NOW)).toBe('Today, 4 PM')
    expect(dueLabel({ due_date: '2026-10-03', due_time: null }, NOW)).toBe('Tomorrow')
    expect(dueLabel({ due_date: '2026-10-01', due_time: null }, NOW)).toBe('Yesterday')
    expect(dueLabel({ due_date: '2026-10-08', due_time: null }, NOW)).toBe('Thu 8 Oct')
    expect(dueLabel({ due_date: null, due_time: null }, NOW)).toBe('No date')
  })

  it('knows what is overdue', () => {
    expect(isOverdue({ due_date: '2026-10-01', done_at: null }, NOW)).toBe(true)
    expect(isOverdue({ due_date: '2026-10-02', done_at: null }, NOW)).toBe(false)
    expect(isOverdue({ due_date: '2026-10-01', done_at: '2026-10-02T08:00:00Z' }, NOW)).toBe(false)
    expect(isOverdue({ due_date: null, done_at: null }, NOW)).toBe(false)
  })
})

describe('groupTasks', () => {
  it('sorts open tasks into the four groups', () => {
    const g = groupTasks(
      [
        task('late', { due_date: '2026-09-30' }),
        task('now-b', { due_date: '2026-10-02', due_time: '16:00' }),
        task('now-a', { due_date: '2026-10-02', due_time: '09:00' }),
        task('now-none', { due_date: '2026-10-02' }),
        task('soon', { due_date: '2026-10-05' }),
        task('far', { due_date: '2027-01-01' }),
        task('whenever'),
      ],
      NOW,
    )
    expect(g.overdue.map((t) => t.id)).toEqual(['late'])
    expect(g.dueToday.map((t) => t.id)).toEqual(['now-a', 'now-b', 'now-none']) // times first, a task with no time last
    expect(g.comingUp.map((t) => t.id)).toEqual(['soon', 'far']) // any later date, not only the next 7 days
    expect(g.anytime.map((t) => t.id)).toEqual(['whenever'])
  })

  it('leaves out subtasks and deleted tasks', () => {
    const g = groupTasks(
      [
        task('parent', { kind: 'deep', due_date: '2026-10-02' }),
        task('child', { parent_id: 'parent', due_date: '2026-10-02' }),
        task('gone', { due_date: '2026-10-02', deleted: true }),
      ],
      NOW,
    )
    expect(g.dueToday.map((t) => t.id)).toEqual(['parent'])
  })

  it('shows a done task only on the day it was finished', () => {
    const noon = new Date(2026, 9, 2, 12, 0).toISOString()
    const yesterday = new Date(2026, 9, 1, 12, 0).toISOString()
    const g = groupTasks(
      [
        task('done-now', { done_at: noon, due_date: '2026-10-02' }),
        task('done-before', { done_at: yesterday }),
        task('open'),
      ],
      NOW,
    )
    expect(g.doneToday.map((t) => t.id)).toEqual(['done-now'])
    expect(g.dueToday).toEqual([]) // a finished task leaves its group
    expect(g.anytime.map((t) => t.id)).toEqual(['open'])
  })
})
