import { useEffect, useState } from 'react'
import { Linking, Platform, Pressable, Text, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Icons, type ToolkitIcon } from './icons'
import type { AiAccess } from '../core/ai'
import { approveConsent, denyConsent, loadConsent, type ConsentRequest } from '../core/aiApi'
import { AppIcon } from './components/AppIcon'
import { AuthLayout } from './components/AuthLayout'
import { Logo } from './Brand'
import { Button } from './components/Button'
import { Skeleton } from './components/Feedback'
import { useTheme } from './theme'
import { radius, type } from './tokens'

// Sends the browser back to the AI app (the address Supabase gives, with the code or the refusal in it).
function leaveTo(url: string) {
  if (Platform.OS === 'web') window.location.replace(url)
  else void Linking.openURL(url)
}

const hostOf = (url: string) => {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

type View_ =
  | { step: 'loading' }
  | { step: 'ask'; request: ConsentRequest }
  | { step: 'leaving' }
  | { step: 'error'; message: string }

// The consent screen (spec mcp-server). An AI app sent the person here through Supabase's OAuth server: the person is
// signed in (AuthGate), sees which app asks, chooses what it may do, and approves or refuses. Then the browser goes
// back to the app. An app already approved goes straight back.
export function ConsentScreen() {
  const { theme } = useTheme()
  const c = theme.colors
  const router = useRouter()
  const { authorization_id: authorizationId } = useLocalSearchParams<{ authorization_id?: string }>()
  const [view, setView] = useState<View_>(
    authorizationId
      ? { step: 'loading' }
      : { step: 'error', message: 'This link is missing its request. Start again from the AI app.' },
  )
  const [access, setAccess] = useState<AiAccess>('write')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!authorizationId) return
    let alive = true
    void loadConsent(authorizationId).then((r) => {
      if (!alive) return
      if (!r.ok) {
        setView({
          step: 'error',
          message: r.notSetUp
            ? 'Connecting AI apps is not turned on for this Tovy yet.'
            : 'This request has expired or was already used. Start again from the AI app.',
        })
      } else if (r.data.kind === 'redirect') {
        setView({ step: 'leaving' })
        leaveTo(r.data.url)
      } else setView({ step: 'ask', request: r.data.request })
    })
    return () => {
      alive = false
    }
  }, [authorizationId])

  async function decide(approve: boolean) {
    if (view.step !== 'ask') return
    setBusy(true)
    const r = approve ? await approveConsent(view.request, access) : await denyConsent(view.request.authorizationId)
    setBusy(false)
    if (!r.ok) {
      setView({ step: 'error', message: `That did not go through. ${r.message}` })
      return
    }
    setView({ step: 'leaving' })
    leaveTo(r.data)
  }

  if (view.step === 'loading') {
    return (
      <AuthLayout>
        <Skeleton rows={3} />
      </AuthLayout>
    )
  }
  if (view.step === 'leaving') {
    return (
      <AuthLayout>
        <Text style={[type.title, { color: c.text }]}>Taking you back</Text>
        <Text style={[type.body, { color: c.text2, marginTop: 8 }]}>You can close this tab if nothing happens.</Text>
      </AuthLayout>
    )
  }
  if (view.step === 'error') {
    return (
      <AuthLayout
        actions={<Button label="Open Tovy" variant="ghost" bordered fullWidth onPress={() => router.replace('/')} />}
      >
        <Text testID="consent-error" style={[type.title, { color: c.text }]}>
          Could not connect the app
        </Text>
        <Text style={[type.body, { color: c.text2, marginTop: 8 }]}>{view.message}</Text>
      </AuthLayout>
    )
  }

  const { request } = view
  return (
    <AuthLayout
      actions={
        <View style={{ gap: 8 }}>
          <Button
            label={busy ? 'Connecting' : `Allow ${request.name}`}
            fullWidth
            disabled={busy}
            onPress={() => void decide(true)}
            testID="consent-allow"
          />
          <Button
            label="Cancel"
            variant="ghost"
            fullWidth
            disabled={busy}
            onPress={() => void decide(false)}
            testID="consent-deny"
          />
        </View>
      }
    >
      {/* The app and Tovy side by side, the way sign-in screens show who connects to whom. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <AppIcon name={request.name} logoUri={request.logoUri} size={48} />
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: c.lineStrong }} />
          ))}
        </View>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: radius.md,
            backgroundColor: c.bg,
            borderWidth: 1,
            borderColor: c.line,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Logo size={26} />
        </View>
      </View>
      <Text testID="consent-title" style={[type.display, { color: c.text, fontSize: 28, lineHeight: 34 }]}>
        {request.name} wants to use Tovy
      </Text>
      {/* Any app can register under any name, so the address it returns to is what really says who it is. */}
      <View
        testID="consent-host"
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, flexWrap: 'wrap' }}
      >
        <Icons.external size={14} color={c.text2} />
        <Text style={[type.bodyS, { color: c.text2 }]}>Returns to</Text>
        <Text style={[type.monoS, { color: c.text }]}>{hostOf(request.redirectUri)}</Text>
      </View>
      <Text style={[type.bodyS, { color: c.text2, marginTop: 6 }]}>
        Only allow it if you started this from that app. Signed in as {request.email}.
      </Text>

      <Text style={[type.label, { color: c.text2, marginTop: 28, marginBottom: 8 }]}>What it may do</Text>
      <View style={{ borderWidth: 1, borderColor: c.line, borderRadius: radius.lg, overflow: 'hidden' }}>
        <Choice
          icon={Icons.edit}
          title="Read and change your tasks"
          body="Add, change, finish and delete tasks. Deletes go to Trash."
          on={access === 'write'}
          onPress={() => setAccess('write')}
          testID="consent-write"
        />
        <View style={{ height: 1, backgroundColor: c.line }} />
        <Choice
          icon={Icons.search}
          title="Only read your tasks"
          body="See tasks, projects and progress. Change nothing."
          on={access === 'read'}
          onPress={() => setAccess('read')}
          testID="consent-read"
        />
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
        <Icons.activity size={16} color={c.text2} />
        <Text style={[type.meta, { color: c.text2, flex: 1 }]}>
          Every change it makes shows in Activity, where you can undo it. Change this or disconnect any time in
          Connected apps.
        </Text>
      </View>
    </AuthLayout>
  )
}

function Choice({
  icon: Icon,
  title,
  body,
  on,
  onPress,
  testID,
}: {
  icon: ToolkitIcon
  title: string
  body: string
  on: boolean
  onPress: () => void
  testID: string
}) {
  const { theme } = useTheme()
  const c = theme.colors
  return (
    <Pressable
      testID={testID}
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        backgroundColor: pressed ? c.hover : on ? c.panel : 'transparent',
      })}
    >
      <Icon size={18} color={on ? c.text : c.text2} />
      <View style={{ flex: 1 }}>
        <Text style={[type.bodyMedium, { color: c.text }]}>{title}</Text>
        <Text style={[type.meta, { color: c.text2, marginTop: 2 }]}>{body}</Text>
      </View>
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          borderWidth: on ? 6 : 1.5,
          borderColor: on ? c.primary : c.lineStrong,
        }}
      />
    </Pressable>
  )
}
