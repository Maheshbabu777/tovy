import { useEffect, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { syncState } from '@legendapp/state'
import { use$ } from '@legendapp/state/react'
import { supabase } from '../lib/supabase'
import { addNote, deleteNote, notes$, renameNote, type Note } from '../lib/notes'

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

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ? 'in' : 'out'))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s ? 'in' : 'out'))
    return () => data.subscription.unsubscribe()
  }, [])

  if (session === 'loading') return <Text style={styles.pad}>Loading</Text>
  return session === 'in' ? <NotesScreen /> : <SignIn />
}

function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function signIn() {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
  }

  return (
    <View style={styles.pad}>
      <TextInput testID="email" placeholder="email" value={email} onChangeText={setEmail} autoCapitalize="none" style={styles.input} />
      <TextInput testID="password" placeholder="password" value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />
      <Pressable testID="sign-in" onPress={signIn} style={styles.button}>
        <Text>Sign in</Text>
      </Pressable>
      {error ? <Text testID="auth-error">{error}</Text> : null}
    </View>
  )
}

function NotesScreen() {
  const notes = use$(notes$) as Record<string, Note> | undefined
  const state = syncState(notes$)
  const pending = use$(state.numPendingSets) ?? 0
  const loaded = use$(state.isPersistLoaded)
  const [draft, setDraft] = useState('')

  const list = Object.values(notes ?? {})
    .filter((n) => n && !n.deleted)
    .sort((a, b) => (a.created_at ?? '~').localeCompare(b.created_at ?? '~') || a.id.localeCompare(b.id))

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Text testID="status">{!loaded ? 'loading' : pending > 0 ? `pending ${pending}` : 'synced'}</Text>
      <View style={styles.row}>
        <TextInput testID="new-title" placeholder="New note" value={draft} onChangeText={setDraft} style={[styles.input, { flex: 1 }]} />
        <Pressable
          testID="add"
          style={styles.button}
          onPress={() => {
            if (!draft.trim()) return
            measure(() => addNote(draft.trim()))
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
            onChangeText={(t) => measure(() => renameNote(n.id, t))}
            style={[styles.input, { flex: 1 }]}
          />
          <Pressable testID={`delete-${n.id}`} style={styles.button} onPress={() => measure(() => deleteNote(n.id))}>
            <Text>Delete</Text>
          </Pressable>
        </View>
      ))}
      <Pressable testID="sign-out" style={styles.button} onPress={() => supabase.auth.signOut()}>
        <Text>Sign out</Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  pad: { padding: 16, gap: 8 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: { borderWidth: 1, borderColor: '#999', borderRadius: 8, padding: 8 },
  button: { borderWidth: 1, borderColor: '#999', borderRadius: 8, padding: 8 },
})
