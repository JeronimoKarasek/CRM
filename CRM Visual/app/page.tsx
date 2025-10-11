'use client'

import { useState, useEffect } from 'react'
// ...existing code...
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import { supabase } from '../lib/supabase'
import { Settings, Calendar, Filter } from 'lucide-react'

interface BancoV8Data {
  id: number
  Nome?: string
  telefone?: string
  cpf?: string
  saldo?: string
  simulou?: string
  digitou?: string
  'proposta fgts'?: string
  cliente?: string
  'horario da ultima resposta'?: string
  [key: string]: any
}

interface ChartConfig {
  id: string
  type: 'bar' | 'pie' | 'line'
  column: string
  period: 'day' | 'month' | 'custom'
  title: string
}

export default function Dashboard() {
  const [data, setData] = useState<BancoV8Data[]>([])
  const [filteredData, setFilteredData] = useState<BancoV8Data[]>([])
  const [totalSaldo, setTotalSaldo] = useState(0)
  const [showCustomize, setShowCustomize] = useState(false)
  const [chartConfigs, setChartConfigs] = useState<ChartConfig[]>([
    { id: '1', type: 'bar', column: 'saldo', period: 'month', title: 'Saldo por MÃªs' },
    { id: '2', type: 'pie', column: 'cliente', period: 'month', title: 'DistribuiÃ§Ã£o de Clientes' }
  ])
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: ''
  })
  const [availableColumns, setAvailableColumns] = useState<string[]>([])
  const [tables, setTables] = useState<string[]>([])
  const [selectedTable, setSelectedTable] = useState<string>('BANCO V8')

  useEffect(() => {
    fetchTables()
  }, [])

  useEffect(() => {
    fetchData()
  }, [selectedTable])
  const fetchTables = async () => {
    try {
      const { data, error } = await supabase.rpc('pg_tables')
      if (error) {
        console.error('Erro ao buscar tabelas:', error)
        return
      }
      if (data) {
        // Se pg_tables nÃ£o funcionar, pode ser necessÃ¡rio usar outra funÃ§Ã£o ou listar manualmente
        setTables(data.map((t: any) => t.tablename || t.name || t))
      }
    } catch (error) {
      console.error('Erro na conexÃ£o ao buscar tabelas:', error)
    }
  }

  useEffect(() => {
    filterDataByDate()
  }, [data, dateFilter])

  useEffect(() => {
    calculateTotalSaldo()
  }, [filteredData])

  const fetchData = async () => {
    try {
      const { data: tableData, error } = await supabase
        .from(selectedTable)
        .select('*')
      if (error) {
        console.error('Erro ao buscar dados:', error)
        return
      }
      if (tableData && tableData.length > 0) {
        setData(tableData)
        // Extrair colunas disponÃ­veis
        const columns = Object.keys(tableData[0]).filter(key => key !== 'id')
        setAvailableColumns(columns)
      }
    } catch (error) {
      console.error('Erro na conexÃ£o:', error)
    }
  }

  const filterDataByDate = () => {
    if (!dateFilter.startDate || !dateFilter.endDate) {
      setFilteredData(data)
      return
    }

    const filtered = data.filter(item => {
      const itemDate = item['horario da ultima resposta']
      if (!itemDate) return false
      
      const date = new Date(itemDate)
      const start = new Date(dateFilter.startDate)
      const end = new Date(dateFilter.endDate)
      
      return date >= start && date <= end
    })
    
    setFilteredData(filtered)
  }

  const calculateTotalSaldo = () => {
    const total = filteredData.reduce((sum, item) => {
      const saldo = item.saldo
      if (!saldo) return sum
      
      // Converter formato brasileiro (vÃ­rgula) para nÃºmero
      const numericValue = parseFloat(saldo.toString().replace(',', '.'))
      return !isNaN(numericValue) ? sum + numericValue : sum
    }, 0)
    
    setTotalSaldo(total)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const processChartData = (config: ChartConfig) => {
    if (!filteredData.length) return []

    const column = config.column
    const dataMap = new Map()

    filteredData.forEach(item => {
      const value = item[column]
      if (!value) return

      let key = value.toString()
      
      if (config.period === 'month' && item['horario da ultima resposta']) {
        const date = new Date(item['horario da ultima resposta'])
        key = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
      } else if (config.period === 'day' && item['horario da ultima resposta']) {
        const date = new Date(item['horario da ultima resposta'])
        key = date.toLocaleDateString('pt-BR')
      }

      if (column === 'saldo') {
        const numericValue = parseFloat(value.toString().replace(',', '.'))
        if (!isNaN(numericValue)) {
          dataMap.set(key, (dataMap.get(key) || 0) + numericValue)
        }
      } else {
        dataMap.set(key, (dataMap.get(key) || 0) + 1)
      }
    })

    return Array.from(dataMap.entries()).map(([name, value]) => ({
      name,
      value
    }))
  }

  const renderChart = (config: ChartConfig) => {
    const chartData = processChartData(config)
    
    if (config.type === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip formatter={(value) => config.column === 'saldo' ? formatCurrency(Number(value)) : value} />
            <Bar dataKey="value" fill="#06b6d4" />
          </BarChart>
        </ResponsiveContainer>
      )
    }

    if (config.type === 'pie') {
      const colors = ['#06b6d4', '#0891b2', '#0e7490', '#155e75', '#164e63']
      return (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${((percent as number) * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      )
    }

    if (config.type === 'line') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip formatter={(value) => config.column === 'saldo' ? formatCurrency(Number(value)) : value} />
            <Line type="monotone" dataKey="value" stroke="#06b6d4" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      )
    }
  }

  const addNewChart = () => {
    const newChart: ChartConfig = {
      id: Date.now().toString(),
      type: 'bar',
      column: availableColumns[0] || 'saldo',
      period: 'month',
      title: 'Novo GrÃ¡fico'
    }
    setChartConfigs([...chartConfigs, newChart])
  }

  const updateChart = (id: string, updates: Partial<ChartConfig>) => {
    setChartConfigs(configs => 
      configs.map(config => 
        config.id === id ? { ...config, ...updates } : config
      )
    )
  }

  const removeChart = (id: string) => {
    setChartConfigs(configs => configs.filter(config => config.id !== id))
  }

  return (
    <>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Dashboard - {selectedTable}</h1>
        <div className="mb-4">
          <label htmlFor="table-select" className="mr-2">Selecionar tabela:</label>
          <select
            id="table-select"
            value={selectedTable}
            onChange={e => setSelectedTable(e.target.value)}
            className="border rounded px-2 py-1"
          >
            {tables.map(table => (
              <option key={table} value={table}>{table}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setShowCustomize(!showCustomize)}
          className="flex items-center gap-2 bg-accent text-primary px-4 py-2 rounded-lg hover:bg-accent/80 transition-colors"
        >
          <Settings className="w-4 h-4" />
          Personalizar
        </button>
      </div>

      {/* Filtro de PerÃ­odo e Total de Saldo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-secondary p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtro por PerÃ­odo
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Data Inicial</label>
              <input
                type="date"
                value={dateFilter.startDate}
                onChange={(e) => setDateFilter({ ...dateFilter, startDate: e.target.value })}
                className="w-full bg-primary border border-accent rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Data Final</label>
              <input
                type="date"
                value={dateFilter.endDate}
                onChange={(e) => setDateFilter({ ...dateFilter, endDate: e.target.value })}
                className="w-full bg-primary border border-accent rounded px-3 py-2"
              />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 rounded-lg shadow-lg text-white">
          <h2 className="text-xl font-semibold mb-2">Total de Saldo</h2>
          <p className="text-3xl font-bold">{formatCurrency(totalSaldo)}</p>
          <p className="text-sm opacity-90 mt-2">
            {filteredData.length} registros encontrados
          </p>
        </div>
      </div>

      {/* Painel de PersonalizaÃ§Ã£o */}
      {showCustomize && (
        <div className="bg-secondary p-6 rounded-lg shadow-lg mb-8">
          <h2 className="text-xl font-semibold mb-4">Personalizar GrÃ¡ficos</h2>
          <div className="space-y-4">
            {chartConfigs.map((config) => (
              <div key={config.id} className="bg-primary p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                  <div>
                    <label className="block text-sm font-medium mb-2">TÃ­tulo</label>
                    <input
                      type="text"
                      value={config.title}
                      onChange={(e) => updateChart(config.id, { title: e.target.value })}
                      className="w-full bg-secondary border border-accent rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Tipo</label>
                    <select
                      value={config.type}
                      onChange={(e) => updateChart(config.id, { type: e.target.value as any })}
                      className="w-full bg-secondary border border-accent rounded px-3 py-2"
                    >
                      <option value="bar">Barras</option>
                      <option value="pie">Pizza</option>
                      <option value="line">Linha</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Coluna</label>
                    <select
                      value={config.column}
                      onChange={(e) => updateChart(config.id, { column: e.target.value })}
                      className="w-full bg-secondary border border-accent rounded px-3 py-2"
                    >
                      {availableColumns.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">PerÃ­odo</label>
                    <select
                      value={config.period}
                      onChange={(e) => updateChart(config.id, { period: e.target.value as any })}
                      className="w-full bg-secondary border border-accent rounded px-3 py-2"
                    >
                      <option value="day">Por Dia</option>
                      <option value="month">Por MÃªs</option>
                      <option value="custom">Personalizado</option>
                    </select>
                  </div>
                  <button
                    onClick={() => removeChart(config.id)}
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
                  >
                    Remover
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={addNewChart}
              className="w-full bg-accent text-primary py-2 rounded font-semibold hover:bg-accent/80 transition-colors"
            >
              Adicionar GrÃ¡fico
            </button>
          </div>
        </div>
      )}

      {/* GrÃ¡ficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {chartConfigs.map((config) => (
          <div key={config.id} className="bg-secondary p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-4">{config.title}</h2>
            {renderChart(config)}
          </div>
        ))}
      </div>
    </>
  );
}
