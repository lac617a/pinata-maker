# Piñata Maker — Geometry Engine

**Version:** 1.0
**Status:** Draft
**Last Updated:** 2026-09-14

---

# 1. Purpose

Este documento define las reglas técnicas del motor geométrico de Piñata Maker.

El motor geométrico es responsable de representar, transformar, validar y dividir geometría física.

Debe permitir transformar una forma detectada desde una imagen en una geometría que pueda:

* escalarse a dimensiones físicas
* dividirse entre hojas
* imprimirse
* medirse
* reconstruirse
* renderizarse como SVG
* renderizarse como PDF

La prioridad principal es:

> **Physical accuracy over visual approximation.**

---

# 2. Scope

El motor cubre:

```text
Coordinates
Points
Vectors
Dimensions
Bounding Boxes
Paths
Polygons
Transforms
Scaling
Rotation
Translation
Clipping
Geometry validation
Contour normalization
Polygon simplification
Tiling
Page geometry
Calibration geometry
```

No es responsabilidad del motor:

```text
React
Next.js
UI
Database
Supabase
Authentication
Storage
PDF file encoding
Image upload
User management
```

---

# 3. Core Principle

La geometría representa una realidad física.

Por lo tanto:

```text
1 unit in domain = 1 millimeter
```

No existe un concepto de pixel dentro de la geometría física.

---

# 4. Units

La unidad física oficial es:

```text
millimeter (mm)
```

Todas las siguientes propiedades utilizan milímetros:

```text
Point
Dimensions
BoundingBox
Margin
Overlap
Scale target
Paper dimensions
Template dimensions
Cut lines
Fold lines
Tabs
Calibration marks
```

---

# 5. Pixels

Pixels solamente pueden existir en:

```text
Image Processing
Rendering
Preview
Canvas
Browser
```

Nunca utilizar pixels como unidad del dominio geométrico.

Incorrecto:

```typescript
const width = 800;
```

si el contexto no permite saber si representa:

```text
800 px
```

o:

```text
800 mm
```

El tipo o contexto debe hacer explícita la unidad.

---

# 6. Coordinate System

El sistema de coordenadas es cartesiano.

Convención:

```text
Origin: top-left

X →
Y ↓
```

Representación:

```text
(0,0) ───────────────→ X
  │
  │
  │
  ↓
  Y
```

---

# 7. Point

Un `Point` representa una posición física.

```typescript
type Point = {
  x: Millimeters;
  y: Millimeters;
};
```

Ejemplo:

```text
Point {
  x: 100 mm
  y: 200 mm
}
```

---

# 8. Point Invariants

Un punto válido debe cumplir:

```text
isFinite(x)
isFinite(y)
```

No aceptar:

```text
NaN
Infinity
-Infinity
```

---

# 9. Vector

Un vector representa un desplazamiento.

```typescript
type Vector = {
  x: Millimeters;
  y: Millimeters;
};
```

A diferencia de un Point:

```text
Point = position
Vector = displacement
```

---

# 10. Dimensions

```typescript
type Dimensions = {
  width: Millimeters;
  height: Millimeters;
};
```

Debe cumplir:

```text
width > 0
height > 0
```

---

# 11. Bounding Box

Una bounding box representa los límites de una geometría.

```typescript
type BoundingBox = {
  minX: Millimeters;
  minY: Millimeters;
  maxX: Millimeters;
  maxY: Millimeters;
};
```

Debe cumplir:

```text
minX <= maxX
minY <= maxY
```

Para una geometría con área:

```text
width = maxX - minX
height = maxY - minY
```

---

# 12. Bounding Box Example

Para:

```text
minX = 100
maxX = 900

minY = 50
maxY = 1050
```

la dimensión es:

```text
width = 800 mm
height = 1000 mm
```

---

# 13. Geometry Origin

Una geometría puede tener coordenadas arbitrarias.

Antes de generar una plantilla física puede ser necesario normalizarla.

Normalización típica:

```text
minX → 0
minY → 0
```

Transformación:

```text
x' = x - minX
y' = y - minY
```

Esto mueve la geometría sin cambiar su tamaño.

---

# 14. Path

Un `Path` representa una secuencia geométrica.

Conceptualmente:

```text
Path
 ├── MoveTo
 ├── LineTo
 ├── LineTo
 ├── CurveTo
 └── ClosePath
```

La implementación puede utilizar:

* line segments
* quadratic curves
* cubic curves

según las necesidades reales.

---

# 15. Polygon

Un polygon es una secuencia ordenada de puntos.

```typescript
type Polygon = {
  points: Point[];
  closed: boolean;
};
```

Una geometría destinada a representar un contorno físico debe ser cerrada.

---

# 16. Polygon Closure

No depender exclusivamente de que:

```text
firstPoint === lastPoint
```

para determinar cierre.

El modelo debe representar explícitamente si la geometría está cerrada cuando sea necesario.

---

# 17. Polygon Orientation

La orientación debe ser consistente dentro del motor.

Convención recomendada:

```text
Counter-clockwise
```

para polígonos exteriores.

Los holes deben utilizar una convención inversa si el algoritmo utilizado lo requiere.

La convención concreta debe mantenerse constante.

---

# 18. Geometry Types

El motor debe distinguir entre:

```text
Outer contour
Hole
Cut line
Fold line
Tab
Alignment mark
```

No representar todos estos conceptos como simples líneas sin semántica.

---

# 19. Template Geometry

Conceptualmente:

```typescript
type TemplateGeometry = {
  outerContours: Polygon[];
  holes: Polygon[];
  cutLines: Path[];
  foldLines: Path[];
  tabs: Polygon[];
  alignmentMarks: AlignmentMark[];
};
```

La implementación puede evolucionar, pero la separación semántica debe mantenerse.

---

# 20. Geometry Immutability

Las operaciones geométricas deben preferir resultados inmutables.

Ejemplo:

```text
originalGeometry
      ↓
scale()
      ↓
scaledGeometry
```

No modificar silenciosamente:

```text
originalGeometry
```

---

# 21. Translation

Una traslación mueve una geometría.

```text
x' = x + dx
y' = y + dy
```

donde:

```text
dx
dy
```

están expresados en milímetros.

---

# 22. Translation Example

Si:

```text
Point = (100, 200)
```

y:

```text
Vector = (50, -20)
```

entonces:

```text
Point' = (150, 180)
```

---

# 23. Scaling

El escalado debe ser explícito.

```text
x' = x * scaleX
y' = y * scaleY
```

---

# 24. Uniform Scaling

Cuando se conserva proporción:

```text
scaleX = scaleY
```

Ejemplo:

```text
scale = 2
```

entonces:

```text
(100, 200)
```

se convierte en:

```text
(200, 400)
```

---

# 25. Non-Uniform Scaling

El escalado no uniforme:

```text
scaleX != scaleY
```

puede deformar la figura.

Debe estar prohibido por defecto.

Solamente permitirlo cuando exista una decisión explícita del producto que lo requiera.

---

# 26. Fit to Dimensions

Cuando una geometría debe ajustarse a unas dimensiones objetivo:

```text
sourceBounds
targetDimensions
```

primero calcular:

```text
scaleX = targetWidth / sourceWidth
scaleY = targetHeight / sourceHeight
```

Si se conserva proporción:

```text
scale = min(scaleX, scaleY)
```

La geometría resultante queda contenida dentro del objetivo.

---

# 27. Exact Dimensions

Si el usuario especifica dimensiones exactas:

```text
width = 800 mm
height = 1000 mm
```

debe existir una decisión explícita sobre si:

```text
preserveAspectRatio = true
```

Si es `true`, no se debe deformar la figura simplemente para alcanzar ambas dimensiones.

En ese caso:

```text
target dimensions
```

deben interpretarse como límites máximos o la UI debe informar que alcanzar ambas dimensiones exactas requiere deformación.

Nunca deformar silenciosamente.

---

# 28. Scale Around Center

Cuando una geometría se escala respecto a su centro:

```text
centerX = (minX + maxX) / 2
centerY = (minY + maxY) / 2
```

Transformación:

```text
x' = centerX + (x - centerX) * scale
y' = centerY + (y - centerY) * scale
```

El origen de escalado debe ser explícito.

---

# 29. Rotation

Una rotación requiere:

```text
angle
origin
```

No asumir un origen implícito.

---

# 30. Rotation Formula

Para un punto relativo al origen:

```text
x' = x cos(θ) - y sin(θ)

y' = x sin(θ) + y cos(θ)
```

Después se vuelve a aplicar la traslación respecto al origen.

---

# 31. Translation + Rotation + Scale

Cuando se combinen transformaciones, el orden importa.

Por ejemplo:

```text
Scale
→ Rotate
→ Translate
```

no es equivalente a:

```text
Translate
→ Rotate
→ Scale
```

El orden debe estar explícitamente definido.

---

# 32. Transform Matrix

Cuando se necesite combinar múltiples transformaciones, utilizar una representación matemática estándar.

Conceptualmente:

```text
[ a c e ]
[ b d f ]
[ 0 0 1 ]
```

con:

```text
x' = ax + cy + e
y' = bx + dy + f
```

Esto permite combinar transformaciones de forma determinista.

---

# 33. Transformation Object

Conceptualmente:

```typescript
type Transform = {
  scaleX: number;
  scaleY: number;
  rotation: number;
  translation: Vector;
};
```

La representación final puede utilizar matrices si resulta más apropiado.

---

# 34. Floating Point

JavaScript utiliza IEEE-754 floating point.

No asumir igualdad exacta para cálculos geométricos.

Evitar:

```typescript
a === b
```

cuando `a` y `b` provienen de cálculos geométricos.

---

# 35. Geometry Tolerance

Debe existir una tolerancia geométrica centralizada.

Ejemplo conceptual:

```text
EPSILON = 0.001 mm
```

El valor final debe determinarse mediante pruebas.

No dispersar:

```text
0.001
0.0001
0.01
```

por el código.

---

# 36. Equality with Tolerance

Para valores geométricos:

```text
abs(a - b) <= epsilon
```

debe utilizarse cuando corresponda.

---

# 37. Polygon Simplification

Los contornos derivados de imágenes pueden contener muchos puntos.

Pipeline:

```text
Raster contour
      ↓
Raw polygon
      ↓
Simplification
      ↓
Normalized polygon
```

La simplificación debe:

* reducir puntos innecesarios
* conservar la forma
* mantener topología
* respetar tolerancia

---

# 38. Simplification Algorithm

El algoritmo puede ser:

```text
Douglas-Peucker
```

u otro algoritmo equivalente.

La elección debe estar encapsulada.

No permitir que una librería externa defina directamente el modelo de dominio.

---

# 39. Simplification Tolerance

La tolerancia debe expresarse en milímetros cuando se aplica sobre geometría física.

No utilizar directamente:

```text
pixels
```

sin una transformación explícita.

---

# 40. Contour Conversion

Cuando un contorno viene desde una imagen:

```text
pixels
```

debe convertirse a:

```text
millimeters
```

antes de entrar al dominio físico.

Pipeline:

```text
Image pixels
      ↓
Image dimensions
      ↓
Physical target dimensions
      ↓
mm coordinates
      ↓
Domain geometry
```

---

# 41. Image-to-Geometry Scaling

Supongamos:

```text
imageWidth = 2000 px
imageHeight = 2500 px
```

y:

```text
targetWidth = 400 mm
targetHeight = 500 mm
```

Entonces:

```text
scaleX = 400 / 2000
scaleY = 500 / 2500
```

La conversión debe producir coordenadas físicas.

---

# 42. Do Not Mix Units

Incorrecto:

```text
point.x = imagePoint.x * physicalScale
point.y = imagePoint.y
```

si `point.y` continúa estando en pixels.

Correcto:

```text
x → mm
y → mm
```

antes de entrar al dominio.

---

# 43. Geometry Validation

Antes de utilizar una geometría:

```text
validateGeometry()
```

debe comprobar:

```text
finite coordinates
valid bounds
valid paths
valid polygons
valid topology when required
```

---

# 44. Degenerate Geometry

Rechazar geometrías degeneradas cuando la operación requiere área.

Ejemplos:

```text
all points identical
zero width
zero height
less than required points
```

---

# 45. Self-Intersection

Los polígonos destinados a representar áreas físicas deben validarse contra auto-intersecciones cuando el algoritmo lo requiera.

Una geometría inválida no debe pasar silenciosamente a:

```text
PDF generation
```

---

# 46. Holes

Una geometría puede contener agujeros.

Conceptualmente:

```text
Outer Polygon
    └── Hole Polygon
```

Los holes deben mantener una relación explícita con su contorno exterior.

---

# 47. Clipping

Clipping permite obtener la intersección entre:

```text
Geometry
```

y:

```text
Rectangle
```

Se utiliza principalmente durante tiling.

---

# 48. Clipping Invariant

Clipping no debe:

* escalar
* deformar
* rotar

la geometría.

Únicamente debe determinar qué parte pertenece a una región.

---

# 49. Tiling

Tiling transforma una geometría grande en múltiples páginas.

```text
TemplateGeometry
       ↓
Printable Area
       ↓
Page Grid
       ↓
Clipped Geometry
       ↓
TemplatePage[]
```

---

# 50. Printable Area

Para una hoja:

```text
paperWidth
paperHeight
```

y márgenes:

```text
marginLeft
marginRight
marginTop
marginBottom
```

calcular:

```text
printableWidth =
paperWidth - marginLeft - marginRight

printableHeight =
paperHeight - marginTop - marginBottom
```

---

# 51. Page Coordinate System

Cada página debe tener su propio sistema local.

Ejemplo:

```text
Page 1
origin = printable area origin
```

La geometría global debe transformarse al sistema local de la página.

---

# 52. Global vs Local Coordinates

Una geometría global:

```text
X = 350 mm
Y = 200 mm
```

puede convertirse a una página cuyo origen global es:

```text
X = 210 mm
Y = 0 mm
```

obteniendo:

```text
localX = 140 mm
localY = 200 mm
```

---

# 53. Page Grid

El grid se determina utilizando:

```text
template bounds
printable dimensions
overlap
```

No utilizar:

```text
window size
screen size
viewport
DPI
```

para calcular el grid físico.

---

# 54. Tiling Formula

Sin overlap:

```text
pageStepX = printableWidth
pageStepY = printableHeight
```

Con overlap:

```text
pageStepX = printableWidth - overlap
pageStepY = printableHeight - overlap
```

Siempre validar:

```text
pageStepX > 0
pageStepY > 0
```

---

# 55. Invalid Overlap

Rechazar:

```text
overlap < 0
```

y:

```text
overlap >= printableWidth
```

para overlap horizontal.

Igualmente:

```text
overlap >= printableHeight
```

para overlap vertical.

---

# 56. Tiling Example

Template:

```text
800 × 1000 mm
```

Paper:

```text
A4
210 × 297 mm
```

Margins:

```text
5 mm
```

Printable area:

```text
200 × 287 mm
```

Con:

```text
overlap = 10 mm
```

los pasos serían:

```text
stepX = 190 mm
stepY = 277 mm
```

La plantilla continúa midiendo:

```text
800 × 1000 mm
```

---

# 57. Page Count

El número de páginas depende de:

```text
template bounds
printable area
overlap
```

No calcularlo utilizando solamente:

```text
ceil(templateWidth / paperWidth)
```

porque deben considerarse los márgenes y overlap.

---

# 58. Tiling Determinism

Dados:

```text
same geometry
same paper
same margins
same overlap
same algorithm version
```

el resultado debe ser idéntico.

El orden de páginas debe ser determinista.

---

# 59. Page Ordering

Convención inicial:

```text
top → bottom
left → right
```

Ejemplo:

```text
1 | 2 | 3
4 | 5 | 6
7 | 8 | 9
```

Esta convención debe permanecer estable.

---

# 60. Page Identification

No utilizar únicamente:

```text
array index
```

como identidad.

Conceptualmente:

```text
TemplatePage {
  id
  row
  column
  pieceId
}
```

---

# 61. Alignment

Las páginas adyacentes deben poder relacionarse.

Ejemplo:

```text
Page 1.right ↔ Page 2.left
```

La relación debe formar parte del modelo.

---

# 62. Alignment Marks

Las marcas deben generarse a partir de posiciones geométricas.

No deben depender de:

```text
DOM
CSS
screen coordinates
```

---

# 63. Calibration Geometry

La calibración debe ser geometría física.

Ejemplo:

```text
Calibration line:
length = 100 mm
```

La longitud debe calcularse geométricamente.

---

# 64. Calibration Invariant

Si se genera:

```text
100 mm
```

el PDF debe contener una geometría cuya longitud física sea:

```text
100 mm
```

No:

```text
100 px
```

---

# 65. Paper Formats

El motor debe mantener una única fuente de verdad.

```text
A4     = 210 × 297 mm
A3     = 297 × 420 mm
LETTER = 215.9 × 279.4 mm
```

---

# 66. Orientation

Para `PORTRAIT`:

```text
width  = paper.shortSide
height = paper.longSide
```

Para `LANDSCAPE`:

```text
width  = paper.longSide
height = paper.shortSide
```

La geometría de la plantilla no debe deformarse por cambiar orientación.

---

# 67. Margins

Margins son dimensiones físicas.

```text
Margin {
  top
  right
  bottom
  left
}
```

Todas deben ser:

```text
>= 0
```

---

# 68. Printable Area Validation

Debe validarse:

```text
printableWidth > 0
printableHeight > 0
```

Una configuración donde los márgenes consumen todo el papel debe rechazarse.

---

# 69. Geometry-to-Page Mapping

Para cada página:

```text
Global Geometry
       ↓
Page Rectangle
       ↓
Clip
       ↓
Translate to Local Coordinates
       ↓
Page Geometry
```

Nunca:

```text
Scale
```

durante esta operación.

---

# 70. No Accidental Scaling During Tiling

Esta es una regla crítica.

Si:

```text
Template = 800 × 1000 mm
```

después de dividirlo en páginas:

```text
Combined template = 800 × 1000 mm
```

No debe convertirse en:

```text
700 × 900 mm
```

ni:

```text
1000 × 1250 mm
```

por el proceso de tiling.

---

# 71. Geometry Reconstruction

La combinación conceptual de:

```text
TemplatePage[]
+
alignment metadata
```

debe permitir reconstruir la posición global de cada pieza.

La reconstrucción no debe depender de:

```text
page screenshot
```

ni de:

```text
OCR
```

---

# 72. Rendering Contract

El motor geométrico entrega geometría.

El renderer consume:

```text
TemplateGeometry
TemplatePageGeometry
```

El renderer NO debe:

```text
change scale
change dimensions
change topology
```

---

# 73. SVG Contract

Un SVG debe representar la geometría sin alterar sus dimensiones.

Si el SVG representa:

```text
210 × 297 mm
```

debe utilizar un `viewBox` coherente con la geometría y atributos físicos apropiados.

---

# 74. PDF Contract

El PDF renderer debe utilizar las dimensiones físicas de la página.

El motor geométrico no debe depender de:

```text
PDF points
```

internamente.

La conversión:

```text
mm → PDF units
```

pertenece al renderer.

---

# 75. Conversion to PDF Units

Si una librería PDF utiliza puntos:

```text
1 inch = 25.4 mm
1 inch = 72 pt
```

entonces:

```text
1 mm = 72 / 25.4 pt
```

Esta conversión debe existir únicamente en la capa de PDF.

---

# 76. Conversion to Screen Pixels

El preview puede convertir:

```text
mm → px
```

utilizando una escala visual.

Ejemplo:

```text
1 mm → 3 px
```

Esta escala es exclusivamente visual.

No modificar el dominio.

---

# 77. Precision

No redondear coordenadas prematuramente.

Incorrecto:

```text
Math.round(point.x)
```

durante operaciones geométricas.

Preferir conservar precisión y redondear únicamente en el boundary de salida cuando sea necesario.

---

# 78. Serialization

Una geometría serializada debe conservar suficiente precisión para reconstruirla.

Evitar formatos que redondeen agresivamente:

```text
123.456789
```

a:

```text
123
```

sin una razón documentada.

---

# 79. Geometry Hash

En el futuro puede utilizarse un hash para identificar geometrías equivalentes.

No implementar hasta que exista una necesidad real de:

* caching
* deduplication
* reproducibility checks

---

# 80. Performance

El motor debe evitar complejidad innecesaria.

Operaciones potencialmente costosas:

```text
polygon intersection
polygon clipping
self-intersection detection
simplification
large contour processing
tiling
```

Optimizar solamente después de medir.

---

# 81. Large Geometry

No asumir que una imagen produce un polygon pequeño.

El sistema debe poder manejar:

```text
thousands of points
```

sin crear estructuras innecesarias.

La simplificación debe producir una geometría manejable antes de operaciones costosas cuando sea seguro hacerlo.

---

# 82. Numerical Stability

Los algoritmos geométricos deben considerar:

* floating point errors
* near-zero values
* almost parallel lines
* nearly coincident points
* very small segments

Utilizar `EPSILON` centralizado.

---

# 83. Near-Zero Segments

Segmentos cuya longitud sea menor que la tolerancia geométrica pueden considerarse redundantes.

No eliminar segmentos automáticamente si hacerlo cambia la topología.

---

# 84. Testing Strategy

El motor geométrico debe tener tests unitarios independientes de:

```text
React
Next.js
Supabase
Browser
PDF
```

---

# 85. Required Geometry Tests

Como mínimo:

```text
Point
Vector
Dimensions
BoundingBox
Translation
Uniform scaling
Non-uniform scaling validation
Rotation
Bounding box after rotation
Polygon validation
Simplification
Clipping
Margins
Printable area
Tiling
Overlap
Page ordering
Page coordinates
Calibration
```

---

# 86. Property-Based Testing

Cuando resulte útil, utilizar property-based testing para invariantes geométricas.

Ejemplos:

```text
Scaling by 1 returns equivalent geometry.

Translation does not change dimensions.

Uniform scaling multiplies dimensions by scale.

Tiling does not change global physical dimensions.

Rotation preserves distances between points.

```

No introducir una librería de property testing únicamente por seguir este documento; utilizarla cuando reduzca significativamente el esfuerzo de validación.

---

# 87. Golden Tests

Para casos geométricos complejos puede utilizarse:

```text
input
→ expected geometry
```

como fixture.

Especialmente útil para:

```text
tiling
clipping
contour simplification
```

---

# 88. Geometry Debugging

Debe ser posible inspeccionar:

```text
source geometry
normalized geometry
scaled geometry
tiled geometry
```

sin depender exclusivamente del PDF final.

---

# 89. Debug Representation

Cuando sea necesario, generar una representación visual de debug.

Por ejemplo:

```text
SVG debug
```

pero esta representación no forma parte del dominio.

---

# 90. Forbidden Patterns

No implementar:

```text
pixels as physical units
```

No implementar:

```text
window dimensions for physical geometry
```

No implementar:

```text
screen DPI as template dimensions
```

No implementar:

```text
CSS pixels as millimeters
```

No implementar:

```text
implicit scaling during rendering
```

No implementar:

```text
implicit scaling during tiling
```

No implementar:

```text
hardcoded page counts
```

No implementar:

```text
hardcoded geometry coordinates
```

No implementar:

```text
geometry logic inside React components
```

---

# 91. Geometry Pipeline

Pipeline oficial:

```text
IMAGE
  │
  ▼
CONTOUR EXTRACTION
  │
  ▼
RAW CONTOUR
  │
  ▼
NORMALIZATION
  │
  ▼
SIMPLIFICATION
  │
  ▼
PHYSICAL SCALING
  │
  ▼
VALIDATED GEOMETRY
  │
  ▼
TEMPLATE GEOMETRY
  │
  ▼
TILING
  │
  ▼
PAGE GEOMETRY
  │
  ├───────────────┐
  ▼               ▼
SVG Renderer   PDF Renderer
```

---

# 92. Boundary Rules

El dominio recibe:

```text
physical geometry
```

El dominio entrega:

```text
physical geometry
```

Los siguientes boundaries realizan conversiones:

```text
Image Processing
pixels → mm

Screen Rendering
mm → px

PDF Rendering
mm → PDF units
```

---

# 93. Single Source of Truth

La fuente de verdad de las dimensiones físicas debe ser:

```text
Domain Geometry
```

No:

```text
SVG
Canvas
PDF
CSS
Database JSON
```

Estos son representaciones o persistencia de la geometría.

---

# 94. Domain Invariants

Estas invariantes no deben romperse:

```text
1. Physical geometry is expressed in millimeters.

2. Pixels never enter the physical domain.

3. Geometry transformations are explicit.

4. Uniform scaling preserves aspect ratio.

5. Non-uniform scaling is prohibited by default.

6. Translation does not change dimensions.

7. Rotation does not change distances.

8. Tiling does not change physical template dimensions.

9. Overlap does not change template dimensions.

10. Margins reduce printable area.

11. Clipping does not scale geometry.

12. PDF rendering must preserve physical dimensions.

13. Calibration geometry must represent its physical length.

14. Geometry operations must be deterministic.

15. Floating-point comparison uses tolerance where appropriate.

16. Geometry must remain independent from rendering technology.
```

---

# 95. Example End-to-End

Input image:

```text
2000 × 2500 px
```

Target physical dimensions:

```text
400 × 500 mm
```

Pipeline:

```text
2000 × 2500 px
        ↓
Contour extraction
        ↓
Polygon
        ↓
Simplification
        ↓
Pixel → mm
        ↓
400 × 500 mm
        ↓
TemplateGeometry
        ↓
A4 tiling
        ↓
TemplatePage[]
        ↓
SVG / PDF
```

El resultado final debe seguir representando:

```text
400 × 500 mm
```

independientemente de cuántas páginas sean necesarias.

---

# 96. Acceptance Criteria

El motor geométrico se considera correcto cuando:

```text
[ ] All physical geometry uses millimeters.

[ ] Invalid coordinates are rejected.

[ ] Invalid dimensions are rejected.

[ ] Bounding boxes are correct.

[ ] Translation preserves dimensions.

[ ] Uniform scaling preserves aspect ratio.

[ ] Rotation preserves distances.

[ ] Non-uniform scaling cannot happen accidentally.

[ ] Polygon simplification preserves required topology.

[ ] Clipping does not modify scale.

[ ] Printable area correctly respects margins.

[ ] Tiling respects printable dimensions.

[ ] Tiling respects overlap.

[ ] Tiling does not alter physical template size.

[ ] Page ordering is deterministic.

[ ] Alignment relationships are deterministic.

[ ] Calibration marks preserve physical length.

[ ] Geometry can be rendered without changing its physical meaning.

[ ] Geometry tests run independently of UI and infrastructure.
```

---

# 97. Final Principle

El motor geométrico debe seguir una regla simple:

> **Una geometría representa una medida física, no una imagen en pantalla.**

Por lo tanto:

```text
IMAGE
  ≠
GEOMETRY
  ≠
SCREEN
  ≠
PDF
```

Son representaciones diferentes conectadas mediante transformaciones explícitas:

```text
Image
pixels → mm
        ↓
Geometry
        ↓
mm → screen px
        ↓
Preview

Geometry
        ↓
mm → PDF units
        ↓
PDF
```

La geometría física es la fuente de verdad.

Todo renderer debe respetarla.
