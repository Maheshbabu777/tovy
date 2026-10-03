import { useState } from 'react'
import { useRouter } from 'expo-router'
import { Icons } from './icons'
import type { Task } from '../core/sync/tasks'
import { addDays, localDay } from '../core/today'
import { ContextMenu } from './components/ContextMenu'
import { useToast } from './components/Toast'
import { DateSheet } from './DateSheet'
import { ProjectPickerSheet } from './ProjectPickerSheet'
import { useStore } from './StoreContext'
import { useTaskData } from './useTaskData'

// Test hook: lets the end-to-end tests read tap-to-render timings.
const perf: number[] = []
;(globalThis as any).__perf = perf
function measure(action: () => void) {
  const start = performance.now()
  action()
  requestAnimationFrame(() => perf.push(performance.now() - start))
}

// What every list of tasks does with a task: finish it, delete it with Undo, open it, move it to tomorrow, and the
// right-click or long-press menu. A store rule that refuses (it throws) is shown as a message instead of failing silently.
export function useTaskActions(now: Date) {
  const store = useStore()
  const router = useRouter()
  const toast = useToast()
  const [menu, setMenu] = useState<{ task: Task; at: { x: number; y: number } } | null>(null)
  // A sheet opened from the menu, for sorting a task without opening it (spec inbox-triage).
  const [sheet, setSheet] = useState<{ task: Task; kind: 'date' | 'project' } | null>(null)
  const { projects } = useTaskData()

  function run(action: () => void) {
    try {
      measure(action)
    } catch (e) {
      toast.show({ message: e instanceof Error ? e.message : String(e) })
    }
  }

  const toggleDone = (task: Task) =>
    run(() => {
      store.setDone(task.id, !task.done_at)
      if (!task.done_at)
        toast.show({
          message: `Done: ${task.title}`,
          action: { label: 'Undo', onPress: () => run(() => store.setDone(task.id, false)) },
        })
    })

  const remove = (task: Task) =>
    run(() => {
      const { ids, undo } = store.deleteTask(task.id)
      toast.show({
        message: ids.length === 1 ? 'Task deleted' : `${ids.length} tasks deleted`,
        action: { label: 'Undo', onPress: undo },
      })
    })

  const open = (task: Task) => router.setParams({ task: task.id })

  // Tomorrow, keeping the time. Undo puts the old date back.
  const moveTomorrow = (task: Task) =>
    run(() => {
      if (task.done_at) return // a finished task has nowhere to move
      const before = task.due_date
      store.editTask(task.id, { dueDate: addDays(localDay(now), 1) })
      toast.show({
        message: `Moved to tomorrow: ${task.title}`,
        action: { label: 'Undo', onPress: () => run(() => store.editTask(task.id, { dueDate: before })) },
      })
    })

  const menuElement = (
    <ContextMenu
      at={menu?.at ?? null}
      onClose={() => setMenu(null)}
      title={menu?.task.title}
      items={
        menu
          ? [
              {
                label: 'Open',
                icon: Icons.external,
                hint: 'Enter',
                testID: 'menu-open',
                onPress: () => open(menu.task),
              },
              {
                label: 'Schedule',
                icon: Icons.time,
                hint: 'S',
                testID: 'menu-schedule',
                onPress: () => setSheet({ task: menu.task, kind: 'date' }),
              },
              {
                label: 'Move to project',
                icon: Icons.project,
                hint: 'M',
                testID: 'menu-project',
                onPress: () => setSheet({ task: menu.task, kind: 'project' }),
              },
              {
                label: 'Move to tomorrow',
                icon: Icons.date,
                testID: 'menu-tomorrow',
                onPress: () => moveTomorrow(menu.task),
              },
              {
                label: 'Delete',
                icon: Icons.delete,
                danger: true,
                testID: 'menu-delete',
                onPress: () => remove(menu.task),
              },
            ]
          : []
      }
    />
  )

  // Moving a task to a project from the menu; Undo puts it back where it was.
  const moveTo = (task: Task, projectId: string | null) =>
    run(() => {
      const before = task.project_id
      if (before === projectId) return
      store.moveToProject(task.id, projectId)
      const name = projectId ? projects.find((p) => p.id === projectId)?.name : 'Inbox'
      toast.show({
        message: `Moved to ${name ?? 'a project'}`,
        action: { label: 'Undo', onPress: () => run(() => store.moveToProject(task.id, before)) },
      })
    })

  const sheetElement = (
    <>
      <DateSheet
        visible={sheet?.kind === 'date'}
        onClose={() => setSheet(null)}
        value={sheet?.task.due_date ?? null}
        time={sheet?.task.due_time ?? null}
        onPick={(day, time) => {
          if (!sheet) return
          run(() => store.editTask(sheet.task.id, { dueDate: day, dueTime: day ? time : null }))
          // keep the sheet showing the new values
          setSheet({ ...sheet, task: { ...sheet.task, due_date: day, due_time: day ? time : null } })
        }}
      />
      <ProjectPickerSheet
        visible={sheet?.kind === 'project'}
        onClose={() => setSheet(null)}
        projects={projects}
        value={sheet?.task.project_id ?? null}
        onPick={(projectId) => sheet && moveTo(sheet.task, projectId)}
      />
    </>
  )

  return {
    run,
    toggleDone,
    remove,
    open,
    moveTomorrow,
    openMenu: (task: Task, at: { x: number; y: number }) => setMenu({ task, at }),
    // A row's hover actions on the web (spec design-v2): the same sheets the menu opens, one click away.
    schedule: (task: Task) => setSheet({ task, kind: 'date' }),
    pickProject: (task: Task) => setSheet({ task, kind: 'project' }),
    menuElement: (
      <>
        {menuElement}
        {sheetElement}
      </>
    ),
  }
}
