import { projectStats, taskCountLabel, taskPercent } from './projects'
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

describe('projects', () => {
  test('a project with no tasks is 0 tasks and 0 percent', () => {
    expect(projectStats('p', [])).toEqual({ count: 0, percent: 0 })
  })

  test('counts top level tasks of that project only and averages their progress', () => {
    const parent = task({ id: 'parent', kind: 'deep', project_id: 'p' })
    const all = [
      parent,
      task({ parent_id: 'parent', done_at: 'x' }),
      task({ parent_id: 'parent' }),
      task({ project_id: 'p', done_at: 'x' }),
      task({ project_id: 'other' }),
      task({ project_id: 'p', deleted: true }),
    ]
    // parent 50, done task 100: two tasks, 75 percent. Subtasks, other projects and deleted tasks do not count.
    expect(projectStats('p', all)).toEqual({ count: 2, percent: 75 })
  })

  test('null is the "No project" group', () => {
    const all = [task({}), task({ project_id: 'p' }), task({ done_at: 'x' })]
    expect(projectStats(null, all)).toEqual({ count: 2, percent: 50 })
  })

  test('task percent: done, from subtasks, or not started', () => {
    const parent = task({ id: 'pp', kind: 'deep' })
    const all = [
      parent,
      task({ parent_id: 'pp', done_at: 'x' }),
      task({ parent_id: 'pp' }),
      task({ parent_id: 'pp' }),
      task({ parent_id: 'pp' }),
    ]
    expect(taskPercent(parent, all)).toBe(25)
    expect(taskPercent(task({ done_at: 'x' }), [])).toBe(100)
    expect(taskPercent(task({}), [])).toBe(0)
  })

  test('singular for one task', () => {
    expect(taskCountLabel(1)).toBe('1 task')
    expect(taskCountLabel(0)).toBe('0 tasks')
    expect(taskCountLabel(6)).toBe('6 tasks')
  })
})
