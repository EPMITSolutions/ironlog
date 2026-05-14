'use client'
export const dynamic = 'force-dynamic'
import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useRoutines, useWorkout } from '@/store'
import { calc1RM, fmtTime } from '@/lib/utils'

function SessionContent() {
  const router = useRouter()
  const params = useSearchParams()
  const dayId = params.get('dayId')
  const { active, load } = useRoutines()
  const { session, start, completeSet, addExtra, startRest, tick, stopRest, finish, discard } = useWorkout()
  const [elapsed, setElapsed] = useState(0)
  const [showRPE, setShowRPE] = useState(false)
  const [rpe, setRpe] = useState(7)
  const [notes, setNotes] = useState('')
  const [setInputs, setSetInputs] = useState<Record<string, { w: string, r: string }[]>>({})
  const tRef = useRef<any>(null); const rRef = useRef<any>(null)

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!session && dayId && active) {
      const day = active.days?.find((d: any) => d.id === dayId)
      if (day?.exercises?.length) start(day.id, day.name, day.exercises)
    }
  }, [active, dayId])

  useEffect(() => {
    if (!session) return
    const s = new Date(session.startedAt).getTime()
    tRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - s) / 1000)), 1000)
    return () => clearInterval(tRef.current)
  }, [session?.startedAt])

  useEffect(() => {
    if (session?.rest.active) { rRef.current = setInterval(tick, 1000) }
    else clearInterval(rRef.current)
    return () => clearInterval(rRef.current)
  }, [session?.rest.active])

  useEffect(() => {
    if (!session) return
    const init: Record<string, { w: string, r: string }[]> = {}
    for (const re of session.exercises) {
      if (!init[re.exercise_id]) {
        init[re.exercise_id] = Array.from({ length: re.target_sets }, () => ({ w: '', r: '' }))
      }
    }
    setSetInputs(prev => {
      const merged = { ...init }
      for (const k of Object.keys(prev)) if (merged[k]) merged[k] = prev[k]
      return merged
    })
  }, [session?.exercises?.length])

  const handleFinish = async () => {
    const id = await finish(notes, rpe)
    if (id) router.replace(`/workout/complete?sessionId=${id}`)
  }

  if (!session) return (
    <div className="flex flex-col items-center justify-center h-screen bg-bg gap-4">
      <p className="text-white/30">No hay entrenamiento activo</p>
      <button onClick={() => router.back()} className="border border-border rounded-xl px-6 py-3 text-white/40 text-sm">Volver</button>
    </div>
  )

  const doneSets = Object.values(session.sets).flat().filter((s: any) => s.done).length
  const totalSets = session.exercises.reduce((t: number, re: any) => t + re.target_sets, 0)
  const urgent = session.rest.active && session.rest.remaining <= 10
  const restPct = session.rest.total > 0 ? (session.rest.remaining / session.rest.total) * 100 : 0

  return (
    <div className="flex flex-col h-screen bg-bg max-w-md mx-auto">
      <div className="flex justify-between items-end px-5 pt-12 pb-3">
        <div>
          <p className="text-white/30 text-xs">En curso</p>
          <h1 className="font-heading text-3xl text-white tracking-wide">{session.name}</h1>
        </div>
        <div className="text-right">
          <p className="font-heading text-3xl text-accent tracking-widest">{fmtTime(elapsed)}</p>
          <p className="text-white/20 text-xs">{doneSets}/{totalSets} series</p>
        </div>
      </div>

      {session.rest.active && (
        <div className={`mx-5 rounded-2xl px-4 py-3 flex items-center gap-3 mb-2 border ${urgent ? 'border-red-500 bg-red-500/10' : 'border-accent bg-accent/5'}`}>
          <div>
            <p className="text-white/30 text-xs">Descanso</p>
            <p className={`font-heading text-2xl tracking-widest ${urgent ? 'text-red-400' : 'text-accent'}`}>{fmtTime(session.rest.remaining)}</p>
          </div>
          <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${restPct}%`, backgroundColor: urgent ? '#FF5757' : '#C8F135' }} />
          </div>
          <button onClick={stopRest} className="text-white/30 text-sm">Saltar</button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto no-scroll px-5 py-2 space-y-3">
        {session.exercises.map((re: any) => {
          const exSets = session.sets[re.exercise_id] ?? []
          const inputs = setInputs[re.exercise_id] ?? []
          const rows = Math.max(re.target_sets, exSets.length)

          return (
            <div key={re.id} className="bg-card border border-border rounded-2xl p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1 mr-2">
                  <p className="text-white font-semibold text-sm">{re.exercise?.name_es}</p>
                  <p className="text-white/20 text-xs mt-0.5">{re.target_sets}×{re.target_reps}–{re.target_reps_max} · {re.rest_seconds}s</p>
                </div>
                <button onClick={() => startRest(re.rest_seconds)} className="bg-surface border border-border rounded-lg px-2.5 py-1.5 text-accent text-xs flex-shrink-0">⏱ {re.rest_seconds}s</button>
              </div>

              <div className="flex gap-1 mb-1">
                {['S#', 'Ant.', 'Kg', 'Reps', '~1RM', '✓'].map((h, i) => (
                  <span key={i} className={`text-white/20 text-[10px] text-center ${i === 0 ? 'w-6' : i === 1 ? 'w-10' : i < 4 ? 'flex-1' : i === 4 ? 'w-9' : 'w-8'}`}>{h}</span>
                ))}
              </div>

              {Array.from({ length: rows }, (_, idx) => {
                const done = exSets[idx]?.done
                const inp = inputs[idx] ?? { w: '', r: '' }
                const orm = inp.w && inp.r ? calc1RM(parseFloat(inp.w) || 0, parseInt(inp.r) || 0) : null
                return (
                  <div key={idx} className={`flex items-center gap-1 py-2 border-b border-border/30 last:border-0 ${done ? 'opacity-50' : ''}`}>
                    <span className="text-accent text-xs font-bold w-6 text-center">S{idx + 1}</span>
                    <span className="text-white/20 text-xs w-10 text-center">{re.target_reps ? `${re.target_reps}r` : '—'}</span>
                    <input type="number" className="flex-1 bg-surface border border-border rounded-lg py-2 text-white text-sm text-center outline-none focus:border-accent min-w-0"
                      value={inp.w} onChange={e => setSetInputs(prev => { const a = [...(prev[re.exercise_id] ?? [])]; if (!a[idx]) a[idx] = { w: '', r: '' }; a[idx] = { ...a[idx], w: e.target.value }; return { ...prev, [re.exercise_id]: a } })}
                      placeholder="kg" disabled={done} />
                    <span className="text-white/20 text-xs">×</span>
                    <input type="number" className="flex-1 bg-surface border border-border rounded-lg py-2 text-white text-sm text-center outline-none focus:border-accent min-w-0"
                      value={inp.r} onChange={e => setSetInputs(prev => { const a = [...(prev[re.exercise_id] ?? [])]; if (!a[idx]) a[idx] = { w: '', r: '' }; a[idx] = { ...a[idx], r: e.target.value }; return { ...prev, [re.exercise_id]: a } })}
                      placeholder="r" disabled={done} />
                    <span className="text-white/20 text-[10px] w-9 text-center">{orm && orm > 0 ? `~${Math.round(orm)}` : '—'}</span>
                    <button onClick={() => {
                      const w = parseFloat(inp.w), r = parseInt(inp.r)
                      if (!w || !r) return
                      completeSet(re.exercise_id, w, r, false)
                      startRest(re.rest_seconds)
                    }} disabled={done} className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${done ? 'bg-accent text-black' : 'bg-surface border border-border text-white/20'}`}>✓</button>
                  </div>
                )
              })}

              <button onClick={() => {
                addExtra(re.exercise_id)
                setSetInputs(prev => { const a = [...(prev[re.exercise_id] ?? [])]; a.push({ w: '', r: '' }); return { ...prev, [re.exercise_id]: a } })
              }} className="mt-2 w-full border border-dashed border-border rounded-lg py-2 text-white/20 text-xs">+ Serie extra</button>
            </div>
          )
        })}

        <button onClick={() => setShowRPE(true)} className="w-full bg-accent text-black font-bold py-4 rounded-2xl text-sm">🏁 Terminar</button>
        <button onClick={() => { if (confirm('¿Descartar sesión?')) { discard(); router.push('/tabs/home') } }} className="w-full border border-red-500/30 text-red-400 py-3 rounded-2xl text-sm">Descartar</button>
        <div className="h-8" />
      </div>

      {showRPE && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center px-5">
          <div className="w-full max-w-md bg-surface rounded-3xl p-6 space-y-4">
            <h2 className="font-heading text-3xl text-white tracking-wide text-center">¿Cómo fue?</h2>
            <p className="font-heading text-7xl text-accent text-center">{rpe}</p>
            <p className="text-white/40 text-sm text-center">{['', '', '', '', '', 'Fácil', 'Moderado', 'Duro', 'Muy duro', 'Al límite', 'Máximo'][rpe]}</p>
            <div className="flex justify-center gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                <button key={n} onClick={() => setRpe(n)} className={`w-8 h-8 rounded-full text-xs font-bold ${rpe >= n ? 'bg-accent text-black' : 'bg-card border border-border text-white/30'}`}>{n}</button>
              ))}
            </div>
            <textarea className="w-full bg-card border border-border rounded-xl p-3 text-white text-sm resize-none outline-none focus:border-accent" rows={2} placeholder="Notas (opcional)" value={notes} onChange={e => setNotes(e.target.value)} />
            <button onClick={handleFinish} className="w-full bg-accent text-black font-bold py-4 rounded-xl text-sm">Guardar y terminar</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Session() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen bg-bg text-white/20">Cargando...</div>}>
      <SessionContent />
    </Suspense>
  )
}
