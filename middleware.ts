import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()

  const protectedPaths = ['/dashboard', '/clientes', '/configuracoes']
  const isProtected = protectedPaths.some((p) => req.nextUrl.pathname.startsWith(p))
  if (isProtected && !session) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }
  return res
}

export const config = {
  matcher: ['/dashboard/:path*', '/clientes/:path*', '/configuracoes/:path*']
}
