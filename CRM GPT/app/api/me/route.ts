export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

export async function PATCH(req: Request) {
  try {
    const route = createRouteHandlerClient({ cookies })
    const { data: { user }, error: uerr } = await route.auth.getUser()
    if (uerr || !user) return NextResponse.json({ ok: false, error: 'not_authenticated' }, { status: 401 })

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) {
      return NextResponse.json({ ok: false, error: 'Missing SUPABASE_SERVICE_ROLE_KEY or URL' }, { status: 500 })
    }

    const body = await req.json().catch(() => ({}))
    const { defaultTable } = body || {}
    if (!defaultTable || typeof defaultTable !== 'string') {
      return NextResponse.json({ ok: false, error: 'defaultTable ausente ou inválido' }, { status: 400 })
    }

    const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

    // Carrega perfil atual para validar allowed_tables
    const { data: prof, error: perr } = await admin
      .from('profiles')
      .select('allowed_tables')
      .eq('user_id', user.id)
      .single()
    if (perr) return NextResponse.json({ ok: false, error: perr.message }, { status: 400 })

    const allowed: string[] = Array.isArray(prof?.allowed_tables) ? prof!.allowed_tables : []
    if (allowed.length > 0 && !allowed.includes(defaultTable)) {
      return NextResponse.json({ ok: false, error: 'Tabela não permitida para este usuário' }, { status: 403 })
    }

    const { error: uperr } = await admin
      .from('profiles')
      .update({ default_table: defaultTable })
      .eq('user_id', user.id)
    if (uperr) return NextResponse.json({ ok: false, error: uperr.message }, { status: 400 })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 })
  }
}
