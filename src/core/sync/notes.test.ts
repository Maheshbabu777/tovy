// Unit test for the notes helpers. The Supabase plugin and the persistence plugin are replaced
// by a plain local store, so this only checks our add, rename and delete functions.
// The real sync against Supabase is covered by the e2e suite (tests/e2e).
import { createNotesStore } from './notes'

jest.mock('@legendapp/state/sync-plugins/supabase', () => ({
  configureSyncedSupabase: jest.fn(),
  syncedSupabase: () => ({}),
}))
jest.mock('../db/supabase', () => ({ supabase: {} }))
jest.mock('./persistPlugin', () => ({ createPersistPlugin: () => ({}) }))

describe('notes store', () => {
  it('adds a note, renames it and deletes it', () => {
    const store = createNotesStore('user-1')
    const id = store.add('first')
    expect(store.notes$[id].peek()).toMatchObject({ id, title: 'first' })

    store.rename(id, 'renamed')
    expect(store.notes$[id].title.peek()).toBe('renamed')

    store.remove(id)
    expect(store.notes$[id].peek()).toBeUndefined()
  })

  it('gives each new note its own id', () => {
    const store = createNotesStore('user-1')
    expect(store.add('a')).not.toBe(store.add('b'))
  })

  it('keeps two users stores apart', () => {
    const first = createNotesStore('user-1')
    const second = createNotesStore('user-2')
    const id = first.add('only for the first user')

    expect(first.notes$[id].peek()).toBeDefined()
    expect(second.notes$[id].peek()).toBeUndefined()
    expect(Object.keys(second.notes$.peek() ?? {})).toEqual([])
  })
})
