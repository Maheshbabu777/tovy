import { useEffect, useRef, useState } from 'react'
import { Animated, Platform, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native'
import { batch } from '@legendapp/state'
import { addDays, localDay } from '../core/today'
import { daysThrough, shiftMonth, upcoming, weekStart, weekStrip, type CalendarDay } from '../core/views'
import { CalendarBar, MonthPicker } from './Calendar'
import { Skeleton } from './components/Feedback'
import { Page } from './components/Page'
import { useToast } from './components/Toast'
import { AddTaskRow, TaskSection } from './TaskList'
import { animate, prefersReducedMotion } from './motion'
import { useTheme } from './theme'
import { radius, type, WIDE_BREAKPOINT } from './tokens'
import { useTaskActions } from './useTaskActions'
import { useNow, useTaskData } from './useTaskData'
import { useTaskDrop } from './dragTask'
import { useDropActions } from './useDropActions'
import { webStyle } from './components/web'

// How many days the list starts with, how many it grows by as the end comes near, and the most it holds (a year).
const FIRST_DAYS = 21
const MORE_DAYS = 28
const MOST_DAYS = 366

// Upcoming: late tasks first, then day after day (empty days too) for as far as the person scrolls or jumps, then later
// days that have something on them. Each day has its own "Add task" row that adds a task on that day. Above the list:
// the month (press it for a month grid), the week before and after, Today, and the week's days (spec design-v2).
export function UpcomingScreen() {
  const toast = useToast()
  const now = useNow()
  const actions = useTaskActions(now)
  const { store, tasks, projectMap, loaded } = useTaskData()
  const today = localDay(now)
  const [dayCount, setDayCount] = useState(FIRST_DAYS)
  const view = upcoming(tasks, now, dayCount)
  const shared = { all: tasks, projectMap, now, actions }
  const { width, height } = useWindowDimensions()
  const wide = width >= WIDE_BREAKPOINT
  const scroll = useRef<ScrollView>(null)
  const spots = useRef<Record<string, number>>({})
  const [selected, setSelected] = useState(today)
  const [week, setWeek] = useState(() => weekStart(today))
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerMonth, setPickerMonth] = useState(today)
  const headHeight = useRef(0)
  const jumping = useRef(false)
  const pending = useRef<string | null>(null) // a day picked beyond the list, scrolled to once it is drawn

  const nodes = useRef<Record<string, View | null>>({})
  // The web: drop a task on a day's section or on its cell in the strip to move it there (spec upcoming-drag).
  const drop = useDropActions(now)

  // Where a day's section starts in the scroll, so it lands just under the pinned strip (phone) or near the top (web).
  // In a browser the section is measured when asked, because the web only reports a view's layout when its size
  // changes, not when it moves (adding a task above would leave an old position). On a phone `onLayout` does report
  // moves: the sections sit under the large title, and the strip is pinned over the top of the list.
  const offsetOf = (day: string) => {
    if (Platform.OS === 'web') {
      const el = nodes.current[day] as unknown as HTMLElement | null
      const box = (scroll.current as unknown as { getScrollableNode?: () => HTMLElement })?.getScrollableNode?.()
      if (!el?.getBoundingClientRect || !box) return undefined
      // The calendar stays over the top of the list (sticky), so a day lands just under it.
      const strip = document.querySelector<HTMLElement>('[data-testid="week-strip"]')
      const cover = (strip?.parentElement?.offsetHeight ?? 0) + (wide ? 8 : 0)
      return el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - cover
    }
    const y = spots.current[day]
    if (y === undefined) return undefined
    return wide ? 40 + y - 8 : headHeight.current + y
  }

  function scrollTo(y: number, animated = !prefersReducedMotion()) {
    jumping.current = true
    scroll.current?.scrollTo({ y, animated })
    setTimeout(() => (jumping.current = false), 500)
  }

  // Picking a day (in the strip, the month grid or with the week arrows) scrolls its section to the top of the page.
  // A day past the end of the list makes the list longer first; the scroll happens once those days are drawn.
  function jumpTo(day: string) {
    const target = day < today ? today : day
    setSelected(target)
    setWeek(weekStart(target))
    const needed = Math.min(MOST_DAYS, daysThrough(now, target) + 7)
    if (needed > dayCount) {
      pending.current = target
      setDayCount(needed)
      return
    }
    const y = offsetOf(target)
    if (y !== undefined) scrollTo(y)
  }

  useEffect(() => {
    const day = pending.current
    if (!day) return
    // Wait a frame so the new sections are laid out before measuring where the day is.
    const frame = requestAnimationFrame(() => {
      pending.current = null
      const y = offsetOf(day)
      if (y !== undefined) scrollTo(y, false)
    })
    return () => cancelAnimationFrame(frame)
  })

  // The web: Escape closes the month grid.
  useEffect(() => {
    if (Platform.OS !== 'web' || !pickerOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPickerOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pickerOpen])

  function goToday() {
    setSelected(today)
    setWeek(weekStart(today))
    setPickerMonth(today)
    scrollTo(0)
  }

  // A week back or ahead: the strip moves and the list goes to that week's first day still to come.
  function stepWeek(step: -1 | 1) {
    const monday = addDays(week, step * 7)
    if (monday < weekStart(today)) return
    jumpTo(monday < today ? today : monday)
  }

  // While scrolling, the strip follows: the last day whose section has reached the top is the one in view. Near the
  // end of the list, more days are added, so the calendar never runs out.
  function follow(y: number) {
    if (jumping.current) return
    let inView = today
    for (const d of view.days) {
      const at = offsetOf(d.day)
      if (at === undefined) continue
      if (at > y + 12) break
      inView = d.day
    }
    if (inView !== selected) {
      setSelected(inView)
      if (weekStart(inView) !== week) setWeek(weekStart(inView))
    }
    const last = view.days[view.days.length - 1]
    const end = last ? offsetOf(last.day) : undefined
    if (end !== undefined && end - y < height * 2 && dayCount < MOST_DAYS) {
      setDayCount((n) => Math.min(MOST_DAYS, n + MORE_DAYS))
    }
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
      titleTestID="upcoming-title"
      onScroll={follow}
      onHeadHeight={(h) => (headHeight.current = h)}
      sticky={
        <View style={{ zIndex: 3 }}>
          <CalendarBar
            month={pickerOpen ? pickerMonth : addDays(week, 3)}
            open={pickerOpen}
            onToggle={() => {
              setPickerMonth(selected)
              setPickerOpen((o) => !o)
            }}
            onPrev={() => stepWeek(-1)}
            onNext={() => stepWeek(1)}
            onToday={goToday}
            canPrev={week > weekStart(today)}
          />
          {pickerOpen ? (
            <MonthPicker
              floating={wide}
              tasks={tasks}
              now={now}
              month={pickerMonth}
              selected={selected}
              onMonth={(step) => setPickerMonth((m) => shiftMonth(m, step))}
              canPrevMonth={shiftMonth(pickerMonth, 0) > shiftMonth(today, 0)}
              canNextMonth={shiftMonth(pickerMonth, 1) <= addDays(today, MOST_DAYS - 1)}
              onPick={(day) => {
                setPickerOpen(false)
                jumpTo(day)
              }}
            />
          ) : null}
          <WeekStrip
            days={weekStrip(tasks, now, week)}
            selected={selected}
            onPick={jumpTo}
            onDrop={(id, day) => drop.toDay(id, day)}
          />
        </View>
      }
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
            <DayDrop
              key={d.day}
              day={d.day}
              onDrop={(id) => drop.toDay(id, d.day)}
              setNode={(node) => (nodes.current[d.day] = node)}
              onY={(y) => (spots.current[d.day] = y)}
            >
              <TaskSection id={`day-${d.day}`} title={d.title} rows={d.tasks} keepEmpty {...shared}>
                <AddTaskRow onAdd={(title) => addOn(d.day, title)} testID={`add-${d.day}`} collapsible />
              </TaskSection>
            </DayDrop>
          ))}
          {/* Room under the last day, so picking a late day in the strip can still bring it to the top. */}
          <View style={{ height: Math.round(height * 0.5) }} />
        </>
      )}
      {actions.menuElement}
    </Page>
  )
}

// One day's section, which takes a dragged task (web). While a task is held over it, the section is outlined.
function DayDrop({
  day,
  onDrop,
  setNode,
  onY,
  children,
}: {
  day: string
  onDrop: (taskId: string) => void
  setNode: (node: View | null) => void
  onY: (y: number) => void
  children: React.ReactNode
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const [attach, over] = useTaskDrop(onDrop)
  return (
    <View
      testID={`drop-${day}`}
      ref={(node) => {
        setNode(node)
        attach(node)
      }}
      onLayout={(e) => onY(e.nativeEvent.layout.y)}
      style={[
        { marginHorizontal: -8, paddingHorizontal: 8, borderRadius: radius.md },
        over ? { backgroundColor: c.hover } : {},
        over ? webStyle({ boxShadow: `inset 0 0 0 1.5px ${c.text}` }) : {},
      ]}
    >
      {children}
    </View>
  )
}

// A week as cells, Monday to Sunday: weekday, date, and a dot when something is due. Today has a black ring; the
// picked day is filled; days already over are faded and cannot be picked. Pressing a cell scrolls to that day.
function WeekStrip({
  days,
  selected,
  onPick,
  onDrop,
}: {
  days: CalendarDay[]
  selected: string
  onPick: (day: string) => void
  onDrop: (taskId: string, day: string) => void
}) {
  const { theme } = useTheme()
  const [width, setWidth] = useState(0)
  const [x] = useState(() => new Animated.Value(0))
  const [shown] = useState(() => new Animated.Value(0))
  const placed = useRef(false)
  const index = days.findIndex((d) => d.day === selected)
  const cell = (width - 6 * 6) / 7
  // The picked day's fill is one shape that glides from day to day (Paper "06 Motion"), not seven that blink.
  useEffect(() => {
    if (!width) return
    if (index < 0) {
      animate(shown, 0, 120)
      return
    }
    const to = index * (cell + 6)
    if (!placed.current || prefersReducedMotion()) {
      x.setValue(to)
      placed.current = true
    } else {
      Animated.spring(x, { toValue: to, stiffness: 420, damping: 34, mass: 1, useNativeDriver: false }).start()
    }
    animate(shown, 1, 120)
  }, [index, cell, width, x, shown])
  return (
    <View
      testID="week-strip"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ flexDirection: 'row', gap: 6, paddingTop: 12, paddingBottom: 8 }}
    >
      {width ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 12,
            left: 0,
            width: cell,
            height: 68,
            borderRadius: radius.lg,
            backgroundColor: theme.colors.primary,
            opacity: shown,
            transform: [{ translateX: x }],
          }}
        />
      ) : null}
      {days.map((d) => (
        <WeekCell key={d.day} d={d} on={d.day === selected} onPick={onPick} onDrop={(id) => onDrop(id, d.day)} />
      ))}
    </View>
  )
}

function WeekCell({
  d,
  on: picked,
  onPick,
  onDrop,
}: {
  d: CalendarDay
  on: boolean
  onPick: (day: string) => void
  onDrop: (taskId: string) => void
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const [attach, over] = useTaskDrop(d.past ? () => {} : onDrop)
  // A task held over a cell fills it, like the picked day: that is where it will land.
  const on = picked || (over && !d.past)
  const today = d.today
  return (
    <Pressable
      ref={attach}
      disabled={d.past}
      testID={`week-${d.day}`}
      accessibilityRole="button"
      accessibilityLabel={`${d.weekday} ${d.date}${d.busy ? ', has tasks' : ''}`}
      accessibilityState={{ selected: on, disabled: d.past }}
      onPress={() => onPick(d.day)}
      style={{
        flex: 1,
        opacity: d.past ? 0.4 : 1,
        height: 68,
        borderRadius: radius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        // The picked day's fill is the gliding shape behind (WeekStrip); a task held over a day fills that day.
        backgroundColor: over && !d.past ? c.primary : 'transparent',
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
          backgroundColor: d.busy && !d.past ? (on ? c.onPrimary : c.text) : 'transparent',
        }}
      />
    </Pressable>
  )
}
