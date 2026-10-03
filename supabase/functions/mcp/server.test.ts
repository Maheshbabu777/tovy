// The MCP server end to end, over HTTP, with an in-memory database standing in for Supabase.
// deno-lint-ignore-file require-await -- the in-memory fakes stand in for async database calls
//   deno test --allow-env   (from supabase/functions/mcp)
import { assert, assertEquals, assertMatch } from '@std/assert'
import { createApp } from './index.ts'
import type { LogRow, ProjectRow, TaskRow } from './logic.ts'
import { type Repo, RepoError } from './repo.ts'

const NOW = new Date('2026-10-03T08:00:00Z')
const TOKEN = 'good-token'
const READ_ONLY = 'read-only-token'

type Store = { tasks: TaskRow[]; projects: ProjectRow[]; log: LogRow[]; readOnly: boolean }

function task(id: string, title: string, extra: Partial<TaskRow> = {}): TaskRow {
  return {
    id,
    title,
    note: '',
    due_date: null,
    due_time: null,
    kind: 'quick',
    done_at: null,
    progress: 0,
    project_id: null,
    parent_id: null,
    deleted: false,
    created_at: '2026-10-01T00:00:00Z',
    ...extra,
  }
}

const P_WORK = '00000000-0000-4000-8000-0000000000a1'
const T_REPORT = '00000000-0000-4000-8000-000000000001'
const T_LATE = '00000000-0000-4000-8000-000000000002'
const T_DEEP = '00000000-0000-4000-8000-000000000003'
const T_SUB1 = '00000000-0000-4000-8000-000000000004'
const T_SUB2 = '00000000-0000-4000-8000-000000000005'

function fresh(): Store {
  return {
    projects: [{ id: P_WORK, name: 'Work', color: 'slate' }],
    tasks: [
      task(T_REPORT, 'Write report', { due_date: '2026-10-03', due_time: '15:00:00', project_id: P_WORK }),
      task(T_LATE, 'Pay rent', { due_date: '2026-10-01' }),
      task(T_DEEP, 'Launch site', { kind: 'deep', project_id: P_WORK }),
      task(T_SUB1, 'Copy', { parent_id: T_DEEP, project_id: P_WORK }),
      task(T_SUB2, 'Design', { parent_id: T_DEEP, project_id: P_WORK }),
      task('00000000-0000-4000-8000-000000000006', 'Buy shoes'),
    ],
    log: [],
    readOnly: false,
  }
}

function memoryRepo(s: Store): Repo {
  const write = () => {
    if (s.readOnly) throw new RepoError('Tovy did not allow this app to change the task.')
  }
  return {
    tasks: async () => s.tasks.filter((t) => !t.deleted).map((t) => ({ ...t })),
    projects: async () => s.projects.filter((p) => !p.deleted).map((p) => ({ ...p })),
    insertTask: async (row) => {
      write()
      s.tasks.push(task(row.id, row.title, row))
    },
    updateTasks: async (ids, patch) => {
      write()
      s.tasks = s.tasks.map((t) => (ids.includes(t.id) ? { ...t, ...patch } : t))
    },
    insertProject: async (row) => {
      write()
      s.projects.push(row)
    },
    insertLog: async (row) => {
      write()
      s.log.push(row)
    },
    log: async (id) => s.log.filter((e) => e.task_id === id),
    firstName: async () => 'Mahesh',
  }
}

function setup() {
  const store = fresh()
  const app = createApp({
    publicUrl: 'https://ref.supabase.co/functions/v1/mcp',
    authServer: 'https://ref.supabase.co/auth/v1',
    verify: async (token) =>
      token === TOKEN || token === READ_ONLY ? { userId: 'user-1', clientId: 'client-1' } : null,
    repoFor: (token) => {
      store.readOnly = token === READ_ONLY
      return memoryRepo(store)
    },
    now: () => NOW,
    rateLimit: 1000,
  })
  let n = 0
  const rpc = async (method: string, params: unknown = {}, token = TOKEN) => {
    const res = await app.request('/mcp', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        'MCP-Protocol-Version': '2025-06-18',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: ++n, method, params }),
    })
    assertEquals(res.status, 200, await res.clone().text())
    // A tool call may answer as a short event stream: one `data:` line with the JSON-RPC response.
    const raw = await res.text()
    const json = raw.trimStart().startsWith('{')
      ? raw
      : raw
          .split('\n')
          .filter((l) => l.startsWith('data:'))
          .map((l) => l.slice(5))
          .join('')
    return JSON.parse(json) as { result?: any; error?: any }
  }
  const call = async (name: string, args: Record<string, unknown>, token = TOKEN) => {
    const body = await rpc('tools/call', { name, arguments: args }, token)
    assert(body.result, JSON.stringify(body))
    return body.result as { content: { text: string }[]; isError?: boolean; structuredContent?: any }
  }
  return { store, app, rpc, call }
}

Deno.test('no token: 401 that points to the sign-in metadata', async () => {
  const { app } = setup()
  const res = await app.request('/mcp', { method: 'POST', body: '{}' })
  assertEquals(res.status, 401)
  assertMatch(
    res.headers.get('WWW-Authenticate') ?? '',
    /resource_metadata="https:\/\/ref\.supabase\.co\/functions\/v1\/mcp\/\.well-known\/oauth-protected-resource"/,
  )
  const bad = await app.request('/mcp', { method: 'POST', headers: { Authorization: 'Bearer nope' }, body: '{}' })
  assertEquals(bad.status, 401)
  assertMatch(bad.headers.get('WWW-Authenticate') ?? '', /invalid_token/)
})

Deno.test('protected resource metadata names the auth server', async () => {
  const { app } = setup()
  const res = await app.request('/mcp/.well-known/oauth-protected-resource')
  assertEquals(res.status, 200)
  const body = await res.json()
  assertEquals(body.resource, 'https://ref.supabase.co/functions/v1/mcp')
  assertEquals(body.authorization_servers, ['https://ref.supabase.co/auth/v1'])
})

Deno.test('tool list carries the hints, delete is destructive', async () => {
  const { rpc } = setup()
  await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '1' } })
  const { result } = await rpc('tools/list')
  const names = result.tools.map((t: { name: string }) => t.name).sort()
  assertEquals(names, [
    'add_project',
    'add_task',
    'complete_task',
    'delete_task',
    'get_task',
    'get_today',
    'list_projects',
    'log_progress',
    'search_tasks',
    'update_task',
  ])
  const del = result.tools.find((t: { name: string }) => t.name === 'delete_task')
  assertEquals(del.annotations.destructiveHint, true)
  const today = result.tools.find((t: { name: string }) => t.name === 'get_today')
  assertEquals(today.annotations.readOnlyHint, true)
})

Deno.test('get_today: overdue, due today, inbox, the first name', async () => {
  const { call } = setup()
  const r = await call('get_today', { today: '2026-10-03' })
  const t = r.content[0].text
  assertMatch(t, /Mahesh's day, 2026-10-03/)
  assertMatch(t, /Overdue \(1\):\n- Pay rent/)
  assertMatch(t, /Due today \(1\):\n- Write report \[.+\] \(due today 15:00, project Work\)/)
  assertEquals(r.structuredContent.inbox, 1) // Buy shoes; Pay rent has a date
})

Deno.test('search_tasks: words, project, status', async () => {
  const { call } = setup()
  assertMatch((await call('search_tasks', { query: 'REPORT' })).content[0].text, /Write report/)
  const work = await call('search_tasks', { project: 'wor' })
  assertEquals(work.structuredContent.tasks.length, 4)
  const none = await call('search_tasks', { project: 'Gym' })
  assert(none.isError)
  assertMatch(none.content[0].text, /Projects: "Work"/)
})

Deno.test('add_task: lands in the Inbox or a project, marks who added it', async () => {
  const { call, rpc, store } = setup()
  const r = await call('add_task', { title: 'Call mom', due_date: '2026-10-04', due_time: '18:30' })
  assertMatch(r.content[0].text, /Added "Call mom" \[.+\] in the Inbox/)
  const added = store.tasks.find((t) => t.title === 'Call mom')!
  assertEquals(added.created_by, 'client-1')
  assertEquals(added.due_time, '18:30')

  const inWork = await call('add_task', { title: 'Slides', project: 'work' })
  assertMatch(inWork.content[0].text, /in Work/)

  const bad = await call('add_task', { title: 'x', due_time: '09:00' })
  assert(bad.isError)
  const badDate = await rpc('tools/call', { name: 'add_task', arguments: { title: 'x', due_date: '2026-02-30' } })
  assertMatch(badDate.error.message, /Use a date like/)
  assertEquals(store.tasks.filter((t) => t.title === 'x').length, 0)
})

Deno.test('add_task under a quick task makes the parent deep', async () => {
  const { call, store } = setup()
  await call('add_task', { title: 'Find receipt', parent_id: T_LATE })
  assertEquals(store.tasks.find((t) => t.id === T_LATE)!.kind, 'deep')
  const sub = store.tasks.find((t) => t.title === 'Find receipt')!
  assertEquals(sub.parent_id, T_LATE)
})

Deno.test('update_task: only passed fields, clearing the date clears the time, before is kept for undo', async () => {
  const { call, store } = setup()
  await call('update_task', { id: T_REPORT, due_date: null })
  const t = store.tasks.find((x) => x.id === T_REPORT)!
  assertEquals(t.due_date, null)
  assertEquals(t.due_time, null)
  assertEquals(t.title, 'Write report')
  const quick = await call('update_task', { id: T_DEEP, kind: 'quick' })
  assert(quick.isError)
  const nothing = await call('update_task', { id: T_REPORT })
  assert(nothing.isError)
})

Deno.test('complete_task logs the rest of the progress on the top level task', async () => {
  const { call, store } = setup()
  await call('complete_task', { id: T_SUB1, today: '2026-10-03' })
  assert(store.tasks.find((t) => t.id === T_SUB1)!.done_at)
  assertEquals(store.log, [
    { task_id: T_DEEP, delta: 50, progress_after: 50, note: '', source: 'AI app', day: '2026-10-03' },
  ])
  const again = await call('complete_task', { id: T_SUB1 })
  assertMatch(again.content[0].text, /already done/)
  await call('complete_task', { id: T_SUB1, done: false })
  assertEquals(store.log[1].delta, -50)
})

Deno.test('log_progress: makes a quick task deep, 100 finishes, refuses a task with subtasks', async () => {
  const { call, store } = setup()
  await call('log_progress', { id: T_REPORT, progress: 40, note: 'outline done' })
  let t = store.tasks.find((x) => x.id === T_REPORT)!
  assertEquals([t.kind, t.progress], ['deep', 40])
  assertEquals(store.log[0].note, 'outline done')
  await call('log_progress', { id: T_REPORT, progress: 100 })
  t = store.tasks.find((x) => x.id === T_REPORT)!
  assert(t.done_at)
  assertEquals(store.log[1].delta, 60)
  const parent = await call('log_progress', { id: T_DEEP, progress: 10 })
  assert(parent.isError)
})

Deno.test('delete_task: soft deletes the task and its subtasks, records the ids', async () => {
  const { call, store } = setup()
  const r = await call('delete_task', { id: T_DEEP })
  assertMatch(r.content[0].text, /Trash/)
  assertEquals(
    store.tasks
      .filter((t) => t.deleted)
      .map((t) => t.id)
      .sort(),
    [T_DEEP, T_SUB1, T_SUB2].sort(),
  )
  const gone = await call('get_task', { id: T_DEEP })
  assert(gone.isError)
})

Deno.test('add_project does not duplicate a name', async () => {
  const { call, store } = setup()
  await call('add_project', { name: 'Health' })
  await call('add_project', { name: 'health' })
  assertEquals(store.projects.length, 2)
})

Deno.test('a read only app gets a readable refusal, nothing changes', async () => {
  const { call, store } = setup()
  const r = await call('add_task', { title: 'Sneaky' }, READ_ONLY)
  assert(r.isError)
  assertMatch(r.content[0].text, /did not allow/)
  assertEquals(
    store.tasks.some((t) => t.title === 'Sneaky'),
    false,
  )
  const read = await call('get_today', {}, READ_ONLY)
  assertEquals(read.isError, undefined)
})

Deno.test('bad arguments are refused before anything runs', async () => {
  const { rpc, store } = setup()
  const body = await rpc('tools/call', { name: 'get_task', arguments: { id: 'not-an-id' } })
  assert(body.error || body.result?.isError, JSON.stringify(body))
  assertEquals(store.tasks.length, 6)
})

Deno.test('rate limit answers 429', async () => {
  const store = fresh()
  const app = createApp({
    publicUrl: 'https://x/functions/v1/mcp',
    authServer: 'https://x/auth/v1',
    verify: async () => ({ userId: 'u', clientId: 'c' }),
    repoFor: () => memoryRepo(store),
    rateLimit: 2,
  })
  const hit = () =>
    app.request('/mcp', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer t',
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' }),
    })
  assertEquals((await hit()).status, 200)
  assertEquals((await hit()).status, 200)
  assertEquals((await hit()).status, 429)
})

Deno.test("reached through Tovy's own site: metadata and the sign-in hint name that address", async () => {
  const { app } = setup()
  const viaSite = { 'x-mcp-public-url': 'https://tovy.example.app/mcp' }
  const res = await app.request('/mcp', { method: 'POST', headers: viaSite, body: '{}' })
  assertMatch(
    res.headers.get('WWW-Authenticate') ?? '',
    /resource_metadata="https:\/\/tovy\.example\.app\/mcp\/\.well-known\/oauth-protected-resource"/,
  )
  const meta = await (await app.request('/mcp/.well-known/oauth-protected-resource', { headers: viaSite })).json()
  assertEquals(meta.resource, 'https://tovy.example.app/mcp')
  // anything that is not an https address ending in /mcp is ignored
  const odd = await (
    await app.request('/mcp/.well-known/oauth-protected-resource', {
      headers: { 'x-mcp-public-url': 'javascript:alert(1)' },
    })
  ).json()
  assertEquals(odd.resource, 'https://ref.supabase.co/functions/v1/mcp')
})
