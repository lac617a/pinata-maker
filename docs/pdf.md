# Piñata Maker — PDF

**Version:** 1.0
**Status:** Draft
**Last Updated:** 2026-09-14

---

# 1. Purpose

Este documento define las reglas para convertir un `PrintLayout` en un documento PDF imprimible.

El PDF es un **output format**.

No debe contener lógica de:

* generación de geometría
* segmentación de imágenes
* extracción de contornos
* cálculo de escala
* cálculo de tiling
* cálculo de overlap
* decisión de cantidad de páginas

Estas responsabilidades pertenecen a otras capas.

---

# 2. Core Principle

El pipeline debe ser:

```text
TemplateGeometry
      ↓
Printing Domain
      ↓
PrintLayout
      ↓
PDF Renderer
      ↓
PDF
```

Nunca:

```text
TemplateGeometry
      ↓
PDF Renderer
      ↓
"resolver todo dentro del PDF"
```

El PDF Renderer representa un resultado previamente calculado.

---

# 3. PDF Boundary

El renderer recibe:

```text
PrintLayout
```

y produce:

```text
PdfDocument
```

Conceptualmente:

```typescript
interface PdfRenderer {
    render(layout: PrintLayout): Promise<PdfDocument>;
}
```

La implementación concreta puede utilizar cualquier librería compatible.

---

# 4. PDF Library Independence

El dominio no debe depender directamente de:

```text
pdf-lib
PDFKit
jsPDF
Puppeteer
React PDF
```

ni de ninguna librería específica.

La dependencia debe existir en infraestructura.

Ejemplo:

```text
Domain
   ↓
PdfRenderer interface
   ↓
Infrastructure
   ↓
Concrete PDF library
```

---

# 5. Recommended Architecture

```text
src/
├── domain/
│   ├── geometry/
│   └── printing/
│
├── application/
│   └── generate-pdf/
│
└── infrastructure/
    └── pdf/
        ├── PdfRenderer
        └── PdfLibraryAdapter
```

Los nombres reales pueden adaptarse a la arquitectura definida en `architecture.md`.

---

# 6. PDF Units

El dominio utiliza:

```text
millimeters
```

El formato PDF utiliza sus propias unidades internas.

Por lo tanto debe existir una conversión explícita:

```text
mm
 ↓
PDF units
```

No mezclar unidades.

---

# 7. PDF Point Conversion

PDF tradicionalmente utiliza:

```text
1 point = 1/72 inch
```

Por lo tanto:

```text
1 inch = 25.4 mm
```

Conversión:

```text
points = millimeters × 72 / 25.4
```

Ejemplo:

```text
210 mm ≈ 595.2756 pt
```

---

# 8. Conversion Boundary

La conversión:

```text
mm → PDF units
```

debe realizarse únicamente en el renderer o en un adaptador especializado.

No introducir valores PDF dentro del dominio.

Incorrecto:

```typescript
const width = 595.28;
```

dentro de `PrintingDomain`.

Correcto:

```text
Printing Domain
210 mm
    ↓
PDF Adapter
595.28 pt
```

---

# 9. Precision

Las conversiones deben conservar suficiente precisión para impresión física.

Evitar:

```text
Math.round()
```

innecesariamente durante las transformaciones geométricas.

El redondeo debe realizarse únicamente cuando sea requerido por el formato o renderer.

---

# 10. Page Size

El tamaño de cada página PDF debe corresponder exactamente al tamaño configurado en `PrintLayout`.

Ejemplo:

```text
A4 Portrait

210 × 297 mm
```

debe convertirse a aproximadamente:

```text
595.2756 × 841.8898 pt
```

---

# 11. Page Size Source of Truth

El renderer no debe recalcular el tamaño del papel.

Debe consumir:

```text
PrintPage.paper
```

o el equivalente definido por el modelo.

La fuente de verdad continúa siendo:

```text
Printing Domain
```

---

# 12. Page Orientation

Si:

```text
orientation = PORTRAIT
```

el PDF debe utilizar:

```text
width < height
```

Si:

```text
orientation = LANDSCAPE
```

debe utilizar:

```text
width > height
```

No rotar arbitrariamente el contenido para compensar una configuración incorrecta.

---

# 13. Page Count

El renderer debe generar exactamente:

```text
PrintLayout.pages.length
```

páginas.

No crear páginas adicionales automáticamente.

No eliminar páginas vacías sin una regla explícita del dominio.

---

# 14. Page Ordering

El orden del PDF debe coincidir exactamente con:

```text
PrintLayout.pages
```

Si el layout define:

```text
1
2
3
4
```

el PDF debe contener:

```text
page 1
page 2
page 3
page 4
```

en ese orden.

---

# 15. No Reordering

El renderer no debe ordenar páginas por:

```text
filename
id
timestamp
position
```

si el `PrintLayout` ya proporciona el orden.

---

# 16. Coordinate System

El dominio puede utilizar:

```text
origin = top-left
Y → down
```

Mientras que un renderer PDF puede utilizar:

```text
origin = bottom-left
Y → up
```

La transformación debe estar aislada en el adapter.

---

# 17. Coordinate Transformation

Conceptualmente:

```text
Domain Coordinates
        ↓
Coordinate Adapter
        ↓
PDF Coordinates
```

No modificar las coordenadas del `PrintLayout`.

---

# 18. Y Axis Transformation

Si el renderer utiliza un sistema con Y invertido:

```text
pdfY = pageHeight - domainY
```

La transformación depende de la API concreta del renderer.

La regla importante es:

> **El dominio no debe conocer el sistema de coordenadas interno de la librería PDF.**

---

# 19. Geometry Rendering

El renderer debe representar:

```text
cut lines
fold lines
tabs
alignment marks
calibration marks
page metadata
```

según lo definido por `PrintLayout`.

No debe generar geometría adicional que cambie la plantilla.

---

# 20. Vector First

La geometría debe representarse como:

```text
vector paths
lines
curves
```

cuando sea posible.

Evitar rasterizar la plantilla.

---

# 21. Why Vector

El formato vectorial permite:

* conservar precisión
* evitar pérdida de resolución
* mantener líneas nítidas
* reducir dependencia de DPI
* facilitar impresión a escala

---

# 22. Raster Images

Las imágenes raster pueden utilizarse cuando sean necesarias para:

```text
preview
reference image
optional artwork
```

pero la geometría de corte debe permanecer vectorial.

---

# 23. Image DPI

Si se incluye una imagen raster:

```text
DPI
```

puede afectar su tamaño físico.

Esto no debe afectar:

```text
template geometry
cut lines
fold lines
```

---

# 24. Embedded Reference Image

Si el producto permite incluir la imagen original:

```text
Original Image
```

debe tratarse como un elemento visual independiente.

No utilizarla como fuente de verdad de la geometría después de haber generado `TemplateGeometry`.

---

# 25. Line Semantics

El PDF debe conservar la distinción conceptual entre:

```text
CUT
FOLD
ALIGNMENT
CALIBRATION
GUIDE
```

El estilo visual es una decisión del renderer.

La semántica pertenece al layout.

---

# 26. Cut Lines

Las líneas de corte deben renderizarse como paths vectoriales.

Ejemplo conceptual:

```text
CutLine
    ↓
Vector Path
    ↓
PDF
```

No convertirlas en una imagen.

---

# 27. Fold Lines

Las líneas de doblez pueden utilizar un estilo diferente:

```text
dashed
```

o equivalente.

El patrón visual debe estar centralizado.

No dispersar valores de estilo por el código.

---

# 28. Line Styles

Conceptualmente:

```typescript
type PdfLineStyle = {
    width: number;
    dash?: number[];
};
```

La implementación concreta puede variar.

---

# 29. Physical Line Width

Los anchos de línea deben definirse en unidades físicas o PDF equivalentes.

No utilizar:

```text
CSS px
```

como unidad física.

---

# 30. Line Width Conversion

Si el dominio define:

```text
0.3 mm
```

el renderer debe convertirlo:

```text
mm
 ↓
pt
```

No asumir que:

```text
0.3
```

significa lo mismo en CSS, SVG y PDF.

---

# 31. Calibration Mark

El PDF debe representar exactamente la marca de calibración definida por `PrintLayout`.

Ejemplo:

```text
100 mm
```

debe renderizarse como:

```text
100 mm
```

a escala:

```text
100%
```

---

# 32. Calibration Label

El texto puede indicar:

```text
100 mm
```

pero el texto no constituye la calibración.

La línea física es la referencia.

---

# 33. Alignment Marks

Las marcas de alineación deben renderizarse en las posiciones proporcionadas por el layout.

No recalcularlas en el renderer.

---

# 34. Page Labels

Si `PrintLayout` proporciona:

```text
Page 1 of 12
```

el renderer debe representarlo.

La numeración no debe generarse de forma independiente.

---

# 35. Metadata

El PDF puede incluir metadata como:

```text
Title
Author
Subject
Creator
Producer
CreationDate
```

No incluir información sensible.

---

# 36. Recommended Metadata

Ejemplo:

```text
Title:
Piñata Maker Template

Creator:
Piñata Maker

Subject:
Printable Piñata Template
```

Los valores finales pueden cambiar.

---

# 37. PDF Version

La versión PDF utilizada debe ser compatible con:

* navegadores modernos
* lectores PDF comunes
* impresoras habituales

No utilizar una versión avanzada sin una necesidad concreta.

---

# 38. Fonts

Si el PDF incluye texto:

```text
page labels
calibration labels
instructions
```

debe utilizar una fuente controlada.

Evitar depender de fuentes instaladas en el equipo del usuario.

---

# 39. Font Embedding

Cuando sea necesario para garantizar consistencia:

```text
font embedding
```

debe utilizarse.

Esto evita que el PDF cambie de apariencia dependiendo del sistema.

---

# 40. Text Rendering

El texto no debe ser utilizado para representar geometría crítica.

Por ejemplo:

```text
"100 mm"
```

es información auxiliar.

La geometría física está representada por:

```text
vector line
```

---

# 41. Unicode

Si el PDF contiene texto en español:

```text
á
é
í
ó
ú
ñ
```

la fuente debe soportar correctamente estos caracteres.

---

# 42. PDF Generation Errors

Clasificar errores como:

```text
PDF_RENDER_FAILED
PDF_INVALID_PAGE
PDF_INVALID_DIMENSIONS
PDF_UNSUPPORTED_GEOMETRY
PDF_FONT_ERROR
PDF_SERIALIZATION_ERROR
```

No devolver únicamente:

```text
PDF_ERROR
```

si la capa superior necesita distinguir las causas.

---

# 43. Renderer Errors

Un error de la librería PDF debe convertirse a un error de infraestructura.

Ejemplo:

```text
pdf-lib error
      ↓
PdfRendererError
      ↓
Application
```

No propagar tipos internos de la librería al dominio.

---

# 44. No Silent Recovery

Si el renderer no puede representar una geometría:

```text
unsupported geometry
```

no debe:

```text
remove it
simplify it
scale it
move it
```

silenciosamente.

Debe fallar explícitamente o utilizar una estrategia previamente definida.

---

# 45. Output Validation

Después de generar el PDF:

```text
PDF
 ↓
Validation
```

Debe verificarse al menos:

```text
page count
page dimensions
file readability
```

---

# 46. Physical Dimension Validation

Cuando sea posible, verificar:

```text
PDF page size
≈
PrintLayout page size
```

con la tolerancia definida.

---

# 47. Page Count Validation

Debe cumplirse:

```text
pdf.pageCount === printLayout.pages.length
```

---

# 48. Page Dimension Validation

Para cada página:

```text
pdfPage.width ≈ expectedWidth
pdfPage.height ≈ expectedHeight
```

---

# 49. Geometry Integrity

El PDF no debe alterar:

```text
global geometry
scale
position
topology
```

durante el rendering.

---

# 50. PDF Renderer Invariant

Debe cumplirse:

```text
Render(PrintLayout)
```

produce una representación equivalente de:

```text
PrintLayout
```

No una nueva interpretación.

---

# 51. No Layout Logic

El renderer no debe contener:

```text
calculateTiles()
calculateOverlap()
calculateScale()
calculatePageCount()
```

Estas operaciones pertenecen a `Printing`.

---

# 52. No Geometry Logic

El renderer no debe contener:

```text
simplifyContour()
repairPolygon()
detectShape()
removeBackground()
```

Estas operaciones pertenecen a:

```text
Image Processing
Geometry
```

---

# 53. No Business Logic

El renderer no debe decidir:

```text
which template
which shape
which size
which material
```

Debe renderizar lo que recibe.

---

# 54. PDF Generation Flow

Flujo completo:

```text
User Configuration
       ↓
Application
       ↓
Printing Domain
       ↓
PrintLayout
       ↓
PdfRenderer
       ↓
PDF
       ↓
PDF Validation
       ↓
Download / Storage
```

---

# 55. PDF Generation Is a Pure Output Step

Idealmente:

```text
same PrintLayout
+
same renderer version
=
same PDF structure
```

La generación no debe depender de:

```text
browser viewport
screen size
CSS
device pixel ratio
```

---

# 56. Browser Independence

El PDF final debe ser independiente de:

```text
Chrome window size
monitor resolution
devicePixelRatio
CSS zoom
browser zoom
```

---

# 57. Server vs Client

La generación de PDF debe ubicarse donde la arquitectura del proyecto determine.

Para operaciones pesadas o generación consistente:

```text
server-side
```

puede ser preferible.

Pero:

> La decisión de ejecución no debe cambiar el contrato de `PrintLayout`.

---

# 58. Streaming

Si el documento puede ser grande, el renderer puede soportar:

```text
streaming output
```

cuando la librería lo permita.

No implementar streaming prematuramente si el tamaño real de los documentos no lo requiere.

---

# 59. Memory Constraints

Evitar mantener innecesariamente múltiples copias completas del PDF en memoria.

Especialmente para:

```text
large page counts
large embedded images
```

---

# 60. File Naming

El nombre del archivo debe ser determinista y legible.

Ejemplo:

```text
pinata-template.pdf
```

No utilizar:

```text
random-uuid.pdf
```

como único nombre visible al usuario.

---

# 61. Filename Safety

El nombre debe evitar:

```text
path traversal
invalid filesystem characters
unexpected extensions
```

Nunca construir una ruta directamente desde input no validado.

---

# 62. PDF Download

La capa de aplicación decide cómo entregar:

```text
PDF
```

Por ejemplo:

```text
browser download
storage
temporary URL
```

El renderer solamente genera el documento.

---

# 63. Storage Independence

PDF generation no debe depender de:

```text
Supabase Storage
S3
Cloudflare R2
local filesystem
```

El almacenamiento pertenece a infraestructura.

---

# 64. Testing

El renderer debe probarse en diferentes niveles.

### Unit tests

Validar:

```text
mm → pt
coordinates
page dimensions
line styles
```

### Integration tests

Validar:

```text
PrintLayout → PDF
```

### Output tests

Validar:

```text
page count
page dimensions
metadata
```

---

# 65. Conversion Tests

Ejemplo:

```text
25.4 mm = 72 pt
```

Debe existir un test para esta conversión.

---

# 66. A4 Tests

Validar:

```text
A4 = 210 × 297 mm
```

y su representación PDF.

---

# 67. Landscape Tests

Validar:

```text
A4 Portrait
210 × 297 mm

A4 Landscape
297 × 210 mm
```

---

# 68. Calibration Tests

Para una marca:

```text
100 mm
```

validar que el PDF represente:

```text
100 mm
```

sin aplicar escalado adicional.

---

# 69. Page Count Tests

Para:

```text
PrintLayout.pages.length = 12
```

esperar:

```text
PDF pages = 12
```

---

# 70. Geometry Regression Tests

Para casos conocidos:

```text
PrintLayout
→ PDF
```

validar que las dimensiones y posiciones críticas no cambien.

---

# 71. PDF Snapshot Tests

No depender exclusivamente de snapshots binarios completos del PDF.

Los PDFs pueden contener metadata variable.

Preferir validar propiedades estructurales:

```text
page count
page size
paths
coordinates
```

---

# 72. PDF Metadata and Determinism

Si se requiere generación byte-for-byte determinista:

```text
creation date
document IDs
object ordering
```

deben controlarse.

No exigir byte equality si la librería genera metadata dinámica innecesaria.

---

# 73. Security

El renderer debe tratar toda geometría y metadata como datos no confiables.

Validar:

```text
finite coordinates
valid dimensions
valid text
valid filenames
```

antes de entregarlos a la librería PDF.

---

# 74. Resource Limits

Debe existir protección contra:

```text
extreme page count
extreme path count
huge embedded images
invalid coordinates
```

No permitir que un input provoque consumo ilimitado de recursos.

---

# 75. Unsupported Features

Si una característica no está soportada:

```text
unsupported
```

debe producir un error explícito.

No intentar aproximarla silenciosamente si puede alterar la plantilla.

---

# 76. Architecture Summary

```text
┌───────────────────────────────┐
│       Geometry Domain         │
│                               │
│        TemplateGeometry       │
└───────────────┬───────────────┘
                ↓
┌───────────────────────────────┐
│       Printing Domain         │
│                               │
│        PrintLayout            │
└───────────────┬───────────────┘
                ↓
┌───────────────────────────────┐
│        PDF Renderer           │
│                               │
│      mm → PDF units           │
│      coordinate mapping       │
│      vector rendering         │
└───────────────┬───────────────┘
                ↓
┌───────────────────────────────┐
│             PDF               │
└───────────────────────────────┘
```

---

# 77. Critical Rules

Estas reglas son obligatorias:

```text
1. PDF is an output format, not a domain.

2. PDF must consume PrintLayout.

3. PDF must not calculate template geometry.

4. PDF must not calculate tiling.

5. PDF must not calculate scale.

6. PDF must not decide page count.

7. PDF must not modify geometry.

8. Domain units are millimeters.

9. PDF conversion happens at the renderer boundary.

10. Vector geometry is preferred.

11. Cut lines must remain vector geometry.

12. Fold lines must remain distinguishable.

13. Calibration marks must preserve physical dimensions.

14. Page dimensions must match PrintLayout.

15. Page order must match PrintLayout.

16. PDF libraries must remain infrastructure dependencies.

17. Browser zoom must not affect PDF dimensions.

18. Screen pixels must not determine PDF dimensions.

19. PDF rendering errors must not silently alter geometry.

20. Generated PDFs must be validated before delivery.
```

---

# 78. Acceptance Criteria

PDF se considera correcto cuando:

```text
[ ] PrintLayout can be converted into a PDF.

[ ] PDF page count matches PrintLayout.

[ ] PDF page dimensions match PrintLayout.

[ ] A4 dimensions are correct.

[ ] A3 dimensions are correct.

[ ] Letter dimensions are correct.

[ ] Portrait works.

[ ] Landscape works.

[ ] Millimeters are converted correctly.

[ ] Coordinates are transformed correctly.

[ ] Vector paths are used for template geometry.

[ ] Cut lines are preserved.

[ ] Fold lines are preserved.

[ ] Alignment marks are preserved.

[ ] Calibration marks preserve physical dimensions.

[ ] PDF generation does not modify geometry.

[ ] PDF renderer does not perform tiling.

[ ] PDF renderer does not perform automatic scaling.

[ ] PDF renderer is isolated from the domain.

[ ] PDF generation does not depend on browser viewport.

[ ] PDF output is validated.

[ ] Renderer errors are structured.

[ ] PDF library can be replaced without changing the domain.
```

---

# 79. Final Principle

El PDF Renderer debe ser **tonto a propósito**.

Debe recibir:

```text
PrintLayout
```

y hacer:

```text
represent
```

no:

```text
decide
```

El flujo correcto es:

```text
Image
  ↓
Image Processing
  ↓
Geometry
  ↓
Printing
  ↓
PrintLayout
  ↓
PDF Renderer
  ↓
PDF
```

Cada capa tiene una responsabilidad.

La regla fundamental:

> **The PDF represents the layout. It never defines the layout.**

---

# 80. Implementación de referencia

Las secciones anteriores definen las reglas. Esta parte registra cómo se
resolvieron en la fase A y por qué, para que las decisiones no queden
implícitas en el código (`AGENTS.md` §36).

```text
src/modules/pdf-generation/
├── errors.ts            Errores del boundary de salida
├── pdf-units.ts         mm → pt, única conversión del sistema
├── pdf-style.ts         Grosores, discontinuos, tamaños de texto y fuente
├── page-drawing.ts      PrintPage → plano de dibujo en mm
├── print-renderer.ts    PrintRenderer, PrintableDocument, límites
└── infrastructure/
    └── jspdf-print-renderer.ts   Único archivo que importa jspdf
```

---

# 81. Ubicación del renderer

`jspdf` se importa exclusivamente en `infrastructure/`. El resto del módulo no
conoce la librería y podría alimentar otro adaptador —SVG para previsualizar,
otra librería de PDF— sin cambiar nada (`printing.md` §67, §68).

La separación es visible en el árbol de directorios en lugar de depender de
una convención de nombres, por la misma razón por la que `app/` vive en la
raíz (`architecture.md` §4).

---

# 82. Origen del área imprimible

La geometría de un `PrintPage` está en coordenadas locales al área imprimible.
Situarla sobre el papel exige conocer dónde empieza esa área.

Deducirlo de la diferencia entre papel y área imprimible sería ambiguo: unos
márgenes de 5 y 15 mm producen la misma diferencia que unos de 10 y 10.

Por eso `PrintPage` expone `printableOrigin`, calculado por el dominio de
impresión a partir de los márgenes configurados. El renderer lo aplica, no lo
infiere (`printing.md` §65).

---

# 83. Plano de dibujo intermedio

`describePage` traduce un `PrintPage` a un `PageDrawing`: la lista de trazos y
textos que componen la hoja, todavía en milímetros y ya en coordenadas del
papel.

Existe por dos motivos:

```text
la traducción se prueba sin generar un PDF
el adaptador solo dibuja lo que recibe
```

El plano conserva la semántica de cada trazo (`CONTOUR`, `HOLE`, `CUT`,
`FOLD`, `ALIGNMENT`, `CALIBRATION`) y deja el estilo a `pdf-style.ts`, según
§25.

Lo único que el plano añade a lo que el layout ya decidió son las **formas**
con las que se representa una marca: la cruz de una marca de alineación, los
topes de la regla. Las posiciones vienen dadas y no se recalculan (§33).

---

# 84. Sistema de coordenadas de jsPDF

jsPDF expone un espacio de usuario con origen arriba-izquierda y Y hacia
abajo, la misma convención que el dominio, y aplica internamente la inversión
del eje que exige el formato PDF.

Por eso el adaptador actual **no** invierte la Y. Eso es una propiedad de esta
librería, no del formato: otro adaptador puede necesitar la transformación de
§18, y el dominio sigue sin conocer ninguna de las dos.

---

# 85. Precisión del tamaño de página

jsPDF escribe el `MediaBox` con dos decimales. Una hoja A4 queda registrada
como:

```text
595.28 × 841.89 pt
```

frente a los `595.2756 × 841.8898 pt` exactos. La diferencia es de 0,0007 mm,
por debajo de la tolerancia geométrica del dominio (0,001 mm) y varios órdenes
de magnitud por debajo de lo que una impresora puede resolver.

La conversión interna no redondea (§9). El redondeo pertenece al serializador.

El renderer comprueba el tamaño de cada hoja generada antes de entregar el
documento, con una tolerancia de 0,01 pt (§45, §46, §48).

---

# 86. Reproducibilidad

El mismo `PrintLayout` con la misma `creationDate` produce documentos
idénticos byte a byte **salvo la entrada `/ID`**, que jsPDF genera al azar.

Por eso la fecha de creación es un parámetro del renderer y no un
`new Date()` interno, y por eso el test de reproducibilidad compara el
documento ignorando `/ID`, en lugar de exigir igualdad binaria completa
(§72).

---

# 87. Decisiones de presentación

| Decisión | Motivo |
| --- | --- |
| Documento monocromo | El color no distingue nada que el trazo no distinga ya, y una impresora en blanco y negro lo convertiría en grises indistinguibles |
| Pliegues discontinuos, corte continuo | Confundir doblar con cortar destruye la pieza (§27) |
| Helvetica sin incrustar | Es una de las catorce fuentes estándar: está garantizada en cualquier lector y cubre los acentos y la eñe (§38, §39, §41) |
| Pie de página dentro del área imprimible | Los márgenes de hardware de la impresora no se modelan; un pie en el margen puede recortarse, y perder la etiqueta de una hoja rompe el montaje |
| La advertencia de escala se imprime en cada hoja | El documento no puede impedir que el visor o el driver reescalen (`printing.md` §71, §72) |
| Sin compresión | La plantilla es geometría vectorial ligera; comprimir no cambia el tamaño de forma apreciable |

El pie de página puede solaparse con la plantilla en una hoja muy ocupada. Es
un compromiso consciente, no un olvido: a diferencia de la regla de
calibración, la identidad de la hoja no puede omitirse.

---

# 88. Fuera del alcance de la fase A

No implementado todavía, por decisión explícita:

```text
hoja de instrucciones del documento
escalas distintas del tamaño real
streaming (§58)
```

El renderer rechaza con un error explícito un layout que declare una escala
distinta de la real, en lugar de imprimirlo al 100 % en silencio (§44, §75).

---

# 89. Un documento, no uno por pieza

Una piñata son muchas piezas, y el renderer recibe **un documento** con una
sección por pieza:

```text
PrintDocument
├── cover        hoja de instrucciones (opcional)
└── sections[]   { label, layout } por pieza
```

El usuario descarga un archivo (PRD §18, AC-13). Entregar un PDF por pieza
obligaría a manejar dieciocho descargas para una figura de un metro.

Además sale más pequeño: dieciocho documentos de la misma plantilla ocupaban
539 KB; uno solo, 169 KB, porque las fuentes y los recursos se comparten.

El contrato de §13 sigue vigente por sección: el renderer genera exactamente
las páginas que declara cada layout, en su orden, sin añadir ni quitar.

---

# 90. Identidad de la hoja

El identificador de retícula —`A1`, `B3`— solo es único dentro de una pieza.
En un documento con dieciocho piezas hay dieciocho hojas llamadas `A1`.

Por eso el pie de página lleva la sección delante:

```text
SIDE-3 · A1 (1 / 2)
```

La numeración sigue siendo **local a la pieza** y no global al documento. Al
montar, el usuario trabaja pieza a pieza: saber que una hoja es la primera de
dos de `SIDE-3` sirve; saber que es la hoja 31 de 48, no.

El inventario de la hoja de instrucciones da la visión de conjunto.

---

# 91. Hoja de instrucciones

Es la primera página del documento y contiene lo que exige PRD §19: nombre,
dimensiones, papel, escala e instrucciones de impresión. Añade el inventario
de piezas con el número de hojas de cada una.

```text
Elefante

Figura: 714.7 × 1000 × 200 mm
Papel: A4 vertical
Escala: 100 %
Piezas: 17 en 47 hojas

Antes de imprimir
Imprimir al 100 % - no ajustar a página
Comprueba con una regla que la marca de 100 mm mide 100 mm.
...
```

Resuelve la pregunta que el roadmap dejaba abierta —si las instrucciones son
una página más o un documento aparte— en el sentido que ya indicaba PRD §19:
una página más. Separarla significaría que el usuario puede imprimir la
plantilla sin haber leído la advertencia de escala.

No lleva geometría. Nada de lo que hay en ella se recorta, así que no
compromete §49.

Usa el papel de la primera sección. Mezclar formatos dentro de un documento
obligaría a cambiar la bandeja a mitad de impresión.

---

# 92. Caracteres del castellano

Comprobado sobre el documento generado: la fuente se declara con
`/Encoding /WinAnsiEncoding`, «á» se codifica como `0xE1` y la raya de la
lista de piezas como `0x97`. Ambos son sus valores correctos en esa
codificación, así que se imprimen sin incrustar fuente (§38, §41).

---

# 93. La figura dentro de la pieza

El documento dibuja la imagen de origen dentro del frente y de la espalda, a
color. Es el elemento visual independiente de §24: nunca geometría, nunca
fuente de verdad del molde.

## Debajo de los trazos, recortada dos veces

En cada hoja la imagen se coloca entera y se recorta por dos caminos que se
intersecan:

```text
área imprimible   la imagen no invade los márgenes
silueta           la imagen no sale de la pieza
```

Después se dibujan los trazos encima. La línea de corte se ve entera aunque
la figura llegue hasta el borde.

La traslación global → papel es la misma que ya sufre la geometría de la hoja
(`printing/page-geometry.ts`): restar el origen de la región que cubre y
sumar el del área imprimible. Nada se escala, así que al juntar las hojas la
figura se recompone sin saltos.

## Una sola copia de la imagen

La figura aparece en docenas de hojas. Se incrusta una vez con un alias y
cada hoja la referencia: sin eso el documento pesaría la imagen multiplicada
por el número de hojas. Hay un techo de 15 MB por imagen (§74).

## La espalda, volteada

`BACK` es el reflejo de `FRONT`, así que su imagen también. jsPDF **no**
refleja con un ancho negativo —lo corrompe en silencio—; se hace con una
matriz `-1 0 0 1 2·eje 0` sobre el eje vertical de la propia imagen, dentro
del estado gráfico recortado.

Dónde va la imagen en cada cara lo decide `referenceImageOnFace`, del
dominio. La vista previa usa la misma función, así que lo que se ve antes de
descargar es lo que se imprime.

## De dónde salen los bytes

El documento se genera en el servidor desde la versión guardada. La plantilla
lleva dónde va la imagen (`referenceImage`, `image-processing.md` §109) y la
versión de qué imagen salió (`sourceAssetId`). El caso de uso lee el archivo
del bucket con la sesión del usuario.

Si el usuario borró la imagen, el documento sale con los contornos: el molde
sigue siendo válido. Si la imagen existe pero no se puede leer, falla: un PDF
distinto del pedido, entregado sin avisar, es peor que un reintento.

`PDF_GENERATOR_VERSION` pasa a `1.1`: un documento dice con qué dibujo se
hizo.

---

# 94. El documento del póster

Sale de `generatePosterDocument` (`PRD.md` §44). Reutiliza todo el reparto en
hojas de las plantillas; lo que cambia es qué se dibuja.

## Las hojas

Cada hoja lleva su trozo de la imagen (§93), su etiqueta, el aviso de
imprimir al 100 % y las marcas de alineación. **No** lleva:

* el contorno: el póster es un rectángulo y el borde lo marca la imagen;
* la regla de calibración: la imagen cubre toda la hoja y la regla caería
  encima de la figura.

Lo decide `PrintSection.kind`: `PIECE` para las piezas de una plantilla,
`POSTER` para esto.

## La hoja de resumen

```text
título, tamaño en cm, papel, hojas de ancho × alto
imprime al 100 %
instrucciones de montaje
mapa: la imagen con la retícula de hojas y sus etiquetas
regla de 10 cm
```

El mapa usa las mismas regiones de hoja que el reparto, escaladas: la
etiqueta que se lee en el mapa es la que lleva el pie de la hoja. Las regiones
se solapan como se solapan las hojas, y por eso las líneas del mapa salen
dobles en las juntas.

La regla va aquí porque es la única hoja donde no tapa la figura, y basta con
una: todas las hojas salen del mismo documento con la misma escala.

## Solape frente a Block Posters

Block Posters no solapa: cada hoja lleva su trozo con un borde blanco que se
recorta. Aquí cada hoja repite una franja de la vecina (10 mm por defecto)
con marcas de alineación encima, que es más fácil de pegar a ojo. La
contrapartida es que un ancho dado puede necesitar una columna más; la
interfaz propone las medidas que llenan hojas enteras. Since 2026-09-21 the
Block Posters way is an option too: §99.

---

# 95. Recortar la imagen del póster

El usuario puede quedarse con una parte de la imagen antes de ampliarla
(`PRD.md` §44). El recorte es un rectángulo en pixels de la imagen original
(`ImageCrop`, en `modules/posters/crop.ts`).

## El recorte manda sobre la proporción

El póster toma la proporción del recorte, no la de la imagen entera: se
elige un lado en centímetros y el otro sale del recorte. Sin recorte, es la
imagen entera y nada cambia.

## El archivo no se toca

El PDF incrusta la imagen entera, una sola vez, y la dibuja desplazada y más
grande para que el recorte llene exactamente el rectángulo del póster:

```text
escala      = ancho del póster / ancho del recorte   (mm por pixel)
colocación  = (−x · escala, −y · escala,
               ancho de la imagen · escala, alto de la imagen · escala)
```

Lo que queda fuera cae fuera del póster y lo tapa el mismo recorte por el
borde del póster que ya usan las hojas (§93). El mapa de la hoja de resumen
usa la misma colocación, así que enseña lo mismo que las hojas.

No se recortan los bytes en el servidor: haría falta decodificar y volver a
codificar la imagen —otra dependencia y otra pérdida de calidad en JPEG—
para ahorrar unos kilobytes de un documento que ya lleva la imagen una sola
vez.

## Quién comprueba qué

El navegador dibuja el recuadro (`react-image-crop`) y convierte su
porcentaje a pixels enteros. El servidor vuelve a comprobarlo contra el
tamaño leído de la cabecera del archivo (`image-processing.md` §110): un
recorte que se sale de la imagen, o de menos de `CROP_MIN_SIDE` pixels de
lado, responde `INVALID_IMAGE_CROP` (400).

## Lo que no se guarda

La fila del documento guarda el tamaño impreso, no el recorte. No hace falta
para descargarlo —el PDF se guarda entero (`storage.md` §162)—, pero sin él
no se puede regenerar el mismo documento. Si algún día hace falta, son
cuatro columnas nuevas en `exports`.


---

# 96. Avisar de la resolución antes de imprimir

Ampliar no inventa detalle. Una imagen de 720 pixels a 60 cm de ancho queda
en unos 30 pixels por pulgada: cada pixel mide casi un milímetro en el papel.
El usuario tiene que saberlo antes de imprimir nueve hojas, no después.

## Los umbrales

Salen de a qué distancia se mira una piñata, de uno a dos metros. El ojo
distingue alrededor de un minuto de arco:

```text
a 1 m    ≈ 0,29 mm    ≈ 90 pixels por pulgada
a 2 m    ≈ 0,58 mm    ≈ 45 pixels por pulgada
```

```text
SHARP        ≥ 90     nítida también de cerca
SOFT         45–90    nítida a un par de metros, suave de cerca
PIXELATED    < 45     los pixels se ven también de lejos
```

Se cuenta sobre el recorte (§95), no sobre la imagen entera: recortar y
ampliar la misma medida reparte menos pixels.

## Se avisa, no se impide

Una piñata grande algo borrosa puede ser justo lo que se quiere. La interfaz
dice cómo se va a ver y propone el ancho más grande que alcanza el siguiente
nivel, redondeado **hacia abajo a hojas enteras**: proponer la medida exacta
dejaría casi siempre una columna medio vacía, y el aviso de columna (§94)
propondría otra medida distinta.

El cálculo vive en `modules/posters/resolution.ts`; el servidor no lo usa.

---

# 97. Fotos giradas por la cámara

Un móvil en vertical guarda la foto apaisada y le añade una orientación
EXIF: «gírame un cuarto a la derecha». El navegador la aplica al enseñarla;
un PDF que incrusta los bytes, no. Sin hacer nada, la vista previa sale
derecha y las hojas impresas, tumbadas.

## Se gira al dibujar, no al subir

El archivo se guarda tal cual. `EmbeddedImage.orientation` dice cómo está
y el renderer dibuja los bytes en el origen con una matriz que los lleva a
su sitio (`image-orientation.ts`): un cuarto de vuelta, media o un espejo,
las ocho orientaciones de EXIF.

Girar al subir obligaría a decodificar y recodificar el JPEG: otra
dependencia nativa en el servidor, otra pérdida de calidad, y el original
dejaría de ser el original (`AGENTS.md` §19).

## Todo se mide sobre la imagen girada

El recorte y la proporción del póster usan el tamaño girado
(`orientedSize`): es el que ve el usuario y el que da el navegador como
`naturalWidth`. Las medidas de dibujo —colocación, recorte— también son de
la imagen girada; solo el renderer sabe que los bytes están tumbados.

## El eje y del PDF

`setCurrentTransformationMatrix` de jsPDF escribe la matriz tal cual en el
PDF, cuyo eje y crece hacia arriba, mientras el dibujo trabaja con y hacia
abajo. Con `F(x, y) = (x, H − y)`, la matriz que se escribe es `F · T · F`.
El espejo de la espalda (§93) no lo necesitaba porque solo toca x; un giro
sin esta conversión sale al revés.

## Cómo se comprobó

Con una foto real generada con la orientación 6: el mapa y las cuatro hojas
salen derechos, entera y recortada, y el navegador la enseña igual en el
recuadro de recorte y en la vista previa.


---

# 98. El peso del documento

La imagen va una sola vez en el documento (§93), pero el formato decide
cuánto ocupa:

```text
JPEG   entra tal cual: ya viene comprimido
PNG    jsPDF lo vuelve a escribir; sin compresión, en pixels en crudo
WEBP   jsPDF lo convierte a JPEG de calidad 100
```

Sin compresión, un PNG de 720 × 894 que pesa 21 kB daba un PDF de 1,9 MB, y
una ilustración de 3000 × 4000 que pesa 0,3 MB, uno de 36 MB. El renderer
pide `FAST`:

```text
PNG plano 3000 × 4000       36 MB  →  0,08 MB     (SLOW: 0,07 MB)
PNG con transparencia       36 MB  →  0,08 MB
PNG de foto con ruido       36 MB  →  26,8 MB     (SLOW: 26,8 MB)
```

`FAST` da casi lo mismo que `SLOW` en menos tiempo. Una foto con ruido
guardada como PNG sigue pesando: es lo que ocupa en PNG, y sin pérdida no hay
más que sacar. La misma foto en JPEG entra ya comprimida.

La transparencia se conserva: el fondo sale del color del papel, no negro.

La prueba `should compress a PNG instead of embedding its raw pixels` falla
si vuelve el crudo.

---

# 99. Joining the sheets: overlap or trim

Since 2026-09-21 the person chooses how the sheets go together
(`modules/posters/joining.ts`):

```text
OVERLAP   "Solapar 1 cm"   each sheet repeats 1 cm of its neighbour; lay one
                           over the other until the crosses meet. Default.
TRIM      "Sin solape"     like Block Posters: no repeated strip; trim the
                           white margin and butt the sheets edge to edge.
```

It is only the overlap of the print configuration: 10 mm or 0. Everything
else follows from it, and the document reads the joining back from the
overlap (`joiningOf`), so there is no second flag to keep in sync.

## What changes with TRIM

* **More poster per sheet.** Three A4 sheets wide cover 60 cm instead of
  58; the whole-sheet buttons become round numbers (20, 40, 60, 80 cm).
* **Trim marks.** At each corner of the printed area, two short lines in the
  white margin continue its edges (`TRIM` stroke). A ruler across the two
  marks of an edge gives the cut. They never touch the image and go away
  with the margin.
* **The crosses sit on the edge.** With no shared strip, the middle of the
  strip is the edge itself: half of each cross is on the image, half in the
  margin. Trimmed and butted, the two halves meet.
* **Instructions.** Step 3 of the summary sheet says to trim along the corner
  marks and join edge to edge, instead of overlapping.

## Checked

A 40 x 56 cm poster, TRIM, 2 x 2 A4, rendered with pdf.js: summary with the
trimming instruction, trim marks at the corners of every sheet, crosses on
the edges.

The joining is sent with the request (`joining`) and is not stored in the
export record, like the crop (§95): the stored PDF is what matters.

The person is not told the difference in the tool: a link next to the
selector opens the printing guide at "Solapar o sin solape: cuál elegir",
with a drawing for each way (`/guias/como-imprimir-y-unir-las-hojas`).
