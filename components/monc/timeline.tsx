"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useDroppable } from "@dnd-kit/core"
import { cn } from "@/lib/utils"
import { Plus } from "lucide-react"
import { TaskCard } from "./task-card"
import type { ScheduledTask, Task } from "@/types/database"
import { timeToMinutes, formatTimeDisplay, minutesToTime } from "@/lib/tasks"
import { toast } from "sonner"

interface TimelineProps {
  startHour: number
  endHour: number
  scheduledTasks: ScheduledTask[]
  slotMinutes: number
  onToggleComplete: (scheduleId: string, completed: boolean) => void
  onDelete: (taskId: string) => void
  onDeleteSchedule: (scheduleId: string) => void
  onEdit: (task: Task) => void
  onAddAtTime: (hour: number, minute: number) => void
  onResize: (scheduleId: string, newEndTime: string, newDurationMinutes: number) => Promise<void>
  onDataChange: () => void
}

// Map of scheduleId -> committed preview height (kept until data reloads)
type ResizeOverrides = Map<string, number>

const HOUR_HEIGHT = 72
const SLOT_HEIGHT_PER_MIN = HOUR_HEIGHT / 60

function NowIndicator({ startHour, endHour }: { startHour: number; endHour: number }) {
  const [mounted, setMounted] = useState(false)
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setMounted(true)
    setNow(new Date())
    const interval = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(interval)
  }, [])

  if (!mounted || !now) return null

  const minutes = now.getHours() * 60 + now.getMinutes()
  const startMinutes = startHour * 60
  const endMinutes = endHour * 60
  const top = (minutes - startMinutes) * SLOT_HEIGHT_PER_MIN

  if (minutes < startMinutes || minutes > endMinutes) return null

  const h = now.getHours()
  const m = now.getMinutes()
  const ampm = h >= 12 ? "PM" : "AM"
  const displayH = h % 12 || 12
  const timeStr = `${displayH}:${m.toString().padStart(2, "0")} ${ampm}`

  return (
    <div
      className="now-indicator pointer-events-none absolute left-0 right-0 z-30 flex items-center"
      style={{ top }}
    >
      <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" />
      <div className="h-[2px] flex-1 bg-red-500" />
      <span className="shrink-0 rounded bg-red-500 px-1 py-0.5 text-[10px] font-medium text-white">
        {timeStr}
      </span>
    </div>
  )
}

function TimeSlot({
  hour,
  minute,
  slotMinutes,
  startHour,
  onAddAtTime,
}: {
  hour: number
  minute: number
  slotMinutes: number
  startHour: number
  onAddAtTime: (hour: number, minute: number) => void
}) {
  const slotId = `slot-${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
  const { setNodeRef, isOver } = useDroppable({
    id: slotId,
    data: { type: "timeslot", hour, minute },
  })

  const totalMinutes = hour * 60 + minute
  const startMinutes = startHour * 60
  const top = (totalMinutes - startMinutes) * SLOT_HEIGHT_PER_MIN
  const height = slotMinutes * SLOT_HEIGHT_PER_MIN
  const isHourBoundary = minute === 0

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "group/slot absolute left-0 right-0 border-t transition-colors",
        isHourBoundary ? "border-border/60" : "border-border/20 border-dashed",
        isOver && "bg-primary/8"
      )}
      style={{ top, height }}
    >
      <button
        onClick={() => onAddAtTime(hour, minute)}
        className="absolute right-2 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary opacity-0 transition-opacity hover:bg-primary/20 group-hover/slot:opacity-100"
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  )
}

export function Timeline({
  startHour,
  endHour,
  scheduledTasks,
  slotMinutes,
  onToggleComplete,
  onDelete,
  onDeleteSchedule,
  onEdit,
  onAddAtTime,
  onResize,
  onDataChange,
}: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const hasScrolled = useRef(false)
  const [resizingId, setResizingId] = useState<string | null>(null)
  const [resizePreviewHeight, setResizePreviewHeight] = useState<number | null>(null)
  const [resizeOverrides, setResizeOverrides] = useState<ResizeOverrides>(new Map())

  // Clear overrides when scheduledTasks change (data reloaded from server)
  useEffect(() => {
    setResizeOverrides(new Map())
  }, [scheduledTasks])

  useEffect(() => {
    if (hasScrolled.current || !containerRef.current) return
    const now = new Date()
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    const sMinutes = startHour * 60
    const scrollTo = (currentMinutes - sMinutes - 90) * SLOT_HEIGHT_PER_MIN
    containerRef.current.scrollTop = Math.max(0, scrollTo)
    hasScrolled.current = true
  }, [startHour])

  const totalHours = endHour - startHour
  const totalHeight = totalHours * HOUR_HEIGHT

  const hours = []
  for (let h = startHour; h < endHour; h++) hours.push(h)

  const slots = []
  for (let h = startHour; h < endHour; h++) {
    for (let m = 0; m < 60; m += slotMinutes) slots.push({ hour: h, minute: m })
  }

  const startMinutes = startHour * 60

  const getTaskPosition = useCallback(
    (schedule: ScheduledTask) => {
      const taskStart = timeToMinutes(schedule.start_time)
      const taskEnd = timeToMinutes(schedule.end_time)
      const top = (taskStart - startMinutes) * SLOT_HEIGHT_PER_MIN
      const height = (taskEnd - taskStart) * SLOT_HEIGHT_PER_MIN
      return { top, height }
    },
    [startMinutes]
  )

  const getOverlapGroups = useCallback(() => {
    const sorted = [...scheduledTasks].sort(
      (a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time)
    )
    const groups: ScheduledTask[][] = []
    let currentGroup: ScheduledTask[] = []

    for (const task of sorted) {
      const taskStart = timeToMinutes(task.start_time)
      if (
        currentGroup.length === 0 ||
        taskStart < timeToMinutes(currentGroup[currentGroup.length - 1].end_time)
      ) {
        currentGroup.push(task)
      } else {
        if (currentGroup.length > 0) groups.push(currentGroup)
        currentGroup = [task]
      }
    }
    if (currentGroup.length > 0) groups.push(currentGroup)
    return groups
  }, [scheduledTasks])

  const overlapGroups = getOverlapGroups()

  // ─── Resize ────────────────────────────────────────────

  function handleResizeStart(scheduleId: string) {
    const schedule = scheduledTasks.find((s) => s.id === scheduleId)
    if (!schedule) return
    setResizingId(scheduleId)
    // Calculate initial preview height
    const taskStart = timeToMinutes(schedule.start_time)
    const taskEnd = timeToMinutes(schedule.end_time)
    setResizePreviewHeight((taskEnd - taskStart) * SLOT_HEIGHT_PER_MIN)
  }

  useEffect(() => {
    if (!resizingId) return

    const schedule = scheduledTasks.find((s) => s.id === resizingId)
    if (!schedule) return

    const taskStartMin = timeToMinutes(schedule.start_time)

    // Set resize cursor on body during drag
    document.body.style.cursor = "s-resize"
    document.body.style.userSelect = "none"

    function onMouseMove(e: MouseEvent) {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const scrollTop = containerRef.current.scrollTop
      const relativeY = e.clientY - rect.top + scrollTop
      const absoluteMinutes = startMinutes + relativeY / SLOT_HEIGHT_PER_MIN

      // Snap to 15-min increments
      const snapped = Math.round(absoluteMinutes / 15) * 15
      const newEndMin = Math.max(snapped, taskStartMin + 15)
      const newHeight = (newEndMin - taskStartMin) * SLOT_HEIGHT_PER_MIN
      setResizePreviewHeight(newHeight)
    }

    function onMouseUp(e: MouseEvent) {
      document.body.style.cursor = ""
      document.body.style.userSelect = ""

      const activeResizeId = resizingId
      setResizingId(null)
      setResizePreviewHeight(null)

      if (!containerRef.current || !activeResizeId) return

      const rect = containerRef.current.getBoundingClientRect()
      const scrollTop = containerRef.current.scrollTop
      const relativeY = e.clientY - rect.top + scrollTop
      const absoluteMinutes = startMinutes + relativeY / SLOT_HEIGHT_PER_MIN

      const snapped = Math.round(absoluteMinutes / 15) * 15
      const newEndMin = Math.max(snapped, taskStartMin + 15)
      const newEndTime = minutesToTime(newEndMin)
      const newDuration = newEndMin - taskStartMin
      const newHeight = (newEndMin - taskStartMin) * SLOT_HEIGHT_PER_MIN

      // Keep the visual height until data reloads
      setResizeOverrides((prev) => new Map(prev).set(activeResizeId, newHeight))

      const hours = Math.floor(newDuration / 60)
      const mins = newDuration % 60
      const durationLabel = hours > 0
        ? mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
        : `${mins}m`
      toast.success(`Resized to ${durationLabel}`)

      // Fire and forget - don't block the UI
      onResize(activeResizeId, newEndTime, newDuration).catch(() => {
        toast.error("Failed to resize task")
      })
    }

    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
    return () => {
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }
  }, [resizingId, scheduledTasks, startMinutes, onDataChange])

  // Use a two-column layout: fixed gutter + flexible content area
  return (
    <div ref={containerRef} className="relative flex-1 overflow-y-auto overflow-x-hidden">
      <div className="flex" style={{ minHeight: totalHeight }}>
        {/* Left gutter: hour labels */}
        <div className="relative w-16 shrink-0" style={{ height: totalHeight }}>
          {hours.map((h) => {
            const top = (h - startHour) * HOUR_HEIGHT
            return (
              <div
                key={h}
                className="absolute right-2 whitespace-nowrap"
                style={{ top: top - 8 }}
              >
                <span className="text-[11px] font-medium text-muted-foreground">
                  {formatTimeDisplay(`${h.toString().padStart(2, "0")}:00:00`)}
                </span>
              </div>
            )
          })}
        </div>

        {/* Right content: slots, tasks, now-indicator */}
        <div className="relative flex-1 min-w-0" style={{ height: totalHeight }}>
          {/* Time slots */}
          {slots.map(({ hour, minute }) => (
            <TimeSlot
              key={`${hour}-${minute}`}
              hour={hour}
              minute={minute}
              slotMinutes={slotMinutes}
              startHour={startHour}
              onAddAtTime={onAddAtTime}
            />
          ))}

          {/* Scheduled tasks */}
          {overlapGroups.map((group) =>
            group.map((scheduled, idx) => {
              const { top, height } = getTaskPosition(scheduled)
              const isResizing = resizingId === scheduled.id
              const overrideHeight = resizeOverrides.get(scheduled.id)
              const displayHeight = isResizing && resizePreviewHeight != null
                ? resizePreviewHeight
                : overrideHeight ?? height
              const colCount = group.length
              const pctWidth = 100 / colCount
              const pctLeft = (idx * 100) / colCount

              return (
                <div
                  key={scheduled.id}
                  className={cn(
                    "absolute z-10 transition-none",
                    isResizing && "z-20"
                  )}
                  style={{
                    top: top + 1,
                    height: Math.max(displayHeight - 2, 24),
                    left: `${pctLeft}%`,
                    width: `${pctWidth}%`,
                    paddingRight: colCount > 1 ? 2 : 0,
                  }}
                >
                  <TaskCard
                    task={scheduled.task}
                    schedule={scheduled}
                    isScheduled
                    onToggleComplete={onToggleComplete}
                    onDelete={onDelete}
                    onDeleteSchedule={onDeleteSchedule}
                    onEdit={onEdit}
                    onResizeStart={handleResizeStart}
                    compact={height < 44}
                    showResize
                  />
                </div>
              )
            })
          )}

          {/* Now indicator */}
          <NowIndicator startHour={startHour} endHour={endHour} />
        </div>
      </div>
    </div>
  )
}
