import type { Task } from './sync/tasks'
import { dayTitle, inboxTasks, todayCount, upcoming } from './views'

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
