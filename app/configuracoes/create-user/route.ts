import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const { email, nome, telefone, role, org, tableName = 'Farol' } = await req.json()

    if (!email || !role || !org) {
      return NextResponse.json({ ok: false, error: 'Campos obrigatórios: email, role, org' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // servidor
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // envia convite por e-mail
    const { data: invited, error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(email)
    if (inviteErr) throw inviteErr
    const user = invited.user
    if (!user) throw new Error('Invite não retornou usuário')

    // cria o perfil ligado ao user_id
    const { error: insErr } = await supabase.from('profiles').insert({
      user_id: user.id,
      email,
      nome,
      telefone,
      role,                // 'superadmin' | 'gestor' | 'admin' | 'cliente'
      org,                 // filtro inicial: Farol."cliente" = org
      allowed_tables: [tableName],
      default_table: tableName,
      is_active: true
    })
    if (insErr) throw insErr

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('create-user error:', err)
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 400 })
  }
}
