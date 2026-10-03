import { Pressable, Text, useWindowDimensions, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { labelCounts } from '../core/taskFields'
import { EmptyState, Skeleton } from './components/Feedback'
import { Page } from './components/Page'
import { transition, useHover } from './components/web'
import { ListTop, TaskRows } from './TaskList'
import { useTheme } from './theme'
import { type, WIDE_BREAKPOINT } from './tokens'
import { useTaskActions } from './useTaskActions'
import { useNow, useTaskData } from './useTaskData'

// Labels (spec task-fields): every label on an open task with how many have it; pick one to see those tasks.
// `?label=` shows one label's tasks inside this tab.
export function LabelsScreen() {
  const { label } = useLocalSearchParams<{ label?: string }>()
  const router = useRouter()
  const wide = useWindowDimensions().width >= WIDE_BREAKPOINT
  const now = useNow()
  const actions = useTaskActions(now)
  const { tasks, projectMap, loaded } = useTaskData()
  const counts = labelCounts(tasks)

  if (label) {
    const rows = tasks.filter((t) => t && !t.deleted && !t.done_at && !t.parent_id && (t.labels ?? []).includes(label))
    return (
      <Page
        title={`@${label}`}
        subtitle={rows.length === 1 ? '1 task' : `${rows.length} tasks`}
        titleTestID="label-title"
        onBack={() => router.setParams({ label: undefined })}
      >
        <View style={{ marginTop: 28 }}>
          {rows.length ? <ListTop /> : null}
          <TaskRows rows={rows} all={tasks} projectMap={projectMap} now={now} actions={actions} />
          {rows.length === 0 ? (
            <EmptyState title="Nothing open here" body="Tasks with this label show here until they are done." />
          ) : null}
        </View>
        {actions.menuElement}
      </Page>
    )
  }

  return (
    <Page
      title="Labels"
      subtitle={counts.length ? `${counts.length} in use` : undefined}
      titleTestID="labels-title"
      onBack={wide ? undefined : () => router.navigate('/browse')}
    >
      <View style={{ marginTop: 28 }}>
        {!loaded ? (
          <Skeleton rows={3} />
        ) : counts.length === 0 ? (
          <EmptyState
            title="No labels yet"
            body="Add @word to a task, like @home or @calls, to group tasks across projects."
          />
        ) : (
          <>
            <ListTop />
            {counts.map((c) => (
              <LabelRow
                key={c.label}
                label={c.label}
                count={c.count}
                onPress={() => router.setParams({ label: c.label })}
              />
            ))}
          </>
        )}
      </View>
    </Page>
  )
}

function LabelRow({ label, count, onPress }: { label: string; count: number; onPress: () => void }) {
  const { theme } = useTheme()
  const c = theme.colors
  const { hovered, handlers } = useHover()
  return (
    <Pressable
      testID={`label-row-${label}`}
      accessibilityRole="button"
      onPress={onPress}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: 52,
          marginHorizontal: -8,
          paddingHorizontal: 8,
          borderRadius: 8,
          backgroundColor: hovered ? c.hover : 'transparent',
        },
        transition('background-color'),
      ]}
      {...handlers}
    >
      <Text style={[type.monoS, { color: c.text3, width: 34 }]}>@</Text>
      <Text style={[type.body, { color: c.text, flex: 1 }]}>{label}</Text>
      <Text style={[type.monoS, { color: c.text2 }]}>{count}</Text>
      <View
        pointerEvents="none"
        style={{ position: 'absolute', left: 8, right: 8, bottom: 0, height: 1, backgroundColor: c.line }}
      />
    </Pressable>
  )
}
