-- A person can delete their own account from the app.
--
-- The right to deletion of Ley 1581 de 2012 (art. 8). The app has no
-- service key (docs/roadmap.md §3), so it cannot call the admin API that
-- deletes users; this function does it for the signed-in user only.
--
-- See docs/legal.md §6.

create function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;

  -- Projects go first, through the app: their files live in the buckets and
  -- only the Storage API removes them. Deleting the user now would cascade
  -- the rows and leave the files behind for ever, unreachable. The app
  -- deletes every project with its files and only then calls this.
  if exists (select 1 from public.projects p where p.owner_id = me) then
    raise exception 'Delete the projects before the account'
      using errcode = '23503';
  end if;

  -- The usage counter is keyed by text, not by a foreign key: no cascade.
  delete from public.usage_counters c where c.subject = 'user:' || me::text;

  -- Everything else goes by cascade: the proof of authorization, sessions
  -- and identities.
  delete from auth.users u where u.id = me;
end;
$$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
