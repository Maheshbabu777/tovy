import { useEffect, useRef, useState } from 'react'
import { StyleSheet, Text } from 'react-native'
import { supabase } from '../src/core/db/supabase'
import { createTasksStore, type TasksStore } from '../src/core/sync/tasks'
import { TasksScreen } from '../src/ui/TasksScreen'
import { SignInScreen } from '../src/ui/SignInScreen'

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
  return session === 'in' && store ? <TasksScreen key={store.userId} store={store} /> : <SignInScreen />
}

const styles = StyleSheet.create({
  pad: { padding: 24 },
})
