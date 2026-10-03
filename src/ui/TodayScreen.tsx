import { Text, useWindowDimensions, View } from 'react-native'
import { useRouter } from 'expo-router'
import { batch } from '@legendapp/state'
import { Icons } from './icons'
import { dateLine, groupTasks, localDay } from '../core/today'
import { daySummary, timelyGreeting } from '../core/views'
import { Banner, EmptyState, Skeleton } from './components/Feedback'
import { Page } from './components/Page'
import { IconButton } from './components/IconButton'
import { useToast } from './components/Toast'
import { addedMessage } from '../core/parseTask'
import type { NewQuickTask } from './QuickAddSheet'
import { Composer, TaskSection } from './TaskList'
import { requestPalette } from './quickAdd'
import { useTheme } from './theme'
import { type, WIDE_BREAKPOINT } from './tokens'
import { useProfile } from './useProfile'
import { useOnline } from './useOnline'
import { useTaskActions } from './useTaskActions'
import { useNow, useTaskData } from './useTaskData'

// Today: the date, a greeting for the time of day with the first name, a one line summary of the day, the composer
// (wide), then the list split by section headers.
// Overdue has a Reschedule action that moves every late task to today. No points or ring. A task added here has no date,
// so it lands in Anytime.
export function TodayScreen() {
  const toast = useToast()
  const router = useRouter()
  const { theme } = useTheme()
  const c = theme.colors
  const profile = useProfile()
  const wide = useWindowDimensions().width >= WIDE_BREAKPOINT
  const now = useNow()
  const online = useOnline()
  const actions = useTaskActions(now)
  const { store, tasks, projectMap, loaded, syncError } = useTaskData()

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

  function addTask(task: NewQuickTask) {
    actions.run(() => {
      store.addTask(task)
      toast.show({ message: addedMessage(task, now, task.projectId ? projectMap?.[task.projectId]?.name : undefined) })
    })
  }

  const shared = { all: tasks, projectMap, now, actions }

  const hero = (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingTop: 8 }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text testID="today-date" style={[type.monoS, { color: c.text2 }]}>
          {dateLine(now)}
        </Text>
        <Text
          testID="today-title"
          accessibilityRole="header"
          style={[wide ? type.displayXl : type.display, { color: c.text, marginTop: 6 }]}
        >
          {timelyGreeting(now, profile?.first_name)}
        </Text>
        <Text testID="day-summary" style={[type.bodyS, { color: c.text2, marginTop: 6 }]}>
          {daySummary(groups)}
        </Text>
      </View>
      {wide ? (
        <View style={{ flexDirection: 'row', gap: 4, marginTop: 14 }}>
          <IconButton icon={Icons.search} label="Search" onPress={requestPalette} testID="today-search" />
          <IconButton
            icon={Icons.upcoming}
            label="Upcoming"
            onPress={() => router.navigate('/upcoming')}
            testID="today-upcoming"
          />
        </View>
      ) : null}
    </View>
  )

  return (
    <Page
      title="Today"
      hero={hero}
      actions={
        wide ? undefined : (
          <IconButton icon={Icons.search} label="Search" onPress={requestPalette} testID="today-search" />
        )
      }
    >
      {wide ? (
        <View style={{ marginTop: 24 }}>
          <Composer onAdd={addTask} placeholder="Add a task" testID="new-title" />
        </View>
      ) : null}

      <View style={{ gap: 8, marginTop: 8 }}>
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
          {empty ? (
            <EmptyState icon={Icons.today} title="A clear day" body="Nothing scheduled. Add a task to get started." />
          ) : null}
          <TaskSection id="done-today" title="Done today" rows={groups.doneToday} foldOnPhone {...shared} />
        </>
      )}
      {actions.menuElement}
    </Page>
  )
}
