-- Proof of the data policy authorization, for every account.
--
-- Colombian law (Ley 1581 de 2012, art. 9; Decreto 1377 de 2013, art. 7-8)
-- asks for prior, express and informed authorization, and for the
-- controller to keep proof of it. The sign-up form requires an explicit tick
-- and the server sends which policy version was accepted and when, as user
-- metadata. User metadata can be edited later by its owner, so a trigger
-- copies it here, into a table nobody can change.
--
-- See docs/legal.md §5.

create table public.data_authorizations (
  user_id uuid not null references auth.users (id) on delete cascade,
  policy_version text not null,
  accepted_at timestamptz not null,
  -- When the database saw it, independent of what the request said.
  recorded_at timestamptz not null default now(),

  -- A new policy version is a new authorization; the old one stays.
  primary key (user_id, policy_version)
);

alter table public.data_authorizations enable row level security;

-- Nobody writes here but the trigger, and nobody edits or deletes: the
-- rows go only with the account (on delete cascade).
revoke all on table public.data_authorizations from anon, authenticated;
grant select on table public.data_authorizations to authenticated;

-- The owner can see their own proof: it is their data too.
create policy data_authorizations_select_own
  on public.data_authorizations
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Runs when an account is created. It also *refuses* an account without an
-- authorization: the anon key is public, so the Supabase sign-up API can be
-- called without going through the app's form. With this, the rule lives in
-- the database and holds whoever calls.
--
-- Consequence: accounts can no longer be created from the Supabase
-- dashboard without that metadata. Invite-style flows would need it.
create function public.record_data_authorization()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  granted jsonb := new.raw_user_meta_data -> 'data_authorization';
  version text := granted ->> 'policy_version';
  accepted timestamptz;
begin
  begin
    accepted := (granted ->> 'accepted_at')::timestamptz;
  exception when others then
    accepted := null;
  end;

  if version is null or btrim(version) = '' or accepted is null then
    raise exception 'An account needs the data policy authorization'
      using errcode = '23514';
  end if;

  insert into public.data_authorizations (user_id, policy_version, accepted_at)
  values (new.id, version, accepted)
  on conflict (user_id, policy_version) do nothing;

  return new;
end;
$$;

revoke all on function public.record_data_authorization() from public;

create trigger on_auth_user_created_record_data_authorization
  after insert on auth.users
  for each row
  execute function public.record_data_authorization();
