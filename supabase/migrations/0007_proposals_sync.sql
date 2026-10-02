-- Proposals sync to the app like tasks do: server set timestamps (`updated_at` drives incremental sync) and the same
-- `deleted` flag the sync plugin expects. Nothing is deleted by clients; a rejected proposal just stays rejected.
alter table public.proposals
  add column updated_at timestamptz not null default now(),
  add column deleted boolean not null default false;

create trigger proposals_handle_times
  before insert or update on public.proposals
  for each row execute function public.handle_times();
