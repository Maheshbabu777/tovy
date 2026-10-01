-- Sync spike: one table, owned by one user, soft delete, server-set timestamps.
create table public.notes (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null default '',
  deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notes_user_updated_idx on public.notes (user_id, updated_at);

-- The server sets both timestamps. Device clocks are never trusted for ordering.
create function public.handle_times() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.updated_at := now();
  else
    new.created_at := old.created_at;
    new.user_id := old.user_id;
    new.updated_at := now();
  end if;
  return new;
end;
$$;

create trigger notes_handle_times
  before insert or update on public.notes
  for each row execute function public.handle_times();

alter table public.notes enable row level security;

create policy notes_select on public.notes for select using (user_id = auth.uid());
create policy notes_insert on public.notes for insert with check (user_id = auth.uid());
create policy notes_update on public.notes for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
-- No delete policy on purpose: clients soft delete with deleted = true.

alter publication supabase_realtime add table public.notes;
