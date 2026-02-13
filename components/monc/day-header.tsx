"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, CalendarDays, Plus } from "lucide-react"
import { format, addDays, subDays, isToday, isTomorrow, isYesterday } from "date-fns"

interface DayHeaderProps {
  date: Date
  onDateChange: (date: Date) => void
  onAddTask: () => void
  scheduledCount: number
  completedCount: number
}

function getDateLabel(date: Date): string {
  if (isToday(date)) return "Today"
  if (isTomorrow(date)) return "Tomorrow"
  if (isYesterday(date)) return "Yesterday"
  return format(date, "EEEE")
}

export function DayHeader({
  date,
  onDateChange,
  onAddTask,
  scheduledCount,
  completedCount,
}: DayHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b px-4 py-2.5">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onDateChange(subDays(date, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 px-2 text-sm font-medium"
            onClick={() => onDateChange(new Date())}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            {getDateLabel(date)}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onDateChange(addDays(date, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <span className="text-xs text-muted-foreground">
          {format(date, "MMM d, yyyy")}
        </span>
        {scheduledCount > 0 && (
          <span className="text-xs text-muted-foreground">
            {completedCount}/{scheduledCount} done
          </span>
        )}
      </div>

      <Button size="sm" className="h-7 gap-1.5 px-2.5 text-xs" onClick={onAddTask}>
        <Plus className="h-3.5 w-3.5" />
        Add Task
      </Button>
    </div>
  )
}
