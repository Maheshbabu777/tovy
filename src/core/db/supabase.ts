import 'react-native-get-random-values'
import { createClient } from '@supabase/supabase-js'
import AsyncStorageLike from './authStorage'

const url = process.env.EXPO_PUBLIC_SUPABASE_URL
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error('Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY')
}

export const supabase = createClient(url, anonKey, {
  auth: { storage: AsyncStorageLike, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
})
