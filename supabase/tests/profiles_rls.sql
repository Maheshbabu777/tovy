-- Row security and integrity test for profiles. Everything runs in one transaction and is rolled back.
--   psql "$DATABASE_URL" -f supabase/tests/profiles_rls.sql
begin;

insert into auth.users (id, instance_id, aud, role, email)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'profiles-a@example.test'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'profiles-b@example.test'),
  -- user C never registers, so a profile forged for C can only be refused by row security
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'profiles-c@example.test');

set local role authenticated;

-- ===== User A registers =====
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}', true);

-- the id defaults to the signed in user, names are trimmed, the server sets the timestamps
insert into public.profiles (first_name, last_name, username) values ('  Ada ', 'Lovelace', 'ada_l');

do $$
declare p public.profiles; ok boolean;
begin
  select * into p from public.profiles;
  if p.id <> 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' then raise exception 'FAIL: the profile id is not the user id'; end if;
  if p.first_name <> 'Ada' then raise exception 'FAIL: the first name was not trimmed (%)', p.first_name; end if;
  if p.created_at is null or p.updated_at is null then raise exception 'FAIL: timestamps were not set'; end if;

  -- a second profile for the same user is refused
  ok := false;
  begin
    insert into public.profiles (first_name, last_name, username) values ('Ada', 'Again', 'ada_two');
  exception when others then ok := true; end;
  if not ok then raise exception 'FAIL: a user got two profiles'; end if;

  -- the id cannot be changed to another user's
  ok := false;
  begin
    update public.profiles set id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    if (select id from public.profiles limit 1) <> 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' then
      raise exception 'FAIL: the profile id was changed';
    end if;
    ok := true;
  exception when others then
    if sqlerrm like 'FAIL:%' then raise; end if;
    ok := true;
  end;

  -- a user can change their own names
  update public.profiles set last_name = 'Byron';
  if (select last_name from public.profiles) <> 'Byron' then raise exception 'FAIL: user A could not edit their profile'; end if;
end $$;

-- ===== Format rules (each row below must be refused) =====
-- Tried as user B, who has no profile yet, so the only reason to refuse is the rule itself.
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated"}', true);

do $$
declare
  ok boolean;
  i int;
  bad text[] := array[
    '|Smith|ok_name',                  -- empty first name
    '   |Smith|ok_name',               -- blank first name
    'Bob||ok_name',                    -- empty last name
    'Bob|' || repeat('x', 51) || '|ok_name', -- last name too long
    'Bob|Smith|ab',                    -- username too short
    'Bob|Smith|' || repeat('a', 21),   -- username too long
    'Bob|Smith|Bob_S',                 -- uppercase
    'Bob|Smith|bob s',                 -- space
    'Bob|Smith|bob-s',                 -- hyphen
    'Bob|Smith|ada_l'                  -- taken by user A, whose row B cannot see
  ];
  parts text[];
begin
  for i in 1 .. array_length(bad, 1) loop
    parts := string_to_array(bad[i], '|');
    ok := false;
    begin
      insert into public.profiles (first_name, last_name, username) values (parts[1], parts[2], parts[3]);
    exception when others then ok := true; end;
    if not ok then raise exception 'FAIL: this profile was accepted: %', bad[i]; end if;
  end loop;

  -- a taken username is refused whatever the case it is written in (the case check is the first line of defence)
  ok := false;
  begin
    insert into public.profiles (first_name, last_name, username) values ('Bob', 'Smith', 'ADA_L');
  exception when others then ok := true; end;
  if not ok then raise exception 'FAIL: a username differing only by case was accepted'; end if;
end $$;

-- ===== The username question: only yes or no, only for signed in users =====
do $$
begin
  if public.username_available('ada_l') then raise exception 'FAIL: a taken username was reported free'; end if;
  if public.username_available('ADA_L') then raise exception 'FAIL: a taken username (other case) was reported free'; end if;
  if not public.username_available('free_name') then raise exception 'FAIL: a free username was reported taken'; end if;
  if public.username_available('ab') then raise exception 'FAIL: a malformed username was reported free'; end if;
  if public.username_available('bad name') then raise exception 'FAIL: a malformed username was reported free'; end if;
end $$;

-- ===== User B registers, and cannot touch A's profile =====
insert into public.profiles (first_name, last_name, username) values ('Bob', 'Smith', 'bob_s');

do $$
declare n int; ok boolean;
begin
  select count(*) into n from public.profiles;
  if n <> 1 then raise exception 'FAIL: user B saw % profiles (their own is 1)', n; end if;
  if exists (select 1 from public.profiles where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') then
    raise exception 'FAIL: user B saw A''s profile';
  end if;

  update public.profiles set last_name = 'hacked' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: user B updated A''s profile'; end if;

  -- B cannot create a profile for someone else (C has none, so only row security can refuse this)
  ok := false;
  begin
    insert into public.profiles (id, first_name, last_name, username) values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Forged', 'Profile', 'forged_c');
  exception when others then ok := true; end;
  if not ok then raise exception 'FAIL: user B created a profile for another user'; end if;

  -- B cannot take A's username by editing their own profile
  ok := false;
  begin
    update public.profiles set username = 'ada_l' where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  exception when others then ok := true; end;
  if not ok then raise exception 'FAIL: user B took A''s username by editing'; end if;

  -- nobody hard deletes a profile
  delete from public.profiles where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: a hard delete of a profile should be blocked'; end if;
end $$;

-- ===== Signed out visitor (only the public anon key) =====
reset role;
set local role anon;
do $$
declare n int; ok boolean;
begin
  -- cannot ask about usernames
  ok := false;
  begin
    perform public.username_available('free_name');
  exception when insufficient_privilege then ok := true; end;
  if not ok then raise exception 'FAIL: a signed out visitor can ask about usernames'; end if;

  -- cannot read profiles (no rows, or no permission at all)
  begin
    select count(*) into n from public.profiles;
  exception when insufficient_privilege then n := 0; end;
  if n <> 0 then raise exception 'FAIL: a signed out visitor saw % profiles', n; end if;
end $$;

select 'PASS: profiles are private and their rules hold' as result;
rollback;
