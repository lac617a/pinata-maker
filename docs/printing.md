# Piñata Maker — Printing

**Version:** 1.0
**Status:** Draft
**Last Updated:** 2026-09-14

---

# 1. Purpose

Este documento define las reglas de impresión de Piñata Maker.

El objetivo es transformar una `TemplateGeometry` física en un conjunto de páginas imprimibles que permitan al usuario:

* imprimir una plantilla
* mantener sus dimensiones físicas
* ensamblar múltiples hojas
* cortar siguiendo líneas de corte
* identificar líneas de doblez
* alinear hojas
* verificar la escala antes de cortar

La prioridad principal es:

> **Physical scale accuracy over visual convenience.**

---

# 2. Core Principle

La impresión debe representar exactamente las dimensiones físicas definidas por la geometría.

Si una plantilla mide:

```text
800 × 1000 mm
```

el proceso de impresión no puede convertirla silenciosamente en:

```text
700 × 875 mm
```

ni:

```text
850 × 1062.5 mm
```

La escala debe ser explícita.

---

# 3. Printing Boundary

Printing consume:

```text
TemplateGeometry
PaperConfiguration
PrintConfiguration
```

y produce:

```text
PrintableDocument
```

Conceptualmente:

```text
TemplateGeometry
       ↓
Print Configuration
       ↓
Printable Layout
       ↓
Pages
       ↓
PDF / SVG / Print Output
```

---

# 4. Responsibilities

Printing es responsable de:

```text
paper size
paper orientation
margins
printable area
scale
tiling
overlap
page ordering
alignment
calibration
cut marks
fold marks
page metadata
```

No es responsable de:

```text
image segmentation
AI
contour extraction
authentication
database
storage
user accounts
```

---

# 5. Physical Units

Todas las dimensiones internas de impresión deben utilizar:

```text
millimeters (mm)
```

Esto incluye:

```text
paper dimensions
margins
overlap
scale
alignment marks
calibration marks
template dimensions
cut marks
fold marks
```

---

# 6. Pixels

Pixels pertenecen únicamente a:

```text
screen preview
image processing
UI rendering
```

Nunca utilizar pixels para determinar:

```text
paper size
physical template size
printable area
overlap
calibration
```

---

# 7. Paper Configuration

Conceptualmente:

```typescript
type PaperSize = {
  width: Millimeters;
  height: Millimeters;
};
```

Y:

```typescript
type PaperConfiguration = {
  size: PaperSize;
  orientation: PaperOrientation;
  margins: Margins;
};
```

---

# 8. Supported Paper Formats

MVP:

```text
A4
A3
Letter
```

Dimensiones:

```text
A4     = 210 × 297 mm
A3     = 297 × 420 mm
Letter = 215.9 × 279.4 mm
```

La aplicación debe tener una única fuente de verdad para estos valores.

---

# 9. Paper Orientation

Valores:

```text
PORTRAIT
LANDSCAPE
```

Para `PORTRAIT`:

```text
width  = short side
height = long side
```

Para `LANDSCAPE`:

```text
width  = long side
height = short side
```

La orientación del papel no debe deformar la plantilla.

---

# 10. Margins

Los márgenes son físicos.

```typescript
type Margins = {
  top: Millimeters;
  right: Millimeters;
  bottom: Millimeters;
  left: Millimeters;
};
```

Todos deben cumplir:

```text
margin >= 0
```

---

# 11. Printable Area

La zona imprimible se calcula:

```text
printableWidth =
paperWidth - marginLeft - marginRight

printableHeight =
paperHeight - marginTop - marginBottom
```

Debe cumplirse:

```text
printableWidth > 0
printableHeight > 0
```

---

# 12. Printer Hardware Margins

La aplicación debe distinguir entre:

```text
document margins
```

y:

```text
printer non-printable area
```

Una impresora física puede tener un área que no puede imprimir.

El sistema no debe afirmar que una página es físicamente imprimible al borde si el dispositivo no lo permite.

---

# 13. Borderless Printing

El soporte para:

```text
borderless printing
```

no debe asumirse.

Si el documento requiere impresión hasta el borde:

```text
borderless = explicit capability
```

Debe tratarse como una configuración del entorno de impresión.

---

# 14. Scale

La escala de impresión debe ser explícita.

Valor recomendado para plantillas:

```text
100%
```

Esto significa:

```text
1 mm geometry
=
1 mm physical output
```

---

# 15. Scale Invariant

Para una plantilla de:

```text
500 mm
```

a escala:

```text
100%
```

debe imprimirse como:

```text
500 mm
```

No:

```text
500 px
```

ni:

```text
500 PDF units
```

---

# 16. Forbidden Automatic Scaling

No permitir que el sistema aplique silenciosamente:

```text
Fit to page
Fit to printable area
Shrink oversized pages
Scale to margins
```

cuando el objetivo sea una plantilla física exacta.

---

# 17. Print Scale Modes

Conceptualmente:

```text
ACTUAL_SIZE
CUSTOM_SCALE
```

MVP:

```text
ACTUAL_SIZE
```

Debe representar:

```text
100%
```

---

# 18. Custom Scale

Si en el futuro se permite:

```text
75%
80%
90%
125%
```

el valor debe ser explícito.

Ejemplo:

```text
scale = 0.75
```

significa:

```text
physical output = geometry × 0.75
```

Nunca cambiar la escala sin informarlo al usuario.

---

# 19. Scale and Tiling

El orden conceptual debe ser:

```text
Template Geometry
      ↓
Scale
      ↓
Scaled Geometry
      ↓
Tiling
      ↓
Pages
```

No:

```text
Template
 ↓
Tiling
 ↓
Random page scaling
```

---

# 20. Tiling

Cuando la plantilla sea mayor que el área imprimible:

```text
Template
    ↓
Tiling
    ↓
Multiple pages
```

El tiling debe conservar la escala.

---

# 21. Example

Template:

```text
800 × 1000 mm
```

Paper:

```text
A4
```

Printable area:

```text
200 × 287 mm
```

La plantilla debe dividirse en páginas.

Pero al unir las páginas:

```text
800 × 1000 mm
```

debe seguir siendo la dimensión física final.

---

# 22. Page Grid

La distribución puede representarse:

```text
1 | 2 | 3 | 4
5 | 6 | 7 | 8
9 |10 |11 |12
```

El orden debe ser determinista.

Convención:

```text
top → bottom
left → right
```

---

# 23. Page Coordinates

Cada página posee:

```text
row
column
```

y una región global:

```text
globalBounds
```

Esto permite saber qué parte de la plantilla contiene.

---

# 24. Overlap

El overlap permite que páginas consecutivas compartan una pequeña región.

Ejemplo:

```text
Page A
──────────────
      │
      │ overlap
      │
      ──────────────
             Page B
```

---

# 25. Overlap Units

Siempre:

```text
millimeters
```

Ejemplo:

```text
overlap = 10 mm
```

---

# 26. Overlap Purpose

El overlap permite:

* facilitar alineación
* compensar pequeños errores
* facilitar montaje
* incluir marcas de referencia

No debe utilizarse para cambiar las dimensiones físicas de la plantilla.

---

# 27. Overlap Constraints

Debe cumplirse:

```text
overlap >= 0
```

y:

```text
overlap < printableWidth
```

para el eje X.

Y:

```text
overlap < printableHeight
```

para el eje Y.

---

# 28. Page Step

Sin overlap:

```text
stepX = printableWidth
stepY = printableHeight
```

Con overlap:

```text
stepX = printableWidth - overlap
stepY = printableHeight - overlap
```

---

# 29. Tiling Determinism

Misma entrada:

```text
same geometry
same paper
same margins
same scale
same overlap
```

debe producir:

```text
same pages
same order
same coordinates
```

---

# 30. No Page Stretching

Cada página debe conservar sus dimensiones físicas.

No permitir que una página sea:

```text
stretched
```

para rellenar el papel.

---

# 31. Page Content

Una página puede contener:

```text
template geometry
cut lines
fold lines
tabs
alignment marks
page identifier
calibration mark
optional metadata
```

---

# 32. Cut Lines

Las líneas de corte representan:

```text
where the material should be cut
```

Deben diferenciarse visualmente de:

```text
fold lines
alignment marks
```

La semántica debe existir independientemente del estilo visual.

---

# 33. Fold Lines

Las líneas de doblez representan:

```text
where the material should be folded
```

No deben convertirse accidentalmente en líneas de corte.

---

# 34. Tabs

Las pestañas pueden formar parte de la plantilla.

Conceptualmente:

```text
Tab
 ├── boundary
 ├── fold line
 └── attachment relationship
```

El sistema no debe generar tabs automáticamente hasta que exista una regla geométrica definida.

---

# 35. Alignment Marks

Las páginas adyacentes deben incluir información suficiente para alinearse.

Ejemplo:

```text
Page 1
   A ──────── B
               │
               │
Page 2         B
               │
               │
```

La implementación visual puede evolucionar.

La relación geométrica debe ser determinista.

---

# 36. Alignment IDs

Las marcas pueden utilizar identificadores:

```text
A1
A2
B1
B2
```

o cualquier esquema equivalente.

La identidad debe derivarse del layout, no de valores aleatorios.

---

# 37. Page Labels

Cada página debe tener un identificador humano.

Ejemplo:

```text
Page 1 of 12
```

El formato puede evolucionar.

La numeración debe seguir el orden definido por el layout.

---

# 38. Calibration Mark

Cada documento debe poder incluir una marca de calibración.

MVP recomendado:

```text
100 mm
```

Ejemplo conceptual:

```text
|────────────────────|
         100 mm
```

---

# 39. Calibration Purpose

La calibración permite detectar problemas de impresión.

El usuario puede medir:

```text
100 mm
```

con una regla.

Si obtiene:

```text
95 mm
```

la impresión no está respetando la escala.

---

# 40. Calibration Invariant

Una marca configurada como:

```text
100 mm
```

debe representar físicamente:

```text
100 mm
```

cuando el documento se imprime a:

```text
100%
```

---

# 41. Calibration Placement

La marca debe ubicarse en una región que:

```text
does not overlap critical geometry
```

y:

```text
remains printable
```

---

# 42. Calibration Configuration

Conceptualmente:

```typescript
type CalibrationMark = {
  length: Millimeters;
  position: Point;
};
```

No hardcodear `100` en múltiples lugares.

---

# 43. Page Metadata

Una página puede contener:

```text
pageNumber
totalPages
row
column
templateId
scale
paper
```

No incluir información sensible innecesaria.

---

# 44. Print Configuration

Conceptualmente:

```typescript
type PrintConfiguration = {
  paper: PaperConfiguration;
  scale: number;
  overlap: Millimeters;
  calibration: CalibrationConfiguration;
  showCutLines: boolean;
  showFoldLines: boolean;
  showAlignmentMarks: boolean;
};
```

La estructura final puede evolucionar.

---

# 45. Default Configuration

MVP recomendado:

```text
paper = A4
orientation = PORTRAIT
scale = 1
overlap = 10 mm
calibration = enabled
cutLines = enabled
foldLines = enabled
alignmentMarks = enabled
```

Los valores deben centralizarse.

---

# 46. Configuration Validation

Antes de generar páginas:

```text
validatePrintConfiguration()
```

Debe comprobar:

```text
valid paper
valid orientation
valid margins
valid scale
valid overlap
valid printable area
```

---

# 47. Invalid Scale

Rechazar:

```text
scale <= 0
```

Ejemplo inválido:

```text
scale = 0
```

---

# 48. Excessive Scale

No limitar arbitrariamente la escala salvo que exista una razón de producto.

Si se establece un límite:

```text
minScale
maxScale
```

debe ser configuración documentada.

---

# 49. Print Layout

El layout debe calcular:

```text
scaledTemplateBounds
printableBounds
pageGrid
pageRegions
alignmentRelationships
```

---

# 50. Layout Result

Conceptualmente:

```typescript
type PrintLayout = {
  pages: PrintPage[];
  totalWidth: Millimeters;
  totalHeight: Millimeters;
};
```

La implementación puede tener más metadata.

---

# 51. Print Page

Conceptualmente:

```typescript
type PrintPage = {
  id: string;
  row: number;
  column: number;
  paper: PaperSize;
  geometry: TemplateGeometry;
  alignmentMarks: AlignmentMark[];
  calibrationMark?: CalibrationMark;
};
```

---

# 52. Page Geometry

La geometría de una página debe estar expresada en coordenadas locales.

```text
Global Geometry
      ↓
Page Clip
      ↓
Local Geometry
```

---

# 53. Global Physical Position

Cada página debe conservar su relación con el espacio global.

Ejemplo:

```text
Page 1 origin:
0, 0

Page 2 origin:
190, 0
```

si:

```text
printableWidth = 200 mm
overlap = 10 mm
```

---

# 54. Reassembly

Si se eliminan:

```text
page margins
page labels
alignment graphics
```

y se reconstruye la geometría usando sus coordenadas globales:

```text
combined geometry
```

debe coincidir con la plantilla original escalada.

---

# 55. Reassembly Invariant

Debe cumplirse:

```text
reassembledGeometry ≈ scaledTemplateGeometry
```

utilizando la tolerancia geométrica definida en `geometry.md`.

---

# 56. Page Count

El número de páginas debe calcularse.

Nunca hardcodear:

```text
12 pages
24 pages
```

El resultado depende de:

```text
template dimensions
paper
margins
scale
overlap
```

---

# 57. Large Templates

Una plantilla puede requerir muchas páginas.

El sistema debe soportar layouts como:

```text
1 × 1
2 × 3
4 × 5
10 × 12
```

sin lógica especial para cada tamaño.

---

# 58. Small Templates

Si la plantilla cabe completamente:

```text
template <= printable area
```

debe generarse:

```text
1 page
```

No aplicar tiling innecesariamente.

---

# 59. Page Clipping

Cada página obtiene la intersección:

```text
Template Geometry
∩
Page Printable Rectangle
```

El clipping:

```text
must not scale geometry
must not distort geometry
must not close geometry along the page border
```

El resultado del recorte son trazos abiertos.

Un contorno que cruza el borde de la hoja no debe cerrarse siguiendo ese
borde: el límite del papel no es una línea de corte física. Cerrar la
geometría contra el rectángulo de página haría que el usuario recortara por el
canto de la hoja.

Por la misma razón, una página sin ningún trazo no es necesariamente una
página sobrante.

Ejemplo:

```text
Figura grande
  ↓
Página completamente interior a la figura
  ↓
0 líneas recortadas
```

Esa hoja no contiene líneas, pero sí material de la pieza y debe imprimirse.

Descartar páginas vacías requiere comprobar si la página queda dentro del
contorno, no únicamente si contiene trazos.

---

# 60. Partial Geometry

Una pieza puede cruzar el límite entre dos páginas.

Ejemplo:

```text
Page 1
───────────────
       ╲
        ╲
         ╲
          ───────────────
                    Page 2
```

Cada página contiene solamente la parte correspondiente.

Las marcas permiten reconstruir la relación.

---

# 61. Geometry Continuity

Cuando una línea atraviesa dos páginas:

```text
Page A segment
+
Page B segment
```

deben corresponder a la misma geometría global.

No crear segmentos independientes sin relación.

---

# 62. Cut Line Continuity

Una línea de corte que atraviesa una página debe conservar:

```text
same global position
same direction
same scale
```

al continuar en la siguiente.

---

# 63. Fold Line Continuity

Las mismas reglas aplican a:

```text
fold lines
```

---

# 64. Printable Area vs Paper Area

Distinguir siempre:

```text
Paper Area
```

de:

```text
Printable Area
```

Ejemplo:

```text
A4
210 × 297 mm

Printable:
200 × 287 mm
```

El papel completo sigue siendo:

```text
210 × 297 mm
```

---

# 65. Content Offset

El contenido de la página debe respetar:

```text
marginLeft
marginTop
```

No asumir que:

```text
page origin = printable origin
```

sin documentarlo.

---

# 66. Print Renderer Boundary

El layout físico produce:

```text
PrintLayout
```

El renderer transforma eso a:

```text
SVG
PDF
```

La capa renderer no debe recalcular:

```text
tiling
scale
overlap
page count
```

---

# 67. PDF Independence

El sistema de impresión no debe depender de una librería específica de PDF.

Por ejemplo, no introducir lógica de dominio basada directamente en:

```text
jsPDF
PDFKit
pdf-lib
Puppeteer
```

El renderer debe estar detrás de una abstracción.

---

# 68. Renderer Contract

Conceptualmente:

```typescript
interface PrintRenderer {
  render(layout: PrintLayout): PrintableDocument;
}
```

La implementación concreta puede ser:

```text
PdfPrintRenderer
SvgPrintRenderer
```

---

# 69. SVG Output

SVG es útil para:

```text
preview
debug
vector export
```

Debe respetar las dimensiones físicas del layout.

---

# 70. PDF Output

PDF es el formato principal para impresión.

Debe conservar:

```text
paper dimensions
physical scale
page count
page geometry
```

---

# 71. PDF Viewer Warning

Un visor PDF puede mostrar opciones como:

```text
Fit
Actual size
Custom scale
Shrink
```

La aplicación debe comunicar claramente al usuario que debe seleccionar:

```text
Actual Size / 100%
```

cuando corresponda.

---

# 72. Printer Driver Warning

El driver de la impresora también puede aplicar:

```text
scaling
fit
borderless adjustments
```

Piñata Maker no puede controlar todos los drivers.

Por eso el documento debe contener:

```text
calibration mark
```

para verificar físicamente el resultado.

---

# 73. User Print Instructions

La UX debe comunicar al menos:

```text
Print at 100% / Actual Size.
Do not use Fit to Page.
Verify the 100 mm calibration mark.
```

La redacción final pertenece a UI/content.

---

# 74. Calibration Failure

Si el usuario mide:

```text
100 mm
```

y obtiene:

```text
97 mm
```

el sistema no debe asumir que la geometría está mal.

Primero indicar:

```text
printer scaling
PDF viewer scaling
driver scaling
```

como posibles causas.

---

# 75. Physical Verification

La calibración es una verificación física.

No puede sustituirse por:

```text
screen preview
```

---

# 76. Preview

El preview puede mostrar:

```text
paper boundaries
template
page divisions
alignment marks
```

pero el tamaño visual en pantalla no representa el tamaño físico real.

---

# 77. Preview Scale

La UI puede utilizar:

```text
zoom = 50%
zoom = 100%
zoom = 200%
```

Esto no cambia:

```text
physicalScale
```

---

# 78. Preview vs Print

Separar:

```text
visual zoom
```

de:

```text
print scale
```

Ejemplo:

```text
preview zoom = 200%
print scale = 100%
```

es perfectamente válido.

---

# 79. Print Job Identity

Un layout generado debe poder identificarse.

Conceptualmente:

```text
PrintJob {
    templateId
    geometryVersion
    printConfiguration
    layoutVersion
}
```

No utilizar timestamps aleatorios como única identidad lógica.

---

# 80. Layout Version

El algoritmo de tiling/layout debe tener versión.

Ejemplo:

```text
layoutVersion = "1.0"
```

Esto permite reproducir documentos anteriores.

---

# 81. Reproducibility

Dados:

```text
same template
same geometry
same configuration
same layoutVersion
```

debe producirse el mismo layout.

---

# 82. Errors

Errores de impresión/layout deben clasificarse.

Ejemplos:

```text
INVALID_PRINT_CONFIGURATION
INVALID_PAPER_SIZE
INVALID_MARGINS
INVALID_SCALE
INVALID_OVERLAP
EMPTY_PRINTABLE_AREA
LAYOUT_GENERATION_FAILED
GEOMETRY_OUTSIDE_VALID_BOUNDS
```

---

# 83. Error Handling

No mostrar:

```text
Something went wrong
```

como único error interno.

El dominio debe producir errores estructurados.

La UI decidirá cómo presentarlos.

---

# 84. Testing Strategy

Printing debe probarse sin depender de una impresora física.

Tests:

```text
paper dimensions
orientation
margins
printable area
scale
tiling
overlap
page count
page ordering
alignment
calibration
reassembly
```

---

# 85. Physical Dimension Tests

Ejemplo:

```text
Template = 800 × 1000 mm
Scale = 100%
```

Debe cumplirse:

```text
output bounds ≈ 800 × 1000 mm
```

---

# 86. Scale Tests

Para:

```text
scale = 1
```

esperar:

```text
output = original
```

Para:

```text
scale = 0.5
```

esperar:

```text
output = 50%
```

---

# 87. Translation Tests

Cambiar la posición del template no debe cambiar:

```text
physical width
physical height
```

---

# 88. Tiling Tests

Para una plantilla mayor que una página:

```text
pages.length > 1
```

y:

```text
reassembledGeometry ≈ scaledTemplateGeometry
```

---

# 89. Overlap Tests

Con:

```text
overlap = 0
```

el layout no debe tener overlap.

Con:

```text
overlap = 10 mm
```

las regiones adyacentes deben compartir:

```text
10 mm
```

según el eje correspondiente.

---

# 90. Page Ordering Tests

Para:

```text
3 columns
3 rows
```

esperar:

```text
1 2 3
4 5 6
7 8 9
```

---

# 91. Calibration Tests

Para:

```text
calibrationLength = 100 mm
```

el resultado físico debe ser:

```text
100 mm
```

a escala:

```text
100%
```

---

# 92. Margin Tests

Para:

```text
paper = 210 × 297
margins = 5
```

esperar:

```text
printable = 200 × 287
```

---

# 93. Orientation Tests

Para A4:

```text
portrait:
210 × 297

landscape:
297 × 210
```

El template debe mantener sus proporciones.

---

# 94. Regression Tests

Cada bug geométrico o de impresión que afecte al resultado físico debe convertirse en un regression test.

Ejemplo:

```text
bug:
page 2 shifted by 0.5 mm

fix:
add regression test
```

---

# 95. Golden Layout Tests

Para layouts complejos se pueden almacenar fixtures:

```text
input geometry
+
print configuration
=
expected page layout
```

Esto permite detectar cambios accidentales en:

```text
page positions
page count
overlap
```

---

# 96. Property-Based Tests

Cuando aporte valor, validar propiedades como:

```text
Scale 1 preserves dimensions.

Translation preserves dimensions.

Changing paper orientation does not deform geometry.

Tiling does not alter global dimensions.

Increasing overlap does not alter template dimensions.

```

---

# 97. Forbidden Patterns

No implementar:

```text
pixels as physical dimensions
```

No implementar:

```text
window size → paper size
```

No implementar:

```text
DPI → automatic template size
```

No implementar:

```text
fit-to-page by default
```

No implementar:

```text
silent scaling
```

No implementar:

```text
hardcoded page count
```

No implementar:

```text
random page ordering
```

No implementar:

```text
renderer modifying geometry
```

No implementar:

```text
PDF library logic inside domain
```

No implementar:

```text
CSS dimensions as physical dimensions
```

---

# 98. Architecture

Responsabilidades:

```text
┌─────────────────────────────┐
│      Geometry Domain        │
│                             │
│ Physical Geometry           │
└──────────────┬──────────────┘
               ↓
┌─────────────────────────────┐
│      Printing Domain        │
│                             │
│ Scale                       │
│ Paper                       │
│ Margins                     │
│ Tiling                      │
│ Overlap                     │
│ Alignment                   │
│ Calibration                 │
└──────────────┬──────────────┘
               ↓
┌─────────────────────────────┐
│        Renderer             │
│                             │
│ SVG                         │
│ PDF                         │
└─────────────────────────────┘
```

---

# 99. Single Source of Truth

La geometría física pertenece a:

```text
Geometry Domain
```

La configuración física de impresión pertenece a:

```text
Printing Domain
```

El renderer solamente representa el resultado.

---

# 100. Critical Invariants

Estas reglas son obligatorias:

```text
1. Physical units are millimeters.

2. Printing must preserve physical scale.

3. 100% means actual physical dimensions.

4. Automatic fit-to-page is prohibited by default.

5. Tiling must not deform geometry.

6. Tiling must not silently scale geometry.

7. Overlap must not change global template dimensions.

8. Margins reduce printable area.

9. Paper dimensions are independent from printable area.

10. Page order must be deterministic.

11. Alignment relationships must be deterministic.

12. Calibration marks must preserve physical length.

13. Preview zoom is independent from print scale.

14. PDF rendering must not modify geometry.

15. Printer-specific scaling must be explicitly communicated.

16. Print layouts must be reproducible.

17. Layout algorithms must be versioned.

18. Physical output must be verifiable using calibration.
```

---

# 101. Acceptance Criteria

Printing se considera correcto cuando:

```text
[ ] A4 is supported.

[ ] A3 is supported.

[ ] Letter is supported.

[ ] Portrait is supported.

[ ] Landscape is supported.

[ ] Margins are validated.

[ ] Printable area is calculated correctly.

[ ] Scale is explicit.

[ ] 100% preserves physical dimensions.

[ ] Automatic scaling is disabled by default.

[ ] Templates larger than a page are tiled.

[ ] Tiling preserves physical scale.

[ ] Overlap is supported.

[ ] Page ordering is deterministic.

[ ] Alignment marks can be generated.

[ ] Calibration marks can be generated.

[ ] Calibration dimensions are physically correct.

[ ] Page metadata is deterministic.

[ ] Reassembly reproduces the original scaled geometry.

[ ] Layout generation is independent from PDF implementation.

[ ] Printing can be tested without a physical printer.

[ ] Layout bugs have regression tests.
```

---

# 102. Final Principle

Piñata Maker no debe pensar:

```text
"¿Cómo hago para que esta figura quepa en una hoja?"
```

Debe pensar:

```text
"¿Cómo represento exactamente esta geometría física
utilizando tantas hojas como sean necesarias?"
```

La diferencia es fundamental.

El flujo correcto es:

```text
Physical Template
       ↓
Exact Scale
       ↓
Printable Area
       ↓
Tiling
       ↓
Multiple Physical Pages
       ↓
Alignment
       ↓
Assembly
       ↓
Original Physical Template
```

La impresora puede utilizar múltiples páginas.

La geometría física sigue siendo una sola.

> **Print pages are representations of the template, not the template itself.**
