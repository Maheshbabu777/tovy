import { useEffect, useState } from 'react'
import { readCachedProfile, type Profile } from '../core/profile/profile'
import { useStore } from './StoreContext'

// The signed-in person's profile from this device's copy (ProfileGate saves it before the app opens). `profileSaved`
// tells every user of the hook to read it again after an edit.
const listeners = new Set<() => void>()
export const profileSaved = () => listeners.forEach((l) => l())

export function useProfile(): Profile | null {
  const store = useStore()
  const [profile, setProfile] = useState<Profile | null>(null)
  useEffect(() => {
    const load = () => void readCachedProfile(store.userId).then(setProfile)
    load()
    listeners.add(load)
    return () => {
      listeners.delete(load)
    }
  }, [store.userId])
  return profile
}

export const initialsOf = (p: Profile | null) =>
  p ? `${p.first_name[0] ?? ''}${p.last_name[0] ?? ''}`.toUpperCase() : ''
