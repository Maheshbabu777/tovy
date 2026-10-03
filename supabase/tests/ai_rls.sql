-- Row security and the activity triggers for AI apps (spec mcp-server, migration 0009). Rolled back at the end.
--   psql "$DATABASE_URL" -f supabase/tests/ai_rls.sql
-- An app's request is the person's user id plus a client_id claim, the way Supabase's OAuth server issues tokens.
begin;

insert into auth.users (id, instance_id, aud, role, email)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ai-a@example.test'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ai-b@example.test');

set local role authenticated;

-- ===== The person (A, no client_id) sets things up. Nothing they do is recorded as an app's. =====
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2","role":"authenticated"}', true);
insert into public.profiles (first_name, last_name, username) values ('Ada', 'Lovelace', 'ada_ai_test');
insert into public.projects (id, name) values ('22222222-2222-2222-2222-222222222222', 'Work');
insert into public.tasks (id, title, kind, note) values ('33333333-3333-3333-3333-333333333333', 'Write report', 'deep', 'private');
insert into public.tasks (id, title, parent_id) values ('66666666-6666-6666-6666-666666666666', 'Outline', '33333333-3333-3333-3333-333333333333');
insert into public.ai_clients (client_id, name, access) values ('c1', 'Claude', 'write');
do $$
begin
  if (select count(*) from public.ai_actions) <> 0 then raise exception 'FAIL: the person''s changes were recorded'; end if;
  if (select created_by from public.tasks where id = '33333333-3333-3333-3333-333333333333') is not null then
    raise exception 'FAIL: a task the person added is marked as an app''s';
  end if;
end $$;

-- ===== App c1 acting for A =====
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2","role":"authenticated","client_id":"c1"}', true);

do $$
declare ok boolean;
begin
  if (select count(*) from public.tasks) <> 2 then raise exception 'FAIL: the app cannot read the tasks'; end if;
  if (select first_name from public.profiles) <> 'Ada' then raise exception 'FAIL: the app cannot read the profile'; end if;

  -- created_by is the app's own client id, whatever the request says
  insert into public.tasks (id, title, created_by) values ('44444444-4444-4444-4444-444444444444', 'Book flights', 'c2');
  if (select created_by from public.tasks where id = '44444444-4444-4444-4444-444444444444') <> 'c1' then
    raise exception 'FAIL: an app claimed another app''s task';
  end if;

  -- progress it logs is shown under its approved name
  insert into public.progress_log (task_id, delta, progress_after, day, source)
  values ('33333333-3333-3333-3333-333333333333', 30, 30, '2026-10-03', 'you');
  if (select source from public.progress_log) <> 'Claude' then raise exception 'FAIL: an app logged progress as you'; end if;

  -- the app cannot see the activity log, the list of apps, or the proposals, and cannot write any of them
  if (select count(*) from public.ai_actions) <> 0 then raise exception 'FAIL: an app reads the activity log'; end if;
  if (select count(*) from public.ai_clients) <> 0 then raise exception 'FAIL: an app reads the list of apps'; end if;
  ok := false;
  begin insert into public.ai_actions (user_id, client_id, tool) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'c1', 'add_task');
  exception when others then ok := true; end;
  if not ok then raise exception 'FAIL: an app wrote the activity log itself'; end if;
  ok := false;
  begin insert into public.ai_clients (client_id, access) values ('c9', 'write'); exception when others then ok := true; end;
  if not ok then raise exception 'FAIL: an app wrote an access row'; end if;
  ok := false;
  begin insert into public.proposals (app_name, kind, title) values ('Totally Claude', 'add_task', 'x');
  exception when others then ok := true; end;
  if not ok then raise exception 'FAIL: an app filed a proposal'; end if;
  update public.profiles set first_name = 'Hacked';

  -- changes, through any door, are recorded
  update public.tasks set due_date = '2026-10-05', note = 'edited' where id = '33333333-3333-3333-3333-333333333333';
  update public.tasks set progress = 30 where id = '66666666-6666-6666-6666-666666666666';
  update public.tasks set done_at = now(), progress = 100 where id = '44444444-4444-4444-4444-444444444444';
  update public.tasks set updated_at = now() where id = '44444444-4444-4444-4444-444444444444'; -- no real change
  update public.projects set name = 'Day job' where id = '22222222-2222-2222-2222-222222222222';
end $$;

-- a task deleted with its subtask, in one go, is one line listing both
update public.tasks set deleted = true
  where id in ('33333333-3333-3333-3333-333333333333', '66666666-6666-6666-6666-666666666666');

-- ===== The person reads the activity =====
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2","role":"authenticated"}', true);
do $$
declare
  got text;
  ok boolean;
begin
  if (select first_name from public.profiles) <> 'Ada' then raise exception 'FAIL: an app changed the profile'; end if;
  select string_agg(tool || ':' || summary, ' | ' order by created_at, tool) into got from public.ai_actions;
  if (select count(*) from public.ai_actions) <> 6 then raise exception 'FAIL: expected 6 actions, got %', got; end if;
  if not exists (select 1 from public.ai_actions where tool = 'add_task' and summary = 'Added "Book flights"'
                 and client_name = 'Claude' and client_id = 'c1') then
    raise exception 'FAIL: add not recorded: %', got;
  end if;
  if not exists (select 1 from public.ai_actions where tool = 'update_task'
                 and summary = 'Changed note, due date of "Write report"'
                 and before = '{"note":"private","due_date":null}'::jsonb) then
    raise exception 'FAIL: edit not recorded with its before: %', got;
  end if;
  if not exists (select 1 from public.ai_actions where tool = 'log_progress' and summary = 'Set "Outline" to 30%') then
    raise exception 'FAIL: progress not recorded: %', got;
  end if;
  if not exists (select 1 from public.ai_actions where tool = 'complete_task' and before ->> 'progress' = '0') then
    raise exception 'FAIL: finish not recorded: %', got;
  end if;
  if not exists (select 1 from public.ai_actions where tool = 'update_project' and before = '{"name":"Work"}'::jsonb) then
    raise exception 'FAIL: rename not recorded: %', got;
  end if;
  if not exists (select 1 from public.ai_actions where tool = 'delete_task'
                 and summary = 'Deleted "Write report" and 1 subtask'
                 and jsonb_array_length(before -> 'ids') = 2) then
    raise exception 'FAIL: delete not recorded as one line: %', got;
  end if;

  -- the person marks an action undone, but changes nothing else and deletes nothing
  update public.ai_actions set undone_at = now() where tool = 'add_task';
  if (select count(*) from public.ai_actions where undone_at is not null) <> 1 then raise exception 'FAIL: could not undo'; end if;
  ok := false;
  begin update public.ai_actions set summary = 'edited'; exception when others then ok := true; end;
  if not ok then raise exception 'FAIL: the person rewrote an action'; end if;
  ok := false;
  begin delete from public.ai_actions; exception when others then ok := true; end;
  if (select count(*) from public.ai_actions) <> 6 then raise exception 'FAIL: an action was deleted'; end if;
  ok := false;
  begin
    insert into public.ai_actions (user_id, client_id, tool) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'c1', 'add_task');
  exception when others then ok := true; end;
  if not ok then raise exception 'FAIL: the person wrote an action'; end if;
  -- created_by never changes after the task is added
  update public.tasks set created_by = null where id = '44444444-4444-4444-4444-444444444444';
  if (select created_by from public.tasks where id = '44444444-4444-4444-4444-444444444444') <> 'c1' then
    raise exception 'FAIL: created_by was not kept';
  end if;

  -- limit c1 to reading
  update public.ai_clients set access = 'read' where client_id = 'c1';
end $$;

-- ===== A read only app =====
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2","role":"authenticated","client_id":"c1"}', true);
do $$
declare ok boolean;
begin
  if (select count(*) from public.tasks where not deleted) <> 1 then raise exception 'FAIL: a read only app cannot read'; end if;
  ok := false;
  begin insert into public.tasks (id, title) values (gen_random_uuid(), 'x'); exception when others then ok := true; end;
  if not ok then raise exception 'FAIL: a read only app added a task'; end if;
  update public.tasks set title = 'changed';
  if exists (select 1 from public.tasks where title = 'changed') then raise exception 'FAIL: a read only app edited'; end if;
  ok := false;
  begin
    insert into public.progress_log (task_id, delta, progress_after, day)
    values ('44444444-4444-4444-4444-444444444444', 1, 1, '2026-10-03');
  exception when others then ok := true; end;
  if not ok then raise exception 'FAIL: a read only app logged progress'; end if;
  update public.ai_clients set access = 'write';
end $$;

-- ===== Another app (c2) is not affected by c1's limit =====
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2","role":"authenticated","client_id":"c2"}', true);
insert into public.tasks (id, title) values ('55555555-5555-5555-5555-555555555555', 'From c2');

-- ===== The person cuts c1 off completely =====
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2","role":"authenticated"}', true);
do $$
begin
  if (select access from public.ai_clients where client_id = 'c1') <> 'read' then raise exception 'FAIL: an app raised its access'; end if;
  if (select client_name from public.ai_actions where task_id = '55555555-5555-5555-5555-555555555555') <> '' then
    raise exception 'FAIL: an app never approved got a name';
  end if;
end $$;
update public.ai_clients set access = 'none' where client_id = 'c1';
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2","role":"authenticated","client_id":"c1"}', true);
do $$
begin
  if (select count(*) from public.tasks) <> 0 then raise exception 'FAIL: a cut off app still reads tasks'; end if;
  if (select count(*) from public.projects) <> 0 then raise exception 'FAIL: a cut off app still reads projects'; end if;
  if (select count(*) from public.profiles) <> 0 then raise exception 'FAIL: a cut off app still reads the profile'; end if;
  if (select count(*) from public.progress_log) <> 0 then raise exception 'FAIL: a cut off app still reads the log'; end if;
  if (select count(*) from public.ai_actions) <> 0 then raise exception 'FAIL: a cut off app reads the activity'; end if;
end $$;

-- ===== B's app sees nothing of A =====
select set_config('request.jwt.claims',
  '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2","role":"authenticated","client_id":"c1"}', true);
do $$
begin
  if (select count(*) from public.tasks) <> 0 then raise exception 'FAIL: B app sees A tasks'; end if;
  update public.tasks set title = 'pwned';
end $$;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2","role":"authenticated"}', true);
do $$
begin
  if exists (select 1 from public.tasks where title = 'pwned') then raise exception 'FAIL: B app changed A tasks'; end if;
  if (select count(*) from public.ai_actions where client_id = 'c2') <> 1 then raise exception 'FAIL: c2 add not recorded'; end if;
end $$;

select 'ai_rls ok';
rollback;
