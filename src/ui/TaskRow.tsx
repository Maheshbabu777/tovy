import { Animated, Pressable, Text, View } from 'react-native'
import { useEnter } from './motion'
import { useTheme } from './theme'
import { type } from './tokens'
import { ProgressRing } from './components/ProgressRing'
import { transition, useFocusRing, useHover } from './components/web'
import { dueLabel, isOverdue } from '../core/today'
import type { Project, Task } from '../core/sync/tasks'

// Style guide, Task row: a 20 px check on the left (tap to finish or reopen), the title, then one meta line only when
// something is set (the due date, red when late; the percent in mono and "2 of 5" subtasks). The project name sits at
// the right in text-2. Rows are split by hairlines, never boxed. Tapping the text opens the task; right-click or
// long-press opens the menu.
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
  enterDelay = 0,
}: {
  enterDelay?: number // fade and rise in after this many ms (a small stagger on first load)
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
  const { hovered, handlers: hover } = useHover()
  const ring = useFocusRing(c.primary)
  const done = !!task.done_at
  const partial = progress !== null && progress > 0 && progress < 100
  const overdue = isOverdue(task, now)
  const hasSubs = !!subtasks && subtasks.total > 0
  const hasMeta = !!task.due_date || partial || hasSubs
  const enter = useEnter({ delay: enterDelay, distance: 6, duration: 200 })

  return (
    <Animated.View
      testID="task"
      style={[
        enter,
        {
          flexDirection: 'row',
          alignItems: 'flex-start',
          borderBottomWidth: 1,
          borderBottomColor: c.line,
          backgroundColor: selected || hovered ? c.hover : 'transparent',
          marginHorizontal: -8,
          paddingHorizontal: 8,
        },
        transition('background-color'),
      ]}
    >
      <Pressable
        testID={`done-${task.id}`}
        accessibilityRole="checkbox"
        accessibilityLabel={done ? `Reopen ${task.title}` : `Finish ${task.title}`}
        accessibilityState={{ checked: done }}
        onPress={onToggleDone}
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
        onPress={onOpen}
        onLongPress={(e) => onMenu({ x: e.nativeEvent.pageX, y: e.nativeEvent.pageY })}
        // @ts-expect-error the right-click event only exists on the web
        onContextMenu={(e: { preventDefault: () => void; pageX: number; pageY: number }) => {
          e.preventDefault()
          onMenu({ x: e.pageX, y: e.pageY })
        }}
        style={[{ flex: 1, flexDirection: 'row', gap: 12, paddingVertical: 12, minHeight: 48 }, ring.style]}
        {...ring.handlers}
        {...hover}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <Text
            testID={`title-${task.id}`}
            numberOfLines={2}
            style={[type.body, { color: done ? c.text3 : c.text, textDecorationLine: done ? 'line-through' : 'none' }]}
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
            </View>
          ) : null}
        </View>
        {showProject && project ? (
          <Text numberOfLines={1} style={[type.meta, { color: c.text2, maxWidth: 140, paddingTop: 2 }]}>
            {project.name}
          </Text>
        ) : null}
      </Pressable>
    </Animated.View>
  )
}
