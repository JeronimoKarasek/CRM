import { cookies, headers } from 'next/headers'
import { createServerClient as createClient } from '@supabase/auth-helpers-nextjs'
import type { NextRequest, NextResponse } from 'next/server'

export function createServerClient(ctx?: { req: NextRequest, res: NextResponse }) {
  const cookieStore = cookies()
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          if (ctx) return ctx.req.cookies.get(name)?.value
          return cookieStore.get(name)?.value
        },
      },
    },
  )
}
