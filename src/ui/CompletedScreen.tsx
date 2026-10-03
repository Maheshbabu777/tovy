import { useWindowDimensions } from 'react-native'
import { useRouter } from 'expo-router'
import { Icons } from './icons'
import { completedByDay } from '../core/views'
import { EmptyState, Skeleton } from './components/Feedback'
import { Page } from './components/Page'
import { TaskSection } from './TaskList'
import { WIDE_BREAKPOINT } from './tokens'
import { useTaskActions } from './useTaskActions'
import { useNow, useTaskData } from './useTaskData'

// Completed (spec task-schedule): what you finished, day by day, for the last 30 days. Today only shows today's done
// tasks; this is where the rest went. Tapping the check reopens a task.
export function CompletedScreen() {
  const router = useRouter()
  const wide = useWindowDimensions().width >= WIDE_BREAKPOINT
  const now = useNow()
  const actions = useTaskActions(now)
  const { tasks, projectMap, loaded } = useTaskData()
  const days = completedByDay(tasks, now)
  const count = days.reduce((n, d) => n + d.tasks.length, 0)
  return (
    <Page
      title="Completed"
      subtitle={count ? `${count} in the last 30 days` : undefined}
      titleTestID="completed-title"
      onBack={wide ? undefined : () => router.navigate('/browse')}
    >
      {!loaded ? (
        <Skeleton rows={4} />
      ) : days.length === 0 ? (
        <EmptyState
          icon={Icons.check}
          title="Nothing finished yet"
          body="Tasks you finish show here, grouped by day, for 30 days."
        />
      ) : (
        days.map((d) => (
          <TaskSection
            key={d.day}
            id={`done-${d.day}`}
            title={d.title}
            rows={d.tasks}
            all={tasks}
            projectMap={projectMap}
            now={now}
            actions={actions}
          />
        ))
      )}
      {actions.menuElement}
    </Page>
  )
}
