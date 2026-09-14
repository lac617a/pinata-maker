# Piñata Maker — Template

**Version:** 1.0
**Status:** Draft
**Last Updated:** 2026-09-14

---

# 1. Purpose

Este documento define el concepto de `Template` dentro de Piñata Maker.

Una plantilla representa la estructura física necesaria para construir una piñata.

Una plantilla puede estar formada por:

* una o varias piezas
* contornos
* caras
* pestañas
* líneas de corte
* líneas de doblez
* relaciones entre piezas
* dimensiones físicas

---

# 2. Core Principle

Una `Template` no es:

```text
Image
PDF
PrintLayout
```

Una `Template` es una representación estructurada de:

```text
"Qué piezas necesito y cómo se relacionan para construir esta piñata."
```

---

# 3. Domain Relationship

```text
Image
  ↓
Image Processing
  ↓
Geometry
  ↓
Template
  ↓
Printing
  ↓
PDF
```

Cada capa tiene una responsabilidad diferente.

---

# 4. Template Responsibilities

Template es responsable de:

```text
pieces
faces
physical relationships
cut boundaries
fold boundaries
tabs
assembly relationships
dimensions
```

No es responsable de:

```text
image segmentation
AI
pixel processing
PDF generation
page tiling
paper selection
browser rendering
file download
```

---

# 5. Template vs Geometry

`Geometry` responde:

```text
"What shape is this?"
```

`Template` responde:

```text
"How does this shape become a physical piñata template?"
```

Ejemplo:

```text
Geometry
└── Animal silhouette

Template
├── Front face
├── Back face
├── Side wall
├── Tabs
└── Assembly relationships
```

---

# 6. Template vs PrintLayout

`Template` representa:

```text
physical construction
```

`PrintLayout` representa:

```text
how that construction is distributed across paper
```

Por ejemplo:

```text
Template
└── Front face: 500 × 400 mm

PrintLayout
├── Page 1
├── Page 2
├── Page 3
└── Page 4
```

---

# 7. Template Identity

Una plantilla debe tener una identidad estable.

Conceptualmente:

```typescript
type TemplateId = string;
```

No utilizar el nombre de archivo como identidad.

---

# 8. Template Model

Conceptualmente:

```typescript
type Template = {
    id: TemplateId;
    name: string;
    pieces: TemplatePiece[];
};
```

El modelo final puede contener más información.

---

# 9. Template Name

El nombre sirve para identificación humana.

Ejemplo:

```text
"Elefante"
"Unicornio"
"Estrella"
```

El nombre no debe utilizarse como identificador técnico.

---

# 10. Template Dimensions

La plantilla debe poder determinar sus dimensiones físicas.

Conceptualmente:

```text
width
height
depth
```

cuando corresponda.

Las dimensiones deben estar expresadas en:

```text
millimeters
```

---

# 11. Width

`width` representa la dimensión física horizontal de referencia.

Ejemplo:

```text
width = 800 mm
```

---

# 12. Height

`height` representa la dimensión física vertical de referencia.

Ejemplo:

```text
height = 1000 mm
```

---

# 13. Depth

La profundidad representa el volumen físico de la piñata.

Ejemplo:

```text
depth = 200 mm
```

La profundidad no debe inferirse arbitrariamente desde una imagen 2D.

---

# 14. 2D Source vs 3D Construction

Una imagen normalmente proporciona:

```text
2D silhouette
```

Una piñata física requiere:

```text
2D pieces
+
assembly relationships
```

El sistema debe hacer explícita esta transformación.

---

# 15. Template Pieces

Una plantilla está compuesta por piezas.

Ejemplo:

```text
Template
├── Front
├── Back
├── Side
├── Side
├── Tab
└── Tab
```

No asumir que todas las figuras requieren la misma cantidad de piezas.

---

# 16. TemplatePiece

Conceptualmente:

```typescript
type TemplatePiece = {
    id: PieceId;
    geometry: Geometry;
    role: PieceRole;
};
```

---

# 17. Piece Identity

Cada pieza debe tener un identificador estable dentro de la plantilla.

Ejemplo:

```text
front
back
side-01
side-02
```

El identificador debe ser único.

---

# 18. Piece Roles

Los roles iniciales pueden ser:

```text
FRONT
BACK
SIDE
TAB
INTERNAL
REFERENCE
```

No agregar roles sin una necesidad de dominio real.

---

# 19. Front Piece

La pieza frontal representa una cara principal.

Ejemplo:

```text
┌───────────────┐
│               │
│     FRONT     │
│               │
└───────────────┘
```

Su geometría corresponde a la cara exterior.

---

# 20. Back Piece

La pieza posterior representa otra cara principal.

Puede ser:

```text
same geometry
```

o:

```text
mirrored geometry
```

según la figura.

No asumir que siempre debe ser idéntica.

---

# 21. Side Piece

Las piezas laterales conectan las caras principales.

Conceptualmente:

```text
Front
  │
  │ Side
  │
Back
```

---

# 22. Side Depth

La profundidad de una pieza lateral debe derivarse de la configuración física de la plantilla.

Ejemplo:

```text
depth = 200 mm
```

No utilizar valores arbitrarios.

---

# 23. Tabs

Las pestañas permiten unir piezas.

Conceptualmente:

```text
┌──────────────┐
│              │
│    FACE      │
│              │
└──────────────┘
     ┌─────┐
     │ TAB │
     └─────┘
```

---

# 24. Tab Responsibilities

Una tab debe representar:

```text
cut boundary
fold line
attachment relationship
```

No es simplemente un rectángulo agregado visualmente.

---

# 25. Tab Geometry

Una pestaña debe tener geometría propia.

Conceptualmente:

```text
Tab {
    boundary
    foldLine
    attachment
}
```

---

# 26. Tab Width

El ancho de una pestaña debe ser una configuración física.

Ejemplo:

```text
tabWidth = 15 mm
```

No debe estar hardcodeado en múltiples algoritmos.

---

# 27. Tab Generation

La generación de tabs debe ser una operación de dominio explícita.

Ejemplo:

```text
Face
 ↓
GenerateTabs
 ↓
FaceWithTabs
```

No generar tabs dentro del PDF renderer.

---

# 28. Tab Placement

Las tabs deben seguir reglas geométricas.

No colocar:

```text
random tabs
```

o:

```text
every N pixels
```

sin considerar la geometría física.

---

# 29. Sharp Corners

En esquinas pronunciadas puede ser necesario:

```text
split tab
```

o:

```text
reduce tab width
```

La estrategia debe ser geométrica y determinista.

---

# 30. Curves

En curvas puede ser necesario generar tabs segmentadas.

Ejemplo conceptual:

```text
Curve
╭────────────╮
╰────────────╯
||||||||||||||
```

La distribución debe depender de la geometría.

No utilizar una cantidad fija para todas las figuras.

---

# 31. Tab Spacing

El espacio entre pestañas debe ser configurable.

Conceptualmente:

```text
tabWidth
tabSpacing
```

Las unidades son:

```text
mm
```

---

# 32. Minimum Segment Length

No generar tabs en segmentos demasiado pequeños.

La regla debe utilizar dimensiones físicas.

Ejemplo:

```text
segmentLength < minimumTabSegment
```

→ no crear una tab completa.

---

# 33. Cut Geometry

Cada pieza debe identificar qué geometría representa un corte.

Conceptualmente:

```text
Piece
├── boundary
├── holes
└── cutLines
```

---

# 34. Fold Geometry

Las líneas de doblez deben estar separadas semánticamente.

```text
Piece
├── cutLines
└── foldLines
```

Una línea de doblez no es un corte.

---

# 35. Fold Lines

Las líneas de doblez representan:

```text
where material should bend
```

No deben modificar el límite exterior de la pieza.

---

# 36. Cut Lines

Las líneas de corte representan:

```text
where material should be cut
```

El contorno exterior normalmente pertenece a esta categoría.

---

# 37. Internal Lines

Una pieza puede contener líneas internas.

Ejemplo:

```text
fold line
reference line
alignment line
```

Estas líneas no necesariamente representan cortes.

---

# 38. Piece Geometry

La geometría debe reutilizar las estructuras definidas en:

```text
geometry.md
```

No crear un segundo sistema geométrico dentro de Template.

---

# 39. Geometry Ownership

Template posee:

```text
relationship to geometry
```

pero Geometry posee:

```text
mathematical representation
```

---

# 40. Example

```text
Template
│
├── Piece: Front
│   └── Polygon
│
├── Piece: Back
│   └── Polygon
│
└── Piece: Side
    ├── Polygon
    ├── Fold Lines
    └── Tabs
```

---

# 41. Piece Relationships

Las piezas pueden tener relaciones.

Ejemplo:

```text
Front
   ↕
Side
   ↕
Back
```

La relación puede representar:

```text
attachment
adjacency
fold
assembly
```

---

# 42. Assembly Relationship

Conceptualmente:

```typescript
type AssemblyRelation = {
    fromPiece: PieceId;
    toPiece: PieceId;
    relation: AssemblyRelationType;
};
```

---

# 43. Relationship Types

MVP:

```text
ATTACH
ADJACENT
```

Otros tipos pueden agregarse cuando exista una necesidad concreta.

---

# 44. Attachment

`ATTACH` significa:

```text
these pieces are intended to connect
```

No define por sí solo cómo se imprimen.

---

# 45. Adjacency

`ADJACENT` indica que dos piezas están relacionadas espacialmente.

No implica necesariamente que compartan una pestaña.

---

# 46. Assembly Graph

Una plantilla puede representarse como un grafo:

```text
        Front
       /     \
    Side     Side
       \     /
        Back
```

Esto permite representar estructuras complejas sin asumir una única topología.

---

# 47. Template Graph

Conceptualmente:

```text
Pieces = Nodes
Relations = Edges
```

El grafo debe ser válido.

---

# 48. Orphan Pieces

Una pieza que no tiene ninguna relación puede ser válida:

```text
decorative piece
independent piece
```

pero no debe ocurrir accidentalmente.

---

# 49. Duplicate Pieces

Dos piezas pueden compartir geometría.

Ejemplo:

```text
Front
Back
```

No duplicar manualmente toda la geometría si el dominio puede representar:

```text
same geometry + different transform
```

---

# 50. Geometry Reuse

Cuando dos piezas son geométricamente iguales:

```text
BaseGeometry
   ├── Front instance
   └── Back instance
```

puede utilizarse reutilización de geometría.

Esto evita inconsistencias.

---

# 51. Transformations

Una pieza puede tener:

```text
translation
rotation
scale
reflection
```

pero las transformaciones deben ser explícitas.

---

# 52. Template Transformations

Una transformación de pieza debe mantener coherencia física.

Ejemplo:

```text
rotation = 180°
```

no cambia:

```text
width
height
```

solamente cambia su orientación.

---

# 53. Scale Restrictions

No aplicar escala arbitraria a una pieza individual si eso altera la construcción.

Una plantilla debe mantener relaciones físicas coherentes.

---

# 54. Mirror

Un `mirror` puede utilizarse para crear:

```text
Back
```

desde:

```text
Front
```

si la construcción lo permite.

La operación debe ser explícita.

---

# 55. Physical Consistency

Si:

```text
Front width = 800 mm
Back width = 800 mm
```

y:

```text
Side depth = 200 mm
```

la plantilla debe mantener estas relaciones durante el pipeline de impresión.

---

# 56. Template Dimensions

Las dimensiones globales deben derivarse de sus piezas cuando sea posible.

No almacenar:

```text
template.width = 800
```

y tener piezas que realmente ocupan:

```text
820 mm
```

sin una razón explícita.

---

# 57. Bounding Box

La plantilla puede calcular:

```text
minX
minY
maxX
maxY
```

sobre todas sus piezas.

Resultado:

```text
templateBounds
```

---

# 58. Bounds vs Construction Dimensions

Distinguir:

```text
construction dimensions
```

de:

```text
geometric bounds
```

Ejemplo:

```text
Front = 800 mm
Tab extends 15 mm
```

El bounding box puede ser:

```text
815 mm
```

aunque la cara siga siendo:

```text
800 mm
```

---

# 59. Template Width

La definición de `width` debe estar documentada.

No asumir automáticamente que:

```text
width = boundingBox.width
```

si las tabs o elementos auxiliares forman parte del bounding box.

---

# 60. Template Height

Aplican las mismas reglas.

Debe distinguirse entre:

```text
physical target height
```

y:

```text
printable geometry bounds
```

---

# 61. Target Dimensions

Una plantilla puede tener dimensiones objetivo:

```text
targetWidth
targetHeight
targetDepth
```

Estas representan el tamaño físico deseado del producto.

---

# 62. Generated Dimensions

La geometría resultante puede tener:

```text
generatedWidth
generatedHeight
generatedDepth
```

La diferencia entre target y generated debe ser detectable.

---

# 63. Dimension Validation

Antes de imprimir:

```text
validateTemplateDimensions()
```

Debe verificar:

```text
positive dimensions
consistent piece relationships
valid geometry
```

---

# 64. Depth Validation

La profundidad debe ser:

```text
depth > 0
```

cuando la plantilla sea tridimensional.

---

# 65. 2D Templates

No todas las plantillas necesitan profundidad.

Para una figura plana:

```text
depth = undefined
```

puede ser válido.

El modelo debe distinguir:

```text
2D template
```

de:

```text
3D construction template
```

---

# 66. Template Types

No implementar una lista enorme de tipos inicialmente.

MVP puede utilizar:

```text
FLAT
VOLUME
CUSTOM
```

si realmente son necesarios.

---

# 67. Avoid Shape-Specific Domain Classes

No crear inicialmente:

```text
ElephantTemplate
UnicornTemplate
StarTemplate
DogTemplate
CatTemplate
```

La forma debe estar representada mediante geometría y configuración.

Crear clases específicas solamente cuando exista comportamiento de dominio realmente diferente.

---

# 68. Parametric Templates

Una plantilla puede ser paramétrica.

Ejemplo:

```text
width
height
depth
```

y producir geometría.

---

# 69. Parametric Generation

Conceptualmente:

```text
Parameters
   ↓
Template Generator
   ↓
Template
```

La generación debe ser determinista.

---

# 70. Image-Based Templates

Otra estrategia:

```text
Image
 ↓
Contour
 ↓
Template
```

Aquí la geometría se deriva de una imagen.

La imagen no debe permanecer como dependencia obligatoria después de generar la geometría.

---

# 71. Source Traceability

Puede ser útil conservar:

```text
sourceImageId
```

para saber de dónde provino una plantilla.

Esto es metadata.

No es la geometría.

---

# 72. Template Version

Las plantillas deben tener versión.

Ejemplo:

```text
templateVersion = 1
```

Esto permite detectar cambios de estructura.

---

# 73. Geometry Version

También puede existir:

```text
geometryVersion
```

porque la geometría puede cambiar independientemente del modelo de plantilla.

---

# 74. Template Snapshot

Cuando una plantilla sea utilizada para generar un documento, debe ser posible identificar exactamente:

```text
template version
geometry version
printing configuration
```

que produjeron el resultado.

---

# 75. Immutability

Una plantilla utilizada para generar un documento debería tratarse como inmutable durante la generación.

Conceptualmente:

```text
Template
   ↓
Generate PrintLayout
```

No:

```text
Template
   ↓
mutate
   ↓
render
```

---

# 76. Template Builder

Si se necesita construir una plantilla compleja:

```text
TemplateBuilder
```

puede encapsular:

```text
addPiece()
addRelation()
addTab()
addFoldLine()
build()
```

Pero no crear un builder si el modelo simple es suficiente.

---

# 77. Factory Pattern

Un `TemplateFactory` puede ser útil para:

```text
default template
parametric template
image-derived template
```

No utilizar Factory únicamente por seguir un patrón.

Debe existir una razón de dominio.

---

# 78. Strategy Pattern

Una estrategia puede ser útil para diferentes métodos de generación:

```text
ContourTemplateStrategy
ParametricTemplateStrategy
```

Ejemplo:

```text
TemplateGenerationStrategy
          │
     ┌────┴─────┐
     ↓          ↓
Contour      Parametric
```

---

# 79. Strategy Rule

Utilizar Strategy cuando:

```text
algorithms vary
```

No cuando:

```text
there is only one algorithm
```

---

# 80. Aggregate Boundary

`Template` debe ser tratado como un agregado del dominio cuando corresponda.

El agregado controla:

```text
piece identity
relationships
validity
invariants
```

---

# 81. Template Invariants

Una plantilla válida debe cumplir:

```text
unique piece IDs
valid geometry
valid relationships
positive physical dimensions
no invalid references
```

---

# 82. Piece Reference Integrity

Una relación:

```text
Front → Side
```

debe apuntar a piezas existentes.

Nunca permitir:

```text
Front → MissingPiece
```

---

# 83. Circular Relationships

Los ciclos en el assembly graph pueden ser válidos:

```text
Front → Side → Back → Side → Front
```

Por lo tanto no prohibir ciclos automáticamente.

La validez depende del tipo de relación.

---

# 84. Geometry Validity

Cada pieza debe cumplir las reglas de:

```text
geometry.md
```

Por ejemplo:

```text
valid polygon
finite coordinates
non-zero dimensions
```

---

# 85. Overlapping Pieces

Las piezas pueden compartir espacio en coordenadas locales/globales.

No considerar automáticamente un overlap como error.

Puede existir una razón de construcción.

---

# 86. Duplicate Geometry

Dos piezas pueden tener exactamente la misma geometría.

Esto no constituye un error.

---

# 87. Empty Pieces

Una pieza sin geometría válida no debe formar parte de una plantilla imprimible.

Debe producir:

```text
INVALID_TEMPLATE_PIECE
```

---

# 88. Template Validation

Debe existir:

```text
validateTemplate()
```

antes de:

```text
Printing
```

---

# 89. Validation Order

Pipeline recomendado:

```text
Template
 ↓
Validate identity
 ↓
Validate pieces
 ↓
Validate geometry
 ↓
Validate relations
 ↓
Validate dimensions
 ↓
Valid Template
```

---

# 90. Error Classification

Errores posibles:

```text
INVALID_TEMPLATE
INVALID_PIECE
DUPLICATE_PIECE_ID
MISSING_PIECE_REFERENCE
INVALID_GEOMETRY
INVALID_DIMENSIONS
INVALID_RELATION
EMPTY_TEMPLATE
```

---

# 91. Template Serialization

Si la plantilla necesita persistencia, debe tener una representación serializable.

Ejemplo conceptual:

```text
Template
 ↓
DTO / Persistence Model
 ↓
Database
```

No utilizar directamente entidades de dominio como modelos de base de datos si la arquitectura requiere separación.

---

# 92. Template DTO

El DTO puede contener:

```text
id
name
version
pieces
relations
dimensions
metadata
```

La estructura concreta pertenece a la capa correspondiente.

---

# 93. Persistence Independence

El dominio no debe conocer:

```text
Supabase
PostgreSQL
Prisma
MongoDB
```

ni ningún proveedor específico.

---

# 94. Template Serialization Version

Si el formato persistido evoluciona:

```text
schemaVersion
```

puede utilizarse para migraciones.

---

# 95. Template Export

Si en el futuro se permite exportar plantillas:

```text
JSON
SVG
PDF
```

cada formato debe ser un adapter.

No mezclar formatos dentro del dominio.

---

# 96. Testing

Debe probarse:

```text
Template creation
Piece creation
Piece relationships
Geometry validation
Dimension validation
Tab generation
Fold lines
Transformations
Serialization
```

---

# 97. Template Construction Test

Ejemplo:

```text
Front
+
Back
+
Side
+
Tabs
```

debe producir una plantilla válida.

---

# 98. Invalid Reference Test

Una relación hacia una pieza inexistente debe fallar:

```text
Front → Missing
```

Resultado:

```text
MISSING_PIECE_REFERENCE
```

---

# 99. Dimension Test

Para:

```text
width = 800 mm
height = 1000 mm
depth = 200 mm
```

validar que:

```text
width > 0
height > 0
depth > 0
```

y que las piezas respeten las reglas correspondientes.

---

# 100. Tab Test

Para un segmento:

```text
100 mm
```

con:

```text
tabWidth = 15 mm
```

el algoritmo debe generar una geometría válida.

No asumir una cantidad específica de tabs sin considerar la estrategia configurada.

---

# 101. Regression Tests

Cada bug que afecte:

```text
piece geometry
tabs
folds
relationships
dimensions
```

debe convertirse en un regression test.

---

# 102. Property Tests

Cuando sea útil:

```text
Mirroring preserves dimensions.

Rotation preserves geometry size.

Scaling changes dimensions predictably.

Translation does not change dimensions.

Adding metadata does not change geometry.

Adding page layout does not modify Template.
```

---

# 103. Template → Printing Contract

El contrato debe ser:

```text
Template
   ↓
validated
   ↓
Printing
   ↓
PrintLayout
```

Printing puede consultar:

```text
pieces
geometry
dimensions
```

pero no debe modificar la plantilla original.

---

# 104. Template → PDF Contract

No debe existir:

```text
Template → PDF
```

directamente.

El flujo obligatorio es:

```text
Template
   ↓
Printing
   ↓
PrintLayout
   ↓
PDF
```

---

# 105. Template → Image Processing

Tampoco debe existir dependencia inversa:

```text
Template
   ↓
Image Processing
```

Image Processing produce información.

Template consume geometría procesada.

---

# 106. Architecture

```text
┌─────────────────────────────┐
│      Image Processing       │
│                             │
│ Image → Mask → Contour      │
└──────────────┬──────────────┘
               ↓
┌─────────────────────────────┐
│        Geometry Domain      │
│                             │
│ Points / Paths / Polygons   │
└──────────────┬──────────────┘
               ↓
┌─────────────────────────────┐
│        Template Domain      │
│                             │
│ Pieces                      │
│ Tabs                        │
│ Fold Lines                  │
│ Relations                   │
│ Dimensions                  │
└──────────────┬──────────────┘
               ↓
┌─────────────────────────────┐
│       Printing Domain       │
│                             │
│ PrintLayout                 │
│ Pages                       │
│ Tiling                      │
└──────────────┬──────────────┘
               ↓
┌─────────────────────────────┐
│         PDF Renderer        │
└─────────────────────────────┘
```

---

# 107. Critical Rules

Estas reglas son obligatorias:

```text
1. Template is a domain concept.

2. Template is not an image.

3. Template is not a PDF.

4. Template is not a PrintLayout.

5. Geometry belongs to Geometry Domain.

6. Template owns relationships between physical pieces.

7. All physical dimensions use millimeters.

8. Piece IDs must be unique.

9. Piece references must be valid.

10. Invalid geometry cannot enter a printable Template.

11. Cut lines and fold lines are semantically different.

12. Tabs are physical construction elements.

13. Tabs must be generated deterministically.

14. Depth must not be inferred silently from a 2D image.

15. Template dimensions must remain physically consistent.

16. Printing must not mutate Template.

17. PDF must not consume Template directly.

18. Provider-specific image processing must not enter Template.

19. Shape-specific classes should not be created without domain justification.

20. Design patterns are introduced only when they solve an actual variation problem.

21. Template versions must be traceable.

22. Geometry versions must be traceable.

23. Validity must be checked before printing.

24. Template generation must be deterministic whenever possible.
```

---

# 108. Acceptance Criteria

Template se considera correcto cuando:

```text
[ ] A Template can contain multiple pieces.

[ ] Pieces have stable IDs.

[ ] Pieces contain valid Geometry.

[ ] Pieces can have different roles.

[ ] Front and Back pieces are supported.

[ ] Side pieces are supported.

[ ] Tabs are represented explicitly.

[ ] Fold lines are represented explicitly.

[ ] Cut lines are represented explicitly.

[ ] Piece relationships are supported.

[ ] Assembly relationships are validated.

[ ] Physical dimensions are represented in millimeters.

[ ] Width, height and depth can be represented when applicable.

[ ] 2D templates are supported.

[ ] 3D construction templates are supported.

[ ] Geometry can be reused between pieces.

[ ] Explicit transformations are supported.

[ ] Template validation exists.

[ ] Invalid references are rejected.

[ ] Invalid geometry is rejected.

[ ] Template versions are traceable.

[ ] Geometry versions are traceable.

[ ] Template can be consumed by Printing.

[ ] Printing cannot mutate Template.

[ ] PDF generation does not depend directly on Template.

[ ] Template can be tested independently from PDF and image providers.
```

---

# 109. Final Principle

Una plantilla no debe entenderse como:

```text
"una imagen que voy a imprimir"
```

sino como:

```text
"una descripción física de cómo construir una piñata"
```

Por eso el flujo correcto es:

```text
                IMAGE
                  │
                  ▼
          IMAGE PROCESSING
                  │
                  ▼
               SHAPE
                  │
                  ▼
              GEOMETRY
                  │
                  ▼
              TEMPLATE
        ┌─────────┼─────────┐
        ▼         ▼         ▼
      Pieces    Tabs      Folds
        │         │         │
        └─────────┼─────────┘
                  ▼
               PRINTING
                  │
                  ▼
             PRINT LAYOUT
                  │
                  ▼
                 PDF
```

La responsabilidad de cada capa debe permanecer aislada.

> **Geometry describes the shape. Template describes the construction. Printing describes the paper. PDF describes the output.**
