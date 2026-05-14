'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { dbGetAll } from '@/lib/db'
import { calc1RM, pctChange, weightFromPct, PERCENT_TABLE, MUSCLE_LABELS, weekStart } from '@/lib/utils'

type Tab = '1rm' | 'weight' | 'volume'

export default function Progress() {
  const [exercises, setExercises] = useState<any[]>([])
  const [sel, setSel] = useState<any | null>(null)
  const [mFilter, setMFilter] = useState<string | null>(null)
  const [points, setPoints] = useState<any[]>([])
  const [pr, setPR] = useState(0)
  const [est, setEst] = useState(0)
  const [gain, setGain] = useState(0)
  const [tab, setTab] = useState<Tab>('1rm')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    dbGetAll('exercises').then(d => setExercises(d.sort((a: any, b: any) => a.name_es.localeCompare(b.name_es))))
  }, [])

  const loadData = async (ex: any) => {
    setSel(ex); setLoading(true)
    const since = new Date(); since.setDate(since.getDate() - 112)
    const [allSets, allSessions, allPRs] = await Promise.all([dbGetAll('sets'), dbGetAll('sessions'), dbGetAll('personal_records')])
    const sessMap = Object.fromEntries(allSessions.map((s: any) => [s.id, s]))
    const relevant = allSets.filter((s: any) => s.exercise_id === ex.id && !s.is_warmup && new Date(s.created_at) >= since)
    const wMap = new Map<string, any>()
    for (const s of relevant) {
      const sess = sessMap[s.session_id]; if (!sess) continue
      const wk = weekStart(sess.started_at.split('T')[0])
      const orm = calc1RM(s.weight_kg, s.reps)
      const cur = wMap.get(wk)
      if (!cur || orm > cur.oneRM) wMap.set(wk, { date: sess.started_at.split('T')[0], weight: s.weight_kg, reps: s.reps, oneRM: orm, volume: s.weight_kg * s.reps, isPR: !!s.is_pr })
    }
    const pts = Array.from(wMap.values()).sort((a, b) => a.date.localeCompare(b.date))
    setPoints(pts)
    const last = pts.at(-1), prev = pts.at(-5)
    const e = last ? calc1RM(last.weight, last.reps) : 0
    setEst(e)
    const prRow = allPRs.find((p: any) => p.exercise_id === ex.id && p.pr_type === 'max_weight')
    setPR(prRow?.value ?? last?.weight ?? 0)
    setGain(last && prev ? pctChange(last.oneRM, prev.oneRM) : 0)
    setLoading(false)
  }

  const muscles = Array.from(new Set(exercises.map((e: any) => e.muscle_group as string)))
  const filtEx = exercises.filter((e: any) => !mFilter || e.muscle_group === mFilter)
  const vals = points.map(p => tab === '1rm' ? p.oneRM : tab === 'weight' ? p.weight : p.volume)
  const maxV = vals.length ? Math.max(...vals) : 1
  const minV = vals.length ? Math.min(...vals) : 0

  return (
    <div className="px-5 pt-14 pb-4 space-y-5">
      <h1 className="font-heading text-4xl text-white tracking-widest">Progreso</h1>

      <div className="flex gap-2 overflow-x-auto no-scroll pb-1">
        {[null, ...muscles].map(m => (
          <button key={m ?? 'all'} onClick={() => setMFilter(m)} className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs border ${mFilter === m ? 'bg-accent text-black border-accent font-bold' : 'border-border bg-card text-white/40'}`}>
            {m ? MUSCLE_LABELS[m] : 'Todos'}
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto no-scroll pb-1">
        {filtEx.map((ex: any) => (
          <button key={ex.id} onClick={() => loadData(ex)} className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs border ${sel?.id === ex.id ? 'border-accent bg-accent/20 text-accent font-semibold' : 'border-border bg-card text-white/40'}`}>
            {ex.name_es}
          </button>
        ))}
      </div>

      {!sel ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-2">📊</p>
          <p className="text-white font-medium">Selecciona un ejercicio</p>
          <p className="text-white/30 text-sm mt-1">Para ver tu evolución</p>
        </div>
      ) : loading ? <div className="text-center py-12 text-white/30">Cargando...</div> : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {[{ l:'PR actual', v:`${pr}kg`, a:true }, { l:'1RM estimado', v:`${Math.round(est)}kg` }, { l:'Progreso 4sem', v:`${gain>=0?'+':''}${gain}%` }].map(({ l, v, a }) => (
              <div key={l} className={`bg-card border rounded-2xl p-3 text-center ${a ? 'border-accent' : 'border-border'}`}>
                <p className="font-heading text-2xl text-accent leading-tight">{v}</p>
                <p className="text-white/30 text-xs mt-1">{l}</p>
              </div>
            ))}
          </div>

          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="flex gap-2 mb-4">
              {(['1rm','weight','volume'] as Tab[]).map(t => (
                <button key={t} onClick={() => setTab(t)} className={`flex-1 py-1.5 rounded-lg text-xs font-medium ${tab===t ? 'bg-accent text-black' : 'bg-surface text-white/40'}`}>
                  {t==='1rm'?'1RM':t==='weight'?'Peso':'Volumen'}
                </button>
              ))}
            </div>
            {points.length < 2 ? <p className="text-white/20 text-xs text-center py-6">Necesitas más sesiones para ver la gráfica</p> : (
              <div className="flex gap-1 items-end h-32 overflow-x-auto no-scroll">
                {points.map((p, i) => {
                  const v = vals[i]
                  const h = maxV===minV ? 60 : Math.max(10, ((v-minV)/(maxV-minV))*100)
                  return (
                    <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0 w-10">
                      <span className="text-[8px] text-white/20">{Math.round(tab==='volume'?p.volume:v)}</span>
                      <div className="w-6 rounded-sm" style={{ height:`${h}%`, minHeight:8, backgroundColor: p.isPR?'#FF5757':'#C8F135', opacity:0.8 }} />
                      <span className="text-[8px] text-white/20 text-center leading-tight">{new Date(p.date).toLocaleDateString('es',{day:'numeric',month:'short'})}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {est > 0 && (
            <div className="bg-card border border-border rounded-2xl p-4">
              <p className="text-white font-semibold text-sm mb-3">Cargas por % del 1RM</p>
              {PERCENT_TABLE.map(({ pct, reps, label }) => (
                <div key={pct} className="flex items-center py-2.5 border-b border-border/40 last:border-0">
                  <span className="font-heading text-accent text-lg w-12">{pct}%</span>
                  <span className="flex-1 text-white/50 text-sm">{label}</span>
                  <span className="text-white font-medium text-sm">{weightFromPct(est, pct)}kg × {reps}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
