import { useRef, useState } from 'react'
import { Text, View } from 'react-native'
import Constants from 'expo-constants'
import { cacheProfile, updateProfile, type Profile } from '../core/profile/profile'
import { checkProfileInput, USERNAME_HELP, USERNAME_PATTERN, type ProfileErrors } from '../core/profile/rules'
import { Button } from './components/Button'
import { Input } from './components/Input'
import { Segmented } from './components/Segmented'
import { useToast } from './components/Toast'
import { Logo } from './Brand'
import { useTheme, type ThemePreference } from './theme'
import { fonts, type } from './tokens'
import { useUsernameFree } from './useUsernameFree'

const THEMES: { value: ThemePreference; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
]

export const THEME_LABEL: Record<ThemePreference, string> = { light: 'Light', dark: 'Dark', system: 'System' }

// The theme: light, dark or follow the device. Changes apply at once.
export function AppearancePage() {
  const { theme, preference, setPreference } = useTheme()
  const c = theme.colors
  return (
    <View>
      <Text style={[type.label, { color: c.text2, marginTop: 24, marginBottom: 12 }]}>Theme</Text>
      <Segmented options={THEMES} value={preference} onChange={setPreference} testID="theme-choice" />
      <Text style={[type.meta, { color: c.text2, marginTop: 12 }]}>
        System follows your device. The change fades in everywhere at once.
      </Text>
    </View>
  )
}

// Names and username, with the same rules as the first-time setup. Saving goes back to the Profile screen.
export function EditProfilePage({ profile, onSaved }: { profile: Profile; onSaved: (profile: Profile) => void }) {
  const { theme } = useTheme()
  const c = theme.colors
  const toast = useToast()
  const [firstName, setFirstName] = useState(profile.first_name)
  const [lastName, setLastName] = useState(profile.last_name)
  const [username, setUsername] = useState(profile.username)
  const [errors, setErrors] = useState<ProfileErrors>({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const typed = useRef(profile.username) // what is in the field now, to tell if it changed while a save was in flight
  const unchanged = username === profile.username
  const free = useUsernameFree(unchanged ? '' : username)
  const taken = free === false && !unchanged && USERNAME_PATTERN.test(username)
  const hint = errors.username
    ? errors.username
    : taken
      ? 'That username is taken. Try another.'
      : free === true && !unchanged
        ? 'That username is free.'
        : USERNAME_HELP
  const hintColor = errors.username || taken ? c.bad : free === true && !unchanged ? c.ok : c.ink6

  async function save() {
    const found = checkProfileInput({ firstName, lastName, username })
    setErrors(found)
    setFormError('')
    if (Object.keys(found).length > 0) return
    setBusy(true)
    const result = await updateProfile(profile.id, { firstName: firstName.trim(), lastName: lastName.trim(), username })
    setBusy(false)
    if (result.ok) {
      await cacheProfile(result.profile)
      toast.show({ message: 'Profile saved' })
      onSaved(result.profile)
    } else if (result.field === 'username') {
      // If the person already changed the username while this was saving, the message is about the old one.
      if (typed.current === username) setErrors({ username: result.message })
    } else setFormError(result.message)
  }

  return (
    <View style={{ gap: 16, marginTop: 16 }}>
      <Input
        testID="edit-first-name"
        label="First name"
        value={firstName}
        onChangeText={(v) => {
          setFirstName(v)
          setErrors((e) => ({ ...e, firstName: undefined }))
        }}
        error={errors.firstName}
        autoComplete="given-name"
      />
      <Input
        testID="edit-last-name"
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
          testID="edit-username"
          label="Username"
          value={username}
          onChangeText={(v) => {
            const next = v.toLowerCase().replace(/\s/g, '')
            typed.current = next
            setUsername(next)
            setErrors((e) => ({ ...e, username: undefined }))
          }}
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={save}
        />
        <Text testID="edit-username-hint" style={[type.label, { color: hintColor }]}>
          {hint}
        </Text>
      </View>
      <Button testID="save-profile-edit" label={busy ? 'Saving' : 'Save'} onPress={save} disabled={busy} fullWidth />
      {formError ? (
        <Text accessibilityRole="alert" style={[type.label, { color: c.bad }]}>
          {formError}
        </Text>
      ) : null}
    </View>
  )
}

// The mark, the wordmark and the version.
export function AboutPage() {
  const { theme } = useTheme()
  const c = theme.colors
  return (
    <View style={{ alignItems: 'center', paddingTop: 32, gap: 12 }}>
      <Logo size={48} />
      <Text style={{ fontFamily: fonts.semibold, fontSize: 24, letterSpacing: -0.96, color: c.text }}>tovy</Text>
      <Text testID="app-version" style={[type.monoS, { color: c.ink6 }]}>
        Version {Constants.expoConfig?.version ?? ''}
      </Text>
      <Text style={[type.bodyS, { color: c.ink6, textAlign: 'center', maxWidth: 320 }]}>
        Tasks and routines that work on this device first and sync when you are online. Your data stays yours.
      </Text>
    </View>
  )
}
