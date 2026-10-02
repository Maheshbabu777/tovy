import { useEffect, useState } from 'react'
import { syncState } from '@legendapp/state'
import { use$ } from '@legendapp/state/react'
import { sortProjects } from '../core/projects'
import type { Project, Task } from '../core/sync/tasks'
import { useStore } from './StoreContext'

// The clock every list reads, so the date stays right across midnight and a long session.
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])
  return now
}

// The live tasks and projects of the signed-in person. Not memoised: Legend-State changes these objects in place, so
// their identity does not change when a task does.
export function useTaskData() {
  const store = useStore()
  const tasksMap = use$(store.tasks$) as Record<string, Task> | undefined
  const projectMap = use$(store.projects$) as Record<string, Project> | undefined
  const taskState = syncState(store.tasks$)
  const loaded = use$(taskState.isPersistLoaded)
  const syncError = use$(taskState.error)
  const tasks = Object.values(tasksMap ?? {}).filter(Boolean) as Task[]
  const projects = sortProjects(Object.values(projectMap ?? {}).filter((p) => p && !p.deleted) as Project[])
  return { store, tasks, projects, projectMap, loaded, syncError }
}
