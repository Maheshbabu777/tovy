import { dateLabel } from '../core/parseTask'
import type { Task } from '../core/sync/tasks'
import { useToast } from './components/Toast'
import { useStore } from './StoreContext'

// What dropping a dragged task does (spec upcoming-drag): onto a day it takes that date (keeping its time), onto a
// list it moves there. Each says where it went, with Undo. A finished task stays where it is.
export function useDropActions(now: Date) {
  const store = useStore()
  const toast = useToast()
  const find = (id: string) => {
    const t = (store.tasks$.peek() as Record<string, Task> | undefined)?.[id]
    return t && !t.deleted ? t : undefined
  }
  const attempt = (action: () => void) => {
    try {
      action()
    } catch (e) {
      toast.show({ message: e instanceof Error ? e.message : String(e) })
    }
  }

  function toDay(id: string, day: string) {
    const task = find(id)
    if (!task || task.due_date === day) return
    if (task.done_at) {
      toast.show({ message: 'A finished task stays where it is' })
      return
    }
    const before = { dueDate: task.due_date, dueTime: task.due_time }
    attempt(() => {
      store.editTask(id, { dueDate: day })
      toast.show({
        message: `Moved to ${dateLabel(day, now)}: ${task.title}`,
        action: { label: 'Undo', onPress: () => attempt(() => store.editTask(id, before)) },
      })
    })
  }

  function toProject(id: string, projectId: string | null, name: string) {
    const task = find(id)
    if (!task || task.project_id === projectId) return
    if (task.parent_id) {
      toast.show({ message: 'A subtask moves with its task' })
      return
    }
    const before = task.project_id
    attempt(() => {
      store.moveToProject(id, projectId)
      toast.show({
        message: `Moved to ${name}: ${task.title}`,
        action: { label: 'Undo', onPress: () => attempt(() => store.moveToProject(id, before)) },
      })
    })
  }

  return { toDay, toProject }
}
