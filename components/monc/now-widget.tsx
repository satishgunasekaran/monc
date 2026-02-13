"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Clock, ArrowRight } from "lucide-react"
import type { ScheduledTask } from "@/types/database"
import { timeToMinutes, formatTimeDisplay } from "@/lib/tasks"

interface NowWidgetProps {
  scheduledTasks: ScheduledTask[]
}

export function NowWidget({ scheduledTasks }: NowWidgetProps) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(interval)
  }, [])

  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  const currentTasks = scheduledTasks.filter((s) => {
    const start = timeToMinutes(s.start_time)
    const end = timeToMinutes(s.end_time)
    return nowMinutes >= start && nowMinutes < end && !s.is_completed
  })

  const nextTask = scheduledTasks
    .filter((s) => timeToMinutes(s.start_time) > nowMinutes && !s.is_completed)
    .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time))[0]

  if (currentTasks.length === 0 && !nextTask) return null

  return (
    <div className="flex flex-wrap items-center gap-2 border-b bg-card/50 px-3 py-1.5 sm:gap-3 sm:px-4 sm:py-2">
      {currentTasks.length > 0 && (
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
          <span className="text-[11px] font-medium sm:text-xs">Now:</span>
          {currentTasks.map((ct) => (
            <Badge key={ct.id} variant="secondary" className="max-w-[140px] truncate text-[11px] sm:max-w-none sm:text-xs">
              {ct.task.title}
              <span className="ml-1 hidden text-muted-foreground sm:inline">
                until {formatTimeDisplay(ct.end_time)}
              </span>
            </Badge>
          ))}
        </div>
      )}

      {nextTask && (
        <div className="flex items-center gap-1.5 text-muted-foreground sm:gap-2">
          {currentTasks.length > 0 && <ArrowRight className="h-3 w-3" />}
          <Clock className="h-3 w-3" />
          <span className="text-[11px] sm:text-xs">
            Next: <span className="max-w-[100px] truncate font-medium text-foreground sm:max-w-none">{nextTask.task.title}</span>{" "}
            at {formatTimeDisplay(nextTask.start_time)}
          </span>
        </div>
      )}
    </div>
  )
}
