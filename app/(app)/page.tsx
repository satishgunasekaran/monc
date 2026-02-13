"use client"

import { useState, useEffect, useCallback } from "react"
import { DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors, closestCenter, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core"
import { format } from "date-fns"
import { toast } from "sonner"

import { AppSidebar } from "@/components/monc/app-sidebar"
import { BrainDumpPanel } from "@/components/monc/inbox-panel"
import { DayHeader } from "@/components/monc/day-header"
import { NowWidget } from "@/components/monc/now-widget"
import { Timeline } from "@/components/monc/timeline"
import { TaskDialog, type TaskDialogData } from "@/components/monc/task-dialog"
import { TaskCard } from "@/components/monc/task-card"
import { SidebarInset } from "@/components/ui/sidebar"

import { createClient } from "@/lib/supabase"
import {
  getInboxTasks,
  getSchedulesForDate,
  getTaskScheduleDates,
  materializeRecurringTasks,
  updateFutureSchedules,
  updateFutureScheduleTimeSlot,
  createTask,
  updateTask,
  deleteTask,
  scheduleTask,
  updateSchedule,
  deleteSchedule,
  toggleScheduleComplete,
  minutesToTime,
  timeToMinutes,
} from "@/lib/tasks"
import type { Task, ScheduledTask, CreateTaskInput } from "@/types/database"

export default function AppPage() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [tasks, setTasks] = useState<Task[]>([])
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>([])
  const [allScheduledTaskIds, setAllScheduledTaskIds] = useState<Set<string>>(new Set())
  const [showTaskDialog, setShowTaskDialog] = useState(false)
  const [taskDialogData, setTaskDialogData] = useState<TaskDialogData | undefined>()
  const [draggedItem, setDraggedItem] = useState<{ task: Task; schedule?: ScheduledTask } | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)

  const dateStr = format(selectedDate, "yyyy-MM-dd")

  // Load user profile
  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single()
        setUserName(data?.full_name || user.email || null)
      }
    }
    loadProfile()
  }, [])

  // Load data
  const loadData = useCallback(async (options?: { materialize?: boolean }) => {
    try {
      setIsSyncing(true)

      if (options?.materialize) {
        // Only materialize on date navigation (expensive path)
        await materializeRecurringTasks(dateStr)
      }

      const [taskData, scheduleData, scheduleDates] = await Promise.all([
        getInboxTasks(),
        getSchedulesForDate(dateStr),
        getTaskScheduleDates(),
      ])
      setTasks(taskData)
      setScheduledTasks(scheduleData)
      // Build set of all task IDs that have any schedule entry
      setAllScheduledTaskIds(new Set(scheduleDates.keys()))
    } catch (err) {
      console.error("Failed to load data:", err)
      toast.error("Failed to load tasks")
    } finally {
      setIsSyncing(false)
    }
  }, [dateStr])

  useEffect(() => {
    loadData({ materialize: true })
  }, [loadData])

  // ─── Dialog openers ────────────────────────────────────

  function openCreateDialog(defaults?: { date?: string; startTime?: string }) {
    setTaskDialogData({
      defaultDate: defaults?.date || dateStr,
      defaultStartTime: defaults?.startTime,
    })
    setShowTaskDialog(true)
  }

  function openEditDialog(task: Task) {
    setTaskDialogData({ task, defaultDate: dateStr })
    setShowTaskDialog(true)
  }

  function openAddAtTime(hour: number, minute: number) {
    const timeStr = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
    openCreateDialog({ date: dateStr, startTime: timeStr })
  }

  // ─── Save handler (create or edit) ────────────────────

  async function handleSaveTask(
    input: CreateTaskInput & { date?: string; start_time?: string },
    taskId?: string
  ) {
    try {
      if (taskId) {
        // Edit existing task
        const newDuration = input.duration_minutes || 30
        const isRecurring = input.is_recurring || false
        await updateTask(taskId, {
          title: input.title,
          notes: input.notes || null,
          priority: input.priority || "medium",
          duration_minutes: newDuration,
          color: input.color || null,
          is_recurring: isRecurring,
          recurrence_pattern: input.recurrence_pattern || null,
          recurrence_days: input.recurrence_days || [],
        })

        if (isRecurring) {
          // Update all future non-completed schedule entries
          await updateFutureSchedules(taskId, newDuration, dateStr)
        } else {
          // Non-recurring: just update today's schedule if it exists
          const existingSchedule = scheduledTasks.find((s) => s.task_id === taskId)
          if (existingSchedule) {
            const startMin = timeToMinutes(existingSchedule.start_time)
            const newEndMin = startMin + newDuration
            await updateSchedule(existingSchedule.id, {
              end_time: minutesToTime(newEndMin),
            })
          }
        }
        toast.success("Task updated")
      } else {
        // Create new task
        const newTask = await createTask(input)

        // Schedule immediately if date+time provided
        if (input.date && input.start_time) {
          const startMinutes = parseInt(input.start_time.split(":")[0]) * 60 + parseInt(input.start_time.split(":")[1])
          const endMinutes = startMinutes + (input.duration_minutes || 30)
          await scheduleTask({
            task_id: newTask.id,
            date: input.date,
            start_time: minutesToTime(startMinutes),
            end_time: minutesToTime(endMinutes),
          })
        }
        toast.success("Task created")
      }
      await loadData()
    } catch {
      toast.error(taskId ? "Failed to update task" : "Failed to create task")
    }
  }

  // ─── Other handlers ───────────────────────────────────

  async function handleDeleteTask(taskId: string) {
    try {
      await deleteTask(taskId)
      await loadData()
      toast.success("Task deleted")
    } catch {
      toast.error("Failed to delete task")
    }
  }

  async function handleDeleteSchedule(scheduleId: string) {
    try {
      await deleteSchedule(scheduleId)
      await loadData()
      toast.success("Removed from schedule")
    } catch {
      toast.error("Failed to remove from schedule")
    }
  }

  async function handleToggleComplete(scheduleId: string, completed: boolean) {
    try {
      await toggleScheduleComplete(scheduleId, completed)
      await loadData()
    } catch {
      toast.error("Failed to update task")
    }
  }

  async function handleResize(scheduleId: string, newEndTime: string, newDurationMinutes: number) {
    const schedule = scheduledTasks.find((s) => s.id === scheduleId)
    if (!schedule) return

    // Update this schedule entry
    await updateSchedule(scheduleId, { end_time: newEndTime })

    // Update the task's default duration
    await updateTask(schedule.task_id, { duration_minutes: newDurationMinutes })

    // For recurring tasks, propagate to all future entries
    if (schedule.task.is_recurring) {
      await updateFutureSchedules(schedule.task_id, newDurationMinutes, dateStr)
    }

    await loadData()
  }

  // ─── Drag & Drop ──────────────────────────────────────

  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  })
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 200, tolerance: 5 },
  })
  const sensors = useSensors(pointerSensor, touchSensor)

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current
    if (data) {
      setDraggedItem({ task: data.task, schedule: data.schedule })
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setDraggedItem(null)

    if (!over) return
    const overId = over.id.toString()
    if (!overId.startsWith("slot-")) return

    const activeData = active.data.current
    if (!activeData) return

    const task: Task = activeData.task
    const existingSchedule: ScheduledTask | undefined = activeData.schedule

    const slotTime = overId.replace("slot-", "")
    const [slotHour, slotMinute] = slotTime.split(":").map(Number)
    const startMins = slotHour * 60 + slotMinute

    // Preserve original scheduled duration if rescheduling, otherwise use task default
    let durationMins = task.duration_minutes
    if (existingSchedule) {
      const oldStart = parseInt(existingSchedule.start_time.split(":")[0]) * 60 +
        parseInt(existingSchedule.start_time.split(":")[1])
      const oldEnd = parseInt(existingSchedule.end_time.split(":")[0]) * 60 +
        parseInt(existingSchedule.end_time.split(":")[1])
      durationMins = oldEnd - oldStart
    }
    const endMins = startMins + durationMins

    try {
      // Check if this task already has a schedule on this date (from timeline or from inbox)
      const alreadyScheduled = existingSchedule
        || scheduledTasks.find((s) => s.task_id === task.id)

      if (alreadyScheduled) {
        // Update in place instead of delete+insert to avoid data-loss on partial failure
        await updateSchedule(alreadyScheduled.id, {
          date: dateStr,
          start_time: minutesToTime(startMins),
          end_time: minutesToTime(endMins),
        })
      } else {
        await scheduleTask({
          task_id: task.id,
          date: dateStr,
          start_time: minutesToTime(startMins),
          end_time: minutesToTime(endMins),
        })
      }

      if (task.is_recurring) {
        await updateFutureScheduleTimeSlot(
          task.id,
          minutesToTime(startMins),
          minutesToTime(endMins),
          dateStr
        )
      }

      await loadData()
      toast.success(`Scheduled at ${slotTime}`)
    } catch {
      toast.error("Failed to schedule task")
    }
  }

  const completedCount = scheduledTasks.filter((s) => s.is_completed).length

  // Brain dump: only truly unscheduled, non-recurring tasks
  // Recurring tasks are handled by materialization and always appear on the timeline
  const brainDumpTasks = tasks.filter((t) => !t.is_recurring && !allScheduledTaskIds.has(t.id))

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <AppSidebar userName={userName} />

      <SidebarInset className="flex h-screen flex-1 overflow-hidden">
        <div className="flex flex-1 overflow-hidden">
          {/* Brain Dump */}
          <BrainDumpPanel
            tasks={brainDumpTasks}
            onAddTask={() => openCreateDialog()}
            onDelete={handleDeleteTask}
            onEdit={openEditDialog}
          />

          {/* Main Timeline */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {isSyncing && (
              <div className="relative h-0.5 w-full overflow-hidden bg-border/30">
                <div className="absolute inset-y-0 w-1/3 animate-[slide_1s_ease-in-out_infinite] bg-primary" />
              </div>
            )}
            <DayHeader
              date={selectedDate}
              onDateChange={setSelectedDate}
              onAddTask={() => openCreateDialog()}
              scheduledCount={scheduledTasks.length}
              completedCount={completedCount}
            />

            <NowWidget scheduledTasks={scheduledTasks} />

            <Timeline
              startHour={6}
              endHour={23}
              scheduledTasks={scheduledTasks}
              slotMinutes={30}
              onToggleComplete={handleToggleComplete}
              onDelete={handleDeleteTask}
              onDeleteSchedule={handleDeleteSchedule}
              onEdit={openEditDialog}
              onAddAtTime={openAddAtTime}
              onResize={handleResize}
              onDataChange={loadData}
            />
          </div>
        </div>
      </SidebarInset>

      {/* Drag overlay */}
      <DragOverlay dropAnimation={null}>
        {draggedItem && (
          <div className="w-48 rounded-md border bg-card p-2 shadow-lg opacity-90 rotate-1">
            <p className="truncate text-xs font-medium">{draggedItem.task.title}</p>
          </div>
        )}
      </DragOverlay>

      {/* Unified task dialog (create + edit) */}
      <TaskDialog
        open={showTaskDialog}
        onOpenChange={setShowTaskDialog}
        onSave={handleSaveTask}
        data={taskDialogData}
      />
    </DndContext>
  )
}
