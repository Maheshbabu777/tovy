-- Partial progress on tasks, its append only log, and the proposals AI apps make (the approval inbox).

alter table public.tasks
  add column progress smallint not null default 0 check (progress between 0 and 100);

-- One row per logged change. Never edited or deleted by clients.
create table public.progress_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  task_id uuid not null references public.tasks (id) on delete cascade,
  delta smallint not null check (delta between -100 and 100),
  progress_after smallint not null check (progress_after between 0 and 100),
  note text not null default '',
  -- 'you', or the name of the AI app that made the change
  source text not null default 'you',
  -- the person's local day, so streaks follow their clock and not the server's
  day date not null,
  created_at timestamptz not null default now()
);
create index progress_log_user_day_idx on public.progress_log (user_id, day);
create index progress_log_task_idx on public.progress_log (task_id, created_at);

-- What a connected AI app asks for. Nothing changes in the person's tasks until they approve it.
create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  app_name text not null check (length(trim(app_name)) between 1 and 60),
  kind text not null check (kind in ('add_task', 'update_progress', 'reschedule')),
  title text not null check (length(trim(title)) between 1 and 200),
  task_id uuid references public.tasks (id) on delete set null,
  -- shown side by side in the detail sheet, and read back when the proposal is approved
  before jsonb not null default '{}'::jsonb,
  after jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create index proposals_user_status_idx on public.proposals (user_id, status, created_at);

alter table public.progress_log enable row level security;
alter table public.proposals enable row level security;

create policy progress_log_select on public.progress_log for select using (user_id = auth.uid());
create policy progress_log_insert on public.progress_log for insert with check (
  user_id = auth.uid()
  and exists (select 1 from public.tasks t where t.id = task_id and t.user_id = auth.uid())
);

create policy proposals_select on public.proposals for select using (user_id = auth.uid());
create policy proposals_insert on public.proposals for insert with check (
  user_id = auth.uid() and (task_id is null or exists (select 1 from public.tasks t where t.id = task_id and t.user_id = auth.uid()))
);
create policy proposals_update on public.proposals for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
-- No update or delete policies on the log, no delete policy on proposals.

alter publication supabase_realtime add table public.proposals, public.progress_log;
