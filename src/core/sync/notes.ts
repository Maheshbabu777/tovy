import { v4 as uuidv4 } from 'uuid'
import { observable, syncState } from '@legendapp/state'
import { syncedSupabase } from '@legendapp/state/sync-plugins/supabase'
import { supabase } from '../db/supabase'
import './syncConfig'
import { createPersistPlugin } from './persistPlugin'

export type Note = {
  id: string
  user_id?: string
  title: string
  deleted?: boolean
  created_at?: string | null
  updated_at?: string | null
}

// One store per signed-in user. Every read and write hits the store's local observable. The plugin saves it on the
// device (in a partition named for the user), queues changes (retrySync) and syncs with Supabase in the background.
// Keeping each user's data in its own partition means a late background write from one user's session can never
// show up in the next user's notes.
export function createNotesStore(userId: string) {
  const name = `notes-${userId}`
  const notes$ = observable(
    syncedSupabase({
      supabase,
      collection: 'notes',
      realtime: true,
      persist: { name, plugin: createPersistPlugin(name), retrySync: true },
    }),
  )

  return {
    userId,
    notes$,

    add(title: string): string {
      const id = uuidv4()
      notes$[id].set({ id, title, created_at: null, updated_at: null })
      return id
    },

    rename(id: string, title: string) {
      notes$[id].title.set(title)
    },

    remove(id: string) {
      notes$[id].delete()
    },

    // The Supabase sync plugin does not fetch again after its realtime channel joins, so a change another device
    // saves between the first load and the join is never seen. This opens a channel of our own and syncs once it is
    // joined (and once more shortly after, in case the plugin's channel joined later). Call it while signed in.
    catchUpAfterRealtime(): () => void {
      let later: ReturnType<typeof setTimeout> | undefined
      const channel = supabase
        .channel(`notes-catch-up-${userId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, () => {})
        .subscribe((status) => {
          if (status !== 'SUBSCRIBED') return
          void syncState(notes$).sync()
          later = setTimeout(() => void syncState(notes$).sync(), 1500)
        })
      return () => {
        clearTimeout(later)
        void supabase.removeChannel(channel)
      }
    },

    // Forgets this user's copy of the notes on this device (used at sign out). reset() clears the local store and the
    // sync cursor and stops the realtime subscription, and it empties the store as a remote change, so nothing is
    // deleted on the server.
    async dispose(): Promise<void> {
      await syncState(notes$).reset()
    },
  }
}

export type NotesStore = ReturnType<typeof createNotesStore>
