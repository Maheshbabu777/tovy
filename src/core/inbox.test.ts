import { changeSummary, groupByApp, kindLabel, timeAgo, waitingLabel } from './inbox'
import type { Proposal } from './sync/tasks'

const base = {
  id: 'p',
  app_name: 'Claude',
  title: 'T',
  task_id: null,
  before: {},
  after: {},
  status: 'pending',
  decided_at: null,
} as const
const proposal = (patch: Partial<Proposal>): Proposal => ({ ...base, ...patch }) as Proposal
const now = new Date(2026, 9, 2, 12, 0, 0)

describe('inbox', () => {
  test('time ago', () => {
    expect(timeAgo(new Date(2026, 9, 2, 11, 59, 40).toISOString(), now)).toBe('just now')
    expect(timeAgo(new Date(2026, 9, 2, 11, 58, 0).toISOString(), now)).toBe('2 min ago')
    expect(timeAgo(new Date(2026, 9, 2, 9, 0, 0).toISOString(), now)).toBe('3 h ago')
    expect(timeAgo(new Date(2026, 9, 1, 8, 0, 0).toISOString(), now)).toBe('yesterday')
    expect(timeAgo(new Date(2026, 8, 28, 8, 0, 0).toISOString(), now)).toBe('Mon 28 Sep')
    expect(timeAgo(null, now)).toBe('')
  })

  test('labels', () => {
    expect(kindLabel('add_task')).toBe('Add task')
    expect(kindLabel('update_progress')).toBe('Update progress')
    expect(kindLabel('reschedule')).toBe('Reschedule')
    expect(waitingLabel(0)).toBe('You are all caught up')
    expect(waitingLabel(3)).toBe('3 waiting for your approval')
  })

  test('what each kind changes', () => {
    expect(
      changeSummary(
        proposal({
          kind: 'add_task',
          title: 'Prepare review',
          after: { title: 'Prepare review', due_date: '2026-10-03' },
        }),
        undefined,
        now,
      ),
    ).toEqual({
      before: 'Not in your tasks yet',
      after: 'Prepare review\nTomorrow',
    })
    expect(
      changeSummary(
        proposal({ kind: 'update_progress', before: { progress: 42 }, after: { progress: 60 } }),
        undefined,
        now,
      ),
    ).toEqual({ before: '42%', after: '60%' })
    expect(
      changeSummary(
        proposal({ kind: 'reschedule', before: { due_date: '2026-10-02' }, after: { due_date: '2026-10-09' } }),
        undefined,
        now,
      ),
    ).toEqual({
      before: 'Today',
      after: 'Fri 9 Oct',
    })
  })

  test('groups waiting proposals by app, newest first', () => {
    const groups = groupByApp([
      proposal({ id: 'a', app_name: 'Claude', created_at: '2026-10-02T10:00:00Z' }),
      proposal({ id: 'b', app_name: 'ChatGPT', created_at: '2026-10-02T11:00:00Z' }),
      proposal({ id: 'c', app_name: 'Claude', created_at: '2026-10-02T12:00:00Z' }),
    ])
    expect(groups.map((g) => [g.app, g.items.map((i) => i.id)])).toEqual([
      ['Claude', ['c', 'a']],
      ['ChatGPT', ['b']],
    ])
  })
})
