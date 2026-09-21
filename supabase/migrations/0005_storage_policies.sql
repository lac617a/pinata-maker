-- Reparación de las políticas de object storage.
--
-- Las migraciones 0002 y 0004 crean los buckets y sus políticas sobre
-- `storage.objects`. En la base de datos real los buckets existían pero una
-- subida a un proyecto propio fallaba con «new row violates row-level
-- security policy»: las tablas se habían aplicado y las políticas de storage
-- no.
--
-- Esta migración deja las seis políticas en su sitio **se hayan aplicado o
-- no**: borra si existen y vuelve a crear. Se puede ejecutar las veces que
-- haga falta. Ver docs/storage.md §151 y §165.
--
-- La ruta es `projects/{projectId}/...`, así que `storage.foldername(name)`
-- devuelve `{projects, projectId, ...}` y el proyecto está en la posición 2.

insert into storage.buckets (id, name, public)
values
  ('project-assets', 'project-assets', false),
  ('project-exports', 'project-exports', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- project-assets: imágenes originales
-- ---------------------------------------------------------------------------

drop policy if exists project_assets_select_own on storage.objects;
drop policy if exists project_assets_insert_own on storage.objects;
drop policy if exists project_assets_delete_own on storage.objects;

-- La de lectura no es opcional aunque solo se quiera subir: el servidor de
-- storage inserta con `returning`, y PostgreSQL exige que la fila nueva
-- también pase las políticas de SELECT.
create policy project_assets_select_own
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'project-assets'
    and exists (
      select 1
      from public.projects p
      where p.id::text = (storage.foldername(name))[2]
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
      where p.id::text = (storage.foldername(name))[2]
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
      where p.id::text = (storage.foldername(name))[2]
        and p.owner_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- project-exports: documentos generados
-- ---------------------------------------------------------------------------

drop policy if exists project_exports_select_own on storage.objects;
drop policy if exists project_exports_insert_own on storage.objects;
drop policy if exists project_exports_delete_own on storage.objects;

create policy project_exports_select_own
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'project-exports'
    and exists (
      select 1
      from public.projects p
      where p.id::text = (storage.foldername(name))[2]
        and p.owner_id = (select auth.uid())
    )
  );

create policy project_exports_insert_own
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'project-exports'
    and exists (
      select 1
      from public.projects p
      where p.id::text = (storage.foldername(name))[2]
        and p.owner_id = (select auth.uid())
    )
  );

create policy project_exports_delete_own
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'project-exports'
    and exists (
      select 1
      from public.projects p
      where p.id::text = (storage.foldername(name))[2]
        and p.owner_id = (select auth.uid())
    )
  );
