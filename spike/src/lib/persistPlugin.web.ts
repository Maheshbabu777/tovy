// Web: notes are persisted in IndexedDB.
import { observablePersistIndexedDB } from '@legendapp/state/persist-plugins/indexeddb'

export const persistPlugin = observablePersistIndexedDB({
  databaseName: 'tovy-spike',
  version: 1,
  tableNames: ['notes'],
})
