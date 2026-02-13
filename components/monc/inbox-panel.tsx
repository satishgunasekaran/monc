"use client"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Plus, BrainCircuit } from "lucide-react"
import { TaskCard } from "./task-card"
import type { Task } from "@/types/database"

interface BrainDumpPanelProps {
  tasks: Task[]
  onAddTask: () => void
  onDelete: (taskId: string) => void
  onEdit: (task: Task) => void
}

export function BrainDumpPanel({ tasks, onAddTask, onDelete, onEdit }: BrainDumpPanelProps) {
  return (
    <div className="flex h-full w-64 shrink-0 flex-col border-r bg-card/50">
      <div className="flex items-center justify-between border-b px-3 py-2.5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <BrainCircuit className="h-4 w-4" />
          Brain Dump
          {tasks.length > 0 && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {tasks.length}
            </span>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onAddTask}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 px-2 py-2">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <BrainCircuit className="mb-2 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">All clear</p>
            <p className="text-xs text-muted-foreground/70">
              Dump tasks here, then drag them onto the timeline
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onDelete={onDelete}
                onEdit={onEdit}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
