'use client'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'

type StatusSum = { status: string | null, saldo_sum: number }

export default function Dashboard() {
  const supabase = createBrowserClient()
  const [statusData, setStatusData] = useState<StatusSum[]>([])
  const [paidTotal, setPaidTotal] = useState<number>(0)

  useEffect(() => {
    const load = async () => {
      // 1) Soma(saldo) por status
      const { data: statusRows, error: e1 } = await supabase
        .from('farol_status_sum')
        .select('status,saldo_sum')
        .order('status', { ascending: true })
      if (!e1 && statusRows) setStatusData(statusRows as any)

      // 2) Total Pago
      const { data: paidRows, error: e2 } = await supabase
        .from('farol_paid_sum')
        .select('total')
        .single()
      if (!e2 && paidRows) setPaidTotal(Number(paidRows.total || 0))
    }
    load()
  }, [])

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold mb-4">Soma de Saldo por Status</h2>
        <div className="h-64">
          <ResponsiveContainer>
            <BarChart data={statusData}>
              <XAxis dataKey="status"/>
              <YAxis/>
              <Tooltip/>
              <Bar dataKey="saldo_sum" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div>
        <h2 className="text-xl font-semibold mb-2">Total Pago (saldo onde pago não é nulo)</h2>
        <div className="text-3xl font-bold">R$ {paidTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
      </div>
    </div>
  )
}
