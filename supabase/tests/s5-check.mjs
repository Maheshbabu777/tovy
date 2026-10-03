// Security check S5 (spec mcp-server): can an AI app's access token change the person's account through Supabase
// Auth? Run it yourself; it signs in as you through your own consent screen. The token stays in this process and is
// never printed or saved.
//
//   node supabase/tests/s5-check.mjs https://<ref>.supabase.co <anon key>
//
// What it does:
//   1. registers a test app "Tovy S5 check" with your OAuth server (dynamic registration)
//   2. opens the Tovy consent screen in your browser; you choose "Read and change" and press Allow
//   3. trades the code for an app token, then:
//      - calls the MCP server's get_today (proves the whole chain works)
//      - tries to set a password and to add a two-factor method with the app token (migration 0010 must refuse
//        both); anything that goes through is undone at once
//   4. prints the verdict. Afterwards: Tovy > Connected apps > Disconnect "Tovy S5 check".
import { createHash, randomBytes } from 'node:crypto'
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { Buffer } from 'node:buffer'

const [base, anonKey] = process.argv.slice(2)
if (!base || !anonKey || !/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(base)) {
  console.log('Usage: node supabase/tests/s5-check.mjs https://<ref>.supabase.co <anon key>')
  process.exit(1)
}
const url = base.replace(/\/$/, '')
const PORT = 8765
const REDIRECT = `http://localhost:${PORT}/callback`
const say = (s) => console.log(s)

async function discover() {
  for (const path of [
    '/.well-known/oauth-authorization-server/auth/v1',
    '/auth/v1/.well-known/oauth-authorization-server',
  ]) {
    const r = await fetch(url + path, { headers: { apikey: anonKey } })
    if (r.ok) return r.json()
  }
  throw new Error('Could not find the OAuth server. Is it turned on (Authentication > OAuth Server)?')
}

function open(link) {
  const [cmd, args] =
    process.platform === 'win32'
      ? ['rundll32', ['url.dll,FileProtocolHandler', link]]
      : process.platform === 'darwin'
        ? ['open', [link]]
        : ['xdg-open', [link]]
  try {
    spawn(cmd, args, { stdio: 'ignore', detached: true }).unref()
  } catch {
    // printed below anyway
  }
}

function waitForCode(state) {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const q = new URL(req.url, REDIRECT).searchParams
      if (!req.url.startsWith('/callback')) return res.end()
      res.setHeader('content-type', 'text/plain')
      if (q.get('state') !== state) {
        res.end('State did not match. Close this tab and run the check again.')
        return
      }
      res.end(
        q.get('code') ? 'Done. You can close this tab and go back to the terminal.' : `Refused: ${q.get('error')}`,
      )
      server.close()
      if (q.get('code')) resolve(q.get('code'))
      else reject(new Error(`Not approved (${q.get('error')})`))
    })
    server.listen(PORT, '127.0.0.1')
    setTimeout(
      () => {
        server.close()
        reject(new Error('Timed out after 5 minutes'))
      },
      5 * 60 * 1000,
    ).unref()
  })
}

const meta = await discover()
say(`OAuth server found: ${meta.issuer}`)
if (!meta.registration_endpoint) throw new Error('Dynamic client registration is off (Authentication > OAuth Server).')

const reg = await fetch(meta.registration_endpoint, {
  method: 'POST',
  headers: { 'content-type': 'application/json', apikey: anonKey },
  body: JSON.stringify({
    client_name: 'Tovy S5 check',
    redirect_uris: [REDIRECT],
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
  }),
})
const client = await reg.json()
if (!reg.ok || !client.client_id) throw new Error(`Could not register the test app: ${JSON.stringify(client)}`)
say('Test app registered: "Tovy S5 check"')

const verifier = randomBytes(32).toString('base64url')
const challenge = createHash('sha256').update(verifier).digest('base64url')
const state = randomBytes(16).toString('hex')
const authorize = new URL(meta.authorization_endpoint)
for (const [k, v] of Object.entries({
  response_type: 'code',
  client_id: client.client_id,
  redirect_uri: REDIRECT,
  code_challenge: challenge,
  code_challenge_method: 'S256',
  state,
}))
  authorize.searchParams.set(k, v)

const codePromise = waitForCode(state)
say('\nOpening your browser. Sign in to Tovy if asked, choose "Read and change your tasks", press Allow.')
say(`If nothing opens, paste this into your browser:\n${authorize}\n`)
open(authorize.toString())
const code = await codePromise
say('Approved.')

const tokenRes = await fetch(meta.token_endpoint, {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded', apikey: anonKey },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: client.client_id,
    redirect_uri: REDIRECT,
    code_verifier: verifier,
  }),
})
const tokens = await tokenRes.json()
if (!tokenRes.ok || !tokens.access_token) throw new Error(`Token exchange failed: ${tokens.error ?? tokenRes.status}`)
const token = tokens.access_token // never printed
const [h, p] = token
  .split('.')
  .slice(0, 2)
  .map((part) => JSON.parse(Buffer.from(part, 'base64url').toString()))
say(`App token received (signed ${h.alg}, client_id claim ${p.client_id ? 'present' : 'MISSING'}).`)

// The MCP server, end to end.
const mcp = await fetch(`${url}/functions/v1/mcp`, {
  method: 'POST',
  headers: {
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
    accept: 'application/json, text/event-stream',
  },
  body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'get_today', arguments: {} } }),
})
const mcpText = await mcp.text()
const firstLine = (mcpText.match(/"text":"([^"\\]*)/) ?? [])[1]
say(
  mcp.ok && firstLine
    ? `MCP server works: "${firstLine}"`
    : `MCP server answered ${mcp.status}: ${mcpText.slice(0, 200)}`,
)

// S5: what an app's token can do to the account. Supabase Auth accepts these tokens for account changes, so migration
// 0010 refuses the dangerous ones in the database. Each probe below undoes itself if it ever goes through.
const auth = (method, path, body) =>
  fetch(`${url}/auth/v1${path}`, {
    method,
    headers: { apikey: anonKey, authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

// 1. Setting a password (with it, an app could sign in as you). A random one nobody knows, cleared again if it sticks.
const pw = await auth('PUT', '/user', { password: `${randomBytes(24).toString('base64url')}Aa1!` })
if (pw.ok) await auth('PUT', '/user', { password: '' })
say(pw.ok ? 'Password: ACCEPTED (then cleared again)' : `Password: refused (${pw.status})`)

// 2. Adding a two-factor method (it could lock you out). Removed again if it sticks.
const mfa = await auth('POST', '/factors', { factor_type: 'totp', friendly_name: 'Tovy S5 check' })
if (mfa.ok) {
  const factor = await mfa.json()
  if (factor.id) await auth('DELETE', `/factors/${factor.id}`)
}
say(mfa.ok ? 'Two-factor method: ACCEPTED (then removed again)' : `Two-factor method: refused (${mfa.status})`)

// 3. User metadata: allowed on purpose (Tovy never trusts it), shown for the record.
const label = await auth('PUT', '/user', { data: { s5_probe: '1' } })
if (label.ok) await auth('PUT', '/user', { data: { s5_probe: null } })
say(`Profile metadata label: ${label.ok ? 'accepted (harmless, Tovy does not trust it)' : `refused (${label.status})`}`)

// The account email is refused by the same migration; it is not probed here, because if it were not, a real change
// email would go out.
if (pw.ok || mfa.ok) {
  say('\nS5 RESULT: NOT SAFE. An AI app token can still change the account. Is migration 0010 applied? Tell Claude.')
} else {
  say('\nS5 RESULT: SAFE. An AI app token cannot set a password or add a two-factor method.')
}
say('\nNow: Tovy > Connected apps > Disconnect "Tovy S5 check".')
