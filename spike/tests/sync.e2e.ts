import { test, expect, type BrowserContext, type Page } from '@playwright/test'

const SUPABASE_URL = process.env.SUPABASE_URL!
const ANON_KEY = process.env.SUPABASE_ANON_KEY!
const SYNC_BUDGET_MS = 2000

// Two browser contexts = two devices: each has its own IndexedDB and session.
// "Offline" blocks only the backend (HTTP and websocket) so the page itself still loads and reloads.
type Device = { context: BrowserContext; page: Page; setOffline: (v: boolean) => Promise<void> }

async function newDevice(browser: import('@playwright/test').Browser, user: { email: string; password: string }): Promise<Device> {
  const context = await browser.newContext()
  let offline = false
  await context.route(/supabase\.co/, (route) => (offline ? route.abort('internetdisconnected') : route.continue()))
  // Websockets are controlled inside the page (not with routeWebSocket, whose Node-side connection ignores the sandbox proxy).
  await context.addInitScript(() => {
    const w = window as any
    const Native = w.WebSocket
    const open = new Set<WebSocket>()
    const isOffline = () => sessionStorage.getItem('wsOffline') === '1' // survives reloads
    w.__wsCutAll = () => open.forEach((s) => s.close())
    w.WebSocket = class extends Native {
      constructor(...args: any[]) {
        super(...args)
        open.add(this as any)
        this.addEventListener('close', () => open.delete(this as any))
        if (isOffline()) this.close()
      }
    }
  })
  const page = await context.newPage()
  await page.goto('/')
  await page.getByTestId('email').fill(user.email)
  await page.getByTestId('password').fill(user.password)
  await page.getByTestId('sign-in').click()
  await expect(page.getByTestId('status')).toHaveText('synced', { timeout: 15_000 })
  return {
    context,
    page,
    setOffline: async (v) => {
      offline = v
      await page.evaluate((off) => {
        const w = window as any
        sessionStorage.setItem('wsOffline', off ? '1' : '0')
        if (off) w.__wsCutAll() // cut sockets that are already open
      }, v)
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
    throw new Error(`user creation failed (without SUPABASE_API_KEY, turn off "Confirm email" in Supabase Auth): ${JSON.stringify(body)}`)
  }
  return { email, password }
}

const titles = (p: Page) => p.getByTestId('note').locator('input').evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value).sort())
const addNote = async (p: Page, title: string) => {
  await p.getByTestId('new-title').fill(title)
  await p.getByTestId('add').click()
}
const noteRow = (p: Page, title: string) => p.locator(`input[value="${title}"]`)
async function waitSynced(d: Device) {
  await expect(d.page.getByTestId('status')).toHaveText('synced', { timeout: 15_000 })
}
async function expectTitles(p: Page, expected: string[], timeout = SYNC_BUDGET_MS) {
  await expect.poll(() => titles(p), { timeout }).toEqual([...expected].sort())
}

test.describe('sync spike', () => {
  let user: { email: string; password: string }
  test.beforeAll(async () => { user = await createUser() })

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

    await a.setOffline(true); await b.setOffline(true)
    await noteRow(a.page, 'x3').fill('x3-from-a')
    await noteRow(b.page, 'y3').fill('y3-from-b')
    await a.setOffline(false); await b.setOffline(false)
    await a.page.reload(); await b.page.reload()
    for (const p of [a.page, b.page]) {
      await expect.poll(() => titles(p), { timeout: 10_000 }).toEqual(expect.arrayContaining(['x3-from-a', 'y3-from-b']))
    }
  })

  test('4: the same note edited offline on both devices ends identical', async ({ browser }) => {
    const a = await newDevice(browser, user)
    const b = await newDevice(browser, user)
    await addNote(a.page, 'shared-4')
    await waitSynced(a)
    await expect.poll(() => titles(b.page), { timeout: 10_000 }).toContain('shared-4')

    await a.setOffline(true); await b.setOffline(true)
    await noteRow(a.page, 'shared-4').fill('shared-4-A')
    await noteRow(b.page, 'shared-4').fill('shared-4-B')
    await a.setOffline(false); await b.setOffline(false)
    await a.page.reload(); await b.page.reload()
    await expect.poll(async () => {
      const [ta, tb] = [await titles(a.page), await titles(b.page)]
      const t4 = (t: string[]) => t.filter((x) => x.startsWith('shared-4')).join('|')
      return t4(ta) === t4(tb) && t4(ta).length > 0
    }, { timeout: 15_000 }).toBe(true)
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
})
