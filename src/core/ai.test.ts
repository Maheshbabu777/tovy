import { activityByDay, canUndo, daysLeft, isNotSetUp, mcpUrl, trashItems, undoPlan, type AiAction } from './ai'
import type { Task } from './sync/tasks'

const action = (over: Partial<AiAction>): AiAction => ({
  id: 'a1',
  client_id: 'c1',
  client_name: 'Claude',
  tool: 'update_task',
  task_id: 't1',
  project_id: null,
  summary: '',
  before: {},
  after: {},
  created_at: '2026-10-03T09:00:00Z',
  undone_at: null,
  ...over,
})

const task = (id: string, over: Partial<Task> = {}): Task => ({
  id,
  title: id,
  note: '',
  due_date: null,
  due_time: null,
  kind: 'quick',
  done_at: null,
  project_id: null,
  parent_id: null,
  deleted: true,
  ...over,
})

describe('undoPlan', () => {
  it('removes what the app added', () => {
    expect(undoPlan(action({ tool: 'add_task', task_id: 't9', after: { id: 't9' } }))).toEqual([
      { kind: 'removeTask', id: 't9' },
    ])
    expect(undoPlan(action({ tool: 'add_project', task_id: null, project_id: 'p9' }))).toEqual([
      { kind: 'setProject', id: 'p9', fields: { deleted: true } },
    ])
  })

  it('acts on the row the database named, never on an id inside the fields', () => {
    expect(undoPlan(action({ tool: 'add_task', task_id: 't1', after: { id: 'important' } }))).toEqual([
      { kind: 'removeTask', id: 't1' },
    ])
    expect(undoPlan(action({ tool: 'delete_task', task_id: 't1', before: { ids: [] } }))).toEqual([
      { kind: 'restoreTasks', ids: ['t1'] },
    ])
  })

  it('puts a renamed or deleted project back', () => {
    expect(
      undoPlan(action({ tool: 'update_project', task_id: null, project_id: 'p1', before: { name: 'Work' } })),
    ).toEqual([{ kind: 'setProject', id: 'p1', fields: { name: 'Work' } }])
    expect(
      undoPlan(action({ tool: 'delete_project', task_id: null, project_id: 'p1', before: { deleted: false } })),
    ).toEqual([{ kind: 'setProject', id: 'p1', fields: { deleted: false } }])
  })

  it('restores every task the app deleted', () => {
    expect(undoPlan(action({ tool: 'delete_task', before: { ids: ['t1', 't2'] } }))).toEqual([
      { kind: 'restoreTasks', ids: ['t1', 't2'] },
    ])
  })

  it('puts changed fields back, and only task fields', () => {
    const plan = undoPlan(
      action({ before: { due_date: '2026-10-03', due_time: '15:00:00', project_id: null, parent_kind: 'quick' } }),
    )
    expect(plan).toEqual([
      { kind: 'setTask', id: 't1', fields: { due_date: '2026-10-03', due_time: '15:00', project_id: null } },
    ])
  })

  it('reopens a finished task with its old progress', () => {
    expect(undoPlan(action({ tool: 'complete_task', before: { done_at: null, progress: 40 } }))).toEqual([
      { kind: 'setTask', id: 't1', fields: { done_at: null, progress: 40 } },
    ])
  })

  it('offers no undo once undone or when there is nothing to put back', () => {
    expect(canUndo(action({ before: { title: 'x' } }))).toBe(true)
    expect(canUndo(action({ before: { title: 'x' }, undone_at: '2026-10-03T10:00:00Z' }))).toBe(false)
    expect(canUndo(action({ task_id: null, before: { title: 'x' } }))).toBe(false)
    expect(canUndo(action({ before: {} }))).toBe(false)
  })
})

describe('activityByDay', () => {
  it('groups newest first under Today and Yesterday', () => {
    const now = new Date(2026, 9, 3, 12)
    const days = activityByDay(
      [
        action({ id: 'old', created_at: new Date(2026, 9, 2, 9).toISOString() }),
        action({ id: 'new', created_at: new Date(2026, 9, 3, 11).toISOString() }),
        action({ id: 'mid', created_at: new Date(2026, 9, 3, 8).toISOString() }),
      ],
      now,
    )
    expect(days.map((d) => d.title)).toEqual(['Today', 'Yesterday'])
    expect(days[0].actions.map((a) => a.id)).toEqual(['new', 'mid'])
  })
})

describe('trashItems', () => {
  it('lists a deleted task once with its deleted subtasks', () => {
    const items = trashItems([
      task('parent', { updated_at: '2026-10-02T00:00:00Z' }),
      task('child', { parent_id: 'parent' }),
      task('grandchild', { parent_id: 'child' }),
      task('alone', { parent_id: 'live-parent', updated_at: '2026-10-03T00:00:00Z' }),
    ])
    expect(items.map((i) => i.task.id)).toEqual(['alone', 'parent'])
    expect(items[1].ids).toEqual(['parent', 'child', 'grandchild'])
    expect(items[1].subtasks).toBe(2)
  })

  it('counts the days left', () => {
    const now = new Date('2026-10-03T00:00:00Z')
    expect(daysLeft('2026-10-02T00:00:00Z', now)).toBe(29)
    expect(daysLeft('2026-08-01T00:00:00Z', now)).toBe(0)
  })
})

describe('setup', () => {
  it('builds the server address', () => {
    expect(mcpUrl('https://ref.supabase.co/')).toBe('https://ref.supabase.co/functions/v1/mcp')
    expect(mcpUrl(undefined)).toBe('')
  })

  it('tells a missing table or a switched off OAuth server from a real error', () => {
    expect(isNotSetUp({ code: 'PGRST205', message: "Could not find the table 'public.ai_actions'" })).toBe(true)
    expect(isNotSetUp({ code: '42P01' })).toBe(true)
    expect(isNotSetUp({ status: 404, message: 'Not Found' })).toBe(true)
    expect(isNotSetUp({ message: 'Failed to fetch' })).toBe(false)
    expect(isNotSetUp(null)).toBe(false)
  })
})
