import { View } from 'react-native'
import { Icons } from './icons'
import { taskCountLabel } from '../core/projects'
import { inboxTasks } from '../core/views'
import { EmptyState, Skeleton } from './components/Feedback'
import { Page } from './components/Page'
import { ScreenHeader } from './components/ScreenHeader'
import { useToast } from './components/Toast'
import { AddTaskRow, TaskRows } from './TaskList'
import { useTaskActions } from './useTaskActions'
import { useNow, useTaskData } from './useTaskData'

// Inbox: everything captured that is not filed in a project yet. Add here, sort later.
export function InboxScreen() {
  const toast = useToast()
  const now = useNow()
  const actions = useTaskActions(now)
  const { store, tasks, projectMap, loaded } = useTaskData()
  const rows = inboxTasks(tasks)

  function addTask(title: string) {
    actions.run(() => {
      store.addTask({ title, dueDate: null, projectId: null })
      toast.show({ message: `Added "${title}"` })
    })
  }

  return (
    <Page>
      <ScreenHeader
        title="Inbox"
        subtitle={rows.length ? taskCountLabel(rows.length) : undefined}
        titleTestID="inbox-title"
      />
      <View style={{ marginTop: 16 }}>
        {!loaded ? (
          <Skeleton rows={4} />
        ) : (
          <>
            <TaskRows rows={rows} all={tasks} projectMap={projectMap} now={now} actions={actions} showProject={false} />
            <AddTaskRow onAdd={addTask} testID="inbox-new-title" />
            {rows.length === 0 ? (
              <EmptyState
                icon={Icons.inbox}
                title="Your inbox is clear"
                body="Capture anything here. File it in a project or give it a date when you are ready."
              />
            ) : null}
          </>
        )}
      </View>
      {actions.menuElement}
    </Page>
  )
}
