'use client'

import { useEffect, useMemo, useState } from 'react'
import { createBrowserClient } from '../../lib/supabase/client'
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  LineChart, Line, CartesianGrid
} from 'recharts'

type StatusSumRow = { status: string | null; saldo_sum: number }
type MonthlyRow   = { mes: string | Date; total_saldo: number; total_pago: number }

export default function Dashboard() {
  const supabase = createBrowserClient()

  // filtros
  const today = new Date()
  const firstMonth = new Date(today.getFullYear(), today.getMonth() - 5, 1) // últimos 6 meses
  const [from, setFrom] = useState(firstMonth.toISOString().slice(0,10))
  const [to, setTo]     = useState(today.toISOString().slice(0,10))
  const [statuses, setStatuses] = useState<string[]>([])
  const [allStatuses, setAllStatuses] = useState<string[]>([])

  // dados
  const [statusData, setStatusData]   = useState<{status:string, saldo_sum:number}[]>([])
  const [monthlyData, setMonthlyData] = useState<MonthlyRow[]>([])
  const [paidTotal, setPaidTotal]     = useState<number>(0)
  const [loading, setLoading]         = useState(true)
  const [errorMsg, setErrorMsg]       = useState<string | null>(null)

  // carrega lista de status para os checkboxes
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('farol_view')
        .select('status')
        .not('status','is',null)
        .limit(2000) // suficiente pra trazer todos os distintos
      const unique = Array.from(new Set((data || []).map((d:any)=>d.status).filter(Boolean))).sort()
      setAllStatuses(unique as string[])
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchData = async () => {
    setLoading(true); setErrorMsg(null)

    // 1) barras por status
    const { data: statusRows, error: e1 } = await supabase.rpc('rpc_status_sum', {
      _from: from || null, _to: to || null, _statuses: (statuses.length ? statuses : null)
    })
    if (e1) setErrorMsg(e1.message)
    const statusNormalized = (statusRows || []).map((r:any) => ({
      status: r.status ?? 'Sem status',
      saldo_sum: Number(r.saldo_sum ?? 0),
    }))
    setStatusData(statusNormalized)

    // 2) linha mensal (total_saldo x total_pago)
    const { data: monthlyRows, error: e2 } = await supabase.rpc('rpc_monthly_growth', {
      _from: from || null, _to: to || null, _statuses: (statuses.length ? statuses : null)
    })
    if (e2) setErrorMsg(prev => prev ?? e2.message)
    const monthlyNormalized = (monthlyRows || []).map((r:any) => ({
      mes: r.mes, total_saldo: Number(r.total_saldo || 0), total_pago: Number(r.total_pago || 0)
    }))
    setMonthlyData(monthlyNormalized)

    // 3) total pago (sem filtros de status/período — se quiser aplicar, refazemos via RPC tbm)
    const { data: paidRow } = await supabase
      .from('farol_paid_sum').select('total').single()
    setPaidTotal(Number((paidRow as any)?.total ?? 0))

    setLoading(false)
  }

  useEffect(() => { fetchData() }, []) // primeira carga

  const toggleStatus = (s: string) => {
    setStatuses(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    )
  }

  const applyFilters = () => { fetchData() }

  return (
    <div className="space-y-8">
      {/* FILTROS */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <div>
            <div className="text-xs mb-1 text-neutral-400">Período (De)</div>
            <input type="date" value={from} onChange={e=>setFrom(e.target.value)} />
          </div>
          <div>
            <div className="text-xs mb-1 text-neutral-400">Período (Até)</div>
            <input type="date" value={to} onChange={e=>setTo(e.target.value)} />
          </div>
          <div className="md:col-span-2 flex items-end">
            <button onClick={applyFilters}>Aplicar filtros</button>
          </div>
        </div>

        <div className="text-xs text-neutral-400">Status (selecione para incluir):</div>
        <div className="flex flex-wrap gap-2 max-h-28 overflow-auto border border-neutral-800 p-2 rounded">
          {allStatuses.length === 0 ? (
            <span className="text-neutral-500 text-sm">Carregando status…</span>
          ) : allStatuses.map((s) => (
            <label key={s} className="inline-flex items-center gap-2 text-sm bg-neutral-900 px-2 py-1 rounded border border-neutral-800">
              <input type="checkbox"
                checked={statuses.includes(s)}
                onChange={()=>toggleStatus(s)}
              />
              <span>{s}</span>
            </label>
          ))}
        </div>
      </div>

      {/* BARRAS: Soma por Status */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Soma de Saldo por Status</h2>
        {loading ? (
          <div className="h-64 rounded bg-neutral-800 animate-pulse" />
        ) : statusData.length === 0 ? (
          <div className="h-64 rounded border border-neutral-800 flex items-center justify-center text-neutral-400">Sem dados para exibir</div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis tickFormatter={(v)=>v.toLocaleString('pt-BR')} />
                <Tooltip formatter={(v)=>`R$ ${(Number(v)||0).toLocaleString('pt-BR', {minimumFractionDigits:2})}`} />
                <Legend />
                <Bar dataKey="saldo_sum" name="Saldo" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {errorMsg && <p className="text-red-400 text-sm mt-2">Erro ao carregar: {errorMsg}</p>}
      </div>

      {/* LINHA: Crescimento Mensal (Pago x Saldo) */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Crescimento Mensal (Pago × Saldo)</h2>
        <div className="h-64">
          <ResponsiveContainer>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" tickFormatter={(v)=> new Date(v).toLocaleDateString('pt-BR', {month:'2-digit', year:'2-digit'})} />
              <YAxis tickFormatter={(v)=>v.toLocaleString('pt-BR')} />
              <Tooltip formatter={(v)=>`R$ ${(Number(v)||0).toLocaleString('pt-BR', {minimumFractionDigits:2})}`} />
              <Legend />
              <Line type="monotone" dataKey="total_pago" name="Pago" />
              <Line type="monotone" dataKey="total_saldo" name="Saldo" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* TOTAL PAGO (global) */}
      <div>
        <h2 className="text-xl font-semibold mb-2">Total Pago</h2>
        <div className="text-3xl font-bold">
          R {paidTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </div>
      </div>
    </div>
  )
}
