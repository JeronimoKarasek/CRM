// app/api/me/route.ts
export const runtime = 'nodejs'           // garante Node (não Edge)
export const dynamic = 'force-dynamic'    // evita cache

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const s = createRouteHandlerClient({ cookies })
    const { data: { user }, error: uerr } = await s.auth.getUser()
    if (uerr) return NextResponse.json({ ok: false, error: uerr.message }, { status: 401 })
    if (!user) return NextResponse.json({ ok: false, error: 'not_authenticated' }, { status: 401 })

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) {
      return NextResponse.json({ ok: false, error: 'Missing SUPABASE_SERVICE_ROLE_KEY or URL' }, { status: 500 })
    }

    const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
    const { data, error } = await admin.from('profiles').select('*').eq('user_id', user.id).single()
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })

    return NextResponse.json({ ok: true, data })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 })
  }
}
