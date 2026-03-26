-- Add report source metadata for distinguishing manual Help menu reports
-- from sync terminal failure reports.

alter table public.bug_reports
  add column if not exists report_source text;

update public.bug_reports
set report_source = 'sync_terminal'
where report_source is null;

alter table public.bug_reports
  alter column report_source set default 'sync_terminal',
  alter column report_source set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bug_reports_report_source_check'
      and conrelid = 'public.bug_reports'::regclass
  ) then
    alter table public.bug_reports
      add constraint bug_reports_report_source_check
      check (report_source in ('sync_terminal', 'manual_help_menu'));
  end if;
end $$;

create index if not exists idx_bug_reports_source_created_at
  on public.bug_reports(report_source, created_at desc);
