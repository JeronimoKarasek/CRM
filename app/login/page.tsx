'use client'
import { useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const supabase = createBrowserClient()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) return setError(error.message)
    router.replace('/dashboard')
  }

  return (
    <div className="max-w-sm mx-auto mt-24">
      <h1 className="text-2xl font-semibold mb-6">Entrar</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full"/>
        <input placeholder="Senha" type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full"/>
        <button disabled={loading} className="w-full">{loading ? 'Entrando…' : 'Entrar'}</button>
        {error && <p className="text-red-400 text-sm">{error}</p>}
      </form>
    </div>
  )
}
