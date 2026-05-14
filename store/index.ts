'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { dbGetAll, dbGet, dbPut, dbDelete, dbGetByIndex, uuid, initDB } from '@/lib/db'
import { calc1RM } from '@/lib/utils'

// ── Profile ───────────────────────────────────────────────────
export const useProfile = create<any>((set, get) => ({
  profile: null,
  initialized: false,
  init: async () => {
    await initDB()
    const all = await dbGetAll('profile')
    set({ profile: all[0] ?? null, initialized: true })
  },
  save: async (fullName: string, goal: string) => {
    const p = get().profile
    const updated = { id: p?.id ?? uuid(), full_name: fullName, goal, weight_kg: p?.weight_kg ?? null, created_at: p?.created_at ?? new Date().toISOString() }
    await dbPut('profile', updated)
    set({ profile: updated })
  },
  update: async (updates: any) => {
    const p = get().profile
    if (!p) return
    const updated = { ...p, ...updates }
    await dbPut('profile', updated)
    set({ profile: updated })
  },
}))

// ── Routines ──────────────────────────────────────────────────
export const useRoutines = create<any>((set, get) => ({
  routines: [],
  active: null,
  loading: false,

  load: async () => {
    set({ loading: true })
    const [routines, days, res, exercises] = await Promise.all([
      dbGetAll('routines'), dbGetAll('routine_days'), dbGetAll('routine_exercises'), dbGetAll('exercises'),
    ])
    const exMap = Object.fromEntries(exercises.map((e: any) => [e.id, e]))
    const built = routines.sort((a: any, b: any) => b.created_at.localeCompare(a.created_at)).map((r: any) => ({
      ...r,
      days: days.filter((d: any) => d.routine_id === r.id).sort((a: any, b: any) => a.order_index - b.order_index).map((d: any) => ({
        ...d,
        exercises: res.filter((re: any) => re.routine_day_id === d.id).sort((a: any, b: any) => a.order_index - b.order_index).map((re: any) => ({ ...re, exercise: exMap[re.exercise_id] }))
      }))
    }))
    set({ routines: built, active: built.find((r: any) => r.is_active) ?? null, loading: false })
  },

  create: async (name: string) => {
    await dbPut('routines', { id: uuid(), name, description: null, is_active: false, created_at: new Date().toISOString() })
    await get().load()
  },

  remove: async (id: string) => {
    const days = await dbGetByIndex('routine_days', 'routine_id', id)
    for (const d of days) {
      const res = await dbGetByIndex('routine_exercises', 'routine_day_id', d.id)
      for (const re of res) await dbDelete('routine_exercises', re.id)
      await dbDelete('routine_days', d.id)
    }
    await dbDelete('routines', id)
    await get().load()
  },

  setActive: async (id: string) => {
    const all = await dbGetAll('routines')
    for (const r of all) await dbPut('routines', { ...r, is_active: r.id === id })
    await get().load()
  },

  addDay: async (routineId: string, name: string, dayNumber: number) => {
    const existing = await dbGetByIndex('routine_days', 'routine_id', routineId)
    await dbPut('routine_days', { id: uuid(), routine_id: routineId, day_number: dayNumber, name, is_rest_day: false, order_index: existing.length })
    await get().load()
  },

  removeDay: async (dayId: string) => {
    const res = await dbGetByIndex('routine_exercises', 'routine_day_id', dayId)
    for (const re of res) await dbDelete('routine_exercises', re.id)
    await dbDelete('routine_days', dayId)
    await get().load()
  },

  addExercise: async (dayId: string, exerciseId: string, config: any) => {
    const existing = await dbGetByIndex('routine_exercises', 'routine_day_id', dayId)
    await dbPut('routine_exercises', {
      id: uuid(), routine_day_id: dayId, exercise_id: exerciseId, order_index: existing.length,
      target_sets: config.sets ?? 3, target_reps: config.reps ?? 8,
      target_reps_max: config.repsMax ?? 12, rest_seconds: config.rest ?? 90,
    })
    await get().load()
  },

  removeExercise: async (id: string) => {
    await dbDelete('routine_exercises', id)
    await get().load()
  },
}))

// ── Workout ───────────────────────────────────────────────────
export const useWorkout = create<any>()(
  persist(
    (set, get) => ({
      session: null,
      saving: false,

      start: (routineDayId: string | null, name: string, exercises: any[]) => {
        set({ session: { routineDayId, name, startedAt: new Date().toISOString(), exercises, sets: {}, rest: { active: false, total: 90, remaining: 90 } } })
      },

      completeSet: (exId: string, weight: number, reps: number, isWarmup: boolean) => {
        const s = get().session
        if (!s) return
        const prev = s.sets[exId] ?? []
        set({ session: { ...s, sets: { ...s.sets, [exId]: [...prev, { weight, reps, isWarmup, done: true, at: new Date().toISOString() }] } } })
      },

      addExtra: (exId: string) => {
        const s = get().session
        if (!s) return
        const prev = s.sets[exId] ?? []
        const last = prev[prev.length - 1]
        set({ session: { ...s, sets: { ...s.sets, [exId]: [...prev, { weight: last?.weight ?? 0, reps: last?.reps ?? 0, isWarmup: false, done: false }] } } })
      },

      startRest: (seconds: number) => {
        const s = get().session
        if (!s) return
        set({ session: { ...s, rest: { active: true, total: seconds, remaining: seconds } } })
      },

      tick: () => {
        const s = get().session
        if (!s?.rest.active) return
        const rem = Math.max(0, s.rest.remaining - 1)
        set({ session: { ...s, rest: { ...s.rest, remaining: rem, active: rem > 0 } } })
      },

      stopRest: () => {
        const s = get().session
        if (!s) return
        set({ session: { ...s, rest: { ...s.rest, active: false, remaining: 0 } } })
      },

      finish: async (notes: string, rpe: number) => {
        const s = get().session
        if (!s) return null
        set({ saving: true })
        const finishedAt = new Date().toISOString()
        const durationSecs = Math.floor((new Date(finishedAt).getTime() - new Date(s.startedAt).getTime()) / 1000)
        const sessionId = uuid()
        await dbPut('sessions', { id: sessionId, routine_day_id: s.routineDayId, name: s.name, started_at: s.startedAt, finished_at: finishedAt, duration_secs: durationSecs, notes: notes || null, rpe: rpe || null })
        const prs = await dbGetAll('personal_records')
        for (const [exId, sets] of Object.entries(s.sets) as [string, any[]][]) {
          for (let i = 0; i < sets.length; i++) {
            const set = sets[i]
            if (!set.done || !set.weight || !set.reps) continue
            const orm = calc1RM(set.weight, set.reps)
            let isPR = false
            if (!set.isWarmup) {
              const cur = prs.find((p: any) => p.exercise_id === exId && p.pr_type === 'max_weight')
              if (!cur || set.weight > cur.value) {
                isPR = true
                await dbPut('personal_records', { id: cur?.id ?? uuid(), exercise_id: exId, pr_type: 'max_weight', value: set.weight, achieved_at: finishedAt })
              }
              const cur1rm = prs.find((p: any) => p.exercise_id === exId && p.pr_type === 'max_1rm')
              if (!cur1rm || orm > cur1rm.value) {
                await dbPut('personal_records', { id: cur1rm?.id ?? uuid(), exercise_id: exId, pr_type: 'max_1rm', value: orm, achieved_at: finishedAt })
              }
            }
            await dbPut('sets', { id: uuid(), session_id: sessionId, exercise_id: exId, set_number: i + 1, weight_kg: set.weight, reps: set.reps, is_warmup: set.isWarmup, is_pr: isPR, one_rm_kg: orm, created_at: new Date().toISOString() })
          }
        }
        set({ session: null, saving: false })
        return sessionId
      },

      discard: () => set({ session: null }),
    }),
    { name: 'ironlog-workout', partialize: (s: any) => ({ session: s.session }) }
  )
)
