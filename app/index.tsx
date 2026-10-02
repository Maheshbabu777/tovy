import { useEffect, useRef, useState } from 'react'
import { StyleSheet, Text } from 'react-native'
import { supabase } from '../src/core/db/supabase'
import { createTasksStore, type TasksStore } from '../src/core/sync/tasks'
import { TasksScreen } from '../src/ui/TasksScreen'
import { clearCachedProfile } from '../src/core/profile/profile'
import { ProfileGate } from '../src/ui/ProfileGate'
import { SignInScreen } from '../src/ui/SignInScreen'

export default function Index() {
  const [session, setSession] = useState<'loading' | 'out' | 'in'>('loading')
  // The tasks store of the signed-in user. Each user gets their own, and it is thrown away at sign out.
  const [store, setStore] = useState<TasksStore | null>(null)
  const storeRef = useRef<TasksStore | null>(null)
  // What the sign in told us about the person (Google gives the name), used to fill the profile step.
  const [metadata, setMetadata] = useState<Record<string, unknown> | undefined>(undefined)

  useEffect(() => {
    const apply = (userId: string | undefined, userMetadata?: Record<string, unknown>) => {
      const current = storeRef.current
      if (userId && current?.userId === userId) return // same user (for example a token refresh): keep the store
      setMetadata(userMetadata)
      // Same as the tasks: this device keeps no profile of someone who signed out.
      if (current) void clearCachedProfile(current.userId)
      storeRef.current = userId ? createTasksStore(userId) : null
      setStore(storeRef.current)
      setSession(userId ? 'in' : 'out')
      // This device keeps no copy of a signed-out user's tasks. Their store is cleared and never used again, so a
      // late background write from their session cannot show up in the next user's tasks.
      void current?.dispose()
    }
    supabase.auth.getSession().then(({ data }) => apply(data.session?.user.id, data.session?.user.user_metadata))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => apply(s?.user.id, s?.user.user_metadata))
    return () => data.subscription.unsubscribe()
  }, [])

  if (session === 'loading') return <Text style={styles.pad}>Loading</Text>
  return session === 'in' && store ? (
    <ProfileGate key={store.userId} userId={store.userId} metadata={metadata}>
      <TasksScreen store={store} />
    </ProfileGate>
  ) : (
    <SignInScreen />
  )
}

const styles = StyleSheet.create({
  pad: { padding: 24 },
})
