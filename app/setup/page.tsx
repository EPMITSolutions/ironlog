'use client'
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useProfile } from '@/store'
import { GOAL_LABELS } from '@/lib/utils'

export default function Setup() {
  const { save } = useProfile()
  const router = useRouter()
  const [name, setName] = useState('')
  const [goal, setGoal] = useState('hypertrophy')
  const [err, setErr] = useState('')

  const go = async () => {
    if (!name.trim()) { setErr('Escribe tu nombre'); return }
    await save(name.trim(), goal)
    router.replace('/tabs/home')
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col justify-center px-6 py-10">
      <div className="mb-12">
        <h1 className="font-heading text-7xl text-accent leading-none tracking-widest">IRON<br/>LOG</h1>
        <p className="text-white/70 text-base mt-3">Tu diario de entrenamiento personal</p>
        <p className="text-white/30 text-sm mt-1">Sin cuenta · Sin servidor · 100% offline</p>
      </div>
      <div className="space-y-5">
        <div>
          <label className="text-white/40 text-xs uppercase tracking-widest block mb-2">¿Cómo te llamas?</label>
          <input className={`w-full bg-card border rounded-xl px-4 py-3.5 text-white text-base outline-none focus:border-accent transition-colors ${err ? 'border-red-500' : 'border-border'}`}
            placeholder="Tu nombre" value={name} onChange={e => { setName(e.target.value); setErr('') }} autoFocus />
          {err && <p className="text-red-400 text-sm mt-1">{err}</p>}
        </div>
        <div>
          <label className="text-white/40 text-xs uppercase tracking-widest block mb-3">Objetivo</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(GOAL_LABELS).map(([k, v]) => (
              <button key={k} onClick={() => setGoal(k)}
                className={`px-4 py-2 rounded-xl border text-sm transition-all ${goal === k ? 'border-accent bg-accent/20 text-accent font-semibold' : 'border-border bg-card text-white/50'}`}>{v}</button>
            ))}
          </div>
        </div>
        <button onClick={go} className="w-full bg-accent text-black font-bold text-base py-4 rounded-xl mt-2">Empezar →</button>
        <p className="text-white/20 text-xs text-center">Datos guardados solo en este dispositivo</p>
      </div>
    </div>
  )
}
