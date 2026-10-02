import { test, expect, type BrowserContext, type Page } from '@playwright/test'
import { createHash, randomUUID } from 'node:crypto'
import WebSocket from 'ws'
import { HttpsProxyAgent } from 'https-proxy-agent'

const SUPABASE_URL = process.env.SUPABASE_URL!
const ANON_KEY = process.env.SUPABASE_ANON_KEY!
const SYNC_BUDGET_MS = 2000
// supabase-js keeps the session in localStorage under this key.
const SESSION_KEY = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`

// Every device gets its own session (its own refresh token), like a real second device.
async function getSession(user: { email: string; password: string }) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'content-type': 'application/json' },
    body: JSON.stringify(user),
  })
  const body = await res.json()
  if (!res.ok || !body.access_token) throw new Error(`sign in for test failed: ${JSON.stringify(body)}`)
  return body
}

// Two browser contexts = two devices: each has its own IndexedDB and session.
// "Offline" blocks only the backend (HTTP and websocket) so the page itself still loads and reloads.
type Device = { context: BrowserContext; page: Page; setOffline: (v: boolean) => Promise<void> }

async function newDevice(
  browser: import('@playwright/test').Browser,
  user: { email: string; password: string } | null, // null: a device with nobody signed in
): Promise<Device> {
  const context = await browser.newContext()
  let offline = false
  const sockets: { close: () => void }[] = []
  // Resolves when Supabase confirms the realtime subscription. Until then a change made on another device can be missed.
  let realtimeJoined: () => void = () => {}
  const realtimeReady = new Promise<void>((resolve) => (realtimeJoined = resolve))
  // Requests are made from Node (route.fetch), not from Chromium: in the cloud sandbox Chromium cannot reach Supabase
  // (POSTs fail with ERR_TOO_MANY_RETRIES) while Node can.
  await context.route(/supabase\.co/, async (route) => {
    if (offline) return route.abort('internetdisconnected')
    try {
      await route.fulfill({ response: await route.fetch() })
    } catch {
      await route.abort('connectionfailed')
    }
  })
  // Playwright's own connectToServer() ignores the sandbox proxy, so the page <-> Supabase socket is bridged by hand.
  const agent = process.env.HTTPS_PROXY ? new HttpsProxyAgent(process.env.HTTPS_PROXY) : undefined
  await context.routeWebSocket(/supabase\.co/, (ws) => {
    if (offline) return ws.close()
    const server = new WebSocket(ws.url(), { agent })
    const pending: (string | Buffer)[] = []
    ws.onMessage((m) => (server.readyState === WebSocket.OPEN ? server.send(m) : pending.push(m)))
    server.on('open', () => pending.splice(0).forEach((m) => server.send(m)))
    server.on('message', (m: any, isBinary: boolean) => {
      if (!isBinary && m.toString().includes('Subscribed to PostgreSQL')) realtimeJoined()
      ws.send(isBinary ? m : m.toString())
    })
    server.on('close', () => ws.close())
    server.on('error', () => ws.close())
    ws.onClose(() => server.close())
    sockets.push({
      close: () => {
        ws.close()
        server.close()
      },
    })
  })
  // Start the device signed in: write the session before the app loads, once per tab (reloads keep the app's own copy).
  if (user) {
    const session = await getSession(user)
    await context.addInitScript(
      ([key, value]) => {
        if (!sessionStorage.getItem('e2e-session-seeded')) {
          localStorage.setItem(key, value)
          sessionStorage.setItem('e2e-session-seeded', '1')
        }
      },
      [SESSION_KEY, JSON.stringify(session)],
    )
  }
  const page = await context.newPage()
  await page.goto('/')
  if (user) {
    await expect(page.locator('html')).toHaveAttribute('data-sync', 'synced', { timeout: 15_000 })
    await Promise.race([
      realtimeReady,
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error('realtime never confirmed its subscription')), 15_000),
      ),
    ])
  }
  return {
    context,
    page,
    setOffline: async (v) => {
      offline = v
      if (v) while (sockets.length) sockets.pop()!.close() // cut sockets that are already open
    },
  }
}

// Every test user made by this run, deleted again in afterAll so the Supabase project is left clean.
const createdUserIds: string[] = []

// `username` and `id` belong to the profile that is created with the user, so the app skips the setup step for them.
type TestUser = { email: string; password: string; id: string; username: string }

async function createUser(): Promise<TestUser> {
  const email = `spike-${Date.now()}-${Math.floor(Math.random() * 1e6)}@gmail.com`
  const password = 'spike-password-123'
  const adminKey = process.env.SUPABASE_API_KEY
  // Prefer the admin API: it skips email confirmation and the email domain check.
  const res = adminKey
    ? await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers: { apikey: adminKey, 'content-type': 'application/json' },
        body: JSON.stringify({ email, password, email_confirm: true }),
      })
    : await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
        method: 'POST',
        headers: { apikey: ANON_KEY, 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
  const body: any = await res.json()
  if (!res.ok || !(body.access_token || body.id)) {
    throw new Error(
      `user creation failed (without SUPABASE_API_KEY, turn off "Confirm email" in Supabase Auth): ${JSON.stringify(body)}`,
    )
  }
  const id: string = body.id ?? body.user?.id
  if (body.id) createdUserIds.push(body.id)
  const username = `spk${Math.random().toString(36).slice(2, 10)}`
  const made = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: 'POST',
    headers: {
      apikey: adminKey ?? ANON_KEY,
      authorization: `Bearer ${adminKey ?? ANON_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ id, first_name: 'Test', last_name: 'User', username }),
  })
  if (!made.ok) throw new Error(`profile creation failed: ${await made.text()}`)
  return { email, password, id, username }
}

// Note titles the server returns for a signed-in user's token.
async function serverTitlesOf(accessToken: string): Promise<string[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/tasks?select=title&deleted=eq.false`, {
    headers: { apikey: ANON_KEY, authorization: `Bearer ${accessToken}` },
  })
  return ((await res.json()) as { title: string }[]).map((n) => n.title)
}

// What the server holds for a user, read directly (not through the app).
async function serverTitles(u: { email: string; password: string }): Promise<string[]> {
  const login = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'content-type': 'application/json' },
    body: JSON.stringify(u),
  })
  const { access_token } = await login.json()
  return serverTitlesOf(access_token)
}

// Reads and writes the person's own rows straight on the server (what a connected app's proposal looks like to them).
async function asUser(u: { email: string; password: string }) {
  const login = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'content-type': 'application/json' },
    body: JSON.stringify(u),
  })
  const { access_token } = await login.json()
  const headers = { apikey: ANON_KEY, authorization: `Bearer ${access_token}`, 'content-type': 'application/json' }
  return {
    get: async (path: string) => (await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers })).json() as Promise<any[]>,
    post: async (table: string, rows: object[]) => {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(rows),
      })
      if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`)
    },
  }
}

// Live tasks (title and project) and live project names the server holds for a user, read directly.
async function serverRows(u: { email: string; password: string }) {
  const login = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'content-type': 'application/json' },
    body: JSON.stringify(u),
  })
  const { access_token } = await login.json()
  const get = async (path: string) =>
    (
      await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        headers: { apikey: ANON_KEY, authorization: `Bearer ${access_token}` },
      })
    ).json()
  return {
    tasks: (await get('tasks?select=title,project_id&deleted=eq.false')) as {
      title: string
      project_id: string | null
    }[],
    projects: (await get('projects?select=id,name&deleted=eq.false')) as { id: string; name: string }[],
  }
}

// The 6 digit code Supabase would email, read through the admin API (no inbox). For an address with no account this
// creates one, exactly as asking for a code from the screen does. The test mocks the screen's request to send the email
// (see `mockSendingMail`), so no real email goes out and the code is the only one in play.
async function emailCodeFor(email: string): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: { apikey: process.env.SUPABASE_API_KEY!, 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'magiclink', email }),
  })
  const body: any = await res.json()
  if (!res.ok || !body.email_otp) throw new Error(`could not get a code: ${JSON.stringify(body)}`)
  if (body.id && !createdUserIds.includes(body.id)) createdUserIds.push(body.id)
  return body.email_otp
}

// Answers the screen's "email me a code" request without sending anything, so tests never email real addresses.
async function mockSendingMail(p: Page, response: { status: number; body: object } = { status: 200, body: {} }) {
  await p.route(/\/auth\/v1\/otp/, (route) =>
    route.fulfill({ status: response.status, contentType: 'application/json', body: JSON.stringify(response.body) }),
  )
}

// Signs in through the sign-in screen with an emailed code (used after a sign out, when the seeded session is gone).
async function signInThroughScreen(p: Page, u: { email: string }) {
  await mockSendingMail(p)
  await p.getByTestId('email').fill(u.email)
  await p.getByTestId('send-code').click()
  await expect(p.getByTestId('code')).toBeVisible()
  await p.getByTestId('code').fill(await emailCodeFor(u.email))
  await expect(p.locator('html')).toHaveAttribute('data-sync', 'synced', { timeout: 15_000 })
}

const titles = (p: Page) =>
  p
    .locator('[data-testid="task"]:visible')
    .locator('[data-testid^="title-"]')
    .evaluateAll((els) => els.map((e) => (e.textContent ?? '').trim()).sort())
const addNote = async (p: Page, title: string) => {
  await p.getByTestId('new-title').fill(title)
  await p.getByTestId('new-title').press('Enter')
}
// Deletes the task with this title through its right-click menu.
const deleteTask = async (p: Page, title: string) => {
  await p
    .locator('[data-testid="task"]:visible')
    .filter({ hasText: title })
    .locator('[data-testid^="open-"]')
    .click({ button: 'right' })
  await p.getByTestId('menu-delete').click()
}
// Opens the task with this title (its detail opens beside the list) and changes its title.
async function openTask(p: Page, title: string) {
  await p.locator('[data-testid="task"]:visible').filter({ hasText: title }).locator('[data-testid^="open-"]').click()
  await expect(p.getByTestId('detail-title')).toHaveValue(title)
}
async function renameTask(p: Page, from: string, to: string) {
  await openTask(p, from)
  await p.getByTestId('detail-title').fill(to)
}
// In the open task: make it a deep task, then add a subtask.
async function addSubtask(p: Page, title: string) {
  if ((await p.getByTestId('sub-title').count()) === 0) await p.getByTestId('detail-track').click()
  await p.getByTestId('sub-title').fill(title)
  await p.getByTestId('sub-add').click()
  await expect(p.getByTestId('subtask').filter({ hasText: title })).toBeVisible()
}
// A tap that lands while the screen re-renders after an edit can be lost, so tap again until the Profile screen is up.
async function openProfile(p: Page) {
  await expect(async () => {
    await p.getByTestId('tab-profile').click({ timeout: 2_000 })
    await expect(p.getByTestId('sign-out')).toBeVisible({ timeout: 2_000 })
  }).toPass({ timeout: 15_000 })
}
async function waitSynced(d: Device) {
  await expect(d.page.locator('html')).toHaveAttribute('data-sync', 'synced', { timeout: 15_000 })
}
async function expectTitles(p: Page, expected: string[], timeout = SYNC_BUDGET_MS) {
  // poll every 50 ms so the measured sync time is not rounded up to the default back-off steps
  await expect.poll(() => titles(p), { timeout, intervals: [50] }).toEqual([...expected].sort())
}

test.describe('sync spike', () => {
  let user: TestUser
  test.afterAll(async () => {
    const adminKey = process.env.SUPABASE_API_KEY
    if (!adminKey) return
    // Their tasks and projects go with them (both tables delete with their user).
    await Promise.all(
      createdUserIds
        .splice(0)
        .map((id) =>
          fetch(`${SUPABASE_URL}/auth/v1/admin/users/${id}`, { method: 'DELETE', headers: { apikey: adminKey } }),
        ),
    )
  })

  test.beforeAll(async () => {
    user = await createUser()
  })

  test('2: offline edits show instantly and reach the other device within 2 s of reconnect', async ({ browser }) => {
    const a = await newDevice(browser, user)
    const b = await newDevice(browser, user)
    await addNote(a.page, 'base-2')
    await waitSynced(a)
    await expectTitles(b.page, ['base-2'], 10_000)

    await a.setOffline(true)
    await addNote(a.page, 'offline-add-2')
    await renameTask(a.page, 'base-2', 'offline-edit-2')
    await expectTitles(a.page, ['offline-add-2', 'offline-edit-2'], 300) // instant on A
    await expectTitles(b.page, ['base-2'], 500) // B has not seen it yet

    await a.setOffline(false)
    const t0 = Date.now()
    await a.page.reload() // reconnect: app restarts its sync
    await expectTitles(b.page, ['offline-add-2', 'offline-edit-2'])
    console.log(`criterion 2 sync time after reconnect: ${Date.now() - t0} ms (includes page reload)`)
  })

  test('3: edits to different tasks made offline on both devices both survive', async ({ browser }) => {
    const a = await newDevice(browser, user)
    const b = await newDevice(browser, user)
    await addNote(a.page, 'x3')
    await addNote(a.page, 'y3')
    await waitSynced(a)
    await expect.poll(() => titles(b.page), { timeout: 10_000 }).toEqual(expect.arrayContaining(['x3', 'y3']))

    await a.setOffline(true)
    await b.setOffline(true)
    await renameTask(a.page, 'x3', 'x3-from-a')
    await renameTask(b.page, 'y3', 'y3-from-b')
    await a.setOffline(false)
    await b.setOffline(false)
    await a.page.reload()
    await b.page.reload()
    for (const p of [a.page, b.page]) {
      await expect
        .poll(() => titles(p), { timeout: 10_000 })
        .toEqual(expect.arrayContaining(['x3-from-a', 'y3-from-b']))
    }
  })

  test('4: the same task edited offline on both devices ends identical', async ({ browser }) => {
    const a = await newDevice(browser, user)
    const b = await newDevice(browser, user)
    await addNote(a.page, 'shared-4')
    await waitSynced(a)
    await expect.poll(() => titles(b.page), { timeout: 10_000 }).toContain('shared-4')

    await a.setOffline(true)
    await b.setOffline(true)
    await renameTask(a.page, 'shared-4', 'shared-4-A')
    await renameTask(b.page, 'shared-4', 'shared-4-B')
    await a.setOffline(false)
    await b.setOffline(false)
    await a.page.reload()
    await b.page.reload()
    await expect
      .poll(
        async () => {
          const [ta, tb] = [await titles(a.page), await titles(b.page)]
          const t4 = (t: string[]) => t.filter((x) => x.startsWith('shared-4')).join('|')
          return t4(ta) === t4(tb) && t4(ta).length > 0
        },
        { timeout: 15_000 },
      )
      .toBe(true)
  })

  test('5: soft delete reaches other devices, including one that was offline', async ({ browser }) => {
    const a = await newDevice(browser, user)
    const b = await newDevice(browser, user)
    await addNote(a.page, 'doomed-5')
    await waitSynced(a)
    await expect.poll(() => titles(b.page), { timeout: 10_000 }).toContain('doomed-5')

    await b.setOffline(true)
    await deleteTask(a.page, 'doomed-5')
    await waitSynced(a)
    expect(await titles(a.page)).not.toContain('doomed-5')
    expect(await titles(b.page)).toContain('doomed-5') // B was offline, still shows it

    await b.setOffline(false)
    await b.page.reload()
    await expect.poll(() => titles(b.page), { timeout: 10_000 }).not.toContain('doomed-5')
  })

  test('t1: a deleted task can be brought back for 5 seconds, then the Undo goes away', async ({ browser }) => {
    const a = await newDevice(browser, user)
    await addNote(a.page, 'undo-me')
    await addNote(a.page, 'let-go')
    await deleteTask(a.page, 'undo-me')
    expect(await titles(a.page)).not.toContain('undo-me')
    await expect(a.page.getByTestId('toast')).toContainText('Task deleted')
    await a.page.getByTestId('toast-undo').click()
    await expect.poll(() => titles(a.page)).toContain('undo-me')
    await expect(a.page.getByTestId('toast')).toHaveCount(0)

    await deleteTask(a.page, 'let-go')
    await expect(a.page.getByTestId('toast-undo')).toBeVisible()
    await expect(a.page.getByTestId('toast')).toHaveCount(0, { timeout: 8_000 }) // gone after about 5 seconds
    expect(await titles(a.page)).not.toContain('let-go')
    await expect.poll(() => serverTitles(user), { timeout: 15_000 }).toEqual(expect.arrayContaining(['undo-me']))
    expect(await serverTitles(user)).not.toContain('let-go')
  })

  test('t2: subtasks nest and roll up, delete and Undo cover every level', async ({ browser }) => {
    const a = await newDevice(browser, user)
    const underT2 = async () => (await serverTitles(user)).filter((t) => t.endsWith('-t2')).sort()
    await addNote(a.page, 'parent-t2')
    await openTask(a.page, 'parent-t2')
    await addSubtask(a.page, 'child-t2')
    await a.page.getByTestId(/^sub-open-/).click() // the subtask opens in the same panel
    await expect(a.page.getByTestId('detail-title')).toHaveValue('child-t2')
    await addSubtask(a.page, 'grand-t2')
    await expect.poll(underT2, { timeout: 15_000 }).toEqual(['child-t2', 'grand-t2', 'parent-t2'])

    // finishing the deepest task finishes the ones above it, because their progress follows their subtasks
    await a.page.getByTestId(/^sub-done-/).click()
    await a.page.getByTestId('detail-back').click() // back to the parent
    await expect(a.page.getByTestId('detail-title')).toHaveValue('parent-t2')
    await expect(a.page.getByTestId('detail-percent')).toHaveText('100%')
    await expect(a.page.getByTestId('follows-subtasks')).toContainText('Progress follows subtasks')

    // delete the top task: all three levels go, and one Undo brings all three back
    await a.page.getByTestId('detail-delete').click()
    await expect(a.page.getByTestId('toast')).toContainText('3 tasks deleted')
    await a.page.getByTestId('toast-undo').click()
    await expect.poll(() => titles(a.page)).toContain('parent-t2')
    await expect.poll(underT2, { timeout: 15_000 }).toEqual(['child-t2', 'grand-t2', 'parent-t2'])

    // delete again and let the Undo expire: all three stay deleted on the server
    await deleteTask(a.page, 'parent-t2')
    await expect(a.page.getByTestId('toast')).toHaveCount(0, { timeout: 12_000 })
    await expect.poll(underT2, { timeout: 15_000 }).toEqual([])
  })

  test('t3: a task and its subtask added offline both reach the server after reconnect', async ({ browser }) => {
    const a = await newDevice(browser, user)
    await a.setOffline(true)
    await addNote(a.page, 'parent-t3')
    await openTask(a.page, 'parent-t3')
    await addSubtask(a.page, 'child-t3')
    await a.setOffline(false)
    await a.page.reload()
    await expect
      .poll(async () => (await serverTitles(user)).filter((t) => t.endsWith('-t3')).sort(), { timeout: 20_000 })
      .toEqual(['child-t3', 'parent-t3'])
  })

  test('d1: progress is logged, points follow, and the task detail keeps a log', async ({ browser }) => {
    const u = await createUser()
    const api = await asUser(u)
    const a = await newDevice(browser, u)
    await addNote(a.page, 'progress-d1')
    await openTask(a.page, 'progress-d1')
    await expect(a.page.getByText('A quick task is done or not done')).toBeVisible()
    await a.page.getByTestId('detail-track').click() // quick -> deep
    await expect(a.page.getByTestId('log-empty')).toBeVisible()
    await a.page.getByTestId('log-note').fill('Outline written')
    await a.page.getByTestId('step-25').click()
    await expect(a.page.getByTestId('detail-percent')).toHaveText('25%')
    await a.page.getByTestId('step-10').click()
    await expect(a.page.getByTestId('detail-percent')).toHaveText('35%')
    const entries = a.page.getByTestId('log-entry')
    await expect(entries).toHaveCount(2)
    await expect(entries.first()).toContainText('+15 pts') // 10% is 15 points, newest first
    await expect(entries.last()).toContainText('Outline written')
    await expect(entries.last()).toContainText('+38 pts') // 25% is 37.5, shown rounded
    // the list row shows the percentage too
    await a.page.getByTestId('detail-close').click()
    await expect(a.page.locator('[data-testid="task"]:visible').filter({ hasText: 'progress-d1' })).toContainText('35%')
    // server side: progress and two log entries
    await expect
      .poll(async () => (await api.get('tasks?select=progress,kind'))[0], { timeout: 15_000 })
      .toEqual({
        progress: 35,
        kind: 'deep',
      })
    await expect
      .poll(async () => (await api.get('progress_log?select=delta,progress_after&order=created_at')).length, {
        timeout: 15_000,
      })
      .toBe(2)
    expect((await api.get('progress_log?select=delta&order=created_at')).map((e) => e.delta)).toEqual([25, 10])
    // finishing finishes the rest: 65 more percent
    await openTask(a.page, 'progress-d1')
    await a.page.getByTestId('detail-done').click()
    await expect(a.page.getByTestId('log-entry').first()).toContainText('+98 pts') // 65% is 97.5
    await expect
      .poll(async () => (await api.get('tasks?select=progress'))[0], { timeout: 15_000 })
      .toEqual({ progress: 100 })
  })

  test('t4: a project holds its tasks, and deleting it keeps them under No project (Undo brings it back)', async ({
    browser,
  }) => {
    const me = await createUser() // a fresh person, so the list starts empty
    const a = await newDevice(browser, me)
    await a.page.getByTestId('tab-projects').click()
    await expect(a.page.getByText('No projects yet')).toBeVisible() // nothing yet
    await a.page.getByTestId('new-project').click()
    await a.page.getByTestId('project-name').fill('proj-t4')
    await a.page.getByTestId('swatch-teal').click()
    await a.page.getByTestId('project-save').click()
    const card = a.page.getByTestId(/^project-[0-9a-f-]{36}$/).filter({ hasText: 'proj-t4' })
    await expect(card).toContainText('No tasks yet')
    const projectId = ((await card.getAttribute('data-testid')) ?? '').replace('project-', '')

    // add a task from inside the project: it lands in that project
    await card.click()
    await a.page.getByTestId('project-empty-add').click()
    await a.page.getByTestId('quick-add-title').fill('moved-t4')
    await a.page.getByTestId('quick-add-submit').click()
    await expect(a.page.locator('[data-testid="task"]:visible').filter({ hasText: 'moved-t4' })).toBeVisible()
    await expect
      .poll(async () => (await serverRows(me)).tasks.find((t) => t.title === 'moved-t4')?.project_id, {
        timeout: 15_000,
      })
      .toBe(projectId)

    // the card now counts it
    await a.page.getByTestId('back').click()
    await expect(a.page.getByTestId(`project-${projectId}`)).toContainText('1 task · 0% done')

    // deleting the project keeps the task, now under "No project"
    await a.page.getByTestId(`project-${projectId}`).click()
    await a.page.getByTestId('project-edit').click()
    await a.page.getByTestId('project-delete').click()
    await expect(a.page.getByTestId('toast')).toContainText('Project deleted')
    await expect(a.page.getByTestId(`project-${projectId}`)).toHaveCount(0)
    await expect(a.page.getByTestId('project-none')).toContainText('1 task')
    await expect
      .poll(async () => (await serverRows(me)).tasks.find((t) => t.title === 'moved-t4')?.project_id, {
        timeout: 15_000,
      })
      .toBeNull()

    // Undo puts the project back with its task
    await a.page.getByTestId('toast-undo').click()
    await expect(a.page.getByTestId(`project-${projectId}`)).toContainText('1 task')
    await expect
      .poll(async () => (await serverRows(me)).tasks.find((t) => t.title === 'moved-t4')?.project_id, {
        timeout: 15_000,
      })
      .toBe(projectId)
  })

  test('p3: a person edits their name and username, and picks a theme that stays after a reload', async ({
    browser,
  }) => {
    const me = await createUser()
    const other = await createUser()
    const api = await asUser(me)
    const a = await newDevice(browser, me)
    await openProfile(a.page)
    await expect(a.page.getByTestId('profile-email')).toHaveText(me.email)

    await a.page.getByTestId('edit-profile').click()
    await a.page.getByTestId('edit-first-name').fill('Renamed')
    // a username somebody else has is refused, with the reason next to the field
    await a.page.getByTestId('edit-username').fill(other.username)
    await expect(a.page.getByTestId('edit-username-hint')).toHaveText('That username is taken. Try another.')
    await a.page.getByTestId('save-profile-edit').click()
    await expect(a.page.getByTestId('edit-username-hint')).toHaveText('That username is taken. Try another.')
    const fresh = `me${Math.random().toString(36).slice(2, 9)}`
    await a.page.getByTestId('edit-username').fill(fresh)
    await expect(a.page.getByTestId('edit-username-hint')).toHaveText('That username is free.')
    await a.page.getByTestId('save-profile-edit').click()
    await expect(a.page.getByTestId('toast')).toContainText('Profile saved')
    await expect(a.page.getByTestId('profile-name')).toContainText('Renamed')
    await expect(a.page.getByTestId('edit-profile')).toContainText(`@${fresh}`)
    expect(await api.get('profiles?select=first_name,username')).toEqual([{ first_name: 'Renamed', username: fresh }])

    // appearance: dark stays after a reload
    await a.page.getByTestId('appearance').click()
    await a.page.getByTestId('segment-dark').click()
    const background = () => a.page.evaluate(() => getComputedStyle(document.body).backgroundColor)
    await expect.poll(background).toBe('rgb(11, 11, 17)')
    await a.page.reload()
    await expect.poll(background).toBe('rgb(11, 11, 17)')
  })

  test('i1: proposals from AI apps wait in the Inbox until approved, rejected or approved all', async ({ browser }) => {
    const u = await createUser()
    const api = await asUser(u)
    const a = await newDevice(browser, u)
    await addNote(a.page, 'inbox-target')
    await expect.poll(async () => (await api.get('tasks?select=id,title')).length, { timeout: 15_000 }).toBe(1)
    const [target] = await api.get('tasks?select=id')
    await api.post('proposals', [
      {
        app_name: 'Claude',
        kind: 'add_task',
        title: 'Add task: Prepare sprint review',
        task_id: null,
        before: {},
        after: { title: 'Prepare sprint review' },
      },
      {
        app_name: 'Claude',
        kind: 'update_progress',
        title: 'inbox-target to 60%',
        task_id: target.id,
        before: { progress: 0 },
        after: { progress: 60 },
      },
      {
        app_name: 'ChatGPT',
        kind: 'reschedule',
        title: 'Move inbox-target to Friday',
        task_id: target.id,
        before: {},
        after: { due_date: '2030-01-04' },
      },
    ])

    // the badge counts what is waiting, wherever you are
    await expect(a.page.getByTestId('inbox-badge').first()).toHaveText('3', { timeout: 15_000 })
    await a.page.getByTestId('tab-inbox').click()
    await expect(a.page.getByText('3 waiting for your approval')).toBeVisible()
    await expect(a.page.getByTestId('group-Claude')).toBeVisible()
    await expect(a.page.getByTestId('group-ChatGPT')).toBeVisible()

    // the detail sheet shows before and after, and approving applies the change
    await a.page.locator('[data-testid^="open-proposal-"]').filter({ hasText: 'to 60%' }).click()
    await expect(a.page.getByTestId('change-before')).toHaveText('0%')
    await expect(a.page.getByTestId('change-after')).toHaveText('60%')
    await a.page.getByTestId('sheet-approve').click()
    await expect(a.page.getByTestId('toast')).toContainText('Approved')
    await expect(a.page.getByTestId('inbox-badge').first()).toHaveText('2')
    await expect
      .poll(async () => (await api.get('tasks?select=progress,kind'))[0], { timeout: 15_000 })
      .toEqual({
        progress: 60,
        kind: 'deep',
      })

    // reject has an Undo
    await a.page.locator('[data-testid^="reject-"]').last().click()
    await expect(a.page.getByTestId('toast')).toContainText('Rejected')
    await expect(a.page.getByText('1 waiting for your approval')).toBeVisible()
    await a.page.getByTestId('toast-undo').click()
    await expect(a.page.getByText('2 waiting for your approval')).toBeVisible()

    // approve all applies the rest
    await a.page.getByTestId('approve-all').click()
    await expect(a.page.getByText('You are all caught up')).toBeVisible()
    await expect(a.page.getByTestId('inbox-badge')).toHaveCount(0)
    await expect
      .poll(async () => (await api.get('proposals?select=status')).map((p) => p.status), { timeout: 15_000 })
      .toEqual(['approved', 'approved', 'approved'])
    const tasks = await api.get('tasks?select=title,due_date')
    expect(tasks.map((t) => t.title).sort()).toEqual(['Prepare sprint review', 'inbox-target'])
    expect(tasks.find((t) => t.title === 'inbox-target')?.due_date).toBe('2030-01-04')
  })

  test('c1: a user signs in with an emailed code and stays signed in after a reload', async ({ browser }) => {
    const d = await newDevice(browser, null)
    await expect(d.page.getByTestId('password')).toHaveCount(0) // no password field
    await expect(d.page.getByTestId('google-sign-in')).toBeVisible() // Google is the other way in
    await signInThroughScreen(d.page, user)
    await d.page.reload()
    await expect(d.page.locator('html')).toHaveAttribute('data-sync', 'synced', { timeout: 15_000 })
    await expect(d.page.getByTestId('email')).toHaveCount(0) // still signed in after a reload
  })

  test('c2: an email with no account gets one, then fills in the profile step (register)', async ({ browser }) => {
    const fresh = { email: `spike-new-${Date.now()}-${Math.floor(Math.random() * 1e6)}@gmail.com` }
    const d = await newDevice(browser, null)
    const p = d.page
    await mockSendingMail(p)
    await p.getByTestId('email').fill(fresh.email)
    await p.getByTestId('send-code').click()
    await p.getByTestId('code').fill(await emailCodeFor(fresh.email))

    // signed in, but nothing yet: the setup step comes before the task list
    await expect(p.getByTestId('first-name')).toBeVisible({ timeout: 15_000 })
    await expect(p.locator('html')).not.toHaveAttribute('data-sync', /./)
    await expect(p.getByTestId('save-profile')).toBeVisible()

    // nothing filled in: every field says what is missing
    await p.getByTestId('save-profile').click()
    await expect(p.getByText('Enter your first name.')).toBeVisible()
    await expect(p.getByText('Enter your last name.')).toBeVisible()

    // a bad username is refused on the screen
    await p.getByTestId('first-name').fill('  Ada ')
    await p.getByTestId('last-name').fill('Lovelace')
    await p.getByTestId('username').fill('No')
    await p.getByTestId('save-profile').click()
    await expect(p.getByTestId('username-hint')).toContainText('3 to 20 characters')

    // a username that is taken says so, and the person stays on the step
    await p.getByTestId('username').fill(user.username)
    await expect(p.getByTestId('username-hint')).toContainText('taken')
    await p.getByTestId('save-profile').click()
    await expect(p.getByTestId('username-hint')).toContainText('taken')
    await expect(p.getByTestId('first-name')).toBeVisible()

    // a free one (typed in capitals, kept lowercase) lets the person in
    const mine = `new${Math.random().toString(36).slice(2, 9)}`
    await p.getByTestId('username').fill(mine.toUpperCase())
    await expect(p.getByTestId('username-hint')).toContainText('free')
    await p.getByTestId('save-profile').click()
    await expect(p.locator('html')).toHaveAttribute('data-sync', 'synced', { timeout: 15_000 })

    // the server holds the trimmed profile, and a reload goes straight to the tasks
    const login = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
      method: 'POST',
      headers: { apikey: process.env.SUPABASE_API_KEY!, 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'magiclink', email: fresh.email }),
    })
    const { id } = (await login.json()) as { id: string }
    const rows = await (
      await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${id}&select=first_name,last_name,username`, {
        headers: { apikey: process.env.SUPABASE_API_KEY!, authorization: `Bearer ${process.env.SUPABASE_API_KEY!}` },
      })
    ).json()
    expect(rows).toEqual([{ first_name: 'Ada', last_name: 'Lovelace', username: mine }])
    await p.reload()
    await expect(p.locator('html')).toHaveAttribute('data-sync', 'synced', { timeout: 15_000 })
    await expect(p.getByTestId('first-name')).toHaveCount(0)
  })

  test('c3: a wrong code shows an error and does not sign in', async ({ browser }) => {
    const d = await newDevice(browser, null)
    await mockSendingMail(d.page)
    await d.page.getByTestId('email').fill(user.email)
    await d.page.getByTestId('send-code').click()
    await emailCodeFor(user.email) // a real code exists, the one typed below is not it
    await d.page.getByTestId('code').fill('000000')
    await expect(d.page.getByTestId('auth-error')).toContainText('wrong or expired')
    await expect(d.page.getByTestId('code')).toBeVisible() // still on the code step
    await expect(d.page.locator('html')).not.toHaveAttribute('data-sync', /./) // not signed in
    // typing again clears the message, and a code that is not 6 digits is not sent
    await d.page.getByTestId('code').fill('123')
    await expect(d.page.getByTestId('auth-error')).toHaveCount(0)
  })

  test('c4: when too many codes were asked for, the screen says so and waits', async ({ browser }) => {
    const d = await newDevice(browser, null)
    await mockSendingMail(d.page, {
      status: 429,
      body: {
        code: 429,
        error_code: 'over_email_send_rate_limit',
        msg: 'For security purposes, you can only request this after 42 seconds.',
      },
    })
    await d.page.getByTestId('email').fill(user.email)
    await d.page.getByTestId('send-code').click()
    await expect(d.page.getByTestId('auth-error')).toContainText('Too many codes')
    await expect(d.page.getByTestId('send-code')).toContainText('Wait') // cannot ask again at once
    await expect(d.page.getByTestId('code')).toHaveCount(0) // no code step, nothing was sent
  })

  test('p1: a returning user with a saved profile gets in while offline', async ({ browser }) => {
    const a = await newDevice(browser, user) // loading the profile also saves a copy on the device
    await a.setOffline(true)
    await a.page.reload()
    await expect(a.page.locator('html')).toHaveAttribute('data-sync', /./, { timeout: 15_000 }) // the task list, not a setup or error step
    await expect(a.page.getByTestId('profile-unavailable')).toHaveCount(0)
    await expect(a.page.getByTestId('first-name')).toHaveCount(0)
  })

  test('p2: with no saved copy and no connection, the user is asked to connect, then gets in', async ({ browser }) => {
    const a = await newDevice(browser, user)
    await a.page.evaluate((key) => localStorage.removeItem(key), `tovy-profile-${user.id}`)
    await a.setOffline(true)
    await a.page.reload()
    await expect(a.page.getByTestId('profile-unavailable')).toBeVisible({ timeout: 15_000 })
    await expect(a.page.locator('html')).not.toHaveAttribute('data-sync', /./)
    await a.setOffline(false)
    await a.page.getByTestId('profile-retry').click()
    await expect(a.page.locator('html')).toHaveAttribute('data-sync', 'synced', { timeout: 15_000 })
  })

  test('6: unsynced changes survive an app restart and sync later', async ({ browser }) => {
    const a = await newDevice(browser, user)
    const b = await newDevice(browser, user)
    await a.setOffline(true)
    await addNote(a.page, 'survivor-6')
    await a.page.reload() // restart while still offline
    await expect.poll(() => titles(a.page), { timeout: 10_000 }).toContain('survivor-6')
    expect(await titles(b.page)).not.toContain('survivor-6')

    await a.setOffline(false)
    await a.page.reload()
    await expect.poll(() => titles(b.page), { timeout: 15_000 }).toContain('survivor-6')
  })

  test('8: local writes render in under 100 ms', async ({ browser }) => {
    const a = await newDevice(browser, user)
    await a.setOffline(true)
    for (let i = 0; i < 10; i++) await addNote(a.page, `perf-${i}`)
    // each sample is pushed on the next animation frame, so wait for the last one
    await expect.poll(() => a.page.evaluate(() => (globalThis as any).__perf.length)).toBeGreaterThanOrEqual(10)
    const perf: number[] = await a.page.evaluate(() => (globalThis as any).__perf)
    const worst = Math.max(...perf)
    console.log(`criterion 8: ${perf.length} local writes, worst ${worst.toFixed(1)} ms`)
    expect(perf.length).toBeGreaterThanOrEqual(10)
    expect(worst).toBeLessThan(100)
  })

  test("7: a second user cannot read or change the first user's tasks and projects, or link to them", async () => {
    const token = async (u: { email: string; password: string }) => {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { apikey: ANON_KEY, 'content-type': 'application/json' },
        body: JSON.stringify(u),
      })
      const body: any = await res.json()
      return { jwt: body.access_token as string, id: body.user.id as string }
    }
    const rest = (jwt: string, path: string, init: RequestInit = {}) =>
      fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        ...init,
        headers: {
          apikey: ANON_KEY,
          authorization: `Bearer ${jwt}`,
          'content-type': 'application/json',
          prefer: 'return=representation',
          ...init.headers,
        },
      })
    const owner = await token(user)
    const other = await token(await createUser())
    const taskId = crypto.randomUUID()
    const projectId = crypto.randomUUID()
    const parentId = crypto.randomUUID()
    const post = (jwt: string, table: string, row: object) =>
      rest(jwt, table, { method: 'POST', body: JSON.stringify(row) })
    expect((await post(owner.jwt, 'projects', { id: projectId, name: 'private-project-7' })).status).toBe(201)
    expect((await post(owner.jwt, 'tasks', { id: parentId, title: 'private-parent-7', kind: 'deep' })).status).toBe(201)
    expect((await post(owner.jwt, 'tasks', { id: taskId, title: 'private-7' })).status).toBe(201)

    // cannot read
    expect(await (await rest(other.jwt, `tasks?id=eq.${taskId}`)).json()).toEqual([])
    expect(await (await rest(other.jwt, `projects?id=eq.${projectId}`)).json()).toEqual([])
    // cannot change
    for (const [table, id, body] of [
      ['tasks', taskId, { title: 'hacked' }],
      ['projects', projectId, { name: 'hacked' }],
    ] as const) {
      const patched = await rest(other.jwt, `${table}?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(body) })
      expect(await patched.json()).toEqual([])
    }
    // cannot write rows as the owner
    expect(
      (await post(other.jwt, 'tasks', { id: crypto.randomUUID(), user_id: owner.id, title: 'spoof' })).status,
    ).toBe(403)
    expect(
      (await post(other.jwt, 'projects', { id: crypto.randomUUID(), user_id: owner.id, name: 'spoof' })).status,
    ).toBe(403)
    // cannot put their own task into the owner's project or under the owner's task
    const intoProject = await post(other.jwt, 'tasks', {
      id: crypto.randomUUID(),
      title: 'mine',
      project_id: projectId,
    })
    expect(intoProject.status).toBe(403)
    const underTask = await post(other.jwt, 'tasks', { id: crypto.randomUUID(), title: 'mine', parent_id: parentId })
    expect(underTask.status).toBe(403)
    // cannot hard delete
    for (const [table, id] of [
      ['tasks', taskId],
      ['projects', projectId],
    ] as const) {
      expect(await (await rest(other.jwt, `${table}?id=eq.${id}`, { method: 'DELETE' })).json()).toEqual([])
    }

    const still = await (await rest(owner.jwt, `tasks?id=eq.${taskId}`)).json()
    expect(still).toHaveLength(1)
    expect(still[0].title).toBe('private-7')
    expect(await (await rest(owner.jwt, `projects?id=eq.${projectId}`)).json()).toHaveLength(1)
  })

  test('7b: with no signed-in user, tasks and projects cannot be read or written', async () => {
    // A signed-out visitor only has the public anon key.
    const anon = (path: string, init: RequestInit = {}) =>
      fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        ...init,
        headers: {
          apikey: ANON_KEY,
          authorization: `Bearer ${ANON_KEY}`,
          'content-type': 'application/json',
          prefer: 'return=representation',
          ...init.headers,
        },
      })
    const owner = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: ANON_KEY, 'content-type': 'application/json' },
      body: JSON.stringify(user),
    }).then((r) => r.json())
    const taskId = crypto.randomUUID()
    const projectId = crypto.randomUUID()
    const asOwner = (table: string, row: object) =>
      fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: 'POST',
        headers: {
          apikey: ANON_KEY,
          authorization: `Bearer ${owner.access_token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(row),
      })
    expect((await asOwner('projects', { id: projectId, name: 'private-project-7b' })).status).toBe(201)
    expect((await asOwner('tasks', { id: taskId, title: 'private-7b' })).status).toBe(201)

    for (const [table, id, body] of [
      ['tasks', taskId, { title: 'hacked' }],
      ['projects', projectId, { name: 'hacked' }],
    ] as const) {
      expect(await (await anon(table)).json()).toEqual([]) // reads nothing
      expect(await (await anon(`${table}?id=eq.${id}`)).json()).toEqual([]) // cannot see a known row
      const insert = await anon(table, {
        method: 'POST',
        body: JSON.stringify({ id: crypto.randomUUID(), [table === 'tasks' ? 'title' : 'name']: 'x' }),
      })
      expect([401, 403]).toContain(insert.status) // cannot write
      const patch = await anon(`${table}?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(body) })
      expect(await patch.json()).toEqual([]) // cannot change
      const del = await anon(`${table}?id=eq.${id}`, { method: 'DELETE' })
      expect(await del.json()).toEqual([]) // cannot delete
    }

    expect(await serverTitlesOf(owner.access_token)).toContain('private-7b') // still untouched
    expect(await serverTitlesOf(owner.access_token)).not.toContain('hacked')
  })

  test('so1: signing out when everything is saved shows no warning and the next user sees none of the tasks', async ({
    browser,
  }) => {
    const userB = await createUser()
    const a = await newDevice(browser, user)
    await addNote(a.page, 'private-so1')
    await waitSynced(a)
    await expect.poll(() => serverTitles(user), { timeout: 10_000 }).toContain('private-so1') // really saved

    await openProfile(a.page)
    await a.page.getByTestId('sign-out').click()
    await expect(a.page.getByTestId('unsynced-note')).toHaveCount(0) // nothing to warn about
    await a.page.getByTestId('confirm-sign-out').click()
    await expect(a.page.getByTestId('email')).toBeVisible() // back on the sign-in screen
    // this device keeps no profile of the person who signed out
    expect(await a.page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('tovy-profile-')))).toEqual(
      [],
    )
    expect(await serverTitles(user)).toContain('private-so1') // signing out deletes nothing on the server

    await signInThroughScreen(a.page, userB)
    expect(await titles(a.page)).toEqual([]) // the next user sees none of the first user's tasks
    await a.page.reload()
    await expect(a.page.locator('html')).toHaveAttribute('data-sync', 'synced', { timeout: 15_000 })
    expect(await titles(a.page)).toEqual([]) // and none came back from the device's local copy
  })

  test('so2: signing out with unsaved edits warns, and cancel keeps everything', async ({ browser }) => {
    const a = await newDevice(browser, user)
    await a.setOffline(true)
    await addNote(a.page, 'unsynced-so2')
    // No waiting for the "pending" label first: tapping Sign out right after an edit must still warn.
    await openProfile(a.page)
    await a.page.getByTestId('sign-out').click()
    await expect(a.page.getByTestId('unsynced-note')).toContainText('1 change is not saved to the server yet')
    await a.page.getByTestId('cancel-sign-out').click()
    await expect(a.page.getByTestId('unsynced-note')).toHaveCount(0)
    await expect(a.page.getByTestId('email')).toHaveCount(0) // still signed in
    await a.page.getByTestId('tab-today').click()
    await expect.poll(() => titles(a.page)).toContain('unsynced-so2') // the edit is still there
  })

  test('so3: signing out anyway discards unsaved edits and nothing else', async ({ browser }) => {
    const a = await newDevice(browser, user)
    await addNote(a.page, 'saved-so3')
    await waitSynced(a)
    await expect.poll(() => serverTitles(user), { timeout: 10_000 }).toContain('saved-so3') // really saved
    await a.setOffline(true)
    await addNote(a.page, 'unsynced-so3')
    await expect(a.page.locator('html')).toHaveAttribute('data-sync', 'pending 1')

    await openProfile(a.page)
    await a.page.getByTestId('sign-out').click()
    await a.page.getByTestId('confirm-sign-out').click()
    await expect(a.page.getByTestId('email')).toBeVisible()

    await a.setOffline(false)
    await signInThroughScreen(a.page, user)
    // "synced" can show before the first fetch of the new session arrives, so wait for the saved task to come back
    await expect.poll(() => titles(a.page), { timeout: 10_000 }).toContain('saved-so3')
    expect(await titles(a.page)).not.toContain('unsynced-so3') // what never reached the server is gone
    expect(await serverTitles(user)).not.toContain('unsynced-so3')
  })

  test('g1: Google sign in is switched on for the project and returns to Supabase', async () => {
    // A valid PKCE challenge is 43 to 128 characters (base64url of a SHA-256).
    const challenge = createHash('sha256').update(randomUUID()).digest('base64url')
    const res = await fetch(
      `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=http://localhost:8081&code_challenge=${challenge}&code_challenge_method=s256`,
      { redirect: 'manual' },
    )
    expect(res.status).toBe(302)
    const to = new URL(res.headers.get('location')!)
    expect(to.hostname).toBe('accounts.google.com')
    expect(to.searchParams.get('client_id')).toBeTruthy() // a Google client is configured
    expect(to.searchParams.get('redirect_uri')).toBe(`${SUPABASE_URL}/auth/v1/callback`) // Google returns to Supabase
  })

  test('g2: the Google button starts a PKCE sign in for this app', async ({ browser }) => {
    const context = await browser.newContext()
    let started: string | undefined
    await context.route(/auth\/v1\/authorize/, async (route) => {
      started = route.request().url()
      await route.fulfill({ status: 200, contentType: 'text/html', body: 'stopped before Google' })
    })
    const page = await context.newPage()
    await page.goto('/')
    await page.getByTestId('google-sign-in').click()
    await expect.poll(() => started, { timeout: 10_000 }).toBeTruthy()

    const url = new URL(started!)
    expect(url.searchParams.get('provider')).toBe('google')
    expect(url.searchParams.get('redirect_to')).toBe('http://localhost:8081') // back to this app
    expect(url.searchParams.get('code_challenge')!.length).toBeGreaterThanOrEqual(43) // PKCE
    expect(url.searchParams.get('code_challenge_method')?.toLowerCase()).toBe('s256')
    await context.close()
  })

  test('s1: the session survives a reload of the app', async ({ browser }) => {
    const a = await newDevice(browser, user)
    await addNote(a.page, 'still-here-s1')
    await waitSynced(a)
    await expect.poll(() => serverTitles(user), { timeout: 10_000 }).toContain('still-here-s1')

    await a.page.reload()
    await expect(a.page.getByTestId('email')).toHaveCount(0) // no sign in screen
    await expect(a.page.locator('html')).toHaveAttribute('data-sync', 'synced', { timeout: 15_000 })
    await expect.poll(() => titles(a.page), { timeout: 10_000 }).toContain('still-here-s1')
  })
})
