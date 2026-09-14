# Piñata Maker — Domain Model

**Version:** 1.0
**Status:** Draft
**Last Updated:** 2026-09-14

---

# 1. Purpose

Este documento define el modelo de dominio de Piñata Maker.

Describe:

* conceptos del negocio
* entidades
* value objects
* estados
* reglas
* invariantes
* relaciones
* unidades físicas
* geometría
* configuración de plantillas
* páginas imprimibles

Este documento no define:

* React
* Next.js
* Supabase
* APIs
* librerías de procesamiento
* librerías de PDF
* componentes UI

El dominio debe permanecer independiente de estas tecnologías.

---

# 2. Domain Language

Los términos utilizados en el código deben corresponder al lenguaje real del producto.

| Concepto          | Significado                                         |
| ----------------- | --------------------------------------------------- |
| Project           | Trabajo de una piñata                               |
| Image Asset       | Imagen utilizada como referencia                    |
| Template          | Molde físico generado                               |
| Template Part     | Pieza física del molde                              |
| Template Geometry | Geometría física de una plantilla                   |
| Template Page     | Página imprimible                                   |
| Cut Line          | Línea que debe cortarse                             |
| Fold Line         | Línea donde debe doblarse                           |
| Tab               | Pestaña utilizada para unir piezas                  |
| Alignment Mark    | Marca utilizada para alinear páginas                |
| Paper Format      | Formato físico del papel                            |
| Dimensions        | Dimensiones físicas                                 |
| Scale             | Relación entre geometría original y geometría final |
| Calibration Mark  | Referencia física para comprobar escala             |

No utilizar términos genéricos cuando exista un término de dominio específico.

---

# 3. Core Domain

El núcleo del dominio es:

```text
Template
    │
    ├── Dimensions
    ├── Geometry
    ├── Parts
    └── Pages
```

El objetivo es producir una representación física que pueda imprimirse y utilizarse para fabricar una piñata.

---

# 4. Domain Model

Conceptualmente:

```text
User
 │
 └── Project
      │
      ├── ImageAsset
      │
      └── Template
           │
           ├── TemplateGeometry
           │
           ├── TemplatePart[]
           │
           └── TemplatePage[]
```

---

# 5. Project

`Project` representa un trabajo creado por un usuario.

## Responsibilities

Un proyecto:

* pertenece a un usuario
* tiene una imagen de referencia
* puede tener una plantilla
* mantiene su configuración
* puede ser procesado nuevamente

## Conceptual model

```text
Project {
    id
    userId
    name
    status
    imageAsset
    template
    createdAt
    updatedAt
}
```

---

# 6. Project Identity

Cada proyecto debe tener un identificador único.

El dominio no debe depender de cómo se genere el ID.

Puede utilizar:

* UUID
* ULID
* otro identificador apropiado

La implementación concreta pertenece a infraestructura.

---

# 7. Project Status

Los estados iniciales son:

```text
DRAFT
PROCESSING
READY
ERROR
```

## DRAFT

El proyecto todavía no tiene una plantilla lista.

## PROCESSING

El sistema está procesando la imagen o generando la plantilla.

## READY

Existe una plantilla válida.

## ERROR

El último procesamiento falló.

El estado no debe utilizarse como sustituto de errores específicos.

---

# 8. ImageAsset

`ImageAsset` representa una imagen utilizada por el proyecto.

Conceptualmente:

```text
ImageAsset {
    id
    projectId
    mimeType
    width
    height
    storageReference
}
```

El dominio no debe conocer el proveedor de almacenamiento.

---

# 9. Image Processing States

El procesamiento de imagen puede representar:

```text
UPLOADED
PROCESSING
PROCESSED
FAILED
```

Estos estados describen el procesamiento del asset.

No deben confundirse con el estado del proyecto.

---

# 10. Template

`Template` representa un molde físico.

Es uno de los conceptos principales del dominio.

Conceptualmente:

```text
Template {
    id
    projectId
    dimensions
    geometry
    parts
    pages
    configuration
    generatorVersion
}
```

---

# 11. Template Responsibilities

Un Template debe garantizar:

* dimensiones válidas
* geometría válida
* configuración válida
* relación coherente entre geometría y dimensiones
* páginas derivadas correctamente

---

# 12. Template Dimensions

Las dimensiones físicas se expresan en milímetros.

```text
Width
Height
Depth
```

Ejemplo:

```text
Width: 800 mm
Height: 1000 mm
Depth: 200 mm
```

---

# 13. Millimeters

El dominio utiliza milímetros como unidad física principal.

Conceptualmente:

```typescript
type Millimeters = number;
```

Una cantidad debe interpretarse siempre como milímetros cuando pertenece al dominio geométrico.

Ejemplo:

```text
800
```

en un contexto de `Millimeters` significa:

```text
800 mm
```

No significa:

```text
800 px
```

---

# 14. Valid Millimeter Values

Una dimensión física debe:

* ser finita
* ser positiva cuando represente un tamaño
* no contener NaN
* no contener Infinity

No aceptar:

```text
0
negative
NaN
Infinity
```

para dimensiones físicas positivas.

---

# 15. Dimensions

`Dimensions` representa el tamaño físico de una entidad.

```text
Dimensions {
    width
    height
}
```

Para una plantilla 3D:

```text
TemplateDimensions {
    width
    height
    depth
}
```

---

# 16. Width

Width representa la extensión horizontal de la plantilla.

Debe ser mayor que cero.

---

# 17. Height

Height representa la extensión vertical de la plantilla.

Debe ser mayor que cero.

---

# 18. Depth

Depth representa la profundidad física de la estructura.

Debe ser mayor que cero cuando la plantilla requiere profundidad.

Una plantilla 2D puede no utilizar depth.

No inventar profundidad para plantillas que no la necesitan.

---

# 19. Physical Bounds

Una geometría debe poder calcular su bounding box.

```text
BoundingBox {
    minX
    minY
    maxX
    maxY
}
```

Todas las coordenadas están expresadas en milímetros.

---

# 20. Point

Un punto representa una posición física.

```text
Point {
    x
    y
}
```

Ejemplo:

```text
Point {
    x: 120 mm
    y: 350 mm
}
```

---

# 21. Coordinate System

El sistema de coordenadas utiliza:

```text
X → horizontal
Y → vertical
```

Convención inicial:

```text
origin = top-left
X increases to the right
Y increases downward
```

Esta convención debe mantenerse consistentemente.

---

# 22. Geometry

`TemplateGeometry` representa la forma física de una plantilla.

Debe ser independiente del rendering.

No debe contener:

* CSS
* React
* Canvas references
* DOM elements
* browser coordinates

---

# 23. Geometry Structure

Conceptualmente:

```text
TemplateGeometry
    │
    ├── paths
    ├── cutLines
    ├── foldLines
    ├── tabs
    └── alignmentMarks
```

---

# 24. Path

Un path representa una trayectoria geométrica.

Puede contener:

```text
Move
Line
Curve
Close
```

La representación concreta puede cambiar.

El dominio solamente necesita una representación geométrica consistente.

---

# 25. Polygon

Un polygon representa una figura cerrada.

Debe:

* contener puntos válidos
* mantener orden consistente
* poder calcular bounds
* poder calcular dimensiones

---

# 26. Closed Geometry

Una geometría destinada a representar un contorno de pieza debe poder determinar si está cerrada.

Una pieza física no debe depender de una línea visual para cerrar su contorno.

---

# 27. Geometry Invariants

Una geometría válida debe:

* contener coordenadas finitas
* utilizar milímetros
* no contener puntos NaN
* no contener Infinity
* tener bounds válidos
* poder transformarse sin perder información inválidamente
* mantener consistencia topológica cuando corresponda

---

# 28. Template Part

`TemplatePart` representa una pieza física.

Ejemplos:

```text
FRONT
BACK
SIDE
TOP
BOTTOM
```

---

# 29. Template Part Types

Los tipos iniciales:

```text
FRONT
BACK
SIDE
TOP
BOTTOM
CUSTOM
```

No asumir que todas las plantillas contienen todos los tipos.

---

# 30. Template Part Identity

Cada pieza debe tener un identificador estable dentro del template.

Ejemplo:

```text
FRONT
BACK
SIDE-01
SIDE-02
```

No utilizar únicamente el índice del array como identidad.

---

# 31. Template Part Geometry

Cada pieza debe tener geometría propia.

Conceptualmente:

```text
TemplatePart {
    id
    type
    geometry
}
```

La geometría de una pieza debe poder convertirse posteriormente en páginas imprimibles.

---

# 32. Cut Line

Una `CutLine` representa una línea que debe cortarse.

Es una entidad geométrica.

El estilo visual utilizado para representarla en:

* SVG
* Canvas
* PDF

es responsabilidad del renderer.

---

# 33. Fold Line

Una `FoldLine` representa una línea de doblado.

Debe ser diferente de una `CutLine`.

Una línea no debe depender de su color o estilo para determinar su significado.

---

# 34. Tab

Una `Tab` representa material adicional utilizado para unir piezas.

Debe estar asociada a una geometría concreta.

Conceptualmente:

```text
Tab {
    geometry
    attachment
}
```

---

# 35. Alignment Mark

Una `AlignmentMark` permite relacionar dos páginas.

Conceptualmente:

```text
AlignmentMark {
    id
    position
    connection
}
```

Debe poder determinar:

```text
Page A1 ↔ Page A2
```

---

# 36. Template Page

`TemplatePage` representa una hoja física imprimible.

Una página pertenece a:

* una plantilla
* una pieza
* un formato de papel

Conceptualmente:

```text
TemplatePage {
    id
    pieceId
    pageNumber
    paperFormat
    geometry
    alignmentMarks
    calibration
}
```

---

# 37. Page Identity

Cada página debe tener una identidad estable.

No depender únicamente del índice de un array.

Ejemplo:

```text
FRONT-A1
FRONT-A2
FRONT-B1
```

---

# 38. Page Number

Las páginas deben tener:

```text
pageNumber
totalPages
```

Ejemplo:

```text
Page 2 of 12
```

La numeración debe ser determinista.

---

# 39. Paper Format

`PaperFormat` representa un formato físico.

Formatos iniciales:

```text
A4
A3
LETTER
```

---

# 40. Paper Dimensions

Valores oficiales:

```text
A4:
210 × 297 mm

A3:
297 × 420 mm

LETTER:
215.9 × 279.4 mm
```

Estos valores deben existir en una única fuente de verdad.

No repetirlos en diferentes módulos.

---

# 41. Paper Orientation

La orientación puede ser:

```text
PORTRAIT
LANDSCAPE
```

La orientación cambia la presentación del papel, no la geometría física de la plantilla.

---

# 42. Printable Area

Una página tiene un área física y un área imprimible.

Conceptualmente:

```text
Paper
 └── Margins
      └── Printable Area
```

Si:

```text
paperWidth = 210 mm
marginLeft = 5 mm
marginRight = 5 mm
```

entonces:

```text
printableWidth = 200 mm
```

---

# 43. Margin

`Margin` representa espacio que no debe utilizarse para geometría imprimible.

Puede definirse:

```text
top
right
bottom
left
```

No asumir que todos los márgenes deben ser iguales.

---

# 44. Overlap

`Overlap` representa material compartido entre páginas para facilitar el ensamblaje.

Debe ser una dimensión física.

Ejemplo:

```text
overlap = 10 mm
```

El overlap no debe modificar la dimensión física de la plantilla.

Únicamente modifica cómo se distribuye sobre las páginas.

---

# 45. Scale

`Scale` representa la relación geométrica utilizada durante una transformación.

Ejemplo:

```text
source width = 400 mm
target width = 800 mm

scale = 2
```

La transformación debe aplicarse consistentemente.

---

# 46. Scale Invariant

Cuando se preserve proporción:

```text
scaleX = scaleY
```

No deformar la geometría accidentalmente.

Si el producto permite deformación explícita, debe existir una regla de dominio que lo indique.

No introducir deformación silenciosamente.

---

# 47. Template Configuration

La configuración mínima:

```text
TemplateConfiguration {
    dimensions
    paperFormat
    orientation
    margin
    overlap
}
```

No almacenar valores derivados como configuración primaria si pueden calcularse.

---

# 48. Derived Values

Ejemplos de valores derivados:

```text
printableWidth
printableHeight
pageCount
boundingBox
```

Deben calcularse cuando sea apropiado.

No duplicar información que puede derivarse de otra fuente.

---

# 49. Template Generation

La generación de una plantilla debe ser determinista cuando los inputs sean deterministas.

Conceptualmente:

```text
Image Geometry
+
Template Configuration
        ↓
Template
```

Mismos inputs:

```text
→ mismo resultado
```

salvo dependencias externas explícitamente no deterministas.

---

# 50. Geometry Transformation

Las transformaciones deben ser explícitas.

Operaciones:

```text
translate
scale
rotate
mirror
clip
```

No modificar geometría original inesperadamente.

Preferir transformaciones inmutables.

---

# 51. Translation

Trasladar una geometría:

```text
x' = x + dx
y' = y + dy
```

`dx` y `dy` están expresados en milímetros.

---

# 52. Scaling Transformation

Escalar:

```text
x' = x * scaleX
y' = y * scaleY
```

Cuando se conserva proporción:

```text
scaleX = scaleY
```

---

# 53. Rotation

La rotación debe utilizar un origen explícito.

Nunca asumir silenciosamente que la rotación ocurre alrededor de:

* `(0,0)`
* centro de pantalla
* centro del canvas

El punto de referencia debe estar definido.

---

# 54. Clipping

El clipping se utiliza para dividir una geometría entre páginas.

El resultado debe conservar la escala física.

No recalcular dimensiones basándose en pixels.

---

# 55. Tiling Domain

Tiling transforma:

```text
TemplateGeometry
```

en:

```text
TemplatePage[]
```

considerando:

```text
PaperFormat
Orientation
Margin
Overlap
```

---

# 56. Tiling Invariants

El algoritmo de tiling debe garantizar:

1. La geometría no se escala accidentalmente.
2. La geometría no se deforma.
3. Las páginas respetan sus dimensiones físicas.
4. Las páginas respetan los márgenes.
5. Las páginas conservan suficiente información para reconstruir la plantilla.
6. El resultado es determinista.
7. Las páginas pueden identificarse.

---

# 57. Tiling and Overlap

El overlap modifica la región de cada página.

No modifica:

```text
Template width
Template height
```

Ejemplo:

```text
Template = 800 × 1000 mm
```

Después de tiling:

```text
Template sigue siendo 800 × 1000 mm
```

El overlap solamente afecta la distribución entre hojas.

---

# 58. Page Reconstruction

Dadas las páginas generadas y sus relaciones de alineación, debe ser posible entender cómo reconstruir la plantilla.

El sistema no debe depender únicamente del orden visual de las páginas.

---

# 59. Calibration

`CalibrationMark` representa una referencia física.

Valor inicial:

```text
100 mm
```

Debe generarse utilizando geometría física.

---

# 60. Calibration Invariant

Una marca de calibración de:

```text
100 mm
```

debe representar físicamente:

```text
100 mm
```

en el PDF a escala 100%.

---

# 61. Template Generator Version

Cada template generado debe almacenar una versión del generador.

Ejemplo:

```text
generatorVersion = 1
```

Esto permite identificar qué algoritmo produjo el resultado.

No cambiar silenciosamente el significado de templates históricos.

---

# 62. Generator Determinism

Para:

```text
same input
same configuration
same generator version
```

debe producirse el mismo resultado siempre que los servicios externos involucrados sean deterministas.

---

# 63. Domain Errors

Los errores deben representar violaciones reales del dominio.

Ejemplos:

```text
InvalidDimensionsError
InvalidGeometryError
InvalidPaperFormatError
InvalidScaleError
InvalidOverlapError
InvalidMarginError
InvalidTemplateError
```

---

# 64. Invalid Dimensions

Dimensiones inválidas incluyen:

```text
width <= 0
height <= 0
depth < 0
NaN
Infinity
```

Las reglas exactas pueden variar dependiendo del tipo de template.

---

# 65. Invalid Geometry

Una geometría es inválida si:

* contiene coordenadas no finitas
* no puede calcular bounds
* contiene estructura inconsistente
* viola las invariantes necesarias para la operación

---

# 66. Domain vs Infrastructure Errors

El dominio no debe conocer errores específicos de:

```text
Supabase
HTTP
Fetch
AWS
OpenAI
PDF library
Canvas
```

Esos pertenecen a infraestructura.

---

# 67. Domain Purity

El dominio NO debe importar:

```text
React
Next.js
Supabase
Browser APIs
Node.js APIs
PDF libraries
Image libraries
```

El dominio debe poder ejecutarse en un entorno de JavaScript/TypeScript puro.

---

# 68. Immutability

Siempre que sea razonable:

```text
Input Geometry
      ↓
Transformation
      ↓
New Geometry
```

No modificar silenciosamente la geometría original.

Esto facilita:

* undo/redo
* debugging
* testing
* reproducibility

---

# 69. Equality

Las entidades deben utilizar identidad cuando corresponda.

Los Value Objects pueden utilizar igualdad por valor.

Ejemplo:

```text
Dimensions(800, 1000)
```

es igual a otro:

```text
Dimensions(800, 1000)
```

independientemente de su referencia en memoria.

---

# 70. Entity vs Value Object

Utilizar Entity cuando:

```text
identity matters
```

Ejemplos:

```text
Project
Template
TemplatePart
TemplatePage
ImageAsset
```

Utilizar Value Object cuando:

```text
value matters
```

Ejemplos:

```text
Dimensions
Point
Scale
Margin
PaperFormat
```

No convertir todo en Entity.

---

# 71. Domain Services

Un Domain Service puede utilizarse cuando una operación:

* pertenece claramente al dominio
* no encaja naturalmente en una entidad
* necesita combinar varios conceptos

Ejemplos potenciales:

```text
TemplateGenerator
GeometryScaler
TemplateTiler
```

No crear Domain Services por cada función.

---

# 72. Domain Service Example

Conceptualmente:

```text
TemplateTiler
    ↓
TemplateGeometry
+
PaperFormat
+
Margin
+
Overlap
    ↓
TemplatePage[]
```

---

# 73. Domain Events

No utilizar Domain Events en el MVP salvo que exista una necesidad real.

No implementar Event Sourcing.

No implementar un Event Bus únicamente por previsión futura.

---

# 74. Transactions

El dominio no debe conocer transacciones de base de datos.

La coordinación transaccional pertenece a Application/Infrastructure.

---

# 75. Persistence Model vs Domain Model

El modelo de base de datos no tiene que ser idéntico al modelo de dominio.

Puede existir:

```text
Database Record
       ↓
Mapper
       ↓
Domain Entity
```

Esto evita contaminar el dominio con detalles de persistencia.

---

# 76. Serialization

Cuando una entidad de dominio necesite persistirse:

utilizar una representación explícita.

No serializar indiscriminadamente objetos completos si contienen comportamiento.

---

# 77. Domain Versioning

Si cambia una regla importante de geometría:

considerar incrementar la versión del generador.

Ejemplo:

```text
generatorVersion 1
generatorVersion 2
```

No modificar retroactivamente el significado de un template existente sin una estrategia explícita.

---

# 78. Future 3D

El modelo 2D es la base inicial.

Una futura representación 3D puede consumir:

```text
TemplateGeometry
+
TemplateParts
```

No introducir conceptos 3D en el MVP sin necesidad.

---

# 79. Future AI

La IA no forma parte del dominio.

La IA es un mecanismo que puede producir información.

Ejemplo:

```text
AI Provider
     ↓
Processed Image / Semantic Result
     ↓
Domain Validation
     ↓
Geometry
```

El dominio nunca debe asumir que una respuesta de IA es correcta.

---

# 80. Domain Rules Summary

Las reglas críticas son:

```text
1. Physical dimensions use millimeters.

2. Geometry is independent from rendering.

3. Template dimensions represent physical dimensions.

4. Tiling does not change physical template dimensions.

5. Overlap affects page distribution, not template size.

6. Calibration must preserve physical dimensions.

7. Scaling must be explicit.

8. Proportional scaling must not distort geometry.

9. Geometry transformations must be deterministic.

10. Template generation should be deterministic.

11. Domain logic must not depend on infrastructure.

12. Generated templates must identify their generator version.
```

---

# 81. Domain Acceptance Criteria

El dominio debe poder demostrar mediante tests que:

```text
[ ] Invalid dimensions are rejected.
[ ] Invalid geometry is rejected.
[ ] Millimeter values remain physical.
[ ] Scaling preserves geometry correctly.
[ ] Proportional scaling does not distort the template.
[ ] Bounding boxes are calculated correctly.
[ ] Paper dimensions are correct.
[ ] Printable areas respect margins.
[ ] Tiling does not alter physical dimensions.
[ ] Overlap only affects page distribution.
[ ] Pages have deterministic identifiers.
[ ] Alignment relationships are preserved.
[ ] Calibration marks represent the requested physical length.
[ ] Template generation is deterministic.
```

---

# 82. Final Domain Principle

El dominio de Piñata Maker representa una realidad física.

Por lo tanto:

> **La geometría no es una representación visual; es una representación de un objeto físico que debe poder imprimirse y medirse.**

Todo el sistema debe proteger esta propiedad.

Un preview incorrecto puede ser molesto.

Una geometría físicamente incorrecta hace que el producto falle.

La prioridad del dominio es:

```text
Physical Accuracy
        ↓
Domain Correctness
        ↓
Determinism
        ↓
Testability
        ↓
Rendering
```
