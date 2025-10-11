import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Sidebar from '../components/Sidebar';
import { ThemeProvider } from '../components/theme-provider';
import { ThemeToggle } from '../components/theme-toggle';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CRM Futurista',
  description: 'Sistema de gestão de clientes com design futurista',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <div
            className="grid grid-cols-[256px_1fr] min-h-screen transition-colors duration-200"
            style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
          >
            <div
              className="fixed top-0 left-0 h-full w-64 z-50 shadow-xl transition-colors duration-200"
              style={{ backgroundColor: 'var(--sidebar)', borderRight: '1px solid var(--border)' }}
            >
              <Sidebar />
              <div className="absolute bottom-4 left-4">
                <ThemeToggle />
              </div>
            </div>
            <main className="col-start-2 p-8 min-h-screen transition-colors duration-200">{children}</main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}

