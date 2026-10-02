import { useEffect, useState } from 'react'
import { Modal, Pressable, Text, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { syncState } from '@legendapp/state'
import { use$ } from '@legendapp/state/react'
import { Icons } from './icons'
import { supabase } from '../core/db/supabase'
import { readCachedProfile, type Profile } from '../core/profile/profile'
import { Avatar } from './components/Avatar'
import { Button } from './components/Button'
import { Page } from './components/Page'
import { ScreenHeader } from './components/ScreenHeader'
import { Group, Row } from './components/SettingsList'
import { AboutPage, AppearancePage, EditProfilePage, THEME_LABEL } from './ProfilePages'
import { useStore } from './StoreContext'
import { useTheme } from './theme'
import { radius, type } from './tokens'
import { useOnline } from './useOnline'

type SubPage = 'edit' | 'appearance' | 'about'
const TITLES: Record<SubPage, string> = { edit: 'Edit profile', appearance: 'Appearance', about: 'About' }

// Design 11.17 limited to what exists: who you are, Appearance, Sync status, About and Sign out. A row for a feature
// that is not built yet is not shown. The pages open inside this tab (`?page=`), so the tab bar stays.
export function ProfileScreen() {
  const { page } = useLocalSearchParams<{ page?: string }>()
  const router = useRouter()
  const store = useStore()
  const [profile, setProfile] = useState<Profile | null>(null)
  useEffect(() => {
    void readCachedProfile(store.userId).then(setProfile)
  }, [store.userId])

  const sub = page === 'edit' || page === 'appearance' || page === 'about' ? page : null
  const back = () => router.setParams({ page: undefined })
  if (sub) {
    return (
      <Page maxWidth={576}>
        <ScreenHeader title={TITLES[sub]} onBack={back} />
        {sub === 'appearance' ? <AppearancePage /> : null}
        {sub === 'about' ? <AboutPage /> : null}
        {sub === 'edit' && profile ? (
          <EditProfilePage
            profile={profile}
            onSaved={(next) => {
              setProfile(next)
              back()
            }}
          />
        ) : null}
      </Page>
    )
  }
  return <ProfileHome profile={profile} open={(p) => router.push({ pathname: '/profile', params: { page: p } })} />
}

function ProfileHome({ profile, open }: { profile: Profile | null; open: (page: SubPage) => void }) {
  const { theme, preference } = useTheme()
  const c = theme.colors
  const store = useStore()
  const online = useOnline()
  const taskState = syncState(store.tasks$)
  const projectState = syncState(store.projects$)
  const proposalState = syncState(store.proposals$)
  const logState = syncState(store.logs$)
  const pending =
    (use$(taskState.numPendingSets) ?? 0) +
    (use$(projectState.numPendingSets) ?? 0) +
    (use$(proposalState.numPendingSets) ?? 0) +
    (use$(logState.numPendingSets) ?? 0)
  const taskError = use$(taskState.error)
  const projectError = use$(projectState.error)
  const failed = Boolean(taskError || projectError)
  const [account, setAccount] = useState<{ email: string; provider: string } | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [unsynced, setUnsynced] = useState(0)

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user
      if (user) setAccount({ email: user.email ?? '', provider: String(user.app_metadata?.provider ?? 'email') })
    })
  }, [])

  // Read the live count when the button is pressed, not the one from the last render, which can lag a fresh edit.
  function requestSignOut() {
    const count = (st: typeof taskState) =>
      Math.max(st.numPendingSets.peek() ?? 0, Object.keys(st.getPendingChanges() ?? {}).length)
    setUnsynced(count(taskState) + count(projectState) + count(proposalState) + count(logState))
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
    <Page maxWidth={576}>
      <ScreenHeader title="Profile" />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 8 }}>
        <Avatar initials={initials} size={64} />
        <View style={{ flexShrink: 1, gap: 2 }}>
          <Text testID="profile-name" numberOfLines={1} style={[type.h3, { color: c.ink }]}>
            {name}
          </Text>
          <Text testID="profile-email" numberOfLines={1} style={[type.bodyS, { color: c.ink6 }]}>
            {account?.email ?? ''}
          </Text>
          {account ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              {account.provider === 'google' ? <Icons.check size={13} color={c.ok} strokeWidth={2} /> : null}
              <Text style={[type.meta, { color: c.ink6 }]}>
                {account.provider === 'google' ? 'Google linked' : 'Signed in with an email code'}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <Group title="Account">
        <Row
          label="Edit profile"
          icon={Icons.account}
          value={profile ? `@${profile.username}` : undefined}
          onPress={() => open('edit')}
          testID="edit-profile"
        />
      </Group>

      <Group title="Settings">
        <Row
          label="Appearance"
          icon={Icons.themeLight}
          value={THEME_LABEL[preference]}
          onPress={() => open('appearance')}
          testID="appearance"
        />
        <Row label="Sync status" icon={Icons.sync} value={syncLabel} valueTestID="sync-status" />
      </Group>

      <Group>
        <Row label="About Tovy" icon={Icons.info} onPress={() => open('about')} testID="about" />
        <Row label="Sign out" icon={Icons.signOut} onPress={requestSignOut} chevron={false} testID="sign-out" />
      </Group>

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
              maxWidth: 384,
              backgroundColor: c.bg,
              borderRadius: radius.xl,
              borderWidth: 1,
              borderColor: c.ink3,
              padding: 24,
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
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
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
    </Page>
  )
}
