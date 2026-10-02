import { View } from 'react-native'
import { batch } from '@legendapp/state'
import { localDay } from '../core/today'
import { upcoming } from '../core/views'
import { Skeleton } from './components/Feedback'
import { Page } from './components/Page'
import { ScreenHeader } from './components/ScreenHeader'
import { useToast } from './components/Toast'
import { AddTaskRow, TaskSection } from './TaskList'
import { useTaskActions } from './useTaskActions'
import { useNow, useTaskData } from './useTaskData'

// Upcoming: late tasks first, then the week day by day (empty days too), then later days that have something on them.
// Each day has its own "Add task" row that adds a task on that day.
export function UpcomingScreen() {
  const toast = useToast()
  const now = useNow()
  const actions = useTaskActions(now)
  const { store, tasks, projectMap, loaded } = useTaskData()
  const view = upcoming(tasks, now)
  const shared = { all: tasks, projectMap, now, actions }

  function rescheduleOverdue() {
    const late = view.overdue.map((t) => ({ id: t.id, dueDate: t.due_date }))
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

  function addOn(day: string, title: string) {
    actions.run(() => {
      store.addTask({ title, dueDate: day, projectId: null })
      toast.show({ message: `Added "${title}"` })
    })
  }

  return (
    <Page>
      <ScreenHeader title="Upcoming" titleTestID="upcoming-title" />
      {!loaded ? (
        <View style={{ marginTop: 16 }}>
          <Skeleton />
        </View>
      ) : (
        <>
          <TaskSection
            id="overdue"
            title="Overdue"
            rows={view.overdue}
            action={{ label: 'Reschedule', onPress: rescheduleOverdue, testID: 'reschedule-overdue' }}
            {...shared}
          />
          {view.days.map((d) => (
            <TaskSection key={d.day} id={`day-${d.day}`} title={d.title} rows={d.tasks} keepEmpty {...shared}>
              <AddTaskRow onAdd={(title) => addOn(d.day, title)} testID={`add-${d.day}`} collapsible />
            </TaskSection>
          ))}
        </>
      )}
      {actions.menuElement}
    </Page>
  )
}
