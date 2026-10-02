import { useEffect, useRef, useState } from 'react'
import { Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { supabase } from '../src/core/db/supabase'
import { createTasksStore, type TasksStore } from '../src/core/sync/tasks'
import { TasksScreen } from '../src/ui/TasksScreen'
import { colors, fonts, radius } from '../src/ui/tokens'

export default function Index() {
  const [session, setSession] = useState<'loading' | 'out' | 'in'>('loading')
  // The tasks store of the signed-in user. Each user gets their own, and it is thrown away at sign out.
  const [store, setStore] = useState<TasksStore | null>(null)
  const storeRef = useRef<TasksStore | null>(null)

  useEffect(() => {
    const apply = (userId: string | undefined) => {
      const current = storeRef.current
      if (userId && current?.userId === userId) return // same user (for example a token refresh): keep the store
      storeRef.current = userId ? createTasksStore(userId) : null
      setStore(storeRef.current)
      setSession(userId ? 'in' : 'out')
      // This device keeps no copy of a signed-out user's tasks. Their store is cleared and never used again, so a
      // late background write from their session cannot show up in the next user's tasks.
      void current?.dispose()
    }
    supabase.auth.getSession().then(({ data }) => apply(data.session?.user.id))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => apply(s?.user.id))
    return () => data.subscription.unsubscribe()
  }, [])

  if (session === 'loading') return <Text style={styles.pad}>Loading</Text>
  return session === 'in' && store ? <TasksScreen key={store.userId} store={store} /> : <SignIn />
}

function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function signIn() {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
  }

  // Google sign in is for web in this version (a phone needs a dev build, see the auth spec).
  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) setError(error.message)
  }

  return (
    <View style={styles.pad}>
      <Image source={require('../assets/brand/tovy-logo.png')} style={styles.logo} accessibilityLabel="Tovy" />
      {Platform.OS === 'web' ? (
        <Pressable testID="google-sign-in" onPress={signInWithGoogle} style={styles.button}>
          <Text style={styles.buttonText}>Continue with Google</Text>
        </Pressable>
      ) : null}
      <TextInput
        testID="email"
        placeholder="email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        style={styles.input}
      />
      <TextInput
        testID="password"
        placeholder="password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />
      <Pressable testID="sign-in" onPress={signIn} style={styles.button}>
        <Text style={styles.buttonText}>Sign in</Text>
      </Pressable>
      {error ? (
        <Text testID="auth-error" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  pad: { padding: 24, gap: 12, maxWidth: 420, width: '100%', alignSelf: 'center' },
  logo: { width: 56, height: 56, resizeMode: 'contain', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.ring,
    borderRadius: radius.control,
    padding: 12,
    backgroundColor: colors.card,
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.ink,
  },
  button: { borderRadius: radius.pill, padding: 12, alignItems: 'center', backgroundColor: colors.accent },
  buttonText: { color: 'white', fontFamily: fonts.sans, fontSize: 14.5, fontWeight: '600' },
  error: { color: colors.danger, fontFamily: fonts.sans, fontSize: 13 },
})
