import type { Project, Task } from './sync/tasks'
import { matches, paletteResults } from './palette'

const task = (id: string, title: string, extra: Partial<Task> = {}): Task => ({
  id,
  title,
  note: '',
  due_date: null,
  due_time: null,
  kind: 'quick',
  done_at: null,
  project_id: null,
  parent_id: null,
  ...extra,
})
const project = (id: string, name: string, extra: Partial<Project> = {}): Project => ({
  id,
  name,
  color: 'slate',
  ...extra,
})

describe('palette', () => {
  it('matches every word in any order, ignoring case', () => {
    expect(matches('Send invoice to Halden', 'halden send')).toBe(true)
    expect(matches('Send invoice', 'invoice x')).toBe(false)
  })

  it('lists the commands when empty', () => {
    const items = paletteResults('', { projects: [], tasks: [] })
    expect(items.map((i) => i.id)).toEqual([
      'go-inbox',
      'go-today',
      'go-upcoming',
      'go-projects',
      'go-profile',
      'theme',
    ])
  })

  it('finds projects and tasks, open tasks first, and always offers to add', () => {
    const items = paletteResults('inv', {
      projects: [project('p1', 'Invoices'), project('p2', 'Gone', { deleted: true })],
      tasks: [
        task('t1', 'Pay invoice', { done_at: '2026-10-01T00:00:00Z' }),
        task('t2', 'Invite Sam'),
        task('t3', 'Call bank'),
        task('t4', 'Old', { deleted: true }),
      ],
    })
    expect(items.map((i) => i.id)).toEqual(['project-p1', 'task-t2', 'task-t1', 'add'])
    expect(items.at(-1)).toMatchObject({ kind: 'add', title: 'inv' })
  })
})

it('finds commands by words', () => {
  expect(paletteResults('go up', { projects: [], tasks: [] }).map((i) => i.id)).toEqual(['go-upcoming', 'add'])
})
