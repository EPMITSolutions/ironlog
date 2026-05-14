'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { dbGetAll } from '@/lib/db'
import { fmtDuration, calcVolume, MUSCLE_LABELS, MUSCLE_COLORS } from '@/lib/utils'

export default function History() {
  const [sessions, setSessions] = useState<any[]>([])
  const [sessionMeta, setSessionMeta] = useState<Record<string, { volume: number, muscles: string[], prs: number }>>({})
  const [detail, setDetail] = useState<any | null>(null)
  const [dSets, setDSets] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      const [allSessions, allSets, exs] = await Promise.all([dbGetAll('sessions'), dbGetAll('sets'), dbGetAll('exercises')])
      const exMap = Object.fromEntries(exs.map((e: any) => [e.id, e]))
      const done = allSessions.filter((s: any) => s.finished_at).sort((a: any, b: any) => b.started_at.localeCompare(a.started_at))

      // Calcular meta de cada sesión
      const meta: Record<string, any> = {}
      for (const s of done) {
        const sets = allSets.filter((x: any) => x.session_id === s.id)
        const muscles = Array.from(new Set(sets.map((x: any) => exMap[x.exercise_id]?.muscle_group).filter(Boolean))) as string[]
        meta[s.id] = {
          volume: calcVolume(sets.map((x: any) => ({ weight_kg: x.weight_kg, reps: x.reps }))),
          muscles: muscles.slice(0, 4),
          prs: sets.filter((x: any) => x.is_pr).length,
        }
      }
      setSessions(done)
      setSessionMeta(meta)
    }
    load()
  }, [])

  const open = async (s: any) => {
    const [allSets, exs] = await Promise.all([dbGetAll('sets'), dbGetAll('exercises')])
    const exMap = Object.fromEntries(exs.map((e: any) => [e.id, e]))
    setDSets(allSets.filter((x: any) => x.session_id === s.id).sort((a: any, b: any) => a.set_number - b.set_number).map((x: any) => ({ ...x, exercise: exMap[x.exercise_id] })))
    setDetail(s)
  }

  const grouped = sessions.reduce<Record<string, any[]>>((acc, s) => {
    const k = new Date(s.started_at).toLocaleDateString('es', { year: 'numeric', month: 'long' })
    if (!acc[k]) acc[k] = []
    acc[k].push(s)
    return acc
  }, {})

  const byEx = dSets.reduce<Record<string, any[]>>((acc, s) => {
    if (!acc[s.exercise_id]) acc[s.exercise_id] = []
    acc[s.exercise_id].push(s)
    return acc
  }, {})

  return (
    <div className="px-5 pt-14 pb-4">
      <div className="flex items-baseline gap-3 mb-5">
        <h1 className="font-heading text-4xl text-white tracking-widest">Historial</h1>
        <span className="text-white/30 text-sm">{sessions.length} sesiones</span>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <p className="text-4xl">📅</p>
          <p className="text-white font-medium">Sin historial todavía</p>
          <p className="text-white/30 text-sm">Completa tu primer entrenamiento</p>
        </div>
      ) : Object.entries(grouped).map(([month, list]) => (
        <div key={month}>
          <p className="font-heading text-sm text-white/30 tracking-widest uppercase mt-5 mb-2">{month}</p>
          {list.map((s: any) => {
            const d = new Date(s.started_at)
            const meta = sessionMeta[s.id]
            return (
              <button key={s.id} onClick={() => open(s)} className="w-full bg-card border border-border rounded-2xl p-3.5 mb-2 text-left active:opacity-80">
                <div className="flex items-center gap-3">
                  {/* Fecha */}
                  <div className="w-11 h-12 bg-surface border border-border rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                    <span className="font-heading text-xl text-accent leading-tight">{d.getDate()}</span>
                    <span className="text-[9px] text-white/20 uppercase">{d.toLocaleDateString('es', { month: 'short' })}</span>
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{s.name ?? 'Entrenamiento'}</p>
                    <div className="flex gap-2 mt-0.5 flex-wrap">
                      {s.duration_secs != null && <span className="text-white/30 text-xs">⏱ {fmtDuration(s.duration_secs)}</span>}
                      {meta?.volume > 0 && <span className="text-white/30 text-xs">📦 {Math.round(meta.volume)}kg</span>}
                      {meta?.prs > 0 && <span className="text-red-400 text-xs font-semibold">🔥 {meta.prs} PR{meta.prs > 1 ? 's' : ''}</span>}
                    </div>
                    {/* Músculo chips */}
                    {meta?.muscles?.length > 0 && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {meta.muscles.map((m: string) => (
                          <span key={m} className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
                            style={{ backgroundColor: MUSCLE_COLORS[m] + '22', color: MUSCLE_COLORS[m] }}>
                            {MUSCLE_LABELS[m]}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-white/20 text-2xl flex-shrink-0">›</span>
                </div>
              </button>
            )
          })}
        </div>
      ))}

      {/* Modal detalle */}
      {detail && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end" onClick={() => setDetail(null)}>
          <div className="w-full max-w-md mx-auto bg-surface rounded-t-3xl p-5 pb-10 max-h-[88vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="font-heading text-2xl text-white tracking-wide">{detail.name ?? 'Entrenamiento'}</p>
                <p className="text-white/30 text-sm capitalize">
                  {new Date(detail.started_at).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              </div>
              <button onClick={() => setDetail(null)} className="text-white/30 text-xl px-1">✕</button>
            </div>

            {/* Stats sesión */}
            <div className="flex gap-4 flex-wrap mb-4 pb-4 border-b border-border">
              {detail.duration_secs != null && <div className="text-center"><p className="font-heading text-xl text-accent">{fmtDuration(detail.duration_secs)}</p><p className="text-white/20 text-xs">Duración</p></div>}
              <div className="text-center"><p className="font-heading text-xl text-accent">{dSets.length}</p><p className="text-white/20 text-xs">Series</p></div>
              <div className="text-center">
                <p className="font-heading text-xl text-accent">{Math.round(calcVolume(dSets.map(s => ({ weight_kg: s.weight_kg, reps: s.reps }))))}kg</p>
                <p className="text-white/20 text-xs">Volumen</p>
              </div>
              {dSets.filter(s => s.is_pr).length > 0 && (
                <div className="text-center"><p className="font-heading text-xl text-red-400">{dSets.filter(s => s.is_pr).length} 🔥</p><p className="text-white/20 text-xs">PRs</p></div>
              )}
              {detail.rpe != null && <div className="text-center"><p className="font-heading text-xl text-accent">{detail.rpe}/10</p><p className="text-white/20 text-xs">RPE</p></div>}
            </div>

            {detail.notes && (
              <div className="bg-card border border-border rounded-xl p-3 mb-4 text-white/50 text-sm italic">"{detail.notes}"</div>
            )}

            <div className="overflow-y-auto no-scroll space-y-4">
              {Object.entries(byEx).map(([exId, sets]) => {
                const exVol = calcVolume((sets as any[]).map(s => ({ weight_kg: s.weight_kg, reps: s.reps })))
                const bestSet = (sets as any[]).reduce((b, x) => x.weight_kg > b.weight_kg ? x : b)
                return (
                  <div key={exId}>
                    <div className="flex justify-between items-baseline mb-1.5">
                      <p className="text-white font-semibold text-sm">{(sets as any[])[0].exercise?.name_es ?? 'Ejercicio'}</p>
                      <p className="text-white/20 text-xs">{Math.round(exVol)}kg vol.</p>
                    </div>
                    {(sets as any[]).map((s, i) => (
                      <div key={s.id} className="flex items-center gap-2 py-1.5 border-b border-border/20 last:border-0">
                        <span className={`text-xs font-bold w-6 ${s.is_warmup ? 'text-white/20' : 'text-accent'}`}>{s.is_warmup ? 'C' : `S${i + 1}`}</span>
                        <span className="text-white/60 text-sm flex-1">{s.weight_kg}kg × {s.reps}</span>
                        {s.one_rm_kg && <span className="text-white/20 text-xs">~{Math.round(s.one_rm_kg)}kg</span>}
                        {s.is_pr && <span className="text-red-400 text-xs font-bold">🔥PR</span>}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
