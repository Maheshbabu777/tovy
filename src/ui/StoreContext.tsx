import { createContext, useContext } from 'react'
import type { TasksStore } from '../core/sync/tasks'

// The signed in user's tasks store, shared by every screen. The auth gate provides it and replaces it on sign out.
export const StoreContext = createContext<TasksStore | null>(null)

export function useStore(): TasksStore {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useStore needs a signed in user')
  return store
}
