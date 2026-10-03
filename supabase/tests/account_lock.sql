-- Migration 0010 (security finding S5): nobody, through any token, can set a password, change the account email or
-- phone, or add a two-factor sign-in method. The sign-in flows still work. Rolled back at the end.
--   psql "$DATABASE_URL" -f supabase/tests/account_lock.sql
-- Runs as the database owner, like Supabase Auth does: the triggers must hold whoever writes.
begin;

-- Auth creating a user with a temporary password (it does for invited and code sign-ups) is fine.
insert into auth.users (id, email, encrypted_password)
values ('cccccccc-cccc-cccc-cccc-ccccccccccc3', 'lock@example.test', '$2a$10$temporary');
insert into auth.users (id, email) values ('dddddddd-dddd-dddd-dddd-ddddddddddd3', 'nopass@example.test');

do $$
declare ok boolean;
begin
  -- setting or changing a password is refused
  ok := false;
  begin
    update auth.users set encrypted_password = '$2a$10$attacker' where id = 'dddddddd-dddd-dddd-dddd-ddddddddddd3';
  exception when others then ok := true; end;
  if not ok then raise exception 'FAIL: a password was set'; end if;
  ok := false;
  begin
    update auth.users set encrypted_password = '$2a$10$attacker' where id = 'cccccccc-cccc-cccc-cccc-ccccccccccc3';
  exception when others then ok := true; end;
  if not ok then raise exception 'FAIL: a password was changed'; end if;

  -- clearing one is allowed (Auth does it for unconfirmed accounts)
  update auth.users set encrypted_password = null where id = 'cccccccc-cccc-cccc-cccc-ccccccccccc3';

  -- the email cannot change, directly or through a pending change
  ok := false;
  begin update auth.users set email = 'evil@example.test' where id = 'dddddddd-dddd-dddd-dddd-ddddddddddd3';
  exception when others then ok := true; end;
  if not ok then raise exception 'FAIL: the email was changed'; end if;
  ok := false;
  begin update auth.users set email_change = 'evil@example.test' where id = 'dddddddd-dddd-dddd-dddd-ddddddddddd3';
  exception when others then ok := true; end;
  if not ok then raise exception 'FAIL: an email change was started'; end if;
  ok := false;
  begin update auth.users set phone_change = '+15550000000' where id = 'dddddddd-dddd-dddd-dddd-ddddddddddd3';
  exception when others then ok := true; end;
  if not ok then raise exception 'FAIL: a phone change was started'; end if;

  -- no two-factor method can be added
  ok := false;
  begin
    insert into auth.mfa_factors (id, user_id, factor_type)
    values (gen_random_uuid(), 'dddddddd-dddd-dddd-dddd-ddddddddddd3', 'totp');
  exception when others then ok := true; end;
  if not ok then raise exception 'FAIL: a two-factor method was added'; end if;

  -- ordinary updates still go through (sign-in times, metadata)
  update auth.users set aud = 'authenticated', role = 'authenticated' where id = 'dddddddd-dddd-dddd-dddd-ddddddddddd3';
end $$;

select 'account_lock ok';
rollback;
