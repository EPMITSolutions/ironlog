'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useProfile, useRoutines, useWorkout } from '@/store'
import { dbGetAll } from '@/lib/db'
import { relDate, fmtDuration, streak, DAY_NAMES } from '@/lib/utils'

export default function Home() {
  const { profile } = useProfile()
  const { active, load } = useRoutines()
  const { session } = useWorkout()
  const [sessions, setSessions] = useState<any[]>([])
  const [prs, setPRs] = useState<any[]>([])
  const [stats, setStats] = useState({ total: 0, streak: 0, prs: 0, volume: 0 })
  const [calendarDays, setCalendarDays] = useState<string[]>([])

  const refresh = useCallback(async () => {
    await load()
    const [allSessions, allPRs, exs, allSets] = await Promise.all([
      dbGetAll('sessions'), dbGetAll('personal_records'), dbGetAll('exercises'), dbGetAll('sets'),
    ])
    const exMap = Object.fromEntries(exs.map((e: any) => [e.id, e]))
    const done = allSessions.filter((s: any) => s.finished_at).sort((a: any, b: any) => b.started_at.localeCompare(a.started_at))
    const weightPRs = allPRs.filter((p: any) => p.pr_type === 'max_weight').sort((a: any, b: any) => b.achieved_at.localeCompare(a.achieved_at)).slice(0, 4).map((p: any) => ({ ...p, exercise: exMap[p.exercise_id] }))

    // Volumen total histórico
    const totalVol = allSets.reduce((t: number, s: any) => t + (s.weight_kg || 0) * (s.reps || 0), 0)

    // Últimos 28 días con sesión
    const last28 = done.filter((s: any) => {
      const diff = Math.floor((Date.now() - new Date(s.started_at).getTime()) / 86400000)
      return diff < 28
    }).map((s: any) => s.started_at.split('T')[0])

    setSessions(done.slice(0, 5))
    setPRs(weightPRs)
    setCalendarDays([...new Set(last28)])
    setStats({ total: done.length, streak: streak(done.map((s: any) => s.started_at)), prs: weightPRs.length, volume: totalVol })
  }, [])

  useEffect(() => { refresh() }, [])

  const todayNum = new Date().getDay() || 7
  const todayDay = active?.days?.find((d: any) => d.day_number === todayNum)
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches'
  const name = profile?.full_name?.split(' ')[0] ?? 'campeón'

  // Generar últimas 4 semanas para el calendario
  const calendarGrid = Array.from({ length: 28 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (27 - i))
    const str = d.toISOString().split('T')[0]
    return { str, trained: calendarDays.includes(str), isToday: i === 27 }
  })

  return (
    <div className="px-5 pt-14 pb-4 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <p className="text-white/40 text-sm">{greeting},</p>
          <h1 className="font-heading text-4xl text-white tracking-wide">{name} 💪</h1>
        </div>
        {session && (
          <Link href="/workout/session" className="bg-red-500/20 border border-red-500/40 rounded-full px-3 py-1.5 text-red-400 text-xs font-semibold animate-pulse">
            ● En curso
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { l: 'Sesiones', v: stats.total },
          { l: 'Racha', v: `${stats.streak}d`, a: true },
          { l: 'PRs', v: stats.prs },
          { l: 'Volumen', v: stats.volume > 1000 ? `${Math.round(stats.volume / 1000)}t` : `${Math.round(stats.volume)}kg` },
        ].map(({ l, v, a }) => (
          <div key={l} className={`bg-card border rounded-2xl p-2.5 text-center ${a ? 'border-accent' : 'border-border'}`}>
            <p className="font-heading text-2xl text-accent leading-tight">{v}</p>
            <p className="text-white/30 text-[10px] mt-0.5">{l}</p>
          </div>
        ))}
      </div>

      {/* Calendario de consistencia */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-heading text-xl text-white tracking-wide">Consistencia</h2>
          <span className="text-white/30 text-xs">últimas 4 semanas</span>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {['L','M','X','J','V','S','D'].map(d => <p key={d} className="text-white/20 text-[10px] text-center">{d}</p>)}
          {calendarGrid.map((day, i) => (
            <div key={i} className={`h-6 rounded-md ${day.isToday ? 'ring-1 ring-accent' : ''} ${day.trained ? 'bg-accent' : 'bg-card border border-border/30'}`}
              title={day.str} />
          ))}
        </div>
      </div>

      {/* Hoy toca */}
      <div>
        <h2 className="font-heading text-xl text-white tracking-wide mb-3">Hoy toca</h2>
        {!active ? (
          <div className="bg-card border border-border rounded-2xl p-5 text-center space-y-2">
            <p className="text-3xl">📋</p>
            <p className="text-white font-medium">Sin rutina activa</p>
            <Link href="/tabs/routine" className="inline-block mt-1 text-accent text-sm border border-accent/40 px-4 py-2 rounded-xl">Crear rutina</Link>
          </div>
        ) : !todayDay || todayDay.is_rest_day ? (
          <div className="bg-card border border-border rounded-2xl p-5">
            <p className="font-heading text-2xl text-white tracking-wide">😴 Descanso</p>
            <p className="text-white/30 text-sm mt-1">Recupera y vuelve mañana más fuerte.</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-white/30 text-xs">{DAY_NAMES[todayNum - 1]}</p>
                <p className="font-heading text-2xl text-white tracking-wide mt-0.5">{todayDay.name}</p>
              </div>
              <span className="text-white/30 text-xs">{todayDay.exercises?.length ?? 0} ejercicios</span>
            </div>
            <div className="space-y-1.5">
              {(todayDay.exercises ?? []).slice(0, 5).map((re: any) => (
                <div key={re.id} className="flex items-center gap-2">
                  <span className="text-accent text-xs">•</span>
                  <span className="text-white/60 text-sm flex-1 truncate">{re.exercise?.name_es}</span>
                  <span className="text-white/20 text-xs">{re.target_sets}×{re.target_reps}</span>
                </div>
              ))}
              {(todayDay.exercises?.length ?? 0) > 5 && <p className="text-white/20 text-xs ml-3">+{(todayDay.exercises?.length ?? 0) - 5} más</p>}
            </div>
            <Link href={`/workout/session?dayId=${todayDay.id}`}
              className="block w-full bg-accent text-black font-bold text-sm py-3.5 rounded-xl text-center">
              ▶ Empezar entrenamiento
            </Link>
          </div>
        )}
      </div>

      {/* Vista semanal */}
      {active && (
        <div>
          <h2 className="font-heading text-xl text-white tracking-wide mb-3">Esta semana</h2>
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: 7 }, (_, i) => i + 1).map(n => {
              const d = active.days?.find((day: any) => day.day_number === n)
              const isToday = n === todayNum
              return (
                <div key={n} className={`rounded-xl border p-2 text-center ${isToday ? 'border-accent bg-accent/10' : d ? 'border-border bg-card' : 'border-border/20 bg-transparent'}`}>
                  <p className={`text-[9px] font-semibold ${isToday ? 'text-accent' : 'text-white/20'}`}>{DAY_NAMES[n - 1].slice(0, 3)}</p>
                  <p className={`text-[10px] mt-0.5 truncate ${isToday ? 'text-white' : 'text-white/30'}`}>{d?.is_rest_day ? '😴' : d?.name?.slice(0, 4) ?? '—'}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* PRs */}
      {prs.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-heading text-xl text-white tracking-wide">Records personales</h2>
            <Link href="/tabs/progress" className="text-accent text-xs">Ver progreso</Link>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {prs.map((pr: any) => (
              <div key={pr.id} className="bg-card border border-border rounded-2xl p-3">
                <p className="font-heading text-2xl text-accent">{pr.value}kg</p>
                <p className="text-white/50 text-xs mt-1 truncate">{pr.exercise?.name_es}</p>
                <p className="text-white/20 text-xs mt-0.5">{relDate(pr.achieved_at)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sesiones recientes */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-heading text-xl text-white tracking-wide">Últimas sesiones</h2>
          <Link href="/tabs/history" className="text-accent text-xs">Ver todo</Link>
        </div>
        {sessions.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-6 text-center text-white/20 text-sm">¡Empieza tu primer entrenamiento!</div>
        ) : sessions.map((s: any) => (
          <div key={s.id} className="bg-card border border-border rounded-2xl p-3.5 mb-2 flex justify-between items-center">
            <div>
              <p className="text-white text-sm font-medium">{s.name ?? 'Entrenamiento'}</p>
              <p className="text-white/20 text-xs mt-0.5">{relDate(s.started_at)}</p>
            </div>
            <div className="text-right">
              {s.duration_secs != null && <p className="font-heading text-lg text-accent">{fmtDuration(s.duration_secs)}</p>}
              {s.rpe != null && <p className="text-white/20 text-xs">RPE {s.rpe}/10</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
