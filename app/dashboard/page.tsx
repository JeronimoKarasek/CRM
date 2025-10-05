'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '../../lib/supabase/client'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts'

type StatusRow = { status: string | null; saldo_sum: any } // vem como string do PostgREST

export default function Dashboard() {
  const supabase = createBrowserClient()
  const [loading, setLoading] = useState(true)
  const [statusData, setStatusData] = useState<{ status: string; saldo_sum: number }[]>([])
  const [paidTotal, setPaidTotal] = useState<number>(0)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setErrorMsg(null)

      // 1) Soma(saldo) por status
      const { data: statusRows, error: e1 } = await supabase
        .from('farol_status_sum')
        .select('status,saldo_sum')
        .order('status', { ascending: true })

      if (e1) {
        console.error('farol_status_sum ->', e1)
        setErrorMsg(e1.message)
      }

      const normalized =
        (statusRows as StatusRow[] | null)?.map((r) => ({
          status: r.status ?? 'Sem status',
          saldo_sum: Number(r.saldo_sum ?? 0), // força número
        })) ?? []

      setStatusData(normalized)

      // 2) Total pago (vem como string)
      const { data: paidRow, error: e2 } = await supabase
        .from('farol_paid_sum')
        .select('total')
        .single()

      if (e2) {
        console.error('farol_paid_sum ->', e2)
        setErrorMsg((prev) => prev ?? e2.message)
      }

      setPaidTotal(Number((paidRow as any)?.total ?? 0))

      setLoading(false)
    }

    load()
  }, [supabase])

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold mb-4">Soma de Saldo por Status</h2>

        {loading ? (
          <div className="h-64 rounded bg-neutral-800 animate-pulse" />
        ) : statusData.length === 0 ? (
          <div className="h-64 rounded border border-neutral-800 flex items-center justify-center text-neutral-400">
            Sem dados para exibir
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={statusData}>
                <XAxis dataKey="status" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="saldo_sum" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {errorMsg && (
          <p className="text-red-400 text-sm mt-2">
            Erro ao carregar: {errorMsg}
          </p>
        )}
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">
          Total Pago (saldo onde pago não é nulo)
        </h2>
        <div className="text-3xl font-bold">
          R{' '}
          {paidTotal.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          }).replace('R$', '')}
        </div>
      </div>
    </div>
  )
}
