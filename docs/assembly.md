# Piñata Maker — Assembly

**Version:** 1.0
**Status:** Draft
**Last Updated:** 2026-09-14

---

# 1. Purpose

Este documento define las reglas del dominio relacionadas con el ensamblaje físico de una plantilla de piñata.

Assembly responde:

> **¿Cómo se conectan y en qué orden se ensamblan las piezas impresas para construir la piñata?**

No es responsable de:

* procesar imágenes
* generar contornos
* calcular geometría
* distribuir piezas sobre papel
* generar PDFs
* renderizar la interfaz

---

# 2. Core Principle

El ensamblaje representa la relación entre:

```text
Template Pieces
      ↓
Assembly Relations
      ↓
Assembly Instructions
      ↓
Physical Piñata
```

La plantilla define las piezas.

Assembly define cómo esas piezas se conectan.

---

# 3. Domain Position

El flujo completo es:

```text
Image
  ↓
Image Processing
  ↓
Geometry
  ↓
Template
  ↓
Assembly
  ↓
Printing
  ↓
PrintLayout
  ↓
PDF
```

Assembly puede utilizar información de Template, pero no debe modificarla.

---

# 4. Assembly Responsibilities

Assembly es responsable de:

```text
piece relationships
attachment points
connection semantics
assembly order
piece identification
matching tabs
fold relationships
assembly validation
assembly instructions
```

---

# 5. Assembly Is Not Geometry

Geometry responde:

```text
"What shape is this?"
```

Assembly responde:

```text
"How are these shapes connected?"
```

No implementar algoritmos geométricos dentro de Assembly.

---

# 6. Assembly Is Not Printing

Printing responde:

```text
"How do these pieces fit on paper?"
```

Assembly responde:

```text
"How do these pieces fit together physically?"
```

Son problemas diferentes.

---

# 7. Assembly Model

Conceptualmente:

```typescript
type Assembly = {
    id: AssemblyId;
    templateId: TemplateId;
    steps: AssemblyStep[];
    connections: AssemblyConnection[];
};
```

La implementación final puede evolucionar según las necesidades del dominio.

---

# 8. Assembly Identity

Cada ensamblaje debe tener una identidad estable:

```typescript
type AssemblyId = string;
```

No utilizar:

```text
filename
timestamp
array index
```

como identidad.

---

# 9. Assembly Connection

Una conexión representa una relación física entre dos piezas.

Conceptualmente:

```typescript
type AssemblyConnection = {
    fromPiece: PieceId;
    toPiece: PieceId;
    type: ConnectionType;
};
```

---

# 10. Connection Types

MVP:

```text
TAB
EDGE
FOLD
```

No crear decenas de tipos sin una necesidad real.

---

# 11. TAB Connection

Una conexión mediante pestaña significa:

```text
Piece A
   │
   │ tab
   ▼
Piece B
```

La pestaña pertenece físicamente a una pieza y se utiliza para conectarla con otra.

---

# 12. EDGE Connection

Una conexión `EDGE` representa dos bordes que deben coincidir.

Ejemplo:

```text
Edge A
───────
       ╲
        ╲
         ───────
         Edge B
```

No implica necesariamente que exista una tab.

---

# 13. FOLD Connection

Una conexión `FOLD` indica que una pieza debe doblarse respecto a otra parte de la misma estructura.

---

# 14. Connection Direction

Las conexiones pueden tener dirección:

```text
source → target
```

pero la dirección no siempre implica una relación física unilateral.

Debe distinguirse entre:

```text
relationship direction
```

y:

```text
physical attachment
```

---

# 15. Connection Identity

Cuando sea necesario identificar una conexión:

```typescript
type ConnectionId = string;
```

Debe ser estable durante la vida de la plantilla.

---

# 16. Piece References

Toda conexión debe referenciar piezas existentes.

Válido:

```text
Front → Side-01
```

Inválido:

```text
Front → Side-99
```

si `Side-99` no existe.

---

# 17. Tab References

Cuando una conexión utilice tabs, debe poder identificarse la tab involucrada.

Conceptualmente:

```typescript
type TabConnection = {
    pieceId: PieceId;
    tabId: TabId;
    targetPieceId: PieceId;
};
```

---

# 18. Tab Identity

Las tabs deben tener IDs estables dentro de una pieza.

Ejemplo:

```text
Front
├── tab-01
├── tab-02
└── tab-03
```

No depender únicamente de la posición dentro del array.

---

# 19. Matching Tabs

Una tab puede tener una correspondencia:

```text
tab-01 → edge-03
```

Esto permite saber dónde debe pegarse.

---

# 20. Connection Semantics

Una conexión debería poder expresar:

```text
source piece
source feature
target piece
target feature
connection type
```

Ejemplo:

```text
Front
tab-01
   ↓
Side-01
edge-03
```

---

# 21. Assembly Graph

El ensamblaje puede representarse como un grafo:

```text
Pieces = Nodes
Connections = Edges
```

Ejemplo:

```text
             Front
            /     \
           /       \
      Side-01     Side-02
           \       /
            \     /
              Back
```

---

# 22. Graph Validity

El grafo debe ser válido para el tipo de plantilla.

No asumir que todo ensamblaje debe ser un árbol.

Una piñata cerrada puede requerir conexiones que formen ciclos.

---

# 23. Connected Assembly

Para una plantilla físicamente conectada:

```text
all required pieces
```

deberían poder alcanzarse desde el conjunto de piezas principales.

Una pieza aislada debe ser:

```text
intentional
```

o:

```text
validation error
```

---

# 24. Optional Pieces

No todas las piezas tienen que ser estructurales.

Puede existir:

```text
decorative piece
reinforcement
optional panel
```

Estas piezas deben identificarse explícitamente.

---

# 25. Required vs Optional

Una pieza puede tener:

```text
required = true
```

o:

```text
required = false
```

Esto evita asumir que todas las piezas forman parte del ensamblaje principal.

---

# 26. Assembly Steps

El ensamblaje puede dividirse en pasos:

```text
Step 1
Step 2
Step 3
...
```

Conceptualmente:

```typescript
type AssemblyStep = {
    id: AssemblyStepId;
    order: number;
    actions: AssemblyAction[];
};
```

---

# 27. Step Order

El orden debe ser explícito.

No depender únicamente del orden en que los pasos fueron almacenados.

---

# 28. Assembly Action

Una acción describe una operación física.

MVP:

```text
IDENTIFY
FOLD
ATTACH
ALIGN
CLOSE
```

---

# 29. Identify Action

Indica al usuario qué pieza debe utilizar.

Ejemplo:

```text
"Use piece FRONT."
```

No debe depender de nombres generados arbitrariamente.

---

# 30. Fold Action

Representa:

```text
fold feature
```

Ejemplo conceptual:

```text
Fold:
Front
fold-line-01
90°
```

---

# 31. Attach Action

Representa:

```text
attach source → target
```

Ejemplo:

```text
Attach:
Side-01 tab-02
to
Front edge-04
```

---

# 32. Align Action

Indica que dos características deben coincidir.

Ejemplo:

```text
Align:
mark-A
with
mark-B
```

---

# 33. Close Action

Representa una operación final de cierre.

Ejemplo:

```text
Close:
Back → Side structure
```

---

# 34. Assembly Instructions

Las instrucciones deben derivarse del modelo de ensamblaje.

No deberían estar hardcodeadas en:

```text
React components
PDF renderer
UI components
```

---

# 35. Instruction Model

Conceptualmente:

```typescript
type AssemblyInstruction = {
    step: number;
    action: AssemblyAction;
};
```

La representación visual puede cambiar sin modificar el dominio.

---

# 36. Human-Readable Instructions

Las instrucciones deben ser comprensibles para una persona.

Ejemplo conceptual:

```text
Paso 1
Identifica la pieza FRONT.

Paso 2
Dobla por las líneas marcadas.

Paso 3
Une las pestañas con el borde correspondiente.
```

El texto exacto puede generarse desde las acciones.

---

# 37. Instruction Localization

No almacenar obligatoriamente texto final dentro del dominio.

Preferir:

```text
action type
piece IDs
feature IDs
parameters
```

y generar el texto en la capa de presentación.

Esto facilita:

```text
Spanish
English
Portuguese
```

sin duplicar lógica.

---

# 38. Example

En lugar de:

```text
"Pegue la pestaña izquierda de la pieza azul..."
```

preferir:

```text
ATTACH
sourcePiece = side-01
sourceFeature = tab-02
targetPiece = front
targetFeature = edge-04
```

La interfaz puede convertir eso en texto.

---

# 39. Assembly Labels

Las piezas deben poder identificarse físicamente.

Ejemplo:

```text
FRONT
BACK
SIDE A
SIDE B
TAB 01
```

Los labels deben ser consistentes.

---

# 40. Piece Numbering

Puede existir una numeración:

```text
01
02
03
04
```

pero el número de impresión no debe confundirse con el `PieceId`.

---

# 41. Piece ID vs Display Label

Separar:

```text
PieceId
```

de:

```text
displayLabel
```

Ejemplo:

```text
id: side-01
label: SIDE A
```

---

# 42. Assembly Markers

Puede ser útil añadir marcas:

```text
A
A
B
B
C
C
```

para facilitar el montaje.

Estas marcas representan una correspondencia física.

---

# 43. Matching Markers

Dos características con el mismo identificador pueden indicar:

```text
match these together
```

Ejemplo:

```text
Front
marker A

Side
marker A
```

---

# 44. Marker Identity

Los markers deben tener IDs estables.

Ejemplo:

```text
marker-A
marker-B
marker-C
```

No depender del color.

---

# 45. Color Independence

La lógica de ensamblaje no debe depender de:

```text
red
blue
green
```

Los colores pueden ser una ayuda visual.

La identidad real debe ser semántica.

---

# 46. Physical Assembly

El sistema debe diferenciar entre:

```text
digital relationship
```

y:

```text
physical operation
```

Por ejemplo:

```text
Connection
```

define una relación.

```text
AssemblyStep
```

define cómo ejecutarla.

---

# 47. Assembly Order

No existe necesariamente un único orden correcto.

Una plantilla puede permitir:

```text
Step A
Step B
```

en cualquier orden.

Cuando existan dependencias, deben representarse explícitamente.

---

# 48. Step Dependencies

Conceptualmente:

```typescript
type AssemblyStep = {
    id: AssemblyStepId;
    dependsOn?: AssemblyStepId[];
};
```

Ejemplo:

```text
Step 2
dependsOn Step 1
```

---

# 49. Dependency Validation

No permitir dependencias hacia pasos inexistentes.

Tampoco ciclos de dependencia:

```text
Step 1 → Step 2
Step 2 → Step 1
```

---

# 50. Assembly Sequence

La secuencia final puede calcularse mediante:

```text
topological ordering
```

cuando existen dependencias.

No hardcodear el orden si puede derivarse del grafo.

---

# 51. Physical Constraints

El ensamblaje debe considerar restricciones reales.

Ejemplos:

```text
piece must be accessible
fold must happen before attachment
inner piece must be inserted before closing shell
```

Estas reglas deben formar parte del dominio cuando sean necesarias.

---

# 52. Accessibility

Una pieza puede quedar inaccesible si se cierra una estructura antes de colocarla.

El modelo debe permitir representar dependencias de este tipo.

---

# 53. Interior Pieces

Para piezas internas:

```text
INTERNAL
```

el orden de ensamblaje puede ser obligatorio.

Ejemplo:

```text
Internal reinforcement
       ↓
Shell closure
```

---

# 54. Reinforcement Pieces

Una pieza de refuerzo puede requerir:

```text
position
orientation
attachment points
```

No tratarla simplemente como una pieza decorativa.

---

# 55. Decorative Pieces

Las piezas decorativas pueden ensamblarse después de la estructura principal.

Ejemplo:

```text
Main Structure
      ↓
Decoration
```

---

# 56. Assembly Phases

Si el dominio lo requiere:

```text
PREPARATION
STRUCTURE
CLOSURE
DECORATION
```

pueden utilizarse como fases.

No crear fases si los pasos simples son suficientes.

---

# 57. Assembly State

Puede ser útil representar el estado esperado:

```text
NOT_STARTED
IN_PROGRESS
COMPLETED
```

Pero el estado de una construcción realizada por una persona no necesariamente pertenece al mismo modelo que la plantilla.

Separar:

```text
assembly definition
```

de:

```text
user assembly progress
```

---

# 58. Assembly Definition vs Progress

La definición:

```text
"qué hacer"
```

es dominio de Assembly.

El progreso:

```text
"qué hizo el usuario"
```

puede pertenecer a otra capa.

---

# 59. Assembly Validation

Antes de imprimir instrucciones:

```text
validateAssembly()
```

Debe comprobar:

```text
piece references
feature references
connection validity
step dependencies
required pieces
assembly graph
```

---

# 60. Validation Errors

Errores posibles:

```text
INVALID_ASSEMBLY
MISSING_PIECE
MISSING_FEATURE
INVALID_CONNECTION
INVALID_STEP
INVALID_STEP_DEPENDENCY
CYCLIC_STEP_DEPENDENCY
ORPHAN_REQUIRED_PIECE
```

---

# 61. Missing Connection

Una pieza estructural que no tiene ninguna conexión cuando debería tenerla debe producir un error.

---

# 62. Missing Step

Una conexión requerida que nunca aparece en ningún paso debe detectarse si el modelo exige instrucciones completas.

---

# 63. Duplicate Step Order

No depender únicamente de:

```text
order = 1
order = 1
```

para ordenar pasos.

El identificador y las dependencias deben mantenerse consistentes.

---

# 64. Assembly Completeness

Una definición completa debe poder responder:

```text
What pieces exist?
How are they connected?
What needs to be folded?
What needs to be attached?
In what order?
Where are matching markers?
```

---

# 65. Assembly Generation

Assembly puede generarse a partir de Template.

Conceptualmente:

```text
Template
   ↓
Assembly Generator
   ↓
Assembly
```

---

# 66. Assembly Generator

El generador puede encargarse de:

```text
create connections
create markers
create steps
create dependencies
```

Debe ser determinista.

---

# 67. Strategy Pattern

Si existen diferentes métodos de ensamblaje:

```text
TabAssemblyStrategy
EdgeAssemblyStrategy
HybridAssemblyStrategy
```

puede utilizarse Strategy.

No introducirlo hasta que existan algoritmos realmente diferentes.

---

# 68. Factory Pattern

Una Factory puede seleccionar una estrategia:

```text
AssemblyStrategyFactory
```

pero únicamente si existen múltiples estrategias.

---

# 69. Avoid Giant Assembly Service

No crear:

```text
AssemblyService
```

con cientos de responsabilidades.

Separar conceptos:

```text
AssemblyGenerator
AssemblyValidator
AssemblyInstructionGenerator
```

cuando realmente exista complejidad suficiente.

---

# 70. Domain Services

Un Domain Service puede utilizarse cuando una operación:

```text
no pertenece naturalmente a una sola entidad
```

Ejemplo:

```text
AssemblyGenerator
```

que trabaja con múltiples piezas.

---

# 71. No UI Logic

No colocar reglas de Assembly dentro de:

```text
React components
hooks
pages
CSS
```

La UI solamente representa el resultado.

---

# 72. No PDF Logic

No colocar:

```text
drawAssemblyInstruction()
drawMarker()
drawPieceLabel()
```

dentro del dominio.

El renderer decide cómo representar visualmente la información.

---

# 73. Assembly → Printing

Printing puede consumir:

```text
piece labels
assembly markers
cut lines
fold lines
```

para incorporarlos al material imprimible.

Pero Printing no debe modificar las relaciones de ensamblaje.

---

# 74. Assembly → PDF

El PDF puede representar:

```text
assembly instructions
piece labels
matching markers
```

pero solamente después de que Assembly haya definido esos datos.

---

# 75. Assembly Documentation

La documentación de ensamblaje debe poder generarse desde el modelo.

Ejemplo:

```text
Assembly
 ↓
Instruction Generator
 ↓
Instruction Document
```

---

# 76. Visual Instructions

En el futuro pueden existir:

```text
step illustration
piece highlight
arrow
fold animation
```

Estas son preocupaciones de presentación.

El dominio únicamente proporciona la información necesaria.

---

# 77. 3D Preview

Un preview 3D puede consumir:

```text
Template
+
Assembly
```

para representar la construcción.

No debe introducir lógica de ensamblaje dentro del renderer 3D.

---

# 78. Assembly Coordinate System

Assembly puede referenciar features geométricas:

```text
edge
vertex
foldLine
tab
marker
```

pero sus coordenadas pertenecen a Geometry.

No crear un sistema paralelo.

---

# 79. Feature References

Conceptualmente:

```typescript
type FeatureReference = {
    pieceId: PieceId;
    featureId: string;
};
```

Esto permite:

```text
piece + feature
```

sin duplicar geometría.

---

# 80. Feature Ownership

Las features pertenecen a las piezas.

Assembly solamente las referencia.

---

# 81. No Feature Duplication

No copiar:

```text
coordinates
paths
polygons
```

dentro de Assembly.

Referenciar:

```text
featureId
```

cuando sea suficiente.

---

# 82. Assembly Snapshot

Cuando se genere un documento imprimible, debe poder rastrearse:

```text
templateVersion
geometryVersion
assemblyVersion
printingVersion
```

---

# 83. Versioning

El ensamblaje puede tener:

```text
assemblyVersion
```

para identificar cambios en:

```text
connections
steps
markers
instructions
```

---

# 84. Determinism

Dado el mismo:

```text
Template
configuration
generator version
```

el Assembly Generator debería producir el mismo resultado.

---

# 85. Serialization

Si Assembly necesita persistencia:

```text
Assembly
 ↓
DTO
 ↓
Persistence
```

No acoplar el dominio directamente a:

```text
database
ORM
Supabase
```

---

# 86. Testing

Debe probarse:

```text
connections
piece references
tab matching
markers
assembly steps
dependencies
graph validity
instruction generation
```

---

# 87. Connection Test

Ejemplo:

```text
Front
tab-01
→
Side-01
edge-03
```

debe producir una conexión válida.

---

# 88. Missing Piece Test

Si:

```text
Front → Side-99
```

y `Side-99` no existe:

```text
MISSING_PIECE
```

---

# 89. Dependency Test

Si:

```text
Step 2 dependsOn Step 1
```

debe ser imposible ejecutar conceptualmente Step 2 antes de Step 1.

---

# 90. Cycle Test

Esto debe fallar:

```text
Step 1
 ↓
Step 2
 ↓
Step 1
```

Resultado:

```text
CYCLIC_STEP_DEPENDENCY
```

---

# 91. Graph Test

Una plantilla estructural debe poder verificar que todas sus piezas requeridas forman parte del assembly graph.

---

# 92. Marker Test

Si:

```text
marker-A
```

aparece en dos features que deben coincidir:

```text
valid
```

Si aparece únicamente una vez cuando requiere pareja:

```text
INVALID_MARKER
```

---

# 93. Regression Tests

Cada bug relacionado con:

```text
wrong connection
wrong tab
wrong assembly order
wrong marker
```

debe convertirse en un regression test.

---

# 94. Property Tests

Cuando sea útil:

```text
All connections reference existing pieces.

All required pieces participate in assembly.

Step dependencies remain acyclic.

Generated markers have valid references.

Assembly generation is deterministic.

Changing printing configuration does not modify Assembly.
```

---

# 95. Acceptance Criteria

Assembly se considera correcto cuando:

```text
[ ] Pieces can be connected.

[ ] Connections reference valid pieces.

[ ] Connections can reference specific features.

[ ] Tabs can be associated with target edges/features.

[ ] Fold relationships are represented.

[ ] Assembly graph can be validated.

[ ] Required pieces can be distinguished from optional pieces.

[ ] Assembly steps are supported.

[ ] Step order is deterministic.

[ ] Step dependencies are supported.

[ ] Cyclic step dependencies are rejected.

[ ] Assembly markers are supported.

[ ] Matching markers can identify corresponding features.

[ ] Piece IDs are independent from display labels.

[ ] Assembly instructions can be generated from domain data.

[ ] Instructions are not hardcoded in UI components.

[ ] Assembly does not contain PDF rendering logic.

[ ] Assembly does not contain printing layout logic.

[ ] Assembly does not duplicate geometry.

[ ] Assembly does not modify Template.

[ ] Assembly versions can be tracked.

[ ] Assembly generation is deterministic.

[ ] Assembly can be tested independently.
```

---

# 96. Critical Rules

Estas reglas son obligatorias:

```text
1. Assembly describes physical construction.

2. Template describes the pieces.

3. Geometry describes mathematical shapes.

4. Printing describes paper distribution.

5. PDF describes output representation.

6. Assembly must not process images.

7. Assembly must not generate PDF files.

8. Assembly must not calculate page tiling.

9. Assembly must not contain UI logic.

10. Assembly must reference Geometry instead of duplicating it.

11. Piece references must always be valid.

12. Required pieces must not accidentally become orphaned.

13. Tabs must have stable identities when referenced.

14. Assembly connections must be explicit.

15. Assembly steps must be deterministic.

16. Step dependencies must be acyclic.

17. Matching markers must be semantically identified.

18. Color must never be the source of identity.

19. Assembly instructions should be generated from structured data.

20. User assembly progress must not be confused with Assembly Definition.

21. Patterns such as Strategy or Factory are only introduced when real algorithmic variation exists.

22. Assembly generation should be deterministic.

23. Assembly versions must be traceable.

24. Printing must not mutate Assembly.

25. PDF must not define Assembly.
```

---

# 97. Final Architecture

```text
                    TEMPLATE
                       │
              ┌────────┴────────┐
              │                 │
           Pieces            Geometry
              │
              ▼
           ASSEMBLY
              │
      ┌───────┼────────┐
      ▼       ▼        ▼
 Connections Steps   Markers
      │       │        │
      └───────┼────────┘
              ▼
       Assembly Instructions
              │
              ▼
          PRINTING
              │
              ▼
         PrintLayout
              │
              ▼
             PDF
```

---

# 98. Final Principle

La plantilla responde:

> **¿Qué piezas necesito?**

Geometry responde:

> **¿Qué forma tiene cada pieza?**

Assembly responde:

> **¿Cómo conecto esas piezas?**

Printing responde:

> **¿Cómo distribuyo esas piezas en papel?**

PDF responde:

> **¿Cómo represento ese resultado como documento?**

La regla fundamental:

> **Assembly defines how the pieces become a physical object. It does not define their geometry or how they are printed.**

---

# 99. Ensamblaje de una extrusión perimetral

`template.md` §110-§122 fija cómo se derivan las piezas desde una silueta y
una profundidad. Esta parte fija el grafo y los pasos que le corresponden.

Nada de esto sustituye a las secciones anteriores: es el caso concreto que el
MVP genera, expresado con el modelo que ya definen §9 a §33.

---

# 100. Grafo resultante

Con `n` piezas laterales:

```text
        FRONT
     ▲    ▲    ▲
     │    │    │        TAB (pestaña del borde largo superior)
   SIDE1─SIDE2─SIDE3 ── … ── SIDEn ─┐
     │    │    │        TAB          │ TAB (cierra el anillo)
     ▼    ▼    ▼                     │
        BACK                         │
          └──────────────────────────┘
```

Tres familias de conexión, todas de tipo `TAB`:

```text
SIDEi → FRONT      borde largo superior
SIDEi → BACK       borde largo inferior
SIDEi → SIDEi+1    extremo, y SIDEn → SIDE1 cierra el anillo
```

La pestaña pertenece siempre a la pieza lateral (§11 y `template.md` §115), de
modo que la dirección de todas las conexiones sale de `SIDE`.

El grafo es conexo (§23): cada pieza lateral toca las dos caras y sus dos
vecinas, así que ninguna queda suelta.

---

# 101. Anillo cerrado

Las piezas laterales forman un **anillo**, no una cadena: la última se une a la
primera.

Esto introduce un ciclo en el grafo de conexiones. Es un ciclo **físico y
legítimo**, no el ciclo de dependencias que §22 y §83 prohíben: aquellos son
pasos que se esperan mutuamente, este es una pieza que se muerde la cola
porque la figura es cerrada.

La validación debe distinguirlos. Un anillo lateral sin cerrar significa que
falta una pieza o que el perímetro no se repartió entero.

---

# 102. Pasos del montaje

```text
1  IDENTIFY   reconocer FRONT, BACK y las piezas laterales por su etiqueta
2  FOLD       plegar las pestañas de cada pieza lateral a 90°
3  ATTACH     unir las piezas laterales entre sí hasta cerrar el anillo
4  ATTACH     pegar el anillo a BACK
5  ALIGN      comprobar que el anillo sigue el contorno de BACK
6  ATTACH     pegar FRONT, dejando un tramo sin pegar
7  CLOSE      rellenar la piñata y cerrar el tramo restante
```

---

# 103. Por qué ese orden

El anillo se monta **antes** de pegarlo a ninguna cara. Una tira suelta se
manipula; una tira ya pegada a una cara, no.

`BACK` va antes que `FRONT` porque la última cara en cerrarse es la que el
usuario ve, y conviene que los desajustes acumulados queden en la cara
trasera.

El paso 6 deja un tramo sin pegar a propósito: una piñata que se cierra del
todo no puede rellenarse. El tramo sin pegar es la boca, y el paso 7 la cierra
una vez llena.

Este es el motivo por el que existe la acción `CLOSE` (§33) como paso separado
de `ATTACH`: no es pegar una pieza más, es terminar el objeto.

---

# 104. Alineación

El paso 5 es una comprobación, no una unión.

Si al recorrer el anillo sobre `BACK` sobra o falta tira, el molde se imprimió
a una escala distinta de la real. La causa está casi siempre en el visor o en
el driver de impresión, no en la plantilla (`printing.md` §74).

Las instrucciones deben remitir a la regla de calibración de 100 mm antes de
que el usuario empiece a pegar: descubrirlo con la mitad de la piñata montada
no tiene arreglo.

---

# 105. Criterios de aceptación del montaje

```text
[ ] Cada pieza lateral está conectada a FRONT, a BACK y a sus dos vecinas.
[ ] Las piezas laterales forman un anillo cerrado.
[ ] Ninguna pieza queda fuera del grafo.
[ ] Las conexiones salen siempre de la pieza que posee la pestaña.
[ ] El ciclo del anillo no se confunde con un ciclo de dependencias.
[ ] Los pasos terminan en CLOSE y no en ATTACH.
[ ] Las instrucciones remiten a la calibración antes del primer pegado.
```
