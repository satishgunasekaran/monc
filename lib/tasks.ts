import { createClient } from "@/lib/supabase"
import type { Task, TaskSchedule, ScheduledTask, CreateTaskInput, ScheduleTaskInput } from "@/types/database"

function getSupabase() {
  return createClient()
}

// ─── Tasks CRUD ────────────────────────────────────────────

export async function getTasks() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) throw error
  return data as Task[]
}

export async function getInboxTasks() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .in("status", ["todo", "in_progress"])
    .order("created_at", { ascending: false })

  if (error) throw error
  return data as Task[]
}

/** Get the nearest scheduled date for each task (for inbox display) */
export async function getTaskScheduleDates(): Promise<Map<string, string>> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("task_schedules")
    .select("task_id, date")
    .order("date", { ascending: true })

  if (error) throw error

  // Map each task to its earliest (nearest) scheduled date
  const map = new Map<string, string>()
  for (const row of data || []) {
    if (!map.has(row.task_id)) {
      map.set(row.task_id, row.date)
    }
  }
  return map
}

export async function createTask(input: CreateTaskInput) {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      user_id: user.id,
      title: input.title,
      notes: input.notes || null,
      priority: input.priority || "medium",
      duration_minutes: input.duration_minutes || 30,
      color: input.color || null,
      is_recurring: input.is_recurring || false,
      recurrence_pattern: input.recurrence_pattern || null,
      recurrence_days: input.recurrence_days || [],
      recurrence_end_date: input.recurrence_end_date || null,
    })
    .select()
    .single()

  if (error) throw error
  return data as Task
}

export async function updateTask(id: string, updates: Partial<Task>) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return data as Task
}

export async function deleteTask(id: string) {
  const supabase = getSupabase()
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id)

  if (error) throw error
}

// ─── Task Schedules ────────────────────────────────────────

export async function getSchedulesForDate(date: string): Promise<ScheduledTask[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("task_schedules")
    .select("*, task:tasks!inner(*)")
    .eq("date", date)
    .order("start_time", { ascending: true })

  if (error) throw error
  return (data || []) as ScheduledTask[]
}

export async function scheduleTask(input: ScheduleTaskInput) {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { data, error } = await supabase
    .from("task_schedules")
    .insert({
      task_id: input.task_id,
      user_id: user.id,
      date: input.date,
      start_time: input.start_time,
      end_time: input.end_time,
    })
    .select("*, task:tasks(*)")
    .single()

  if (error) throw error
  return data as ScheduledTask
}

export async function updateSchedule(id: string, updates: Partial<TaskSchedule>) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("task_schedules")
    .update(updates)
    .eq("id", id)
    .select("*, task:tasks(*)")
    .single()

  if (error) throw error
  return data as ScheduledTask
}

export async function deleteSchedule(id: string) {
  const supabase = getSupabase()
  const { error } = await supabase
    .from("task_schedules")
    .delete()
    .eq("id", id)

  if (error) throw error
}

export async function toggleScheduleComplete(id: string, isCompleted: boolean) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("task_schedules")
    .update({
      is_completed: isCompleted,
      completed_at: isCompleted ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .select("*, task:tasks(*)")
    .single()

  if (error) throw error
  return data as ScheduledTask
}

/**
 * Update all future (non-completed) schedule entries for a recurring task.
 * First materializes the next 14 days so entries exist, then updates them.
 * @param currentDate - YYYY-MM-DD string in local time (from the caller)
 */
export async function updateFutureSchedules(
  taskId: string,
  newDurationMinutes: number,
  currentDate: string
): Promise<void> {
  const supabase = getSupabase()

  // Materialize the next 14 days first so entries exist before we update them
  const baseDate = new Date(currentDate + "T00:00:00")
  for (let i = 0; i <= 14; i++) {
    const d = new Date(baseDate)
    d.setDate(d.getDate() + i)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    await materializeRecurringTasks(`${y}-${m}-${day}`)
  }

  // Now get all future non-completed schedules for this task
  const { data: schedules, error } = await supabase
    .from("task_schedules")
    .select("id, start_time, date")
    .eq("task_id", taskId)
    .eq("is_completed", false)
    .gte("date", currentDate)

  if (error) {
    console.error("Failed to fetch schedules for update:", error)
    return
  }
  if (!schedules?.length) return

  console.log(`Updating ${schedules.length} future schedules for task ${taskId}`)

  // Update each schedule's end_time based on new duration
  for (const schedule of schedules) {
    const startMin = timeToMinutes(schedule.start_time)
    const newEndTime = minutesToTime(startMin + newDurationMinutes)
    const { error: updateErr } = await supabase
      .from("task_schedules")
      .update({ end_time: newEndTime })
      .eq("id", schedule.id)
    if (updateErr) {
      console.error(`Failed to update schedule ${schedule.id}:`, updateErr)
    }
  }
}

/**
 * Update future (non-completed) schedule entries for a recurring task to a new time slot.
 */
export async function updateFutureScheduleTimeSlot(
  taskId: string,
  newStartTime: string,
  newEndTime: string,
  currentDate: string
): Promise<void> {
  const supabase = getSupabase()

  // Materialize upcoming days first so the update applies consistently.
  const baseDate = new Date(currentDate + "T00:00:00")
  for (let i = 1; i <= 14; i++) {
    const d = new Date(baseDate)
    d.setDate(d.getDate() + i)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    await materializeRecurringTasks(`${y}-${m}-${day}`)
  }

  const { error } = await supabase
    .from("task_schedules")
    .update({
      start_time: newStartTime,
      end_time: newEndTime,
    })
    .eq("task_id", taskId)
    .eq("is_completed", false)
    .gt("date", currentDate)

  if (error) {
    console.error("Failed to update future schedule time slots:", error)
  }
}

// ─── Recurring Task Materialization ────────────────────────

/** Check if a recurring task should appear on a given date */
function shouldRecurOnDate(task: Task, date: string): boolean {
  if (!task.is_recurring) return false

  // Default to daily if pattern is missing
  const pattern = task.recurrence_pattern || "daily"

  // Check end date
  if (task.recurrence_end_date && date > task.recurrence_end_date) return false

  // Don't generate for dates before the task was created
  const createdDate = task.created_at.split("T")[0]
  if (date < createdDate) return false

  const d = new Date(date + "T00:00:00")
  const dayOfWeek = d.getDay() // 0=Sun, 1=Mon, ..., 6=Sat

  switch (pattern) {
    case "daily":
      return true
    case "weekdays":
      return dayOfWeek >= 1 && dayOfWeek <= 5
    case "weekly":
      // recurrence_days stores which days of the week (0-6)
      return task.recurrence_days.includes(dayOfWeek)
    case "biweekly": {
      // Every 2 weeks from creation date on the specified days
      const created = new Date(createdDate + "T00:00:00")
      const diffMs = d.getTime() - created.getTime()
      const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000))
      return diffWeeks % 2 === 0 && task.recurrence_days.includes(dayOfWeek)
    }
    case "monthly": {
      // Same day of month as creation
      const createdDay = new Date(createdDate + "T00:00:00").getDate()
      return d.getDate() === createdDay
    }
    default:
      return false
  }
}

/**
 * Materialize recurring tasks for a given date.
 * Creates schedule entries for recurring tasks that don't have one yet.
 * Uses the most recent schedule's time, or falls back to 9:00 AM.
 */
export async function materializeRecurringTasks(date: string): Promise<void> {
  const supabase = getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  // Get all recurring tasks
  const { data: recurringTasks, error: tasksErr } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_recurring", true)
    .in("status", ["todo", "in_progress"])

  if (tasksErr || !recurringTasks?.length) return

  // Get existing schedules for this date to avoid duplicates
  const { data: existingSchedules } = await supabase
    .from("task_schedules")
    .select("task_id")
    .eq("date", date)
    .eq("user_id", user.id)

  const existingTaskIds = new Set((existingSchedules || []).map((s) => s.task_id))

  // Find tasks that need materialization
  const toCreate: { task: Task; start_time: string; end_time: string }[] = []

  for (const task of recurringTasks as Task[]) {
    if (existingTaskIds.has(task.id)) continue
    if (!shouldRecurOnDate(task, date)) continue

    // Find the most recent schedule for this task to copy the time
    const { data: recentSchedule } = await supabase
      .from("task_schedules")
      .select("start_time, end_time")
      .eq("task_id", task.id)
      .order("date", { ascending: false })
      .limit(1)
      .single()

    const startTime = recentSchedule?.start_time || "09:00:00"
    const endTime = recentSchedule?.end_time || minutesToTime(9 * 60 + task.duration_minutes)

    toCreate.push({ task, start_time: startTime, end_time: endTime })
  }

  if (toCreate.length === 0) return

  // Batch insert
  const { error: insertErr } = await supabase
    .from("task_schedules")
    .insert(
      toCreate.map((item) => ({
        task_id: item.task.id,
        user_id: user.id,
        date,
        start_time: item.start_time,
        end_time: item.end_time,
      }))
    )

  if (insertErr) console.error("Failed to materialize recurring tasks:", insertErr)
}

// ─── Helpers ───────────────────────────────────────────────

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number)
  return h * 60 + m
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:00`
}

export function formatTimeDisplay(time: string): string {
  const [h, m] = time.split(":")
  const hour = parseInt(h)
  const ampm = hour >= 12 ? "PM" : "AM"
  const displayHour = hour % 12 || 12
  return `${displayHour}:${m} ${ampm}`
}

/** Format a schedule date relative to a reference date for inbox display */
export function formatScheduleLabel(scheduledDate: string, currentDate: string): string {
  if (scheduledDate === currentDate) return "Today"

  // Calculate difference in days
  const scheduled = new Date(scheduledDate + "T00:00:00")
  const current = new Date(currentDate + "T00:00:00")
  const diffMs = scheduled.getTime() - current.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 1) return "Tomorrow"
  if (diffDays === -1) return "Yesterday"

  // Format as short date (e.g., "Feb 14")
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  return `${months[scheduled.getMonth()]} ${scheduled.getDate()}`
}
