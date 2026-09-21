-- Archivos de un proyecto.
--
-- Un asset es de quien sea su proyecto. Esa relación se comprueba en el
-- dominio y aquí otra vez, igual que con los proyectos: la del dominio se lee
-- y explica el porqué, la de la base de datos no se puede olvidar desde una
-- ruta nueva.
--
-- Ver docs/storage.md §37-§49 y §142.

create table public.assets (
  id uuid primary key default gen_random_uuid(),

  -- Borrar el proyecto borra sus archivos: no tiene sentido conservar la
  -- imagen de algo que ya no existe.
  project_id uuid not null references public.projects (id) on delete cascade,

  -- El MVP solo guarda el original. PROCESSED_IMAGE llegará con la
  -- eliminación de fondo y PDF con la entrega del documento.
  kind text not null,

  -- La ruta es única: dos assets no pueden apuntar al mismo archivo.
  storage_key text not null unique,

  mime_type text not null,
  byte_size bigint not null,

  -- Metadato para enseñárselo al usuario, nunca parte de la ruta
  -- (docs/storage.md §42).
  original_name text not null,

  created_at timestamptz not null default now(),

  constraint assets_kind_valid check (kind in ('ORIGINAL_IMAGE')),
  constraint assets_mime_supported
    check (mime_type in ('image/png', 'image/jpeg', 'image/webp')),
  constraint assets_size_positive check (byte_size > 0)
);

create index assets_project_created_idx
  on public.assets (project_id, created_at desc);

alter table public.assets enable row level security;

revoke all on table public.assets from anon;

-- La propiedad es transitiva: el asset es del dueño de su proyecto.
create policy assets_select_own
  on public.assets
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.projects p
      where p.id = assets.project_id
        and p.owner_id = (select auth.uid())
    )
  );

create policy assets_insert_own
  on public.assets
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.projects p
      where p.id = assets.project_id
        and p.owner_id = (select auth.uid())
    )
  );

-- Sin `with check`, un usuario podría mover su asset a un proyecto ajeno.
create policy assets_update_own
  on public.assets
  for update
  to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = assets.project_id and p.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = assets.project_id and p.owner_id = (select auth.uid())
    )
  );

create policy assets_delete_own
  on public.assets
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.projects p
      where p.id = assets.project_id
        and p.owner_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- Almacenamiento de archivos
-- ---------------------------------------------------------------------------

-- Privado: las imágenes de un usuario no quedan accesibles a quien adivine la
-- ruta. El navegador las pide con una URL firmada y caducable.
insert into storage.buckets (id, name, public)
values ('project-assets', 'project-assets', false)
on conflict (id) do nothing;

-- La ruta es `projects/{projectId}/assets/{assetId}/original.ext`, así que
-- `storage.foldername(name)` devuelve
-- `{projects, projectId, assets, assetId}` y el proyecto está en la
-- posición 2. Ver docs/storage.md §41.
create policy project_assets_select_own
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'project-assets'
    and exists (
      select 1
      from public.projects p
      where p.id = ((storage.foldername(name))[2])::uuid
        and p.owner_id = (select auth.uid())
    )
  );

create policy project_assets_insert_own
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'project-assets'
    and exists (
      select 1
      from public.projects p
      where p.id = ((storage.foldername(name))[2])::uuid
        and p.owner_id = (select auth.uid())
    )
  );

create policy project_assets_delete_own
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'project-assets'
    and exists (
      select 1
      from public.projects p
      where p.id = ((storage.foldername(name))[2])::uuid
        and p.owner_id = (select auth.uid())
    )
  );
