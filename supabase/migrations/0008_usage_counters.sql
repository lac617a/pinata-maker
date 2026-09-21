-- Cuántos documentos ha generado cada quien hoy.
--
-- El límite diario se cuenta en el servidor (docs/PRD.md §39, AC-17). Un
-- visitante sin cuenta también tiene que poder contar, y en este proyecto no
-- hay clave de servicio: todo pasa por el token del usuario, o por el rol
-- `anon` si no hay usuario. Por eso la tabla no se toca directamente y solo
-- dos funciones la leen y la escriben.
--
-- Ver docs/usage.md §6.

create table public.usage_counters (
  -- `user:<uuid>` para quien tiene cuenta; para el anónimo, `visitor:` e
  -- `ip:` con una huella HMAC hecha en el servidor. Nunca una IP en claro.
  subject text not null,
  -- Día natural en UTC.
  day date not null,
  used integer not null default 0,

  primary key (subject, day),

  constraint usage_counters_subject_length
    check (char_length(subject) between 3 and 80),
  constraint usage_counters_used_not_negative check (used >= 0)
);

-- Para borrar los días viejos sin recorrer la tabla.
create index usage_counters_day_idx on public.usage_counters (day);

alter table public.usage_counters enable row level security;

-- Sin políticas y sin permisos: nadie la lee ni la escribe si no es a
-- través de las funciones de abajo.
revoke all on table public.usage_counters from anon, authenticated;

-- Las dos funciones comparten la misma comprobación de lo que reciben.
--
-- `security definer` porque tienen que escribir en una tabla que nadie más
-- puede tocar. Con `search_path` vacío y todo calificado: una función así
-- no debe resolver nombres en un esquema que alguien pueda crear.
create function public.usage_check_subjects(subjects text[], usage_day date)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  subject text;
  today date := (now() at time zone 'utc')::date;
begin
  if subjects is null
    or cardinality(subjects) < 1
    or cardinality(subjects) > 4 then
    raise exception 'usage: between one and four subjects' using errcode = '22023';
  end if;

  -- Solo hoy, con un día de margen por el cambio de fecha a mitad de una
  -- petición. Sin esto se podría llenar la tabla con días inventados.
  if usage_day is null or usage_day not between today - 1 and today + 1 then
    raise exception 'usage: day out of range' using errcode = '22023';
  end if;

  foreach subject in array subjects loop
    -- El uso de una cuenta solo lo toca su dueño. Las claves anónimas no se
    -- pueden comprobar aquí: las protege el secreto del HMAC.
    if subject like 'user:%'
      and subject <> 'user:' || coalesce((select auth.uid())::text, '') then
      raise exception 'usage: not your account' using errcode = '42501';
    end if;

    if subject not like 'user:%'
      and subject not like 'visitor:%'
      and subject not like 'ip:%' then
      raise exception 'usage: unknown subject' using errcode = '22023';
    end if;
  end loop;
end;
$$;

-- Lo que ya se ha usado hoy: el mayor de los sujetos, que cuentan como una
-- sola persona.
create function public.usage_used(subjects text[], usage_day date)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.usage_check_subjects(subjects, usage_day);

  return coalesce(
    (
      select max(c.used)
      from public.usage_counters c
      where c.subject = any (subjects) and c.day = usage_day
    ),
    0
  );
end;
$$;

-- Suma uno a todos los sujetos si al mayor le queda cupo. Atómica: las filas
-- se bloquean antes de leer, así que dos peticiones a la vez no pueden
-- llevarse las dos el último documento del día.
create function public.usage_consume(
  subjects text[],
  usage_day date,
  day_limit integer
)
returns table (allowed boolean, used integer)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  current_used integer;
begin
  perform public.usage_check_subjects(subjects, usage_day);

  if day_limit is null or day_limit < 1 then
    raise exception 'usage: limit must be positive' using errcode = '22023';
  end if;

  insert into public.usage_counters (subject, day)
  select distinct s, usage_day from unnest(subjects) as s
  on conflict (subject, day) do nothing;

  -- Orden fijo al bloquear: dos peticiones con los mismos sujetos no se
  -- esperan la una a la otra en cruz.
  perform 1
  from public.usage_counters c
  where c.subject = any (subjects) and c.day = usage_day
  order by c.subject
  for update;

  select max(c.used) into current_used
  from public.usage_counters c
  where c.subject = any (subjects) and c.day = usage_day;

  if current_used >= day_limit then
    return query select false, current_used;
    return;
  end if;

  update public.usage_counters c
  set used = c.used + 1
  where c.subject = any (subjects) and c.day = usage_day;

  -- Los días pasados ya no cuentan. Se borran aquí, de paso, para no
  -- depender de una tarea programada que no existe.
  delete from public.usage_counters c where c.day < usage_day - 7;

  return query select true, current_used + 1;
end;
$$;

-- Las funciones no se ejecutan por defecto para cualquiera: se concede solo
-- a los dos roles de la API.
revoke all on function public.usage_check_subjects(text[], date) from public;
revoke all on function public.usage_used(text[], date) from public;
revoke all on function public.usage_consume(text[], date, integer) from public;

grant execute on function public.usage_used(text[], date)
  to anon, authenticated;
grant execute on function public.usage_consume(text[], date, integer)
  to anon, authenticated;
