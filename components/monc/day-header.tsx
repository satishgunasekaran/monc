"use client"

import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
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
    <div className="flex items-center justify-between border-b px-2 py-2 sm:px-4 sm:py-2.5">
      <div className="flex items-center gap-1 sm:gap-3">
        {/* Mobile sidebar trigger */}
        <SidebarTrigger className="h-7 w-7 md:hidden" />

        <div className="flex items-center gap-0.5 sm:gap-1">
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
            className="h-7 gap-1 px-1.5 text-sm font-medium sm:gap-1.5 sm:px-2"
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

        {/* Date + progress: hidden on very small screens */}
        <span className="hidden text-xs text-muted-foreground sm:inline">
          {format(date, "MMM d, yyyy")}
        </span>
        {scheduledCount > 0 && (
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {completedCount}/{scheduledCount} done
          </span>
        )}

        {/* Compact progress badge on mobile */}
        {scheduledCount > 0 && (
          <span className="text-[10px] text-muted-foreground sm:hidden">
            {completedCount}/{scheduledCount}
          </span>
        )}
      </div>

      <Button
        size="sm"
        className="h-7 gap-1 px-2 text-xs sm:gap-1.5 sm:px-2.5"
        onClick={onAddTask}
      >
        <Plus className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Add Task</span>
      </Button>
    </div>
  )
}
