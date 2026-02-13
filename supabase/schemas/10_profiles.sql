-- User profiles (extends Supabase auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  timezone text default 'Asia/Kolkata',
  day_start_hour int default 8 check (day_start_hour >= 0 and day_start_hour <= 23),
  day_end_hour int default 22 check (day_end_hour >= 0 and day_end_hour <= 23),
  default_slot_minutes int default 30 check (default_slot_minutes in (15, 30, 45, 60)),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

comment on table public.profiles is 'User profiles with timezone and day planning preferences.';

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select using ((select auth.uid()) = id);

create policy "Users can update own profile"
  on public.profiles for update using ((select auth.uid()) = id);

create policy "Users can insert own profile"
  on public.profiles for insert with check ((select auth.uid()) = id);
