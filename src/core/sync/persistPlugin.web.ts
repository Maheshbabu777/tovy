// Web: notes are persisted in IndexedDB, with one database per store name (one per user), so a late write from one
// user's session can never end up in another user's data.
import { observablePersistIndexedDB } from '@legendapp/state/persist-plugins/indexeddb'

export function createPersistPlugin(name: string) {
  return observablePersistIndexedDB({
    databaseName: `tovy-${name}`,
    version: 1,
    tableNames: [name],
  })
}
