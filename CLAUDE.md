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
pnpm test              # Vitest, 182 tests, entorno node
```

```bash
pnpm exec tsc --noEmit # Type check, sin emitir
```

```bash
pnpm test:watch        # Vitest en watch
pnpm dev               # Next.js dev server
pnpm build             # Build de producción
```

Ejecutar un solo archivo de test:

```bash
pnpm exec vitest run src/modules/printing/calibration.test.ts
```

`pnpm lint` **no funciona**: lanza el asistente interactivo de Next y falla.
Es deuda conocida (`docs/roadmap.md` §6), no un error del entorno.

Gestor de paquetes: `pnpm` (hay `pnpm-lock.yaml` y `pnpm-workspace.yaml` con
overrides de seguridad para `postcss` y `sharp`). No usar npm ni yarn.

---

## 3. Estructura real

```text
app/                        Presentación (App Router). Permanece en la raíz.
src/modules/
├── geometry/               Vocabulario físico en mm. No depende de nada.
├── image-processing/       Imagen → máscara → contorno → mm.
├── printing/               Papel, márgenes, tiling, PrintLayout.
└── pdf-generation/         PrintLayout → PDF. Boundary de salida.
    └── infrastructure/     Único sitio que importa jspdf.
docs/                       Fuente de verdad del comportamiento.
```

`src/domain/` y `src/infrastructure/` existen vacíos y no se usan. La
estructura crece según la necesidad (`docs/architecture.md` §4): no crear
capas por adelantado.

Flujo del pipeline:

```text
Imagen → máscara alfa → contorno px → geometría mm → PrintLayout → PDF
         (falta B)       image-processing              printing    pdf-generation
```

---

## 4. Convenciones observadas en el código

* **Todo el dominio en milímetros.** Los pixels no salen de
  `image-processing/`; los puntos PDF no entran al dominio.
* Tipos `readonly`, funciones `create*` que validan invariantes y lanzan
  errores de dominio (`InvalidGeometryError`, `InvalidCalibrationError`…).
  Ver `src/modules/geometry/errors.ts` y `src/modules/printing/errors.ts`.
* Imports relativos entre módulos (`../geometry/point`). No hay alias de path
  configurado en `tsconfig.json`.
* **Comentarios en español**, explicando el *porqué* y citando la sección de
  la documentación que lo justifica (`Ver docs/printing.md §38`).
* **Tests en inglés**, describiendo comportamiento (`AGENTS.md` §28). Un
  archivo `*.test.ts` junto al módulo que prueba.
* Vitest corre en entorno `node` y solo `src/**/*.test.ts`: el dominio se
  prueba sin React, Next ni navegador. No añadir tests de UI a esa suite.

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
  geometría en mm, reparto en páginas, marcas de alineación, calibración y
  generación de PDF (AC-07 a AC-12). El bucle físico está cerrado: ya se puede
  imprimir un molde y medirlo con una regla.
* **Lo único que falta de la Fase B:** el adaptador que quita el fondo y
  produce la máscara alfa. Decisión abierta: ¿servicio externo o servidor
  propio? (`docs/roadmap.md` §5.2). No bloquea nada más: el contrato ya está
  abstraído y el resto del pipeline empieza en la máscara.
* **Fase C (plantilla) está bloqueada** por una decisión de diseño sin tomar:
  cómo se derivan piezas, pliegues y pestañas desde silueta + profundidad. No
  empezar a implementarla sin resolver `docs/roadmap.md` §5.
* **Fases G y H** cubren el modelo de acceso (anónimo con límite, registrado,
  de pago) y la publicación con SEO y páginas legales. Los requisitos están en
  `docs/PRD.md` §38-§43, no en el roadmap: el roadmap solo registra cuándo se
  construyen.

Al completar una fase, actualizar `docs/roadmap.md` (§1, §2, §4 y la tabla de
criterios de aceptación §7).
