'use client'
export const dynamic = 'force-dynamic'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { dbGetAll } from '@/lib/db'
import { fmtDuration, calcVolume, MUSCLE_LABELS, MUSCLE_COLORS } from '@/lib/utils'
import { Share2, Home, Trophy, Flame } from 'lucide-react'

function CompleteContent() {
  const params = useSearchParams()
  const sessionId = params.get('sessionId')
  const [session, setSession] = useState<any>(null)
  const [sets, setSets] = useState<any[]>([])

  useEffect(() => {
    if (!sessionId) return
    const load = async () => {
      const [ss, st, exs] = await Promise.all([dbGetAll('sessions'), dbGetAll('sets'), dbGetAll('exercises')])
      const exMap = Object.fromEntries(exs.map((e: any) => [e.id, e]))
      setSession(ss.find((s: any) => s.id === sessionId) ?? null)
      setSets(st.filter((s: any) => s.session_id === sessionId).sort((a: any, b: any) => a.set_number - b.set_number).map((s: any) => ({ ...s, exercise: exMap[s.exercise_id] })))
    }
    load()
  }, [sessionId])

  if (!session) return <div className="flex items-center justify-center h-screen bg-bg text-white/20">Cargando...</div>

  const prs = sets.filter(s => s.is_pr)
  const vol = calcVolume(sets.map(s => ({ weight_kg: s.weight_kg, reps: s.reps })))
  const muscles = Array.from(new Set(sets.map(s => s.exercise?.muscle_group as string).filter(Boolean)))
  const byEx = sets.reduce<Record<string, any[]>>((acc, s) => { if (!acc[s.exercise_id]) acc[s.exercise_id] = []; acc[s.exercise_id].push(s); return acc }, {})

  const share = async () => {
    const text = [`🏋️ ${session.name ?? 'Entrenamiento'}`, session.duration_secs ? `⏱ ${fmtDuration(session.duration_secs)}` : '', `📊 ${sets.length} series · ${Math.round(vol)}kg`, prs.length ? `🔥 ${prs.length} PRs!` : '', '\nIronLog 💪'].filter(Boolean).join('\n')
    if (navigator.share) await navigator.share({ text })
    else { await navigator.clipboard.writeText(text); alert('Copiado al portapapeles') }
  }

  return (
    <div className="min-h-screen bg-bg px-5 pt-12 pb-10 max-w-md mx-auto">
      <div className="text-center py-8">
        <p className="text-6xl mb-4">{prs.length > 0 ? '🔥' : '✅'}</p>
        <h1 className="font-heading text-4xl text-white tracking-wide">{prs.length > 0 ? '¡Nuevos records!' : '¡Completado!'}</h1>
        <p className="text-white/40 mt-1">{session.name ?? 'Sesión libre'}</p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 mb-6">
        {[{ l: 'Duración', v: session.duration_secs ? fmtDuration(session.duration_secs) : '—' }, { l: 'Series', v: sets.length }, { l: 'Volumen', v: `${Math.round(vol)}kg` }, { l: 'PRs', v: prs.length }].map(({ l, v }) => (
          <div key={l} className="bg-card border border-border rounded-2xl p-4 text-center">
            <p className="font-heading text-3xl text-accent leading-tight">{v}</p>
            <p className="text-white/30 text-sm mt-1">{l}</p>
          </div>
        ))}
      </div>

      {muscles.length > 0 && (
        <div className="mb-5">
          <h2 className="font-heading text-xl text-white tracking-wide mb-2">Músculos</h2>
          <div className="flex flex-wrap gap-2">
            {muscles.map(m => (
              <span key={m} className="px-3 py-1.5 rounded-full text-xs font-semibold border" style={{ backgroundColor: MUSCLE_COLORS[m] + '22', borderColor: MUSCLE_COLORS[m] + '55', color: MUSCLE_COLORS[m] }}>
                {MUSCLE_LABELS[m]}
              </span>
            ))}
          </div>
        </div>
      )}

      {prs.length > 0 && (
        <div className="mb-5">
          <h2 className="font-heading text-xl text-white tracking-wide mb-2">🔥 Nuevos Records</h2>
          {prs.map((pr: any) => (
            <div key={pr.id} className="bg-red-500/10 border border-red-500/30 rounded-2xl p-3 mb-2 flex items-center gap-3">
              <p className="font-heading text-2xl text-red-400">{pr.weight_kg}kg × {pr.reps}</p>
              <p className="text-white text-sm flex-1 truncate">{pr.exercise?.name_es}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mb-6">
        <h2 className="font-heading text-xl text-white tracking-wide mb-2">Resumen</h2>
        {Object.entries(byEx).map(([exId, exSets]) => {
          const best = (exSets as any[]).reduce((b, x) => x.weight_kg > b.weight_kg ? x : b)
          return (
            <div key={exId} className="flex justify-between items-center py-2.5 border-b border-border/40 last:border-0">
              <div>
                <p className="text-white text-sm font-medium">{(exSets as any[])[0].exercise?.name_es}</p>
                <p className="text-white/20 text-xs">{(exSets as any[]).length} series · {best.weight_kg}kg×{best.reps}</p>
              </div>
              <p className="text-white/40 text-sm">{Math.round(calcVolume((exSets as any[]).map(s => ({ weight_kg: s.weight_kg, reps: s.reps }))))}kg</p>
            </div>
          )
        })}
      </div>

      <div className="space-y-2.5">
        <button onClick={share} className="w-full bg-card border border-border rounded-2xl py-3.5 text-white font-medium text-sm flex items-center justify-center gap-2"<Share2 size={16} /> Compartir</button>
        <Link href="/tabs/home" className="flex items-center justify-center gap-2 w-full bg-accent text-black font-bold py-4 rounded-2xl text-sm text-center">Ir al inicio</Link>
      </div>
    </div>
  )
}

export default function Complete() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen bg-bg text-white/20">Cargando...</div>}>
      <CompleteContent />
    </Suspense>
  )
}
