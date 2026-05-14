export const uuid = () => crypto.randomUUID()

export function calc1RM(w: number, r: number) {
  if (r === 1) return w
  if (!w || !r) return 0
  return Math.round(w * (1 + r / 30) * 10) / 10
}

export function pctChange(cur: number, prev: number) {
  if (!prev) return 0
  return Math.round(((cur - prev) / prev) * 1000) / 10
}

export function calcVolume(sets: {weight_kg: number, reps: number}[]) {
  return sets.reduce((t, s) => t + s.weight_kg * s.reps, 0)
}

export function weightFromPct(oneRM: number, pct: number) {
  return Math.round((oneRM * pct) / 100 / 2.5) * 2.5
}

export function fmtTime(s: number) {
  return `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`
}

export function fmtDuration(s: number) {
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}min`
  const h = Math.floor(m / 60), rem = m % 60
  return rem ? `${h}h ${rem}min` : `${h}h`
}

export function relDate(d: string) {
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Ayer'
  if (diff < 7) return `Hace ${diff} días`
  return new Date(d).toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

export function streak(dates: string[]) {
  if (!dates.length) return 0
  const sorted = Array.from(new Set(dates.map(d => d.split('T')[0]))).sort((a,b) => b.localeCompare(a))
  let count = 0
  let cursor = new Date().toISOString().split('T')[0]
  for (const d of sorted) {
    if (d === cursor) { count++; const dt = new Date(cursor); dt.setDate(dt.getDate()-1); cursor = dt.toISOString().split('T')[0] }
    else if (d < cursor) break
  }
  return count
}

export function weekStart(d: string) {
  const dt = new Date(d), day = dt.getDay()
  dt.setDate(dt.getDate() - day + (day === 0 ? -6 : 1))
  return dt.toISOString().split('T')[0]
}

export const PERCENT_TABLE = [
  { pct: 100, reps: 1, label: 'Fuerza máxima' },
  { pct: 95, reps: 2, label: 'Fuerza' },
  { pct: 90, reps: 3, label: 'Fuerza' },
  { pct: 85, reps: 5, label: 'Fuerza-Hipertrofia' },
  { pct: 80, reps: 6, label: 'Fuerza-Hipertrofia' },
  { pct: 75, reps: 8, label: 'Hipertrofia' },
  { pct: 70, reps: 10, label: 'Hipertrofia' },
  { pct: 65, reps: 12, label: 'Hipertrofia-Resistencia' },
  { pct: 60, reps: 15, label: 'Resistencia' },
]

export const MUSCLE_LABELS: Record<string, string> = {
  chest:'Pecho', back:'Espalda', shoulders:'Hombros', biceps:'Bíceps',
  triceps:'Tríceps', legs:'Piernas', glutes:'Glúteos', core:'Core', other:'Otro',
}

export const MUSCLE_COLORS: Record<string, string> = {
  chest:'#FF6B6B', back:'#4ECDC4', shoulders:'#FFE66D', biceps:'#A8E6CF',
  triceps:'#DDA0DD', legs:'#98D8C8', glutes:'#F7DC6F', core:'#BB8FCE', other:'#95A5A6',
}

export const GOAL_LABELS: Record<string, string> = {
  strength:'💪 Fuerza', hypertrophy:'🏋️ Hipertrofia',
  endurance:'🏃 Resistencia', weight_loss:'🔥 Perder peso', general:'⚡ General',
}

export const DAY_NAMES = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo']
