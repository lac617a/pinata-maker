-- Corrección de las políticas de object storage.
--
-- Las políticas de 0002, 0004 y 0005 comparaban el proyecto con
-- `storage.foldername(name)` **dentro** de un
-- `exists (select 1 from public.projects p ...)`. `projects` también tiene una
-- columna `name` —el nombre del proyecto—, y PostgreSQL resuelve un nombre de
-- columna sin calificar contra la tabla más cercana. La política leía
-- «Elefante» en lugar de la ruta del archivo, no encontraba el proyecto y
-- denegaba siempre: «new row violates row-level security policy».
--
-- Aquí la ruta se nombra como `objects.name`, que solo puede ser la columna
-- de `storage.objects`. Idempotente: borra si existen y vuelve a crear.
-- Ver docs/storage.md §165.

drop policy if exists project_assets_select_own on storage.objects;
drop policy if exists project_assets_insert_own on storage.objects;
drop policy if exists project_assets_delete_own on storage.objects;
drop policy if exists project_exports_select_own on storage.objects;
drop policy if exists project_exports_insert_own on storage.objects;
drop policy if exists project_exports_delete_own on storage.objects;

-- ---------------------------------------------------------------------------
-- project-assets: imágenes originales
-- ---------------------------------------------------------------------------

-- La de lectura hace falta también para subir: el servidor de storage
-- inserta con `returning`, y la fila nueva tiene que pasar el SELECT.
create policy project_assets_select_own
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'project-assets'
    and exists (
      select 1
      from public.projects p
      where p.id::text = (storage.foldername(objects.name))[2]
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
      where p.id::text = (storage.foldername(objects.name))[2]
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
      where p.id::text = (storage.foldername(objects.name))[2]
        and p.owner_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- project-exports: documentos generados
-- ---------------------------------------------------------------------------

create policy project_exports_select_own
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'project-exports'
    and exists (
      select 1
      from public.projects p
      where p.id::text = (storage.foldername(objects.name))[2]
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
      where p.id::text = (storage.foldername(objects.name))[2]
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
      where p.id::text = (storage.foldername(objects.name))[2]
        and p.owner_id = (select auth.uid())
    )
  );
