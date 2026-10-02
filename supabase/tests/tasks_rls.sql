-- Row security and integrity test for projects and tasks. Everything runs in one transaction and is rolled back.
--   psql "$DATABASE_URL" -f supabase/tests/tasks_rls.sql
begin;

insert into auth.users (id, instance_id, aud, role, email)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tasks-a@example.test'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tasks-b@example.test');

set local role authenticated;

-- ===== User A builds a small tree =====
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);

insert into public.projects (id, name, color) values ('a0000000-0000-0000-0000-000000000001', 'Launch', 'indigo');
insert into public.tasks (id, title, kind, project_id)
values ('a1000000-0000-0000-0000-000000000001', 'deep parent', 'deep', 'a0000000-0000-0000-0000-000000000001');
insert into public.tasks (id, title, kind, parent_id)
values ('a1000000-0000-0000-0000-000000000002', 'child (deep)', 'deep', 'a1000000-0000-0000-0000-000000000001');
insert into public.tasks (id, title, kind, parent_id)
values ('a1000000-0000-0000-0000-000000000003', 'grandchild (quick)', 'quick', 'a1000000-0000-0000-0000-000000000002');
insert into public.tasks (id, title) values ('a1000000-0000-0000-0000-000000000004', 'quick task');

-- ===== Integrity rules (each statement below must be refused) =====
do $$
declare ok boolean;
begin
  -- a quick task cannot be a parent
  ok := false;
  begin
    insert into public.tasks (id, title, parent_id) values ('a1000000-0000-0000-0000-000000000010', 'x', 'a1000000-0000-0000-0000-000000000004');
  exception when others then ok := true; end;
  if not ok then raise exception 'FAIL: a subtask was added under a quick task'; end if;

  -- a task cannot be its own parent
  ok := false;
  begin
    update public.tasks set parent_id = id where id = 'a1000000-0000-0000-0000-000000000001';
  exception when others then ok := true; end;
  if not ok then raise exception 'FAIL: a task became its own parent'; end if;

  -- a task cannot move under its own descendant (the cycle)
  ok := false;
  begin
    update public.tasks set parent_id = 'a1000000-0000-0000-0000-000000000002' where id = 'a1000000-0000-0000-0000-000000000001';
  exception when others then ok := true; end;
  if not ok then raise exception 'FAIL: a cycle was created'; end if;

  -- a deep task with subtasks cannot go back to quick
  ok := false;
  begin
    update public.tasks set kind = 'quick' where id = 'a1000000-0000-0000-0000-000000000001';
  exception when others then ok := true; end;
  if not ok then raise exception 'FAIL: a deep task with subtasks became quick'; end if;

  -- a time needs a date
  ok := false;
  begin
    insert into public.tasks (id, title, due_time) values ('a1000000-0000-0000-0000-000000000011', 'x', '16:00');
  exception when others then ok := true; end;
  if not ok then raise exception 'FAIL: a due time was stored without a due date'; end if;

  -- an unknown kind is refused
  ok := false;
  begin
    insert into public.tasks (id, title, kind) values ('a1000000-0000-0000-0000-000000000012', 'x', 'medium');
  exception when others then ok := true; end;
  if not ok then raise exception 'FAIL: an unknown kind was accepted'; end if;
end $$;

-- ===== What is allowed =====
do $$
begin
  -- a deep task whose subtasks are all deleted can go back to quick
  update public.tasks set deleted = true where parent_id = 'a1000000-0000-0000-0000-000000000002';
  update public.tasks set deleted = true where parent_id = 'a1000000-0000-0000-0000-000000000001';
  update public.tasks set kind = 'quick' where id = 'a1000000-0000-0000-0000-000000000001';
  -- a project can be soft deleted and its tasks moved to "No project"
  update public.projects set deleted = true where id = 'a0000000-0000-0000-0000-000000000001';
  update public.tasks set project_id = null where project_id = 'a0000000-0000-0000-0000-000000000001';
  -- the server set a timestamp
  if (select updated_at from public.tasks where id = 'a1000000-0000-0000-0000-000000000004') is null then
    raise exception 'FAIL: updated_at was not set';
  end if;
end $$;

-- ===== User B =====
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}', true);

do $$
declare n int; ok boolean;
begin
  select count(*) into n from public.tasks;
  if n <> 0 then raise exception 'FAIL: user B saw % of A''s tasks', n; end if;
  select count(*) into n from public.projects;
  if n <> 0 then raise exception 'FAIL: user B saw % of A''s projects', n; end if;

  update public.tasks set title = 'hacked' where id = 'a1000000-0000-0000-0000-000000000004';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: user B updated A''s task'; end if;

  delete from public.tasks where id = 'a1000000-0000-0000-0000-000000000004';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: user B deleted A''s task'; end if;

  -- B cannot put a task into A's project
  ok := false;
  begin
    insert into public.tasks (id, title, project_id) values ('b1000000-0000-0000-0000-000000000001', 'x', 'a0000000-0000-0000-0000-000000000001');
  exception when others then ok := true; end;
  if not ok then raise exception 'FAIL: user B linked a task to A''s project'; end if;

  -- B cannot put a task under A's task
  ok := false;
  begin
    insert into public.tasks (id, title, parent_id) values ('b1000000-0000-0000-0000-000000000002', 'x', 'a1000000-0000-0000-0000-000000000002');
  exception when others then ok := true; end;
  if not ok then raise exception 'FAIL: user B put a task under A''s task'; end if;

  -- B cannot write a row owned by A
  ok := false;
  begin
    insert into public.tasks (id, user_id, title) values ('b1000000-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'forged');
  exception when others then ok := true; end;
  if not ok then raise exception 'FAIL: user B inserted a task owned by A'; end if;

  ok := false;
  begin
    insert into public.projects (id, user_id, name) values ('b0000000-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'forged');
  exception when others then ok := true; end;
  if not ok then raise exception 'FAIL: user B inserted a project owned by A'; end if;
end $$;

-- ===== User A cannot hard delete either (no delete policy) =====
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
do $$
declare n int;
begin
  delete from public.tasks where id = 'a1000000-0000-0000-0000-000000000004';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: hard delete of a task should be blocked'; end if;
  delete from public.projects where id = 'a0000000-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: hard delete of a project should be blocked'; end if;
end $$;

select 'PASS: tasks and projects are isolated and their rules hold' as result;
rollback;
