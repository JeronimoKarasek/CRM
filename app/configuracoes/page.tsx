'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '../../lib/supabase/client'

type Role = 'superadmin' | 'gestor' | 'admin' | 'cliente'

type Profile = {
  user_id: string
  email: string | null
  nome: string | null
  telefone: string | null
  role: Role
  org: string | null
  orgs: string[] | null
  default_table: string | null
  allowed_tables: string[] | null
  is_active: boolean
  created_at: string
}

export default function ConfiguracoesPage() {
  const supabase = createBrowserClient()

  const [me, setMe] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  // lista de usuários (para superadmin)
  const [users, setUsers] = useState<Profile[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  // opções e formulário de criação
  const [clienteOptions, setClienteOptions] = useState<string[]>([])
  const [email, setEmail] = useState('')
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [role, setRole] = useState<Role>('cliente')
  const [defaultTable, setDefaultTable] = useState('Farol')
  const [allowedTables, setAllowedTables] = useState<string[]>(['Farol'])
  const [orgs, setOrgs] = useState<string[]>([])

  /** Faz parse seguro de JSON (evita erro do tipo “Unexpected token '<'…”) */
  const safeParseJson = async (r: Response) => {
    const ct = r.headers.get('content-type') || ''
    if (!ct.includes('application/json')) {
      const txt = await r.text()
      throw new Error(`API /api/me não retornou JSON (status ${r.status}): ${txt.slice(0, 120)}`)
    }
    return r.json()
  }

  /** Carrega meu perfil: 1) RLS, 2) fallback Service Role */
  const loadMe = async () => {
    setLoading(true)
    setErr(null)
    try {
      const { data: { user }, error: uerr } = await supabase.auth.getUser()
      if (uerr) throw new Error(uerr.message)
      if (!user) throw new Error('Usuário não autenticado')

      // tenta via RLS
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error || !data) {
        // fallback via Service Role (server)
        const r = await fetch('/api/me', { cache: 'no-store' })
        const j = await safeParseJson(r)
        if (!r.ok || !j.ok) throw new Error(j.error || 'Falha ao obter perfil via /api/me')
        setMe(j.data as Profile)
      } else {
        setMe(data as Profile)
      }
    } catch (e: any) {
      setErr(String(e.message || e))
      setMe(null)
    } finally {
      setLoading(false)
    }
  }

  /** Lista perfis (somente se eu for superadmin) */
  const loadUsers = async () => {
    if (!me || me.role !== 'superadmin') return
    setLoadingUsers(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id,email,nome,telefone,role,org,orgs,default_table,allowed_tables,is_active,created_at')
        .order('created_at', { ascending: false })
        .limit(500)
      if (error) throw error
      setUsers((data || []) as any)
    } catch (e: any) {
      setErr(String(e.message || e))
    } finally {
      setLoadingUsers(false)
    }
  }

  /** Carrega as opções de cliente (distinct) para o select múltiplo */
  const loadClienteOptions = async () => {
    try {
      const { data, error } = await supabase.rpc('rpc_distinct_clientes')
      if (error) throw error
      setClienteOptions((data || []).map((d: any) => d.cliente))
    } catch (e: any) {
      // não é crítico; só mostraremos menos opções
      console.error('rpc_distinct_clientes ->', e?.message || e)
    }
  }

  useEffect(() => {
    (async () => {
      await loadMe()
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    (async () => {
      if (me) {
        await Promise.all([loadUsers(), loadClienteOptions()])
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.role])

  /** Cria usuário via API server (usa Service Role no backend) */
  const createUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null); setErr(null)
    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email, nome, telefone,
          role,
          orgs,                      // multi-clientes
          allowedTables,             // multi-tabelas
          defaultTable,
        }),
      })
      const j = await res.json()
      if (!res.ok || !j.ok) throw new Error(j.error || 'Falha ao criar usuário')
      setMsg('Usuário convidado com sucesso. Ele receberá e-mail para criar a senha.')
      // limpa formulário
      setEmail(''); setNome(''); setTelefone('')
      setRole('cliente'); setDefaultTable('Farol'); setAllowedTables(['Farol']); setOrgs([])
      await loadUsers()
    } catch (e: any) {
      setErr(String(e.message || e))
    }
  }

  /** Alterna ativo/inativo */
  const toggleActive = async (u: Profile) => {
    setMsg(null); setErr(null)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !u.is_active })
        .eq('user_id', u.user_id)
      if (error) throw error
      setMsg('Atualizado.')
      await loadUsers()
    } catch (e: any) {
      setErr(String(e.message || e))
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Configurações</h1>

      {/* Meu perfil */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Meu perfil</h2>
          <button onClick={loadMe}>Recarregar</button>
        </div>

        {err && (
          <div className="text-red-400 text-sm">
            Erro: {err}
          </div>
        )}

        {loading ? (
          <div>Carregando…</div>
        ) : me ? (
          <pre className="bg-neutral-900 p-4 rounded border border-neutral-800 text-xs overflow-auto">
{JSON.stringify(me, null, 2)}
          </pre>
        ) : (
          <div className="text-neutral-400 text-sm">Perfil não encontrado.</div>
        )}
      </div>

      {/* Mostra aviso somente quando já carregou e eu NÃO sou superadmin */}
      {me && me.role !== 'superadmin' && (
        <div className="text-yellow-400 text-sm">
          Somente <b>superadmin</b> pode gerenciar usuários.
        </div>
      )}

      {/* Seção de usuários (somente superadmin) */}
      {me?.role === 'superadmin' && (
        <div className="space-y-5">
          <h2 className="text-lg font-medium">Usuários</h2>

          {/* Formulário de criação */}
          <form
            onSubmit={createUser}
            className="grid grid-cols-1 md:grid-cols-6 gap-3 bg-neutral-900 p-4 rounded border border-neutral-800"
          >
            <input
              placeholder="E-mail *"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              placeholder="Nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
            <input
              placeholder="Telefone"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
            />

            <div>
              <label className="block text-xs text-neutral-400 mb-1">Papel (role)</label>
              <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
                <option value="cliente">Cliente</option>
                <option value="admin">Admin</option>
                <option value="gestor">Gestor</option>
                <option value="superadmin">Superadmin</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-neutral-400 mb-1">Tabela padrão</label>
              <select value={defaultTable} onChange={(e) => setDefaultTable(e.target.value)}>
                <option value="Farol">Farol</option>
                {/* adicione aqui novas tabelas quando existir */}
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs text-neutral-400 mb-1">Tabelas permitidas (múltiplo)</label>
              <select
                multiple
                value={allowedTables}
                onChange={(e) => {
                  const vals = Array.from(e.target.selectedOptions).map((o) => o.value)
                  setAllowedTables(vals)
                }}
                className="w-full h-24"
              >
                <option value="Farol">Farol</option>
              </select>
              <p className="text-xs text-neutral-500 mt-1">
                Segure Ctrl (Windows) ou Cmd (Mac) para selecionar múltiplos.
              </p>
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs text-neutral-400 mb-1">Clientes (múltiplo)</label>
              <select
                multiple
                value={orgs}
                onChange={(e) => {
                  const vals = Array.from(e.target.selectedOptions).map((o) => o.value)
                  setOrgs(vals)
                }}
                className="w-full h-40"
              >
                {clienteOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <p className="text-xs text-neutral-500 mt-1">
                Se nenhum cliente for selecionado, o usuário verá 0 linhas (exceto superadmin).
              </p>
            </div>

            <div className="md:col-span-6 flex justify-end gap-2">
              <button type="submit">Criar usuário</button>
            </div>
          </form>

          {msg && <div className="text-green-400 text-sm">{msg}</div>}
          {err && <div className="text-red-400 text-sm">{err}</div>}

          {/* Lista de usuários */}
          <div className="overflow-x-auto border border-neutral-800 rounded">
            <table className="min-w-full text-sm">
              <thead className="bg-neutral-900">
                <tr>
                  <th className="text-left px-3 py-2">E-mail</th>
                  <th className="text-left px-3 py-2">Nome</th>
                  <th className="text-left px-3 py-2">Role</th>
                  <th className="text-left px-3 py-2">Org</th>
                  <th className="text-left px-3 py-2">Orgs</th>
                  <th className="text-left px-3 py-2">Tabelas</th>
                  <th className="text-left px-3 py-2">Padrão</th>
                  <th className="text-left px-3 py-2">Ativo</th>
                  <th className="text-left px-3 py-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loadingUsers ? (
                  <tr><td className="px-3 py-2" colSpan={9}>Carregando…</td></tr>
                ) : users.length === 0 ? (
                  <tr><td className="px-3 py-2" colSpan={9}>Nenhum usuário.</td></tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.user_id} className="odd:bg-neutral-950 even:bg-neutral-900">
                      <td className="px-3 py-2">{u.email}</td>
                      <td className="px-3 py-2">{u.nome}</td>
                      <td className="px-3 py-2">{u.role}</td>
                      <td className="px-3 py-2">{u.org ?? '-'}</td>
                      <td className="px-3 py-2">{(u.orgs || []).join(', ') || '-'}</td>
                      <td className="px-3 py-2">{(u.allowed_tables || []).join(', ')}</td>
                      <td className="px-3 py-2">{u.default_table ?? '-'}</td>
                      <td className="px-3 py-2">{u.is_active ? 'Sim' : 'Não'}</td>
                      <td className="px-3 py-2">
                        <button onClick={() => toggleActive(u)}>
                          {u.is_active ? 'Desativar' : 'Ativar'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
