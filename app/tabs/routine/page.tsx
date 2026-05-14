'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRoutines, useWorkout } from '@/store'
import { dbGetAll } from '@/lib/db'
import { DAY_NAMES, MUSCLE_LABELS } from '@/lib/utils'

export default function Routine() {
  const router = useRouter()
  const { routines, loading, load, create, remove, setActive, addDay, removeDay, addExercise, removeExercise } = useRoutines()
  const { start } = useWorkout()
  const [selId, setSelId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [rName, setRName] = useState('')
  const [showAddDay, setShowAddDay] = useState(false)
  const [dayName, setDayName] = useState('')
  const [dayNum, setDayNum] = useState(1)
  const [addExDay, setAddExDay] = useState<string | null>(null)
  const [exercises, setExercises] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [mFilter, setMFilter] = useState<string | null>(null)
  const [selEx, setSelEx] = useState<any | null>(null)
  const [cfg, setCfg] = useState({ sets: '3', reps: '8', repsMax: '12', rest: '90' })

  useEffect(() => { load() }, [])
  useEffect(() => {
    if (addExDay) dbGetAll('exercises').then(d => setExercises(d.sort((a: any, b: any) => a.name_es.localeCompare(b.name_es))))
  }, [addExDay])

  const cur = routines.find((r: any) => r.id === selId) ?? routines[0] ?? null
  const muscles = Array.from(new Set(exercises.map((e: any) => e.muscle_group as string)))
  const filtEx = exercises.filter((e: any) => e.name_es.toLowerCase().includes(search.toLowerCase()) && (!mFilter || e.muscle_group === mFilter))

  const startDay = (day: any) => {
    if (!day.exercises?.length) { alert('Añade ejercicios antes de entrenar'); return }
    start(day.id, day.name, day.exercises)
    router.push('/workout/session')
  }

  return (
    <div className="px-5 pt-14 pb-4">
      <div className="flex justify-between items-center mb-5">
        <h1 className="font-heading text-4xl text-white tracking-widest">Rutina</h1>
        <button onClick={() => setShowCreate(true)} className="bg-accent text-black text-sm font-bold px-4 py-2 rounded-xl">+ Nueva</button>
      </div>

      {routines.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <p className="text-4xl">📋</p>
          <p className="text-white font-medium">Sin rutinas todavía</p>
          <button onClick={() => setShowCreate(true)} className="text-accent text-sm border border-accent/40 px-5 py-2 rounded-xl">Crear primera rutina</button>
        </div>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto no-scroll pb-2 mb-4">
            {routines.map((r: any) => (
              <button key={r.id} onClick={() => setSelId(r.id)} className={`flex-shrink-0 flex items-center gap-1 px-4 py-2 rounded-full border text-sm ${cur?.id === r.id ? 'border-accent bg-accent/20 text-accent font-semibold' : 'border-border bg-card text-white/50'}`}>
                {r.name}{r.is_active && <span className="text-accent text-[10px]">●</span>}
              </button>
            ))}
          </div>

          {cur && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                {!cur.is_active
                  ? <button onClick={() => { if (confirm(`¿Activar "${cur.name}"?`)) setActive(cur.id) }} className="bg-accent/20 border border-accent/40 text-accent text-xs px-3 py-1.5 rounded-lg font-semibold">Activar</button>
                  : <span className="text-accent text-xs font-semibold">✓ Rutina activa</span>
                }
                <button onClick={() => { if (confirm('¿Eliminar rutina?')) remove(cur.id) }} className="text-red-400 text-xs">Eliminar</button>
              </div>

              {(cur.days ?? []).map((day: any) => (
                <div key={day.id} className="bg-card border border-border rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-white/30 text-xs">{DAY_NAMES[day.day_number - 1]}</p>
                      <p className="font-heading text-xl text-white tracking-wide mt-0.5">{day.name}</p>
                    </div>
                    <div className="flex gap-2 items-center">
                      <button onClick={() => startDay(day)} className="bg-accent w-9 h-9 rounded-lg text-black font-bold text-sm flex items-center justify-center">▶</button>
                      <button onClick={() => { if (confirm(`¿Eliminar "${day.name}"?`)) removeDay(day.id) }} className="text-white/30 text-lg px-1">✕</button>
                    </div>
                  </div>

                  {(day.exercises ?? []).length === 0
                    ? <p className="text-white/20 text-sm italic">Sin ejercicios</p>
                    : <div className="space-y-2">
                      {(day.exercises ?? []).map((re: any, i: number) => (
                        <div key={re.id} className="flex items-center gap-2 py-1.5 border-b border-border/40 last:border-0">
                          <span className="text-accent text-xs font-bold w-4">{i+1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm truncate">{re.exercise?.name_es}</p>
                            <p className="text-white/30 text-xs">{re.target_sets}×{re.target_reps}–{re.target_reps_max} · {re.rest_seconds}s</p>
                          </div>
                          <button onClick={() => removeExercise(re.id)} className="text-white/20 text-sm px-1">✕</button>
                        </div>
                      ))}
                    </div>
                  }
                  <button onClick={() => setAddExDay(day.id)} className="w-full border border-dashed border-border rounded-lg py-2 text-white/30 text-sm">+ Añadir ejercicio</button>
                </div>
              ))}

              {showAddDay ? (
                <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                  <p className="font-heading text-xl text-white tracking-wide">Nuevo día</p>
                  <input className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-accent" placeholder="Nombre (ej: Push)" value={dayName} onChange={e => setDayName(e.target.value)} autoFocus />
                  <div className="flex gap-1.5 overflow-x-auto no-scroll">
                    {DAY_NAMES.map((d, i) => (
                      <button key={d} onClick={() => setDayNum(i+1)} className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs border ${dayNum === i+1 ? 'bg-accent text-black border-accent' : 'bg-surface border-border text-white/40'}`}>{d.slice(0,3)}</button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setShowAddDay(false); setDayName('') }} className="flex-1 bg-surface border border-border rounded-xl py-2.5 text-white/50 text-sm">Cancelar</button>
                    <button onClick={async () => { if (!dayName.trim()) return; await addDay(cur.id, dayName.trim(), dayNum); setShowAddDay(false); setDayName('') }} className="flex-1 bg-accent text-black font-bold rounded-xl py-2.5 text-sm">Añadir</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowAddDay(true)} className="w-full border border-dashed border-border rounded-2xl py-4 text-white/30 text-sm">+ Añadir día</button>
              )}
            </div>
          )}
        </>
      )}

      {/* Modal crear rutina */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end">
          <div className="w-full max-w-md mx-auto bg-surface rounded-t-3xl p-6 pb-10 space-y-4">
            <p className="font-heading text-2xl text-white tracking-wide">Nueva rutina</p>
            <input className="w-full bg-card border border-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-accent" placeholder="Nombre" value={rName} onChange={e => setRName(e.target.value)} autoFocus />
            <div className="flex gap-2">
              <button onClick={() => { setShowCreate(false); setRName('') }} className="flex-1 bg-card border border-border rounded-xl py-3 text-white/50 text-sm">Cancelar</button>
              <button onClick={async () => { if (!rName.trim()) return; await create(rName.trim()); setShowCreate(false); setRName('') }} className="flex-1 bg-accent text-black font-bold rounded-xl py-3 text-sm">Crear</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal añadir ejercicio */}
      {addExDay && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end">
          <div className="w-full max-w-md mx-auto bg-surface rounded-t-3xl p-5 pb-10 max-h-[90vh] flex flex-col">
            <p className="font-heading text-2xl text-white tracking-wide mb-4">Añadir ejercicio</p>
            {!selEx ? (
              <>
                <input className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-white text-sm outline-none mb-3" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
                <div className="flex gap-1.5 overflow-x-auto no-scroll pb-2 mb-3">
                  {['Todos', ...muscles].map(m => (
                    <button key={m} onClick={() => setMFilter(m === 'Todos' ? null : m)} className={`flex-shrink-0 px-3 py-1 rounded-full text-xs border ${(m === 'Todos' ? !mFilter : mFilter === m) ? 'bg-accent text-black border-accent' : 'bg-card border-border text-white/40'}`}>
                      {m === 'Todos' ? 'Todos' : MUSCLE_LABELS[m] ?? m}
                    </button>
                  ))}
                </div>
                <div className="flex-1 overflow-y-auto no-scroll">
                  {filtEx.map((ex: any) => (
                    <button key={ex.id} onClick={() => setSelEx(ex)} className="w-full flex justify-between items-center py-3 border-b border-border/40 text-left">
                      <div>
                        <p className="text-white text-sm">{ex.name_es}</p>
                        <p className="text-white/30 text-xs">{MUSCLE_LABELS[ex.muscle_group]}</p>
                      </div>
                      <span className="text-accent text-xl">+</span>
                    </button>
                  ))}
                </div>
                <button onClick={() => { setAddExDay(null); setSearch(''); setMFilter(null) }} className="mt-3 text-white/30 text-sm w-full py-2">Cancelar</button>
              </>
            ) : (
              <div className="space-y-4">
                <p className="font-heading text-xl text-accent tracking-wide">{selEx.name_es}</p>
                {[['Series','sets'],['Reps mín.','reps'],['Reps máx.','repsMax'],['Descanso (s)','rest']].map(([label, key]) => (
                  <div key={key} className="flex justify-between items-center">
                    <span className="text-white/60 text-sm">{label}</span>
                    <input type="number" className="bg-card border border-border rounded-lg px-3 py-2 text-white text-sm text-center w-20 outline-none" value={(cfg as any)[key]} onChange={e => setCfg(c => ({ ...c, [key]: e.target.value }))} />
                  </div>
                ))}
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setSelEx(null)} className="flex-1 bg-card border border-border rounded-xl py-3 text-white/50 text-sm">← Atrás</button>
                  <button onClick={async () => {
                    await addExercise(addExDay, selEx.id, { sets: parseInt(cfg.sets)||3, reps: parseInt(cfg.reps)||8, repsMax: parseInt(cfg.repsMax)||12, rest: parseInt(cfg.rest)||90 })
                    setAddExDay(null); setSelEx(null); setSearch(''); setMFilter(null)
                    setCfg({ sets:'3', reps:'8', repsMax:'12', rest:'90' })
                  }} className="flex-1 bg-accent text-black font-bold rounded-xl py-3 text-sm">Añadir</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
