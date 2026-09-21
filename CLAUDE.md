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
pnpm test              # Vitest, 428 tests, entorno node
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
src/components/<área>/      Las pantallas: session, projects, templates, exports.
src/infrastructure/         Adaptadores compartidos (cliente de Supabase).
supabase/migrations/        Esquema y políticas RLS. Se aplican a mano.
src/modules/
├── geometry/               Vocabulario físico en mm. No depende de nada.
├── image-processing/       Imagen → máscara → contorno → mm.
├── accounts/               Registro y sesión, tras el puerto AuthGateway.
├── assets/                 Imagen original del proyecto: fila y archivo.
├── projects/               Proyecto del usuario, con su repositorio.
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

* **Hecho y probado:** validación de imagen, máscara alfa → contorno →
  geometría en mm, derivación de piezas por extrusión perimetral, reparto en
  páginas, marcas de alineación, calibración y generación de PDF (AC-06 a
  AC-12). La cadena está cerrada: una máscara produce un juego de piezas
  imprimibles a tamaño real.
* **Lo único que falta de la Fase B:** el adaptador que quita el fondo y
  produce la máscara alfa. Decisión abierta: ¿servicio externo o servidor
  propio? (`docs/roadmap.md` §5.2). No bloquea nada más: el contrato ya está
  abstraído y el resto del pipeline empieza en la máscara.
* **Fase D parcial:** `generateTemplate` y `generatePrintableDocument` ya
  cubren la cadena entera. Falta lo que depende de persistencia.
* **Fase E casi cerrada:** proyecto, imagen original, versiones de plantilla
  y exports están persistidos con RLS. Una versión publicada es inmutable, y
  lo impone la base de datos: no tiene política de UPDATE. Queda la limpieza
  de archivos huérfanos y la retención (`docs/storage.md` §164).
* **La API existe y está autenticada:** proyectos, sesión, imágenes,
  versiones de plantilla y descarga de PDF. Sin
  sesión responde 401; un recurso ajeno responde 404 y no 403.
* **Hay seis migraciones y dos buckets privados.** La 0006 corrige las
  políticas de storage. Dentro de la subconsulta de una política, toda
  columna de la tabla protegida va calificada (`objects.name`): `projects`
  también tiene `name` y la capturaba (`docs/storage.md` §165). Se aplican a mano y en
  orden. Comprueba siempre con `pnpm check:supabase` antes de dar por hecho
  que la base de datos está al día.
* **La interfaz cubre el ciclo entero** (fase F parcial): entrar, crear
  proyecto, subir imagen, calcular el molde con su coste, publicar versión,
  generar el PDF y descargarlo.
* **La plantilla se deriva en el navegador** mientras no exista la
  eliminación de fondo: un PNG con transparencia no la necesita. El PDF, que
  es lo que se imprime, se genera siempre en el servidor desde la versión
  guardada (`docs/roadmap.md` §2.15).
* **Siguiente:** imprimir un molde y medirlo con una regla (`docs/roadmap.md`
  §8.1). Nada de lo construido lo ha comprobado todavía.
* **Fases G y H** cubren el modelo de acceso (anónimo con límite, registrado,
  de pago) y la publicación con SEO y páginas legales. Los requisitos están en
  `docs/PRD.md` §38-§43, no en el roadmap: el roadmap solo registra cuándo se
  construyen.

Al completar una fase, actualizar `docs/roadmap.md` (§1, §2, §4 y la tabla de
criterios de aceptación §7).
