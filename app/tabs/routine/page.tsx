'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRoutines, useWorkout } from '@/store'
import { dbGetAll, dbPut, uuid } from '@/lib/db'
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
  const [cfg, setCfg] = useState({ sets: '3', reps: '8', repsMax: '12', rest: '90', notes: '' })
  const [showCreateEx, setShowCreateEx] = useState(false)
  const [newEx, setNewEx] = useState({ name: '', muscle: 'chest', equipment: 'barbell' })

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (addExDay) {
      dbGetAll('exercises').then(d => setExercises(d.sort((a: any, b: any) => a.name_es.localeCompare(b.name_es))))
    }
  }, [addExDay])

  const cur = routines.find((r: any) => r.id === selId) ?? routines[0] ?? null
  // Días ordenados por día de semana (Lun=1 → Dom=7)
  const sortedDays = [...(cur?.days ?? [])].sort((a: any, b: any) => a.day_number - b.day_number)
  // Días ya usados en esta rutina
  const usedDays = sortedDays.map((d: any) => d.day_number)

  const muscles = Array.from(new Set(exercises.map((e: any) => e.muscle_group as string)))
  const filtEx = exercises.filter((e: any) =>
    e.name_es.toLowerCase().includes(search.toLowerCase()) &&
    (!mFilter || e.muscle_group === mFilter)
  )

  const startDay = (day: any) => {
    if (!day.exercises?.length) { alert('Añade ejercicios antes de entrenar'); return }
    start(day.id, day.name, day.exercises)
    router.push('/workout/session')
  }

  const handleCreateExercise = async () => {
    if (!newEx.name.trim()) return
    const ex = { id: uuid(), name_es: newEx.name.trim(), name: newEx.name.trim(), muscle_group: newEx.muscle, equipment: newEx.equipment, is_custom: true }
    await dbPut('exercises', ex)
    const updated = await dbGetAll('exercises')
    setExercises(updated.sort((a: any, b: any) => a.name_es.localeCompare(b.name_es)))
    setSelEx(ex)
    setShowCreateEx(false)
    setNewEx({ name: '', muscle: 'chest', equipment: 'barbell' })
  }

  const moveExercise = async (day: any, reId: string, dir: 'up' | 'down') => {
    const exs = [...day.exercises].sort((a: any, b: any) => a.order_index - b.order_index)
    const idx = exs.findIndex((e: any) => e.id === reId)
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= exs.length) return
    const a = exs[idx], b = exs[swapIdx]
    await dbPut('routine_exercises', { ...a, order_index: b.order_index })
    await dbPut('routine_exercises', { ...b, order_index: a.order_index })
    await load()
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
          <p className="text-white/30 text-sm">Crea tu primera rutina para organizar tus entrenamientos</p>
          <button onClick={() => setShowCreate(true)} className="text-accent text-sm border border-accent/40 px-5 py-2.5 rounded-xl">Crear primera rutina</button>
        </div>
      ) : (
        <>
          {/* Selector de rutina */}
          <div className="flex gap-2 overflow-x-auto no-scroll pb-2 mb-4">
            {routines.map((r: any) => (
              <button key={r.id} onClick={() => setSelId(r.id)}
                className={`flex-shrink-0 flex items-center gap-1 px-4 py-2 rounded-full border text-sm transition-all ${cur?.id === r.id ? 'border-accent bg-accent/20 text-accent font-semibold' : 'border-border bg-card text-white/50'}`}>
                {r.name}{r.is_active && <span className="text-accent text-[10px] ml-1">●</span>}
              </button>
            ))}
          </div>

          {cur && (
            <div className="space-y-3">
              {/* Acciones rutina */}
              <div className="flex justify-between items-center">
                {!cur.is_active
                  ? <button onClick={() => { if (confirm(`¿Activar "${cur.name}"?`)) setActive(cur.id) }}
                      className="bg-accent/20 border border-accent/40 text-accent text-xs px-3 py-1.5 rounded-lg font-semibold">Activar rutina</button>
                  : <span className="text-accent text-xs font-semibold">✓ Rutina activa</span>
                }
                <button onClick={() => { if (confirm('¿Eliminar rutina? Se perderán todos los días y ejercicios.')) remove(cur.id) }}
                  className="text-red-400 text-xs">Eliminar</button>
              </div>

              {/* Resumen semanal */}
              {sortedDays.length > 0 && (
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {DAY_NAMES.map((d, i) => {
                    const day = sortedDays.find((sd: any) => sd.day_number === i + 1)
                    const isToday = (new Date().getDay() || 7) === i + 1
                    return (
                      <div key={d} className={`rounded-lg p-1.5 text-center border ${day ? (isToday ? 'border-accent bg-accent/10' : 'border-border bg-card') : 'border-border/20 bg-transparent'}`}>
                        <p className={`text-[9px] font-semibold ${isToday ? 'text-accent' : 'text-white/30'}`}>{d.slice(0, 3)}</p>
                        <p className="text-[10px] text-white/50 mt-0.5 truncate">{day ? day.name.slice(0, 4) : '—'}</p>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Días ordenados Lun→Dom */}
              {sortedDays.map((day: any) => (
                <div key={day.id} className="bg-card border border-border rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-white/30 text-xs uppercase tracking-widest">{DAY_NAMES[day.day_number - 1]}</p>
                      <p className="font-heading text-xl text-white tracking-wide mt-0.5">{day.name}</p>
                    </div>
                    <div className="flex gap-2 items-center">
                      <button onClick={() => startDay(day)}
                        className="bg-accent w-9 h-9 rounded-lg text-black font-bold text-sm flex items-center justify-center">▶</button>
                      <button onClick={() => { if (confirm(`¿Eliminar "${day.name}"?`)) removeDay(day.id) }}
                        className="text-white/20 text-lg px-1 hover:text-red-400">✕</button>
                    </div>
                  </div>

                  {(day.exercises ?? []).length === 0 ? (
                    <p className="text-white/20 text-sm italic">Sin ejercicios · añade uno abajo</p>
                  ) : (
                    <div className="space-y-1">
                      {[...(day.exercises ?? [])].sort((a: any, b: any) => a.order_index - b.order_index).map((re: any, i: number, arr: any[]) => (
                        <div key={re.id} className="flex items-center gap-2 py-2 border-b border-border/30 last:border-0">
                          <div className="flex flex-col gap-0.5">
                            <button onClick={() => moveExercise(day, re.id, 'up')} disabled={i === 0}
                              className="text-white/20 text-xs disabled:opacity-10 hover:text-white leading-none">▲</button>
                            <button onClick={() => moveExercise(day, re.id, 'down')} disabled={i === arr.length - 1}
                              className="text-white/20 text-xs disabled:opacity-10 hover:text-white leading-none">▼</button>
                          </div>
                          <span className="text-accent text-xs font-bold w-4 text-center">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm truncate">
                              {re.exercise?.name_es}
                              {re.exercise?.is_custom && <span className="text-accent text-xs ml-1">★</span>}
                            </p>
                            <p className="text-white/30 text-xs">
                              {re.target_sets}×{re.target_reps}–{re.target_reps_max} reps · {re.rest_seconds}s descanso
                              {re.notes ? ` · ${re.notes}` : ''}
                            </p>
                          </div>
                          <button onClick={() => removeExercise(re.id)} className="text-white/20 text-sm px-1 hover:text-red-400 flex-shrink-0">✕</button>
                        </div>
                      ))}
                    </div>
                  )}

                  <button onClick={() => { setAddExDay(day.id); setSelEx(null); setSearch(''); setMFilter(null) }}
                    className="w-full border border-dashed border-border rounded-lg py-2 text-white/30 text-sm hover:border-accent hover:text-accent transition-colors">
                    + Añadir ejercicio
                  </button>
                </div>
              ))}

              {/* Añadir día */}
              {usedDays.length < 7 && (
                showAddDay ? (
                  <div className="bg-card border border-accent/30 rounded-2xl p-4 space-y-3">
                    <p className="font-heading text-xl text-white tracking-wide">Nuevo día</p>
                    <input className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-accent"
                      placeholder="Nombre (ej: Push, Pierna, Full Body...)" value={dayName} onChange={e => setDayName(e.target.value)} autoFocus />
                    <div>
                      <p className="text-white/30 text-xs mb-2">Día de la semana</p>
                      <div className="grid grid-cols-7 gap-1">
                        {DAY_NAMES.map((d, i) => {
                          const already = usedDays.includes(i + 1)
                          return (
                            <button key={d} onClick={() => !already && setDayNum(i + 1)} disabled={already}
                              className={`py-2 rounded-lg text-xs border transition-all ${already ? 'border-border/20 text-white/10 cursor-not-allowed' : dayNum === i + 1 ? 'bg-accent text-black border-accent font-bold' : 'bg-surface border-border text-white/40 hover:border-accent/50'}`}>
                              {d.slice(0, 3)}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setShowAddDay(false); setDayName('') }} className="flex-1 bg-surface border border-border rounded-xl py-2.5 text-white/40 text-sm">Cancelar</button>
                      <button onClick={async () => {
                        if (!dayName.trim()) return
                        await addDay(cur.id, dayName.trim(), dayNum)
                        setShowAddDay(false); setDayName('')
                      }} className="flex-1 bg-accent text-black font-bold rounded-xl py-2.5 text-sm">Añadir día</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => { setShowAddDay(true); setDayNum(([1,2,3,4,5,6,7].find(n => !usedDays.includes(n))) ?? 1) }}
                    className="w-full border border-dashed border-border rounded-2xl py-4 text-white/30 text-sm hover:border-accent/50 hover:text-white/50 transition-colors">
                    + Añadir día
                  </button>
                )
              )}

              {usedDays.length === 7 && (
                <p className="text-center text-white/20 text-xs py-2">Tienes los 7 días configurados ✓</p>
              )}
            </div>
          )}
        </>
      )}

      {/* Modal: crear rutina */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end">
          <div className="w-full max-w-md mx-auto bg-surface rounded-t-3xl p-6 pb-10 space-y-4">
            <p className="font-heading text-2xl text-white tracking-wide">Nueva rutina</p>
            <input className="w-full bg-card border border-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-accent"
              placeholder="Nombre (ej: PPL, Torso/Pierna, Full Body...)" value={rName} onChange={e => setRName(e.target.value)} autoFocus />
            <div className="flex gap-2">
              <button onClick={() => { setShowCreate(false); setRName('') }} className="flex-1 bg-card border border-border rounded-xl py-3 text-white/40 text-sm">Cancelar</button>
              <button onClick={async () => { if (!rName.trim()) return; await create(rName.trim()); setShowCreate(false); setRName('') }}
                className="flex-1 bg-accent text-black font-bold rounded-xl py-3 text-sm">Crear</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: añadir ejercicio */}
      {addExDay && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end">
          <div className="w-full max-w-md mx-auto bg-surface rounded-t-3xl p-5 pb-10 max-h-[92vh] flex flex-col">
            {!selEx ? (
              <>
                <div className="flex justify-between items-center mb-4">
                  <p className="font-heading text-2xl text-white tracking-wide">Añadir ejercicio</p>
                  <button onClick={() => setShowCreateEx(true)}
                    className="bg-accent/20 border border-accent/40 text-accent text-xs px-3 py-1.5 rounded-lg font-semibold">
                    + Crear propio
                  </button>
                </div>
                <input className="w-full bg-card border border-border rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-accent mb-3"
                  placeholder="Buscar ejercicio..." value={search} onChange={e => setSearch(e.target.value)} />
                <div className="flex gap-1.5 overflow-x-auto no-scroll pb-2 mb-3">
                  {['Todos', ...muscles].map(m => (
                    <button key={m} onClick={() => setMFilter(m === 'Todos' ? null : m)}
                      className={`flex-shrink-0 px-3 py-1 rounded-full text-xs border ${(m === 'Todos' ? !mFilter : mFilter === m) ? 'bg-accent text-black border-accent font-bold' : 'bg-card border-border text-white/40'}`}>
                      {m === 'Todos' ? 'Todos' : MUSCLE_LABELS[m] ?? m}
                    </button>
                  ))}
                </div>
                <div className="flex-1 overflow-y-auto no-scroll">
                  {filtEx.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-white/30 text-sm">No hay ejercicios con ese nombre</p>
                      <button onClick={() => setShowCreateEx(true)} className="text-accent text-sm mt-2">Crear ejercicio propio →</button>
                    </div>
                  )}
                  {filtEx.map((ex: any) => (
                    <button key={ex.id} onClick={() => setSelEx(ex)} className="w-full flex justify-between items-center py-3 border-b border-border/40 text-left">
                      <div>
                        <p className="text-white text-sm">
                          {ex.name_es}
                          {ex.is_custom && <span className="text-accent text-xs ml-2">★ propio</span>}
                        </p>
                        <p className="text-white/30 text-xs">{MUSCLE_LABELS[ex.muscle_group]} · {ex.equipment}</p>
                      </div>
                      <span className="text-accent text-xl ml-2">+</span>
                    </button>
                  ))}
                </div>
                <button onClick={() => { setAddExDay(null); setSearch(''); setMFilter(null) }} className="mt-3 text-white/30 text-sm w-full py-2">Cancelar</button>
              </>
            ) : (
              <div className="space-y-4 flex-1">
                <div>
                  <p className="font-heading text-xl text-accent tracking-wide">{selEx.name_es}</p>
                  <p className="text-white/30 text-xs mt-0.5">{MUSCLE_LABELS[selEx.muscle_group]} · {selEx.equipment}</p>
                </div>
                {[['Series', 'sets', '3'], ['Reps mín.', 'reps', '8'], ['Reps máx.', 'repsMax', '12'], ['Descanso (s)', 'rest', '90']].map(([label, key, placeholder]) => (
                  <div key={key} className="flex justify-between items-center">
                    <span className="text-white/60 text-sm">{label}</span>
                    <input type="number" placeholder={placeholder}
                      className="bg-card border border-border rounded-lg px-3 py-2 text-white text-sm text-center w-20 outline-none focus:border-accent"
                      value={(cfg as any)[key]} onChange={e => setCfg(c => ({ ...c, [key]: e.target.value }))} />
                  </div>
                ))}
                <div>
                  <span className="text-white/60 text-sm block mb-1.5">Notas (opcional)</span>
                  <input className="w-full bg-card border border-border rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-accent"
                    placeholder="ej: Agarre prono, pausa abajo..." value={cfg.notes} onChange={e => setCfg(c => ({ ...c, notes: e.target.value }))} />
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setSelEx(null)} className="flex-1 bg-card border border-border rounded-xl py-3 text-white/40 text-sm">← Atrás</button>
                  <button onClick={async () => {
                    await addExercise(addExDay, selEx.id, {
                      sets: parseInt(cfg.sets) || 3, reps: parseInt(cfg.reps) || 8,
                      repsMax: parseInt(cfg.repsMax) || 12, rest: parseInt(cfg.rest) || 90
                    })
                    setAddExDay(null); setSelEx(null); setSearch(''); setMFilter(null)
                    setCfg({ sets: '3', reps: '8', repsMax: '12', rest: '90', notes: '' })
                  }} className="flex-1 bg-accent text-black font-bold rounded-xl py-3 text-sm">Añadir</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: crear ejercicio personalizado */}
      {showCreateEx && (
        <div className="fixed inset-0 bg-black/90 z-[60] flex items-end">
          <div className="w-full max-w-md mx-auto bg-surface rounded-t-3xl p-5 pb-10 space-y-4">
            <p className="font-heading text-2xl text-white tracking-wide">Crear ejercicio propio</p>
            <div>
              <p className="text-white/40 text-xs mb-1.5 uppercase tracking-wider">Nombre</p>
              <input className="w-full bg-card border border-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-accent"
                placeholder="ej: Curl de concentración" value={newEx.name} onChange={e => setNewEx(x => ({ ...x, name: e.target.value }))} autoFocus />
            </div>
            <div>
              <p className="text-white/40 text-xs mb-2 uppercase tracking-wider">Músculo principal</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(MUSCLE_LABELS).map(([k, v]) => (
                  <button key={k} onClick={() => setNewEx(x => ({ ...x, muscle: k }))}
                    className={`px-3 py-1.5 rounded-xl border text-xs transition-all ${newEx.muscle === k ? 'border-accent bg-accent/20 text-accent font-semibold' : 'border-border bg-card text-white/40'}`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-white/40 text-xs mb-2 uppercase tracking-wider">Equipamiento</p>
              <div className="flex flex-wrap gap-2">
                {[['barbell', 'Barra'], ['dumbbell', 'Mancuerna'], ['machine', 'Máquina'], ['cables', 'Polea'], ['bodyweight', 'Peso corporal'], ['other', 'Otro']].map(([k, v]) => (
                  <button key={k} onClick={() => setNewEx(x => ({ ...x, equipment: k }))}
                    className={`px-3 py-1.5 rounded-xl border text-xs transition-all ${newEx.equipment === k ? 'border-accent bg-accent/20 text-accent font-semibold' : 'border-border bg-card text-white/40'}`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setShowCreateEx(false); setNewEx({ name: '', muscle: 'chest', equipment: 'barbell' }) }}
                className="flex-1 bg-card border border-border rounded-xl py-3 text-white/40 text-sm">Cancelar</button>
              <button onClick={handleCreateExercise} disabled={!newEx.name.trim()}
                className="flex-1 bg-accent text-black font-bold rounded-xl py-3 text-sm disabled:opacity-50">Crear ejercicio</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
