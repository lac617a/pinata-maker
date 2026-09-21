-- Versiones de plantilla de un proyecto.
--
-- Una versión publicada es inmutable (docs/AGENTS.md §17, docs/storage.md
-- §17): no se corrige, se publica la siguiente. Aquí eso no es una convención
-- que haya que recordar, sino algo que la base de datos no permite hacer de
-- otra forma.
--
-- Ver docs/storage.md §15-§22 y §153-§158.

create table public.template_versions (
  id uuid primary key default gen_random_uuid(),

  -- Borrar el proyecto borra sus versiones: una plantilla sin proyecto no es
  -- de nadie.
  project_id uuid not null references public.projects (id) on delete cascade,

  -- Correlativo dentro del proyecto, no del sistema: lo que el usuario lee es
  -- «la v3 de este proyecto». Lo fija el dominio y no un `serial`.
  version_number integer not null,

  -- Metadatos consultables. Están fuera del JSON a propósito: listar las
  -- versiones de un proyecto no debe obligar a leer y recorrer documentos de
  -- cientos de kilobytes. Ver docs/storage.md §32.
  name text not null,
  width_mm double precision not null,
  height_mm double precision not null,
  depth_mm double precision not null,
  piece_count integer not null,

  -- Con qué reglas se derivó y con qué formato se guardó. Sin esto, una
  -- plantilla antigua se leería con las reglas de hoy sin avisar.
  -- Ver docs/storage.md §33 y §34.
  derivation_version text not null,
  schema_version integer not null,

  -- De qué imagen salió, cuando se sabe. Si el usuario borra la imagen, la
  -- versión sobrevive sin su procedencia: el molde ya impreso sigue siendo
  -- válido. Ver docs/storage.md §48.
  source_asset_id uuid references public.assets (id) on delete set null,

  -- La geometría completa. Va en JSON porque no se consulta por su
  -- contenido: se lee entera o no se lee. Ver docs/storage.md §32.
  definition jsonb not null,

  created_at timestamptz not null default now(),

  -- La pieza clave de la inmutabilidad frente a dos publicaciones a la vez:
  -- las dos leen «la última es la v3» y las dos piden la v4. Una de ellas
  -- falla aquí en lugar de pisar a la otra. Ver docs/storage.md §21 y §22.
  constraint template_versions_number_unique unique (project_id, version_number),

  constraint template_versions_number_positive check (version_number >= 1),
  constraint template_versions_pieces_positive check (piece_count >= 1),
  constraint template_versions_name_not_blank check (btrim(name) <> ''),
  constraint template_versions_size_positive
    check (width_mm > 0 and height_mm > 0 and depth_mm > 0)
);

-- El listado va de la más reciente a la más antigua, y `findLatest` pide solo
-- la primera.
create index template_versions_project_number_idx
  on public.template_versions (project_id, version_number desc);

alter table public.template_versions enable row level security;

revoke all on table public.template_versions from anon;

-- **No existe política de UPDATE, y es deliberado.** Sin ella, ningún
-- usuario puede modificar una versión publicada: la inmutabilidad deja de
-- depender de que el código se acuerde de no hacerlo.
--
-- Tampoco existe política de DELETE. Una versión se va con su proyecto —la
-- clave foránea en cascada no pasa por RLS— pero no puede borrarse suelta:
-- un export generado apunta a ella. Ver docs/storage.md §55.
revoke update, delete on table public.template_versions from authenticated;

-- La propiedad es transitiva: la versión es del dueño de su proyecto.
create policy template_versions_select_own
  on public.template_versions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.projects p
      where p.id = template_versions.project_id
        and p.owner_id = (select auth.uid())
    )
  );

create policy template_versions_insert_own
  on public.template_versions
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.projects p
      where p.id = template_versions.project_id
        and p.owner_id = (select auth.uid())
    )
  );
