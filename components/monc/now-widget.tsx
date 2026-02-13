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
    <div className="flex items-center gap-3 border-b bg-card/50 px-4 py-2">
      {currentTasks.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
          <span className="text-xs font-medium">Now:</span>
          {currentTasks.map((ct) => (
            <Badge key={ct.id} variant="secondary" className="text-xs">
              {ct.task.title}
              <span className="ml-1 text-muted-foreground">
                until {formatTimeDisplay(ct.end_time)}
              </span>
            </Badge>
          ))}
        </div>
      )}

      {nextTask && (
        <div className="flex items-center gap-2 text-muted-foreground">
          {currentTasks.length > 0 && <ArrowRight className="h-3 w-3" />}
          <Clock className="h-3 w-3" />
          <span className="text-xs">
            Next: <span className="font-medium text-foreground">{nextTask.task.title}</span>{" "}
            at {formatTimeDisplay(nextTask.start_time)}
          </span>
        </div>
      )}
    </div>
  )
}
