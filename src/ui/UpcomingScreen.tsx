import { useRef, useState } from 'react'
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native'
import { batch } from '@legendapp/state'
import { localDay } from '../core/today'
import { upcoming, weekStrip } from '../core/views'
import { Skeleton } from './components/Feedback'
import { Page } from './components/Page'
import { useToast } from './components/Toast'
import { AddTaskRow, TaskSection } from './TaskList'
import { prefersReducedMotion } from './motion'
import { useTheme } from './theme'
import { radius, type, WIDE_BREAKPOINT } from './tokens'
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
  const wide = useWindowDimensions().width >= WIDE_BREAKPOINT
  const scroll = useRef<ScrollView>(null)
  const spots = useRef<Record<string, number>>({})
  const [selected, setSelected] = useState(localDay(now))
  const headHeight = useRef(0)
  const jumping = useRef(false)

  // Where a day's section starts in the scroll. Phone: the sections sit under the large title, and the strip is pinned
  // over the top of the list. Web: positions are measured inside the page column, below its 40 px top padding.
  const offsetOf = (day: string) => {
    const y = spots.current[day]
    if (y === undefined) return undefined
    return wide ? 40 + y - 8 : headHeight.current + y
  }

  // Pressing a day in the strip scrolls its section to the top of the page.
  function jumpTo(day: string) {
    setSelected(day)
    const y = offsetOf(day)
    if (y === undefined) return
    jumping.current = true
    scroll.current?.scrollTo({ y, animated: !prefersReducedMotion() })
    setTimeout(() => (jumping.current = false), 500)
  }

  // While scrolling, the strip follows: the last day whose section has reached the top is the one in view.
  function follow(y: number) {
    if (jumping.current) return
    let inView = localDay(now)
    for (const d of view.days) {
      const at = offsetOf(d.day)
      if (at !== undefined && at <= y + 12) inView = d.day
    }
    if (inView !== selected) setSelected(inView)
  }

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
    <Page
      scrollRef={scroll}
      title="Upcoming"
      subtitle={monthLine(now)}
      titleTestID="upcoming-title"
      onScroll={follow}
      onHeadHeight={(h) => (headHeight.current = h)}
      sticky={<WeekStrip days={weekStrip(tasks, now)} selected={selected} onPick={jumpTo} />}
    >
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
            <View key={d.day} onLayout={(e) => (spots.current[d.day] = e.nativeEvent.layout.y)}>
              <TaskSection id={`day-${d.day}`} title={d.title} rows={d.tasks} keepEmpty {...shared}>
                <AddTaskRow onAdd={(title) => addOn(d.day, title)} testID={`add-${d.day}`} collapsible />
              </TaskSection>
            </View>
          ))}
        </>
      )}
      {actions.menuElement}
    </Page>
  )
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]
const monthLine = (now: Date) => `${MONTHS[now.getMonth()]} ${now.getFullYear()}`

// The next seven days as cells: weekday, date, and a dot when something is due. Today has a black ring; the picked day
// is filled. Pressing a cell scrolls to that day.
function WeekStrip({
  days,
  selected,
  onPick,
}: {
  days: { day: string; weekday: string; date: number; busy: boolean }[]
  selected: string
  onPick: (day: string) => void
}) {
  const { theme } = useTheme()
  const c = theme.colors
  return (
    <View testID="week-strip" style={{ flexDirection: 'row', gap: 6, paddingTop: 16, paddingBottom: 8 }}>
      {days.map((d, i) => {
        const on = d.day === selected
        const today = i === 0
        return (
          <Pressable
            key={d.day}
            testID={`week-${d.day}`}
            accessibilityRole="button"
            accessibilityLabel={`${d.weekday} ${d.date}${d.busy ? ', has tasks' : ''}`}
            accessibilityState={{ selected: on }}
            onPress={() => onPick(d.day)}
            style={{
              flex: 1,
              height: 68,
              borderRadius: radius.lg,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              backgroundColor: on ? c.primary : 'transparent',
              borderWidth: 1,
              borderColor: on ? c.primary : today ? c.text : c.line,
            }}
          >
            <Text style={[type.micro, { color: on ? c.onPrimary : c.text2 }]}>{d.weekday}</Text>
            <Text style={[type.title, { color: on ? c.onPrimary : c.text }]}>{d.date}</Text>
            <View
              style={{
                width: 4,
                height: 4,
                borderRadius: 2,
                backgroundColor: d.busy ? (on ? c.onPrimary : c.text) : 'transparent',
              }}
            />
          </Pressable>
        )
      })}
    </View>
  )
}
