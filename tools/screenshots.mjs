// Screenshots of the real app (the exported web build) with sample data, to compare with the design.
//   npx expo export --platform web      (with EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY set)
//   SUPABASE_URL=... SUPABASE_ANON_KEY=... SUPABASE_API_KEY=... node tools/screenshots.mjs <outdir> [screen ...]
// Screens: signin, code (the code step, the send request is mocked so no email goes out), setup, today, projects,
// profile, or a path such as /task/<id>. Default: all of them.
// It creates a temporary user (and one without a profile for `setup`), fills in a few projects and tasks through the
// admin API, signs in by placing the session in the browser, and deletes the users again. Needs `npx serve` on 8081
// (or set BASE_URL). Images: <screen>-phone-light.png, <screen>-phone-dark.png (430 px wide) and the same with -wide
// (1280 px wide). Set SCHEMES=light to skip dark.
import { chromium } from '@playwright/test'

const SB = process.env.SUPABASE_URL
const ANON = process.env.SUPABASE_ANON_KEY
const ADMIN = process.env.SUPABASE_API_KEY
const BASE = process.env.BASE_URL ?? 'http://localhost:8081'
const [outDir, ...asked] = process.argv.slice(2)
if (!SB || !ANON || !ADMIN || !outDir) throw new Error('usage: see the top of this file')
const screens = asked.length ? asked : ['signin', 'code', 'setup', 'today', 'projects', 'profile']
const SIZES = [
  ['phone', 430, 900],
  ['wide', 1280, 800],
]
const SCHEMES = (process.env.SCHEMES ?? 'light,dark').split(',')
const VARIANTS = SIZES.flatMap(([size, width, height]) =>
  SCHEMES.map((scheme) => [`${size}-${scheme}`, width, height, scheme]),
)

const call = (method, path, key, body, token) =>
  fetch(SB + path, {
    method,
    headers: {
      apikey: key,
      authorization: 'Bearer ' + (token || key),
      'content-type': 'application/json',
      prefer: 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  }).then(async (r) => ({ status: r.status, json: await r.json().catch(() => null) }))

const made = []
async function newUser(tag, withProfile) {
  const email = `shot-${tag}-${Date.now()}@gmail.com`
  const password = 'shot-password-12345'
  const user = (await call('POST', '/auth/v1/admin/users', ADMIN, { email, password, email_confirm: true })).json
  if (!user?.id) throw new Error('could not create a user: ' + JSON.stringify(user))
  made.push(user.id)
  if (withProfile)
    await call('POST', '/rest/v1/profiles', ADMIN, {
      id: user.id,
      first_name: 'Maya',
      last_name: 'Okafor',
      username: 'maya_o',
    })
  const session = (await call('POST', '/auth/v1/token?grant_type=password', ANON, { email, password })).json
  return { email, session }
}

async function sampleData(token) {
  const id = () => crypto.randomUUID()
  const project = async (name, color) => {
    const projectId = id()
    await call('POST', '/rest/v1/projects', ANON, { id: projectId, name, color }, token)
    return projectId
  }
  const task = async (row) => {
    const res = await call('POST', '/rest/v1/tasks', ANON, { id: id(), ...row }, token)
    if (res.status !== 201)
      console.log('sample task not created:', row.title, res.status, JSON.stringify(res.json).slice(0, 160))
  }
  const launch = await project('Launch', 'indigo')
  const health = await project('Health', 'teal')
  const studio = await project('Studio', 'amber')
  const today = new Date().toISOString().slice(0, 10)
  const day = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10)
  const deep = id()
  await call(
    'POST',
    '/rest/v1/tasks',
    ANON,
    { id: deep, title: 'Draft API doc for v2 endpoints', kind: 'deep', project_id: launch, due_date: today },
    token,
  )
  await task({ title: 'Outline the endpoints', parent_id: deep, project_id: launch, done_at: new Date().toISOString() })
  await task({ title: 'Write the examples', parent_id: deep, project_id: launch })
  await task({ title: 'Send invoice to Halden Studio', project_id: studio, due_date: today, due_time: '16:00' })
  await task({ title: 'Book dentist', project_id: health, due_date: today })
  await task({ title: 'Review launch checklist', project_id: launch, due_date: day(-2) })
  await task({ title: 'Rewrite onboarding copy', project_id: launch, due_date: day(3) })
  await task({ title: 'Morning walk', project_id: health })
  await task({ title: 'Call mum', done_at: new Date().toISOString() })
}

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox'],
})
try {
  const full = await newUser('full', true)
  await sampleData(full.session.access_token)
  const bare = screens.includes('setup') ? await newUser('bare', false) : null
  const key = `sb-${new URL(SB).hostname.split('.')[0]}-auth-token`
  for (const screen of screens) {
    const who = screen === 'signin' || screen === 'code' ? null : screen === 'setup' ? bare : full
    const path =
      { signin: '/', code: '/', setup: '/', today: '/', projects: '/projects', profile: '/profile' }[screen] ?? screen
    for (const [name, width, height, scheme] of VARIANTS) {
      const context = await browser.newContext({ viewport: { width, height }, colorScheme: scheme })
      // Requests go through Node: in the cloud sandbox the browser cannot reach Supabase itself.
      await context.route(/supabase\.co/, async (route) => {
        try {
          await route.fulfill({ response: await route.fetch() })
        } catch {
          await route.abort()
        }
      })
      if (who) await context.addInitScript(([k, v]) => localStorage.setItem(k, v), [key, JSON.stringify(who.session)])
      const page = await context.newPage()
      // Anything the app complains about is printed, so a blank screenshot comes with its reason.
      page.on('pageerror', (e) => console.log(`  [${screen} ${name}] page error:`, String(e).slice(0, 300)))
      page.on(
        'console',
        (m) =>
          m.type() === 'error' &&
          !m.text().includes('WebSocket') &&
          console.log(`  [${screen} ${name}] console error:`, m.text().slice(0, 300)),
      )
      if (screen === 'code')
        await page.route(/\/auth\/v1\/otp/, (route) =>
          route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
        )
      await page.goto(BASE + path)
      await page.waitForTimeout(Number(process.env.WAIT_MS ?? 3500))
      if (screen === 'code') {
        await page.getByTestId('email').fill('maya@okafor.studio')
        await page.getByTestId('send-code').click()
        await page.getByTestId('code').fill('123')
        await page.waitForTimeout(800)
      }
      await page.screenshot({ path: `${outDir}/${screen}-${name}.png` })
      await context.close()
    }
    console.log('saved', screen)
  }
} finally {
  await browser.close()
  for (const id of made) await call('DELETE', '/auth/v1/admin/users/' + id, ADMIN)
  console.log('temporary users deleted:', made.length)
}
