export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'

export async function PATCH(req: Request) {
  try {
    const route = createRouteHandlerClient({ cookies })
    const { data: { user }, error: uerr } = await route.auth.getUser()
    if (uerr || !user) {
      return NextResponse.json({ ok: false, error: 'not_authenticated' }, { status: 401 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) {
      return NextResponse.json({ ok: false, error: 'Missing SUPABASE_SERVICE_ROLE_KEY or URL' }, { status: 500 })
    }

    // Body: { add: string[]; defaultTable?: string }
    const body = await req.json().catch(() => ({}))
    const toAddRaw: unknown = body?.add ?? body?.tables ?? body?.tablesToAdd
    const desiredDefault: unknown = body?.defaultTable
    const add: string[] = Array.isArray(toAddRaw) ? (toAddRaw as any[]).filter(Boolean).map(String) : []

    if (!Array.isArray(add) || add.length === 0) {
      return NextResponse.json({ ok: false, error: 'Informe add: string[] com as tabelas a adicionar' }, { status: 400 })
    }

    const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

    // Perfil atual
    const { data: prof, error: perr } = await admin
      .from('profiles')
      .select('role, allowed_tables, default_table')
      .eq('user_id', user.id)
      .single()
    if (perr) return NextResponse.json({ ok: false, error: perr.message }, { status: 400 })

    if (!prof || prof.role !== 'superadmin') {
      return NextResponse.json({ ok: false, error: 'Acesso negado: requer superadmin' }, { status: 403 })
    }

    // Whitelist vinda do backend
    const { data: list, error: lerr } = await admin.rpc('rpc_list_crm_tables')
    if (lerr) return NextResponse.json({ ok: false, error: lerr.message }, { status: 400 })
    const allowedNames = new Set((list || []).map((t: any) => t.table_name))

    const current: string[] = Array.isArray(prof.allowed_tables) ? prof.allowed_tables : []
    const filteredAdds = add.filter((t) => allowedNames.has(t))
    const merged = Array.from(new Set([...current, ...filteredAdds]))

    let nextDefault = prof.default_table as string | null
    if (typeof desiredDefault === 'string' && merged.includes(String(desiredDefault))) {
      nextDefault = String(desiredDefault)
    }

    const upd: any = { allowed_tables: merged }
    if (nextDefault && merged.includes(nextDefault)) upd.default_table = nextDefault

    const { error: uperr } = await admin
      .from('profiles')
      .update(upd)
      .eq('user_id', user.id)
    if (uperr) return NextResponse.json({ ok: false, error: uperr.message }, { status: 400 })

    return NextResponse.json({ ok: true, data: { allowed_tables: merged, default_table: nextDefault ?? null } })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 })
  }
}

