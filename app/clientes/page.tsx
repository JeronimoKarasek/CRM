'use client'
import { useEffect, useMemo, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'

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

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('farol_view')
        .select('id,nome,telefone,cpf,status,saldo,pago,horario_da_ultima_resposta,instancia,banco_simulado,uf,cidade')
        .order('horario_da_ultima_resposta', { ascending: false })
        .limit(50)
      if (!error && data) setRows(data as any)
    }
    load()
  }, [])

  const columns = useMemo<ColumnDef<FarolRow>[]>(() => [
    { accessorKey: 'nome', header: 'Nome' },
    { accessorKey: 'cpf', header: 'CPF' },
    { accessorKey: 'telefone', header: 'Telefone' },
    { accessorKey: 'status', header: 'Status' },
    { accessorKey: 'saldo', header: 'Saldo', cell: ({ getValue }) => {
      const v = getValue<number | null>()
      return v != null ? `R$ ${v.toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : '-'
    } },
    { accessorKey: 'pago', header: 'Pago' },
    { accessorKey: 'horario_da_ultima_resposta', header: 'Última Resposta' },
  ], [])

  const table = useReactTable({ data: rows, columns, getCoreRowModel: getCoreRowModel() })

  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Clientes</h1>
      <div className="overflow-x-auto border border-neutral-800 rounded">
        <table className="min-w-full">
          <thead className="bg-neutral-900">
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(h => (
                  <th key={h.id} className="text-left px-3 py-2 border-b border-neutral-800">
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(r => (
              <tr key={r.id} className="odd:bg-neutral-950 even:bg-neutral-900">
                {r.getVisibleCells().map(c => (
                  <td key={c.id} className="px-3 py-2 border-b border-neutral-800">
                    {flexRender(c.column.columnDef.cell, c.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
