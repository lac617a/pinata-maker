-- Proyectos del usuario.
--
-- El aislamiento entre usuarios (AC-15) se aplica aquí con Row Level
-- Security, además de en el dominio. Son dos defensas para la misma regla, a
-- propósito: la del dominio explica el porqué y se puede leer; la de la base
-- de datos no se puede olvidar desde una ruta nueva.
--
-- Ver docs/storage.md §10-§14 y docs/PRD.md §22, §24 y §25.

create table public.projects (
  id uuid primary key default gen_random_uuid(),

  -- Borrar la cuenta borra sus proyectos. No tiene sentido conservar el
  -- trabajo de un usuario que ya no existe, y nadie podría acceder a él.
  owner_id uuid not null references auth.users (id) on delete cascade,

  name text not null,

  -- Los estados de docs/PRD.md §22. La restricción está en la base de datos
  -- porque un estado inventado rompe la interfaz, no solo el dominio.
  status text not null default 'DRAFT',

  created_at timestamptz not null default now(),

  -- Lo fija el dominio, no un trigger: `updatedAt` forma parte de la entidad
  -- y sobrescribirlo aquí haría que guardar dos veces lo mismo diera
  -- resultados distintos.
  updated_at timestamptz not null default now(),

  constraint projects_name_not_blank check (btrim(name) <> ''),
  constraint projects_name_length check (char_length(name) <= 120),
  constraint projects_status_valid
    check (status in ('DRAFT', 'PROCESSING', 'READY', 'ERROR'))
);

-- El panel lista los proyectos de un usuario del más reciente al más antiguo.
create index projects_owner_updated_idx
  on public.projects (owner_id, updated_at desc);

alter table public.projects enable row level security;

-- Un usuario anónimo puede usar la herramienta, pero no conserva proyectos
-- (docs/PRD.md §38). Retirar el permiso lo deja escrito en la base de datos
-- en lugar de depender de que ninguna política lo conceda.
revoke all on table public.projects from anon;

-- Una política por operación en lugar de una `for all`: se leen mejor y
-- permiten endurecer una sin tocar las demás.
--
-- `(select auth.uid())` y no `auth.uid()`: envuelto en un subselect,
-- PostgreSQL lo evalúa una vez por consulta en lugar de una vez por fila.

create policy projects_select_own
  on public.projects
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy projects_insert_own
  on public.projects
  for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

-- `using` decide qué filas se pueden tocar; `with check`, cómo pueden quedar.
-- Hacen falta las dos: sin `with check`, un usuario podría cambiar el
-- `owner_id` de su propio proyecto y regalárselo a otro.
create policy projects_update_own
  on public.projects
  for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy projects_delete_own
  on public.projects
  for delete
  to authenticated
  using ((select auth.uid()) = owner_id);
