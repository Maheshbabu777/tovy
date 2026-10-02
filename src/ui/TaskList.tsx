import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { useGlobalSearchParams } from 'expo-router'
import { Icons } from './icons'
import { percentOf, subtaskCount } from '../core/progress'
import type { Project, Task } from '../core/sync/tasks'
import { SectionHeader } from './components/SectionHeader'
import { webStyle } from './components/web'
import { TaskRow } from './TaskRow'
import { useTheme } from './theme'
import { type } from './tokens'
import type { useTaskActions } from './useTaskActions'

type Actions = Pick<ReturnType<typeof useTaskActions>, 'toggleDone' | 'open' | 'openMenu'>

// The rows of one list: a task row each, with its progress and subtask count worked out from all tasks.
export function TaskRows({
  rows,
  all,
  projectMap,
  now,
  actions,
  showProject = true,
}: {
  rows: Task[]
  all: Task[]
  projectMap: Record<string, Project> | undefined
  now: Date
  actions: Actions
  showProject?: boolean
}) {
  const { task: openId } = useGlobalSearchParams<{ task?: string }>()
  return (
    <>
      {rows.map((task) => (
        <TaskRow
          key={task.id}
          task={task}
          project={task.project_id ? projectMap?.[task.project_id] : undefined}
          progress={percentOf(task, all)}
          subtasks={subtaskCount(task, all)}
          now={now}
          selected={openId === task.id}
          showProject={showProject}
          onToggleDone={() => actions.toggleDone(task)}
          onOpen={() => actions.open(task)}
          onMenu={(at) => actions.openMenu(task, at)}
        />
      ))}
    </>
  )
}

// A titled group of rows (style guide, Section header). Empty groups are not drawn unless `keepEmpty`.
export function TaskSection({
  id,
  title,
  rows,
  action,
  danger,
  keepEmpty = false,
  children,
  ...rest
}: {
  id: string
  title: string
  rows: Task[]
  action?: { label: string; onPress: () => void; testID?: string }
  danger?: boolean
  keepEmpty?: boolean
  children?: React.ReactNode
} & Omit<Parameters<typeof TaskRows>[0], 'rows'>) {
  if (rows.length === 0 && !keepEmpty) return null
  return (
    <View testID={`section-${id}`}>
      <SectionHeader title={title} count={rows.length} action={action} danger={danger} />
      <TaskRows rows={rows} {...rest} />
      {children}
    </View>
  )
}

// The inline "Add task" row at the end of a list: a plus and a field. Enter adds the task and keeps the field open for
// the next one. `collapsible` shows only a quiet "Add task" until it is pressed (for lists with many of them).
export function AddTaskRow({
  onAdd,
  testID = 'new-title',
  placeholder = 'Add task',
  collapsible = false,
}: {
  onAdd: (title: string) => void
  testID?: string
  placeholder?: string
  collapsible?: boolean
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const [draft, setDraft] = useState('')
  const [focused, setFocused] = useState(false)
  const [expanded, setExpanded] = useState(!collapsible)
  if (!expanded) {
    return (
      <Pressable
        testID={`${testID}-open`}
        accessibilityRole="button"
        onPress={() => setExpanded(true)}
        style={{ flexDirection: 'row', alignItems: 'center', minHeight: 44 }}
      >
        <View style={{ width: 32 }}>
          <Icons.add size={18} color={c.text3} />
        </View>
        <Text style={[type.bodyS, { color: c.text3 }]}>{placeholder}</Text>
      </Pressable>
    )
  }
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 48,
        borderBottomWidth: 1,
        borderBottomColor: focused ? c.text : c.line,
      }}
    >
      <View style={{ width: 32 }}>
        <Icons.add size={20} color={focused ? c.text : c.text2} />
      </View>
      <TextInput
        testID={testID}
        value={draft}
        onChangeText={setDraft}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false)
          if (collapsible && !draft.trim()) setExpanded(false)
        }}
        autoFocus={collapsible}
        onSubmitEditing={() => {
          const text = draft.trim()
          if (!text) return
          onAdd(text)
          setDraft('')
        }}
        blurOnSubmit={false}
        placeholder={placeholder}
        placeholderTextColor={c.text2}
        accessibilityLabel={placeholder}
        style={[type.body, { flex: 1, color: c.text, paddingVertical: 12 }, webStyle({ outlineStyle: 'none' })]}
      />
    </View>
  )
}
