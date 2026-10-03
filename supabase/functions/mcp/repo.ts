import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { LogRow, ProjectRow, TaskRow } from './logic.ts'

// What the tools read and write. Every call runs as the person, with the AI app's own token, so row security decides
// what is visible and what the app may change (migration 0009). Nothing here uses the service role key.
export interface Repo {
  tasks(): Promise<TaskRow[]> // every live task of the person
  projects(): Promise<ProjectRow[]> // every live project
  insertTask(row: Partial<TaskRow> & { id: string; title: string }): Promise<void>
  updateTasks(ids: string[], patch: Partial<TaskRow>): Promise<void>
  insertProject(row: { id: string; name: string; color: string }): Promise<void>
  insertLog(row: LogRow): Promise<void>
  log(taskId: string, limit: number): Promise<LogRow[]>
  firstName(): Promise<string | null>
}

// A database refusal, said in words an AI app can pass on.
export class RepoError extends Error {}

function fail(error: { message?: string; code?: string } | null, what: string): void {
  if (!error) return
  if (error.code === '42501' || /row-level security/i.test(error.message ?? '')) {
    throw new RepoError(`Tovy did not allow this app to ${what}. The person may have limited this app to reading.`)
  }
  throw new RepoError(`Could not ${what}: ${error.message ?? 'unknown error'}`)
}

const TASK_FIELDS =
  'id,title,note,due_date,due_time,kind,done_at,progress,project_id,parent_id,deleted,created_by,created_at,updated_at'

export function supabaseRepo(url: string, anonKey: string, token: string): Repo {
  const db: SupabaseClient = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  return {
    async tasks() {
      const { data, error } = await db.from('tasks').select(TASK_FIELDS).eq('deleted', false).limit(5000)
      fail(error, 'read tasks')
      return (data ?? []) as TaskRow[]
    },
    async projects() {
      const { data, error } = await db.from('projects').select('id,name,color,deleted').eq('deleted', false)
      fail(error, 'read projects')
      return (data ?? []) as ProjectRow[]
    },
    async insertTask(row) {
      const { error } = await db.from('tasks').insert(row)
      fail(error, 'add the task')
    },
    async updateTasks(ids, patch) {
      if (!ids.length) return
      const { data, error } = await db.from('tasks').update(patch).in('id', ids).select('id')
      fail(error, 'change the task')
      // An update row security filters out returns no rows and no error.
      if ((data ?? []).length !== ids.length) fail({ code: '42501' }, 'change the task')
    },
    async insertProject(row) {
      const { error } = await db.from('projects').insert(row)
      fail(error, 'add the project')
    },
    async insertLog(row) {
      const { error } = await db.from('progress_log').insert(row)
      fail(error, 'log progress')
    },
    async log(taskId, limit) {
      const { data, error } = await db
        .from('progress_log')
        .select('task_id,delta,progress_after,note,source,day,created_at')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false })
        .limit(limit)
      fail(error, 'read the progress log')
      return (data ?? []) as LogRow[]
    },
    async firstName() {
      const { data } = await db.from('profiles').select('first_name').maybeSingle()
      return (data as { first_name?: string } | null)?.first_name ?? null
    },
  }
}
