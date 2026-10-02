-- Row security and integrity test for progress and proposals. Rolled back at the end.
--   psql "$DATABASE_URL" -f supabase/tests/proposals_rls.sql
begin;

insert into auth.users (id, instance_id, aud, role, email)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'prop-a@example.test'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'prop-b@example.test');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1","role":"authenticated"}', true);

insert into public.tasks (id, title, kind) values ('11111111-1111-1111-1111-111111111111', 'Draft API doc', 'deep');

do $$
declare ok boolean;
begin
  -- progress must stay between 0 and 100
  ok := false;
  begin update public.tasks set progress = 101; exception when others then ok := true; end;
  if not ok then raise exception 'FAIL: progress above 100 was accepted'; end if;
  update public.tasks set progress = 40;

  -- a log entry for my own task works and the user id defaults to me
  insert into public.progress_log (task_id, delta, progress_after, day)
  values ('11111111-1111-1111-1111-111111111111', 40, 40, '2026-10-02');
  if (select user_id from public.progress_log) <> 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1' then
    raise exception 'FAIL: the log entry is not mine';
  end if;

  -- the log is append only
  update public.progress_log set delta = 5;
  if (select delta from public.progress_log) <> 40 then raise exception 'FAIL: a log entry was edited'; end if;
  delete from public.progress_log;
  if (select count(*) from public.progress_log) <> 1 then raise exception 'FAIL: a log entry was deleted'; end if;

  -- a proposal for me
  insert into public.proposals (app_name, kind, title, task_id, before, after)
  values ('Claude', 'update_progress', 'Draft API doc 40% to 60%', '11111111-1111-1111-1111-111111111111',
          '{"progress":40}', '{"progress":60}');

  -- bad kind and bad status are refused
  ok := false;
  begin insert into public.proposals (app_name, kind, title) values ('Claude', 'wipe', 'x'); exception when others then ok := true; end;
  if not ok then raise exception 'FAIL: an unknown proposal kind was accepted'; end if;
  ok := false;
  begin update public.proposals set status = 'maybe'; exception when others then ok := true; end;
  if not ok then raise exception 'FAIL: an unknown status was accepted'; end if;

  -- I can decide it, but not delete it
  update public.proposals set status = 'approved', decided_at = now();
  if (select status from public.proposals) <> 'approved' then raise exception 'FAIL: could not approve'; end if;
  delete from public.proposals;
  if (select count(*) from public.proposals) <> 1 then raise exception 'FAIL: a proposal was deleted'; end if;
end $$;

-- ===== User B sees nothing of A and cannot touch it =====
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1","role":"authenticated"}', true);

do $$
declare ok boolean;
begin
  if (select count(*) from public.proposals) <> 0 then raise exception 'FAIL: B sees A proposals'; end if;
  if (select count(*) from public.progress_log) <> 0 then raise exception 'FAIL: B sees A log'; end if;

  update public.proposals set status = 'rejected';
  -- as A again below, the status must still be approved

  -- B cannot log progress on A's task or file a proposal about it
  ok := false;
  begin
    insert into public.progress_log (task_id, delta, progress_after, day)
    values ('11111111-1111-1111-1111-111111111111', 10, 50, '2026-10-02');
  exception when others then ok := true; end;
  if not ok then raise exception 'FAIL: B logged progress on A task'; end if;
  ok := false;
  begin
    insert into public.proposals (app_name, kind, title, task_id)
    values ('Claude', 'reschedule', 'x', '11111111-1111-1111-1111-111111111111');
  exception when others then ok := true; end;
  if not ok then raise exception 'FAIL: B proposed a change to A task'; end if;
  -- and cannot write a proposal into A's account
  ok := false;
  begin
    insert into public.proposals (user_id, app_name, kind, title)
    values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'Claude', 'add_task', 'forged');
  exception when others then ok := true; end;
  if not ok then raise exception 'FAIL: B wrote a proposal into A account'; end if;
end $$;

select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1","role":"authenticated"}', true);
do $$
begin
  if (select status from public.proposals) <> 'approved' then raise exception 'FAIL: B changed A proposal'; end if;
end $$;

select 'proposals_rls ok';
rollback;
