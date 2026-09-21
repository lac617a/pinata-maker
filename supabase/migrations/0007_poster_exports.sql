-- Un documento puede salir de una imagen, no solo de una versión de plantilla.
--
-- Desde el 2026-09-21 la salida del producto es la imagen ampliada y repartida
-- en hojas (docs/PRD.md §44). Ese PDF no sale de ninguna versión de
-- plantilla: sale de una imagen del proyecto y de un tamaño.
--
-- Ver docs/storage.md §166.

alter table public.exports
  alter column template_version_id drop not null;

-- De qué imagen salió. Si el usuario la borra, el documento ya generado sigue
-- existiendo y sigue siendo válido: pierde la procedencia, no el contenido.
alter table public.exports
  add column source_asset_id uuid
    references public.assets (id) on delete set null;

-- Tamaño físico impreso. Nulo en los documentos anteriores a esta migración.
alter table public.exports
  add column width_mm double precision,
  add column height_mm double precision;

alter table public.exports
  add constraint exports_size_positive_when_known
    check (
      (width_mm is null or width_mm > 0)
      and (height_mm is null or height_mm > 0)
    );

-- Un documento tiene que poder decir de dónde salió. Las filas anteriores
-- tienen versión de plantilla, así que la restricción ya se cumple.
--
-- La imagen no entra en la condición: al borrarla, `on delete set null`
-- deja `source_asset_id` vacío en un documento que sí salió de ella, y
-- borrar una imagen no debe poder fallar por eso.
alter table public.exports
  add constraint exports_has_origin
    check (template_version_id is not null or width_mm is not null);
