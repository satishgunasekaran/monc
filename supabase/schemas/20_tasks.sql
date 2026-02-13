-- Tasks: the core task entity
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  notes text,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done', 'cancelled')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  duration_minutes int not null default 30 check (duration_minutes > 0 and duration_minutes <= 480),
  color text, -- hex color for visual coding e.g. '#3b82f6'
  
  -- Recurring task fields (null = one-time task)
  is_recurring boolean not null default false,
  recurrence_pattern text check (recurrence_pattern in ('daily', 'weekdays', 'weekly', 'biweekly', 'monthly')),
  recurrence_days int[] default '{}', -- 0=Sun, 1=Mon, ..., 6=Sat (for weekly pattern)
  recurrence_end_date date, -- null = recur forever
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

comment on table public.tasks is 'Tasks with optional recurrence patterns.';

create index idx_tasks_user_id on public.tasks (user_id);
create index idx_tasks_status on public.tasks (user_id, status);

alter table public.tasks enable row level security;

create policy "Users can view own tasks"
  on public.tasks for select using ((select auth.uid()) = user_id);

create policy "Users can insert own tasks"
  on public.tasks for insert with check ((select auth.uid()) = user_id);

create policy "Users can update own tasks"
  on public.tasks for update using ((select auth.uid()) = user_id);

create policy "Users can delete own tasks"
  on public.tasks for delete using ((select auth.uid()) = user_id);

-- Task schedule: when a task is placed on the timeline
-- Supports multiple tasks in same time slot and drag-to-reschedule
create table if not exists public.task_schedules (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  start_time time not null,
  end_time time not null,
  is_completed boolean not null default false,
  completed_at timestamptz,
  -- For recurring task instances: which occurrence this represents
  recurrence_index int, -- null for non-recurring
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  constraint valid_time_range check (end_time > start_time)
);

comment on table public.task_schedules is 'Scheduled instances of tasks on the timeline. Multiple tasks can share same time slot.';

create index idx_schedules_user_date on public.task_schedules (user_id, date);
create index idx_schedules_task on public.task_schedules (task_id);

alter table public.task_schedules enable row level security;

create policy "Users can view own schedules"
  on public.task_schedules for select using ((select auth.uid()) = user_id);

create policy "Users can insert own schedules"
  on public.task_schedules for insert with check ((select auth.uid()) = user_id);

create policy "Users can update own schedules"
  on public.task_schedules for update using ((select auth.uid()) = user_id);

create policy "Users can delete own schedules"
  on public.task_schedules for delete using ((select auth.uid()) = user_id);

-- Updated_at trigger
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tasks_updated_at
  before update on public.tasks
  for each row execute procedure public.update_updated_at();

create trigger schedules_updated_at
  before update on public.task_schedules
  for each row execute procedure public.update_updated_at();
