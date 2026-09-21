# CLAUDE.md

Guía operativa para Claude Code en este repositorio.

> **Las reglas de ingeniería, arquitectura y documentación viven en
> [`AGENTS.md`](AGENTS.md). Ese documento es obligatorio: léelo antes de
> modificar código.** Este archivo no lo reemplaza ni lo resume; solo añade lo
> que un agente necesita saber para trabajar en este repo concreto (comandos,
> estructura real, convenciones observadas) y apunta al resto.

---

## 1. Antes de tocar código

1. `AGENTS.md` — reglas vinculantes (§3 Golden Rule, §6 precedencia
   documental, §38 workflow de cambio, §50 checklist final, §52 definition of
   done).
2. `docs/roadmap.md` — dónde está el proyecto hoy, decisiones cerradas,
   fases pendientes y deuda conocida. Registra **estado**, no requisitos, y
   debe actualizarse al terminar cada fase.
3. La documentación del subsistema que vayas a tocar (`docs/`).

Orden de precedencia cuando algo se contradice (`AGENTS.md` §6):

```text
PRD → domain → architecture → doc del subsistema → implementación existente
```

El mapa de qué define cada documento está en `AGENTS.md` §5. No lo dupliques
aquí.

---

## 2. Comandos

```bash
pnpm test              # Vitest, 561 tests, entorno node
```

```bash
pnpm exec tsc --noEmit # Type check, sin emitir
```

```bash
pnpm check:supabase    # Variables, conexión, tablas y RLS. No imprime valores.
```

```bash
pnpm lint              # ESLint: orden de imports y `../` prohibido
```

```bash
pnpm verify            # format:check + lint + tsc + test. Lo de antes de commitear.
```

```bash
pnpm test:watch        # Vitest en watch
pnpm lint:fix          # ESLint con --fix: ordena imports
pnpm format            # Prettier sobre el repo (la documentación no se toca)
pnpm dev               # Next.js dev server
pnpm build             # Build de producción
```

Ejecutar un solo archivo de test:

```bash
pnpm exec vitest run src/modules/printing/calibration.test.ts
```

El estilo lo decide Prettier y las reglas ESLint; ninguna de las dos cosas
debería discutirse en una revisión. La configuración está en
`.prettierrc.json` y `eslint.config.mjs`, y cada regla dice por qué existe.

`docs/` no pasa por Prettier: el formato de esos archivos es deliberado y
normalizarlo taparía los cambios de contenido en el diff.

Gestor de paquetes: `pnpm` (hay `pnpm-lock.yaml` y `pnpm-workspace.yaml` con
overrides de seguridad para `postcss` y `sharp`). No usar npm ni yarn.

---

## 3. Estructura real

```text
app/                        Rutas (App Router). Permanece en la raíz.
app/api/                    API. Las rutas solo montan el contexto y delegan.
src/application/            Casos de uso. Coordinan módulos, sin reglas propias.
src/presentation/http/      Petición → caso de uso → respuesta. Sin Next.
src/presentation/next/      Único punto que junta Next, Supabase y el dominio.
src/presentation/client/    Navegador: cliente HTTP, TanStack Query, providers.
src/components/ui/          Componentes de shadcn/ui. Código propio, no dependencia.
src/components/<área>/      Las pantallas: session, projects, posters, exports.
src/infrastructure/         Adaptadores compartidos (cliente de Supabase).
supabase/migrations/        Esquema y políticas RLS. Se aplican a mano.
src/modules/
├── geometry/               Vocabulario físico en mm. No depende de nada.
├── image-processing/       Imagen → máscara → contorno → mm.
├── accounts/               Registro y sesión, tras el puerto AuthGateway.
├── assets/                 Imagen original del proyecto: fila y archivo.
├── posters/                La salida del producto: imagen ampliada en hojas,
│                           recorte y aviso de resolución.
├── projects/               Proyecto del usuario, con su repositorio.
├── usage/                  Niveles de acceso y límite diario, con su contador.
├── templates/              Silueta + profundidad → piezas recortables, y la
│                           versión inmutable con la que se publican.
├── printing/               Papel, márgenes, tiling, PrintLayout.
├── storage/                Puerto de object storage: subir, borrar, firmar.
├── exports/                PDF generado de una versión, con su archivo.
└── pdf-generation/         PrintLayout → PDF. Boundary de salida.
    └── infrastructure/     Único sitio que importa jspdf.
docs/                       Fuente de verdad del comportamiento.
```

`src/domain/` y `src/infrastructure/pdf/` existen vacíos y no se usan: son
restos previos. La infraestructura de PDF vive en
`src/modules/pdf-generation/infrastructure/`. La estructura crece según la
necesidad (`docs/architecture.md` §4 y §73): no crear capas por adelantado.

Flujo del pipeline:

```text
Imagen → máscara alfa → contorno px → geometría mm → piezas → PrintLayout → PDF
         (canvas, B/2)   image-processing            templates   printing   pdf-generation
                         └────────── generateTemplate ─────────┘  └─ generatePrintableDocument ─┘
```

`src/modules/pipeline.test.ts` recorre la cadena entera. Existe porque hay
errores que solo viven en la costura entre módulos correctos.

---

## 4. Convenciones observadas en el código

* **Todo el dominio en milímetros.** Los pixels no salen de
  `image-processing/`; los puntos PDF no entran al dominio.
* Tipos `readonly`, funciones `create*` que validan invariantes y lanzan
  errores de dominio (`InvalidGeometryError`, `InvalidCalibrationError`…).
  Ver `src/modules/geometry/errors.ts` y `src/modules/printing/errors.ts`.
* **Imports absolutos con `@/` entre carpetas** (`@/modules/geometry/point`),
  relativos solo entre hermanos (`./errors`). Subir por el árbol —`../`— está
  prohibido por ESLint: no dice de dónde viene nada y se rompe al mover un
  archivo. El alias está en `tsconfig.json` y en `vitest.config.mts`.
* El orden de los imports lo arregla ESLint: paquetes, después `@/`, después
  los hermanos. No se ordena a mano.
* **Comentarios en español**, explicando el *porqué* y citando la sección de
  la documentación que lo justifica (`Ver docs/printing.md §38`).
* **Tests en inglés**, describiendo comportamiento (`AGENTS.md` §28). Un
  archivo `*.test.ts` junto al módulo que prueba.
* Vitest corre en entorno `node` y solo `src/**/*.test.ts`: el dominio se
  prueba sin React, Next ni navegador. No añadir tests de UI a esa suite.
* **La interfaz usa los tokens del tema**, nunca un color a mano:
  `bg-background`, `text-muted-foreground`, `border-border`. Están definidos
  en `app/globals.css` sobre la escala `stone`.
* Los componentes de `src/components/ui/` los genera `shadcn` pero son
  **código del proyecto**: se editan y se versionan. Después de
  `pnpm dlx shadcn@latest add <componente>`, pasar `pnpm lint:fix` y
  `pnpm format`: la CLI no escribe con estas reglas.
* Los datos del navegador van por TanStack Query
  (`src/presentation/client/`). Un 4xx no se reintenta y una mutación nunca
  se repite sola: publicar dos veces crearía dos versiones.

---

## 5. Cada cambio termina en un commit

Regla del proyecto, no preferencia: `AGENTS.md` §54 y §38 paso 11.

Un feature, un commit. Implementación, tests y documentación del mismo cambio
van juntos. Antes de commitear, la suite en verde y `tsc` limpio.

```bash
pnpm test && pnpm exec tsc --noEmit
```

Prefijos: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`, con el módulo
afectado cuando aclare el alcance — `feat(pdf-generation): ...`.

---

## 6. Estado y siguiente paso

Resumen; la versión autoritativa está en `docs/roadmap.md`.

* **El producto es la imagen en mosaico** (`docs/PRD.md` §44): subir una
  imagen, recortarla si se quiere, elegir el tamaño en cm y descargar el PDF
  con la imagen ampliada en hojas. El módulo es `src/modules/posters/`; la
  plantilla con piezas sigue en el código, sin interfaz.
* **Hecho y probado del molde con piezas:** máscara alfa → contorno →
  geometría en mm, derivación de piezas, reparto en páginas, marcas,
  calibración y PDF (AC-06 a AC-12). El póster reutiliza el reparto, las
  marcas, la calibración y el PDF.
* **Aparcado con el molde:** quitar el fondo (fase B) y derivar piezas. El
  póster no los necesita: el usuario recorta la figura a mano sobre el
  cartón (`docs/roadmap.md` §4).
* **Fase E casi cerrada:** proyecto, imagen original, versiones de plantilla
  y exports están persistidos con RLS. Una versión publicada es inmutable, y
  lo impone la base de datos: no tiene política de UPDATE. Queda la limpieza
  de archivos huérfanos y la retención (`docs/storage.md` §164).
* **La API existe y está autenticada:** proyectos, sesión, imágenes,
  versiones de plantilla y descarga de PDF. Sin
  sesión responde 401; un recurso ajeno responde 404 y no 403.
* **Uso sin cuenta con límite diario** (`docs/usage.md`): `/crear` es
  pública y no guarda nada; cada PDF cuenta, 3 al día sin cuenta y 20 con
  ella. El contador es la migración 0008 y necesita `USAGE_HASH_SECRET` en
  el entorno. Queda el nivel de pago.
* **Hay ocho migraciones y dos buckets privados.** La 0008 cuenta el uso
  diario. La 0007 deja que un
  documento salga de una imagen (el póster). La 0006 corrige las
  políticas de storage. Dentro de la subconsulta de una política, toda
  columna de la tabla protegida va calificada (`objects.name`): `projects`
  también tiene `name` y la capturaba (`docs/storage.md` §165). Se aplican a mano y en
  orden. Comprueba siempre con `pnpm check:supabase` antes de dar por hecho
  que la base de datos está al día.
* **Fase H casi hecha:** landing con ejemplos y FAQ, las cuatro páginas
  legales en el pie de todas (`docs/legal.md`), sitemap, robots y `noindex`
  en lo privado (`docs/seo.md`). Antes de publicar: rellenar
  `src/components/legal/site-owner.ts` —cada página legal avisa mientras
  falte algo— y `NEXT_PUBLIC_SITE_URL`, obligatoria en producción. El banner
  de cookies llega con AdSense.
* **CI y despliegue preparados** (`docs/deploy.md`): el workflow corre
  `pnpm verify` y el build; `.gitattributes` fuerza LF. En Vercel, el límite
  de 4,5 MB por petición choca con las imágenes de 10 MB (`docs/deploy.md` §4).
* **Siguiente:** imprimir un póster y medirlo con una regla
  (`docs/roadmap.md` §8.1), resolver el límite de 4,5 MB y desplegar.
* **Fases G y H** cubren el modelo de acceso (anónimo con límite, registrado,
  de pago) y la publicación con SEO y páginas legales. Los requisitos están en
  `docs/PRD.md` §38-§43, no en el roadmap: el roadmap solo registra cuándo se
  construyen.

Al completar una fase, actualizar `docs/roadmap.md` (§1, §2, §4 y la tabla de
criterios de aceptación §7).
