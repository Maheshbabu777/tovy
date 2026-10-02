import {
  DAILY_GOAL,
  percentOf,
  pointsFor,
  pointsLabel,
  pointsOnDay,
  pointsToClose,
  ringClosed,
  ringPercent,
  rootOf,
  type LogEntry,
} from './progress'
import type { Task } from './sync/tasks'

let n = 0
const task = (patch: Partial<Task>): Task => ({
  id: `t${++n}`,
  title: 'x',
  note: '',
  due_date: null,
  due_time: null,
  kind: 'quick',
  done_at: null,
  project_id: null,
  parent_id: null,
  ...patch,
})
const entry = (delta: number, day: string): LogEntry => ({
  id: `e${++n}`,
  task_id: 't',
  delta,
  progress_after: 0,
  note: '',
  source: 'you',
  day,
})

describe('progress', () => {
  test('percent: done, held progress, or the average of the subtasks', () => {
    expect(percentOf(task({ done_at: 'x' }), [])).toBe(100)
    expect(percentOf(task({ progress: 42 }), [])).toBe(42)
    expect(percentOf(task({}), [])).toBe(0)
    const parent = task({ id: 'parent', kind: 'deep' })
    const all = [
      parent,
      task({ parent_id: 'parent', done_at: 'x' }),
      task({ parent_id: 'parent', progress: 40 }),
      task({ parent_id: 'parent' }),
      task({ parent_id: 'parent', deleted: true, done_at: 'x' }), // deleted subtasks do not count
    ]
    expect(percentOf(parent, all)).toBe(47) // (100 + 40 + 0) / 3
  })

  test('nested subtasks roll up all the way', () => {
    const top = task({ id: 'top', kind: 'deep' })
    const mid = task({ id: 'mid', kind: 'deep', parent_id: 'top' })
    const all = [top, mid, task({ parent_id: 'mid', done_at: 'x' })]
    expect(percentOf(top, all)).toBe(100)
    expect(rootOf(all[2], all).id).toBe('top')
    expect(rootOf(top, all).id).toBe('top')
  })

  test('points are 1.5 per percent and a day closes at 150', () => {
    expect(pointsFor(40)).toBe(60)
    expect(pointsFor(100)).toBe(DAILY_GOAL)
    expect(pointsLabel(20)).toBe('+30 pts')
    expect(pointsLabel(-10)).toBe('-15 pts')
    expect(pointsOnDay([entry(20, 'a'), entry(60, 'a'), entry(50, 'b')], 'a')).toBe(120)
    expect(pointsOnDay([entry(-50, 'a')], 'a')).toBe(0) // never below zero
    expect(pointsOnDay([], 'a')).toBe(0)
    expect(ringPercent(96)).toBe(64)
    expect(ringPercent(400)).toBe(100)
    expect(pointsToClose(96)).toBe(54)
    expect(pointsToClose(200)).toBe(0)
    expect(ringClosed(149)).toBe(false)
    expect(ringClosed(150)).toBe(true)
  })
})
