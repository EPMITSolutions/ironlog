'use client'
import { openDB } from 'idb'

export const uuid = () => crypto.randomUUID()

let _db: any = null

export async function getDB() {
  if (_db) return _db
  _db = await openDB('ironlog', 1, {
    upgrade(db) {
      const stores = [
        { name: 'profile', key: 'id' },
        { name: 'exercises', key: 'id' },
        { name: 'routines', key: 'id' },
        { name: 'routine_days', key: 'id', idx: [['routine_id', 'routine_id']] },
        { name: 'routine_exercises', key: 'id', idx: [['routine_day_id', 'routine_day_id']] },
        { name: 'sessions', key: 'id' },
        { name: 'sets', key: 'id', idx: [['session_id', 'session_id'], ['exercise_id', 'exercise_id']] },
        { name: 'personal_records', key: 'id' },
        { name: 'body_metrics', key: 'id' },
      ]
      for (const s of stores) {
        if (!db.objectStoreNames.contains(s.name)) {
          const store = db.createObjectStore(s.name, { keyPath: s.key })
          for (const [name, path] of (s.idx ?? [])) store.createIndex(name, path)
        }
      }
    },
  })
  return _db
}

export async function dbGetAll<T = any>(store: string): Promise<T[]> {
  return (await getDB()).getAll(store)
}
export async function dbGet<T = any>(store: string, key: string): Promise<T | undefined> {
  return (await getDB()).get(store, key)
}
export async function dbPut(store: string, value: any) {
  return (await getDB()).put(store, value)
}
export async function dbDelete(store: string, key: string) {
  return (await getDB()).delete(store, key)
}
export async function dbGetByIndex<T = any>(store: string, index: string, value: string): Promise<T[]> {
  return (await getDB()).getAllFromIndex(store, index, value)
}

export async function initDB() {
  await getDB()
  const profiles = await dbGetAll('profile')
  if (!profiles.length) {
    await dbPut('profile', { id: uuid(), full_name: '', goal: 'hypertrophy', weight_kg: null, created_at: new Date().toISOString() })
  }
  await seedExercises()
  await seedEricRoutine()
}

async function seedExercises() {
  const existing = await dbGetAll('exercises')
  if (existing.length) return
  const rows = [
    // Piernas
    ['Media sentadilla en maquina hack', 'legs', 'machine'],
    ['Peso muerto rumano', 'legs', 'barbell'],
    ['Prensa de piernas inclinada', 'legs', 'machine'],
    ['Extensión de piernas en maquina', 'legs', 'machine'],
    ['Extensión de gemelos sentado en máquina', 'legs', 'machine'],
    ['Curl femoral sentado en máquina', 'legs', 'machine'],
    // Full body / Torso
    ['Media sentadilla con kettlebell', 'legs', 'kettlebell'],
    ['Press pectoral con mancuernas en banco inclinado', 'chest', 'dumbbell'],
    ['Remo con mancuerna con rodilla apoyada', 'back', 'dumbbell'],
    ['Jalón con polea alta al pecho con agarre ancho', 'back', 'cables'],
    ['Flexión de tronco adelante con cable-polea', 'core', 'cables'],
    // Torso
    ['Press de banca en maquina smith', 'chest', 'machine'],
    ['Remo horizontal sentado con polea', 'back', 'cables'],
    ['Elevacion lateral de hombros con mancuernas', 'shoulders', 'dumbbell'],
    ['Remo al cuello con barra cable-polea de pie', 'shoulders', 'cables'],
    ['Extensión de tríceps con cuerda y cable-polea', 'triceps', 'cables'],
    ['Curl de biceps alterno con mancuernas en banco inclinado', 'biceps', 'dumbbell'],
    // Generales
    ['Press de Banca', 'chest', 'barbell'],
    ['Press Inclinado Mancuernas', 'chest', 'dumbbell'],
    ['Aperturas Mancuernas', 'chest', 'dumbbell'],
    ['Peso Muerto', 'back', 'barbell'],
    ['Dominadas', 'back', 'bodyweight'],
    ['Remo con Barra', 'back', 'barbell'],
    ['Press Militar', 'shoulders', 'barbell'],
    ['Elevaciones Frontales', 'shoulders', 'dumbbell'],
    ['Curl con Barra', 'biceps', 'barbell'],
    ['Curl Martillo', 'biceps', 'dumbbell'],
    ['Fondos Tríceps', 'triceps', 'bodyweight'],
    ['Press Francés', 'triceps', 'barbell'],
    ['Sentadilla', 'legs', 'barbell'],
    ['Zancadas', 'legs', 'dumbbell'],
    ['Hip Thrust', 'glutes', 'barbell'],
    ['Plancha', 'core', 'bodyweight'],
    ['Crunch', 'core', 'bodyweight'],
    ['Rueda Abdominal', 'core', 'other'],
  ]
  for (const [name, muscle, equipment] of rows) {
    await dbPut('exercises', { id: uuid(), name_es: name, name, muscle_group: muscle, equipment, is_custom: false })
  }
}

async function seedEricRoutine() {
  const routines = await dbGetAll('routines')
  if (routines.length) return // ya tiene rutinas, no hacer nada

  const exercises = await dbGetAll('exercises')
  const byName = Object.fromEntries(exercises.map((e: any) => [e.name_es, e.id]))

  const routineId = uuid()
  await dbPut('routines', {
    id: routineId,
    name: 'Rutina Eric (DUO METHOD)',
    description: 'Hipertrofia y composición corporal',
    is_active: true,
    created_at: new Date().toISOString(),
  })

  // ── DÍA 1: LUNES — Tren Inferior ─────────────────────────
  const day1Id = uuid()
  await dbPut('routine_days', { id: day1Id, routine_id: routineId, day_number: 1, name: 'Tren Inferior', is_rest_day: false, order_index: 0 })
  const piernas = [
    { name: 'Media sentadilla en maquina hack',    sets: 3, reps: 8,  repsMax: 8,  rest: 90,  weight: 20 },
    { name: 'Peso muerto rumano',                  sets: 3, reps: 8,  repsMax: 8,  rest: 90,  weight: 40 },
    { name: 'Prensa de piernas inclinada',         sets: 3, reps: 10, repsMax: 10, rest: 90,  weight: 70 },
    { name: 'Extensión de piernas en maquina',     sets: 3, reps: 10, repsMax: 10, rest: 90,  weight: 60 },
    { name: 'Extensión de gemelos sentado en máquina', sets: 3, reps: 10, repsMax: 10, rest: 60, weight: 20 },
    { name: 'Curl femoral sentado en máquina',     sets: 3, reps: 10, repsMax: 10, rest: 90,  weight: 40 },
  ]
  for (let i = 0; i < piernas.length; i++) {
    const ex = piernas[i]
    const exId = byName[ex.name]
    if (!exId) continue
    await dbPut('routine_exercises', { id: uuid(), routine_day_id: day1Id, exercise_id: exId, order_index: i, target_sets: ex.sets, target_reps: ex.reps, target_reps_max: ex.repsMax, target_weight: ex.weight, rest_seconds: ex.rest, notes: null })
  }

  // ── DÍA 2: MIÉRCOLES — Torso ────────────────────────────
  const day2Id = uuid()
  await dbPut('routine_days', { id: day2Id, routine_id: routineId, day_number: 3, name: 'Torso', is_rest_day: false, order_index: 1 })
  const torso = [
    { name: 'Press de banca en maquina smith',                      sets: 3, reps: 8,  repsMax: 8,  rest: 120, weight: 30 },
    { name: 'Jalón con polea alta al pecho con agarre ancho',       sets: 3, reps: 10, repsMax: 10, rest: 90,  weight: 60 },
    { name: 'Remo horizontal sentado con polea',                    sets: 3, reps: 10, repsMax: 10, rest: 90,  weight: 30 },
    { name: 'Elevacion lateral de hombros con mancuernas',          sets: 3, reps: 10, repsMax: 10, rest: 60,  weight: 8  },
    { name: 'Remo al cuello con barra cable-polea de pie',          sets: 3, reps: 10, repsMax: 10, rest: 90,  weight: 30 },
    { name: 'Extensión de tríceps con cuerda y cable-polea',        sets: 3, reps: 10, repsMax: 10, rest: 60,  weight: 40 },
    { name: 'Curl de biceps alterno con mancuernas en banco inclinado', sets: 3, reps: 10, repsMax: 10, rest: 60, weight: 10 },
  ]
  for (let i = 0; i < torso.length; i++) {
    const ex = torso[i]
    const exId = byName[ex.name]
    if (!exId) continue
    await dbPut('routine_exercises', { id: uuid(), routine_day_id: day2Id, exercise_id: exId, order_index: i, target_sets: ex.sets, target_reps: ex.reps, target_reps_max: ex.repsMax, target_weight: ex.weight, rest_seconds: ex.rest, notes: null })
  }

  // ── DÍA 3: VIERNES — Full Body ──────────────────────────
  const day3Id = uuid()
  await dbPut('routine_days', { id: day3Id, routine_id: routineId, day_number: 5, name: 'Full Body', is_rest_day: false, order_index: 2 })
  const fullBody = [
    { name: 'Media sentadilla con kettlebell',                      sets: 3, reps: 10, repsMax: 10, rest: 90,  weight: 16 },
    { name: 'Press pectoral con mancuernas en banco inclinado',     sets: 3, reps: 10, repsMax: 10, rest: 90,  weight: 16 },
    { name: 'Remo con mancuerna con rodilla apoyada',               sets: 3, reps: 10, repsMax: 10, rest: 90,  weight: 20 },
    { name: 'Peso muerto rumano',                                   sets: 3, reps: 10, repsMax: 10, rest: 90,  weight: 20 },
    { name: 'Jalón con polea alta al pecho con agarre ancho',       sets: 3, reps: 10, repsMax: 10, rest: 90,  weight: 60 },
    { name: 'Flexión de tronco adelante con cable-polea',           sets: 3, reps: 15, repsMax: 15, rest: 60,  weight: 30 },
  ]
  for (let i = 0; i < fullBody.length; i++) {
    const ex = fullBody[i]
    const exId = byName[ex.name]
    if (!exId) continue
    await dbPut('routine_exercises', { id: uuid(), routine_day_id: day3Id, exercise_id: exId, order_index: i, target_sets: ex.sets, target_reps: ex.reps, target_reps_max: ex.repsMax, target_weight: ex.weight, rest_seconds: ex.rest, notes: null })
  }
}

export async function exportData() {
  const [profile, routines, days, res, sessions, sets, prs, metrics] = await Promise.all([
    dbGetAll('profile'), dbGetAll('routines'), dbGetAll('routine_days'),
    dbGetAll('routine_exercises'), dbGetAll('sessions'), dbGetAll('sets'),
    dbGetAll('personal_records'), dbGetAll('body_metrics'),
  ])
  return JSON.stringify({ v: 1, exported: new Date().toISOString(), profile, routines, days, res, sessions, sets, prs, metrics }, null, 2)
}

export async function importData(json: string) {
  const d = JSON.parse(json)
  if (d.profile?.[0]) await dbPut('profile', d.profile[0])
  for (const [key, store] of [['routines','routines'],['days','routine_days'],['res','routine_exercises'],['sessions','sessions'],['sets','sets'],['prs','personal_records'],['metrics','body_metrics']] as [string,string][]) {
    for (const item of (d[key] ?? [])) await dbPut(store, item)
  }
}
