-- Tasks and projects. Same pattern as notes: owned by one user, soft delete, server-set timestamps, row security.

create table public.projects (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null default '',
  color text not null default 'slate',
  deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null default '',
  note text not null default '',
  due_date date,
  due_time time,
  kind text not null default 'quick' check (kind in ('quick', 'deep')),
  done_at timestamptz,
  -- null means "No project"
  project_id uuid references public.projects (id) on delete set null,
  -- null means a top level task. Only a deep task can be a parent (checked by the trigger below).
  parent_id uuid references public.tasks (id) on delete cascade,
  deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (due_time is null or due_date is not null)
);

create index projects_user_updated_idx on public.projects (user_id, updated_at);
create index tasks_user_updated_idx on public.tasks (user_id, updated_at);
create index tasks_parent_idx on public.tasks (parent_id);
create index tasks_project_idx on public.tasks (project_id);

-- Server set timestamps, reusing the function from the notes migration.
create trigger projects_handle_times
  before insert or update on public.projects
  for each row execute function public.handle_times();
create trigger tasks_handle_times
  before insert or update on public.tasks
  for each row execute function public.handle_times();

-- Rules row security cannot express. security definer so the lookups see every row and the user_id comparison does
-- the work, instead of the caller's row security hiding another user's rows (which would also leak nothing, but
-- would make the error depend on who is asking).
create function public.check_task_links() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  parent_kind text;
begin
  if new.project_id is not null
     and not exists (select 1 from public.projects p where p.id = new.project_id and p.user_id = new.user_id) then
    raise exception 'project does not exist or belongs to another user' using errcode = '42501';
  end if;

  if new.parent_id is not null then
    if new.parent_id = new.id then
      raise exception 'a task cannot be its own parent' using errcode = '23514';
    end if;
    select kind into parent_kind from public.tasks p where p.id = new.parent_id and p.user_id = new.user_id;
    if not found then
      raise exception 'parent task does not exist or belongs to another user' using errcode = '42501';
    end if;
    if parent_kind <> 'deep' then
      raise exception 'only a deep task can have subtasks' using errcode = '23514';
    end if;
    -- A task cannot end up under one of its own subtasks: walk up from the new parent and look for this task.
    if exists (
      with recursive up(id, parent_id) as (
        select t.id, t.parent_id from public.tasks t where t.id = new.parent_id
        union
        select t.id, t.parent_id from public.tasks t join up on t.id = up.parent_id
      )
      select 1 from up where up.id = new.id
    ) then
      raise exception 'a task cannot be moved under its own subtask' using errcode = '23514';
    end if;
  end if;

  -- A deep task that still has subtasks cannot go back to quick.
  if tg_op = 'UPDATE' and new.kind = 'quick' and old.kind = 'deep'
     and exists (select 1 from public.tasks c where c.parent_id = new.id and not c.deleted) then
    raise exception 'a task with subtasks must stay deep' using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger tasks_check_links
  before insert or update on public.tasks
  for each row execute function public.check_task_links();

alter table public.projects enable row level security;
alter table public.tasks enable row level security;

create policy projects_select on public.projects for select using (user_id = auth.uid());
create policy projects_insert on public.projects for insert with check (user_id = auth.uid());
create policy projects_update on public.projects for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy tasks_select on public.tasks for select using (user_id = auth.uid());
create policy tasks_insert on public.tasks for insert with check (user_id = auth.uid());
create policy tasks_update on public.tasks for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
-- No delete policies on purpose: clients soft delete with deleted = true.

alter publication supabase_realtime add table public.projects, public.tasks;
