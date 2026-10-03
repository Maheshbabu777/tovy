-- AI apps connect over MCP (spec mcp-server). They sign in through Supabase's OAuth server, so their requests carry the
-- person's own user id plus a `client_id` claim naming the app. The database does the rest, whichever way an app
-- reaches it (the MCP server, or the REST API directly with the same token):
--   - ai_clients: what the person allows each app (write, read only, or nothing). An app with no row may write, which is
--     the decision "AI apps write directly". Only the person can read or change this table.
--   - ai_actions: every change an app makes to tasks and projects, with the fields before and after, written by
--     triggers (an app cannot skip it, forge it or name itself), so the person can see it and undo it.
--   - tasks.created_by: the client id of the app that added a task (null means the person), set by a trigger.
-- The person's own sessions have no `client_id` claim and are not affected by any of this.

create table public.ai_clients (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  client_id text not null check (length(client_id) between 1 and 200),
  -- the app's name as the consent screen showed it, so Activity and the progress log can say who did what
  name text not null default '' check (length(name) <= 80),
  access text not null default 'write' check (access in ('write', 'read', 'none')),
  updated_at timestamptz not null default now(),
  primary key (user_id, client_id)
);

-- Is this request the person themselves (no app)? Every rule below that only the person may pass uses it.
create function public.is_person() returns boolean
language sql stable set search_path = public, pg_temp as $$
  select coalesce(auth.jwt() ->> 'client_id', '') = ''
$$;

alter table public.ai_clients enable row level security;
-- Only the person: an app can neither see the list of apps nor give itself more access.
create policy ai_clients_select on public.ai_clients for select using (user_id = auth.uid() and public.is_person());
create policy ai_clients_insert on public.ai_clients for insert
  with check (user_id = auth.uid() and public.is_person());
create policy ai_clients_update on public.ai_clients for update
  using (user_id = auth.uid() and public.is_person())
  with check (user_id = auth.uid());
create policy ai_clients_delete on public.ai_clients for delete
  using (user_id = auth.uid() and public.is_person());

-- What the request's app may do: 'write' for the person themselves or an app they have not limited, 'read' or 'none'
-- otherwise. Security definer because apps cannot read ai_clients; it returns only the caller's own access. Stable, so
-- a policy calls it once per statement through `(select public.client_access())`.
create function public.client_access() returns text
language sql stable security definer set search_path = public, pg_temp as $$
  select case
    when public.is_person() then 'write'
    else coalesce(
      (select c.access from public.ai_clients c
        where c.user_id = auth.uid() and c.client_id = auth.jwt() ->> 'client_id'),
      'write')
  end
$$;

-- The name the person approved an app under, for the triggers below.
create function public.ai_client_name(owner uuid, client text) returns text
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce((select c.name from public.ai_clients c where c.user_id = owner and c.client_id = client), '')
$$;
revoke all on function public.ai_client_name(uuid, text) from public, anon, authenticated;

create table public.ai_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  client_id text not null check (length(client_id) between 1 and 200),
  client_name text not null default '' check (length(client_name) <= 80),
  tool text not null check (tool in (
    'add_task', 'update_task', 'complete_task', 'reopen_task', 'log_progress', 'delete_task', 'restore_task',
    'add_project', 'update_project', 'delete_project'
  )),
  task_id uuid references public.tasks (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  summary text not null default '' check (length(summary) <= 300),
  -- the fields that changed, as they were and as they became (read back by Undo)
  before jsonb not null default '{}'::jsonb,
  after jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  undone_at timestamptz
);
create index ai_actions_user_created_idx on public.ai_actions (user_id, created_at desc);

alter table public.ai_actions enable row level security;
-- The person reads it and marks an action undone. Nothing else in a row can change (column grant below), nobody but
-- the triggers writes it, and nothing is deleted.
create policy ai_actions_select on public.ai_actions for select using (user_id = auth.uid() and public.is_person());
create policy ai_actions_update on public.ai_actions for update
  using (user_id = auth.uid() and public.is_person())
  with check (user_id = auth.uid());
revoke insert, update, delete on public.ai_actions from authenticated, anon;
grant update (undone_at) on public.ai_actions to authenticated;

-- Records what an app changed in a task. After the statement's rows are all written (an after trigger), so a task
-- deleted together with its subtasks is one line, listing every id for Undo. Rows changed in the same transaction share
-- `updated_at` (handle_times sets it to the transaction's time), which is how "together" is told apart.
create function public.record_ai_task_change() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  cid text := nullif(coalesce(auth.jwt() ->> 'client_id', ''), '');
  title text := left(coalesce(new.title, ''), 120);
  fields text[] := array['title', 'note', 'due_date', 'due_time', 'project_id', 'parent_id', 'kind', 'progress', 'done_at'];
  o jsonb;
  n jsonb;
  k text;
  changed text[] := '{}';
  b jsonb := '{}';
  a jsonb := '{}';
  ids uuid[];
  tool text;
  summary text;
begin
  if cid is null then
    return null;
  end if;

  if tg_op = 'INSERT' then
    tool := 'add_task';
    summary := format('Added "%s"', title);
    a := jsonb_build_object('id', new.id, 'title', new.title);
  elsif new.deleted and not old.deleted then
    -- a subtask deleted with its parent is part of the parent's line
    if new.parent_id is not null and exists (
      select 1 from public.tasks p where p.id = new.parent_id and p.deleted and p.updated_at = new.updated_at
    ) then
      return null;
    end if;
    with recursive d(id) as (
      select new.id
      union
      select t.id from public.tasks t join d on t.parent_id = d.id where t.deleted and t.updated_at = new.updated_at
    )
    select array_agg(d.id) into ids from d;
    tool := 'delete_task';
    summary := format('Deleted "%s"%s', title, case
      when cardinality(ids) = 2 then ' and 1 subtask'
      when cardinality(ids) > 2 then format(' and %s subtasks', cardinality(ids) - 1)
      else '' end);
    b := jsonb_build_object('ids', to_jsonb(ids), 'deleted', false);
    a := jsonb_build_object('deleted', true);
  elsif old.deleted and not new.deleted then
    tool := 'restore_task';
    summary := format('Restored "%s"', title);
    b := jsonb_build_object('deleted', true);
    a := jsonb_build_object('deleted', false);
  else
    o := to_jsonb(old);
    n := to_jsonb(new);
    foreach k in array fields loop
      if (o -> k) is distinct from (n -> k) then
        changed := changed || k;
        b := b || jsonb_build_object(k, o -> k);
        a := a || jsonb_build_object(k, n -> k);
      end if;
    end loop;
    if cardinality(changed) = 0 then
      return null;
    end if;
    if 'done_at' = any(changed) then
      tool := case when new.done_at is null then 'reopen_task' else 'complete_task' end;
      summary := format(case when new.done_at is null then 'Reopened "%s"' else 'Finished "%s"' end, title);
    elsif 'progress' = any(changed) and changed <@ array['progress', 'kind'] then
      tool := 'log_progress';
      summary := format('Set "%s" to %s%%', title, new.progress);
    else
      tool := 'update_task';
      summary := format('Changed %s of "%s"', array_to_string(array(
        select case f when 'project_id' then 'project' when 'parent_id' then 'parent' else replace(f, '_', ' ') end
        from unnest(changed) f), ', '), title);
    end if;
  end if;

  insert into public.ai_actions (user_id, client_id, client_name, tool, task_id, summary, before, after)
  values (new.user_id, cid, public.ai_client_name(new.user_id, cid), tool, new.id, left(summary, 300), b, a);
  return null;
end;
$$;

create trigger tasks_record_ai_change
  after insert or update on public.tasks
  for each row execute function public.record_ai_task_change();

create function public.record_ai_project_change() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  cid text := nullif(coalesce(auth.jwt() ->> 'client_id', ''), '');
  name text := left(coalesce(new.name, ''), 120);
  tool text;
  summary text;
  b jsonb := '{}';
  a jsonb := '{}';
begin
  if cid is null then
    return null;
  end if;
  if tg_op = 'INSERT' then
    tool := 'add_project';
    summary := format('Added the project "%s"', name);
    a := jsonb_build_object('id', new.id, 'name', new.name);
  elsif new.deleted and not old.deleted then
    tool := 'delete_project';
    summary := format('Deleted the project "%s"', name);
    b := jsonb_build_object('deleted', false);
    a := jsonb_build_object('deleted', true);
  elsif old.deleted and not new.deleted then
    tool := 'update_project';
    summary := format('Restored the project "%s"', name);
    b := jsonb_build_object('deleted', true);
    a := jsonb_build_object('deleted', false);
  elsif old.name is distinct from new.name or old.color is distinct from new.color then
    tool := 'update_project';
    summary := case when old.name is distinct from new.name
      then format('Renamed the project "%s" to "%s"', left(old.name, 120), name)
      else format('Changed the colour of "%s"', name) end;
    if old.name is distinct from new.name then
      b := b || jsonb_build_object('name', old.name);
      a := a || jsonb_build_object('name', new.name);
    end if;
    if old.color is distinct from new.color then
      b := b || jsonb_build_object('color', old.color);
      a := a || jsonb_build_object('color', new.color);
    end if;
  else
    return null;
  end if;
  insert into public.ai_actions (user_id, client_id, client_name, tool, project_id, summary, before, after)
  values (new.user_id, cid, public.ai_client_name(new.user_id, cid), tool, new.id, left(summary, 300), b, a);
  return null;
end;
$$;

create trigger projects_record_ai_change
  after insert or update on public.projects
  for each row execute function public.record_ai_project_change();

alter table public.tasks add column created_by text check (created_by is null or length(created_by) <= 80);

-- `created_by` is the app's client id from the token, set by the server: an app cannot claim another app's work, and
-- the person's own sessions never set it. It never changes after the task is added.
create function public.tasks_set_created_by() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := nullif(coalesce(auth.jwt() ->> 'client_id', ''), '');
  else
    new.created_by := old.created_by;
  end if;
  return new;
end;
$$;
-- Progress an app logs is shown under the app's name, whatever the request says.
create function public.progress_log_set_source() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if coalesce(auth.jwt() ->> 'client_id', '') <> '' then
    new.source := coalesce(nullif(public.ai_client_name(new.user_id, auth.jwt() ->> 'client_id'), ''), 'AI app');
  end if;
  return new;
end;
$$;
create trigger progress_log_set_source
  before insert on public.progress_log
  for each row execute function public.progress_log_set_source();

create trigger tasks_set_created_by
  before insert or update on public.tasks
  for each row execute function public.tasks_set_created_by();

-- The existing policies again, now also asking what the app may do. Unchanged for the person's own sessions.
drop policy tasks_select on public.tasks;
drop policy tasks_insert on public.tasks;
drop policy tasks_update on public.tasks;
create policy tasks_select on public.tasks for select
  using (user_id = auth.uid() and (select public.client_access()) <> 'none');
create policy tasks_insert on public.tasks for insert
  with check (user_id = auth.uid() and (select public.client_access()) = 'write');
create policy tasks_update on public.tasks for update
  using (user_id = auth.uid() and (select public.client_access()) = 'write')
  with check (user_id = auth.uid());

drop policy projects_select on public.projects;
drop policy projects_insert on public.projects;
drop policy projects_update on public.projects;
create policy projects_select on public.projects for select
  using (user_id = auth.uid() and (select public.client_access()) <> 'none');
create policy projects_insert on public.projects for insert
  with check (user_id = auth.uid() and (select public.client_access()) = 'write');
create policy projects_update on public.projects for update
  using (user_id = auth.uid() and (select public.client_access()) = 'write')
  with check (user_id = auth.uid());

drop policy progress_log_select on public.progress_log;
drop policy progress_log_insert on public.progress_log;
create policy progress_log_select on public.progress_log for select
  using (user_id = auth.uid() and (select public.client_access()) <> 'none');
create policy progress_log_insert on public.progress_log for insert with check (
  user_id = auth.uid()
  and (select public.client_access()) = 'write'
  and exists (select 1 from public.tasks t where t.id = task_id and t.user_id = auth.uid())
);

-- Proposals belong to the old approval inbox, which AI apps no longer use: only the person reads or writes them.
drop policy proposals_select on public.proposals;
drop policy proposals_insert on public.proposals;
drop policy proposals_update on public.proposals;
create policy proposals_select on public.proposals for select using (user_id = auth.uid() and public.is_person());
create policy proposals_insert on public.proposals for insert with check (
  user_id = auth.uid()
  and public.is_person()
  and (task_id is null or exists (select 1 from public.tasks t where t.id = task_id and t.user_id = auth.uid()))
);
create policy proposals_update on public.proposals for update
  using (user_id = auth.uid() and public.is_person())
  with check (user_id = auth.uid());

-- The profile is the person's: an app may read it (the first name, for a greeting) but not change it.
drop policy profiles_select on public.profiles;
drop policy profiles_insert on public.profiles;
drop policy profiles_update on public.profiles;
create policy profiles_select on public.profiles for select
  using (id = auth.uid() and (select public.client_access()) <> 'none');
create policy profiles_insert on public.profiles for insert
  with check (id = auth.uid() and public.is_person());
create policy profiles_update on public.profiles for update
  using (id = auth.uid() and public.is_person())
  with check (id = auth.uid());
