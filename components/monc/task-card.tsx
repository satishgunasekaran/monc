"use client"

import { useDraggable } from "@dnd-kit/core"

import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { GripVertical, MoreHorizontal, Trash2, Repeat, Pencil } from "lucide-react"
import { PRIORITY_CONFIG, type Task, type ScheduledTask } from "@/types/database"
import { formatTimeDisplay } from "@/lib/tasks"
import { cn } from "@/lib/utils"

interface TaskCardProps {
  task: Task
  schedule?: ScheduledTask
  isScheduled?: boolean
  onToggleComplete?: (scheduleId: string, completed: boolean) => void
  onDelete?: (taskId: string) => void
  onDeleteSchedule?: (scheduleId: string) => void
  onEdit?: (task: Task) => void
  onResizeStart?: (scheduleId: string) => void
  compact?: boolean
  showResize?: boolean
}

export function TaskCard({
  task,
  schedule,
  isScheduled,
  onToggleComplete,
  onDelete,
  onDeleteSchedule,
  onEdit,
  onResizeStart,
  compact = false,
  showResize = false,
}: TaskCardProps) {
  const priorityConfig = PRIORITY_CONFIG[task.priority]
  const isCompleted = schedule?.is_completed ?? false

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: schedule ? `schedule-${schedule.id}` : `task-${task.id}`,
    data: {
      type: schedule ? "scheduled" : "unscheduled",
      task,
      schedule,
    },
  })

  // Don't apply transform to the original element during drag -
  // the DragOverlay handles the visual feedback. Just hide the original in place.
  const style: React.CSSProperties = {
    ...(task.color ? { borderLeftColor: task.color } : {}),
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative flex h-full items-start gap-1.5 rounded-md border bg-card px-2 transition-all hover:shadow-sm",
        isDragging && "opacity-0",
        isCompleted && "opacity-60",
        task.color && "border-l-[3px]",
        compact ? "py-1" : "py-1.5"
      )}
    >
      {/* Drag handle */}
      <button
        className="mt-0.5 shrink-0 cursor-grab touch-none text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      {/* Checkbox */}
      {schedule && onToggleComplete && (
        <Checkbox
          checked={isCompleted}
          onCheckedChange={(checked) =>
            onToggleComplete(schedule.id, checked as boolean)
          }
          className="mt-0.5 shrink-0"
        />
      )}

      {/* Content */}
      <div className="min-w-0 flex-1 overflow-hidden">
        <p
          className={cn(
            "truncate text-xs font-medium leading-tight",
            isCompleted && "line-through text-muted-foreground"
          )}
        >
          {task.title}
        </p>

        {!compact && (
          <div className="mt-0.5 flex flex-wrap items-center gap-1">
            {isScheduled && schedule && (
              <span className="text-[10px] text-muted-foreground">
                {formatTimeDisplay(schedule.start_time)} - {formatTimeDisplay(schedule.end_time)}
              </span>
            )}
            <Badge
              variant="outline"
              className="h-3.5 px-1 text-[9px]"
              style={{ color: priorityConfig.color, borderColor: priorityConfig.color + "40" }}
            >
              {priorityConfig.label}
            </Badge>
            {task.is_recurring && (
              <Repeat className="h-2.5 w-2.5 text-muted-foreground" />
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100"
          >
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {onEdit && (
            <DropdownMenuItem onClick={() => onEdit(task)}>
              <Pencil className="mr-2 h-3.5 w-3.5" />
              Edit task
            </DropdownMenuItem>
          )}
          {schedule && onDeleteSchedule && (
            <DropdownMenuItem onClick={() => onDeleteSchedule(schedule.id)}>
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Remove from schedule
            </DropdownMenuItem>
          )}
          {(onEdit || (schedule && onDeleteSchedule)) && onDelete && <DropdownMenuSeparator />}
          {onDelete && (
            <DropdownMenuItem
              onClick={() => onDelete(task.id)}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Delete task
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Resize handle at bottom */}
      {showResize && schedule && onResizeStart && (
        <div
          className="absolute bottom-0 left-0 right-0 flex h-2 cursor-s-resize items-center justify-center opacity-0 transition-opacity group-hover:opacity-100"
          onMouseDown={(e) => {
            e.stopPropagation()
            onResizeStart(schedule.id)
          }}
        >
          <div className="h-[2px] w-8 rounded-full bg-muted-foreground/50" />
        </div>
      )}
    </div>
  )
}
