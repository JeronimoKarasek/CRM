import './globals.css'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { ReactNode } from 'react'
import { createServerClient } from '../lib/supabase/server'
import { Providers } from '../components/providers'
import UserFooter from '../components/user-footer'

export const metadata: Metadata = { title: 'CRM Farol' }

export default async function RootLayout({ children }: { children: ReactNode }) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <html lang="pt-BR">
      <body>
        <Providers>
          <div className="min-h-screen grid grid-cols-[240px_1fr]">
            <aside className="border-r border-neutral-800 p-4 flex flex-col gap-3">
              {/* Logo */}
              <div className="w-full flex items-center justify-center">
                <Image
                  src="https://gpakoffbuypbmfiwewka.supabase.co/storage/v1/object/public/Farol/Loguin%20farolchat.png"
                  alt="CRM Farol"
                  width={160}
                  height={42}
                  className="w-full max-w-[160px] h-auto object-contain"
                  priority
                />
              </div>

              <nav className="flex flex-col gap-1 mt-2">
                <Link className="hover:underline" href="/dashboard">Dashboard</Link>
                <Link className="hover:underline" href="/clientes">Clientes</Link>
                <Link className="hover:underline" href="/configuracoes">Configurações</Link>
              </nav>

              {/* Rodapé: sempre visível em todas as páginas */}
              <UserFooter email={user?.email ?? null} />
            </aside>

            <main className="p-6">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  )
}
