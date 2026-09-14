# Piñata Maker — Roadmap

Estado del desarrollo: qué existe, qué decisiones ya están cerradas y qué
queda por construir.

Este documento **no define comportamiento**. Es un registro de estado. Cuando
haya conflicto, mandan `PRD.md`, `domain.md`, `architecture.md` y la
documentación del subsistema, en ese orden (`AGENTS.md` §6).

Debe actualizarse al terminar cada fase.

---

# 1. Estado actual

El **dominio geométrico y de impresión está completo y probado**. Dada una
`TemplateGeometry` en milímetros, el sistema ya produce un documento de
impresión físicamente correcto, repartido en hojas, con marcas de alineación y
regla de calibración.

No existe todavía nada fuera del dominio: ni capa de aplicación, ni
persistencia, ni PDF, ni interfaz.

```text
[✓] Imagen → contorno en pixels → geometría en mm
[✓] Geometría en mm → reparto en páginas → PrintLayout
[ ] PrintLayout → PDF
[ ] Imagen real → contorno en pixels
[ ] Contorno → plantilla con pliegues, pestañas y profundidad
[ ] Proyecto, persistencia, autenticación, interfaz
```

Verificación:

```bash
pnpm test        # 117 tests
pnpm exec tsc --noEmit
```

---

# 2. Lo que está hecho

## 2.1 Infraestructura del proyecto

* Next.js 15 (App Router) con `app/` en la raíz y el dominio en `src/modules/`.
* Vitest configurado en `vitest.config.mts`, entorno `node`, solo
  `src/**/*.test.ts`. El dominio se prueba sin React ni navegador.
* `pnpm` con overrides de seguridad para `postcss` y `sharp` en
  `pnpm-workspace.yaml`.
* `.gitignore` cubriendo artefactos de Next, pnpm, Supabase CLI y entorno.

## 2.2 `src/modules/geometry/`

Vocabulario físico común. No depende de nada externo al dominio.

| Archivo | Responsabilidad |
| --- | --- |
| `units.ts` | `Millimeters`, tolerancia de comparación (0,001 mm) |
| `errors.ts` | `InvalidGeometryError`, `InvalidDimensionsError`, `InvalidScaleError` |
| `dimensions.ts` | `Dimensions` validadas (positivas y finitas) |
| `point.ts` | `Point` (posición) y `Vector` (desplazamiento) |
| `bounding-box.ts` | Extensión espacial, derivación desde puntos |
| `scale.ts` | Escalado proporcional, `fitToDimensions`, detección de deformación |
| `polygon.ts` | Polígono con bandera `closed` explícita, traslación inmutable |
| `clip.ts` | Recorte contra rectángulo (Liang-Barsky) |
| `template-geometry.ts` | Contornos, huecos, líneas de corte y de doblado |

## 2.3 `src/modules/image-processing/`

Boundary donde los pixels se convierten en milímetros.

| Archivo | Responsabilidad |
| --- | --- |
| `pixel-contour.ts` | Tipos en espacio imagen, limpieza y validación del contorno |
| `simplification.ts` | Douglas-Peucker iterativo, tolerancia derivada de mm |
| `contour-to-geometry.ts` | Contorno en pixels → polígono en mm al tamaño pedido |
| `errors.ts` | `InvalidContourError` |

`convertContourToPhysicalGeometry` ya resuelve el escalado físico del PRD §11:
recibe las dimensiones que pide el usuario, ajusta de forma proporcional
contenida, deriva la escala del **contorno** y no del lienzo, y avisa mediante
`requiresDistortionForExactFit` cuando cumplir las dos medidas exigiría
deformar la figura.

## 2.4 `src/modules/printing/`

| Archivo | Responsabilidad |
| --- | --- |
| `paper-format.ts` | A4, A3, Letter, orientación |
| `margins.ts` | Márgenes y área imprimible |
| `tiling.ts` | Retícula de páginas, solape, etiquetas `A1`/`B3` |
| `page-geometry.ts` | Recorte a una hoja y paso a coordenadas locales |
| `alignment.ts` | Marcas de alineación entre hojas adyacentes |
| `calibration.ts` | Regla física de 100 mm en una esquina libre |
| `print-layout.ts` | `createPrintLayout`: compone `PrintLayout` y `PrintPage` |
| `errors.ts` | Errores de configuración de impresión |

Invariantes cubiertas por tests:

* Repartir en páginas no cambia el tamaño físico del molde.
* Las páginas se recortan, nunca se escalan ni se estiran.
* La geometría que cruza el borde del papel produce polilíneas abiertas, para
  no inventar líneas de corte por el canto de la hoja.
* Las marcas de alineación caen en la misma posición física global en las dos
  hojas que comparten un borde.
* La misma geometría con la misma configuración produce siempre el mismo
  documento.

---

# 3. Decisiones cerradas

No volver a abrirlas sin un motivo nuevo.

| Decisión | Motivo |
| --- | --- |
| `app/` en la raíz, dominio en `src/modules/` | Refleja el proyecto existente sin mover la ruta de Next |
| `printing/` es un módulo aparte de `geometry/` | Evita que el vocabulario geométrico dependa de conceptos de papel |
| `TemplateGeometry` vive en `geometry/` | Módulo estable del que depende impresión, no al revés |
| Todo el dominio en milímetros | Un único sistema de unidades elimina conversiones implícitas |
| Los pixels no salen de `image-processing/` | La conversión ocurre en un único punto |
| Vitest en entorno `node`, sin tests de UI | El valor está en las reglas físicas |
| Solo escala real (`PRINT_SCALE_ACTUAL_SIZE`) | MVP del PRD; el layout la declara en lugar de suponerla |
| La calibración puede faltar en una hoja | Preferible a imprimir una regla encima del molde |
| Las páginas vacías no se eliminan del reparto | Pueden contener material físico interior de la figura |

Detalle que confunde al leer geometría de páginas: el recorte **une los
fragmentos a través del punto de cierre** del polígono, así que el contorno de
una hoja puede empezar en mitad de un lado y no en el primer punto original.
Es correcto: el trazo es continuo.

---

# 4. Lo que falta

Orden recomendado. Las fases A y B son independientes entre sí; C depende de
una decisión de diseño todavía sin tomar.

## Fase A — Renderer de PDF

**Por qué primero:** cierra el bucle físico. En cuanto exista, se puede
imprimir un molde conocido de 800 × 1000 mm y comprobarlo con una regla real,
que es la única validación que de verdad importa (`printing.md` §75). Todo lo
construido hasta ahora queda verificado de golpe.

* Abstracción `PrintRenderer` en el dominio/aplicación; `jspdf` solo detrás de
  ella (`printing.md` §66, §67; `architecture.md` §29).
* Adaptador que traduce `PrintPage` a puntos PDF (1 pt = 1/72 in), sin pasar
  por pixels ni CSS.
* Dibujar: contornos, líneas de corte, líneas de doblado (trazo distinto),
  marcas de alineación con su etiqueta, regla de calibración, y pie con
  `id` y `pageNumber / totalPages`.
* Metadatos del documento y advertencia de "imprimir al 100 %, sin ajustar a
  página" (`printing.md` §71, §72).
* Tests: dimensiones de página en pt, correspondencia mm → pt, reproducibilidad.

Documentación: `pdf.md`, `printing.md` §66-§74.

## Fase B — Extracción de contorno desde la imagen

Hoy el pipeline empieza cuando ya existe un contorno en pixels. Falta llegar
hasta ahí.

* Validación de la imagen subida: MIME, extensión, tamaño, dimensiones
  mínimas y máximas, en cliente **y** servidor (PRD §8, `AGENTS.md` §46).
* Eliminación de fondo → máscara alfa. Decidir servicio o implementación
  local; es un adaptador de infraestructura, no dominio.
* Máscara alfa → contorno de pixels (trazado de bordes tipo marching squares).
  Esta parte sí es determinista y va en `image-processing/`.
* Casos de error del PRD §9: sin figura detectable, imagen transparente,
  figura demasiado compleja, servicio caído.

Documentación: `image-processing.md`.

## Fase C — Generación de plantilla

El hueco conceptual más grande. Hoy `TemplateGeometry` es un contenedor; nada
la construye a partir de una silueta.

**Antes de escribir código hay que resolver:** una silueta 2D más una
profundidad no es una piñata. Hay que decidir cómo se derivan las piezas
(frontal, trasera, laterales), dónde van los pliegues y cómo se generan las
pestañas de pegado. Leer `template.md` y `assembly.md` completos y fijar el
modelo antes de implementar.

* Piezas de la plantilla (PRD §13).
* Líneas de doblado y pestañas (PRD §12, `architecture.md` §20, §21).
* Validación de ensamblaje (`assembly.md`).
* Versionado e inmutabilidad de plantillas publicadas (`AGENTS.md` §17).

## Fase D — Capa de aplicación

`src/modules/*/application/` está vacío. Casos de uso que orquestan lo
anterior, sin lógica de negocio propia (`architecture.md` §6):

`CreateProject`, `UploadImage`, `ProcessImage`, `GenerateTemplate`,
`GeneratePdf`, `DownloadExport`.

## Fase E — Infraestructura

* Supabase: autenticación, base de datos, object storage (`storage.md`,
  `architecture.md` §34-§38).
* Repositorios detrás de interfaces del dominio: proyectos, plantillas,
  assets, exports.
* Separación entre asset original y asset procesado (`AGENTS.md` §19).
* Autorización en servidor: un usuario no accede a proyectos ajenos (AC-15).

## Fase F — Presentación

`app/page.tsx` es todavía la página de bienvenida inicial.

* Subida de imagen con arrastrar y soltar, previsualización y reemplazo.
* Formulario de configuración: ancho, alto, profundidad, papel, orientación,
  margen, solape.
* Vista previa de la plantilla y del reparto en páginas. La previsualización
  es orientativa: nunca es la fuente de verdad física (`printing.md` §78).
* Panel de proyectos, estados y manejo de errores (PRD §21, §22, §23).
* Hoja de instrucciones del documento (PRD §19).

---

# 5. Preguntas abiertas

1. ¿Cómo se derivan las piezas y los pliegues desde silueta + profundidad?
   Bloquea la fase C.
2. ¿La eliminación de fondo es un servicio externo o se hace en el servidor?
   Afecta a coste, latencia y modo de fallo.
3. ¿Las pestañas se generan automáticamente o las coloca el usuario?
4. ¿La hoja de instrucciones es una página más del PDF o un documento aparte?

---

# 6. Deuda conocida

* `pnpm lint` no está configurado: lanza el asistente interactivo de Next y
  falla. Hay que migrar a la CLI de ESLint.
* `CUSTOM_SCALE` no está implementado. Requiere escalar la geometría antes del
  reparto en páginas (`printing.md` §17, §19).
* El reparto en páginas no descarta hojas sin geometría. Optimizar el uso de
  papel es una decisión pendiente, no un olvido.
* Los márgenes de hardware de la impresora no se modelan (`printing.md` §12).

---

# 7. Criterios de aceptación del MVP

| AC | Criterio | Estado |
| --- | --- | --- |
| AC-01 | Crear un proyecto | Pendiente (D, E) |
| AC-02 | Subir una imagen válida | Pendiente (B, F) |
| AC-03 | Visualizar la imagen cargada | Pendiente (F) |
| AC-04 | Obtener una figura aislada | Pendiente (B) |
| AC-05 | Configurar medidas y papel | Dominio listo; falta interfaz (F) |
| AC-06 | Generar una plantilla | Parcial: falta la fase C |
| AC-07 | Conservar las dimensiones físicas | **Hecho y probado** |
| AC-08 | Dividir automáticamente en páginas | **Hecho y probado** |
| AC-09 | Identificadores de página | **Hecho y probado** |
| AC-10 | Marcas de alineación | **Hecho y probado** |
| AC-11 | Referencia de calibración | **Hecho y probado** |
| AC-12 | Generar PDF | Pendiente (A) |
| AC-13 | Descargar el PDF | Pendiente (E, F) |
| AC-14 | Reabrir el proyecto | Pendiente (E) |
| AC-15 | Aislamiento entre usuarios | Pendiente (E) |
