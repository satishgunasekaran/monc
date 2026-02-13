"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Plus, BrainCircuit, ChevronLeft, ChevronRight } from "lucide-react"
import { TaskCard } from "./task-card"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import type { Task } from "@/types/database"

interface BrainDumpPanelProps {
  tasks: Task[]
  onAddTask: () => void
  onDelete: (taskId: string) => void
  onEdit: (task: Task) => void
}

// ─── Shared content (reused in both desktop panel and mobile sheet) ───

function BrainDumpContent({
  tasks,
  onAddTask,
  onDelete,
  onEdit,
}: BrainDumpPanelProps) {
  return (
    <>
      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <BrainCircuit className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">All clear</p>
          <p className="mt-1 max-w-[200px] text-xs text-muted-foreground/70">
            Dump tasks here, then drag them onto the timeline
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4 gap-1.5"
            onClick={onAddTask}
          >
            <Plus className="h-3.5 w-3.5" />
            Add a task
          </Button>
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
    </>
  )
}

// ─── Desktop: collapsible side panel ───────────────────────

function DesktopBrainDump({
  tasks,
  onAddTask,
  onDelete,
  onEdit,
}: BrainDumpPanelProps) {
  const [collapsed, setCollapsed] = useState(false)

  if (collapsed) {
    // Collapsed: slim clickable strip with icon
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="group flex h-full w-10 shrink-0 flex-col items-center gap-1 border-r bg-card/30 py-3 transition-colors hover:bg-card/80"
        title="Open Brain Dump"
      >
        <BrainCircuit className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
        {tasks.length > 0 && (
          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
            {tasks.length}
          </span>
        )}
        <ChevronRight className="mt-1 h-3 w-3 text-muted-foreground/60" />
      </button>
    )
  }

  return (
    <div className="relative flex h-full w-64 shrink-0 flex-col border-r bg-card/50">
      {/* Header */}
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
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onAddTask}>
            <Plus className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCollapsed(true)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 px-2 py-2">
        <BrainDumpContent
          tasks={tasks}
          onAddTask={onAddTask}
          onDelete={onDelete}
          onEdit={onEdit}
        />
      </ScrollArea>
    </div>
  )
}

// ─── Mobile: bottom sheet with peek handle ─────────────────

function MobileBrainDump({
  tasks,
  onAddTask,
  onDelete,
  onEdit,
}: BrainDumpPanelProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-full border bg-card px-4 py-2.5 shadow-lg transition-transform active:scale-95"
      >
        <BrainCircuit className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Brain Dump</span>
        {tasks.length > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
            {tasks.length}
          </span>
        )}
      </button>

      {/* Bottom sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="mx-auto max-h-[85vh] w-full max-w-lg rounded-t-2xl px-4 pb-8 pt-0"
          showCloseButton={false}
        >
          {/* Drag handle */}
          <div className="flex justify-center pb-2 pt-3">
            <div className="h-1.5 w-10 rounded-full bg-muted-foreground/30" />
          </div>

          <SheetHeader className="p-0 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BrainCircuit className="h-4 w-4 text-primary" />
                <SheetTitle className="text-base">Brain Dump</SheetTitle>
                {tasks.length > 0 && (
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {tasks.length}
                  </span>
                )}
              </div>
              <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={onAddTask}>
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            </div>
            <SheetDescription className="sr-only">
              Your unscheduled tasks. Drag them onto the timeline to schedule.
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="max-h-[calc(85vh-8rem)]">
            <BrainDumpContent
              tasks={tasks}
              onAddTask={onAddTask}
              onDelete={onDelete}
              onEdit={onEdit}
            />
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  )
}

// ─── Exported component ────────────────────────────────────

export function BrainDumpPanel(props: BrainDumpPanelProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return <MobileBrainDump {...props} />
  }

  return <DesktopBrainDump {...props} />
}
