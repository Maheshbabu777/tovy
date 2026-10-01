// Phone: notes are persisted in SQLite. The store name (one per user) keeps each user's rows apart.
import { observablePersistSqlite } from '@legendapp/state/persist-plugins/expo-sqlite'
import Storage from 'expo-sqlite/kv-store'

export function createPersistPlugin(_name: string) {
  return observablePersistSqlite(Storage)
}
