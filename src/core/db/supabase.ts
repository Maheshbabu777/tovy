import 'react-native-get-random-values'
import { Platform } from 'react-native'
import { createClient } from '@supabase/supabase-js'
import AsyncStorageLike from './authStorage'

const url = process.env.EXPO_PUBLIC_SUPABASE_URL
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error('Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY')
}

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: AsyncStorageLike,
    persistSession: true,
    autoRefreshToken: true,
    // PKCE: the code that comes back from Google is useless without a secret that never leaves this device.
    flowType: 'pkce',
    // On web, finish the sign in when Google sends the person back to the app with `?code=` in the address.
    detectSessionInUrl: Platform.OS === 'web',
  },
})
