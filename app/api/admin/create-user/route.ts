export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      email, nome, telefone,
      role,                      // 'superadmin' | 'gestor' | 'admin' | 'cliente'
      orgs = [],                 // múltiplos clientes
      allowedTables = ['Farol'], // múltiplas tabelas
      defaultTable = 'Farol',
    } = body || {}

    if (!email || !role) {
      return NextResponse.json({ ok: false, error: 'Campos obrigatórios: email, role' }, { status: 400 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

    // 1) Envia convite
    const { data: invited, error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(email)
    if (inviteErr) throw inviteErr
    const user = invited.user
    if (!user) throw new Error('Invite não retornou usuário')

    // 2) Upsert do perfil
    const orgSingle = Array.isArray(orgs) && orgs.length > 0 ? orgs[0] : null
    const { error: upsertErr } = await supabase.from('profiles').upsert({
      user_id: user.id,
      email, nome, telefone,
      role,
      org: orgSingle,
      orgs: Array.isArray(orgs) ? orgs : null,
      allowed_tables: Array.isArray(allowedTables) ? allowedTables : ['Farol'],
      default_table: defaultTable || 'Farol',
      is_active: true,
    }, { onConflict: 'user_id' })
    if (upsertErr) throw upsertErr

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('create-user error:', err)
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 400 })
  }
}
