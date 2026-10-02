import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Text, View } from 'react-native'
import {
  cacheProfile,
  clearCachedProfile,
  fetchProfile,
  isUsernameAvailable,
  readCachedProfile,
  saveProfile,
} from '../core/profile/profile'
import {
  checkProfileInput,
  prefillNames,
  USERNAME_HELP,
  USERNAME_PATTERN,
  type ProfileErrors,
} from '../core/profile/rules'
import { AuthLayout } from './components/AuthLayout'
import { Button } from './components/Button'
import { Input } from './components/Input'
import { useTheme } from './theme'
import { type } from './tokens'
import { LoadingScreen } from './Brand'

type State = { kind: 'loading' } | { kind: 'ready' } | { kind: 'setup' } | { kind: 'unavailable'; message: string }

// Shows the app only once the person has a profile. A new person fills in the setup step first. Someone who has been
// here before goes straight in, using the copy kept on the device, so this also works offline.
export function ProfileGate({
  userId,
  metadata,
  children,
}: {
  userId: string
  metadata: Record<string, unknown> | undefined
  children: ReactNode
}) {
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const cached = await readCachedProfile(userId)
      if (cached && !cancelled) setState({ kind: 'ready' })
      const result = await fetchProfile(userId)
      if (cancelled) return
      if (result.kind === 'found') {
        await cacheProfile(result.profile)
        setState({ kind: 'ready' })
      } else if (result.kind === 'none') {
        await clearCachedProfile(userId)
        setState({ kind: 'setup' })
      } else if (!cached) {
        setState({ kind: 'unavailable', message: result.message })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [userId, attempt])

  if (state.kind === 'ready') return <>{children}</>
  if (state.kind === 'setup') {
    return <ProfileSetup userId={userId} defaults={prefillNames(metadata)} onDone={() => setState({ kind: 'ready' })} />
  }
  if (state.kind === 'unavailable') return <Unavailable onRetry={() => setAttempt((n) => n + 1)} />
  return <Loading />
}

function Loading() {
  return <LoadingScreen testID="profile-loading" />
}

function Unavailable({ onRetry }: { onRetry: () => void }) {
  const { theme } = useTheme()
  const c = theme.colors
  return (
    <AuthLayout>
      <Text testID="profile-unavailable" style={[type.h1Large, { color: c.ink }]}>
        Connect to the internet to finish setting up
      </Text>
      <Text style={[type.body, { color: c.ink6, marginTop: 12, marginBottom: 24 }]}>
        Tovy needs to check your profile once. After that it works offline.
      </Text>
      <Button testID="profile-retry" label="Try again" onPress={onRetry} />
    </AuthLayout>
  )
}

function ProfileSetup({
  userId,
  defaults,
  onDone,
}: {
  userId: string
  defaults: { firstName: string; lastName: string }
  onDone: () => void
}) {
  const [firstName, setFirstName] = useState(defaults.firstName)
  const [lastName, setLastName] = useState(defaults.lastName)
  const [username, setUsername] = useState('')
  const [errors, setErrors] = useState<ProfileErrors>({})
  const [formError, setFormError] = useState('')
  const [available, setAvailable] = useState<boolean | null>(null) // null: not asked or could not ask
  const [busy, setBusy] = useState(false)
  const typedUsername = useRef('') // what is in the field now, to tell if it changed while a save was in flight

  // Ask whether the username is free shortly after the person stops typing.
  useEffect(() => {
    if (!USERNAME_PATTERN.test(username)) return
    let cancelled = false
    const timer = setTimeout(() => {
      void isUsernameAvailable(username).then((free) => {
        if (!cancelled) setAvailable(free)
      })
    }, 400)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [username])

  async function submit() {
    const found = checkProfileInput({ firstName, lastName, username })
    setErrors(found)
    setFormError('')
    if (Object.keys(found).length > 0) return
    setBusy(true)
    const result = await saveProfile(userId, { firstName, lastName, username })
    setBusy(false)
    if (result.ok) {
      await cacheProfile(result.profile)
      onDone()
    } else if (result.field === 'username') {
      // If the person already changed the username while this was saving, the message is about the old one.
      if (typedUsername.current === username) setErrors({ username: result.message })
    } else {
      setFormError(result.message)
    }
  }

  const { theme } = useTheme()
  const c = theme.colors
  const taken = available === false && USERNAME_PATTERN.test(username)
  const usernameHint = errors.username
    ? errors.username
    : available === true
      ? 'That username is free.'
      : taken
        ? 'That username is taken. Try another.'
        : USERNAME_HELP
  const hintColor = errors.username || taken ? c.bad : available === true ? c.ok : c.ink6

  return (
    <AuthLayout>
      <Text style={[type.h1Large, { color: c.ink }]}>Tell us who you are</Text>
      <Text style={[type.body, { color: c.ink6, marginTop: 12, marginBottom: 24 }]}>Three details, once.</Text>
      <View style={{ gap: 16 }}>
        <Input
          testID="first-name"
          label="First name"
          value={firstName}
          onChangeText={(v) => {
            setFirstName(v)
            setErrors((e) => ({ ...e, firstName: undefined })) // the old message no longer applies
          }}
          error={errors.firstName}
          autoComplete="given-name"
        />
        <Input
          testID="last-name"
          label="Last name"
          value={lastName}
          onChangeText={(v) => {
            setLastName(v)
            setErrors((e) => ({ ...e, lastName: undefined }))
          }}
          error={errors.lastName}
          autoComplete="family-name"
        />
        <View style={{ gap: 6 }}>
          <Input
            testID="username"
            label="Username"
            value={username}
            onChangeText={(v) => {
              const next = v.toLowerCase().replace(/\s/g, '')
              typedUsername.current = next
              setUsername(next)
              setAvailable(null) // the answer for the old text no longer applies
              setErrors((e) => ({ ...e, username: undefined }))
            }}
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={submit}
          />
          <Text testID="username-hint" style={[type.label, { color: hintColor }]}>
            {usernameHint}
          </Text>
        </View>
      </View>
      <View style={{ marginTop: 24 }}>
        <Button testID="save-profile" label={busy ? 'Saving' : 'Continue'} fullWidth disabled={busy} onPress={submit} />
      </View>
      {formError ? (
        <Text testID="profile-error" accessibilityRole="alert" style={[type.label, { color: c.bad, marginTop: 12 }]}>
          {formError}
        </Text>
      ) : null}
    </AuthLayout>
  )
}
