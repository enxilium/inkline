-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- USERS (Public profile & preferences)
create table if not exists public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  display_name text,
  auth_provider text,
  preferences jsonb default '{"theme": "system", "editorFontSize": 16, "editorFontFamily": "sans-serif", "defaultImageAiModel": "flux"}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_login_at timestamp with time zone
);
alter table public.users enable row level security;
do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'users'
          and policyname = 'Users can view their own profile'
    ) then
        create policy "Users can view their own profile" on public.users
          for select using (auth.uid() = id);
    end if;
end $$;
do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'users'
          and policyname = 'Users can update their own profile'
    ) then
        create policy "Users can update their own profile" on public.users
          for update using (auth.uid() = id);
    end if;
end $$;
do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'users'
          and policyname = 'Users can insert their own profile'
    ) then
        create policy "Users can insert their own profile" on public.users
          for insert with check (auth.uid() = id);
    end if;
end $$;

-- Automatically mirror new auth.users rows into public.users
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.users where id = new.id) then
    update public.users
    set
      email = coalesce(new.email, email),
      auth_provider = coalesce(new.raw_app_meta_data->>'provider', auth_provider),
      display_name = coalesce(new.raw_user_meta_data->>'full_name', display_name),
      updated_at = timezone('utc', now())
    where id = new.id;
  else
    insert into public.users (
      id,
      email,
      display_name,
      auth_provider,
      preferences,
      created_at,
      updated_at,
      last_login_at
    ) values (
      new.id,
      coalesce(new.email, ''),
      coalesce(new.raw_user_meta_data->>'full_name', ''),
      coalesce(new.raw_app_meta_data->>'provider', 'email'),
      default,
      timezone('utc', now()),
      timezone('utc', now()),
      null
    );
  end if;

  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'on_auth_user_created'
  ) then
    create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_auth_user();
  end if;
end $$;

-- PROJECTS
create table if not exists public.projects (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.projects enable row level security;
do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'projects'
          and policyname = 'Users can CRUD their own projects'
    ) then
        create policy "Users can CRUD their own projects" on public.projects
          for all using (auth.uid() = user_id);
    end if;
end $$;

-- CHAPTERS
create table if not exists public.chapters (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  title text not null,
  content jsonb,
  order_index integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.chapters enable row level security;
do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'chapters'
          and policyname = 'Users can CRUD chapters of their projects'
    ) then
        create policy "Users can CRUD chapters of their projects" on public.chapters
          for all using (
            exists (
              select 1 from public.projects
              where projects.id = chapters.project_id
              and projects.user_id = auth.uid()
            )
          );
    end if;
end $$;

-- CHARACTERS
create table if not exists public.characters (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  name text not null,
  race text,
  age integer,
  description text,
  current_location_id uuid,
  background_location_id uuid,
  organization_id uuid,
  traits jsonb default '[]'::jsonb,
  goals jsonb default '[]'::jsonb,
  secrets jsonb default '[]'::jsonb,
  tags jsonb default '[]'::jsonb,
  bgm_id uuid,
  playlist_id uuid,
  gallery_image_ids jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.characters enable row level security;
do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'characters'
          and policyname = 'Users can CRUD characters of their projects'
    ) then
        create policy "Users can CRUD characters of their projects" on public.characters
          for all using (
            exists (
              select 1 from public.projects
              where projects.id = characters.project_id
              and projects.user_id = auth.uid()
            )
          );
    end if;
end $$;

-- LOCATIONS
create table if not exists public.locations (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  name text not null,
  description text,
  culture text,
  history text,
  conflicts jsonb default '[]'::jsonb,
  tags jsonb default '[]'::jsonb,
  bgm_id uuid,
  playlist_id uuid,
  gallery_image_ids jsonb default '[]'::jsonb,
  character_ids jsonb default '[]'::jsonb,
  organization_ids jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.locations enable row level security;
do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'locations'
          and policyname = 'Users can CRUD locations of their projects'
    ) then
        create policy "Users can CRUD locations of their projects" on public.locations
          for all using (
            exists (
              select 1 from public.projects
              where projects.id = locations.project_id
              and projects.user_id = auth.uid()
            )
          );
    end if;
end $$;

-- ORGANIZATIONS
create table if not exists public.organizations (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  name text not null,
  description text,
  mission text,
  tags jsonb default '[]'::jsonb,
  location_ids jsonb default '[]'::jsonb,
  gallery_image_ids jsonb default '[]'::jsonb,
  playlist_id uuid,
  bgm_id uuid,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.organizations enable row level security;
do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'organizations'
          and policyname = 'Users can CRUD organizations of their projects'
    ) then
        create policy "Users can CRUD organizations of their projects" on public.organizations
          for all using (
            exists (
              select 1 from public.projects
              where projects.id = organizations.project_id
              and projects.user_id = auth.uid()
            )
          );
    end if;
end $$;

-- ASSETS
create table if not exists public.assets (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  type text not null,
  subject_type text,
  subject_id text,
  url text not null,
  storage_path text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.assets enable row level security;
do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'assets'
          and policyname = 'Users can CRUD assets of their projects'
    ) then
        create policy "Users can CRUD assets of their projects" on public.assets
          for all using (
            exists (
              select 1 from public.projects
              where projects.id = assets.project_id
              and projects.user_id = auth.uid()
            )
          );
    end if;
end $$;

-- CHAT CONVERSATIONS
create table if not exists public.chat_conversations (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  title text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.chat_conversations enable row level security;
do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'chat_conversations'
          and policyname = 'Users can CRUD conversations of their projects'
    ) then
        create policy "Users can CRUD conversations of their projects" on public.chat_conversations
          for all using (
            exists (
              select 1 from public.projects
              where projects.id = chat_conversations.project_id
              and projects.user_id = auth.uid()
            )
          );
    end if;
end $$;

-- CHAT MESSAGES
create table if not exists public.chat_messages (
  id uuid default uuid_generate_v4() primary key,
  conversation_id uuid references public.chat_conversations(id) on delete cascade not null,
  role text check (role in ('user','assistant')) not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.chat_messages enable row level security;
do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'chat_messages'
          and policyname = 'Users can CRUD messages of their conversations'
    ) then
        create policy "Users can CRUD messages of their conversations" on public.chat_messages
          for all using (
            exists (
              select 1
              from public.chat_conversations
              join public.projects on projects.id = chat_conversations.project_id
              where chat_conversations.id = chat_messages.conversation_id
                and projects.user_id = auth.uid()
            )
          );
    end if;
end $$;

-- SCRAP NOTES
create table if not exists public.scrap_notes (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  title text not null,
  content text default '',
  is_pinned boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.scrap_notes enable row level security;
do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'scrap_notes'
          and policyname = 'Users can CRUD scrap notes of their projects'
    ) then
        create policy "Users can CRUD scrap notes of their projects" on public.scrap_notes
          for all using (
            exists (
              select 1 from public.projects
              where projects.id = scrap_notes.project_id
              and projects.user_id = auth.uid()
            )
          );
    end if;
end $$;

-- STORAGE BUCKET POLICY (Run this in SQL Editor, but buckets are usually created in UI)
insert into storage.buckets (id, name, public)
values ('inkline-assets', 'inkline-assets', true)
on conflict (id) do update set public = true;

do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'storage'
          and tablename = 'objects'
          and policyname = 'Authenticated users can upload assets'
    ) then
        create policy "Authenticated users can upload assets" on storage.objects
            for insert with check ( auth.role() = 'authenticated' );
    end if;
end $$;
do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'storage'
          and tablename = 'objects'
          and policyname = 'Authenticated users can update assets'
    ) then
        create policy "Authenticated users can update assets" on storage.objects
            for update with check ( auth.role() = 'authenticated' );
    end if;
end $$;
do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'storage'
          and tablename = 'objects'
          and policyname = 'Authenticated users can read assets'
    ) then
        create policy "Authenticated users can read assets" on storage.objects
            for select using ( auth.role() = 'authenticated' );
    end if;
end $$;
do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'storage'
          and tablename = 'objects'
          and policyname = 'Authenticated users can delete assets'
    ) then
        create policy "Authenticated users can delete assets" on storage.objects
            for delete using ( auth.role() = 'authenticated' );
    end if;
end $$;
