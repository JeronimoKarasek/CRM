// app/api/ping/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET() {
  return new Response(JSON.stringify({ ok: true, ping: 'pong' }), {
    headers: { 'content-type': 'application/json' },
  })
}
