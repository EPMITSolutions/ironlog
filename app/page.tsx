'use client'
export const dynamic = 'force-dynamic'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useProfile } from '@/store'

export default function Root() {
  const { profile, initialized, init } = useProfile()
  const router = useRouter()
  useEffect(() => { init() }, [])
  useEffect(() => {
    if (!initialized) return
    router.replace(!profile?.full_name ? '/setup' : '/tabs/home')
  }, [initialized, profile])
  return (
    <div className="flex items-center justify-center h-screen bg-bg">
      <h1 className="font-heading text-6xl text-accent tracking-widest leading-none">IRON<br/>LOG</h1>
    </div>
  )
}
