// Database types for Monc

export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type RecurrencePattern = 'daily' | 'weekdays' | 'weekly' | 'biweekly' | 'monthly'

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  timezone: string
  day_start_hour: number
  day_end_hour: number
  default_slot_minutes: number
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  user_id: string
  title: string
  notes: string | null
  status: TaskStatus
  priority: TaskPriority
  duration_minutes: number
  color: string | null
  is_recurring: boolean
  recurrence_pattern: RecurrencePattern | null
  recurrence_days: number[]
  recurrence_end_date: string | null
  created_at: string
  updated_at: string
}

export interface TaskSchedule {
  id: string
  task_id: string
  user_id: string
  date: string // YYYY-MM-DD
  start_time: string // HH:MM:SS
  end_time: string // HH:MM:SS
  is_completed: boolean
  completed_at: string | null
  recurrence_index: number | null
  created_at: string
  updated_at: string
}

// Joined type for display
export interface ScheduledTask extends TaskSchedule {
  task: Task
}

// For creating new tasks
export interface CreateTaskInput {
  title: string
  notes?: string
  priority?: TaskPriority
  duration_minutes?: number
  color?: string
  is_recurring?: boolean
  recurrence_pattern?: RecurrencePattern
  recurrence_days?: number[]
  recurrence_end_date?: string
}

// For scheduling a task
export interface ScheduleTaskInput {
  task_id: string
  date: string
  start_time: string
  end_time: string
}

// Task colors for visual coding
export const TASK_COLORS = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Yellow', value: '#eab308' },
] as const

// Priority colors
export const PRIORITY_CONFIG = {
  low: { label: 'Low', color: '#94a3b8', dotColor: 'bg-slate-400' },
  medium: { label: 'Medium', color: '#3b82f6', dotColor: 'bg-blue-500' },
  high: { label: 'High', color: '#f97316', dotColor: 'bg-orange-500' },
  urgent: { label: 'Urgent', color: '#ef4444', dotColor: 'bg-red-500' },
} as const
