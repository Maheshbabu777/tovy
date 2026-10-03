// Tovy's MCP address on its own site (spec design-v2): https://<tovy site>/mcp forwards to the MCP server, a Supabase
// Edge Function. AI apps then show Tovy's name and icon (they take the icon from the address) instead of Supabase's.
// vercel.json sends /mcp and /mcp/* here. Nothing is stored or changed on the way: the request and the answer pass
// through as they are, streamed, and the server checks every token itself.
export const config = { runtime: 'edge' }

// Headers worth passing on. Cookies and the like never go to the MCP server.
const FORWARD = ['authorization', 'content-type', 'accept', 'mcp-session-id', 'mcp-protocol-version', 'last-event-id']

export default async function handler(req: Request): Promise<Response> {
  const supabase = process.env.EXPO_PUBLIC_SUPABASE_URL
  if (!supabase) return new Response('The MCP server is not configured', { status: 503 })
  const url = new URL(req.url)
  const rest = (url.searchParams.get('rest') ?? '').replace(/^\/+/, '')
  if (rest.includes('..')) return new Response('Not found', { status: 404 })
  const target = `${supabase.replace(/\/+$/, '')}/functions/v1/mcp${rest ? `/${rest}` : ''}`

  const headers = new Headers()
  for (const name of FORWARD) {
    const value = req.headers.get(name)
    if (value) headers.set(name, value)
  }
  // Tells the server which address the app used, so its sign-in hints name this one (see supabase/functions/mcp).
  headers.set('x-mcp-public-url', `${url.origin}/mcp`)

  const upstream = await fetch(target, {
    method: req.method,
    headers,
    body: req.method === 'GET' || req.method === 'HEAD' ? undefined : req.body,
    // @ts-expect-error needed to stream a request body from an edge function
    duplex: 'half',
  })

  const out = new Headers(upstream.headers)
  // The body is already decoded by fetch; these would describe the wrong bytes.
  out.delete('content-encoding')
  out.delete('content-length')
  return new Response(upstream.body, { status: upstream.status, headers: out })
}
