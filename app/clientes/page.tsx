'use client'

import { useEffect, useMemo, useState } from 'react'
import { createBrowserClient } from '../../lib/supabase/client'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'

interface FarolRow {
  id: string
  nome: string | null
  telefone: string | null
  cpf: string | null
  status: string | null
  saldo: number | null
  pago: string | null
  horario_da_ultima_resposta: string | null
  instancia: string | null
  banco_simulado: string | null
  uf: string | null
  cidade: string | null
}

export default function ClientesPage() {
  const supabase = createBrowserClient()
  const [rows, setRows] = useState<FarolRow[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // filtros
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [uf, setUf] = useState('')
  const [cidade, setCidade] = useState('')
  const [instancia, setInstancia] = useState('')
  const [banco, setBanco] = useState('')
  const [dataDe, setDataDe] = useState('')
  const [dataAte, setDataAte] = useState('')

  const fetchData = async () => {
    setLoading(true)
    setErrorMsg(null)

    let query = supabase
      .from('farol_view')
      .select(
        'id,nome,telefone,cpf,status,saldo,pago,horario_da_ultima_resposta,instancia,banco_simulado,uf,cidade'
      )
      .order('horario_da_ultima_resposta', { ascending: false })
      .limit(50)

    // contém (ILIKE) — aplica em múltiplas colunas
    if (q.trim()) {
      const like = `%${q.trim()}%`
      query = query.or(
        [
          `nome.ilike.${like}`,
          `cpf.ilike.${like}`,
          `telefone.ilike.${like}`,
          `status.ilike.${like}`,
          `cidade.ilike.${like}`,
          `uf.ilike.${like}`,
          `instancia.ilike.${like}`,
          `banco_simulado.ilike.${like}`,
        ].join(',')
      )
    }

    if (status) query = query.eq('status', status)
    if (uf) query = query.eq('uf', uf)
    if (cidade) query = query.ilike('cidade', `%${cidade}%`)
    if (instancia) query = query.ilike('instancia', `%${instancia}%`)
    if (banco) query = query.ilike('banco_simulado', `%${banco}%`)

    // range por data (horario_da_ultima_resposta)
    if (dataDe) query = query.gte('horario_da_ultima_resposta', dataDe)
    if (dataAte) query = query.lte('horario_da_ultima_resposta', dataAte)

    const { data, error } = await query

    if (error) {
      console.error('farol_view ->', error)
      setErrorMsg(error.message)
      setRows([])
    } else {
      const normalized = (data || []).map((r: any) => ({
        ...r,
        saldo: r.saldo !== null ? Number(r.saldo) : null,
      }))
      setRows(normalized as FarolRow[])
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const columns = useMemo<ColumnDef<FarolRow>[]>(() => [
    { accessorKey: 'nome', header: 'Nome' },
    { accessorKey: 'cpf', header: 'CPF' },
    { accessorKey: 'telefone', header: 'Telefone' },
    { accessorKey: 'status', header: 'Status' },
    {
      accessorKey: 'saldo',
      header: 'Saldo',
      cell: ({ getValue }) => {
        const v = getValue<number | null>()
        return v != null
          ? `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
          : '-'
      },
    },
    { accessorKey: 'pago', header: 'Pago' },
    { accessorKey: 'horario_da_ultima_resposta', header: 'Última Resposta' },
    { accessorKey: 'instancia', header: 'Instância' },
    { accessorKey: 'banco_simulado', header: 'Banco Simulado' },
    { accessorKey: 'uf', header: 'UF' },
    { accessorKey: 'cidade', header: 'Cidade' },
  ], [])

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Clientes</h1>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
        <input placeholder="Buscar (nome, cpf, tel, status...)" value={q} onChange={e=>setQ(e.target.value)} />
        <input placeholder="Status" value={status} onChange={e=>setStatus(e.target.value)} />
        <input placeholder="UF" value={uf} onChange={e=>setUf(e.target.value)} />
        <input placeholder="Cidade" value={cidade} onChange={e=>setCidade(e.target.value)} />
        <input placeholder="Instância" value={instancia} onChange={e=>setInstancia(e.target.value)} />
        <input placeholder="Banco simulado" value={banco} onChange={e=>setBanco(e.target.value)} />
        <input type="date" placeholder="De" value={dataDe} onChange={e=>setDataDe(e.target.value)} />
        <input type="date" placeholder="Até" value={dataAte} onChange={e=>setDataAte(e.target.value)} />
        <button onClick={fetchData}>Aplicar filtros</button>
      </div>

      {loading ? (
        <div className="h-48 rounded bg-neutral-800 animate-pulse" />
      ) : rows.length === 0 ? (
        <div className="rounded border border-neutral-800 p-6 text-neutral-400">
          Nenhum registro para exibir.
        </div>
      ) : (
        <div className="overflow-x-auto border border-neutral-800 rounded">
          <table className="min-w-full">
            <thead className="bg-neutral-900">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => (
                    <th key={h.id} className="text-left px-3 py-2 border-b border-neutral-800">
                      {flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((r) => (
                <tr key={r.id} className="odd:bg-neutral-950 even:bg-neutral-900">
                  {r.getVisibleCells().map((c) => (
                    <td key={c.id} className="px-3 py-2 border-b border-neutral-800">
                      {flexRender(c.column.columnDef.cell, c.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {errorMsg && (
        <p className="text-red-400 text-sm mt-2">Erro ao carregar: {errorMsg}</p>
      )}
    </div>
  )
}
