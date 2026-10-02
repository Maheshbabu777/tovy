// Unit tests for the tasks store rules. The Supabase plugin and the persistence plugin are replaced by a plain local
// store, so this checks our rules only (the same rules the database enforces). Real sync is covered by the e2e suite.
import { createTasksStore } from './tasks'

jest.mock('./syncConfig', () => ({}))
jest.mock('@legendapp/state/sync-plugins/supabase', () => ({
  configureSyncedSupabase: jest.fn(),
  syncedSupabase: () => ({}),
}))
jest.mock('../db/supabase', () => ({ supabase: {} }))
jest.mock('./persistPlugin', () => ({ createPersistPlugin: () => ({}) }))

const fresh = () => createTasksStore('user-1')

describe('tasks store', () => {
  it('adds a task with the defaults and edits it', () => {
    const s = fresh()
    const id = s.addTask({ title: 'Write spec' })
    expect(s.tasks$[id].peek()).toMatchObject({
      title: 'Write spec',
      note: '',
      kind: 'quick',
      done_at: null,
      project_id: null,
      parent_id: null,
      due_date: null,
    })
    s.editTask(id, { title: 'Write the spec', note: 'draft', dueDate: '2026-10-05', dueTime: '16:00' })
    expect(s.tasks$[id].peek()).toMatchObject({
      title: 'Write the spec',
      note: 'draft',
      due_date: '2026-10-05',
      due_time: '16:00',
    })
  })

  it('needs a due date for a due time', () => {
    const s = fresh()
    expect(() => s.addTask({ title: 'x', dueTime: '09:00' })).toThrow('due time needs a due date')
    const id = s.addTask({ title: 'y' })
    expect(() => s.editTask(id, { dueTime: '09:00' })).toThrow('due time needs a due date')
    s.editTask(id, { dueDate: '2026-10-05', dueTime: '09:00' })
    expect(() => s.editTask(id, { dueDate: null })).toThrow('due time needs a due date')
  })

  it('marks a task done and not done', () => {
    const s = fresh()
    const id = s.addTask({ title: 'x' })
    s.setDone(id, true)
    expect(s.tasks$[id].done_at.peek()).toEqual(expect.any(String))
    s.setDone(id, false)
    expect(s.tasks$[id].done_at.peek()).toBeNull()
  })

  it('only lets a deep task have subtasks', () => {
    const s = fresh()
    const quick = s.addTask({ title: 'quick' })
    expect(() => s.addTask({ title: 'sub', parentId: quick })).toThrow('Only a deep task can have subtasks')
    s.setKind(quick, 'deep')
    const sub = s.addTask({ title: 'sub', parentId: quick })
    expect(s.subtaskCount(quick)).toBe(1)
    expect(s.tasks$[sub].parent_id.peek()).toBe(quick)
  })

  it('keeps a deep task deep while it has subtasks', () => {
    const s = fresh()
    const parent = s.addTask({ title: 'p', kind: 'deep' })
    const sub = s.addTask({ title: 's', parentId: parent })
    expect(() => s.setKind(parent, 'quick')).toThrow('must stay deep')
    s.deleteTask(sub)
    s.setKind(parent, 'quick') // the only subtask is deleted, so this is fine
    expect(s.tasks$[parent].kind.peek()).toBe('quick')
  })

  it('nests subtasks to any depth and refuses a cycle', () => {
    const s = fresh()
    const top = s.addTask({ title: 'top', kind: 'deep' })
    let parent = top
    const chain = [top]
    for (let i = 0; i < 50; i++) {
      parent = s.addTask({ title: `level ${i}`, kind: 'deep', parentId: parent })
      chain.push(parent)
    }
    expect(s.descendantIds(top)).toHaveLength(50)
    expect(() => s.moveUnder(top, chain[chain.length - 1])).toThrow('cannot go under itself')
    expect(() => s.moveUnder(top, top)).toThrow('cannot go under itself')
    expect(() => s.moveUnder(chain[3], chain[10])).toThrow('cannot go under itself')
    s.moveUnder(chain[10], top) // moving up the tree is fine
    expect(s.tasks$[chain[10]].parent_id.peek()).toBe(top)
  })

  it('deletes a task with everything beneath it, and undo brings it all back', () => {
    const s = fresh()
    const top = s.addTask({ title: 'top', kind: 'deep' })
    const mid = s.addTask({ title: 'mid', kind: 'deep', parentId: top })
    const leaf = s.addTask({ title: 'leaf', parentId: mid })
    const other = s.addTask({ title: 'other' })

    const { ids, undo } = s.deleteTask(top)
    expect(ids.sort()).toEqual([top, mid, leaf].sort())
    expect([top, mid, leaf].every((i) => s.tasks$[i].deleted.peek() === true)).toBe(true)
    expect(s.tasks$[other].deleted.peek()).toBeFalsy()
    expect(s.subtaskCount(top)).toBe(0) // deleted subtasks are not counted

    undo()
    expect([top, mid, leaf].every((i) => s.tasks$[i].deleted.peek() === false)).toBe(true)
    expect(s.descendantIds(top).sort()).toEqual([mid, leaf].sort())
  })

  it('moves tasks between projects and keeps them when a project is deleted', () => {
    const s = fresh()
    const launch = s.addProject('Launch', 'indigo')
    const a = s.addTask({ title: 'a', projectId: launch })
    const b = s.addTask({ title: 'b' })
    s.moveToProject(b, launch)
    expect(s.tasks$[b].project_id.peek()).toBe(launch)
    expect(() => s.moveToProject(b, 'no-such-project')).toThrow('That project does not exist')

    s.renameProject(launch, 'Launch 2')
    s.setProjectColor(launch, 'teal')
    expect(s.projects$[launch].peek()).toMatchObject({ name: 'Launch 2', color: 'teal' })

    s.deleteProject(launch)
    expect(s.projects$[launch].deleted.peek()).toBe(true)
    expect(s.tasks$[a].project_id.peek()).toBeNull() // moved to "No project", not deleted
    expect(s.tasks$[b].project_id.peek()).toBeNull()
    expect(s.tasks$[a].deleted.peek()).toBeFalsy()
  })

  it('keeps two users stores apart', () => {
    const first = createTasksStore('user-1')
    const second = createTasksStore('user-2')
    const id = first.addTask({ title: 'only for the first user' })
    expect(first.tasks$[id].peek()).toBeDefined()
    expect(second.tasks$[id].peek()).toBeUndefined()
  })
})
