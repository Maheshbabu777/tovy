import { useEffect, useState, type ReactNode } from 'react'
import { Modal, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native'
import Constants from 'expo-constants'
import { syncState } from '@legendapp/state'
import { use$ } from '@legendapp/state/react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '../core/db/supabase'
import { readCachedProfile, type Profile } from '../core/profile/profile'
import { Button } from './components/Button'
import { Segmented } from './components/Segmented'
import { transition, useFocusRing } from './components/web'
import { Logo } from './Brand'
import { useStore } from './StoreContext'
import { ACCENTS, accentColor, useTheme, type AccentName, type ThemePreference } from './theme'
import { fonts, radius, type, WIDE_BREAKPOINT } from './tokens'
import { useOnline } from './useOnline'

const THEMES: { value: ThemePreference; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
]

// Design 11.17 and 11.18 limited to what exists now. Appearance sits on this screen instead of its own page.
export function ProfileScreen() {
  const { theme, preference, accent, setPreference, setAccent } = useTheme()
  const c = theme.colors
  const store = useStore()
  const online = useOnline()
  const insets = useSafeAreaInsets()
  const wide = useWindowDimensions().width >= WIDE_BREAKPOINT
  const taskState = syncState(store.tasks$)
  const projectState = syncState(store.projects$)
  const pending = (use$(taskState.numPendingSets) ?? 0) + (use$(projectState.numPendingSets) ?? 0)
  const taskError = use$(taskState.error)
  const projectError = use$(projectState.error)
  const failed = Boolean(taskError || projectError)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [account, setAccount] = useState<{ email: string; provider: string } | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [unsynced, setUnsynced] = useState(0)

  useEffect(() => {
    void readCachedProfile(store.userId).then(setProfile)
    void supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user
      if (user) setAccount({ email: user.email ?? '', provider: String(user.app_metadata?.provider ?? 'email') })
    })
  }, [store.userId])

  // Read the live count when the button is pressed, not the one from the last render, which can lag a fresh edit.
  function requestSignOut() {
    const count = (st: typeof taskState) =>
      Math.max(st.numPendingSets.peek() ?? 0, Object.keys(st.getPendingChanges() ?? {}).length)
    setUnsynced(count(taskState) + count(projectState))
    setConfirming(true)
  }
  // This device only: other devices stay signed in. The user's store on this device is cleared once we are signed out.
  const signOut = () => supabase.auth.signOut({ scope: 'local' })

  const name = profile ? `${profile.first_name} ${profile.last_name}`.trim() : ''
  const initials = profile ? `${profile.first_name[0] ?? ''}${profile.last_name[0] ?? ''}`.toUpperCase() : ''
  const syncLabel = failed
    ? 'Error'
    : !online
      ? 'Offline'
      : pending > 0
        ? `${pending} ${pending === 1 ? 'change' : 'changes'} waiting`
        : 'Up to date'

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: wide ? 32 : 16,
          paddingTop: wide ? 24 : 16,
          paddingBottom: wide ? 48 : 96 + insets.bottom,
        }}
      >
        <View style={{ width: '100%', maxWidth: 672, alignSelf: 'center' }}>
          <Text accessibilityRole="header" style={[type.pageTitle, { color: c.ink }]}>
            Profile
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 20 }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: c.accentSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={[type.h3, { color: c.accent }]}>{initials || '?'}</Text>
            </View>
            <View style={{ flexShrink: 1 }}>
              <Text testID="profile-name" style={[type.h3, { color: c.ink }]}>
                {name}
              </Text>
              <Text testID="profile-email" style={[type.bodyS, { color: c.ink6 }]}>
                {account?.email ?? ''}
              </Text>
              <Text style={[type.meta, { color: c.ink6, marginTop: 2 }]}>
                {profile ? `@${profile.username}` : ''}
                {account
                  ? `${profile ? ' . ' : ''}${account.provider === 'google' ? 'Google linked' : 'Email code'}`
                  : ''}
              </Text>
            </View>
          </View>

          <Group title="Theme">
            <View style={{ padding: 12 }}>
              <Segmented options={THEMES} value={preference} onChange={setPreference} testID="theme-choice" />
            </View>
          </Group>

          <Group title="Accent">
            <View style={{ flexDirection: 'row', gap: 10, padding: 12 }}>
              {(Object.keys(ACCENTS) as AccentName[]).map((name) => (
                <AccentCard
                  key={name}
                  label={ACCENTS[name].label}
                  swatch={accentColor(name, theme.mode)}
                  selected={name === accent}
                  onPress={() => setAccent(name)}
                  testID={`accent-${name}`}
                />
              ))}
            </View>
          </Group>

          <Group title="Settings">
            <Row label="Sync status" value={syncLabel} valueTestID="sync-status" />
          </Group>

          <Group>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 16 }}>
              <Logo size={28} />
              <View style={{ flex: 1 }}>
                <Text style={[type.bodyMedium, { color: c.ink }]}>Tovy</Text>
              </View>
              <Text testID="app-version" style={[type.monoS, { color: c.ink6 }]}>
                {Constants.expoConfig?.version ?? ''}
              </Text>
            </View>
            <Divider />
            <Row label="Sign out" onPress={requestSignOut} testID="sign-out" />
          </Group>
        </View>
      </ScrollView>

      <Modal visible={confirming} transparent animationType="fade" onRequestClose={() => setConfirming(false)}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <Pressable
            accessibilityLabel="Close"
            onPress={() => setConfirming(false)}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.sheetScrim }}
          />
          <View
            accessibilityViewIsModal
            accessibilityLabel="Sign out?"
            style={{
              width: '100%',
              maxWidth: 400,
              backgroundColor: c.bg,
              borderRadius: radius.xl,
              borderWidth: 1,
              borderColor: c.ink3,
              padding: 20,
              gap: 12,
            }}
          >
            <Text style={[type.title, { color: c.ink }]}>Sign out?</Text>
            <Text style={[type.bodyS, { color: c.ink6 }]}>
              Your data stays on this device. Sign back in with Google or an email code to sync again.
            </Text>
            {unsynced > 0 ? (
              <View testID="unsynced-note" style={{ backgroundColor: c.badSoft, borderRadius: radius.md, padding: 12 }}>
                <Text style={[type.bodyS, { color: c.bad }]}>
                  {unsynced === 1 ? '1 change is' : `${unsynced} changes are`} not saved to the server yet. Signing out
                  will discard {unsynced === 1 ? 'it' : 'them'}.
                </Text>
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
              <Button label="Cancel" variant="ghost" onPress={() => setConfirming(false)} testID="cancel-sign-out" />
              <Button
                label={unsynced > 0 ? 'Sign out anyway' : 'Sign out'}
                variant={unsynced > 0 ? 'danger' : 'primary'}
                onPress={signOut}
                testID="confirm-sign-out"
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

function Group({ title, children }: { title?: string; children: ReactNode }) {
  const { theme } = useTheme()
  const c = theme.colors
  return (
    <View style={{ marginTop: 24 }}>
      {title ? (
        <Text style={[type.micro, { color: c.ink6, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }]}>
          {title}
        </Text>
      ) : null}
      <View style={{ borderWidth: 1, borderColor: c.ink3, borderRadius: radius.lg, overflow: 'hidden' }}>
        {children}
      </View>
    </View>
  )
}

function Divider() {
  const { theme } = useTheme()
  return <View style={{ height: 1, backgroundColor: theme.colors.ink2 }} />
}

function Row({
  label,
  value,
  onPress,
  testID,
  valueTestID,
}: {
  label: string
  value?: string
  onPress?: () => void
  testID?: string
  valueTestID?: string
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const ring = useFocusRing(c.accent)
  return (
    <Pressable
      testID={testID}
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      disabled={!onPress}
      style={[
        {
          minHeight: 52,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        ring.style,
      ]}
      {...ring.handlers}
    >
      <Text style={[type.bodyMedium, { color: c.ink }]}>{label}</Text>
      {value ? (
        <Text testID={valueTestID} style={[type.bodyS, { color: c.ink6 }]}>
          {value}
        </Text>
      ) : null}
    </Pressable>
  )
}

function AccentCard({
  label,
  swatch,
  selected,
  onPress,
  testID,
}: {
  label: string
  swatch: string
  selected: boolean
  onPress: () => void
  testID: string
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const ring = useFocusRing(c.accent)
  return (
    <Pressable
      testID={testID}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[
        {
          flex: 1,
          borderRadius: radius.lg,
          padding: selected ? 11 : 12,
          borderWidth: selected ? 2 : 1,
          borderColor: selected ? c.accent : c.ink3,
          gap: 8,
        },
        transition('border-color'),
        ring.style,
      ]}
      {...ring.handlers}
    >
      <View style={{ height: 32, borderRadius: radius.md, backgroundColor: swatch }} />
      <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: c.ink }}>{label}</Text>
    </Pressable>
  )
}
