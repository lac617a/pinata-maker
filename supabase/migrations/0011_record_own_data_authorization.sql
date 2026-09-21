-- A signed-in person can record their own data policy authorization.
--
-- 0009 records it when the account is created. This covers the rest:
-- accounts created before 0009, and every account when the policy changes
-- in substance and a new version has to be accepted (Ley 1581 de 2012,
-- art. 9). The app shows the box once, on entering the projects area.
--
-- See docs/legal.md §7.

create function public.record_my_data_authorization(policy_version text)
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

  if policy_version is null
    or btrim(policy_version) = ''
    or char_length(policy_version) > 40 then
    raise exception 'A policy version is required' using errcode = '22023';
  end if;

  -- The time is the database's, not the request's: it is the proof.
  insert into public.data_authorizations (user_id, policy_version, accepted_at)
  values (me, policy_version, now())
  on conflict (user_id, policy_version) do nothing;
end;
$$;

revoke all on function public.record_my_data_authorization(text) from public;
grant execute on function public.record_my_data_authorization(text)
  to authenticated;
