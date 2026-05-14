'use client'
export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useProfile } from '@/store'
import { useEffect } from 'react'

const TABS = [
  { href: '/tabs/home', emoji: '🏠', label: 'Inicio' },
  { href: '/tabs/routine', emoji: '📋', label: 'Rutina' },
  { href: '/tabs/progress', emoji: '📈', label: 'Progreso' },
  { href: '/tabs/history', emoji: '📅', label: 'Historial' },
  { href: '/tabs/profile', emoji: '👤', label: 'Perfil' },
]

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  const { initialized, init } = useProfile()
  useEffect(() => { if (!initialized) init() }, [])
  return (
    <div className="flex flex-col h-screen bg-bg max-w-md mx-auto relative">
      <main className="flex-1 overflow-y-auto no-scroll pb-20">{children}</main>
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-surface border-t border-border z-50">
        <div className="flex" style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}>
          {TABS.map(t => {
            const active = path === t.href
            return (
              <Link key={t.href} href={t.href} className="flex-1 flex flex-col items-center py-2 gap-0.5">
                <span className="text-xl">{t.emoji}</span>
                <span className={`text-[10px] ${active ? 'text-accent font-semibold' : 'text-white/40'}`}>{t.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
