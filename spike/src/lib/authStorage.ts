// Phone: SQLite key-value store for the auth session.
import Storage from 'expo-sqlite/kv-store'

export default {
  getItem: (key: string) => Storage.getItem(key),
  setItem: (key: string, value: string) => Storage.setItem(key, value),
  removeItem: (key: string) => Storage.removeItem(key),
}
