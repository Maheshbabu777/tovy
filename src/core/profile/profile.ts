import { supabase } from '../db/supabase'
import storage from '../db/authStorage'
import { USERNAME_PATTERN, type ProfileInput } from './rules'

export type Profile = { id: string; first_name: string; last_name: string; username: string }

const COLUMNS = 'id, first_name, last_name, username'
const cacheKey = (userId: string) => `tovy-profile-${userId}`

// A copy of the profile is kept on the device so a person who has signed in before still gets in when offline. It is
// removed at sign out, so the next person on the device never sees it.
export async function readCachedProfile(userId: string): Promise<Profile | null> {
  try {
    const raw = await storage.getItem(cacheKey(userId))
    return raw ? (JSON.parse(raw) as Profile) : null
  } catch {
    return null
  }
}

export async function cacheProfile(profile: Profile): Promise<void> {
  try {
    await storage.setItem(cacheKey(profile.id), JSON.stringify(profile))
  } catch {
    // the copy is only a convenience
  }
}

export async function clearCachedProfile(userId: string): Promise<void> {
  try {
    await storage.removeItem(cacheKey(userId))
  } catch {
    // nothing to clear
  }
}

export type LoadResult =
  | { kind: 'found'; profile: Profile }
  | { kind: 'none' } // signed in, but never finished registering
  | { kind: 'unavailable'; message: string } // could not ask (offline, or the server failed)

export async function fetchProfile(userId: string): Promise<LoadResult> {
  const { data, error } = await supabase.from('profiles').select(COLUMNS).eq('id', userId).maybeSingle()
  if (error) return { kind: 'unavailable', message: error.message }
  return data ? { kind: 'found', profile: data as Profile } : { kind: 'none' }
}

// true: free, false: taken or badly formed, null: could not ask.
export async function isUsernameAvailable(username: string): Promise<boolean | null> {
  if (!USERNAME_PATTERN.test(username)) return false
  const { data, error } = await supabase.rpc('username_available', { name: username })
  return error ? null : data === true
}

export type SaveResult = { ok: true; profile: Profile } | { ok: false; field: 'username' | 'form'; message: string }

export async function saveProfile(userId: string, input: ProfileInput): Promise<SaveResult> {
  const { data, error } = await supabase
    .from('profiles')
    .insert({ id: userId, first_name: input.firstName, last_name: input.lastName, username: input.username })
    .select(COLUMNS)
    .single()
  if (!error) return { ok: true, profile: data as Profile }
  if (error.code === '23505') {
    // Unique violation: either the username is taken, or this person already registered (on another device a moment ago).
    if (error.message.includes('profiles_pkey')) {
      const existing = await fetchProfile(userId)
      if (existing.kind === 'found') return { ok: true, profile: existing.profile }
    }
    return { ok: false, field: 'username', message: 'That username is taken. Try another.' }
  }
  return { ok: false, field: 'form', message: 'Could not save. Check your connection and try again.' }
}

// Changes the names and username of an existing profile. The username may stay the same.
export async function updateProfile(userId: string, input: ProfileInput): Promise<SaveResult> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ first_name: input.firstName, last_name: input.lastName, username: input.username })
    .eq('id', userId)
    .select(COLUMNS)
    .single()
  if (!error) return { ok: true, profile: data as Profile }
  if (error.code === '23505') return { ok: false, field: 'username', message: 'That username is taken. Try another.' }
  return { ok: false, field: 'form', message: 'Could not save. Check your connection and try again.' }
}
