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

type TableOpt = { table_name: string; display_name: string }

export default function ConfiguracoesPage() {
  const supabase = createBrowserClient()

  // estado geral
  const [me, setMe] = useState<Profile | null>(null)
  const [loadingMe, setLoadingMe] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // lista de usuários (apenas quando superadmin)
  const [users, setUsers] = useState<Profile[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  // opções do formulário
  const [tableOptions, setTableOptions] = useState<TableOpt[]>([])
  const [clienteOptions, setClienteOptions] = useState<string[]>([])

  // formulário de criação
  const [email, setEmail] = useState('')
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [role, setRole] = useState<Role>('cliente')
  const [defaultTable, setDefaultTable] = useState<string>('Farol')
  const [allowedTables, setAllowedTables] = useState<string[]>(['Farol'])
  const [orgs, setOrgs] = useState<string[]>([])
  const [msg, setMsg] = useState<string | null>(null)

  // util: parse seguro de JSON (evita erro quando vem HTML)
  const safeParseJson = async (r: Response) => {
    const ct = r.headers.get('content-type') || ''
    if (!ct.includes('application/json')) {
      const t = await r.text()
      throw new Error(`API ${r.url} não retornou JSON (status ${r.status}): ${t.slice(0, 120)}`)
    }
    return r.json()
  }

  // 1) carrega meu perfil (tenta RLS, depois fallback Service Role)
  const loadMe = async () => {
    setLoadingMe(true)
    setError(null)
    try {
      const { data: { user }, error: uerr } = await supabase.auth.getUser()
      if (uerr) throw new Error(uerr.message)
      if (!user) throw new Error('Usuário não autenticado')

      const { data, error } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
      if (error || !data) {
        const r = await fetch('/api/me', { cache: 'no-store' })
        const j = await safeParseJson(r)
        if (!r.ok || !j.ok) throw new Error(j.error || 'Falha no /api/me')
        setMe(j.data as Profile)
      } else {
        setMe(data as Profile)
      }
    } catch (e: any) {
      setError(String(e.message || e))
      setMe(null)
    } finally {
      setLoadingMe(false)
    }
  }

  // 2) carrega opções de TABELAS (whitelist do CRM)
  const loadTableOptions = async () => {
    try {
      const { data, error } = await supabase.rpc('rpc_list_crm_tables')
      if (error) throw error
      const opts = (data || []) as TableOpt[]
      setTableOptions(opts)
      // se não tiver default no form, escolhe o primeiro habilitado
      if (opts.length && !defaultTable) {
        setDefaultTable(opts[0].table_name)
        setAllowedTables([opts[0].table_name])
      }
    } catch (e: any) {
      console.error('rpc_list_crm_tables ->', e?.message || e)
    }
  }

  // 3) carrega opções de CLIENTES da tabela padrão
  const loadClienteOptions = async (tbl?: string) => {
    try {
      const table = tbl || defaultTable || 'Farol'
      const { data, error } = await supabase.rpc('rpc_distinct_clientes_for', { _table: table })
      if (error) throw error
      setClienteOptions((data || []).map((d: any) => d.cliente))
    } catch (e: any) {
      console.error('rpc_distinct_clientes_for ->', e?.message || e)
      setClienteOptions([])
    }
  }

  // 4) lista de usuários (para superadmin)
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
      setError(String(e.message || e))
    } finally {
      setLoadingUsers(false)
    }
  }

  // efeitos
  useEffect(() => { (async () => { await loadMe() })() }, [])
  useEffect(() => {
    (async () => {
      if (!me) return
      await loadTableOptions()
      await loadClienteOptions(defaultTable)
      await loadUsers()
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.role])

  useEffect(() => { (async () => {
    if (!me) return
    await loadClienteOptions(defaultTable)
  })() }, [defaultTable]) // quando troca a tabela padrão, recarrega clientes

  // criar usuário
  const createUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null); setError(null)
    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email, nome, telefone,
          role,
          orgs,               // multi-clientes
          allowedTables,      // multi-tabelas
          defaultTable,
        })
      })
      const j = await safeParseJson(res)
      if (!res.ok || !j.ok) throw new Error(j.error || 'Falha ao criar usuário')
      setMsg('Usuário convidado com sucesso. Ele receberá um e-mail para criar a senha.')
      // limpa formulário
      setEmail(''); setNome(''); setTelefone('')
      setRole('cliente'); setDefaultTable(tableOptions[0]?.table_name || 'Farol')
      setAllowedTables([tableOptions[0]?.table_name || 'Farol'])
      setOrgs([])
      await loadUsers()
    } catch (e: any) {
      setError(String(e.message || e))
    }
  }

  // ativar/desativar
  const toggleActive = async (u: Profile) => {
    setMsg(null); setError(null)
    try {
      const { error } = await supabase.from('profiles').update({ is_active: !u.is_active }).eq('user_id', u.user_id)
      if (error) throw error
      setMsg('Atualizado.')
      await loadUsers()
    } catch (e: any) {
      setError(String(e.message || e))
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

        {error && (
          <div className="text-red-400 text-sm">
            Erro: {error}
          </div>
        )}

        {loadingMe ? (
          <div>Carregando…</div>
        ) : me ? (
          <pre className="bg-neutral-900 p-4 rounded border border-neutral-800 text-xs overflow-auto">
{JSON.stringify(me, null, 2)}
          </pre>
        ) : (
          <div className="text-neutral-400 text-sm">Perfil não encontrado.</div>
        )}
      </div>

      {/* aviso só quando já carregou e NÃO é superadmin */}
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

            {/* Tabela padrão (dinâmico) */}
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Tabela padrão</label>
              <select
                value={defaultTable}
                onChange={(e) => setDefaultTable(e.target.value)}
              >
                {tableOptions.length === 0 ? (
                  <option value="Farol">Farol</option>
                ) : tableOptions.map(t => (
                  <option key={t.table_name} value={t.table_name}>{t.display_name}</option>
                ))}
              </select>
            </div>

            {/* Tabelas permitidas (múltiplo, dinâmico) */}
            <div className="md:col-span-3">
              <label className="block text-xs text-neutral-400 mb-1">Tabelas permitidas (múltiplo)</label>
              <select
                multiple
                value={allowedTables}
                onChange={(e) => {
                  const vals = Array.from(e.target.selectedOptions).map(o => o.value)
                  setAllowedTables(vals)
                }}
                className="w-full h-24"
              >
                {tableOptions.length === 0 ? (
                  <option value="Farol">Farol</option>
                ) : tableOptions.map(t => (
                  <option key={t.table_name} value={t.table_name}>{t.display_name}</option>
                ))}
              </select>
              <p className="text-xs text-neutral-500 mt-1">Segure Ctrl (Windows) ou Cmd (Mac) para selecionar múltiplos.</p>
            </div>

            {/* Clientes da tabela padrão (múltiplo) */}
            <div className="md:col-span-3">
              <label className="block text-xs text-neutral-400 mb-1">Clientes (múltiplo)</label>
              <select
                multiple
                value={orgs}
                onChange={(e) => {
                  const vals = Array.from(e.target.selectedOptions).map(o => o.value)
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
          {error && <div className="text-red-400 text-sm">{error}</div>}

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
