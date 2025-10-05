'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '../../lib/supabase/client'

type Profile = {
  user_id: string
  email: string | null
  nome: string | null
  telefone: string | null
  role: 'superadmin' | 'gestor' | 'admin' | 'cliente'
  org: string
  default_table: string | null
  allowed_tables: string[] | null
  is_active: boolean
  created_at: string
}

export default function ConfiguracoesPage() {
  const supabase = createBrowserClient()
  const [me, setMe] = useState<Profile | null>(null)
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  // form novo usuário
  const [email, setEmail] = useState('')
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [role, setRole] = useState<'superadmin'|'gestor'|'admin'|'cliente'>('cliente')
  const [tableName, setTableName] = useState('Farol')
  const [org, setOrg] = useState('') // valor que deve bater com Farol."cliente"

  const loadMe = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
    setMe(data as any)
  }

  const loadUsers = async () => {
    setLoading(true)
    setErr(null)
    // superadmin consegue listar todos os perfis (policy: profiles_superadmin_read)
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id,email,nome,telefone,role,org,default_table,allowed_tables,is_active,created_at')
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) setErr(error.message)
    setUsers((data || []) as any)
    setLoading(false)
  }

  useEffect(() => {
    (async () => {
      await loadMe()
      await loadUsers()
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null); setErr(null)
    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, nome, telefone, role, org, tableName })
      })
      const j = await res.json()
      if (!res.ok || !j.ok) throw new Error(j.error || 'Falha ao criar usuário')
      setMsg('Usuário convidado com sucesso. Ele receberá um e-mail para criar a senha.')
      setEmail(''); setNome(''); setTelefone(''); setRole('cliente'); setOrg('')
      await loadUsers()
    } catch (e: any) {
      setErr(String(e.message || e))
    }
  }

  const toggleActive = async (u: Profile) => {
    setMsg(null); setErr(null)
    const { error } = await supabase.from('profiles').update({ is_active: !u.is_active }).eq('user_id', u.user_id)
    if (error) { setErr(error.message) } else { setMsg('Atualizado.'); await loadUsers() }
  }

  const isSuper = me?.role === 'superadmin'

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Configurações</h1>

      {/* Meu perfil */}
      <div className="space-y-2">
        <h2 className="text-lg font-medium">Meu perfil</h2>
        {me ? (
          <pre className="bg-neutral-900 p-4 rounded border border-neutral-800 text-xs overflow-auto">
            {JSON.stringify(me, null, 2)}
          </pre>
        ) : <div>Carregando…</div>}
      </div>

      {/* Admin de usuários */}
      {isSuper ? (
        <div className="space-y-4">
          <h2 className="text-lg font-medium">Usuários</h2>

          <form onSubmit={createUser} className="grid grid-cols-1 md:grid-cols-6 gap-2 bg-neutral-900 p-4 rounded border border-neutral-800">
            <input placeholder="E-mail *" value={email} onChange={e=>setEmail(e.target.value)} required />
            <input placeholder="Nome" value={nome} onChange={e=>setNome(e.target.value)} />
            <input placeholder="Telefone" value={telefone} onChange={e=>setTelefone(e.target.value)} />
            <select value={role} onChange={e=>setRole(e.target.value as any)}>
              <option value="cliente">Cliente</option>
              <option value="admin">Admin</option>
              <option value="gestor">Gestor</option>
              <option value="superadmin">Superadmin</option>
            </select>
            <select value={tableName} onChange={e=>setTableName(e.target.value)}>
              <option value="Farol">Farol</option>
              {/* quando tiver outras tabelas, adicione aqui */}
            </select>
            <input placeholder='Filtro inicial "cliente" (ex.: foco01) *' value={org} onChange={e=>setOrg(e.target.value)} required />
            <div className="md:col-span-6 flex justify-end">
              <button type="submit">Criar usuário</button>
            </div>
          </form>

          {msg && <div className="text-green-400 text-sm">{msg}</div>}
          {err && <div className="text-red-400 text-sm">{err}</div>}

          <div className="overflow-x-auto border border-neutral-800 rounded">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-900">
                <tr>
                  <th className="text-left px-3 py-2">E-mail</th>
                  <th className="text-left px-3 py-2">Nome</th>
                  <th className="text-left px-3 py-2">Role</th>
                  <th className="text-left px-3 py-2">Org (cliente)</th>
                  <th className="text-left px-3 py-2">Tabelas</th>
                  <th className="text-left px-3 py-2">Ativo</th>
                  <th className="text-left px-3 py-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td className="px-3 py-2" colSpan={7}>Carregando…</td></tr>
                ) : users.map(u => (
                  <tr key={u.user_id} className="odd:bg-neutral-950 even:bg-neutral-900">
                    <td className="px-3 py-2">{u.email}</td>
                    <td className="px-3 py-2">{u.nome}</td>
                    <td className="px-3 py-2">{u.role}</td>
                    <td className="px-3 py-2">{u.org}</td>
                    <td className="px-3 py-2">{(u.allowed_tables || []).join(', ')}</td>
                    <td className="px-3 py-2">{u.is_active ? 'Sim' : 'Não'}</td>
                    <td className="px-3 py-2">
                      <button onClick={()=>toggleActive(u)}>{u.is_active ? 'Desativar' : 'Ativar'}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-yellow-400 text-sm">Somente <b>superadmin</b> pode gerenciar usuários.</div>
      )}
    </div>
  )
}
