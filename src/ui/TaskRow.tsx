import { Animated, Pressable, Text, View } from 'react-native'
import { Icons } from './icons'
import { useEnter } from './motion'
import { useSwipe } from './components/useSwipe'
import { useDraggableTask } from './dragTask'
import type { SwipeAction } from '../core/swipe'
import { useTheme } from './theme'
import { type } from './tokens'
import { AIBadge } from './components/AppMark'
import { ProgressRing } from './components/ProgressRing'
import { transition, useFocusRing, useGroupHover, useHover, webStyle } from './components/web'
import type { ToolkitIcon } from './icons'
import { dueLabel, isOverdue } from '../core/today'
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
  const done = !!task.done_at
  const partial = progress !== null && progress > 0 && progress < 100
  const overdue = isOverdue(task, now)
  const hasSubs = !!subtasks && subtasks.total > 0
  const byAi = !!task.created_by // added by an AI app (spec mcp-server)
  const hasMeta = !!task.due_date || partial || hasSubs || byAi
  const keyboardFocus = Object.keys(ring.style).length > 0
  const enter = useEnter({ distance: 6, duration: 200, skip: !animateIn })
  const swipe = useSwipe(onSwipe, { left: !done })
  const dragRef = useDraggableTask(task.id) // the web: drag onto a day or a list (spec upcoming-drag)

  return (
    <Animated.View
      ref={dragRef}
      testID="task"
      onLayout={(e) => swipe.onLayout(e.nativeEvent.layout.width)}
      style={[enter, { marginHorizontal: -8, borderBottomWidth: 1, borderBottomColor: c.line, overflow: 'hidden' }]}
    >
      {onSwipe ? <SwipeBackdrop x={swipe.x} done={done} /> : null}
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
            if (!swipe.justSwiped()) onToggleDone()
          }}
          {...hover}
          hitSlop={6}
          style={{ width: 32, paddingTop: 13, paddingBottom: 12 }}
        >
          <ProgressRing
            size={20}
            stroke={partial ? 2 : 1.5}
            progress={(progress ?? 0) / 100}
            done={done}
            doneAt={task.done_at}
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
            { flex: 1, flexDirection: 'row', gap: 12, paddingVertical: 12, minHeight: 48 },
            webStyle({ outlineStyle: 'none' }),
          ]}
          {...ring.handlers}
          {...hover}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <Text
              testID={`title-${task.id}`}
              numberOfLines={2}
              style={[
                type.body,
                { color: done ? c.text3 : c.text, textDecorationLine: done ? 'line-through' : 'none' },
              ]}
            >
              {task.title}
            </Text>
            {hasMeta && !done ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {task.due_date ? (
                  <Text style={[type.meta, { color: overdue ? c.red : c.text2 }]}>{dueLabel(task, now)}</Text>
                ) : null}
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
            <Text numberOfLines={1} style={[type.meta, { color: c.text2, maxWidth: 140, paddingTop: 2 }]}>
              {project.name}
            </Text>
          ) : null}
        </Pressable>
        {(hovered || keyboardFocus) && (onSchedule || onMove) ? (
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 2, paddingTop: 10 }}>
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
