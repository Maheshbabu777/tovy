import { useWindowDimensions, View } from 'react-native'
import { Icons } from './icons'
import { taskCountLabel } from '../core/projects'
import { inboxTasks } from '../core/views'
import { EmptyState, Skeleton } from './components/Feedback'
import { Page } from './components/Page'
import { useToast } from './components/Toast'
import { addedMessage } from '../core/parseTask'
import type { NewQuickTask } from './QuickAddSheet'
import { Composer, ListTop, TaskRows } from './TaskList'
import { WIDE_BREAKPOINT } from './tokens'
import { useTaskActions } from './useTaskActions'
import { useNow, useTaskData } from './useTaskData'

// Inbox: everything captured that is not filed in a project yet. Add here, sort later.
export function InboxScreen() {
  const toast = useToast()
  const wide = useWindowDimensions().width >= WIDE_BREAKPOINT
  const now = useNow()
  const actions = useTaskActions(now)
  const { store, tasks, projectMap, loaded } = useTaskData()
  const rows = inboxTasks(tasks)

  function addTask(task: NewQuickTask) {
    actions.run(() => {
      store.addTask(task)
      toast.show({ message: addedMessage(task, now, task.projectId ? projectMap?.[task.projectId]?.name : undefined) })
    })
  }

  return (
    <Page title="Inbox" subtitle={rows.length ? taskCountLabel(rows.length) : undefined} titleTestID="inbox-title">
      {wide ? (
        <View style={{ marginTop: 24 }}>
          <Composer onAdd={addTask} placeholder="Capture a task" testID="inbox-new-title" />
        </View>
      ) : null}
      <View style={{ marginTop: 16 }}>
        {!loaded ? (
          <Skeleton rows={4} />
        ) : (
          <>
            {rows.length ? <ListTop /> : null}
            <TaskRows rows={rows} all={tasks} projectMap={projectMap} now={now} actions={actions} showProject={false} />
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
