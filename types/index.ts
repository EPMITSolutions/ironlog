// types/index.ts

export type MuscleGroup =
  | 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps'
  | 'legs' | 'glutes' | 'core' | 'cardio' | 'other'

export type Equipment =
  | 'barbell' | 'dumbbell' | 'machine' | 'cables'
  | 'bodyweight' | 'kettlebell' | 'bands' | 'other'

export type GoalType = 'strength' | 'hypertrophy' | 'endurance' | 'weight_loss' | 'general'

export interface Profile {
  id: string
  full_name: string
  goal: GoalType
  weight_kg: number | null
  height_cm: number | null
  created_at: string
  updated_at: string
}

export interface Exercise {
  id: string
  name: string
  name_es: string
  muscle_group: MuscleGroup
  equipment: Equipment | null
  movement_type: 'compound' | 'isolation' | 'cardio' | null
  is_custom: boolean
}

export interface Routine {
  id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
  days?: RoutineDay[]
}

export interface RoutineDay {
  id: string
  routine_id: string
  day_number: number
  name: string
  is_rest_day: boolean
  order_index: number
  exercises?: RoutineExercise[]
}

export interface RoutineExercise {
  id: string
  routine_day_id: string
  exercise_id: string
  exercise?: Exercise
  order_index: number
  target_sets: number
  target_reps: number | null
  target_reps_max: number | null
  target_weight: number | null
  rest_seconds: number
  notes: string | null
}

export interface Session {
  id: string
  routine_day_id: string | null
  name: string | null
  started_at: string
  finished_at: string | null
  duration_secs: number | null
  notes: string | null
  rpe: number | null
}

export interface WorkoutSet {
  id: string
  session_id: string
  exercise_id: string
  exercise?: Exercise
  set_number: number
  weight_kg: number
  reps: number
  rpe: number | null
  is_warmup: boolean
  is_pr: boolean
  one_rm_kg: number | null
  created_at: string
}

export interface PersonalRecord {
  id: string
  exercise_id: string
  exercise?: Exercise
  pr_type: 'max_weight' | 'max_1rm'
  value: number
  achieved_at: string
}

export interface BodyMetric {
  id: string
  recorded_at: string
  weight_kg: number | null
  body_fat_pct: number | null
  chest_cm: number | null
  waist_cm: number | null
  bicep_cm: number | null
  thigh_cm: number | null
}

export interface ActiveSet {
  exerciseId: string
  setNumber: number
  weight: number
  reps: number
  rpe?: number
  isWarmup: boolean
  completed: boolean
  completedAt?: string
}

export interface ActiveWorkout {
  sessionId: string | null
  routineDayId: string | null
  name: string
  startedAt: string
  exercises: RoutineExercise[]
  sets: Record<string, ActiveSet[]>
  restTimer: {
    active: boolean
    totalSeconds: number
    remainingSeconds: number
    exerciseId?: string
  }
}

export interface ProgressDataPoint {
  date: string
  weight: number
  reps: number
  oneRM: number
  volume: number
  isPR: boolean
}
