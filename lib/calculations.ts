// lib/calculations.ts

export function calculate1RM(weight: number, reps: number): number {
  if (reps === 1) return weight
  if (reps <= 0 || weight <= 0) return 0
  return Math.round(weight * (1 + reps / 30) * 10) / 10
}

export function weightFromPercent(oneRM: number, pct: number): number {
  return Math.round((oneRM * pct) / 100 / 2.5) * 2.5
}

export function calcVolume(sets: Array<{ weight_kg: number; reps: number }>): number {
  return sets.reduce((t, s) => t + s.weight_kg * s.reps, 0)
}

export function pctChange(current: number, prev: number): number {
  if (!prev) return 0
  return Math.round(((current - prev) / prev) * 1000) / 10
}

export function formatTime(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export function formatDuration(secs: number): string {
  if (secs < 60) return `${secs}s`
  const m = Math.floor(secs / 60)
  if (m < 60) return `${m}min`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem > 0 ? `${h}h ${rem}min` : `${h}h`
}

export function relativeDate(dateStr: string): string {
  const now = new Date()
  const d = new Date(dateStr)
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diffDays === 0) return 'Hoy'
  if (diffDays === 1) return 'Ayer'
  if (diffDays < 7) return `Hace ${diffDays} días`
  if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} sem.`
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

export function calculateStreak(dates: string[]): number {
  if (!dates.length) return 0
  const sorted = [...new Set(dates.map(d => d.split('T')[0]))].sort((a, b) => b.localeCompare(a))
  const todayStr = new Date().toISOString().split('T')[0]
  let streak = 0
  let cursor = todayStr
  for (const date of sorted) {
    if (date === cursor) {
      streak++
      const d = new Date(cursor)
      d.setDate(d.getDate() - 1)
      cursor = d.toISOString().split('T')[0]
    } else if (date < cursor) break
  }
  return streak
}

export const PERCENT_TABLE = [
  { pct: 100, reps: 1,  label: 'Fuerza máxima' },
  { pct: 95,  reps: 2,  label: 'Fuerza' },
  { pct: 90,  reps: 3,  label: 'Fuerza' },
  { pct: 85,  reps: 5,  label: 'Fuerza-Hipertrofia' },
  { pct: 80,  reps: 6,  label: 'Fuerza-Hipertrofia' },
  { pct: 75,  reps: 8,  label: 'Hipertrofia' },
  { pct: 70,  reps: 10, label: 'Hipertrofia' },
  { pct: 65,  reps: 12, label: 'Hipertrofia-Resistencia' },
  { pct: 60,  reps: 15, label: 'Resistencia' },
]

export const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

export const MUSCLE_LABELS: Record<string, string> = {
  chest: 'Pecho', back: 'Espalda', shoulders: 'Hombros',
  biceps: 'Bíceps', triceps: 'Tríceps', legs: 'Piernas',
  glutes: 'Glúteos', core: 'Core', cardio: 'Cardio', other: 'Otro',
}

export const MUSCLE_COLORS: Record<string, string> = {
  chest: '#FF6B6B', back: '#4ECDC4', shoulders: '#FFE66D',
  biceps: '#A8E6CF', triceps: '#DDA0DD', legs: '#98D8C8',
  glutes: '#F7DC6F', core: '#BB8FCE', cardio: '#85C1E9', other: '#95A5A6',
}

export const GOAL_LABELS: Record<string, string> = {
  strength: '💪 Fuerza',
  hypertrophy: '🏋️ Hipertrofia',
  endurance: '🏃 Resistencia',
  weight_loss: '🔥 Perder peso',
  general: '⚡ General',
}
