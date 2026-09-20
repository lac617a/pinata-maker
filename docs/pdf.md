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
imagen de referencia incrustada (§24)
hoja de instrucciones del documento
escalas distintas del tamaño real
streaming (§58)
```

El renderer rechaza con un error explícito un layout que declare una escala
distinta de la real, en lugar de imprimirlo al 100 % en silencio (§44, §75).
