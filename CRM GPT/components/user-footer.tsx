'use client'
import { useRouter } from 'next/navigation'

export default function UserFooter({ email }: { email?: string | null }) {
  const router = useRouter()

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' })
    } finally {
      router.replace('/login')
      router.refresh()
    }
  }

  return (
    <div className="mt-auto pt-4 border-t border-neutral-800 text-sm">
      <div className="mb-2 text-neutral-400">
        Logado: {email ?? '-'}
      </div>
      <button className="w-full" onClick={handleSignOut}>Sair</button>
    </div>
  )
}
