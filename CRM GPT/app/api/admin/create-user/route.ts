export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    // 0) Autorização: somente superadmin pode criar usuários
    const routeClient = createRouteHandlerClient({ cookies })
    const { data: { user: requester }, error: authErr } = await routeClient.auth.getUser()
    if (authErr || !requester) {
      return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      return NextResponse.json({ ok: false, error: 'Variáveis de ambiente ausentes (SUPABASE_SERVICE_ROLE_KEY/URL)' }, { status: 500 })
    }
    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

    // Carrega perfil do solicitante usando Service Role para verificar role
    const { data: me, error: meErr } = await admin
      .from('profiles')
      .select('role')
      .eq('user_id', requester.id)
      .single()
    if (meErr) {
      return NextResponse.json({ ok: false, error: 'Falha ao verificar perfil do solicitante' }, { status: 403 })
    }
    if (!me || me.role !== 'superadmin') {
      return NextResponse.json({ ok: false, error: 'Acesso negado: requer superadmin' }, { status: 403 })
    }

    // 1) Parse body
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

    // 2) Sanitiza tabelas: mantém apenas as válidas conforme whitelist do backend (RPC)
    let sanitizedAllowed: string[] = []
    try {
      const { data: tbls } = await admin.rpc('rpc_list_crm_tables')
      const allowedNames = new Set((tbls || []).map((t: any) => t.table_name))
      const incoming = Array.isArray(allowedTables) ? allowedTables.filter(Boolean) : ['Farol']
      sanitizedAllowed = incoming.filter((t: string) => allowedNames.has(t))
      if (sanitizedAllowed.length === 0) {
        // fallback
        const first = (tbls && (tbls as any[])[0]?.table_name) || 'Farol'
        sanitizedAllowed = [first]
      }
    } catch {
      sanitizedAllowed = Array.isArray(allowedTables) && allowedTables.length > 0 ? allowedTables : ['Farol']
    }

    const sanitizedDefault = sanitizedAllowed.includes(defaultTable) ? defaultTable : sanitizedAllowed[0]

    // 3) Envia convite
    const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email)
    if (inviteErr) throw inviteErr
    const invitedUser = invited.user
    if (!invitedUser) throw new Error('Invite não retornou usuário')

    // 4) Upsert do perfil
    const orgSingle = Array.isArray(orgs) && orgs.length > 0 ? orgs[0] : null
    const { error: upsertErr } = await admin.from('profiles').upsert({
      user_id: invitedUser.id,
      email, nome, telefone,
      role,
      org: orgSingle,
      orgs: Array.isArray(orgs) ? orgs : null,
      allowed_tables: sanitizedAllowed,
      default_table: sanitizedDefault,
      is_active: true,
    }, { onConflict: 'user_id' })
    if (upsertErr) throw upsertErr

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('create-user error:', err)
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 400 })
  }
}
