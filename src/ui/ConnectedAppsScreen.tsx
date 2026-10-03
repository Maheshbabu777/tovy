import { useState } from 'react'
import { Platform, Pressable, Share, Text, useWindowDimensions, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Icons } from './icons'
import { ACCESS_LABEL, mcpUrl, type AiAccess } from '../core/ai'
import { disconnectApp, loadConnectedApps, saveAccess, type ConnectedApp } from '../core/aiApi'
import { localDay } from '../core/today'
import { dayTitle } from '../core/views'
import { Button } from './components/Button'
import { Confirm } from './components/Confirm'
import { Banner, Skeleton } from './components/Feedback'
import { Page } from './components/Page'
import { Group, Row } from './components/SettingsList'
import { Segmented } from './components/Segmented'
import { useToast } from './components/Toast'
import { NotSetUp } from './AiNotSetUp'
import { useTheme } from './theme'
import { fonts, radius, type, WIDE_BREAKPOINT } from './tokens'
import { useLoaded } from './useLoaded'
import { useNow } from './useTaskData'

const SERVER_URL = mcpUrl(process.env.EXPO_PUBLIC_SUPABASE_URL)
const ACCESS: { value: Exclude<AiAccess, 'none'>; label: string }[] = [
  { value: 'write', label: 'Can make changes' },
  { value: 'read', label: 'Read only' },
]

// Connected apps (spec mcp-server): how to connect an AI app, the apps you approved and what each may do. AI apps
// write directly (no approval inbox), so the controls here are the limits: read only, or disconnect, which cuts the app
// off at once. What they changed is in Activity.
export function ConnectedAppsScreen() {
  const router = useRouter()
  const wide = useWindowDimensions().width >= WIDE_BREAKPOINT
  const toast = useToast()
  const { theme } = useTheme()
  const c = theme.colors
  const { state, reload, set } = useLoaded(loadConnectedApps)
  const [leaving, setLeaving] = useState<ConnectedApp | null>(null)

  async function changeAccess(app: ConnectedApp, access: AiAccess) {
    const before = app.access
    set((apps) => apps.map((a) => (a.clientId === app.clientId ? { ...a, access } : a)))
    const saved = await saveAccess(app.clientId, app.name, access)
    if (!saved.ok) {
      set((apps) => apps.map((a) => (a.clientId === app.clientId ? { ...a, access: before } : a)))
      toast.show({ message: `Could not change it. ${saved.message}` })
      return
    }
    toast.show({ message: `${app.name}: ${ACCESS_LABEL[access].toLowerCase()}` })
  }

  async function disconnect(app: ConnectedApp) {
    const done = await disconnectApp(app)
    if (!done.ok) {
      toast.show({ message: `Could not disconnect it. ${done.message}` })
      return
    }
    set((apps) => apps.filter((a) => a.clientId !== app.clientId))
    toast.show({ message: `Disconnected ${app.name}` })
  }

  return (
    <Page
      maxWidth={576}
      title="Connected apps"
      subtitle="AI apps that can read and change your tasks."
      titleTestID="apps-title"
      onBack={wide ? undefined : () => router.navigate('/browse')}
    >
      <ConnectCard />

      {state.status === 'loading' ? (
        <View style={{ marginTop: 24 }}>
          <Skeleton rows={2} />
        </View>
      ) : state.status === 'notSetUp' ? (
        <NotSetUp />
      ) : state.status === 'error' ? (
        <View style={{ marginTop: 24, gap: 12, alignItems: 'flex-start' }}>
          <Banner kind="error">{`Could not load your apps. ${state.message}`}</Banner>
          <Button label="Try again" variant="ghost" bordered small onPress={reload} testID="apps-retry" />
        </View>
      ) : state.data.length === 0 ? (
        <Text testID="apps-empty" style={[type.bodyS, { color: c.text2, marginTop: 24, textAlign: 'center' }]}>
          No apps connected yet.
        </Text>
      ) : (
        <View style={{ marginTop: 24, gap: 12 }}>
          <Text style={[type.label, { color: c.text2, marginLeft: 4 }]}>Connected</Text>
          {state.data.map((app) => (
            <AppCard
              key={app.clientId}
              app={app}
              onAccess={(a) => void changeAccess(app, a)}
              onDisconnect={() => setLeaving(app)}
            />
          ))}
        </View>
      )}

      <Group>
        <Row
          label="Activity"
          icon={Icons.activity}
          onPress={() => router.navigate('/activity')}
          testID="apps-activity"
        />
        <Row label="Trash" icon={Icons.delete} onPress={() => router.navigate('/trash')} testID="apps-trash" />
      </Group>

      <Confirm
        visible={!!leaving}
        title={`Disconnect ${leaving?.name ?? 'this app'}?`}
        body="It loses access right away. Its past changes stay in Activity. You can connect it again later."
        action="Disconnect"
        danger
        onConfirm={() => leaving && void disconnect(leaving)}
        onClose={() => setLeaving(null)}
        testID="disconnect-confirm"
      />
    </Page>
  )
}

// How to connect: the server address to paste into the AI app, with Copy (or Share on a phone).
function ConnectCard() {
  const { theme } = useTheme()
  const c = theme.colors
  const toast = useToast()
  const canCopy = Platform.OS === 'web' && typeof navigator !== 'undefined' && !!navigator.clipboard

  async function copy() {
    try {
      if (canCopy) {
        await navigator.clipboard.writeText(SERVER_URL)
        toast.show({ message: 'Address copied' })
      } else await Share.share({ message: SERVER_URL })
    } catch {
      toast.show({ message: 'Could not copy. Select the address and copy it.' })
    }
  }

  return (
    <View
      testID="connect-card"
      style={{ marginTop: 16, borderWidth: 1, borderColor: c.line, borderRadius: radius.lg, padding: 16, gap: 12 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Icons.connectedApps size={20} color={c.text} />
        <Text style={[type.bodyMedium, { color: c.text }]}>Connect an AI app</Text>
      </View>
      <Text style={[type.bodyS, { color: c.text2 }]}>
        In Claude, ChatGPT or any app that supports MCP, add a custom connector and paste this address. You will sign in
        to Tovy and choose what the app may do.
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          backgroundColor: c.panel,
          borderRadius: radius.md,
          paddingLeft: 12,
          paddingRight: 4,
          minHeight: 44,
        }}
      >
        <Text
          testID="mcp-url"
          selectable
          numberOfLines={1}
          style={{ flex: 1, fontFamily: fonts.mono, fontSize: 13, color: c.text }}
        >
          {SERVER_URL}
        </Text>
        <View style={{ justifyContent: 'center' }}>
          <Button
            label={canCopy ? 'Copy' : 'Share'}
            variant="ghost"
            small
            onPress={() => void copy()}
            testID="copy-mcp-url"
          />
        </View>
      </View>
    </View>
  )
}

function AppCard({
  app,
  onAccess,
  onDisconnect,
}: {
  app: ConnectedApp
  onAccess: (access: AiAccess) => void
  onDisconnect: () => void
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const now = useNow()
  const since = app.grantedAt ? dayTitle(localDay(new Date(app.grantedAt)), now) : ''
  const access = app.access === 'read' ? 'read' : 'write'
  return (
    <View
      testID={`app-${app.clientId}`}
      style={{ borderWidth: 1, borderColor: c.line, borderRadius: radius.lg, padding: 16, gap: 14 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: radius.md,
            backgroundColor: c.panel,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icons.ai size={18} color={c.text} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={[type.bodyMedium, { color: c.text }]}>
            {app.name}
          </Text>
          <Text numberOfLines={1} style={[type.meta, { color: c.text2, marginTop: 2 }]}>
            {since ? `Connected ${since}` : 'Connected'}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Disconnect ${app.name}`}
          onPress={onDisconnect}
          testID={`disconnect-${app.clientId}`}
          hitSlop={8}
          style={({ pressed }) => ({ paddingVertical: 6, paddingHorizontal: 8, opacity: pressed ? 0.6 : 1 })}
        >
          <Text style={[type.label, { color: c.red }]}>Disconnect</Text>
        </Pressable>
      </View>
      <Segmented options={ACCESS} value={access} onChange={onAccess} testID={`access-${app.clientId}`} />
    </View>
  )
}
