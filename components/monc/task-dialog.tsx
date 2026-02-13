"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Loader2 } from "lucide-react"
import { TASK_COLORS, type CreateTaskInput, type RecurrencePattern, type TaskPriority, type Task } from "@/types/database"

export interface TaskDialogData {
  task?: Task // if provided, we're editing
  defaultDate?: string // YYYY-MM-DD
  defaultStartTime?: string // HH:MM
}

interface TaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (input: CreateTaskInput & { date?: string; start_time?: string }, taskId?: string) => Promise<void>
  data?: TaskDialogData
}

const DURATION_OPTIONS = [
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
  { label: "1 hr", value: 60 },
  { label: "1.5 hr", value: 90 },
  { label: "2 hr", value: 120 },
  { label: "3 hr", value: 180 },
  { label: "4 hr", value: 240 },
]

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function generateTimeOptions(): { label: string; value: string }[] {
  const opts: { label: string; value: string }[] = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hh = h.toString().padStart(2, "0")
      const mm = m.toString().padStart(2, "0")
      const ampm = h >= 12 ? "PM" : "AM"
      const displayH = h % 12 || 12
      opts.push({
        value: `${hh}:${mm}`,
        label: `${displayH}:${mm} ${ampm}`,
      })
    }
  }
  return opts
}

const TIME_OPTIONS = generateTimeOptions()

function getNextSlotTime(): string {
  const now = new Date()
  const m = now.getMinutes()
  const roundedM = Math.ceil(m / 15) * 15
  const h = now.getHours() + (roundedM >= 60 ? 1 : 0)
  const finalM = roundedM % 60
  return `${h.toString().padStart(2, "0")}:${finalM.toString().padStart(2, "0")}`
}

export function TaskDialog({ open, onOpenChange, onSave, data }: TaskDialogProps) {
  const isEdit = !!data?.task

  const [title, setTitle] = useState("")
  const [notes, setNotes] = useState("")
  const [priority, setPriority] = useState<TaskPriority>("medium")
  const [duration, setDuration] = useState(30)
  const [color, setColor] = useState<string | null>(null)
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrencePattern, setRecurrencePattern] = useState<RecurrencePattern>("daily")
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>([])
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"))
  const [startTime, setStartTime] = useState(getNextSlotTime())
  const [scheduleNow, setScheduleNow] = useState(true)
  const [loading, setLoading] = useState(false)

  // Populate fields when editing or opening with defaults
  useEffect(() => {
    if (!open) return
    if (data?.task) {
      const t = data.task
      setTitle(t.title)
      setNotes(t.notes || "")
      setPriority(t.priority)
      setDuration(t.duration_minutes)
      setColor(t.color)
      setIsRecurring(t.is_recurring)
      setRecurrencePattern(t.recurrence_pattern || "daily")
      setRecurrenceDays(t.recurrence_days || [])
    } else {
      setTitle("")
      setNotes("")
      setPriority("medium")
      setDuration(30)
      setColor(null)
      setIsRecurring(false)
      setRecurrencePattern("daily")
      setRecurrenceDays([])
    }
    setDate(data?.defaultDate || format(new Date(), "yyyy-MM-dd"))
    setStartTime(data?.defaultStartTime || getNextSlotTime())
    setScheduleNow(!data?.task) // default schedule for new, not for edit
  }, [open, data])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    setLoading(true)
    try {
      await onSave(
        {
          title: title.trim(),
          notes: notes.trim() || undefined,
          priority,
          duration_minutes: duration,
          color: color || undefined,
          is_recurring: isRecurring,
          recurrence_pattern: isRecurring ? recurrencePattern : undefined,
          recurrence_days: isRecurring && recurrencePattern === "weekly" ? recurrenceDays : undefined,
          date: scheduleNow ? date : undefined,
          start_time: scheduleNow ? startTime : undefined,
        },
        data?.task?.id
      )
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  function toggleDay(day: number) {
    setRecurrenceDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Task" : "Create Task"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="What needs to be done?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Duration</Label>
              <Select value={duration.toString()} onValueChange={(v) => setDuration(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value.toString()}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Schedule section */}
          {!isEdit && (
            <div className="space-y-3 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="schedule-now" className="cursor-pointer">Schedule now</Label>
                  <p className="text-xs text-muted-foreground">Place on timeline immediately</p>
                </div>
                <Switch id="schedule-now" checked={scheduleNow} onCheckedChange={setScheduleNow} />
              </div>

              {scheduleNow && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Date</Label>
                    <Input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Start time</Label>
                    <Select value={startTime} onValueChange={setStartTime}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-48">
                        {TIME_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2">
              {TASK_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${
                    color === c.value ? "border-foreground scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c.value }}
                  onClick={() => setColor(color === c.value ? null : c.value)}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="recurring" className="cursor-pointer">Recurring</Label>
              <p className="text-xs text-muted-foreground">Repeat this task on a schedule</p>
            </div>
            <Switch id="recurring" checked={isRecurring} onCheckedChange={setIsRecurring} />
          </div>

          {isRecurring && (
            <div className="space-y-3 rounded-lg border p-3">
              <div className="space-y-2">
                <Label>Repeat</Label>
                <Select value={recurrencePattern} onValueChange={(v) => setRecurrencePattern(v as RecurrencePattern)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekdays">Weekdays (Mon-Fri)</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Every 2 weeks</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {recurrencePattern === "weekly" && (
                <div className="space-y-2">
                  <Label>On days</Label>
                  <div className="flex gap-1">
                    {WEEKDAYS.map((day, idx) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(idx)}
                        className={`flex h-8 w-9 items-center justify-center rounded-md text-xs font-medium transition-colors ${
                          recurrenceDays.includes(idx)
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-accent"
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
