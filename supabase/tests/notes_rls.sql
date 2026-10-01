-- Row security test: user B cannot read, change or delete user A's notes.
-- Run against a local or dev database: psql "$DATABASE_URL" -f supabase/tests/notes_rls.sql
-- Everything happens in one transaction and is rolled back.
begin;

insert into auth.users (id, instance_id, aud, role, email)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-a@example.test'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-b@example.test');

set local role authenticated;

-- User A writes a note.
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
insert into public.notes (id, title) values ('11111111-1111-1111-1111-111111111111', 'A secret');

do $$
declare n int;
begin
  select count(*) into n from public.notes;
  if n <> 1 then raise exception 'FAIL: user A should see 1 note, saw %', n; end if;
end $$;

-- User B sees nothing and cannot change it.
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}', true);

do $$
declare n int;
begin
  select count(*) into n from public.notes;
  if n <> 0 then raise exception 'FAIL: user B saw % of A''s notes', n; end if;

  update public.notes set title = 'hacked' where id = '11111111-1111-1111-1111-111111111111';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: user B updated A''s note'; end if;

  delete from public.notes where id = '11111111-1111-1111-1111-111111111111';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: user B deleted A''s note'; end if;

  begin
    insert into public.notes (id, user_id, title)
    values ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'forged');
    raise exception 'FAIL: user B inserted a row owned by A';
  exception when insufficient_privilege or check_violation then
    null; -- expected: row security blocks it
  end;
end $$;

-- User A cannot hard delete either (no delete policy).
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);
do $$
declare n int;
begin
  delete from public.notes where id = '11111111-1111-1111-1111-111111111111';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: hard delete should be blocked'; end if;
end $$;

select 'PASS: row security isolates users' as result;
rollback;
