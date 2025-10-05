// app/api/me/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  // pega o usuário logado pela sessão (cookies)
  const s = createRouteHandlerClient({ cookies })
  const { data: { user } } = await s.auth.getUser()
  if (!user) return NextResponse.json({ ok: false, error: 'not_authenticated' }, { status: 401 })

  // usa a Service Role para ler o perfil desse usuário
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // server only
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data, error } = await admin
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, data })
}
