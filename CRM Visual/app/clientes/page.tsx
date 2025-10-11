'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Filter, Search } from 'lucide-react'

interface Cliente {
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

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [filteredClientes, setFilteredClientes] = useState<Cliente[]>([])
  const [filters, setFilters] = useState({
    cliente: '',
    cpf: '',
    telefone: '',
    Nome: '',
    'proposta fgts': '',
    dataInicial: '',
    dataFinal: ''
  })

  useEffect(() => {
    fetchClientes()
  }, [])

  useEffect(() => {
    filterClientes()
  }, [clientes, filters])

  const fetchClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('BANCO V8')
        .select('*')
        .order('id', { ascending: false })
      
      if (error) {
        console.error('Erro ao buscar clientes:', error)
      } else {
        setClientes(data || [])
      }
    } catch (error) {
      console.error('Erro na conexÃ£o:', error)
    }
  }

  const filterClientes = () => {
    let filtered = [...clientes]

    // Filtros de texto (contÃ©m)
    Object.entries(filters).forEach(([key, value]) => {
      if (value && key !== 'dataInicial' && key !== 'dataFinal') {
        filtered = filtered.filter(cliente => {
          const clienteValue = cliente[key]?.toString().toLowerCase() || ''
          return clienteValue.includes(value.toLowerCase())
        })
      }
    })

    // Filtro por data
    if (filters.dataInicial || filters.dataFinal) {
      filtered = filtered.filter(cliente => {
        const clienteDate = cliente['horario da ultima resposta']
        if (!clienteDate) return false

        const date = new Date(clienteDate)
        const startDate = filters.dataInicial ? new Date(filters.dataInicial) : null
        const endDate = filters.dataFinal ? new Date(filters.dataFinal) : null

        if (startDate && date < startDate) return false
        if (endDate && date > endDate) return false

        return true
      })
    }

    setFilteredClientes(filtered)
  }

  const formatCurrency = (value: string | undefined) => {
    if (!value) return 'R$ 0,00'
    
    // Se jÃ¡ estÃ¡ no formato brasileiro, apenas adiciona R$
    if (value.includes(',')) {
      return `R$ ${value}`
    }
    
    // Se Ã© um nÃºmero, converte para formato brasileiro
    const numericValue = parseFloat(value.toString())
    if (!isNaN(numericValue)) {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(numericValue)
    }
    
    return value
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-'
    
    try {
      const date = new Date(dateString)
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateString
    }
  }

  const clearFilters = () => {
    setFilters({
      cliente: '',
      cpf: '',
      telefone: '',
      Nome: '',
      'proposta fgts': '',
      dataInicial: '',
      dataFinal: ''
    })
  }

  return (
    <div className="w-full">
      <div className="flex flex-col space-y-6">
        <h1 className="text-3xl font-bold mb-8">Clientes - BANCO V8</h1>

        {/* Filtros */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtros
            </h2>
            <button
              onClick={clearFilters}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
            >
              Limpar Filtros
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--foreground)' }}>Cliente</label>
              <input
                type="text"
                placeholder="Buscar por cliente..."
                value={filters.cliente}
                onChange={(e) => setFilters({ ...filters, cliente: e.target.value })}
                className="w-full rounded px-3 py-2"
                style={{
                  backgroundColor: 'var(--input)',
                  borderColor: 'var(--border)',
                  color: 'var(--input-foreground)',
                  border: '1px solid'
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">CPF</label>
              <input
                type="text"
                placeholder="Buscar por CPF..."
                value={filters.cpf}
                onChange={(e) => setFilters({ ...filters, cpf: e.target.value })}
                className="w-full bg-primary border border-accent rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Telefone</label>
              <input
                type="text"
                placeholder="Buscar por telefone..."
                value={filters.telefone}
                onChange={(e) => setFilters({ ...filters, telefone: e.target.value })}
                className="w-full bg-primary border border-accent rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Nome</label>
              <input
                type="text"
                placeholder="Buscar por nome..."
                value={filters.Nome}
                onChange={(e) => setFilters({ ...filters, Nome: e.target.value })}
                className="w-full bg-primary border border-accent rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Proposta FGTS</label>
              <input
                type="text"
                placeholder="Buscar por proposta FGTS..."
                value={filters['proposta fgts']}
                onChange={(e) => setFilters({ ...filters, 'proposta fgts': e.target.value })}
                className="w-full bg-primary border border-accent rounded px-3 py-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Data Inicial</label>
              <input
                type="date"
                value={filters.dataInicial}
                onChange={(e) => setFilters({ ...filters, dataInicial: e.target.value })}
                className="w-full bg-primary border border-accent rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Data Final</label>
              <input
                type="date"
                value={filters.dataFinal}
                onChange={(e) => setFilters({ ...filters, dataFinal: e.target.value })}
                className="w-full bg-primary border border-accent rounded px-3 py-2"
              />
            </div>
          </div>
        </div>

        {/* Resumo */}
        <div className="bg-gradient-to-r from-blue-500 to-cyan-600 p-6 rounded-lg shadow-lg text-white mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold mb-2">Resumo</h2>
              <p className="text-lg">
                <strong>{filteredClientes.length}</strong> clientes encontrados
              </p>
            </div>
            <Search className="w-12 h-12 opacity-50" />
          </div>
        </div>

        {/* Tabela de Clientes */}
        <div className="bg-secondary p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold mb-4">Lista de Clientes</h2>
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="border-b border-accent">
                  <th className="text-left py-3 px-2">Nome</th>
                  <th className="text-left py-3 px-2">Telefone</th>
                  <th className="text-left py-3 px-2">CPF</th>
                  <th className="text-left py-3 px-2">Saldo</th>
                  <th className="text-left py-3 px-2">Simulou</th>
                  <th className="text-left py-3 px-2">Digitou</th>
                  <th className="text-left py-3 px-2">Proposta FGTS</th>
                  <th className="text-left py-3 px-2">Cliente</th>
                  <th className="text-left py-3 px-2">Ãšltima Resposta</th>
                </tr>
              </thead>
              <tbody>
                {filteredClientes.length > 0 ? (
                  filteredClientes.map((cliente) => (
                    <tr key={cliente.id} className="border-b border-accent/20 hover:bg-primary/50 transition-colors">
                      <td className="py-3 px-2">{cliente.Nome || '-'}</td>
                      <td className="py-3 px-2">{cliente.telefone || '-'}</td>
                      <td className="py-3 px-2">{cliente.cpf || '-'}</td>
                      <td className="py-3 px-2">
                        <span className={`font-semibold ${
                          cliente.saldo && !isNaN(parseFloat(cliente.saldo.toString().replace(',', '.'))) 
                            ? 'text-green-600' 
                            : 'text-gray-500'
                        }`}>
                          {formatCurrency(cliente.saldo)}
                        </span>
                      </td>
                      <td className="py-3 px-2">{cliente.simulou || '-'}</td>
                      <td className="py-3 px-2">{cliente.digitou || '-'}</td>
                      <td className="py-3 px-2">{cliente['proposta fgts'] || '-'}</td>
                      <td className="py-3 px-2">{cliente.cliente || '-'}</td>
                      <td className="py-3 px-2 text-sm">
                        {formatDate(cliente['horario da ultima resposta'])}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-gray-500">
                      Nenhum cliente encontrado com os filtros aplicados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
