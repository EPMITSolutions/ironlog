'use client'
export const dynamic = 'force-dynamic'
import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useRoutines, useWorkout } from '@/store'
import { dbGetAll } from '@/lib/db'
import { calc1RM, fmtTime, calcVolume } from '@/lib/utils'

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
  const [setInputs, setSetInputs] = useState<Record<string, { w: string, r: string, warmup: boolean }[]>>({})
  const [lastSession, setLastSession] = useState<Record<string, any[]>>({}) // historial última sesión
  const [showHistory, setShowHistory] = useState<string | null>(null) // exerciseId con historial abierto
  const tRef = useRef<any>(null)
  const rRef = useRef<any>(null)

  useEffect(() => { load() }, [])

  // Cargar historial de la última sesión por ejercicio
  useEffect(() => {
    if (!session) return
    const loadHistory = async () => {
      const [allSets, allSessions] = await Promise.all([dbGetAll('sets'), dbGetAll('sessions')])
      const finishedSessions = allSessions.filter((s: any) => s.finished_at).sort((a: any, b: any) => b.started_at.localeCompare(a.started_at))
      const history: Record<string, any[]> = {}
      for (const re of session.exercises) {
        // Buscar las series del ejercicio en sesiones anteriores
        const prevSets = allSets
          .filter((s: any) => s.exercise_id === re.exercise_id && !s.is_warmup)
          .map((s: any) => ({ ...s, session: finishedSessions.find((fs: any) => fs.id === s.session_id) }))
          .filter((s: any) => s.session)
          .sort((a: any, b: any) => b.session.started_at.localeCompare(a.session.started_at))
        if (prevSets.length > 0) {
          // Agrupar por sesión y coger la más reciente
          const lastSessionId = prevSets[0].session_id
          history[re.exercise_id] = prevSets.filter((s: any) => s.session_id === lastSessionId)
        }
      }
      setLastSession(history)
    }
    loadHistory()
  }, [session?.exercises?.length])

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

  // Inicializar inputs rellenando con datos de la última sesión
  useEffect(() => {
    if (!session) return
    const init: Record<string, { w: string, r: string, warmup: boolean }[]> = {}
    for (const re of session.exercises) {
      const prev = lastSession[re.exercise_id] ?? []
      init[re.exercise_id] = Array.from({ length: re.target_sets }, (_, i) => ({
        w: prev[i] ? String(prev[i].weight_kg) : '',
        r: prev[i] ? String(prev[i].reps) : '',
        warmup: false,
      }))
    }
    setSetInputs(prev => {
      const merged = { ...init }
      for (const k of Object.keys(prev)) if (merged[k]) merged[k] = prev[k]
      return merged
    })
  }, [session?.exercises?.length, lastSession])

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
  const completedSets = Object.values(session.sets).flat().filter((s: any) => s.done)
  const totalVolume = completedSets.reduce((t: number, s: any) => t + (s.weight || 0) * (s.reps || 0), 0)

  return (
    <div className="flex flex-col h-screen bg-bg max-w-md mx-auto">
      {/* Header */}
      <div className="flex justify-between items-end px-5 pt-12 pb-3 border-b border-border">
        <div>
          <p className="text-white/30 text-xs">En curso</p>
          <h1 className="font-heading text-3xl text-white tracking-wide">{session.name}</h1>
        </div>
        <div className="text-right">
          <p className="font-heading text-3xl text-accent tracking-widest">{fmtTime(elapsed)}</p>
          <p className="text-white/20 text-xs">{doneSets}/{totalSets} series · {Math.round(totalVolume)}kg</p>
        </div>
      </div>

      {/* Barra de descanso */}
      {session.rest.active && (
        <div className={`mx-5 mt-2 rounded-2xl px-4 py-3 flex items-center gap-3 border ${urgent ? 'border-red-500 bg-red-500/10' : 'border-accent bg-accent/5'}`}>
          <div>
            <p className="text-white/30 text-xs">Descanso</p>
            <p className={`font-heading text-2xl tracking-widest ${urgent ? 'text-red-400' : 'text-accent'}`}>{fmtTime(session.rest.remaining)}</p>
          </div>
          <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${restPct}%`, backgroundColor: urgent ? '#FF5757' : '#C8F135' }} />
          </div>
          <button onClick={stopRest} className="text-white/30 text-sm px-2 py-1">Saltar ›</button>
        </div>
      )}

      {/* Ejercicios */}
      <div className="flex-1 overflow-y-auto no-scroll px-5 py-3 space-y-3">
        {session.exercises.map((re: any) => {
          const exSets = session.sets[re.exercise_id] ?? []
          const inputs = setInputs[re.exercise_id] ?? []
          const rows = Math.max(re.target_sets, exSets.length)
          const prevSets = lastSession[re.exercise_id] ?? []
          const exDone = exSets.filter((s: any) => s.done).length
          const exTotal = rows

          return (
            <div key={re.id} className="bg-card border border-border rounded-2xl p-4">
              {/* Cabecera ejercicio */}
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1 mr-2">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-semibold text-sm">{re.exercise?.name_es}</p>
                    {exDone === exTotal && exTotal > 0 && <span className="text-accent text-xs">✓</span>}
                  </div>
                  <p className="text-white/30 text-xs mt-0.5">{re.target_sets} series · {re.target_reps}–{re.target_reps_max} reps · {re.rest_seconds}s</p>
                </div>
                <div className="flex gap-1.5 items-center">
                  {prevSets.length > 0 && (
                    <button onClick={() => setShowHistory(showHistory === re.exercise_id ? null : re.exercise_id)}
                      className="bg-surface border border-border rounded-lg px-2 py-1.5 text-white/30 text-xs">
                      📋
                    </button>
                  )}
                  <button onClick={() => startRest(re.rest_seconds)}
                    className="bg-surface border border-border rounded-lg px-2.5 py-1.5 text-accent text-xs flex-shrink-0">
                    ⏱ {re.rest_seconds}s
                  </button>
                </div>
              </div>

              {/* Historial última sesión */}
              {showHistory === re.exercise_id && prevSets.length > 0 && (
                <div className="bg-surface border border-border/50 rounded-xl p-3 mb-3">
                  <p className="text-white/30 text-xs mb-2">Última sesión</p>
                  <div className="space-y-1">
                    {prevSets.map((s: any, i: number) => (
                      <div key={s.id} className="flex items-center gap-2">
                        <span className="text-white/20 text-xs w-5">S{i + 1}</span>
                        <span className="text-white/60 text-sm">{s.weight_kg}kg × {s.reps}</span>
                        {s.one_rm_kg && <span className="text-white/20 text-xs">~{Math.round(s.one_rm_kg)}kg 1RM</span>}
                        {s.is_pr && <span className="text-red-400 text-xs font-bold">🔥PR</span>}
                        {/* Botón para copiar el peso al input actual */}
                        <button onClick={() => {
                          setSetInputs(prev => {
                            const a = [...(prev[re.exercise_id] ?? [])]
                            if (!a[i]) a[i] = { w: '', r: '', warmup: false }
                            a[i] = { ...a[i], w: String(s.weight_kg), r: String(s.reps) }
                            return { ...prev, [re.exercise_id]: a }
                          })
                          setShowHistory(null)
                        }} className="ml-auto text-accent text-xs border border-accent/30 px-2 py-0.5 rounded-lg">
                          Copiar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cabecera columnas */}
              <div className="flex gap-1 mb-1 px-0.5">
                {['#', 'Ant.', 'Kg', '×', 'Reps', '1RM', ''].map((h, i) => (
                  <span key={i} className={`text-white/20 text-[10px] text-center ${i === 0 ? 'w-6' : i === 1 ? 'w-12' : i === 3 ? 'w-3' : i < 5 ? 'flex-1' : i === 5 ? 'w-10' : 'w-8'}`}>{h}</span>
                ))}
              </div>

              {/* Series */}
              {Array.from({ length: rows }, (_, idx) => {
                const done = exSets[idx]?.done
                const inp = inputs[idx] ?? { w: '', r: '', warmup: false }
                const orm = inp.w && inp.r ? calc1RM(parseFloat(inp.w) || 0, parseInt(inp.r) || 0) : null
                const prev = prevSets[idx]

                return (
                  <div key={idx} className={`flex items-center gap-1 py-2 border-b border-border/20 last:border-0 ${done ? 'opacity-40' : ''}`}>
                    {/* Número serie / warmup toggle */}
                    <button onClick={() => {
                      if (done) return
                      setSetInputs(prev2 => {
                        const a = [...(prev2[re.exercise_id] ?? [])]
                        if (!a[idx]) a[idx] = { w: '', r: '', warmup: false }
                        a[idx] = { ...a[idx], warmup: !a[idx].warmup }
                        return { ...prev2, [re.exercise_id]: a }
                      })
                    }} className={`w-6 h-6 rounded-md text-[10px] font-bold flex-shrink-0 text-center leading-6 ${inp.warmup ? 'bg-white/10 text-white/30' : 'text-accent'}`}>
                      {inp.warmup ? 'C' : `${idx + 1}`}
                    </button>

                    {/* Anterior */}
                    <span className="text-white/20 text-[10px] w-12 text-center leading-tight">
                      {prev ? `${prev.weight_kg}×${prev.reps}` : '—'}
                    </span>

                    {/* Peso */}
                    <input type="number" inputMode="decimal"
                      className={`flex-1 rounded-lg py-2 text-white text-sm text-center outline-none min-w-0 border ${done ? 'bg-transparent border-transparent' : 'bg-surface border-border focus:border-accent'}`}
                      value={inp.w} onChange={e => setSetInputs(prev2 => { const a = [...(prev2[re.exercise_id] ?? [])]; if (!a[idx]) a[idx] = { w: '', r: '', warmup: false }; a[idx] = { ...a[idx], w: e.target.value }; return { ...prev2, [re.exercise_id]: a } })}
                      placeholder={prev ? String(prev.weight_kg) : 'kg'} disabled={done} />

                    <span className="text-white/20 text-xs w-3 text-center">×</span>

                    {/* Reps */}
                    <input type="number" inputMode="numeric"
                      className={`flex-1 rounded-lg py-2 text-white text-sm text-center outline-none min-w-0 border ${done ? 'bg-transparent border-transparent' : 'bg-surface border-border focus:border-accent'}`}
                      value={inp.r} onChange={e => setSetInputs(prev2 => { const a = [...(prev2[re.exercise_id] ?? [])]; if (!a[idx]) a[idx] = { w: '', r: '', warmup: false }; a[idx] = { ...a[idx], r: e.target.value }; return { ...prev2, [re.exercise_id]: a } })}
                      placeholder={prev ? String(prev.reps) : 'r'} disabled={done} />

                    {/* 1RM */}
                    <span className="text-white/20 text-[10px] w-10 text-center">{orm && orm > 0 ? `~${Math.round(orm)}` : '—'}</span>

                    {/* Check */}
                    <button onClick={() => {
                      const w = parseFloat(inp.w), r = parseInt(inp.r)
                      if (!w || !r) return
                      completeSet(re.exercise_id, w, r, inp.warmup)
                      if (!inp.warmup) startRest(re.rest_seconds)
                    }} disabled={done}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all ${done ? 'bg-accent text-black' : 'bg-surface border border-border text-white/20 active:bg-accent active:text-black'}`}>
                      ✓
                    </button>
                  </div>
                )
              })}

              <button onClick={() => {
                addExtra(re.exercise_id)
                const prev = prevSets[rows]
                setSetInputs(prev2 => {
                  const a = [...(prev2[re.exercise_id] ?? [])]
                  a.push({ w: prev ? String(prev.weight_kg) : '', r: prev ? String(prev.reps) : '', warmup: false })
                  return { ...prev2, [re.exercise_id]: a }
                })
              }} className="mt-2 w-full border border-dashed border-border rounded-lg py-2 text-white/20 text-xs hover:text-white/40 hover:border-white/20 transition-colors">
                + Serie extra
              </button>
            </div>
          )
        })}

        <button onClick={() => setShowRPE(true)} className="w-full bg-accent text-black font-bold py-4 rounded-2xl text-sm">🏁 Terminar entrenamiento</button>
        <button onClick={() => { if (confirm('¿Descartar sesión? Se perderá todo el progreso.')) { discard(); router.push('/tabs/home') } }}
          className="w-full border border-red-500/20 text-red-400/60 py-3 rounded-2xl text-sm">Descartar sesión</button>
        <div className="h-8" />
      </div>

      {/* Modal RPE */}
      {showRPE && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center px-5">
          <div className="w-full max-w-md bg-surface rounded-3xl p-6 space-y-4">
            <h2 className="font-heading text-3xl text-white tracking-wide text-center">¿Cómo fue?</h2>
            <div className="text-center">
              <p className="font-heading text-7xl text-accent">{rpe}</p>
              <p className="text-white/40 text-sm">{['','','','','','Fácil','Moderado','Duro','Muy duro','Al límite','Máximo'][rpe]}</p>
            </div>
            <div className="flex justify-center gap-1.5 flex-wrap">
              {[1,2,3,4,5,6,7,8,9,10].map(n => (
                <button key={n} onClick={() => setRpe(n)}
                  className={`w-9 h-9 rounded-full text-xs font-bold transition-all ${rpe >= n ? 'bg-accent text-black' : 'bg-card border border-border text-white/30'}`}>{n}</button>
              ))}
            </div>
            <textarea className="w-full bg-card border border-border rounded-xl p-3 text-white text-sm resize-none outline-none focus:border-accent"
              rows={2} placeholder="Notas del entrenamiento (opcional)" value={notes} onChange={e => setNotes(e.target.value)} />
            <div className="grid grid-cols-3 gap-2 text-center text-xs text-white/30">
              <div><p className="font-heading text-lg text-accent">{doneSets}</p><p>Series</p></div>
              <div><p className="font-heading text-lg text-accent">{fmtTime(elapsed)}</p><p>Tiempo</p></div>
              <div><p className="font-heading text-lg text-accent">{Math.round(totalVolume)}kg</p><p>Volumen</p></div>
            </div>
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
