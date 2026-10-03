import { useState } from 'react'
import { Pressable, Text, useWindowDimensions, View } from 'react-native'
import { useRouter } from 'expo-router'
import { batch } from '@legendapp/state'
import { Icons } from './icons'
import { groupTasks, localDay } from '../core/today'
import { todayLine } from '../core/views'
import { addedMessage, parseTask } from '../core/parseTask'
import { ContextMenu } from './components/ContextMenu'
import { transition, useFocusRing, useHover } from './components/web'
import { Banner, EmptyState, Skeleton } from './components/Feedback'
import { Page } from './components/Page'
import { IconButton } from './components/IconButton'
import { useToast } from './components/Toast'
import { AddTaskRow, TaskSection } from './TaskList'
import { requestPalette } from './quickAdd'
import { useTheme } from './theme'
import { radius, type, WIDE_BREAKPOINT } from './tokens'
import { useOnline } from './useOnline'
import { useTaskActions } from './useTaskActions'
import { useNow, useTaskData } from './useTaskData'

// Today, as drawn in Paper (05 Web · Today, 03 Phone · Today): the title, the date and how many tasks the day holds, a
// View menu, then the list split by section headers and an "Add task" row at the end (N focuses it on the web).
// Overdue has a Reschedule action that moves every late task to today. No points or ring. A task added here has no date
// unless its words give one, so it lands in Anytime.
export function TodayScreen() {
  const toast = useToast()
  const router = useRouter()
  const [showDone, setShowDone] = useState(savedShowDone)
  const [viewAt, setViewAt] = useState<{ x: number; y: number } | null>(null)
  const wide = useWindowDimensions().width >= WIDE_BREAKPOINT
  const now = useNow()
  const online = useOnline()
  const actions = useTaskActions(now)
  const { store, tasks, projects, projectMap, loaded, syncError } = useTaskData()

  const groups = groupTasks(tasks, now)
  const open = [
    { id: 'overdue', title: 'Overdue', rows: groups.overdue },
    { id: 'due-today', title: 'Due today', rows: groups.dueToday },
    { id: 'in-progress', title: 'In progress', rows: groups.inProgress },
    { id: 'coming-up', title: 'Coming up', rows: groups.comingUp },
    { id: 'anytime', title: 'Anytime', rows: groups.anytime },
  ]
  const empty = open.every((s) => s.rows.length === 0) && groups.doneToday.length === 0

  // Every late task to today, keeping its time. Undo puts each back on its own date.
  function rescheduleOverdue() {
    const late = groups.overdue.map((t) => ({ id: t.id, dueDate: t.due_date }))
    const today = localDay(now)
    actions.run(() => {
      batch(() => late.forEach((t) => store.editTask(t.id, { dueDate: today })))
      toast.show({
        message: late.length === 1 ? 'Moved 1 task to today' : `Moved ${late.length} tasks to today`,
        action: {
          label: 'Undo',
          onPress: () =>
            actions.run(() => batch(() => late.forEach((t) => store.editTask(t.id, { dueDate: t.dueDate })))),
        },
      })
    })
  }

  function addTask(text: string) {
    const read = parseTask(text, now, projects)
    const task = { title: read.title, dueDate: read.dueDate, dueTime: read.dueTime, projectId: read.projectId }
    actions.run(() => {
      store.addTask(task)
      toast.show({ message: addedMessage(task, now, task.projectId ? projectMap?.[task.projectId]?.name : undefined) })
    })
  }

  const shared = { all: tasks, projectMap, now, actions }

  const count = groups.overdue.length + groups.dueToday.length + groups.doneToday.length

  function toggleDone() {
    setShowDone((on) => {
      saveShowDone(!on)
      return !on
    })
  }

  return (
    <Page
      title="Today"
      titleTestID="today-title"
      subtitle={todayLine(now, count)}
      subtitleTestID="day-summary"
      actions={
        wide ? (
          <ViewButton onPress={setViewAt} />
        ) : (
          <>
            <IconButton icon={Icons.search} label="Search" onPress={requestPalette} testID="today-search" />
            <IconButton icon={Icons.more} label="View" onPress={() => setViewAt({ x: 0, y: 0 })} testID="today-view" />
          </>
        )
      }
    >
      <View style={{ gap: 8 }}>
        {!online ? <Banner kind="offline">Offline. Changes are saved on this device and sync later.</Banner> : null}
        {online && syncError ? <Banner kind="error">Sync failed. Your data is safe locally.</Banner> : null}
      </View>

      {!loaded ? (
        <View style={{ marginTop: 16 }}>
          <Skeleton />
        </View>
      ) : (
        <>
          {open.map((s) => (
            <TaskSection
              key={s.id}
              {...s}
              {...shared}
              action={
                s.id === 'overdue'
                  ? { label: 'Reschedule', onPress: rescheduleOverdue, testID: 'reschedule-overdue' }
                  : undefined
              }
            />
          ))}
          {empty ? <EmptyState title="A clear day" body="Nothing scheduled. Add a task to get started." /> : null}
          {wide ? <AddTaskRow onAdd={addTask} composer underline={false} testID="new-title" /> : null}
          {showDone ? (
            <TaskSection id="done-today" title="Done today" rows={groups.doneToday} foldOnPhone {...shared} />
          ) : null}
        </>
      )}
      {actions.menuElement}
      <ContextMenu
        at={viewAt}
        onClose={() => setViewAt(null)}
        title="View"
        items={[
          {
            section: 'Show',
            label: 'Done today',
            icon: Icons.check,
            checked: showDone,
            onPress: toggleDone,
            testID: 'view-done',
          },
          {
            section: 'Go to',
            label: 'Upcoming',
            icon: Icons.upcoming,
            hint: 'U',
            onPress: () => router.navigate('/upcoming'),
            testID: 'view-upcoming',
          },
          { label: 'Search', icon: Icons.search, onPress: requestPalette, testID: 'view-search' },
        ]}
      />
    </Page>
  )
}

// Whether Today shows what was finished today, kept per browser on the web.
const DONE_KEY = 'tovy-today-show-done'
function savedShowDone(): boolean {
  try {
    return globalThis.localStorage?.getItem(DONE_KEY) !== '0'
  } catch {
    return true
  }
}
function saveShowDone(on: boolean) {
  try {
    globalThis.localStorage?.setItem(DONE_KEY, on ? '1' : '0')
  } catch {
    // Private windows can refuse storage; the choice then lasts until reload.
  }
}

// The View button at the right of the title (Paper, Web Today): a quiet outlined pill that opens the View menu under it.
function ViewButton({ onPress }: { onPress: (at: { x: number; y: number }) => void }) {
  const { theme } = useTheme()
  const c = theme.colors
  const { hovered, handlers } = useHover()
  const ring = useFocusRing(c.primary)
  return (
    <Pressable
      testID="today-view"
      accessibilityRole="button"
      accessibilityLabel="View options"
      onPress={(e) => {
        const box = (e.currentTarget as unknown as HTMLElement).getBoundingClientRect?.()
        onPress(box ? { x: box.right - 232, y: box.bottom + 6 } : { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY })
      }}
      style={[
        {
          height: 32,
          paddingHorizontal: 14,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: c.line,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          backgroundColor: hovered ? c.hover : c.bg,
        },
        transition('background-color'),
        ring.style,
      ]}
      {...handlers}
      {...ring.handlers}
    >
      <Icons.sort size={14} color={c.text} />
      <Text style={[type.label, { color: c.text }]}>View</Text>
    </Pressable>
  )
}
