-- Allow guest users to submit bug reports without a Supabase auth identity.

alter table public.bug_reports
  alter column user_id drop not null;

drop index if exists idx_bug_reports_user_created_at;
create index if not exists idx_bug_reports_user_created_at
  on public.bug_reports(user_id, created_at desc)
  where user_id is not null;

drop policy if exists "Users can insert their own bug reports" on public.bug_reports;
create policy "Users can insert their own bug reports" on public.bug_reports
  for insert with check (
    user_id is null
    or auth.uid() = user_id
  );
