import { useEffect, useRef, useState } from 'react'
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { syncState } from '@legendapp/state'
import { use$ } from '@legendapp/state/react'
import { supabase } from '../src/core/db/supabase'
import { createNotesStore, type Note, type NotesStore } from '../src/core/sync/notes'

// Test hook: lets the end-to-end tests read tap-to-render timings.
const perf: number[] = []
;(globalThis as any).__perf = perf
function measure(action: () => void) {
  const start = performance.now()
  action()
  requestAnimationFrame(() => perf.push(performance.now() - start))
}

export default function Index() {
  const [session, setSession] = useState<'loading' | 'out' | 'in'>('loading')
  // The notes store of the signed-in user. Each user gets their own, and it is thrown away at sign out.
  const [store, setStore] = useState<NotesStore | null>(null)
  const storeRef = useRef<NotesStore | null>(null)

  useEffect(() => {
    const apply = (userId: string | undefined) => {
      const current = storeRef.current
      if (userId && current?.userId === userId) return // same user (for example a token refresh): keep the store
      storeRef.current = userId ? createNotesStore(userId) : null
      setStore(storeRef.current)
      setSession(userId ? 'in' : 'out')
      // This device keeps no copy of a signed-out user's notes. Their store is cleared and never used again, so a
      // late background write from their session cannot show up in the next user's notes.
      void current?.dispose()
    }
    supabase.auth.getSession().then(({ data }) => apply(data.session?.user.id))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => apply(s?.user.id))
    return () => data.subscription.unsubscribe()
  }, [])

  if (session === 'loading') return <Text style={styles.pad}>Loading</Text>
  return session === 'in' && store ? <NotesScreen key={store.userId} store={store} /> : <SignIn />
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
      {Platform.OS === 'web' ? (
        <Pressable testID="google-sign-in" onPress={signInWithGoogle} style={styles.button}>
          <Text>Continue with Google</Text>
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
        <Text>Sign in</Text>
      </Pressable>
      {error ? <Text testID="auth-error">{error}</Text> : null}
    </View>
  )
}

function NotesScreen({ store }: { store: NotesStore }) {
  const notes = use$(store.notes$) as Record<string, Note> | undefined
  const state = syncState(store.notes$)
  const pending = use$(state.numPendingSets) ?? 0
  const loaded = use$(state.isPersistLoaded)
  const [draft, setDraft] = useState('')
  const [confirmingSignOut, setConfirmingSignOut] = useState(false)
  const [unsyncedCount, setUnsyncedCount] = useState(0)

  useEffect(() => store.catchUpAfterRealtime(), [store])

  // Read the live count when the button is pressed, not the one from the last render, which can lag a fresh edit.
  function requestSignOut() {
    const unsynced = Math.max(state.numPendingSets.peek() ?? 0, Object.keys(state.getPendingChanges() ?? {}).length)
    if (unsynced > 0) {
      setUnsyncedCount(unsynced)
      setConfirmingSignOut(true)
    } else void signOut()
  }

  // This device only: other devices stay signed in. The user's store on this device is cleared once we are signed out.
  const signOut = () => supabase.auth.signOut({ scope: 'local' })

  const list = Object.values(notes ?? {})
    .filter((n) => n && !n.deleted)
    .sort((a, b) => (a.created_at ?? '~').localeCompare(b.created_at ?? '~') || a.id.localeCompare(b.id))

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Text testID="status">{!loaded ? 'loading' : pending > 0 ? `pending ${pending}` : 'synced'}</Text>
      <View style={styles.row}>
        <TextInput
          testID="new-title"
          placeholder="New note"
          value={draft}
          onChangeText={setDraft}
          style={[styles.input, { flex: 1 }]}
        />
        <Pressable
          testID="add"
          style={styles.button}
          onPress={() => {
            if (!draft.trim()) return
            measure(() => store.add(draft.trim()))
            setDraft('')
          }}
        >
          <Text>Add</Text>
        </Pressable>
      </View>
      {list.map((n) => (
        <View key={n.id} style={styles.row} testID="note">
          <TextInput
            testID={`title-${n.id}`}
            value={n.title}
            onChangeText={(t) => measure(() => store.rename(n.id, t))}
            style={[styles.input, { flex: 1 }]}
          />
          <Pressable testID={`delete-${n.id}`} style={styles.button} onPress={() => measure(() => store.remove(n.id))}>
            <Text>Delete</Text>
          </Pressable>
        </View>
      ))}
      {confirmingSignOut ? (
        <View testID="unsynced-note" style={styles.warning}>
          <Text>
            {unsyncedCount === 1 ? '1 change is' : `${unsyncedCount} changes are`} not saved to the server yet. Signing
            out will discard {unsyncedCount === 1 ? 'it' : 'them'}.
          </Text>
          <View style={styles.row}>
            <Pressable testID="cancel-sign-out" style={styles.button} onPress={() => setConfirmingSignOut(false)}>
              <Text>Cancel</Text>
            </Pressable>
            <Pressable testID="confirm-sign-out" style={styles.button} onPress={signOut}>
              <Text>Sign out anyway</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable testID="sign-out" style={styles.button} onPress={requestSignOut}>
          <Text>Sign out</Text>
        </Pressable>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  pad: { padding: 16, gap: 8 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: { borderWidth: 1, borderColor: '#999', borderRadius: 8, padding: 8 },
  button: { borderWidth: 1, borderColor: '#999', borderRadius: 8, padding: 8 },
  warning: { borderWidth: 1, borderColor: '#c60', borderRadius: 8, padding: 8, gap: 8 },
})
