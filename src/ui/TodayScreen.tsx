import { useWindowDimensions, View } from 'react-native'
import { batch } from '@legendapp/state'
import { Icons } from './icons'
import { dateLine, groupTasks, localDay } from '../core/today'
import { Banner, EmptyState, Skeleton } from './components/Feedback'
import { Page } from './components/Page'
import { ScreenHeader } from './components/ScreenHeader'
import { useToast } from './components/Toast'
import { AddTaskRow, TaskSection } from './TaskList'
import { WIDE_BREAKPOINT } from './tokens'
import { useOnline } from './useOnline'
import { useTaskActions } from './useTaskActions'
import { useNow, useTaskData } from './useTaskData'

// Today (style guide, Navigation and Task row): the title and the date, then the list split by section headers.
// Overdue has a Reschedule action that moves every late task to today. No points or ring. A task added here has no date,
// so it lands in Anytime.
export function TodayScreen() {
  const toast = useToast()
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

  function addTask(title: string) {
    actions.run(() => {
      store.addTask({ title, dueDate: null, projectId: null })
      toast.show({ message: `Added "${title}"` })
    })
  }

  const shared = { all: tasks, projectMap, now, actions }

  return (
    <Page>
      <ScreenHeader title="Today" subtitle={dateLine(now)} titleTestID="today-title" />

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
          {wide ? (
            <View style={{ marginTop: empty ? 8 : 0 }}>
              <AddTaskRow onAdd={addTask} />
            </View>
          ) : null}
          {empty ? (
            <EmptyState icon={Icons.today} title="A clear day" body="Nothing scheduled. Add a task to get started." />
          ) : null}
          <TaskSection id="done-today" title="Done today" rows={groups.doneToday} {...shared} />
        </>
      )}
      {actions.menuElement}
    </Page>
  )
}
