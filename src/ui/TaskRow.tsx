import { useState } from 'react'
import { Animated, Pressable, Text, View } from 'react-native'
import { Icons } from './icons'
import { EASE, prefersReducedMotion, useEnter } from './motion'
import { keyboardFinish } from './keyboardList'
import { useSwipe } from './components/useSwipe'
import { useDraggableTask } from './dragTask'
import type { SwipeAction } from '../core/swipe'
import { useTheme } from './theme'
import { type } from './tokens'
import { AIBadge } from './components/AppMark'
import { ProgressRing } from './components/ProgressRing'
import { pressScale, transition, useFocusRing, useGroupHover, useHover, webStyle } from './components/web'
import type { ToolkitIcon } from './icons'
import { dueLabel, isOverdue } from '../core/today'
import { deadlineInfo, priorityOf, readRepeat } from '../core/taskFields'
import type { Project, Task } from '../core/sync/tasks'

// Style guide, Task row: a 20 px check on the left (tap to finish or reopen), the title, then one meta line only when
// something is set (the due date, red when late; the percent in mono and "2 of 5" subtasks). The project name sits at
// the right in text-2. Rows are split by hairlines, never boxed. Tapping the text opens the task. On the web, pointing at
// a row swaps the project name for its actions (Schedule, Move, More), so nothing needs a right-click (spec design-v2);
// right-click and long-press still open the full menu.
export function TaskRow({
  task,
  project,
  progress,
  subtasks,
  now,
  selected = false,
  showProject = true,
  onToggleDone,
  onOpen,
  onMenu,
  onSwipe,
  onSchedule,
  onMove,
  animateIn = false,
}: {
  onSchedule?: () => void // web hover action
  onMove?: () => void // web hover action
  onSwipe?: (action: SwipeAction) => void // phone: swipe right finishes, left moves to tomorrow
  animateIn?: boolean // rise in when it first shows (a row that just arrived); rows already there stay put
  task: Task
  project: Project | undefined
  progress: number | null // 0 to 100, or null
  subtasks?: { done: number; total: number }
  now: Date
  selected?: boolean // open in the side panel
  showProject?: boolean
  onToggleDone: () => void
  onOpen: () => void
  onMenu: (at: { x: number; y: number }) => void
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const { hovered, handlers: hover } = useGroupHover()
  const ring = useFocusRing(c.primary)
  // Finishing (Paper "06 Motion", the finished task): the circle fills with a pop, a line draws through the title, the
  // row stays a beat so you see it, then folds away; only then is the task marked done and moved to Done.
  const [finishedAt, setFinishedAt] = useState<string | null>(null) // set while the finishing moment plays
  const finishing = finishedAt !== null
  const [strike] = useState(() => new Animated.Value(0))
  const [leave] = useState(() => new Animated.Value(1))
  const [rowHeight, setRowHeight] = useState(0)
  const done = !!task.done_at || finishing
  function toggle() {
    if (task.done_at || finishing || prefersReducedMotion() || keyboardFinish.now) {
      onToggleDone()
      return
    }
    setFinishedAt(new Date().toISOString())
    Animated.timing(strike, { toValue: 1, duration: 300, delay: 120, easing: EASE, useNativeDriver: false }).start()
    Animated.timing(leave, { toValue: 0, duration: 260, delay: 600, easing: EASE, useNativeDriver: false }).start(
      () => {
        onToggleDone()
        // Still here (a list that keeps done rows): show it again, as a done row.
        leave.setValue(1)
        strike.setValue(0)
        setFinishedAt(null)
      },
    )
  }
  const partial = progress !== null && progress > 0 && progress < 100
  const overdue = isOverdue(task, now)
  const hasSubs = !!subtasks && subtasks.total > 0
  const byAi = !!task.created_by // added by an AI app (spec mcp-server)
  // Spec task-fields: a P1 to P3 tag, the deadline (red when close), labels and a repeat mark.
  const priority = priorityOf(task)
  const deadline = task.deadline ? deadlineInfo(task.deadline, now) : null
  const labels = task.labels ?? []
  const repeat = readRepeat(task.repeat)
  const hasMeta =
    !!task.due_date || partial || hasSubs || byAi || priority < 4 || !!deadline || labels.length > 0 || !!repeat
  const keyboardFocus = Object.keys(ring.style).length > 0
  const enter = useEnter({ distance: 6, duration: 200, skip: !animateIn })
  const swipe = useSwipe(onSwipe, { left: !done })
  const dragRef = useDraggableTask(task.id) // the web: drag onto a day or a list (spec upcoming-drag)

  return (
    <Animated.View
      ref={dragRef}
      testID="task"
      onLayout={(e) => {
        swipe.onLayout(e.nativeEvent.layout.width)
        if (!finishing) setRowHeight(e.nativeEvent.layout.height)
      }}
      style={[
        enter,
        { marginHorizontal: -8, overflow: 'hidden' },
        finishing && rowHeight
          ? { opacity: leave, maxHeight: leave.interpolate({ inputRange: [0, 1], outputRange: [0, rowHeight] }) }
          : {},
      ]}
    >
      {onSwipe ? <SwipeBackdrop x={swipe.x} done={done} /> : null}
      {/* The hairline is as wide as the column (Paper, Web Today); the hover fill reaches 8 px past it. */}
      <View
        pointerEvents="none"
        style={{ position: 'absolute', left: 8, right: 8, bottom: 0, height: 1, backgroundColor: c.line, zIndex: 1 }}
      />
      <Animated.View
        {...swipe.handlers}
        style={[
          {
            flexDirection: 'row',
            alignItems: 'flex-start',
            backgroundColor: selected || hovered || keyboardFocus ? c.hover : c.bg,
            // Reached with the keyboard (J and K on the web): the whole row lights up, with a bar at the left edge.
            borderLeftWidth: 2,
            borderLeftColor: keyboardFocus ? c.text : 'transparent',
            paddingLeft: 6,
            paddingHorizontal: 8,
            transform: [{ translateX: swipe.x }],
          },
          transition('background-color'),
        ]}
      >
        <Pressable
          testID={`done-${task.id}`}
          accessibilityRole="checkbox"
          accessibilityLabel={done ? `Reopen ${task.title}` : `Finish ${task.title}`}
          accessibilityState={{ checked: done }}
          onPress={() => {
            if (!swipe.justSwiped()) toggle()
          }}
          {...hover}
          hitSlop={6}
          style={({ pressed }) => [{ width: 34, paddingTop: 14, paddingBottom: 14 }, pressScale(pressed, 0.88)]}
        >
          <ProgressRing
            size={20}
            stroke={partial ? 2 : 1.5}
            progress={(progress ?? 0) / 100}
            done={done}
            doneAt={task.done_at ?? finishedAt}
            strong={priority === 1}
          />
        </Pressable>
        <Pressable
          testID={`open-${task.id}`}
          accessibilityRole="button"
          onPress={() => {
            if (!swipe.justSwiped()) onOpen()
          }}
          onLongPress={(e) => onMenu({ x: e.nativeEvent.pageX, y: e.nativeEvent.pageY })}
          // @ts-expect-error the right-click event only exists on the web
          onContextMenu={(e: { preventDefault: () => void; pageX: number; pageY: number }) => {
            e.preventDefault()
            onMenu({ x: e.pageX, y: e.pageY })
          }}
          style={[
            { flex: 1, flexDirection: 'row', gap: 12, paddingVertical: 14, minHeight: 48 },
            webStyle({ outlineStyle: 'none' }),
          ]}
          {...ring.handlers}
          {...hover}
        >
          <View style={{ flex: 1, gap: 4 }}>
            <View style={{ alignSelf: 'flex-start', maxWidth: '100%' }}>
              <Text
                testID={`title-${task.id}`}
                numberOfLines={2}
                style={[
                  type.body,
                  {
                    color: done ? c.text3 : c.text,
                    textDecorationLine: done && !finishing ? 'line-through' : 'none',
                  },
                  transition('color', 300),
                ]}
              >
                {task.title}
              </Text>
              {finishing ? (
                <Animated.View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: Math.round(type.body.lineHeight / 2),
                    height: 1.5,
                    borderRadius: 1,
                    backgroundColor: c.text3,
                    width: strike.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                  }}
                />
              ) : null}
            </View>
            {hasMeta && !task.done_at ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', columnGap: 12, rowGap: 4, flexWrap: 'wrap' }}>
                {task.due_date ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={[type.meta, { color: overdue ? c.red : c.text2 }]}>{dueLabel(task, now)}</Text>
                    {repeat ? <Icons.repeat size={13} color={c.text2} /> : null}
                  </View>
                ) : null}
                {priority < 4 ? (
                  <View
                    testID={`priority-${task.id}`}
                    style={{
                      borderWidth: 1,
                      borderColor: c.text,
                      borderRadius: 4,
                      paddingHorizontal: 5,
                      paddingVertical: 1,
                    }}
                  >
                    <Text style={[type.monoXs, { color: c.text }]}>P{priority}</Text>
                  </View>
                ) : null}
                {deadline ? (
                  <Text style={[type.meta, { color: deadline.soon ? c.red : c.text2 }]}>{deadline.label}</Text>
                ) : null}
                {labels.slice(0, 3).map((l) => (
                  <Text key={l} style={[type.meta, { color: c.text2 }]}>
                    @{l}
                  </Text>
                ))}
                {partial ? <Text style={[type.monoS, { color: c.text2 }]}>{progress}%</Text> : null}
                {hasSubs ? (
                  <Text style={[type.meta, { color: c.text2 }]}>
                    {subtasks!.done} of {subtasks!.total}
                  </Text>
                ) : null}
                {byAi ? <AIBadge /> : null}
              </View>
            ) : null}
          </View>
          {(hovered || keyboardFocus) && (onSchedule || onMove) ? null : showProject && project ? (
            <Text numberOfLines={1} style={[type.meta, { color: c.text2, maxWidth: 140, paddingTop: 1 }]}>
              {project.name}
            </Text>
          ) : null}
        </Pressable>
        {(hovered || keyboardFocus) && (onSchedule || onMove) ? (
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 2, paddingTop: 10, paddingBottom: 10 }}>
            {onSchedule && !done ? (
              <RowAction
                icon={Icons.date}
                label="Schedule"
                onPress={onSchedule}
                hover={hover}
                testID={`row-schedule-${task.id}`}
              />
            ) : null}
            {onMove ? (
              <RowAction
                icon={Icons.project}
                label="Move to project"
                onPress={onMove}
                hover={hover}
                testID={`row-move-${task.id}`}
              />
            ) : null}
            <RowAction
              icon={Icons.more}
              label="More actions"
              onPressAt={(at) => onMenu(at)}
              hover={hover}
              testID={`row-more-${task.id}`}
            />
          </View>
        ) : null}
      </Animated.View>
    </Animated.View>
  )
}

// A 28 px icon button in a row's hover actions. It shares the row's hover, so the actions stay while the pointer moves
// across them, and it shows its name as the tooltip.
function RowAction({
  icon: Icon,
  label,
  onPress,
  onPressAt,
  hover,
  testID,
}: {
  icon: ToolkitIcon
  label: string
  onPress?: () => void
  onPressAt?: (at: { x: number; y: number }) => void
  hover: { onHoverIn: () => void; onHoverOut: () => void }
  testID: string
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const own = useHover()
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      // @ts-expect-error `title` is the web tooltip
      title={label}
      onPress={(e) => (onPressAt ? onPressAt({ x: e.nativeEvent.pageX, y: e.nativeEvent.pageY }) : onPress?.())}
      onHoverIn={() => {
        hover.onHoverIn()
        own.handlers.onHoverIn()
      }}
      onHoverOut={() => {
        hover.onHoverOut()
        own.handlers.onHoverOut()
      }}
      style={[
        {
          width: 28,
          height: 28,
          borderRadius: 6,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: own.hovered ? c.lineStrong : 'transparent',
        },
        transition('background-color'),
      ]}
    >
      <Icon size={17} color={c.text2} />
    </Pressable>
  )
}

// What sits under a row while it is swiped: finish on the left (revealed by swiping right), tomorrow on the right.
// The side that is not in play stays hidden.
function SwipeBackdrop({ x, done }: { x: Animated.Value; done: boolean }) {
  const { theme } = useTheme()
  const c = theme.colors
  const right = x.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' })
  const left = x.interpolate({ inputRange: [-1, 0], outputRange: [1, 0], extrapolate: 'clamp' })
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: right,
          backgroundColor: c.primary,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingLeft: 20,
        }}
      >
        <Icons.check size={20} color={c.onPrimary} bold />
        <Text style={[type.label, { color: c.onPrimary }]}>{done ? 'Reopen' : 'Done'}</Text>
      </Animated.View>
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: left,
          backgroundColor: c.panel,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 8,
          paddingRight: 20,
        }}
      >
        <Text style={[type.label, { color: c.text }]}>Tomorrow</Text>
        <Icons.date size={20} color={c.text} />
      </Animated.View>
    </View>
  )
}
