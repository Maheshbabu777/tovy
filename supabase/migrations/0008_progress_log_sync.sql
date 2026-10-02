-- The progress log syncs to the app like tasks do, so it needs server set timestamps for incremental sync and the
-- `deleted` flag the sync plugin expects. Entries are still never edited or deleted by people (no update or delete policy).
alter table public.progress_log
  add column updated_at timestamptz not null default now(),
  add column deleted boolean not null default false;

create trigger progress_log_handle_times
  before insert or update on public.progress_log
  for each row execute function public.handle_times();
