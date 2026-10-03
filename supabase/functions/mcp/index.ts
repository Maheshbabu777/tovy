// Tovy's MCP server (spec mcp-server): AI apps such as Claude or ChatGPT read and change the person's tasks here.
//
// Sign in: the app is sent to Supabase's OAuth 2.1 server (Authentication > OAuth Server in the dashboard), the person
// approves it on Tovy's consent screen (/oauth/consent), and the app gets an access token for that person with a
// `client_id` claim. Every request here must carry that token. It is checked here (signature, expiry, a user, an app),
// then used for every database call, so row security applies exactly as for the person, limited by what the person
// allows that app (`ai_clients`, migration 0009). No service role key is used anywhere in this function.
//
// Deployed with JWT verification off (`supabase functions deploy mcp --no-verify-jwt`), because an app with no token
// must get the 401 below, which tells it where to sign in (RFC 9728 protected resource metadata).

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { McpServer, StreamableHttpTransport } from 'mcp-lite'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { type Repo, supabaseRepo } from './repo.ts'
import { ANNOTATIONS, type Caller, registerTools } from './tools.ts'

export type Verified = { userId: string; clientId: string }

export type Deps = {
  publicUrl: string // where this server is reached, e.g. https://<ref>.supabase.co/functions/v1/mcp
  authServer: string // the OAuth issuer, https://<ref>.supabase.co/auth/v1
  verify: (token: string) => Promise<Verified | null>
  repoFor: (token: string) => Repo
  now?: () => Date
  rateLimit?: number // calls per user per minute
}

const RATE_WINDOW_MS = 60_000

export function createMcp(): McpServer {
  const mcp = new McpServer({
    name: 'tovy',
    version: '1.0.0',
    schemaAdapter: (schema) => z.toJSONSchema(schema as z.ZodType),
  })
  // mcp-lite 0.8 has no field for tool annotations, so they are added to the tool list on the way out.
  mcp.use(async (ctx, next) => {
    await next()
    const req = ctx.request as { method?: string }
    const result = (
      ctx.response as { result?: { tools?: { name: string; annotations?: unknown; title?: string }[] } } | null
    )?.result
    if (req.method === 'tools/list' && result?.tools) {
      for (const tool of result.tools) {
        const a = ANNOTATIONS[tool.name]
        if (a) {
          tool.annotations = a
          tool.title = String(a.title)
        }
      }
    }
  })
  registerTools(mcp)
  return mcp
}

export function createApp(deps: Deps) {
  const mcp = createMcp()
  const handle = new StreamableHttpTransport().bind(mcp)
  const now = deps.now ?? (() => new Date())
  const limit = deps.rateLimit ?? 120
  const calls = new Map<string, number[]>() // per user, best effort within one running instance
  // The address the app used to reach this server. Tovy's own site forwards /mcp here (vercel.json, api/mcp.ts) and
  // says so in X-Mcp-Public-Url, so AI apps see Tovy's address (and its icon) instead of Supabase's. The metadata must
  // name the address the app actually used (RFC 9728), so it follows the header. Trusting it is safe: it only changes
  // the answer to the request that sent it, and the sign-in server named in it is fixed.
  const publicUrlOf = (req: Request) => {
    const forwarded = req.headers.get('x-mcp-public-url') ?? ''
    return /^https:\/\/[a-z0-9.-]+(:\d+)?\/mcp$/i.test(forwarded) ? forwarded : deps.publicUrl
  }
  const metadataUrlOf = (req: Request) => `${publicUrlOf(req)}/.well-known/oauth-protected-resource`

  const app = new Hono().basePath('/mcp')
  app.use(
    '*',
    cors({
      origin: '*',
      allowHeaders: ['Authorization', 'Content-Type', 'Mcp-Session-Id', 'Mcp-Protocol-Version', 'Last-Event-ID'],
      allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      exposeHeaders: ['Mcp-Session-Id', 'WWW-Authenticate'],
    }),
  )

  // Where to sign in (RFC 9728). Public on purpose: it holds no secret.
  const metadata = (c: { req: { raw: Request } }) =>
    Response.json({
      resource: publicUrlOf(c.req.raw),
      authorization_servers: [deps.authServer],
      bearer_methods_supported: ['header'],
      resource_name: 'Tovy',
    })
  app.get('/.well-known/oauth-protected-resource', metadata)
  app.get('/.well-known/oauth-protected-resource/*', metadata)

  const challenge = (req: Request, error?: string, description?: string) =>
    new Response(
      JSON.stringify({ error: error ?? 'unauthorized', error_description: description ?? 'Sign in to Tovy' }),
      {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'WWW-Authenticate': `Bearer resource_metadata="${metadataUrlOf(req)}"${
            error ? `, error="${error}", error_description="${description}"` : ''
          }`,
        },
      },
    )

  const serve = async (c: { req: { raw: Request; header: (n: string) => string | undefined } }) => {
    const header = c.req.header('Authorization') ?? ''
    const match = /^Bearer\s+(\S+)$/i.exec(header)
    if (!match) return challenge(c.req.raw)
    const token = match[1]
    let who: Verified | null = null
    try {
      who = await deps.verify(token)
    } catch {
      who = null
    }
    if (!who) return challenge(c.req.raw, 'invalid_token', 'The token is missing, expired or not from a connected app')

    const stamp = now().getTime()
    const recent = (calls.get(who.userId) ?? []).filter((t) => stamp - t < RATE_WINDOW_MS)
    if (recent.length >= limit) {
      return new Response(
        JSON.stringify({ error: 'rate_limited', error_description: 'Too many requests, wait a minute' }),
        {
          status: 429,
          headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
        },
      )
    }
    recent.push(stamp)
    calls.set(who.userId, recent)

    const caller: Caller = { repo: deps.repoFor(token), clientId: who.clientId, now }
    return handle(c.req.raw, { authInfo: { token, scopes: [], extra: { caller, userId: who.userId } } })
  }
  app.all('/', serve)
  app.all('/mcp', serve)
  return app
}

// Checks an access token with Supabase Auth: signature, expiry, audience, a user, an app (`client_id`, which only the
// OAuth server puts in a token: the person's own app session cannot be used here), and a session that still exists.
export function supabaseVerify(url: string, anonKey: string) {
  const auth = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } }).auth
  return async (token: string): Promise<Verified | null> => {
    const { data, error } = await auth.getClaims(token)
    if (error || !data?.claims) return null
    const claims = data.claims as Record<string, unknown>
    const userId = typeof claims.sub === 'string' ? claims.sub : ''
    const clientId = typeof claims.client_id === 'string' ? claims.client_id : ''
    const exp = typeof claims.exp === 'number' ? claims.exp : 0
    const aud = claims.aud
    const audOk = aud === 'authenticated' || (Array.isArray(aud) && aud.includes('authenticated'))
    if (!userId || !clientId || !audOk || claims.role !== 'authenticated' || exp * 1000 <= Date.now()) return null
    // The signature alone does not show a grant the person revoked: its token stays valid until it expires. Asking
    // Auth for the user does, because Auth checks the token's session still exists. One extra call per request.
    const { data: live, error: gone } = await auth.getUser(token)
    if (gone || live?.user?.id !== userId) return null
    return { userId, clientId }
  }
}

if (import.meta.main) {
  const url = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const app = createApp({
    publicUrl: Deno.env.get('MCP_PUBLIC_URL') ?? `${url}/functions/v1/mcp`,
    authServer: `${url}/auth/v1`,
    verify: supabaseVerify(url, anonKey),
    repoFor: (token) => supabaseRepo(url, anonKey, token),
  })
  Deno.serve(app.fetch)
}
