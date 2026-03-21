-- Add project-scoped editor templates for character/location/organization editors.
-- Safe to run multiple times.

create extension if not exists pgcrypto;

create table if not exists public.editor_templates (
  id uuid default gen_random_uuid() primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  editor_type text not null,
  placement_json jsonb not null default '{"left":[],"right":[]}'::jsonb,
  fields_json jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.editor_templates
  add column if not exists project_id uuid,
  add column if not exists editor_type text,
  add column if not exists placement_json jsonb,
  add column if not exists fields_json jsonb,
  add column if not exists created_at timestamp with time zone,
  add column if not exists updated_at timestamp with time zone;

update public.editor_templates
set placement_json = '{"left":[],"right":[]}'::jsonb
where placement_json is null;

update public.editor_templates
set fields_json = '[]'::jsonb
where fields_json is null;

update public.editor_templates
set created_at = timezone('utc'::text, now())
where created_at is null;

update public.editor_templates
set updated_at = timezone('utc'::text, now())
where updated_at is null;

alter table public.editor_templates
  alter column placement_json set default '{"left":[],"right":[]}'::jsonb,
  alter column fields_json set default '[]'::jsonb,
  alter column created_at set default timezone('utc'::text, now()),
  alter column updated_at set default timezone('utc'::text, now());

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'editor_templates'
  ) then
    alter table public.editor_templates
      alter column project_id set not null,
      alter column editor_type set not null,
      alter column placement_json set not null,
      alter column fields_json set not null,
      alter column created_at set not null,
      alter column updated_at set not null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'editor_templates_editor_type_check'
      and conrelid = 'public.editor_templates'::regclass
  ) then
    alter table public.editor_templates
      add constraint editor_templates_editor_type_check
      check (editor_type in ('character', 'location', 'organization'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'editor_templates_project_editor_type_unique'
      and conrelid = 'public.editor_templates'::regclass
  ) then
    alter table public.editor_templates
      add constraint editor_templates_project_editor_type_unique
      unique (project_id, editor_type);
  end if;
end $$;

create index if not exists idx_editor_templates_project_type
  on public.editor_templates(project_id, editor_type);

alter table public.editor_templates enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'editor_templates'
      and policyname = 'Users can CRUD editor templates of their projects'
  ) then
    create policy "Users can CRUD editor templates of their projects"
      on public.editor_templates
      for all
      using (
        exists (
          select 1
          from public.projects
          where projects.id = editor_templates.project_id
            and projects.user_id = auth.uid()
        )
      );
  end if;
end $$;
