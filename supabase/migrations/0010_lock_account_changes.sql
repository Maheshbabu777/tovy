-- Security finding S5 (spec mcp-server): an AI app's access token is a normal Supabase user token, and Supabase Auth
-- accepts it for account changes (checked 2026-10-03 with supabase/tests/s5-check.mjs; Auth's source checks only the
-- signature and the user). An approved app could set a password and sign in with it, change the account email, or
-- turn on two-factor sign-in. Tovy signs in with an email code or Google, never with a password, and has neither email
-- change nor two-factor sign-in, so the database refuses these for everyone. Auth writes these tables itself, so a
-- trigger here sees every change, whichever token asked for it.
-- Still allowed: the sign-in code and Google flows, a temporary password Auth sets when it creates a user, clearing a
-- password, and user metadata (Tovy never trusts it).

create function public.lock_account_changes() returns trigger
language plpgsql set search_path = '' as $$
begin
  if coalesce(new.encrypted_password, '') <> '' and new.encrypted_password is distinct from old.encrypted_password then
    raise exception 'Tovy accounts do not use passwords' using errcode = '42501';
  end if;
  if old.email is not null and new.email is distinct from old.email then
    raise exception 'The account email cannot be changed' using errcode = '42501';
  end if;
  if coalesce(new.email_change, '') <> '' and new.email_change is distinct from old.email_change then
    raise exception 'The account email cannot be changed' using errcode = '42501';
  end if;
  if coalesce(new.phone_change, '') <> '' and new.phone_change is distinct from old.phone_change then
    raise exception 'The account phone cannot be changed' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function public.lock_account_changes() from public, anon, authenticated;

create trigger lock_account_changes
  before update on auth.users
  for each row execute function public.lock_account_changes();

create function public.refuse_mfa_factors() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'Tovy does not use two-factor sign-in' using errcode = '42501';
end;
$$;
revoke all on function public.refuse_mfa_factors() from public, anon, authenticated;

create trigger refuse_mfa_factors
  before insert on auth.mfa_factors
  for each row execute function public.refuse_mfa_factors();
