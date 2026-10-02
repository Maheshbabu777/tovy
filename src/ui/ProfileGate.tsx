import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
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
import { colors, fonts, radius } from './tokens'

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
  if (state.kind === 'unavailable') {
    return (
      <View style={styles.pad}>
        <Image source={require('../../assets/brand/tovy-logo.png')} style={styles.logo} accessibilityLabel="Tovy" />
        <Text testID="profile-unavailable" style={styles.title}>
          Connect to the internet to finish setting up
        </Text>
        <Text style={styles.hint}>Tovy needs to check your profile once. After that it works offline.</Text>
        <Pressable testID="profile-retry" style={styles.button} onPress={() => setAttempt((n) => n + 1)}>
          <Text style={styles.buttonText}>Try again</Text>
        </Pressable>
      </View>
    )
  }
  return (
    <Text testID="profile-loading" style={styles.pad}>
      Loading
    </Text>
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

  const usernameHint = errors.username
    ? errors.username
    : available === true
      ? 'That username is free.'
      : available === false && USERNAME_PATTERN.test(username)
        ? 'That username is taken. Try another.'
        : USERNAME_HELP

  return (
    <View style={styles.pad}>
      <Image source={require('../../assets/brand/tovy-logo.png')} style={styles.logo} accessibilityLabel="Tovy" />
      <Text style={styles.title}>Tell us who you are</Text>
      <Text style={styles.hint}>Three details, once.</Text>

      <TextInput
        testID="first-name"
        placeholder="First name"
        placeholderTextColor={colors.inkFaint}
        value={firstName}
        onChangeText={(v) => {
          setFirstName(v)
          setErrors((e) => ({ ...e, firstName: undefined })) // the old message no longer applies
        }}
        autoComplete="given-name"
        style={styles.input}
      />
      {errors.firstName ? <Text style={styles.error}>{errors.firstName}</Text> : null}
      <TextInput
        testID="last-name"
        placeholder="Last name"
        placeholderTextColor={colors.inkFaint}
        value={lastName}
        onChangeText={(v) => {
          setLastName(v)
          setErrors((e) => ({ ...e, lastName: undefined }))
        }}
        autoComplete="family-name"
        style={styles.input}
      />
      {errors.lastName ? <Text style={styles.error}>{errors.lastName}</Text> : null}
      <TextInput
        testID="username"
        placeholder="Username"
        placeholderTextColor={colors.inkFaint}
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
        style={styles.input}
        onSubmitEditing={submit}
      />
      <Text
        testID="username-hint"
        style={errors.username || available === false ? styles.error : available === true ? styles.ok : styles.hint}
      >
        {usernameHint}
      </Text>

      <Pressable
        testID="save-profile"
        onPress={submit}
        disabled={busy}
        style={[styles.button, busy && styles.disabled]}
      >
        <Text style={styles.buttonText}>{busy ? 'Saving' : 'Continue'}</Text>
      </Pressable>
      {formError ? (
        <Text testID="profile-error" style={styles.error}>
          {formError}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  pad: { padding: 24, gap: 10, maxWidth: 420, width: '100%', alignSelf: 'center' },
  logo: { width: 56, height: 56, resizeMode: 'contain', marginBottom: 8 },
  title: { fontFamily: fonts.sans, fontSize: 20, fontWeight: '600', color: colors.ink },
  hint: { fontFamily: fonts.sans, fontSize: 13.5, color: colors.inkSoft },
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
  button: {
    borderRadius: radius.pill,
    padding: 12,
    alignItems: 'center',
    backgroundColor: colors.accent,
    marginTop: 6,
  },
  buttonText: { color: 'white', fontFamily: fonts.sans, fontSize: 14.5, fontWeight: '600' },
  disabled: { opacity: 0.55 },
  error: { color: colors.danger, fontFamily: fonts.sans, fontSize: 13 },
  ok: { color: colors.ok, fontFamily: fonts.sans, fontSize: 13 },
})
