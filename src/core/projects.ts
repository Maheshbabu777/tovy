import type { Project, Task } from './sync/tasks'
import { percentOf } from './progress'

export const taskPercent = percentOf

// "N tasks . X% done" for a project card: top level tasks of the project (null: the ones with no project), and the
// average progress of them.
export function projectStats(projectId: string | null, all: Task[]): { count: number; percent: number } {
  const own = all.filter((t) => t && !t.deleted && !t.parent_id && (t.project_id ?? null) === projectId)
  if (own.length === 0) return { count: 0, percent: 0 }
  const sum = own.reduce((total, t) => total + taskPercent(t, all), 0)
  return { count: own.length, percent: Math.round(sum / own.length) }
}

export const taskCountLabel = (count: number) => `${count} ${count === 1 ? 'task' : 'tasks'}`

// Oldest project first, so the list does not jump around.
export const sortProjects = (projects: Project[]): Project[] =>
  [...projects].sort((a, b) => (a.created_at ?? '~').localeCompare(b.created_at ?? '~') || a.id.localeCompare(b.id))
