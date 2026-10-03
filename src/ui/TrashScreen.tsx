import { useState } from 'react'
import { Text, useWindowDimensions, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Icons } from './icons'
import { daysLeft, trashItems, type TrashItem } from '../core/ai'
import { loadTrash, restoreTasks } from '../core/aiApi'
import { Button } from './components/Button'
import { Banner, EmptyState, Skeleton } from './components/Feedback'
import { Page } from './components/Page'
import { useToast } from './components/Toast'
import { NotSetUp } from './AiNotSetUp'
import { useTheme } from './theme'
import { type, WIDE_BREAKPOINT } from './tokens'
import { useLoaded } from './useLoaded'
import { useNow, useTaskData } from './useTaskData'

// Trash (spec mcp-server): tasks deleted in the last 30 days, by you or by an AI app, with Restore. Restoring a task
// brings its deleted subtasks back with it.
export function TrashScreen() {
  const router = useRouter()
  const wide = useWindowDimensions().width >= WIDE_BREAKPOINT
  const toast = useToast()
  const now = useNow()
  const { tasks, projectMap } = useTaskData()
  const { state, reload, set } = useLoaded(loadTrash)
  const [busy, setBusy] = useState<string | null>(null)
  const items = state.status === 'ok' ? trashItems(state.data) : []
  const live = new Set(tasks.filter((t) => !t.deleted).map((t) => t.id))

  async function restore(item: TrashItem) {
    setBusy(item.task.id)
    // A subtask whose parent is gone comes back on its own, at the top level.
    const parent = item.task.parent_id
    const result = await restoreTasks(item.ids, parent && !live.has(parent) ? [item.task.id] : [])
    setBusy(null)
    if (!result.ok) {
      toast.show({ message: `Could not restore it. ${result.message}` })
      return
    }
    set((rows) => rows.filter((t) => !item.ids.includes(t.id)))
    toast.show({ message: `Restored "${item.task.title}"` })
  }

  return (
    <Page
      maxWidth={640}
      title="Trash"
      subtitle="Deleted tasks stay here for 30 days."
      titleTestID="trash-title"
      onBack={wide ? undefined : () => router.navigate('/browse')}
    >
      {state.status === 'loading' ? (
        <Skeleton rows={3} />
      ) : state.status === 'notSetUp' ? (
        <NotSetUp />
      ) : state.status === 'error' ? (
        <View style={{ marginTop: 24, gap: 12, alignItems: 'flex-start' }}>
          <Banner kind="error">{`Could not load Trash. ${state.message}`}</Banner>
          <Button label="Try again" variant="ghost" bordered small onPress={reload} testID="trash-retry" />
        </View>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Icons.delete}
          title="Trash is empty"
          body="Tasks you or an AI app delete wait here for 30 days."
        />
      ) : (
        <View style={{ marginTop: 16 }}>
          {items.map((item) => (
            <TrashRow
              key={item.task.id}
              item={item}
              project={item.task.project_id ? projectMap?.[item.task.project_id]?.name : undefined}
              left={daysLeft(item.task.updated_at, now)}
              busy={busy === item.task.id}
              onRestore={() => void restore(item)}
            />
          ))}
        </View>
      )}
    </Page>
  )
}

function TrashRow({
  item,
  project,
  left,
  busy,
  onRestore,
}: {
  item: TrashItem
  project?: string
  left: number
  busy: boolean
  onRestore: () => void
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const meta = [
    project ?? 'Inbox',
    item.subtasks ? `${item.subtasks} subtask${item.subtasks === 1 ? '' : 's'}` : '',
    item.task.created_by ? 'Added by an AI app' : '',
    left <= 1 ? 'Goes today' : `${left} days left`,
  ].filter(Boolean)
  return (
    <View
      testID={`trash-${item.task.id}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: c.line,
      }}
    >
      <Icons.delete size={18} color={c.text3} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text numberOfLines={2} style={[type.body, { color: c.text }]}>
          {item.task.title || 'Untitled'}
        </Text>
        <Text numberOfLines={1} style={[type.meta, { color: c.text2 }]}>
          {meta.join(' · ')}
        </Text>
      </View>
      <View style={{ justifyContent: 'center' }}>
        <Button
          label={busy ? 'Restoring' : 'Restore'}
          variant="ghost"
          bordered
          small
          disabled={busy}
          onPress={onRestore}
          testID={`restore-${item.task.id}`}
          accessibilityLabel={`Restore ${item.task.title}`}
        />
      </View>
    </View>
  )
}
