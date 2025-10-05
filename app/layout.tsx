import './globals.css'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ReactNode } from 'react'
import { createServerClient } from '../lib/supabase/server'
import { Providers } from '../components/providers'

export const metadata: Metadata = {
  title: 'CRM Farol',
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <html lang="pt-BR">
      <body>
        <Providers>
          <div className="min-h-screen grid grid-cols-[240px_1fr]">
            <aside className="border-r border-neutral-800 p-4 space-y-2">
              <div className="text-xl font-semibold">CRM Farol</div>
              <nav className="flex flex-col gap-1 mt-4">
                <Link className="hover:underline" href="/dashboard">Dashboard</Link>
                <Link className="hover:underline" href="/clientes">Clientes</Link>
                <Link className="hover:underline" href="/configuracoes">Configurações</Link>
              </nav>
              <div className="mt-8 text-sm text-neutral-400">
                {user ? `Logado: ${user.email}` : 'Não autenticado'}
              </div>
            </aside>
            <main className="p-6">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  )
}
