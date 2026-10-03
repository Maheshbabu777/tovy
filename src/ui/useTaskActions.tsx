import { useState } from 'react'
import { useRouter } from 'expo-router'
import { Icons } from './icons'
import type { Task } from '../core/sync/tasks'
import { addDays, localDay } from '../core/today'
import { ContextMenu } from './components/ContextMenu'
import { useToast } from './components/Toast'
import { useStore } from './StoreContext'

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
              { label: 'Open', icon: Icons.external, testID: 'menu-open', onPress: () => open(menu.task) },
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

  return {
    run,
    toggleDone,
    remove,
    open,
    moveTomorrow,
    openMenu: (task: Task, at: { x: number; y: number }) => setMenu({ task, at }),
    menuElement,
  }
}
