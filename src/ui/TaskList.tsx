import { useCallback, useEffect, useRef, useState } from 'react'
import { Pressable, Text, TextInput, useWindowDimensions, View } from 'react-native'
import { useFocusEffect, useGlobalSearchParams } from 'expo-router'
import { Icons } from './icons'
import { percentOf, subtaskCount } from '../core/progress'
import type { Project, Task } from '../core/sync/tasks'
import { SectionHeader } from './components/SectionHeader'
import { shadow, SHADOWS, transition, webStyle } from './components/web'
import { KeyCap } from './components/KeyCap'
import { registerComposer } from './quickAdd'
import type { NewQuickTask } from './QuickAddSheet'
import { parseTask } from '../core/parseTask'
import { useTaskData } from './useTaskData'
import { TaskRow } from './TaskRow'
import { useTheme } from './theme'
import { radius, type, WIDE_BREAKPOINT } from './tokens'
import type { useTaskActions } from './useTaskActions'

type Actions = Pick<ReturnType<typeof useTaskActions>, 'toggleDone' | 'open' | 'openMenu' | 'moveTomorrow'> &
  Partial<Pick<ReturnType<typeof useTaskActions>, 'schedule' | 'pickProject'>>

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
  const phone = useWindowDimensions().width < WIDE_BREAKPOINT
  // Rows that are there when the list shows are simply there: opening a page or switching tabs never replays an
  // animation (spec design-v2). Only a row that arrives later (you added it, an AI app did, it synced in) rises in.
  const [settled, setSettled] = useState(false)
  const [initial] = useState(() => new Set(rows.map((t) => t.id)))
  useEffect(() => {
    const timer = setTimeout(() => setSettled(true), 600)
    return () => clearTimeout(timer)
  }, [])
  return (
    <>
      {rows.map((task) => (
        <TaskRow
          key={task.id}
          animateIn={settled && !initial.has(task.id)}
          task={task}
          project={task.project_id ? projectMap?.[task.project_id] : undefined}
          progress={percentOf(task, all)}
          subtasks={subtaskCount(task, all)}
          now={now}
          selected={openId === task.id}
          showProject={showProject}
          onToggleDone={() => actions.toggleDone(task)}
          onSwipe={phone ? (a) => (a === 'done' ? actions.toggleDone(task) : actions.moveTomorrow(task)) : undefined}
          onOpen={() => actions.open(task)}
          onMenu={(at) => actions.openMenu(task, at)}
          onSchedule={!phone && actions.schedule ? () => actions.schedule!(task) : undefined}
          onMove={!phone && actions.pickProject && !task.parent_id ? () => actions.pickProject!(task) : undefined}
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
  foldOnPhone = false,
  children,
  ...rest
}: {
  foldOnPhone?: boolean // on a phone the rows start folded away behind the header (Done today)
  id: string
  title: string
  rows: Task[]
  action?: { label: string; onPress: () => void; testID?: string }
  danger?: boolean
  keepEmpty?: boolean
  children?: React.ReactNode
} & Omit<Parameters<typeof TaskRows>[0], 'rows'>) {
  const phone = useWindowDimensions().width < WIDE_BREAKPOINT
  const [open, setOpen] = useState(!(foldOnPhone && phone))
  if (rows.length === 0 && !keepEmpty) return null
  return (
    <View testID={`section-${id}`}>
      <SectionHeader
        title={title}
        count={rows.length}
        action={action}
        danger={danger}
        fold={foldOnPhone ? { open, onToggle: () => setOpen(!open), testID: `fold-${id}` } : undefined}
      />
      {open ? <TaskRows rows={rows} {...rest} /> : null}
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
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: 44,
          marginHorizontal: -8,
          paddingHorizontal: 8,
        }}
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
        marginHorizontal: -8,
        paddingHorizontal: 8,
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

// The composer at the top of Today and Inbox on a wide screen: a bordered field with a plus and the N key cap. N focuses
// it while its screen is showing. Enter adds the task and keeps the field ready for the next one. The words are read as
// they are typed (spec quick-add-words) and what was read shows at the right of the field.
export function Composer({
  onAdd,
  placeholder,
  testID,
}: {
  onAdd: (task: NewQuickTask) => void
  placeholder: string
  testID: string
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const { projects } = useTaskData()
  const [draft, setDraft] = useState('')
  const now = new Date()
  const read = parseTask(draft, now, projects)
  const readLine = read.tokens.map((t) => t.label).join(' · ')
  const [focused, setFocused] = useState(false)
  const input = useRef<TextInput>(null)
  useFocusEffect(useCallback(() => registerComposer(() => input.current?.focus()), []))
  return (
    <View
      style={[
        {
          height: 48,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: focused ? c.text : c.line,
          backgroundColor: c.bg,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingLeft: 14,
          paddingRight: 12,
        },
        focused ? shadow(SHADOWS.menu) : {},
        transition('border-color, box-shadow'),
      ]}
    >
      <Icons.add size={20} color={focused ? c.text : c.text2} />
      <TextInput
        ref={input}
        testID={testID}
        value={draft}
        onChangeText={setDraft}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onSubmitEditing={() => {
          if (!draft.trim()) return
          onAdd({ title: read.title, dueDate: read.dueDate, dueTime: read.dueTime, projectId: read.projectId })
          setDraft('')
        }}
        blurOnSubmit={false}
        placeholder={placeholder}
        placeholderTextColor={c.text3}
        accessibilityLabel={placeholder}
        style={[type.body, { flex: 1, height: 46, color: c.text }, webStyle({ outlineStyle: 'none' })]}
      />
      {readLine ? (
        <View testID={`${testID}-read`} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Icons.ai size={13} color={c.text2} />
          <Text numberOfLines={1} style={[type.meta, { color: c.text2 }]}>
            {readLine}
          </Text>
        </View>
      ) : null}
      {focused ? <KeyCap label="Enter" /> : <KeyCap label="N" />}
    </View>
  )
}

// The hairline above a plain list (Inbox, a project), as wide as the rows' own lines.
export function ListTop() {
  const { theme } = useTheme()
  return <View style={{ height: 1, backgroundColor: theme.colors.line, marginHorizontal: -8 }} />
}
