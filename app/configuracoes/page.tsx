'use client'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '../../lib/supabase/client'

export default function ConfiguracoesPage() {
  const supabase = createBrowserClient()
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
      setProfile(data)
    })()
  }, [])

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Configurações</h1>
      {profile ? (
        <pre className="bg-neutral-900 p-4 rounded border border-neutral-800 text-xs overflow-auto">{JSON.stringify(profile, null, 2)}</pre>
      ) : (
        <div>Carregando…</div>
      )}
    </div>
  )
}
