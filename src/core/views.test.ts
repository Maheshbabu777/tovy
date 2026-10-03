import type { Task } from './sync/tasks'
import {
  completedByDay,
  daySummary,
  dayTitle,
  inboxTasks,
  timelyGreeting,
  todayCount,
  upcoming,
  weekStrip,
} from './views'

const now = new Date(2026, 9, 3, 10) // Sat 3 Oct 2026
const t = (id: string, extra: Partial<Task> = {}): Task => ({
  id,
  title: id,
  note: '',
  due_date: null,
  due_time: null,
  kind: 'quick',
  done_at: null,
  project_id: null,
  parent_id: null,
  created_at: `2026-10-01T00:00:0${id.length}Z`,
  ...extra,
})

describe('inbox', () => {
  it('holds open top level tasks with no project', () => {
    const tasks = [
      t('a'),
      t('bb', { project_id: 'p' }),
      t('ccc', { done_at: '2026-10-02T00:00:00Z' }),
      t('dddd', { parent_id: 'a' }),
      t('eeeee', { deleted: true }),
      t('ffffff', { due_date: '2026-10-05' }),
    ]
    expect(inboxTasks(tasks).map((x) => x.id)).toEqual(['a', 'ffffff'])
  })
})

describe('today count', () => {
  it('counts late and due today, nothing else', () => {
    const tasks = [
      t('a', { due_date: '2026-10-01' }),
      t('b', { due_date: '2026-10-03' }),
      t('c', { due_date: '2026-10-04' }),
      t('d'),
      t('e', { due_date: '2026-10-03', done_at: '2026-10-03T08:00:00Z' }),
    ]
    expect(todayCount(tasks, now)).toBe(2)
  })
})

describe('upcoming', () => {
  it('lists late tasks, the next seven days and later days with tasks', () => {
    const tasks = [
      t('late', { due_date: '2026-10-01' }),
      t('today', { due_date: '2026-10-03' }),
      t('fifth', { due_date: '2026-10-05' }),
      t('far', { due_date: '2026-11-20' }),
      t('none'),
    ]
    const view = upcoming(tasks, now)
    expect(view.overdue.map((x) => x.id)).toEqual(['late'])
    expect(view.days).toHaveLength(8)
    expect(view.days[0]).toMatchObject({ day: '2026-10-03', title: 'Today · Sat 3 Oct' })
    expect(view.days[1].title).toBe('Tomorrow · Sun 4 Oct')
    expect(view.days[2].tasks.map((x) => x.id)).toEqual(['fifth'])
    expect(view.days[7]).toMatchObject({ day: '2026-11-20', title: 'Fri 20 Nov' })
  })

  it('names days plainly after tomorrow', () => {
    expect(dayTitle('2026-10-06', now)).toBe('Tue 6 Oct')
  })
})

describe('today header', () => {
  it('fits the time of day and adds the first name', () => {
    expect(timelyGreeting(new Date(2026, 9, 3, 3), 'Mahesh')).toBe('Up late, Mahesh')
    expect(timelyGreeting(new Date(2026, 9, 3, 9), 'Mahesh')).toBe('Good morning, Mahesh')
    expect(timelyGreeting(new Date(2026, 9, 3, 13), ' ')).toBe('Good afternoon')
    expect(timelyGreeting(new Date(2026, 9, 3, 19), null)).toBe('Good evening')
    expect(timelyGreeting(new Date(2026, 9, 3, 23), 'Mahesh')).toBe('Winding down, Mahesh')
  })
  it('sums up the day without zero parts', () => {
    expect(daySummary({ overdue: [1, 2], dueToday: [1, 2, 3], doneToday: [1] })).toBe(
      '2 overdue · 3 due today · 1 done',
    )
    expect(daySummary({ overdue: [], dueToday: [1], doneToday: [] })).toBe('1 due today')
    expect(daySummary({ overdue: [], dueToday: [], doneToday: [] })).toBe('Nothing due today')
  })
})

describe('week strip', () => {
  it('marks the days that have open tasks', () => {
    const strip = weekStrip([t('a', { due_date: '2026-10-04' }), t('b', { due_date: '2026-10-05', done_at: 'x' })], now)
    expect(strip).toHaveLength(7)
    expect(strip[0]).toEqual({ day: '2026-10-03', weekday: 'Sat', date: 3, busy: false })
    expect(strip[1].busy).toBe(true)
    expect(strip[2].busy).toBe(false)
  })
})

describe('completed', () => {
  it('groups finished top level tasks by the day, newest first, for the last 30 days', () => {
    const at = (d: number, h: number) => new Date(2026, 9, d, h).toISOString()
    const tasks = [
      t('a', { done_at: at(3, 9) }),
      t('b', { done_at: at(3, 11) }),
      t('c', { done_at: at(2, 9) }),
      t('d', { done_at: at(1, 9) }),
      t('e', { done_at: new Date(2026, 7, 1).toISOString() }), // too old
      t('f', { done_at: at(3, 8), parent_id: 'a' }), // a subtask
      t('g', { done_at: at(3, 8), deleted: true }),
      t('h'),
    ]
    const days = completedByDay(tasks, now)
    expect(days.map((d) => d.title)).toEqual(['Today', 'Yesterday', 'Thu 1 Oct'])
    expect(days[0].tasks.map((x) => x.id)).toEqual(['b', 'a'])
  })
})
