import { undoPlan, type AiAction } from '../core/ai'
import { markUndone, restoreTasks, updateProject } from '../core/aiApi'
import { hasSubtasks } from '../core/progress'
import type { Task, TasksStore } from '../core/sync/tasks'

// Takes back one change an AI app made (Activity, spec mcp-server). Live rows change through the tasks store, so the
// screen updates at once, offline too, and progress is logged like any change of yours. Rows the store no longer holds
// (deleted ones) are restored on the server. Returns the undone time, or the reason it could not be undone.
export async function undoAiAction(
  store: TasksStore,
  action: AiAction,
): Promise<{ ok: true; at: string } | { ok: false; message: string }> {
  const live = () => Object.values((store.tasks$.peek() ?? {}) as Record<string, Task>).filter((t) => t && !t.deleted)
  const find = (id: string) => live().find((t) => t.id === id)
  try {
    for (const step of undoPlan(action)) {
      if (step.kind === 'removeTask') {
        if (find(step.id)) store.deleteTask(step.id)
      } else if (step.kind === 'setProject') {
        const p = (store.projects$.peek() as Record<string, { deleted?: boolean }> | undefined)?.[step.id]
        const live = !!p && !p.deleted
        if (step.fields.deleted === true && Object.keys(step.fields).length === 1) {
          if (live) store.deleteProject(step.id)
        } else {
          const saved = await updateProject(step.id, step.fields)
          if (!saved.ok) return { ok: false, message: saved.message }
        }
      } else if (step.kind === 'restoreTasks') {
        const restored = await restoreTasks(step.ids)
        if (!restored.ok) return { ok: false, message: restored.message }
      } else {
        const task = find(step.id)
        if (!task) return { ok: false, message: 'That task was deleted since. Restore it from Trash first.' }
        const f = step.fields
        if (f.kind && f.kind !== task.kind && !(f.kind === 'quick' && hasSubtasks(task, live())))
          store.setKind(task.id, f.kind)
        const edit: Parameters<TasksStore['editTask']>[1] = {}
        if ('title' in f && f.title !== undefined) edit.title = f.title
        if ('note' in f && f.note !== undefined) edit.note = f.note
        if ('due_date' in f) edit.dueDate = f.due_date ?? null
        if ('due_time' in f) edit.dueTime = f.due_time ?? null
        if ('due_date' in f && !f.due_date) edit.dueTime = null
        if (Object.keys(edit).length) store.editTask(task.id, edit)
        if ('parent_id' in f && (f.parent_id ?? null) !== task.parent_id) store.moveUnder(task.id, f.parent_id ?? null)
        if ('project_id' in f && (f.project_id ?? null) !== task.project_id)
          store.moveToProject(task.id, f.project_id ?? null)
        if ('done_at' in f && !!f.done_at !== !!task.done_at) store.setDone(task.id, !!f.done_at)
        const now = find(task.id)
        if ('progress' in f && typeof f.progress === 'number' && now && !now.done_at && !hasSubtasks(now, live())) {
          if ((now.progress ?? 0) !== f.progress) store.setProgress(task.id, f.progress)
        }
      }
    }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Could not undo that' }
  }
  const marked = await markUndone(action.id)
  return marked.ok ? { ok: true, at: marked.data } : { ok: false, message: marked.message }
}
