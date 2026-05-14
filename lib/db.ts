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
  // Seed profile
  const profiles = await dbGetAll('profile')
  if (!profiles.length) await dbPut('profile', { id: uuid(), full_name: '', goal: 'general', weight_kg: null, created_at: new Date().toISOString() })
  // Seed exercises
  const exs = await dbGetAll('exercises')
  if (exs.length) return
  const rows = [
    ['Press de Banca','chest','barbell'],['Press Inclinado','chest','barbell'],['Press Inclinado Mancuernas','chest','dumbbell'],
    ['Aperturas Mancuernas','chest','dumbbell'],['Cruces en Polea','chest','cables'],['Flexiones','chest','bodyweight'],
    ['Peso Muerto','back','barbell'],['Dominadas','back','bodyweight'],['Remo con Barra','back','barbell'],
    ['Remo en Polea','back','cables'],['Jalón al Pecho','back','cables'],['Remo a Una Mano','back','dumbbell'],
    ['Face Pull','back','cables'],['Press Militar','shoulders','barbell'],['Press Arnold','shoulders','dumbbell'],
    ['Elevaciones Laterales','shoulders','dumbbell'],['Elevaciones Frontales','shoulders','dumbbell'],
    ['Curl con Barra','biceps','barbell'],['Curl con Mancuerna','biceps','dumbbell'],['Curl Martillo','biceps','dumbbell'],
    ['Curl en Scott','biceps','machine'],['Fondos Tríceps','triceps','bodyweight'],['Press Francés','triceps','barbell'],
    ['Extensión en Polea','triceps','cables'],['Extensión Sobre Cabeza','triceps','dumbbell'],
    ['Sentadilla','legs','barbell'],['Peso Muerto Rumano','legs','barbell'],['Prensa de Piernas','legs','machine'],
    ['Extensión Cuádriceps','legs','machine'],['Curl Femoral','legs','machine'],['Elevación de Gemelos','legs','machine'],
    ['Sentadilla Búlgara','legs','dumbbell'],['Zancadas','legs','dumbbell'],
    ['Hip Thrust','glutes','barbell'],['Patada de Glúteo','glutes','cables'],
    ['Plancha','core','bodyweight'],['Crunch','core','bodyweight'],['Rueda Abdominal','core','other'],
    ['Elevación de Piernas','core','bodyweight'],['Crunch en Polea','core','cables'],
  ]
  for (const [name, muscle, equipment] of rows) {
    await dbPut('exercises', { id: uuid(), name_es: name, name, muscle_group: muscle, equipment, is_custom: false })
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
