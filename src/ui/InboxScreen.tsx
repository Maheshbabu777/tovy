import { useEffect, useState } from 'react'
import { Animated, PanResponder, Platform, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native'
import { syncState } from '@legendapp/state'
import { use$ } from '@legendapp/state/react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Check, Inbox, X } from 'lucide-react-native'
import { changeSummary, groupByApp, kindLabel, timeAgo, waitingLabel } from '../core/inbox'
import type { Proposal, Task } from '../core/sync/tasks'
import { AIBadge, AppMark } from './components/AppMark'
import { Button } from './components/Button'
import { EmptyState, Skeleton } from './components/Feedback'
import { ScreenHeader } from './components/ScreenHeader'
import { Sheet } from './components/Sheet'
import { useToast } from './components/Toast'
import { useFocusRing } from './components/web'
import { useStore } from './StoreContext'
import { useTheme } from './theme'
import { radius, type, WIDE_BREAKPOINT } from './tokens'

const SWIPE_COMMIT = 90

// Design 11.11: what connected AI apps ask for, waiting until the person says yes.
export function InboxScreen() {
  const store = useStore()
  const toast = useToast()
  const { theme } = useTheme()
  const c = theme.colors
  const insets = useSafeAreaInsets()
  const wide = useWindowDimensions().width >= WIDE_BREAKPOINT
  const proposalsMap = use$(store.proposals$) as Record<string, Proposal> | undefined
  const tasksMap = use$(store.tasks$) as Record<string, Task> | undefined
  const loaded = use$(syncState(store.proposals$).isPersistLoaded)
  const [open, setOpen] = useState<Proposal | null>(null)
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(timer)
  }, [])

  // Not memoised: Legend-State changes these objects in place, so their identity does not change when a row does.
  const waiting = Object.values(proposalsMap ?? {}).filter((p) => p && !p.deleted && p.status === 'pending')
  const groups = groupByApp(waiting)

  function approve(p: Proposal) {
    try {
      store.approveProposal(p.id)
      toast.show({ message: 'Approved' })
    } catch (e) {
      toast.show({ message: e instanceof Error ? e.message : String(e) })
    }
  }
  function reject(p: Proposal) {
    try {
      const { undo } = store.rejectProposal(p.id)
      toast.show({ message: 'Rejected', action: { label: 'Undo', onPress: undo } })
    } catch (e) {
      toast.show({ message: e instanceof Error ? e.message : String(e) })
    }
  }
  function approveAll() {
    let done = 0
    let failed = ''
    for (const p of waiting) {
      try {
        store.approveProposal(p.id)
        done++
      } catch (e) {
        failed = e instanceof Error ? e.message : String(e)
      }
    }
    toast.show({ message: failed && done === 0 ? failed : `Approved ${done}` })
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: wide ? 32 : 16,
          paddingTop: wide ? 16 : 8,
          paddingBottom: wide ? 48 : 96 + insets.bottom,
        }}
      >
        <View style={{ width: '100%', maxWidth: 672, alignSelf: 'center' }}>
          <ScreenHeader
            title="Inbox"
            subtitle={loaded ? waitingLabel(waiting.length) : undefined}
            right={
              waiting.length >= 2 ? (
                <Button label="Approve all" variant="soft" small onPress={approveAll} testID="approve-all" />
              ) : undefined
            }
          />
          {!loaded ? (
            <Skeleton rows={3} />
          ) : waiting.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="Nothing to approve"
              body="When an AI app proposes a task or change, it waits here until you say yes."
            />
          ) : (
            <>
              <Text style={[type.label, { color: c.ink6, marginTop: 4 }]}>
                {Platform.OS === 'web'
                  ? 'Approve or reject from each row. Click a proposal to compare before and after.'
                  : 'Swipe right to approve, left to reject. Tap for details.'}
              </Text>
              {groups.map((group) => (
                <View key={group.app} testID={`group-${group.app}`} style={{ marginTop: 24 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <AppMark name={group.app} />
                    <Text style={[type.bodySMedium, { color: c.ink, fontFamily: 'Geist_600SemiBold' }]}>
                      {group.app}
                    </Text>
                    <AIBadge />
                  </View>
                  <View style={{ gap: 8 }}>
                    {group.items.map((p) => (
                      <ProposalRow
                        key={p.id}
                        proposal={p}
                        now={now}
                        onOpen={() => setOpen(p)}
                        onApprove={() => approve(p)}
                        onReject={() => reject(p)}
                      />
                    ))}
                  </View>
                </View>
              ))}
            </>
          )}
        </View>
      </ScrollView>

      <Sheet visible={!!open} onClose={() => setOpen(null)} title="What this changes" testID="proposal-sheet">
        {open ? (
          <ProposalDetail
            proposal={open}
            task={open.task_id ? tasksMap?.[open.task_id] : undefined}
            now={now}
            onApprove={() => {
              approve(open)
              setOpen(null)
            }}
            onReject={() => {
              reject(open)
              setOpen(null)
            }}
          />
        ) : null}
      </Sheet>
    </View>
  )
}

function ProposalRow({
  proposal,
  now,
  onOpen,
  onApprove,
  onReject,
}: {
  proposal: Proposal
  now: Date
  onOpen: () => void
  onApprove: () => void
  onReject: () => void
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const ring = useFocusRing(c.accent)
  const web = Platform.OS === 'web'
  const roomy = useWindowDimensions().width >= WIDE_BREAKPOINT
  const meta = (
    <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
      <Text style={[type.label, { color: c.ink6 }]}>{kindLabel(proposal.kind)}</Text>
      <Text style={[type.label, { color: c.ink5 }]}>·</Text>
      <Text style={[type.label, { color: c.ink6 }]}>{timeAgo(proposal.created_at, now)}</Text>
    </View>
  )
  const card = (
    <View
      style={{
        flexDirection: web && !roomy ? 'column' : 'row',
        alignItems: web && !roomy ? 'stretch' : 'center',
        gap: 12,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: c.ink3,
        backgroundColor: c.bg,
        padding: 12,
      }}
    >
      <Pressable
        testID={`open-proposal-${proposal.id}`}
        accessibilityRole="button"
        accessibilityLabel={`${proposal.title}. ${kindLabel(proposal.kind)}. Show what this changes`}
        onPress={onOpen}
        style={[{ flex: 1, minWidth: 0, borderRadius: radius.sm }, ring.style]}
        {...ring.handlers}
      >
        <Text numberOfLines={1} style={[type.bodyMedium, { color: c.ink }]}>
          {proposal.title}
        </Text>
        {meta}
      </Pressable>
      {web ? (
        <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
          <Button label="Reject" variant="ghost" small onPress={onReject} testID={`reject-${proposal.id}`} />
          <Button label="Approve" variant="soft" small onPress={onApprove} testID={`approve-${proposal.id}`} />
        </View>
      ) : null}
    </View>
  )
  return (
    <View testID={`proposal-${proposal.id}`}>
      {web ? (
        card
      ) : (
        <SwipeRow onApprove={onApprove} onReject={onReject}>
          {card}
        </SwipeRow>
      )}
    </View>
  )
}

// Phone: the row follows the finger. Underneath, a green "Approve" layer on the left (swipe right) or a red "Reject"
// layer on the right (swipe left), full strength at 70 px. Letting go past 90 px commits, otherwise it springs back.
function SwipeRow({
  children,
  onApprove,
  onReject,
}: {
  children: React.ReactNode
  onApprove: () => void
  onReject: () => void
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const [x] = useState(() => new Animated.Value(0))
  const [dx, setDx] = useState(0)
  // The callbacks only use the proposal's id, which never changes for a row, so the first ones stay right.
  const [responder] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderMove: (_e, g) => {
        x.setValue(g.dx)
        setDx(g.dx)
      },
      onPanResponderRelease: (_e, g) => {
        if (g.dx > SWIPE_COMMIT) onApprove()
        else if (g.dx < -SWIPE_COMMIT) onReject()
        Animated.timing(x, { toValue: 0, duration: 250, useNativeDriver: false }).start(() => setDx(0))
      },
    }),
  )
  const strength = Math.min(1, Math.abs(dx) / 70)
  return (
    <View style={{ borderRadius: radius.lg, overflow: 'hidden' }}>
      <View
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: dx > 0 ? c.okSoft : dx < 0 ? c.badSoft : 'transparent',
          opacity: strength,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: dx > 0 ? 'flex-start' : 'flex-end',
          paddingHorizontal: 20,
          gap: 8,
        }}
      >
        {dx > 0 ? (
          <Check size={18} color={c.ok} strokeWidth={1.75} />
        ) : (
          <X size={18} color={c.bad} strokeWidth={1.75} />
        )}
        <Text style={[type.bodySMedium, { color: dx > 0 ? c.ok : c.bad }]}>{dx > 0 ? 'Approve' : 'Reject'}</Text>
      </View>
      <Animated.View style={{ transform: [{ translateX: x }] }} {...responder.panHandlers}>
        {children}
      </Animated.View>
    </View>
  )
}

function ProposalDetail({
  proposal,
  task,
  now,
  onApprove,
  onReject,
}: {
  proposal: Proposal
  task: Task | undefined
  now: Date
  onApprove: () => void
  onReject: () => void
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const wide = useWindowDimensions().width >= WIDE_BREAKPOINT
  const change = changeSummary(proposal, task, now)
  return (
    <View style={{ gap: 16, paddingBottom: 8 }}>
      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <AppMark name={proposal.app_name} />
          <Text style={[type.label, { color: c.ink6 }]}>
            {proposal.app_name} · {timeAgo(proposal.created_at, now)}
          </Text>
        </View>
        <Text style={[type.h3, { color: c.ink }]}>{proposal.title}</Text>
      </View>
      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 8 }}>
        <View style={{ flex: 1, backgroundColor: c.ink1, borderRadius: radius.lg, padding: 12, gap: 4 }}>
          <Text style={[type.label, { color: c.ink6 }]}>Before</Text>
          <Text testID="change-before" style={[type.bodyS, { color: c.ink7 }]}>
            {change.before}
          </Text>
        </View>
        <View style={{ flex: 1, backgroundColor: c.accentSoft, borderRadius: radius.lg, padding: 12, gap: 4 }}>
          <Text style={[type.label, { color: c.accent }]}>After</Text>
          <Text testID="change-after" style={[type.bodyS, { color: c.ink }]}>
            {change.after}
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button label="Reject" variant="ghost" onPress={onReject} fullWidth testID="sheet-reject" />
        </View>
        <View style={{ flex: 1 }}>
          <Button label="Approve" onPress={onApprove} fullWidth testID="sheet-approve" />
        </View>
      </View>
    </View>
  )
}
