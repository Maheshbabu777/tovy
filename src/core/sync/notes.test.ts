// Unit test for the notes helpers. The Supabase plugin and the persistence plugin are replaced
// by a plain local store, so this only checks our add, rename and delete functions.
// The real sync against Supabase is covered by the e2e suite (tests/e2e).
import { addNote, deleteNote, notes$, renameNote } from './notes'

jest.mock('@legendapp/state/sync-plugins/supabase', () => ({
  configureSyncedSupabase: jest.fn(),
  syncedSupabase: () => ({}),
}))
jest.mock('../db/supabase', () => ({ supabase: {} }))
jest.mock('./persistPlugin', () => ({ persistPlugin: {} }))

describe('notes store', () => {
  it('adds a note, renames it and deletes it', () => {
    const id = addNote('first')
    expect(notes$[id].peek()).toMatchObject({ id, title: 'first' })

    renameNote(id, 'renamed')
    expect(notes$[id].title.peek()).toBe('renamed')

    deleteNote(id)
    expect(notes$[id].peek()).toBeUndefined()
  })

  it('gives each new note its own id', () => {
    expect(addNote('a')).not.toBe(addNote('b'))
  })
})
