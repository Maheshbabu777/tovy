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
//      - tries a harmless account change (a test label in your user metadata) with the app token
//      - if that went through, removes the label again
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

// S5: a harmless account change with the app's token.
const probe = (value) =>
  fetch(`${url}/auth/v1/user`, {
    method: 'PUT',
    headers: { apikey: anonKey, authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ data: { s5_probe: value } }),
  })
const r = await probe('1')
if (r.ok) {
  await probe(null)
  say('\nS5 RESULT: NOT SAFE. Supabase Auth accepted an account change made with an AI app token.')
  say('The test label was removed again. Do not connect real AI apps yet; tell Claude this result.')
} else {
  say(`\nS5 RESULT: SAFE. Supabase Auth refused the account change (${r.status}).`)
}
say('\nNow: Tovy > Connected apps > Disconnect "Tovy S5 check".')
