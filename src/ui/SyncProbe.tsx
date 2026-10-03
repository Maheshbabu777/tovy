import { useEffect } from 'react'
import { Platform } from 'react-native'
import { syncState } from '@legendapp/state'
import { use$ } from '@legendapp/state/react'
import { useStore } from './StoreContext'

// Nothing is drawn. On the web it writes the sync state onto the page (`data-sync`) so the end-to-end tests can wait
// for it. People are not shown it: the offline and error banners and the Profile screen cover what they need.
export function SyncProbe() {
  const store = useStore()
  const taskState = syncState(store.tasks$)
  const projectState = syncState(store.projects$)
  const logState = syncState(store.logs$)
  const loaded = use$(taskState.isPersistLoaded)
  const pending =
    (use$(taskState.numPendingSets) ?? 0) +
    (use$(projectState.numPendingSets) ?? 0) +
    (use$(logState.numPendingSets) ?? 0)
  const value = !loaded ? 'loading' : pending > 0 ? `pending ${pending}` : 'synced'
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return
    document.documentElement.setAttribute('data-sync', value)
    return () => document.documentElement.removeAttribute('data-sync')
  }, [value])
  return null
}
