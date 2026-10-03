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
  weekStart,
  monthGrid,
  monthTitle,
  shiftMonth,
  daysThrough,
  todayLine,
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
  it('names the day and counts its tasks', () => {
    expect(todayLine(now, 5)).toBe('Saturday 3 October · 5 tasks')
    expect(todayLine(now, 1)).toBe('Saturday 3 October · 1 task')
    expect(todayLine(new Date(2026, 0, 4), 0)).toBe('Sunday 4 January · nothing due')
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
  it('shows Monday to Sunday of this week and marks busy, past and today', () => {
    const strip = weekStrip([t('a', { due_date: '2026-10-04' }), t('b', { due_date: '2026-10-02', done_at: 'x' })], now)
    expect(strip.map((d) => d.day)).toEqual([
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
    ])
    expect(strip[0]).toEqual({ day: '2026-09-28', weekday: 'Mon', date: 28, busy: false, past: true, today: false })
    expect(strip[5]).toMatchObject({ weekday: 'Sat', past: false, today: true })
    expect(strip[6].busy).toBe(true)
    expect(strip[4].busy).toBe(false)
  })

  it('shows any other week', () => {
    expect(weekStrip([], now, '2026-12-31').map((d) => d.day)[0]).toBe('2026-12-28')
    expect(weekStart('2026-10-04')).toBe('2026-09-28')
    expect(weekStart('2026-09-28')).toBe('2026-09-28')
  })
})

describe('calendar', () => {
  it('lays out a month in Monday weeks', () => {
    const grid = monthGrid([t('a', { due_date: '2026-10-20' })], now, '2026-10-17')
    expect(grid).toHaveLength(5)
    expect(grid[0][0]).toMatchObject({ day: '2026-09-28', inMonth: false, past: true })
    expect(grid[0][3]).toMatchObject({ day: '2026-10-01', inMonth: true })
    expect(grid[3][1]).toMatchObject({ day: '2026-10-20', busy: true })
    expect(grid[4][6]).toMatchObject({ day: '2026-11-01', inMonth: false })
  })

  it('names and moves between months across years', () => {
    expect(monthTitle('2026-10-03')).toBe('October 2026')
    expect(shiftMonth('2026-12-15', 1)).toBe('2027-01-01')
    expect(shiftMonth('2026-01-31', -1)).toBe('2025-12-01')
  })

  it('counts the days through a date', () => {
    expect(daysThrough(now, '2026-10-03')).toBe(1)
    expect(daysThrough(now, '2026-11-01')).toBe(30)
    expect(daysThrough(now, '2027-10-03')).toBe(366)
  })

  it('lists as many days as asked', () => {
    expect(upcoming([], now, 40).days).toHaveLength(40)
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
