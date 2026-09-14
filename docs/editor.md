# Piñata Maker — Editor

**Version:** 1.0
**Status:** Draft
**Last Updated:** 2026-09-14

---

# 1. Purpose

Este documento define la arquitectura y las reglas del editor visual de Piñata Maker.

El Editor permite al usuario:

* visualizar una plantilla
* seleccionar piezas
* mover elementos
* modificar dimensiones
* ajustar propiedades permitidas
* editar tabs
* editar líneas de doblez
* revisar conexiones
* deshacer y rehacer cambios
* validar la plantilla
* preparar el resultado para impresión

El Editor **no es el dominio**.

---

# 2. Core Principle

El Editor es una herramienta para manipular y visualizar el dominio.

```text
User
  ↓
Editor
  ↓
Commands
  ↓
Domain
  ↓
New State
  ↓
Editor View
```

No:

```text
User
  ↓
React Component
  ↓
random geometry manipulation
```

---

# 3. Domain Boundary

El Editor consume y modifica conceptos definidos en:

```text
domain.md
geometry.md
template.md
assembly.md
```

El Editor no debe redefinirlos.

---

# 4. Editor Responsibilities

El Editor es responsable de:

```text
selection
viewport
interaction
editing
commands
history
undo/redo
validation feedback
tool state
visualization
```

---

# 5. Editor Is Not Geometry

El Editor puede solicitar:

```text
move
rotate
scale
mirror
```

pero la implementación matemática de esas operaciones pertenece a Geometry.

No implementar fórmulas geométricas complejas directamente dentro de componentes React.

---

# 6. Editor Is Not Template

El Editor muestra y modifica una `Template`.

No debe convertirse en una segunda implementación del modelo:

```text
EditorTemplate
Template
```

sin una razón arquitectónica clara.

---

# 7. Editor Is Not Assembly

El Editor puede visualizar:

```text
connections
tabs
markers
assembly steps
```

pero las reglas de ensamblaje pertenecen a:

```text
assembly.md
```

---

# 8. Editor Is Not Printing

El Editor puede mostrar:

```text
page boundaries
paper size
print preview
```

pero la distribución final pertenece a:

```text
printing.md
```

---

# 9. Editor Is Not PDF

El Editor nunca debe contener lógica de:

```text
PDF generation
PDF serialization
PDF drawing
```

El PDF pertenece a:

```text
pdf.md
```

---

# 10. Editor Architecture

Arquitectura recomendada:

```text
┌───────────────────────────────┐
│            UI                 │
│                               │
│ Toolbar / Sidebar / Canvas    │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│        Editor Application     │
│                               │
│ Commands / State / History    │
└───────────────┬───────────────┘
                │
                ▼
┌───────────────────────────────┐
│            Domain             │
│                               │
│ Template / Geometry /Assembly │
└───────────────────────────────┘
```

---

# 11. Editor State

El estado del editor debe separarse del estado del dominio.

Ejemplo:

```text
Editor State
├── selectedPieceId
├── activeTool
├── viewport
├── zoom
├── pan
├── snap
└── history
```

Mientras que:

```text
Domain State
├── Template
├── Geometry
└── Assembly
```

---

# 12. Do Not Mix State

No almacenar:

```text
zoom
selectedTool
sidebarOpen
```

dentro de `Template`.

Tampoco almacenar:

```text
piece geometry
assembly connections
```

como simples propiedades arbitrarias del UI state.

---

# 13. Editor Session

Conceptualmente:

```typescript
type EditorSession = {
    document: EditorDocument;
    selection: SelectionState;
    viewport: ViewportState;
    tool: EditorTool;
};
```

---

# 14. Editor Document

El documento representa el estado editable del dominio.

Conceptualmente:

```typescript
type EditorDocument = {
    template: Template;
    assembly: Assembly;
};
```

La estructura exacta debe seguir evolucionando con el dominio.

---

# 15. Selection

La selección debe ser independiente del dominio.

Conceptualmente:

```typescript
type SelectionState = {
    pieceIds: PieceId[];
};
```

---

# 16. Single Selection

Puede seleccionarse una pieza:

```text
FRONT
```

---

# 17. Multi Selection

Puede seleccionarse más de una:

```text
FRONT
BACK
SIDE-A
```

Las operaciones deben validar si soportan multi-selección.

---

# 18. Feature Selection

El Editor puede seleccionar features:

```text
piece
edge
tab
foldLine
marker
```

Pero la selección debe referenciar IDs, no duplicar objetos completos.

---

# 19. Selection Identity

Preferir:

```text
pieceId
featureId
```

sobre:

```text
selectedObject
```

con una copia completa del dominio.

---

# 20. Active Tool

El Editor puede tener herramientas:

```text
SELECT
PAN
MOVE
ROTATE
SCALE
MEASURE
TAB
FOLD
CONNECT
```

No agregar herramientas que no tengan una operación real detrás.

---

# 21. Tool State

La herramienta activa pertenece al Editor:

```text
activeTool = SELECT
```

No al dominio.

---

# 22. Command Architecture

Las modificaciones deben ejecutarse mediante comandos.

Conceptualmente:

```text
User Action
    ↓
Command
    ↓
Domain Operation
    ↓
New State
```

---

# 23. Why Commands

Los comandos permiten:

```text
undo
redo
history
validation
logging
testing
```

sin acoplar estas responsabilidades a los componentes visuales.

---

# 24. Command Interface

Conceptualmente:

```typescript
interface EditorCommand {
    execute(): void;
    undo(): void;
}
```

La implementación real debe adaptarse al modelo de estado utilizado.

---

# 25. Command Examples

Ejemplos:

```text
MovePieceCommand
RotatePieceCommand
ScalePieceCommand
AddTabCommand
RemoveTabCommand
MoveTabCommand
AddFoldLineCommand
RemoveFoldLineCommand
ConnectPiecesCommand
DisconnectPiecesCommand
```

No crear comandos para acciones que no cambian el estado.

---

# 26. Command Naming

Los comandos deben expresar una acción:

```text
MovePieceCommand
```

No:

```text
PieceManager
Utils
Helper
Handler
```

---

# 27. Command Responsibility

Un comando debe representar:

```text
one logical user operation
```

No debe convertirse en un servicio gigante.

---

# 28. Atomic Operations

Una acción del usuario debería ser atómica desde la perspectiva del historial.

Ejemplo:

```text
Drag piece
```

debe producir:

```text
one undo step
```

no:

```text
200 undo steps
```

por cada evento del mouse.

---

# 29. Drag Operations

Durante un drag:

```text
pointer move
pointer move
pointer move
...
```

el Editor puede actualizar una preview temporal.

El commit final debe crear un comando.

---

# 30. Preview State

Puede existir:

```text
transient interaction state
```

durante una operación.

Ejemplo:

```text
original position
preview position
```

No persistir cada frame como estado histórico.

---

# 31. Commit

Al terminar una operación:

```text
pointerUp
```

se ejecuta:

```text
MovePieceCommand
```

---

# 32. Cancel

Si el usuario cancela:

```text
ESC
```

o equivalente:

```text
discard preview
```

El documento permanece sin cambios.

---

# 33. Undo

El Editor debe soportar:

```text
undo()
```

---

# 34. Redo

También:

```text
redo()
```

---

# 35. History

Conceptualmente:

```text
History
├── past
├── present
└── future
```

Cuando se ejecuta un nuevo comando después de `undo`:

```text
future
```

debe invalidarse.

---

# 36. History Boundary

La historia pertenece al Editor.

No debe almacenarse dentro de:

```text
Template
Assembly
Geometry
```

---

# 37. Command History

Ejemplo:

```text
Move Front
Rotate Side
Add Tab
```

Undo:

```text
Undo Add Tab
Undo Rotate Side
```

---

# 38. Batch Commands

Cuando una acción modifica varias piezas:

```text
Move Selection
```

puede representarse como:

```text
CompositeCommand
```

---

# 39. Composite Command

Conceptualmente:

```text
MoveSelectionCommand
├── MovePieceCommand
├── MovePieceCommand
└── MovePieceCommand
```

Esto permite un único undo.

---

# 40. Command Pattern

`Command Pattern` es recomendado porque el Editor requiere:

```text
undo
redo
history
atomic operations
```

Aquí existe una necesidad real del patrón.

---

# 41. Memento Pattern

Puede utilizarse Memento si el modelo de estado necesita snapshots.

Pero no implementarlo junto con Command automáticamente.

Elegir una estrategia de historial.

---

# 42. History Strategy

Opciones:

```text
Command-based history
Snapshot-based history
```

MVP recomendado:

```text
Command-based history
```

si el dominio permite operaciones reversibles.

---

# 43. Immutable State

El estado del documento debería actualizarse de forma predecible.

Evitar mutaciones arbitrarias:

```text
template.pieces[0].geometry.x = 100
```

desde cualquier componente.

---

# 44. State Updates

Preferir:

```text
Command
 ↓
Domain operation
 ↓
new state
```

---

# 45. Domain Validation

Después de una operación:

```text
Command
 ↓
Domain
 ↓
Validation
```

Si la operación rompe una invariante:

```text
reject
```

---

# 46. Invalid Operation

Ejemplo:

```text
Scale piece
```

si produce dimensiones inválidas.

Resultado:

```text
command rejected
```

El documento anterior permanece intacto.

---

# 47. Validation Feedback

El Editor debe traducir errores de dominio a feedback comprensible.

Ejemplo:

```text
DOMAIN ERROR
INVALID_DIMENSIONS
```

→

```text
"The piece must have a width greater than 0 mm."
```

La regla sigue perteneciendo al dominio.

---

# 48. Error Mapping

Crear una capa:

```text
Domain Error
     ↓
Editor Error Mapper
     ↓
User Message
```

No colocar textos de UI dentro de entidades de dominio.

---

# 49. Canvas

El canvas es una representación visual.

Puede utilizar:

```text
SVG
Canvas API
WebGL
```

según los requisitos de rendimiento.

La elección del renderer no debe modificar el dominio.

---

# 50. Renderer Abstraction

Si existen diferentes renderers:

```text
EditorRenderer
├── SVGRenderer
├── CanvasRenderer
└── WebGLRenderer
```

puede utilizarse una abstracción.

No crear tres implementaciones desde el principio si solamente existe una necesidad.

---

# 51. SVG Recommendation

Para el MVP, SVG es apropiado cuando se necesita:

```text
precise paths
selection
zoom
labels
fold lines
cut lines
markers
```

porque las piezas son esencialmente geometría 2D.

---

# 52. Canvas Recommendation

Canvas puede utilizarse cuando el volumen de elementos haga necesario un renderer más eficiente.

No cambiar a Canvas prematuramente.

---

# 53. Viewport

El viewport representa:

```text
zoom
pan
center
```

Conceptualmente:

```typescript
type ViewportState = {
    zoom: number;
    x: number;
    y: number;
};
```

---

# 54. Zoom

Zoom pertenece al Editor.

No modificar las dimensiones físicas del dominio.

```text
zoom = 200%
```

no significa:

```text
piece width = 2x
```

---

# 55. Pan

Pan solamente cambia la cámara.

No cambia la posición física de la pieza.

---

# 56. Coordinate Systems

El Editor debe diferenciar:

```text
screen coordinates
viewport coordinates
document coordinates
physical coordinates
```

---

# 57. Physical Coordinates

Las dimensiones del dominio están expresadas en:

```text
mm
```

---

# 58. Screen Coordinates

Las coordenadas del navegador:

```text
px
```

son responsabilidad del Editor.

---

# 59. Coordinate Conversion

Debe existir una capa clara:

```text
Physical
   ↕
Document
   ↕
Viewport
   ↕
Screen
```

No realizar conversiones dispersas dentro de componentes.

---

# 60. Zoom Conversion

El zoom afecta la representación:

```text
screen = physical × scale × zoom
```

pero no altera el valor físico.

---

# 61. Grid

El Editor puede mostrar una cuadrícula.

La cuadrícula es:

```text
visual aid
```

No forma parte de la plantilla.

---

# 62. Snap

Puede existir:

```text
snapToGrid
snapToEdge
snapToPoint
snapToGuide
```

---

# 63. Snap Responsibility

El algoritmo de snap pertenece al Editor o a un servicio de interacción específico.

No introducir comportamiento de UI dentro de Geometry sin necesidad.

---

# 64. Snap Precision

El snap debe respetar unidades.

Ejemplo:

```text
grid = 10 mm
```

---

# 65. Guides

El Editor puede mostrar:

```text
horizontal guides
vertical guides
alignment guides
```

Estas guías no forman parte del documento salvo que explícitamente sean una feature persistente.

---

# 66. Measurement Tool

Una herramienta de medición puede mostrar:

```text
100 mm
250 mm
```

Debe utilizar las unidades del dominio.

---

# 67. Selection Visualization

La selección puede mostrar:

```text
bounding box
handles
highlight
```

Esto es exclusivamente visual.

---

# 68. Transform Handles

Las handles permiten:

```text
move
rotate
scale
```

pero la operación final debe pasar por un Command.

---

# 69. Move

Mover una pieza debe modificar su transformación de forma válida.

Conceptualmente:

```text
MovePieceCommand
```

---

# 70. Rotate

Rotar una pieza debe preservar su geometría.

Geometry define las reglas matemáticas.

---

# 71. Scale

Escalar debe distinguir entre:

```text
uniform scale
non-uniform scale
```

---

# 72. Non-Uniform Scale

No permitir escalado no uniforme si rompe las reglas físicas del Template.

El dominio debe validar la operación.

---

# 73. Mirror

El Editor puede proporcionar:

```text
Mirror Horizontal
Mirror Vertical
```

pero la operación geométrica pertenece a Geometry.

---

# 74. Tabs Editor

El usuario puede editar tabs.

Acciones posibles:

```text
add
remove
move
resize
```

Cada acción debe pasar por una operación de dominio.

---

# 75. Fold Line Editor

El usuario puede:

```text
add fold line
move fold line
remove fold line
```

La línea resultante debe cumplir las reglas geométricas.

---

# 76. Cut Line Editor

Las líneas de corte deben tratarse como geometría de corte.

No mezclarlas con fold lines.

---

# 77. Assembly Editor

El Editor puede permitir:

```text
connect pieces
disconnect pieces
assign markers
inspect relationships
```

La validación pertenece a Assembly.

---

# 78. Piece Labels

El Editor puede mostrar:

```text
FRONT
BACK
SIDE A
SIDE B
```

Los labels de presentación no deben reemplazar los IDs internos.

---

# 79. Property Panel

El panel de propiedades puede mostrar:

```text
width
height
rotation
position
role
```

Los cambios deben convertirse en comandos.

---

# 80. Direct Input

Si el usuario escribe:

```text
Width: 500 mm
```

no modificar directamente el estado.

Usar:

```text
ResizePieceCommand
```

---

# 81. Numeric Input

Los valores numéricos deben validarse antes de aplicarse.

Ejemplo:

```text
width = -50
```

debe rechazarse.

---

# 82. Units

El Editor puede mostrar:

```text
mm
cm
```

pero el dominio debe mantener una unidad canónica:

```text
millimeters
```

---

# 83. Conversion

Si la UI permite cm:

```text
10 cm
```

se convierte a:

```text
100 mm
```

antes de llegar al dominio.

---

# 84. Precision

No mostrar más precisión de la necesaria.

Ejemplo:

```text
100 mm
```

en lugar de:

```text
99.9999999997 mm
```

salvo que la precisión sea relevante.

---

# 85. Keyboard Shortcuts

El Editor puede soportar:

```text
Ctrl/Cmd + Z
Ctrl/Cmd + Shift + Z
Delete
Escape
Ctrl/Cmd + S
```

Los shortcuts pertenecen a la capa de interacción.

---

# 86. Shortcut Actions

Los shortcuts deben ejecutar las mismas acciones que la UI.

No duplicar lógica:

```text
button → direct mutation
keyboard → different mutation
```

Preferir:

```text
UI
 ↓
Command
```

y:

```text
Keyboard
 ↓
Command
```

---

# 87. Autosave

Si existe autosave:

```text
Editor State
 ↓
Persistence Adapter
```

No guardar cada movimiento inmediatamente.

Utilizar debounce/throttle apropiado.

---

# 88. Persistence

El Editor no debe conocer detalles de:

```text
Supabase
PostgreSQL
REST
IndexedDB
```

Utilizar una abstracción.

---

# 89. Editor Repository

Conceptualmente:

```typescript
interface EditorDocumentRepository {
    load(id: string): Promise<EditorDocument>;
    save(document: EditorDocument): Promise<void>;
}
```

La implementación pertenece a Infrastructure.

---

# 90. Local Drafts

Puede existir:

```text
LocalDraftRepository
```

para recuperación local.

No hacer que el dominio dependa de `localStorage`.

---

# 91. Save State

El Editor puede mostrar:

```text
Saved
Saving...
Unsaved changes
```

Este estado pertenece al Editor.

---

# 92. Dirty State

Conceptualmente:

```text
isDirty = true
```

cuando existen cambios no persistidos.

---

# 93. Dirty State and History

Undo hasta volver al último estado guardado puede permitir:

```text
isDirty = false
```

si la estrategia de historial lo permite.

No asumirlo si existe persistencia concurrente.

---

# 94. Collaboration

La colaboración en tiempo real no es parte del MVP.

Si se agrega:

```text
Editor
 ↓
Collaboration Layer
 ↓
Shared Document
```

No introducirla en el dominio sin necesidad.

---

# 95. Concurrent Editing

Si en el futuro existen múltiples usuarios:

```text
CRDT
Operational Transform
server reconciliation
```

deben evaluarse como una preocupación independiente.

No implementar prematuramente.

---

# 96. Undo with Collaboration

El modelo de undo colaborativo debe diseñarse específicamente.

No asumir que un `Command History` local funciona automáticamente en colaboración.

---

# 97. Performance

El Editor debe evitar:

```text
re-render entire document
```

ante cada pequeño cambio si el documento es grande.

---

# 98. Rendering Strategy

Separar:

```text
domain state
```

de:

```text
render state
```

para permitir optimizaciones.

---

# 99. Large Templates

Para plantillas con muchas piezas:

```text
virtualization
memoization
incremental rendering
```

pueden evaluarse.

No agregarlas antes de medir un problema real.

---

# 100. React Architecture

La UI puede organizarse conceptualmente:

```text
Editor
├── Toolbar
├── Sidebar
│   ├── Tools
│   ├── Properties
│   └── Layers
├── Canvas
│   ├── PieceRenderer
│   ├── SelectionOverlay
│   ├── Guides
│   └── Grid
└── StatusBar
```

---

# 101. Component Responsibility

Cada componente debe tener una responsabilidad concreta.

Evitar:

```text
Editor.tsx
```

con:

```text
1000+ lines
domain logic
geometry calculations
history
rendering
keyboard handling
persistence
```

---

# 102. Hooks

Los hooks pueden encapsular interacción:

```text
useEditorSelection
useEditorViewport
useEditorHistory
useEditorKeyboard
useEditorCommands
```

Pero no convertir hooks en servicios de dominio.

---

# 103. useEditor

Un hook de alto nivel puede coordinar:

```text
state
commands
selection
history
```

siempre que no termine conteniendo todo el dominio.

---

# 104. Context

React Context puede utilizarse para compartir:

```text
EditorSession
```

dentro del editor.

No utilizar Context como sustituto de arquitectura.

---

# 105. State Management

El proyecto puede utilizar:

```text
React state
Zustand
Redux
```

según la complejidad.

La elección debe responder a las necesidades reales del editor.

---

# 106. Do Not Couple Domain to React

Nunca:

```text
Domain Entity
 ↓
React hook
```

como dependencia obligatoria.

El dominio debe poder probarse sin React.

---

# 107. Editor Services

Servicios posibles:

```text
EditorCommandManager
EditorHistory
CoordinateTransformer
SnapService
SelectionService
```

No crear servicios genéricos como:

```text
EditorUtils
EditorHelper
EditorManager
```

sin una responsabilidad clara.

---

# 108. CoordinateTransformer

Si las conversiones son suficientemente complejas:

```text
CoordinateTransformer
```

puede encapsular:

```text
screen ↔ viewport
viewport ↔ document
document ↔ physical
```

---

# 109. SnapService

Puede encapsular:

```text
grid snapping
edge snapping
point snapping
```

si la lógica lo requiere.

---

# 110. SelectionService

Puede centralizar reglas de:

```text
single selection
multi selection
feature selection
selection constraints
```

si la complejidad lo justifica.

---

# 111. Command Manager

Puede coordinar:

```text
execute
undo
redo
clear history
```

Conceptualmente:

```text
CommandManager
├── execute()
├── undo()
└── redo()
```

---

# 112. Tool Strategy

Si las herramientas tienen algoritmos de interacción significativamente diferentes:

```text
EditorTool
├── SelectTool
├── MoveTool
├── TabTool
├── FoldTool
└── ConnectTool
```

puede utilizarse Strategy.

No crear una clase para cada herramienta si solamente encapsula un click.

---

# 113. Strategy Rule

Usar Strategy cuando:

```text
algorithms vary independently
```

No utilizarlo únicamente para cumplir una regla de patrones de diseño.

---

# 114. Command vs Strategy

Diferencia:

```text
Command
= what operation should happen
```

```text
Strategy
= how a particular algorithm behaves
```

Ejemplo:

```text
MovePieceCommand
```

puede utilizar:

```text
SnapStrategy
```

si existen múltiples algoritmos de snap.

---

# 115. Observer Pattern

El sistema reactivo de estado puede cubrir necesidades similares a Observer.

No implementar un Observer manual si React/Zustand/etc. ya resuelve el problema.

---

# 116. Event Bus

No crear un Event Bus global como solución genérica.

Preferir:

```text
explicit commands
state updates
domain events
```

cuando corresponda.

---

# 117. Domain Events

Si una operación genera consecuencias relevantes:

```text
PieceMoved
PieceConnected
TabAdded
TemplateChanged
```

pueden utilizarse Domain Events.

No emitir eventos para cada actualización visual.

---

# 118. Editor Events

Los eventos puramente visuales:

```text
ToolActivated
SelectionChanged
ZoomChanged
```

pertenecen al Editor.

---

# 119. Domain vs Editor Events

```text
Domain
├── PieceMoved
├── TabAdded
└── PiecesConnected

Editor
├── SelectionChanged
├── ZoomChanged
└── ToolChanged
```

No mezclar ambos.

---

# 120. Validation Panel

El Editor debe poder mostrar:

```text
errors
warnings
info
```

Ejemplo:

```text
Errors: 1
Warnings: 2
```

---

# 121. Validation Severity

Conceptualmente:

```text
ERROR
WARNING
INFO
```

Un `ERROR` puede impedir la impresión.

Un `WARNING` puede permitir continuar según las reglas del producto.

---

# 122. Pre-Print Validation

Antes de permitir:

```text
Print
Export PDF
```

ejecutar:

```text
validateTemplate()
validateAssembly()
```

y las validaciones necesarias de Printing.

---

# 123. Editor Read-Only Mode

El Editor puede soportar:

```text
readOnly = true
```

para:

```text
preview
shared documents
print review
```

---

# 124. Read-Only Rules

En read-only:

```text
selection = allowed
zoom = allowed
pan = allowed
editing = disabled
```

---

# 125. Permissions

Los permisos no deben implementarse como:

```text
if (user.isAdmin)
```

dispersos por los componentes.

Utilizar una capa de autorización.

---

# 126. Accessibility

El Editor debe soportar, cuando sea viable:

```text
keyboard navigation
visible focus
accessible labels
tool descriptions
```

No asumir que todo puede resolverse únicamente mediante mouse.

---

# 127. Responsive Behavior

El editor desktop-first puede utilizar:

```text
large canvas
side panels
toolbar
```

pero debe definir qué ocurre en pantallas pequeñas.

No ocultar herramientas críticas sin una alternativa.

---

# 128. Autosave Feedback

Si existe guardado automático:

```text
Saving...
Saved
Save failed
```

debe ser visible.

---

# 129. Unsaved Changes

Al abandonar el editor con cambios:

```text
Unsaved changes
```

debe existir una estrategia definida.

---

# 130. Export

El Editor puede iniciar:

```text
Export PDF
```

pero no ejecutar la generación directamente.

Flujo:

```text
Editor
 ↓
Print Preparation
 ↓
Printing
 ↓
PDF
```

---

# 131. Print Preview

La vista previa debe consumir:

```text
PrintLayout
```

no construirlo manualmente dentro de React.

---

# 132. Editor Persistence Flow

```text
Editor
   ↓
Command
   ↓
Domain
   ↓
Validated State
   ↓
Editor State
   ↓
Persistence Adapter
```

---

# 133. Error Recovery

Si guardar falla:

```text
document remains in memory
```

El usuario no debe perder el trabajo local automáticamente.

---

# 134. Crash Recovery

Si el producto soporta drafts locales:

```text
Editor
 ↓
Local Draft
```

puede recuperarse el último estado.

---

# 135. Testing Layers

El Editor debe probarse en diferentes niveles.

```text
Domain tests
Application tests
Interaction tests
Component tests
E2E tests
```

---

# 136. Domain Tests

Probar:

```text
resize
move
rotate
tabs
folds
connections
validation
```

sin React.

---

# 137. Command Tests

Probar:

```text
execute
undo
redo
```

por separado.

---

# 138. Interaction Tests

Probar:

```text
select
drag
resize
keyboard shortcut
tool switching
```

---

# 139. Component Tests

Probar:

```text
Toolbar
PropertyPanel
Canvas
ValidationPanel
```

solamente donde aporten valor.

---

# 140. E2E Tests

Los flujos críticos:

```text
Create Template
Edit Template
Validate
Save
Print
Export PDF
```

deben tener cobertura E2E cuando el producto llegue a una fase estable.

---

# 141. Avoid Excessive Tests

No crear tests únicamente para:

```text
render <div>
button exists
component imports
```

si no protegen comportamiento importante.

---

# 142. Regression Testing

Cada bug crítico del editor debe convertirse en un regression test.

Ejemplos:

```text
wrong scale
wrong coordinates
lost tab
broken undo
wrong selection
incorrect print dimensions
```

---

# 143. Editor Invariants

El Editor debe garantizar:

```text
selected IDs reference existing entities
viewport values are valid
commands are atomic
history remains consistent
transient state does not corrupt domain state
```

---

# 144. Domain Invariants

El Editor nunca reemplaza las invariantes del dominio.

Aunque la UI valide:

```text
width > 0
```

el dominio debe validarlo nuevamente.

---

# 145. Security

No confiar en valores enviados por el cliente.

Antes de persistir:

```text
validate
authorize
sanitize
```

según la arquitectura del backend.

---

# 146. Performance Rule

No optimizar prematuramente.

Primero medir:

```text
render time
interaction latency
memory
document size
```

y después introducir optimizaciones.

---

# 147. Observability

Si existen problemas de rendimiento o errores de edición, registrar eventos útiles:

```text
command
duration
document size
error type
```

No registrar datos innecesarios del usuario.

---

# 148. Debug Mode

Puede existir un modo de desarrollo para mostrar:

```text
coordinates
piece IDs
feature IDs
bounding boxes
connections
```

No debe estar disponible accidentalmente en producción.

---

# 149. Architecture Rules

Estas reglas son obligatorias:

```text
1. Editor is not the domain.

2. UI components do not mutate domain state directly.

3. User mutations go through commands.

4. Domain validation remains authoritative.

5. Undo/redo belongs to Editor.

6. Selection belongs to Editor.

7. Viewport belongs to Editor.

8. Zoom does not change physical dimensions.

9. Screen pixels must not become domain dimensions.

10. Geometry calculations belong to Geometry.

11. Assembly rules belong to Assembly.

12. Printing rules belong to Printing.

13. PDF generation belongs to PDF.

14. Editor must not contain provider-specific infrastructure logic.

15. Domain must not depend on React.

16. Domain must not depend on browser APIs.

17. Persistence must be accessed through adapters.

18. Commands should represent atomic user operations.

19. Drag previews must not create history entries per frame.

20. Multi-selection operations should support composite commands when necessary.

21. IDs must be used instead of duplicated domain objects in selection state.

22. UI labels must not replace domain identifiers.

23. Patterns are used only when they solve real complexity.

24. Generic Utils/Helpers must not become dumping grounds.

25. Large components must be decomposed by responsibility.

26. Every important editing bug must receive regression coverage.
```

---

# 150. Recommended Folder Structure

La implementación puede comenzar aproximadamente así:

```text
src/
├── domain/
│   ├── geometry/
│   ├── template/
│   └── assembly/
│
├── application/
│   └── editor/
│       ├── commands/
│       ├── history/
│       ├── services/
│       └── use-cases/
│
├── infrastructure/
│   └── persistence/
│
└── presentation/
    └── editor/
        ├── components/
        ├── hooks/
        ├── tools/
        ├── renderer/
        └── state/
```

La estructura exacta puede cambiar según el stack, pero las responsabilidades deben mantenerse.

---

# 151. Example Operation

Usuario:

```text
Selecciona FRONT
        ↓
Arrastra 50 mm
        ↓
Editor calcula preview
        ↓
Snap aplicado
        ↓
Usuario suelta
        ↓
MovePieceCommand
        ↓
Domain
        ↓
Validation
        ↓
New Template
        ↓
Editor State
        ↓
History
```

---

# 152. Example Undo

```text
User
 ↓
Ctrl + Z
 ↓
CommandManager.undo()
 ↓
MovePieceCommand.undo()
 ↓
Previous State
 ↓
Editor
```

---

# 153. Example Resize

```text
User enters:

Width = 500 mm

        ↓

ResizePieceCommand

        ↓

Geometry operation

        ↓

Template validation

        ↓

Updated document
```

---

# 154. Example Tab Editing

```text
Select edge
      ↓
Tab Tool
      ↓
Preview tab
      ↓
User confirms
      ↓
AddTabCommand
      ↓
Template
      ↓
Assembly validation
```

---

# 155. Example Print

```text
Editor
  ↓
Validate Template
  ↓
Validate Assembly
  ↓
Create Print Request
  ↓
Printing
  ↓
PrintLayout
  ↓
PDF
```

El Editor no genera directamente el PDF.

---

# 156. Final Principle

El Editor debe sentirse como una herramienta visual potente, pero arquitectónicamente debe ser una **capa delgada sobre el dominio**.

```text
┌──────────────────────────┐
│          Editor          │
│                          │
│ Interaction              │
│ Selection                │
│ Viewport                 │
│ Commands                 │
│ History                  │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│          Domain          │
│                          │
│ Geometry                 │
│ Template                 │
│ Assembly                 │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│        Printing          │
│                          │
│ PrintLayout              │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│           PDF            │
└──────────────────────────┘
```

La regla más importante:

> **The Editor controls interaction; the Domain controls truth.**
