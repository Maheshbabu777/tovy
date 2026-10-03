import { useEffect, useRef, useState, type ReactNode } from 'react'
import { supabase } from '../core/db/supabase'
import { clearCachedProfile } from '../core/profile/profile'
import { createTasksStore, type TasksStore } from '../core/sync/tasks'
import { LoadingScreen } from './Brand'
import { ProfileGate } from './ProfileGate'
import { SignInScreen } from './SignInScreen'
import { StoreContext } from './StoreContext'
import { SyncProbe } from './SyncProbe'
import { takeReturn } from './returnTo'
import { useRouter } from 'expo-router'

// Everything behind sign in. Signed out: the sign in screen. Signed in: the profile step if it is not done, then the
// app, with the person's own tasks store available to every screen.
export function AuthGate({ children }: { children: ReactNode }) {
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

  if (session === 'loading') return <LoadingScreen />
  if (session === 'in' && store) {
    return (
      <ProfileGate key={store.userId} userId={store.userId} metadata={metadata}>
        <StoreContext.Provider value={store}>
          <SyncProbe />
          <ReturnAfterSignIn />
          {children}
        </StoreContext.Provider>
      </ProfileGate>
    )
  }
  return <SignInScreen />
}

// Back to the consent screen after a Google sign in that started there (see returnTo.ts).
function ReturnAfterSignIn() {
  const router = useRouter()
  useEffect(() => {
    const path = takeReturn()
    if (path) router.replace(path as never)
  }, [router])
  return null
}
