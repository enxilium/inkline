-- Align remaining schema drift for MVP:
-- 1) locations.sublocation_ids
-- 2) metafield_definitions + metafield_assignments tables, constraints, indexes, and RLS
-- Safe to run multiple times.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- locations: ensure nested-location column exists
-- ---------------------------------------------------------------------------
alter table if exists public.locations
  add column if not exists sublocation_ids jsonb default '[]'::jsonb;

update public.locations
set sublocation_ids = '[]'::jsonb
where sublocation_ids is null;

alter table if exists public.locations
  alter column sublocation_ids set default '[]'::jsonb,
  alter column sublocation_ids set not null;

-- ---------------------------------------------------------------------------
-- metafield_definitions
-- ---------------------------------------------------------------------------
create table if not exists public.metafield_definitions (
  id uuid default gen_random_uuid() primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  name_normalized text not null,
  scope text not null,
  value_type text not null,
  target_entity_kind text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.metafield_definitions
  add column if not exists project_id uuid,
  add column if not exists name text,
  add column if not exists name_normalized text,
  add column if not exists scope text,
  add column if not exists value_type text,
  add column if not exists target_entity_kind text,
  add column if not exists created_at timestamp with time zone,
  add column if not exists updated_at timestamp with time zone;

update public.metafield_definitions
set created_at = timezone('utc'::text, now())
where created_at is null;

update public.metafield_definitions
set updated_at = timezone('utc'::text, now())
where updated_at is null;

alter table public.metafield_definitions
  alter column created_at set default timezone('utc'::text, now()),
  alter column updated_at set default timezone('utc'::text, now());

-- Keep NOT NULL enforcement explicit for older environments.
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'metafield_definitions') then
    alter table public.metafield_definitions
      alter column project_id set not null,
      alter column name set not null,
      alter column name_normalized set not null,
      alter column scope set not null,
      alter column value_type set not null,
      alter column created_at set not null,
      alter column updated_at set not null;
  end if;
end $$;

-- Ensure enum-like domain constraints exist.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'metafield_definitions_scope_check'
      and conrelid = 'public.metafield_definitions'::regclass
  ) then
    alter table public.metafield_definitions
      add constraint metafield_definitions_scope_check
      check (scope in ('project', 'character', 'location', 'organization'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'metafield_definitions_value_type_check'
      and conrelid = 'public.metafield_definitions'::regclass
  ) then
    alter table public.metafield_definitions
      add constraint metafield_definitions_value_type_check
      check (value_type in ('string', 'string[]', 'entity', 'entity[]', 'image', 'image[]'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'metafield_definitions_target_entity_kind_check'
      and conrelid = 'public.metafield_definitions'::regclass
  ) then
    alter table public.metafield_definitions
      add constraint metafield_definitions_target_entity_kind_check
      check (
        target_entity_kind is null
        or target_entity_kind in ('character', 'location', 'organization')
      );
  end if;
end $$;

-- One normalized name per project.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'metafield_definitions_project_id_name_normalized_key'
      and conrelid = 'public.metafield_definitions'::regclass
  ) then
    alter table public.metafield_definitions
      add constraint metafield_definitions_project_id_name_normalized_key
      unique (project_id, name_normalized);
  end if;
end $$;

create index if not exists idx_metafield_definitions_project_scope
  on public.metafield_definitions(project_id, scope);

create index if not exists idx_metafield_definitions_project_name
  on public.metafield_definitions(project_id, name);

alter table public.metafield_definitions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'metafield_definitions'
      and policyname = 'Users can CRUD metafield definitions of their projects'
  ) then
    create policy "Users can CRUD metafield definitions of their projects" on public.metafield_definitions
      for all using (
        exists (
          select 1
          from public.projects
          where projects.id = metafield_definitions.project_id
            and projects.user_id = auth.uid()
        )
      );
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- metafield_assignments
-- ---------------------------------------------------------------------------
create table if not exists public.metafield_assignments (
  id uuid default gen_random_uuid() primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  definition_id uuid not null references public.metafield_definitions(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  value_json jsonb not null default '""'::jsonb,
  order_index integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.metafield_assignments
  add column if not exists project_id uuid,
  add column if not exists definition_id uuid,
  add column if not exists entity_type text,
  add column if not exists entity_id uuid,
  add column if not exists value_json jsonb,
  add column if not exists order_index integer,
  add column if not exists created_at timestamp with time zone,
  add column if not exists updated_at timestamp with time zone;

update public.metafield_assignments
set value_json = '""'::jsonb
where value_json is null;

update public.metafield_assignments
set order_index = 0
where order_index is null;

update public.metafield_assignments
set created_at = timezone('utc'::text, now())
where created_at is null;

update public.metafield_assignments
set updated_at = timezone('utc'::text, now())
where updated_at is null;

alter table public.metafield_assignments
  alter column value_json set default '""'::jsonb,
  alter column order_index set default 0,
  alter column created_at set default timezone('utc'::text, now()),
  alter column updated_at set default timezone('utc'::text, now());

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'metafield_assignments') then
    alter table public.metafield_assignments
      alter column project_id set not null,
      alter column definition_id set not null,
      alter column entity_type set not null,
      alter column entity_id set not null,
      alter column value_json set not null,
      alter column order_index set not null,
      alter column created_at set not null,
      alter column updated_at set not null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'metafield_assignments_entity_type_check'
      and conrelid = 'public.metafield_assignments'::regclass
  ) then
    alter table public.metafield_assignments
      add constraint metafield_assignments_entity_type_check
      check (entity_type in ('character', 'location', 'organization'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'metafield_assignments_definition_entity_unique'
      and conrelid = 'public.metafield_assignments'::regclass
  ) then
    alter table public.metafield_assignments
      add constraint metafield_assignments_definition_entity_unique
      unique (definition_id, entity_type, entity_id);
  end if;
end $$;

create index if not exists idx_metafield_assignments_project
  on public.metafield_assignments(project_id);

create index if not exists idx_metafield_assignments_definition
  on public.metafield_assignments(definition_id);

create index if not exists idx_metafield_assignments_entity_order
  on public.metafield_assignments(entity_type, entity_id, order_index, created_at);

alter table public.metafield_assignments enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'metafield_assignments'
      and policyname = 'Users can CRUD metafield assignments of their projects'
  ) then
    create policy "Users can CRUD metafield assignments of their projects" on public.metafield_assignments
      for all using (
        exists (
          select 1
          from public.projects
          where projects.id = metafield_assignments.project_id
            and projects.user_id = auth.uid()
        )
      );
  end if;
end $$;
