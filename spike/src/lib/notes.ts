import { v4 as uuidv4 } from 'uuid'
import { observable } from '@legendapp/state'
import { configureSyncedSupabase, syncedSupabase } from '@legendapp/state/sync-plugins/supabase'
import { supabase } from './supabase'
import { persistPlugin } from './persistPlugin'

configureSyncedSupabase({
  generateId: () => uuidv4(),
  changesSince: 'last-sync',
  fieldCreatedAt: 'created_at',
  fieldUpdatedAt: 'updated_at',
  fieldDeleted: 'deleted',
})

export type Note = {
  id: string
  user_id?: string
  title: string
  deleted?: boolean
  created_at?: string | null
  updated_at?: string | null
}

// Every read and write hits this local observable. The plugin persists it
// locally, queues changes (retrySync) and syncs with Supabase in the background.
export const notes$ = observable(
  syncedSupabase({
    supabase,
    collection: 'notes',
    realtime: true,
    persist: { name: 'notes', plugin: persistPlugin, retrySync: true },
  }),
)

export function addNote(title: string): string {
  const id = uuidv4()
  notes$[id].set({ id, title, created_at: null, updated_at: null })
  return id
}

export function renameNote(id: string, title: string) {
  notes$[id].title.set(title)
}

export function deleteNote(id: string) {
  notes$[id].delete()
}
