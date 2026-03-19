-- Add bug report persistence for terminal sync failures.
-- Safe to run multiple times.

create extension if not exists pgcrypto;

create table if not exists public.bug_reports (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null,
  project_id uuid,
  entity_type text,
  entity_id text,
  failure_fingerprint text not null,
  payload jsonb not null default '{}'::jsonb,
  note varchar(280),
  app_version text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ensure columns exist for partially migrated databases.
alter table public.bug_reports
  add column if not exists user_id uuid,
  add column if not exists project_id uuid,
  add column if not exists entity_type text,
  add column if not exists entity_id text,
  add column if not exists failure_fingerprint text,
  add column if not exists payload jsonb,
  add column if not exists note varchar(280),
  add column if not exists app_version text,
  add column if not exists created_at timestamp with time zone;

alter table public.bug_reports
  alter column payload set default '{}'::jsonb,
  alter column created_at set default timezone('utc'::text, now());

update public.bug_reports
set payload = '{}'::jsonb
where payload is null;

update public.bug_reports
set created_at = timezone('utc'::text, now())
where created_at is null;

-- Enforce required fields after backfilling nulls.
alter table public.bug_reports
  alter column user_id set not null,
  alter column failure_fingerprint set not null,
  alter column payload set not null,
  alter column created_at set not null;

-- Add payload size guard (256 KB) if missing.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bug_reports_payload_size_check'
      and conrelid = 'public.bug_reports'::regclass
  ) then
    alter table public.bug_reports
      add constraint bug_reports_payload_size_check
      check (octet_length(convert_to(payload::text, 'UTF8')) <= 262144);
  end if;
end $$;

-- Ensure note length remains capped at 280 chars.
alter table public.bug_reports
  alter column note type varchar(280);

-- Foreign keys are added conditionally so the migration tolerates unusual ordering.
do $$
begin
  if exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'auth' and c.relname = 'users'
  )
  and not exists (
    select 1
    from pg_constraint
    where conname = 'bug_reports_user_id_fkey'
      and conrelid = 'public.bug_reports'::regclass
  ) then
    alter table public.bug_reports
      add constraint bug_reports_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'projects'
  )
  and not exists (
    select 1
    from pg_constraint
    where conname = 'bug_reports_project_id_fkey'
      and conrelid = 'public.bug_reports'::regclass
  ) then
    alter table public.bug_reports
      add constraint bug_reports_project_id_fkey
      foreign key (project_id) references public.projects(id) on delete set null;
  end if;
end $$;

create index if not exists idx_bug_reports_user_created_at
  on public.bug_reports(user_id, created_at desc);

create index if not exists idx_bug_reports_fingerprint
  on public.bug_reports(failure_fingerprint);

alter table public.bug_reports enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'bug_reports'
      and policyname = 'Users can read their own bug reports'
  ) then
    create policy "Users can read their own bug reports" on public.bug_reports
      for select using (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'bug_reports'
      and policyname = 'Users can insert their own bug reports'
  ) then
    create policy "Users can insert their own bug reports" on public.bug_reports
      for insert with check (auth.uid() = user_id);
  end if;
end $$;

create or replace function public.cleanup_old_bug_reports()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.bug_reports
  where created_at < timezone('utc', now()) - interval '90 days';
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'bug_reports_cleanup_after_insert'
      and tgrelid = 'public.bug_reports'::regclass
  ) then
    create trigger bug_reports_cleanup_after_insert
    after insert on public.bug_reports
    for each statement execute function public.cleanup_old_bug_reports();
  end if;
end $$;
