-- Minimal stand-ins for the parts of Supabase that migrations rely on,
-- so the migration and row security test can run on a plain Postgres.
create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key,
  instance_id uuid,
  aud text,
  role text,
  email text
);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::json ->> 'sub', '')::uuid
$$;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
end $$;
grant usage on schema auth, public to authenticated;
grant usage on schema public to anon;
grant execute on function auth.uid() to authenticated;
create publication supabase_realtime;
-- Supabase grants these by default on new public tables.
alter default privileges in schema public grant all on tables to authenticated;
