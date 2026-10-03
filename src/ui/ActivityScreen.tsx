import { useState } from 'react'
import { Pressable, Text, useWindowDimensions, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Icons, type ToolkitIcon } from './icons'
import { activityByDay, appName, canUndo, type AiAction, type AiTool } from '../core/ai'
import { loadActivity } from '../core/aiApi'
import { timeLabel } from '../core/today'
import { Button } from './components/Button'
import { Banner, EmptyState, Skeleton } from './components/Feedback'
import { Page } from './components/Page'
import { SectionHeader } from './components/SectionHeader'
import { useToast } from './components/Toast'
import { transition, useHover } from './components/web'
import { undoAiAction } from './aiUndo'
import { NotSetUp } from './AiNotSetUp'
import { useTheme } from './theme'
import { type, WIDE_BREAKPOINT } from './tokens'
import { useLoaded } from './useLoaded'
import { useNow, useTaskData } from './useTaskData'

const TOOL_ICON: Record<AiTool, ToolkitIcon> = {
  add_task: Icons.add,
  update_task: Icons.edit,
  complete_task: Icons.check,
  reopen_task: Icons.undo,
  log_progress: Icons.progress,
  delete_task: Icons.delete,
  restore_task: Icons.undo,
  add_project: Icons.newProject,
  update_project: Icons.edit,
  delete_project: Icons.delete,
}

const clock = (iso: string) => {
  const d = new Date(iso)
  return timeLabel(`${d.getHours()}:${d.getMinutes()}`)
}

// Activity (spec mcp-server): every change an AI app made, newest first, by day. AI apps write directly, so this is
// where you check them: each line says which app did what and when, and Undo takes it back. Tapping a line opens the
// task.
export function ActivityScreen() {
  const router = useRouter()
  const wide = useWindowDimensions().width >= WIDE_BREAKPOINT
  const toast = useToast()
  const now = useNow()
  const { store, tasks } = useTaskData()
  const { state, reload, set } = useLoaded(() => loadActivity())
  const [busy, setBusy] = useState<string | null>(null)
  const live = new Set(tasks.filter((t) => !t.deleted).map((t) => t.id))

  async function undo(action: AiAction) {
    setBusy(action.id)
    const result = await undoAiAction(store, action)
    setBusy(null)
    if (!result.ok) {
      toast.show({ message: result.message })
      return
    }
    set((all) => all.map((a) => (a.id === action.id ? { ...a, undone_at: result.at } : a)))
    toast.show({ message: 'Undone' })
  }

  const actions = state.status === 'ok' ? state.data : []
  const days = activityByDay(actions, now)

  return (
    <Page
      maxWidth={640}
      title="Activity"
      subtitle="What AI apps changed in Tovy. Undo anything."
      titleTestID="activity-title"
      onBack={wide ? undefined : () => router.navigate('/browse')}
    >
      {state.status === 'loading' ? (
        <Skeleton rows={4} />
      ) : state.status === 'notSetUp' ? (
        <NotSetUp />
      ) : state.status === 'error' ? (
        <View style={{ marginTop: 24, gap: 12, alignItems: 'flex-start' }}>
          <Banner kind="error">{`Could not load the activity. ${state.message}`}</Banner>
          <Button label="Try again" variant="ghost" bordered small onPress={reload} testID="activity-retry" />
        </View>
      ) : days.length === 0 ? (
        <EmptyState
          icon={Icons.activity}
          title="No AI changes yet"
          body="When an AI app adds, changes or deletes something in Tovy, it shows here and you can undo it."
        >
          <Button label="Connect an AI app" variant="ghost" bordered onPress={() => router.navigate('/apps')} />
        </EmptyState>
      ) : (
        days.map((d) => (
          <View key={d.day} testID={`activity-${d.day}`}>
            <SectionHeader title={d.title} count={d.actions.length} />
            {d.actions.map((a) => (
              <ActivityRow
                key={a.id}
                action={a}
                busy={busy === a.id}
                canOpen={!!a.task_id && live.has(a.task_id)}
                onOpen={() => router.setParams({ task: a.task_id! })}
                onUndo={() => void undo(a)}
              />
            ))}
          </View>
        ))
      )}
    </Page>
  )
}

function ActivityRow({
  action,
  busy,
  canOpen,
  onOpen,
  onUndo,
}: {
  action: AiAction
  busy: boolean
  canOpen: boolean
  onOpen: () => void
  onUndo: () => void
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const { hovered, handlers: hover } = useHover()
  const Icon = TOOL_ICON[action.tool] ?? Icons.ai
  const undone = !!action.undone_at
  return (
    <View
      testID={`action-${action.id}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginHorizontal: -8,
        paddingRight: 8,
        borderBottomWidth: 1,
        borderBottomColor: c.line,
      }}
    >
      <Pressable
        accessibilityRole={canOpen ? 'button' : undefined}
        accessibilityLabel={`${action.summary}, by ${appName(action.client_name)}`}
        disabled={!canOpen}
        onPress={onOpen}
        {...hover}
        style={[
          {
            flex: 1,
            flexDirection: 'row',
            gap: 12,
            paddingVertical: 12,
            paddingHorizontal: 8,
            borderRadius: 8,
            backgroundColor: hovered && canOpen ? c.hover : 'transparent',
          },
          transition('background-color'),
        ]}
      >
        <View style={{ width: 20, paddingTop: 2, alignItems: 'center' }}>
          <Icon size={18} color={undone ? c.text3 : c.text2} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text
            numberOfLines={2}
            style={[
              type.body,
              { color: undone ? c.text3 : c.text, textDecorationLine: undone ? 'line-through' : 'none' },
            ]}
          >
            {action.summary || action.tool}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icons.ai size={13} color={c.text2} />
            <Text style={[type.meta, { color: c.text2 }]}>
              {appName(action.client_name)} · {clock(action.created_at)}
              {undone ? ' · Undone' : ''}
            </Text>
          </View>
        </View>
      </Pressable>
      {canUndo(action) ? (
        // A button lines itself up at the top of a row; this centres it on the row.
        <View style={{ justifyContent: 'center' }}>
          <Button
            label={busy ? 'Undoing' : 'Undo'}
            icon={Icons.undo}
            variant="ghost"
            bordered
            small
            disabled={busy}
            onPress={onUndo}
            testID={`undo-${action.id}`}
            accessibilityLabel={`Undo: ${action.summary}`}
          />
        </View>
      ) : null}
    </View>
  )
}
