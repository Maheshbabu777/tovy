import { Text, useWindowDimensions, View } from 'react-native'
import { useRouter } from 'expo-router'
import { use$ } from '@legendapp/state/react'
import { habitStats, heatmap, isHabit, isPaused, type HeatDay } from '../core/habits'
import type { LogEntry } from '../core/progress'
import type { Task } from '../core/sync/tasks'
import { readRepeat, repeatLabel } from '../core/taskFields'
import { localDay } from '../core/today'
import { dateLabel } from '../core/parseTask'
import { Button } from './components/Button'
import { EmptyState, Skeleton } from './components/Feedback'
import { Page } from './components/Page'
import { useToast } from './components/Toast'
import { useTheme } from './theme'
import { radius, type, WIDE_BREAKPOINT } from './tokens'
import { useNow, useTaskData } from './useTaskData'

// Habits (stage 6): every repeating task tracked as a habit, with its streak, its best and twelve weeks of days.
// Skip moves today's one on without breaking the streak; Pause takes it off every list until it is resumed.
export function HabitsScreen() {
  const router = useRouter()
  const wide = useWindowDimensions().width >= WIDE_BREAKPOINT
  const now = useNow()
  const { store, tasks, loaded } = useTaskData()
  const logsMap = use$(store.logs$) as Record<string, LogEntry> | undefined
  const logs = Object.values(logsMap ?? {}) as LogEntry[]
  const habits = tasks.filter((t) => t && !t.deleted && !t.parent_id && isHabit(t))
  const active = habits.filter((t) => !isPaused(t))
  const paused = habits.filter(isPaused)
  return (
    <Page
      title="Habits"
      subtitle={habits.length ? `${active.length} going${paused.length ? `, ${paused.length} paused` : ''}` : undefined}
      titleTestID="habits-title"
      onBack={wide ? undefined : () => router.navigate('/browse')}
    >
      <View style={{ marginTop: 28, gap: 16 }}>
        {!loaded ? (
          <Skeleton rows={3} />
        ) : habits.length === 0 ? (
          <EmptyState
            title="No habits yet"
            body="Give a task a repeat, like every day or every mon and thu, then choose Track as a habit in its Repeat menu."
          />
        ) : (
          [...active, ...paused].map((t) => <HabitCard key={t.id} task={t} logs={logs} now={now} />)
        )}
      </View>
    </Page>
  )
}

export function HabitCard({ task, logs, now }: { task: Task; logs: LogEntry[]; now: Date }) {
  const { theme } = useTheme()
  const c = theme.colors
  const { store } = useTaskData()
  const toast = useToast()
  const today = localDay(now)
  const stats = habitStats(task, logs, today)
  const repeat = readRepeat(task.repeat)
  const pausedNow = !!repeat?.paused
  const run = (f: () => void) => {
    try {
      f()
    } catch (e) {
      toast.show({ message: e instanceof Error ? e.message : String(e) })
    }
  }
  return (
    <View
      testID={`habit-card-${task.id}`}
      style={{
        borderWidth: 1,
        borderColor: c.line,
        borderRadius: radius.lg,
        padding: 20,
        gap: 16,
        opacity: pausedNow ? 0.6 : 1,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[type.bodyMedium, { color: c.text }]}>{task.title}</Text>
          <Text style={[type.meta, { color: c.text2 }]}>
            {[
              repeat ? repeatLabel(repeat) : '',
              pausedNow ? 'Paused' : task.due_date ? `Next ${dateLabel(task.due_date, now)}` : '',
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>
        <Stat label="Streak" value={stats.streak} testID={`habit-streak-${task.id}`} />
        <Stat label="Best" value={stats.best} />
      </View>
      <Heatmap days={heatmap(task, stats, today)} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {pausedNow ? null : (
          <Button
            label="Skip"
            variant="ghost"
            bordered
            small
            testID={`habit-skip-${task.id}`}
            onPress={() =>
              run(() => {
                const { next } = store.skipHabit(task.id)
                toast.show({ message: `Skipped. Back ${dateLabel(next, new Date())}` })
              })
            }
          />
        )}
        <Button
          label={pausedNow ? 'Resume' : 'Pause'}
          variant="ghost"
          bordered
          small
          testID={`habit-pause-${task.id}`}
          onPress={() => run(() => store.setPaused(task.id, !pausedNow))}
        />
      </View>
    </View>
  )
}

function Stat({ label, value, testID }: { label: string; value: number; testID?: string }) {
  const { theme } = useTheme()
  const c = theme.colors
  return (
    <View style={{ alignItems: 'flex-end', minWidth: 56 }}>
      <Text testID={testID} style={[type.numberL, { color: c.text }]}>
        {value}
      </Text>
      <Text style={[type.micro, { color: c.text3, marginTop: 4 }]}>{label}</Text>
    </View>
  )
}

const CELL = 12
const GAP = 3

// Twelve weeks of days, one column per week (Monday at the top): filled when done, a ring when skipped, a soft square
// when it was due and missed, a ring around today when it is still to do.
export function Heatmap({ days }: { days: HeatDay[][] }) {
  const { theme } = useTheme()
  const c = theme.colors
  const fill: Record<HeatDay['state'], string> = {
    done: c.text,
    skipped: 'transparent',
    missed: c.lineStrong,
    due: 'transparent',
    off: c.panel,
    future: 'transparent',
  }
  return (
    <View
      accessibilityLabel={`${days.flat().filter((d) => d.state === 'done').length} days done in the last twelve weeks`}
      style={{ flexDirection: 'row', gap: GAP }}
    >
      {days.map((week) => (
        <View key={week[0].day} style={{ gap: GAP }}>
          {week.map((d) => (
            <View
              key={d.day}
              style={{
                width: CELL,
                height: CELL,
                borderRadius: 3,
                backgroundColor: fill[d.state],
                borderWidth: d.state === 'skipped' || d.state === 'due' ? 1.5 : 0,
                borderColor: d.state === 'due' ? c.text : c.text3,
              }}
            />
          ))}
        </View>
      ))}
    </View>
  )
}
