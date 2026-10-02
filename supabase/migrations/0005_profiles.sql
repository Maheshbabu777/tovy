-- One profile per user: the details asked for at registration (first name, last name, username).
-- The row's id is the user's id. Owned by that user only, no hard delete, server-set timestamps.

create table public.profiles (
  id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  first_name text not null check (char_length(first_name) between 1 and 50),
  last_name text not null check (char_length(last_name) between 1 and 50),
  -- lowercase letters, digits and underscore, 3 to 20 characters
  username text not null check (username ~ '^[a-z0-9_]{3,20}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Unique whatever the case (the check above already forces lowercase, this keeps it true if the check ever loosens).
create unique index profiles_username_key on public.profiles (lower(username));

-- Server set timestamps, and names are trimmed so "  Ada " and "Ada" are the same. `handle_times()` from the notes
-- migration is not reused: it also sets `user_id`, which this table does not have.
create function public.profiles_handle_times() returns trigger
language plpgsql as $$
begin
  new.first_name := btrim(new.first_name);
  new.last_name := btrim(new.last_name);
  if tg_op = 'INSERT' then
    new.created_at := now();
  else
    new.id := old.id;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_handle_times
  before insert or update on public.profiles
  for each row execute function public.profiles_handle_times();

alter table public.profiles enable row level security;

create policy profiles_select on public.profiles for select using (id = auth.uid());
create policy profiles_insert on public.profiles for insert with check (id = auth.uid());
create policy profiles_update on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());
-- No delete policy on purpose. A profile goes when its user is deleted (on delete cascade).

-- Is this username free? Row security hides other people's profiles, so the check runs with the table owner's rights
-- and returns only yes or no. A badly formed username is "no". Only signed in users can ask.
create function public.username_available(name text) returns boolean
language sql stable security definer set search_path = public as $$
  select name ~ '^[a-z0-9_]{3,20}$' and not exists (select 1 from public.profiles where lower(username) = lower(name))
$$;

revoke all on function public.username_available(text) from public, anon;
grant execute on function public.username_available(text) to authenticated;
