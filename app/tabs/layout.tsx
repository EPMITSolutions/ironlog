'use client'
export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useProfile } from '@/store'
import { useEffect } from 'react'
import { Home, ClipboardList, TrendingUp, History, User } from 'lucide-react'

const TABS = [
  { href: '/tabs/home',     label: 'Inicio',    Icon: Home },
  { href: '/tabs/routine',  label: 'Rutina',    Icon: ClipboardList },
  { href: '/tabs/progress', label: 'Progreso',  Icon: TrendingUp },
  { href: '/tabs/history',  label: 'Historial', Icon: History },
  { href: '/tabs/profile',  label: 'Perfil',    Icon: User },
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
          {TABS.map(({ href, label, Icon }) => {
            const active = path === href
            return (
              <Link key={href} href={href} className="flex-1 flex flex-col items-center py-2.5 gap-1">
                <Icon size={20} className={active ? 'text-accent' : 'text-white/30'} strokeWidth={active ? 2.5 : 1.8} />
                <span className={`text-[10px] ${active ? 'text-accent font-semibold' : 'text-white/30'}`}>{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
