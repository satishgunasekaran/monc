
  create table "public"."profiles" (
    "id" uuid not null,
    "full_name" text,
    "avatar_url" text,
    "timezone" text default 'Asia/Kolkata'::text,
    "day_start_hour" integer default 8,
    "day_end_hour" integer default 22,
    "default_slot_minutes" integer default 30,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."profiles" enable row level security;


  create table "public"."task_schedules" (
    "id" uuid not null default gen_random_uuid(),
    "task_id" uuid not null,
    "user_id" uuid not null,
    "date" date not null,
    "start_time" time without time zone not null,
    "end_time" time without time zone not null,
    "is_completed" boolean not null default false,
    "completed_at" timestamp with time zone,
    "recurrence_index" integer,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."task_schedules" enable row level security;


  create table "public"."tasks" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "title" text not null,
    "notes" text,
    "status" text not null default 'todo'::text,
    "priority" text not null default 'medium'::text,
    "duration_minutes" integer not null default 30,
    "color" text,
    "is_recurring" boolean not null default false,
    "recurrence_pattern" text,
    "recurrence_days" integer[] default '{}'::integer[],
    "recurrence_end_date" date,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."tasks" enable row level security;

CREATE INDEX idx_schedules_task ON public.task_schedules USING btree (task_id);

CREATE INDEX idx_schedules_user_date ON public.task_schedules USING btree (user_id, date);

CREATE INDEX idx_tasks_status ON public.tasks USING btree (user_id, status);

CREATE INDEX idx_tasks_user_id ON public.tasks USING btree (user_id);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX task_schedules_pkey ON public.task_schedules USING btree (id);

CREATE UNIQUE INDEX tasks_pkey ON public.tasks USING btree (id);

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."task_schedules" add constraint "task_schedules_pkey" PRIMARY KEY using index "task_schedules_pkey";

alter table "public"."tasks" add constraint "tasks_pkey" PRIMARY KEY using index "tasks_pkey";

alter table "public"."profiles" add constraint "profiles_day_end_hour_check" CHECK (((day_end_hour >= 0) AND (day_end_hour <= 23))) not valid;

alter table "public"."profiles" validate constraint "profiles_day_end_hour_check";

alter table "public"."profiles" add constraint "profiles_day_start_hour_check" CHECK (((day_start_hour >= 0) AND (day_start_hour <= 23))) not valid;

alter table "public"."profiles" validate constraint "profiles_day_start_hour_check";

alter table "public"."profiles" add constraint "profiles_default_slot_minutes_check" CHECK ((default_slot_minutes = ANY (ARRAY[15, 30, 45, 60]))) not valid;

alter table "public"."profiles" validate constraint "profiles_default_slot_minutes_check";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."task_schedules" add constraint "task_schedules_task_id_fkey" FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE not valid;

alter table "public"."task_schedules" validate constraint "task_schedules_task_id_fkey";

alter table "public"."task_schedules" add constraint "task_schedules_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."task_schedules" validate constraint "task_schedules_user_id_fkey";

alter table "public"."task_schedules" add constraint "valid_time_range" CHECK ((end_time > start_time)) not valid;

alter table "public"."task_schedules" validate constraint "valid_time_range";

alter table "public"."tasks" add constraint "tasks_duration_minutes_check" CHECK (((duration_minutes > 0) AND (duration_minutes <= 480))) not valid;

alter table "public"."tasks" validate constraint "tasks_duration_minutes_check";

alter table "public"."tasks" add constraint "tasks_priority_check" CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text]))) not valid;

alter table "public"."tasks" validate constraint "tasks_priority_check";

alter table "public"."tasks" add constraint "tasks_recurrence_pattern_check" CHECK ((recurrence_pattern = ANY (ARRAY['daily'::text, 'weekdays'::text, 'weekly'::text, 'biweekly'::text, 'monthly'::text]))) not valid;

alter table "public"."tasks" validate constraint "tasks_recurrence_pattern_check";

alter table "public"."tasks" add constraint "tasks_status_check" CHECK ((status = ANY (ARRAY['todo'::text, 'in_progress'::text, 'done'::text, 'cancelled'::text]))) not valid;

alter table "public"."tasks" validate constraint "tasks_status_check";

alter table "public"."tasks" add constraint "tasks_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."tasks" validate constraint "tasks_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant delete on table "public"."task_schedules" to "anon";

grant insert on table "public"."task_schedules" to "anon";

grant references on table "public"."task_schedules" to "anon";

grant select on table "public"."task_schedules" to "anon";

grant trigger on table "public"."task_schedules" to "anon";

grant truncate on table "public"."task_schedules" to "anon";

grant update on table "public"."task_schedules" to "anon";

grant delete on table "public"."task_schedules" to "authenticated";

grant insert on table "public"."task_schedules" to "authenticated";

grant references on table "public"."task_schedules" to "authenticated";

grant select on table "public"."task_schedules" to "authenticated";

grant trigger on table "public"."task_schedules" to "authenticated";

grant truncate on table "public"."task_schedules" to "authenticated";

grant update on table "public"."task_schedules" to "authenticated";

grant delete on table "public"."task_schedules" to "service_role";

grant insert on table "public"."task_schedules" to "service_role";

grant references on table "public"."task_schedules" to "service_role";

grant select on table "public"."task_schedules" to "service_role";

grant trigger on table "public"."task_schedules" to "service_role";

grant truncate on table "public"."task_schedules" to "service_role";

grant update on table "public"."task_schedules" to "service_role";

grant delete on table "public"."tasks" to "anon";

grant insert on table "public"."tasks" to "anon";

grant references on table "public"."tasks" to "anon";

grant select on table "public"."tasks" to "anon";

grant trigger on table "public"."tasks" to "anon";

grant truncate on table "public"."tasks" to "anon";

grant update on table "public"."tasks" to "anon";

grant delete on table "public"."tasks" to "authenticated";

grant insert on table "public"."tasks" to "authenticated";

grant references on table "public"."tasks" to "authenticated";

grant select on table "public"."tasks" to "authenticated";

grant trigger on table "public"."tasks" to "authenticated";

grant truncate on table "public"."tasks" to "authenticated";

grant update on table "public"."tasks" to "authenticated";

grant delete on table "public"."tasks" to "service_role";

grant insert on table "public"."tasks" to "service_role";

grant references on table "public"."tasks" to "service_role";

grant select on table "public"."tasks" to "service_role";

grant trigger on table "public"."tasks" to "service_role";

grant truncate on table "public"."tasks" to "service_role";

grant update on table "public"."tasks" to "service_role";


  create policy "Users can insert own profile"
  on "public"."profiles"
  as permissive
  for insert
  to public
with check ((( SELECT auth.uid() AS uid) = id));



  create policy "Users can update own profile"
  on "public"."profiles"
  as permissive
  for update
  to public
using ((( SELECT auth.uid() AS uid) = id));



  create policy "Users can view own profile"
  on "public"."profiles"
  as permissive
  for select
  to public
using ((( SELECT auth.uid() AS uid) = id));



  create policy "Users can delete own schedules"
  on "public"."task_schedules"
  as permissive
  for delete
  to public
using ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Users can insert own schedules"
  on "public"."task_schedules"
  as permissive
  for insert
  to public
with check ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Users can update own schedules"
  on "public"."task_schedules"
  as permissive
  for update
  to public
using ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Users can view own schedules"
  on "public"."task_schedules"
  as permissive
  for select
  to public
using ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Users can delete own tasks"
  on "public"."tasks"
  as permissive
  for delete
  to public
using ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Users can insert own tasks"
  on "public"."tasks"
  as permissive
  for insert
  to public
with check ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Users can update own tasks"
  on "public"."tasks"
  as permissive
  for update
  to public
using ((( SELECT auth.uid() AS uid) = user_id));



  create policy "Users can view own tasks"
  on "public"."tasks"
  as permissive
  for select
  to public
using ((( SELECT auth.uid() AS uid) = user_id));


CREATE TRIGGER schedules_updated_at BEFORE UPDATE ON public.task_schedules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


