import { Pressable, Text, View } from 'react-native'
import { PROJECT_COLORS, useTheme } from './theme'
import { radius, type } from './tokens'
import { ProgressRing } from './components/ProgressRing'
import { transition, useFocusRing, useHover } from './components/web'
import { dueLabel, isOverdue } from '../core/today'
import type { Project, Task } from '../core/sync/tasks'

// Design 7.14. A round ring on the left (tap to finish or reopen), the title, a meta line (due text, project dot and
// name), and the percentage in Geist Mono on the right for a deep task that is partly done. Tapping the text opens the
// task. Right-click or long-press opens the menu.
export function TaskRow({
  task,
  project,
  progress,
  now,
  selected = false,
  onToggleDone,
  onOpen,
  onMenu,
}: {
  task: Task
  project: Project | undefined
  progress: number | null // 0 to 100 from the subtasks, or null
  now: Date
  selected?: boolean // open in the side panel
  onToggleDone: () => void
  onOpen: () => void
  onMenu: (at: { x: number; y: number }) => void
}) {
  const { theme } = useTheme()
  const c = theme.colors
  const { hovered, handlers: hover } = useHover()
  const ring = useFocusRing(c.accent)
  const done = !!task.done_at
  const partial = progress !== null && progress > 0 && progress < 100
  const overdue = isOverdue(task, now)
  const projectColor = project ? (PROJECT_COLORS[project.color] ?? PROJECT_COLORS.slate) : null

  return (
    <View
      testID="task"
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          paddingHorizontal: 4,
          paddingVertical: 2,
          borderRadius: radius.lg,
          backgroundColor: selected ? c.accentSoft : hovered ? c.ink1 : 'transparent',
        },
        transition('background-color'),
      ]}
      {...hover}
    >
      <Pressable
        testID={`done-${task.id}`}
        accessibilityRole="checkbox"
        accessibilityLabel={done ? `Reopen ${task.title}` : `Finish ${task.title}`}
        accessibilityState={{ checked: done }}
        onPress={onToggleDone}
        style={{ width: 38, height: 44, alignItems: 'center', justifyContent: 'center' }}
      >
        <ProgressRing size={26} stroke={3} progress={(progress ?? 0) / 100} done={done} />
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
        style={[{ flex: 1, paddingVertical: 8, paddingHorizontal: 4, gap: 2 }, ring.style]}
        {...ring.handlers}
      >
        <Text
          testID={`title-${task.id}`}
          numberOfLines={2}
          style={[
            type.bodyMedium,
            { color: done ? c.ink5 : c.ink, textDecorationLine: done ? 'line-through' : 'none' },
          ]}
        >
          {task.title}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Text style={[type.meta, { color: overdue ? c.bad : c.ink6 }]}>{dueLabel(task, now)}</Text>
          {projectColor ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: projectColor }} />
              <Text style={[type.meta, { color: c.ink6 }]}>{project?.name}</Text>
            </View>
          ) : null}
        </View>
      </Pressable>
      {partial ? <Text style={[type.monoS, { color: c.ink6, paddingRight: 8 }]}>{progress}%</Text> : null}
    </View>
  )
}
