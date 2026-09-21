-- Archivos generados de un proyecto.
--
-- Un export es un artefacto: se deriva de una versión de plantilla y no la
-- sustituye (docs/storage.md §50). Una vez generado es inmutable (§55): si la
-- plantilla cambia, el PDF que el usuario ya imprimió sigue correspondiéndose
-- con la versión con la que se hizo.
--
-- Ver docs/storage.md §50-§55 y §160-§164.

create table public.exports (
  id uuid primary key default gen_random_uuid(),

  project_id uuid not null references public.projects (id) on delete cascade,

  -- De qué molde salió. `restrict` y no `cascade`: una versión no se puede
  -- borrar suelta —su tabla no tiene política de DELETE— y el proyecto se
  -- lleva las dos por delante a la vez.
  template_version_id uuid not null
    references public.template_versions (id) on delete restrict,

  -- La ruta es única: dos exports no pueden apuntar al mismo archivo.
  storage_key text not null unique,

  file_name text not null,
  content_type text not null,
  page_count integer not null,
  byte_size bigint not null,

  -- Con qué papel se repartió y con qué generador se produjo. Es lo que
  -- permite reproducir el contexto del archivo. Ver docs/storage.md §53, §54.
  paper_format text not null,
  paper_orientation text not null,
  generator_version text not null,

  created_at timestamptz not null default now(),

  constraint exports_pages_positive check (page_count >= 1),
  constraint exports_size_positive check (byte_size > 0),
  constraint exports_content_type_pdf check (content_type = 'application/pdf'),
  constraint exports_paper_format_valid
    check (paper_format in ('A4', 'A3', 'LETTER')),
  constraint exports_orientation_valid
    check (paper_orientation in ('PORTRAIT', 'LANDSCAPE'))
);

create index exports_project_created_idx
  on public.exports (project_id, created_at desc);

alter table public.exports enable row level security;

revoke all on table public.exports from anon;

-- Sin política de UPDATE: un archivo generado no se corrige, se vuelve a
-- generar. Sí hay DELETE, al revés que en versiones: un export es
-- regenerable y ocupa espacio, así que el usuario puede tirarlo.
revoke update on table public.exports from authenticated;

-- La propiedad es transitiva: el export es del dueño de su proyecto.
create policy exports_select_own
  on public.exports
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.projects p
      where p.id = exports.project_id
        and p.owner_id = (select auth.uid())
    )
  );

create policy exports_insert_own
  on public.exports
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.projects p
      where p.id = exports.project_id
        and p.owner_id = (select auth.uid())
    )
  );

create policy exports_delete_own
  on public.exports
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.projects p
      where p.id = exports.project_id
        and p.owner_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- Almacenamiento de los documentos
-- ---------------------------------------------------------------------------

-- Bucket aparte del de imágenes y también privado. Separarlos permite que
-- cada uno tenga su política de retención y su límite de tamaño sin afectar
-- al otro. Ver docs/storage.md §6 y §45.
insert into storage.buckets (id, name, public)
values ('project-exports', 'project-exports', false)
on conflict (id) do nothing;

-- La ruta es `projects/{projectId}/exports/{exportId}/document.pdf`, así que
-- `storage.foldername(name)` devuelve `{projects, projectId, exports,
-- exportId}` y el proyecto está en la posición 2. Ver docs/storage.md §51.
create policy project_exports_select_own
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'project-exports'
    and exists (
      select 1
      from public.projects p
      where p.id = ((storage.foldername(name))[2])::uuid
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
      where p.id = ((storage.foldername(name))[2])::uuid
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
      where p.id = ((storage.foldername(name))[2])::uuid
        and p.owner_id = (select auth.uid())
    )
  );
