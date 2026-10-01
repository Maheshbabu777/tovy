import { test, expect, type BrowserContext, type Page } from '@playwright/test'
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
  user: { email: string; password: string },
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
  const page = await context.newPage()
  await page.goto('/')
  await expect(page.getByTestId('status')).toHaveText('synced', { timeout: 15_000 })
  await Promise.race([
    realtimeReady,
    new Promise<void>((_, reject) =>
      setTimeout(() => reject(new Error('realtime never confirmed its subscription')), 15_000),
    ),
  ])
  return {
    context,
    page,
    setOffline: async (v) => {
      offline = v
      if (v) while (sockets.length) sockets.pop()!.close() // cut sockets that are already open
    },
  }
}

async function createUser(): Promise<{ email: string; password: string }> {
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
  return { email, password }
}

// Note titles the server returns for a signed-in user's token.
async function serverTitlesOf(accessToken: string): Promise<string[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/notes?select=title&deleted=eq.false`, {
    headers: { apikey: ANON_KEY, authorization: `Bearer ${accessToken}` },
  })
  return ((await res.json()) as { title: string }[]).map((n) => n.title)
}

const titles = (p: Page) =>
  p
    .getByTestId('note')
    .locator('input')
    .evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value).sort())
const addNote = async (p: Page, title: string) => {
  await p.getByTestId('new-title').fill(title)
  await p.getByTestId('add').click()
}
const noteRow = (p: Page, title: string) => p.locator(`input[value="${title}"]`)
async function waitSynced(d: Device) {
  await expect(d.page.getByTestId('status')).toHaveText('synced', { timeout: 15_000 })
}
async function expectTitles(p: Page, expected: string[], timeout = SYNC_BUDGET_MS) {
  // poll every 50 ms so the measured sync time is not rounded up to the default back-off steps
  await expect.poll(() => titles(p), { timeout, intervals: [50] }).toEqual([...expected].sort())
}

test.describe('sync spike', () => {
  let user: { email: string; password: string }
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
    await a.page.locator('input[value="base-2"]').fill('offline-edit-2')
    await expectTitles(a.page, ['offline-add-2', 'offline-edit-2'], 300) // instant on A
    await expectTitles(b.page, ['base-2'], 500) // B has not seen it yet

    await a.setOffline(false)
    const t0 = Date.now()
    await a.page.reload() // reconnect: app restarts its sync
    await expectTitles(b.page, ['offline-add-2', 'offline-edit-2'])
    console.log(`criterion 2 sync time after reconnect: ${Date.now() - t0} ms (includes page reload)`)
  })

  test('3: edits to different notes made offline on both devices both survive', async ({ browser }) => {
    const a = await newDevice(browser, user)
    const b = await newDevice(browser, user)
    await addNote(a.page, 'x3')
    await addNote(a.page, 'y3')
    await waitSynced(a)
    await expect.poll(() => titles(b.page), { timeout: 10_000 }).toEqual(expect.arrayContaining(['x3', 'y3']))

    await a.setOffline(true)
    await b.setOffline(true)
    await noteRow(a.page, 'x3').fill('x3-from-a')
    await noteRow(b.page, 'y3').fill('y3-from-b')
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

  test('4: the same note edited offline on both devices ends identical', async ({ browser }) => {
    const a = await newDevice(browser, user)
    const b = await newDevice(browser, user)
    await addNote(a.page, 'shared-4')
    await waitSynced(a)
    await expect.poll(() => titles(b.page), { timeout: 10_000 }).toContain('shared-4')

    await a.setOffline(true)
    await b.setOffline(true)
    await noteRow(a.page, 'shared-4').fill('shared-4-A')
    await noteRow(b.page, 'shared-4').fill('shared-4-B')
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
    const rowA = a.page.getByTestId('note').filter({ has: a.page.locator('input[value="doomed-5"]') })
    await rowA.locator('[data-testid^="delete-"]').click()
    await waitSynced(a)
    expect(await titles(a.page)).not.toContain('doomed-5')
    expect(await titles(b.page)).toContain('doomed-5') // B was offline, still shows it

    await b.setOffline(false)
    await b.page.reload()
    await expect.poll(() => titles(b.page), { timeout: 10_000 }).not.toContain('doomed-5')
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

  test("7: a second user cannot read or change the first user's notes", async () => {
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
    const noteId = crypto.randomUUID()
    expect(
      (await rest(owner.jwt, 'notes', { method: 'POST', body: JSON.stringify({ id: noteId, title: 'private-7' }) }))
        .status,
    ).toBe(201)

    expect(await (await rest(other.jwt, `notes?id=eq.${noteId}`)).json()).toEqual([]) // cannot read
    const patched = await rest(other.jwt, `notes?id=eq.${noteId}`, {
      method: 'PATCH',
      body: JSON.stringify({ title: 'hacked' }),
    })
    expect(await patched.json()).toEqual([]) // cannot change
    const spoof = await rest(other.jwt, 'notes', {
      method: 'POST',
      body: JSON.stringify({ id: crypto.randomUUID(), user_id: owner.id, title: 'spoof' }),
    })
    expect(spoof.status).toBe(403) // cannot write rows as the owner
    const del = await rest(other.jwt, `notes?id=eq.${noteId}`, { method: 'DELETE' })
    expect(await del.json()).toEqual([]) // cannot hard delete

    const still = await (await rest(owner.jwt, `notes?id=eq.${noteId}`)).json()
    expect(still).toHaveLength(1)
    expect(still[0].title).toBe('private-7')
  })

  test('7b: with no signed-in user, notes cannot be read or written', async () => {
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
    const noteId = crypto.randomUUID()
    const created = await fetch(`${SUPABASE_URL}/rest/v1/notes`, {
      method: 'POST',
      headers: {
        apikey: ANON_KEY,
        authorization: `Bearer ${owner.access_token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ id: noteId, title: 'private-7b' }),
    })
    expect(created.status).toBe(201)

    expect(await (await anon('notes')).json()).toEqual([]) // reads nothing
    expect(await (await anon(`notes?id=eq.${noteId}`)).json()).toEqual([]) // cannot see a known note
    const insert = await anon('notes', {
      method: 'POST',
      body: JSON.stringify({ id: crypto.randomUUID(), title: 'x' }),
    })
    expect([401, 403]).toContain(insert.status) // cannot write
    const patch = await anon(`notes?id=eq.${noteId}`, { method: 'PATCH', body: JSON.stringify({ title: 'hacked' }) })
    expect(await patch.json()).toEqual([]) // cannot change
    const del = await anon(`notes?id=eq.${noteId}`, { method: 'DELETE' })
    expect(await del.json()).toEqual([]) // cannot delete

    expect(await serverTitlesOf(owner.access_token)).toContain('private-7b') // still untouched
    expect(await serverTitlesOf(owner.access_token)).not.toContain('hacked')
  })
})
