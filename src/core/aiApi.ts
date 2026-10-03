import { supabase } from './db/supabase'
import { isNotSetUp, type AiAccess, type AiAction } from './ai'
import type { Task } from './sync/tasks'

// The server calls behind Connected apps, Activity, Trash and the consent screen (spec mcp-server). Each answers
// `notSetUp` when the server side is not switched on yet (migration 0009 not applied, OAuth server off), so a screen
// can say so instead of failing.

export type Loaded<T> = { ok: true; data: T } | { ok: false; notSetUp: boolean; message: string }

const failed = <T>(error: { code?: string; message?: string; status?: number }): Loaded<T> => ({
  ok: false,
  notSetUp: isNotSetUp(error),
  message: error.message ?? 'Something went wrong',
})

export type ConsentRequest = {
  authorizationId: string
  clientId: string
  name: string
  uri: string
  redirectUri: string
  scope: string
  email: string
}

// What the AI app asks for. `redirect` means the person already approved this app: go straight back to it.
export async function loadConsent(
  authorizationId: string,
): Promise<Loaded<{ kind: 'ask'; request: ConsentRequest } | { kind: 'redirect'; url: string }>> {
  const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId)
  if (error || !data) return failed(error ?? { message: 'No answer from the server' })
  if ('redirect_url' in data && !('authorization_id' in data))
    return { ok: true, data: { kind: 'redirect', url: data.redirect_url } }
  const d = data as Extract<typeof data, { authorization_id: string }>
  return {
    ok: true,
    data: {
      kind: 'ask',
      request: {
        authorizationId: d.authorization_id,
        clientId: d.client.id,
        name: d.client.name,
        uri: d.client.uri,
        redirectUri: d.redirect_uri,
        scope: d.scope,
        email: d.user.email,
      },
    },
  }
}

// Approves the app with the access the person chose, then returns where to send the browser (back to the app).
export async function approveConsent(request: ConsentRequest, access: AiAccess): Promise<Loaded<string>> {
  // The choice is saved first, so the app's very first call already has the right access.
  const saved = await saveAccess(request.clientId, request.name, access)
  if (!saved.ok && !saved.notSetUp) return failed({ message: saved.message })
  const { data, error } = await supabase.auth.oauth.approveAuthorization(request.authorizationId, {
    skipBrowserRedirect: true,
  })
  if (error || !data) return failed(error ?? { message: 'No answer from the server' })
  return { ok: true, data: data.redirect_url }
}

export async function denyConsent(authorizationId: string): Promise<Loaded<string>> {
  const { data, error } = await supabase.auth.oauth.denyAuthorization(authorizationId, { skipBrowserRedirect: true })
  if (error || !data) return failed(error ?? { message: 'No answer from the server' })
  return { ok: true, data: data.redirect_url }
}

export async function saveAccess(clientId: string, name: string, access: AiAccess): Promise<Loaded<null>> {
  const { error } = await supabase
    .from('ai_clients')
    .upsert({ client_id: clientId, name: name.slice(0, 80), access, updated_at: new Date().toISOString() })
  return error ? failed(error) : { ok: true, data: null }
}

export type ConnectedApp = { clientId: string; name: string; uri: string; grantedAt: string; access: AiAccess }

// The apps the person approved (Supabase keeps the grants), with the access they gave each.
export async function loadConnectedApps(): Promise<Loaded<ConnectedApp[]>> {
  const { data: grants, error } = await supabase.auth.oauth.listGrants()
  if (error) return failed(error)
  const { data: rows } = await supabase.from('ai_clients').select('client_id,access')
  const access = new Map(
    ((rows ?? []) as { client_id: string; access: AiAccess }[]).map((r) => [r.client_id, r.access]),
  )
  return {
    ok: true,
    data: (grants ?? [])
      .map((g) => ({
        clientId: g.client.id,
        name: g.client.name,
        uri: g.client.uri,
        grantedAt: g.granted_at,
        access: access.get(g.client.id) ?? 'write',
      }))
      .sort((a, b) => b.grantedAt.localeCompare(a.grantedAt)),
  }
}

// Cuts the app off at once (row security stops its current token too), then removes the grant so it cannot refresh.
export async function disconnectApp(app: ConnectedApp): Promise<Loaded<null>> {
  const cut = await saveAccess(app.clientId, app.name, 'none')
  if (!cut.ok && !cut.notSetUp) return cut
  const { error } = await supabase.auth.oauth.revokeGrant({ clientId: app.clientId })
  return error ? failed(error) : { ok: true, data: null }
}

export async function loadActivity(limit = 100): Promise<Loaded<AiAction[]>> {
  const { data, error } = await supabase
    .from('ai_actions')
    .select('id,client_id,client_name,tool,task_id,project_id,summary,before,after,created_at,undone_at')
    .order('created_at', { ascending: false })
    .limit(limit)
  return error ? failed(error) : { ok: true, data: (data ?? []) as AiAction[] }
}

export async function markUndone(actionId: string): Promise<Loaded<string>> {
  const at = new Date().toISOString()
  const { error } = await supabase.from('ai_actions').update({ undone_at: at }).eq('id', actionId)
  return error ? failed(error) : { ok: true, data: at }
}

// Deleted tasks of the last 30 days. The tasks store drops a row once its delete is saved, so Trash asks the server.
export async function loadTrash(): Promise<Loaded<Task[]>> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('deleted', true)
    .gte('updated_at', since)
    .order('updated_at', { ascending: false })
    .limit(500)
  return error ? failed(error) : { ok: true, data: (data ?? []) as Task[] }
}

// Brings deleted tasks back. The store receives them through realtime, like any change from another device. A task
// whose parent is gone for good comes back at the top level.
export async function restoreTasks(ids: string[], detach: string[] = []): Promise<Loaded<null>> {
  if (detach.length) {
    const { error } = await supabase.from('tasks').update({ parent_id: null }).in('id', detach)
    if (error) return failed(error)
  }
  const { error } = await supabase.from('tasks').update({ deleted: false }).in('id', ids)
  return error ? failed(error) : { ok: true, data: null }
}

// Puts a project's name, colour or deleted flag back (Undo in Activity). Done on the server because a deleted project
// is no longer in the store; realtime brings the change back to every device.
export async function updateProject(
  id: string,
  fields: { name?: string; color?: string; deleted?: boolean },
): Promise<Loaded<null>> {
  const { error } = await supabase.from('projects').update(fields).eq('id', id)
  return error ? failed(error) : { ok: true, data: null }
}
