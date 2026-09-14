# Piñata Maker — Architecture

**Version:** 1.0
**Status:** Draft
**Last Updated:** 2026-09-14

---

# 1. Purpose

Este documento define la arquitectura técnica de Piñata Maker.

Su objetivo es establecer:

* límites entre módulos
* responsabilidades
* flujo de datos
* estructura del código
* dominio
* infraestructura
* procesamiento geométrico
* generación de documentos
* persistencia
* integración con servicios externos
* reglas para evolución de la arquitectura

Este documento complementa:

```text
AGENTS.md
docs/PRD.md
```

`PRD.md` define qué debe hacer el producto.

`AGENTS.md` define cómo debe trabajar el agente.

Este documento define cómo está construido técnicamente el producto.

---

# 2. Architectural Principles

La arquitectura sigue estos principios:

## 2.1 Domain First

Las reglas importantes del producto deben existir independientemente de:

* React
* Next.js
* Supabase
* HTTP
* Browser
* PDF renderer

---

## 2.2 Dependency Direction

Las dependencias deben apuntar hacia conceptos más estables.

```text
Presentation
     ↓
Application
     ↓
Domain
     ↑
Infrastructure
```

Infrastructure implementa contratos definidos por capas superiores cuando sea necesario.

El dominio no debe depender de infraestructura.

---

## 2.3 Explicit Boundaries

Cada módulo debe tener una responsabilidad clara.

Evitar módulos que mezclen:

```text
UI
+
Database
+
Geometry
+
PDF
```

---

## 2.4 Physical Accuracy

La geometría física es un requisito crítico.

Todas las operaciones geométricas del dominio utilizan:

```text
millimeters (mm)
```

Los pixels únicamente existen en:

* procesamiento raster
* rendering
* preview
* interacción visual

Nunca deben utilizarse como unidad física del dominio.

---

## 2.5 Simple Architecture

No implementar capas o patrones sin necesidad.

La arquitectura debe evolucionar según la complejidad real del producto.

---

# 3. High-Level Architecture

```text id="0q1q9x"
┌─────────────────────────────────────────────────────────────┐
│                         Next.js 15                          │
│                                                             │
│  ┌─────────────────────┐       ┌─────────────────────────┐  │
│  │     Presentation    │       │       Route Handlers    │  │
│  │                     │       │      Server Actions     │  │
│  │ React Components    │       │                         │  │
│  │ Client Components   │       │                         │  │
│  │ Server Components   │       │                         │  │
│  └──────────┬──────────┘       └────────────┬────────────┘  │
│             │                               │               │
│             └──────────────┬────────────────┘               │
│                            ↓                                │
│                  ┌───────────────────┐                      │
│                  │   Application     │                      │
│                  │                   │                      │
│                  │ Use Cases         │                      │
│                  │ Commands          │                      │
│                  │ Orchestration     │                      │
│                  └─────────┬─────────┘                      │
│                            ↓                                │
│                  ┌───────────────────┐                      │
│                  │      Domain       │                      │
│                  │                   │                      │
│                  │ Entities          │                      │
│                  │ Value Objects     │                      │
│                  │ Geometry          │                      │
│                  │ Business Rules    │                      │
│                  └─────────┬─────────┘                      │
│                            ↑                                │
│                  ┌───────────────────┐                      │
│                  │  Infrastructure   │                      │
│                  │                   │                      │
│                  │ Supabase          │                      │
│                  │ Image Providers   │                      │
│                  │ PDF Renderer      │                      │
│                  │ Storage           │                      │
│                  └───────────────────┘                      │
└─────────────────────────────────────────────────────────────┘
```

---

# 4. Project Structure

La estructura inicial debe organizarse por dominio.

```text id="i4g3o6"
app/
│
src/
├── modules/
│   ├── projects/
│   ├── image-processing/
│   ├── geometry/
│   ├── templates/
│   ├── printing/
│   └── pdf-generation/
│
├── components/
│
└── lib/
```

`app/` permanece en la raíz del proyecto, no dentro de `src/`.

Next.js soporta ambas ubicaciones. Se eligió la raíz para que el límite entre
el App Router (presentación) y `src/` (dominio, aplicación e infraestructura)
sea visible en el árbol de directorios.

`printing/` es un módulo de dominio independiente de `geometry/`.

`geometry/` representa y transforma geometría física. `printing/` decide cómo
esa geometría se distribuye sobre hojas: papel, márgenes, escala, tiling y
overlap. `pdf-generation/` únicamente renderiza el resultado.

Esta separación sigue la responsabilidad descrita en `docs/printing.md` §98 y
evita que el motor geométrico dependa de conceptos de impresión.

No crear automáticamente todas las capas dentro de cada módulo.

La estructura debe crecer según la necesidad.

---

# 5. Module Responsibilities

## 5.1 Projects

Responsabilidad:

Gestionar proyectos del usuario.

Incluye:

* creación
* lectura
* actualización
* eliminación
* estado del proyecto

No debe contener lógica geométrica.

---

## 5.2 Image Processing

Responsabilidad:

Transformar una imagen raster en información utilizable por el motor geométrico.

Pipeline:

```text
Image
 ↓
Validation
 ↓
Background Removal
 ↓
Alpha Mask
 ↓
Contour Detection
```

No debe generar PDF.

No debe manejar UI.

---

## 5.3 Geometry

Responsabilidad:

Representar y transformar geometría física.

Incluye:

* points
* paths
* polygons
* bounding boxes
* transformations
* scaling
* clipping
* measurements
* template geometry

`TemplateGeometry` pertenece a este módulo, no a `templates/`.

Es la estructura geométrica que produce el pipeline descrito en
`docs/geometry.md` §91 y la consumen tanto `printing/` como `templates/`.
Situarla aquí mantiene `geometry/` como el módulo más bajo y estable, y evita
la dependencia circular `templates → printing → templates`.

`templates/` construye sobre ella los conceptos de plantilla: `Template`,
`TemplatePart` y su configuración.

Este módulo es independiente de React y Supabase.

---

## 5.4 Templates

Responsabilidad:

Convertir geometría en una estructura de plantilla.

Incluye:

* template
* template parts
* cutting lines
* folding lines
* tabs
* alignment marks
* template configuration

---

## 5.5 Printing

Responsabilidad:

Determinar cómo una geometría física se distribuye sobre hojas reales.

Incluye:

* paper formats
* orientation
* margins
* printable area
* print scale
* tiling
* overlap
* page ordering
* alignment
* calibration

Entrada:

```text
TemplateGeometry
+
PrintConfiguration
```

Salida:

```text
PrintLayout
```

No debe generar archivos ni conocer la librería de PDF.

Ver `docs/printing.md`.

---

## 5.6 PDF Generation

Responsabilidad:

Transformar una plantilla en un documento imprimible.

Entrada:

```text
PrintLayout
```

Salida:

```text
PDF
```

No debe decidir cómo se construye la geometría.

No debe recalcular tiling, escala, overlap ni número de páginas.

---

# 6. Application Layer

La capa Application coordina operaciones del sistema.

Ejemplos:

```text id="6m2t0n"
CreateProject
ProcessImage
GenerateTemplate
GenerateTemplatePages
GeneratePdf
```

Un caso de uso puede coordinar diferentes módulos.

Ejemplo:

```text id="n9s2gs"
GenerateTemplate
      │
      ├── ImageProcessing
      ├── Geometry
      └── Templates
```

La Application Layer no debe contener detalles de:

* Supabase SDK
* React
* PDF library
* proveedor específico de IA

---

# 7. Domain Layer

El dominio contiene las reglas que representan el problema real.

Conceptos iniciales:

```text id="7r4j0m"
Project
Template
TemplatePart
TemplatePage
TemplateGeometry
PaperFormat
TemplateDimensions
```

---

# 8. Domain Entities

## Project

Representa un trabajo del usuario.

Conceptualmente:

```typescript id="4f4p7x"
Project {
  id
  userId
  name
  status
  imageAssetId
  templateId
  createdAt
  updatedAt
}
```

---

## Template

Representa una plantilla física.

Conceptualmente:

```typescript id="i9j3qa"
Template {
  id
  projectId
  dimensions
  paperFormat
  geometry
  parts
  pages
}
```

---

## TemplatePart

Representa una pieza física.

Ejemplos:

```text id="b6q9cr"
FRONT
BACK
SIDE
TOP
BOTTOM
```

No todas las plantillas necesitan todas las piezas.

---

## TemplatePage

Representa una página física imprimible.

Debe contener:

* page identifier
* piece identifier
* page dimensions
* geometry
* alignment marks
* calibration information

---

# 9. Value Objects

Utilizar Value Objects cuando una regla física o conceptual lo justifique.

Ejemplos:

```text id="j9kq1o"
Millimeters
Dimensions
Point
Size
BoundingBox
Scale
PaperFormat
```

Ejemplo conceptual:

```typescript id="1u7w1a"
type Millimeters = number;

type Point = {
  x: Millimeters;
  y: Millimeters;
};
```

Si el dominio requiere mayor protección contra mezclar unidades, utilizar objetos explícitos.

---

# 10. Geometry Model

La geometría es una de las partes más importantes del sistema.

La representación inicial debe ser vectorial.

Conceptualmente:

```text id="9q3wla"
Point
 ↓
Line
 ↓
Path
 ↓
Polygon
 ↓
TemplateGeometry
```

---

# 11. Coordinate System

Utilizar un sistema de coordenadas cartesiano.

Origen:

```text
(0, 0)
```

Las coordenadas se expresan en milímetros.

Convención inicial:

```text
X → derecha
Y → abajo
```

La convención debe ser consistente en todo el sistema.

No mezclar sistemas de coordenadas sin una transformación explícita.

---

# 12. Physical Geometry

Ejemplo:

```text id="c8m5u1"
Template:
Width = 800 mm
Height = 1000 mm
```

La geometría debe tener esos límites físicos.

El rendering puede transformarlo:

```text id="0a9gkp"
800 mm
   ↓
800 × scale pixels
```

pero esta transformación pertenece al rendering.

El dominio sigue trabajando con:

```text
800 mm
```

---

# 13. Geometry Pipeline

```text id="8q2vcl"
Raster Image
      ↓
Alpha Mask
      ↓
Contour
      ↓
Contour Cleanup
      ↓
Polygon
      ↓
Polygon Simplification
      ↓
Physical Scaling
      ↓
TemplateGeometry
```

Cada etapa debe tener una responsabilidad concreta.

---

# 14. Contour Detection

El sistema debe obtener el contorno de la figura.

Input:

```text
Alpha Mask
```

Output:

```text
Polygon / Path
```

La implementación concreta puede cambiar.

Por eso, cuando exista más de un proveedor o algoritmo, utilizar un Adapter o Strategy.

No acoplar el dominio a una librería concreta de visión.

---

# 15. Polygon Simplification

Los contornos raster pueden producir demasiados puntos.

Debe existir una etapa de simplificación.

Objetivo:

```text
Reduce points
+
Preserve shape
```

La tolerancia debe ser configurable.

La simplificación nunca debe alterar de manera significativa la forma física final.

Debe tener tests.

---

# 16. Scaling

El escalado debe ser determinista.

Ejemplo:

Input bounding box:

```text
400 × 500
```

Target:

```text
800 × 1000
```

Scale:

```text
2x
```

Todos los puntos deben transformarse mediante la misma transformación.

No escalar X y Y independientemente si se requiere conservar proporción.

---

# 17. Aspect Ratio

Por defecto:

```text
preserveAspectRatio = true
```

Si el usuario especifica ambas dimensiones explícitamente, debe definirse claramente si:

```text
width + height
```

representan:

* límites máximos
* dimensiones exactas
* dimensiones forzadas

La implementación debe seguir la regla definida en el PRD y documentación de dominio.

No asumir comportamiento diferente.

---

# 18. Template Generation

El motor de templates recibe:

```text id="e4y2pz"
Geometry
+
Dimensions
+
TemplateConfiguration
```

y produce:

```text id="4e6c9x"
Template
```

La generación debe ser determinista.

Con los mismos inputs válidos:

```text
same input
→ same geometry
```

salvo que intervenga explícitamente un servicio externo no determinista.

---

# 19. Cutting Lines

Las líneas de corte representan elementos que deben recortarse físicamente.

Deben almacenarse como geometría.

Conceptualmente:

```text
CutLine {
  geometry
}
```

No depender de estilos visuales para determinar si una línea es de corte.

El tipo debe existir en el modelo.

---

# 20. Folding Lines

Las líneas de doblado representan zonas donde el material debe doblarse.

Deben ser distintas de las líneas de corte.

Conceptualmente:

```text
FoldLine {
  geometry
}
```

El renderer decidirá cómo visualizarlas.

---

# 21. Tabs

Las pestañas forman parte de la geometría de construcción.

Una pestaña debe tener:

* geometría
* referencia
* orientación
* relación con una pieza

No tratar las pestañas únicamente como decoración visual.

---

# 22. Alignment Marks

Las marcas de alineación permiten unir páginas.

Deben generarse a partir de relaciones geométricas conocidas.

Ejemplo:

```text
Page A1
connectsTo:
Page A2
```

La información de conexión debe existir en el modelo.

No inferirla desde texto renderizado.

---

# 23. Paper Formats

Los formatos de papel deben ser datos de dominio.

Ejemplo:

```text id="y5q7c2"
A4:
210 × 297 mm

A3:
297 × 420 mm

Letter:
215.9 × 279.4 mm
```

No utilizar valores dispersos por el código.

Debe existir una única fuente de verdad para las dimensiones de papel.

---

# 24. Tiling

Tiling transforma:

```text
Large Geometry
```

en:

```text
Multiple Page Geometries
```

Input:

```text
TemplateGeometry
PaperFormat
Margin
Overlap
```

Output:

```text
TemplatePage[]
```

---

# 25. Tiling Algorithm

El algoritmo debe considerar:

```text
paper size
+
margin
+
overlap
+
template bounds
```

El área imprimible es:

```text
paper size
-
margins
```

El overlap debe utilizarse únicamente donde corresponda.

El algoritmo debe ser determinista.

---

# 26. Tiling Tests

Debe probarse como mínimo:

```text
Template smaller than page
Template equal to page
Template slightly larger than page
Template much larger than page
Template crossing page boundaries
Different paper formats
Different margins
Different overlap
```

También deben probarse casos extremos.

---

# 27. Rendering vs Geometry

Regla fundamental:

```text
Geometry ≠ Rendering
```

La geometría representa la realidad física.

El renderer decide cómo visualizarla.

Ejemplo:

```text
TemplateGeometry
       ↓
┌───────────────┐
│ SVG Renderer  │
├───────────────┤
│ Canvas Preview│
├───────────────┤
│ PDF Renderer  │
└───────────────┘
```

La geometría no debe contener:

* CSS
* React
* DOM
* canvas styles

---

# 28. Preview

El preview es una representación visual.

Puede utilizar:

* SVG
* Canvas

La decisión final debe documentarse.

El preview puede utilizar pixels.

Pero debe realizar una transformación:

```text
mm → screen coordinates
```

No modificar la geometría física original.

---

# 29. PDF Architecture

El PDF debe representar directamente la geometría física.

Pipeline:

```text id="c4q6l8"
Template
   ↓
Template Pages
   ↓
PDF Renderer
   ↓
PDF
```

El PDF renderer debe conocer:

* page dimensions
* geometry
* cut lines
* fold lines
* alignment marks
* labels
* calibration ruler

No debe recalcular la geometría del template.

---

# 30. PDF Physical Accuracy

Cada página debe utilizar dimensiones físicas.

Ejemplo:

```text
A4
210 × 297 mm
```

El renderer debe mantener esas dimensiones.

No utilizar:

```text
window.innerWidth
screen.width
devicePixelRatio
```

para determinar dimensiones físicas del PDF.

---

# 31. Calibration

Cada página debe incluir una referencia física.

Valor inicial:

```text
100 mm
```

La geometría de calibración debe generarse en milímetros.

El texto asociado debe indicar:

```text
100 mm
```

---

# 32. Image Processing Architecture

Los servicios externos deben estar detrás de adapters.

Ejemplo:

```text id="j4t7i1"
ImageProcessor
      ↑
      │
┌─────┴─────────────────┐
│                       │
ProviderAAdapter        │
ProviderBAdapter        │
LocalProcessor          │
└───────────────────────┘
```

No acoplar el dominio a un proveedor.

---

# 33. External Services

Cualquier servicio externo debe aislarse.

Ejemplos:

* background removal
* AI vision
* image processing
* object storage

La aplicación debe depender de contratos internos cuando exista una necesidad real de intercambiar proveedores.

---

# 34. Supabase

Supabase es infraestructura.

No debe convertirse en una dependencia del dominio.

Ejemplo:

```text
Domain
   ↑
Repository Contract
   ↑
Supabase Repository
```

El dominio no debe importar:

```text
supabase-js
```

---

# 35. Database

Modelo conceptual inicial:

```text id="6r5m9s"
users
  │
  └── projects
         │
         ├── image_assets
         │
         └── templates
                │
                ├── template_parts
                │
                └── template_pages

generated_files
```

El esquema real debe documentarse con las migraciones correspondientes.

No crear tablas únicamente por simetría arquitectónica.

---

# 36. Storage

Storage debe separarse conceptualmente por tipo de recurso.

```text id="7e8gqv"
original-images/
processed-images/
generated-files/
```

Los paths deben ser deterministas o identificables.

No almacenar archivos con nombres directamente proporcionados por el usuario.

---

# 37. Authentication

Supabase Auth administra autenticación.

Application layer debe trabajar con un concepto de usuario autenticado.

No propagar objetos específicos del SDK por todo el sistema.

---

# 38. Authorization

La autorización debe existir en servidor y base de datos.

Supabase RLS es una capa fundamental.

Regla conceptual:

```text
Authenticated user
        ↓
Own resources only
```

---

# 39. Next.js Architecture

Utilizar App Router.

Preferencia:

```text
Server Component
```

por defecto.

Utilizar Client Components solamente cuando exista una necesidad de:

* browser APIs
* interaction
* local state
* effects
* canvas
* drag/drop

---

# 40. Server Actions

Utilizar Server Actions cuando representen operaciones de aplicación adecuadas.

Ejemplos:

```text
createProject
updateProject
generateTemplate
```

No utilizar Server Actions como reemplazo universal de una arquitectura de dominio.

---

# 41. Route Handlers

Utilizar Route Handlers cuando sea apropiado para:

* file uploads
* external callbacks
* downloads
* APIs públicas
* integraciones

No crear endpoints innecesarios.

---

# 42. Application Flow

Ejemplo:

```text id="o8l4yy"
User
 ↓
React UI
 ↓
Server Action
 ↓
Application Use Case
 ↓
Domain
 ↓
Infrastructure
 ↓
Result
 ↓
UI
```

La UI no debe ejecutar directamente lógica de infraestructura compleja.

---

# 43. Error Architecture

Errores de dominio:

```text
InvalidTemplateDimensionsError
InvalidGeometryError
InvalidPaperFormatError
```

Errores de infraestructura:

```text
StorageError
ImageProviderError
PdfRendererError
DatabaseError
```

Los errores deben poder distinguirse.

Application layer puede mapearlos a errores apropiados para UI.

---

# 44. Dependency Injection

No introducir un container de Dependency Injection global en el MVP.

Preferir composición explícita.

Ejemplo conceptual:

```typescript id="j9lq6f"
const templateGenerator = createTemplateGenerator({
  imageProcessor,
  geometryProcessor,
});
```

Introducir una solución más compleja únicamente si la aplicación lo necesita.

---

# 45. Factories

Las factories deben utilizarse cuando exista lógica real de creación.

Ejemplo:

```text
createTemplate()
createPaperFormat()
createImageProcessor()
```

No crear factories para simples:

```text
new Object()
```

---

# 46. Strategy

Strategy es apropiado cuando exista comportamiento intercambiable.

Ejemplo:

```text
ImageProcessorStrategy
```

con:

```text
BackgroundRemovalProvider
LocalBackgroundRemoval
ExternalBackgroundRemoval
```

No crear Strategy mientras solamente exista una implementación y no haya una necesidad real de intercambio.

---

# 47. Repository

Repository debe utilizarse para aislar acceso a datos cuando exista complejidad suficiente.

Ejemplo:

```text
ProjectRepository
TemplateRepository
```

No crear repositories para cada tabla automáticamente.

---

# 48. Testing Architecture

Separar tests por responsabilidad.

```text
Domain tests
Application tests
Infrastructure tests
Component tests
E2E tests
```

La mayoría de reglas geométricas deben probarse sin infraestructura.

---

# 49. Testing Pyramid

Prioridad:

```text
        E2E
       /   \
    Integration
     /       \
   Domain / Application
```

Debe existir una mayor cantidad de tests rápidos de dominio que tests E2E.

---

# 50. Observability

Inicialmente mantener observabilidad simple.

Registrar información relevante:

```text
projectId
operation
duration
status
error
```

No registrar:

* imágenes
* información sensible
* tokens
* credenciales

No introducir una plataforma externa de observabilidad hasta que exista necesidad real.

---

# 51. Configuration

La configuración debe centralizarse.

Ejemplos:

```text
MAX_IMAGE_SIZE
SUPPORTED_IMAGE_FORMATS
DEFAULT_MARGIN
DEFAULT_OVERLAP
PDF_SETTINGS
```

No repetir constantes por diferentes módulos.

Los valores de dominio deben pertenecer al dominio cuando corresponda.

Los secretos pertenecen exclusivamente a variables de entorno.

---

# 52. Environment Variables

Nunca hardcodear:

* API keys
* secrets
* passwords
* tokens
* service credentials

Separar:

```text
PUBLIC
SERVER
SECRET
```

No exponer secretos al cliente.

---

# 53. Performance Boundaries

Las operaciones potencialmente costosas son:

```text
Image processing
Contour extraction
Polygon simplification
Tiling
PDF generation
```

Cada una debe tener límites razonables.

No introducir procesamiento distribuido hasta que exista una necesidad demostrada.

---

# 54. Determinism

Las operaciones geométricas deben ser deterministas.

Ejemplo:

```text
same image geometry
+
same dimensions
+
same paper
=
same template
```

Esto facilita:

* debugging
* testing
* reproducibilidad
* caching

---

# 55. Caching

No introducir caching prematuramente.

Primero medir.

Cuando sea necesario, considerar:

* processed image cache
* geometry cache
* generated PDF cache

La cache no debe alterar el resultado del dominio.

---

# 56. Versioning

Los templates generados deben poder asociarse con una versión de generación.

Ejemplo conceptual:

```text
generatorVersion: 1
```

Esto permitirá saber posteriormente con qué algoritmo fue generado un template.

No sobrescribir silenciosamente resultados históricos si cambia el algoritmo.

---

# 57. Reproducibility

Un template guardado debe poder identificarse con:

```text
source image
configuration
generator version
```

Esto permite reproducir o diagnosticar resultados.

---

# 58. Feature Boundaries

Cada feature debe intentar permanecer dentro de su módulo.

Ejemplo:

```text id="r5a2mm"
Image Upload
→ image-processing

Template Generation
→ templates + geometry

PDF Export
→ pdf-generation
```

Evitar dependencias circulares.

---

# 59. Circular Dependencies

No permitir:

```text
templates → geometry
geometry → templates
```

Si aparece una dependencia circular:

detenerse y rediseñar la frontera.

El módulo de geometría debe permanecer más bajo y estable que templates.

---

# 60. Import Rules

Regla conceptual:

```text
app
 ↓
modules
 ↓
domain
```

Los módulos no deben importar componentes de UI.

El dominio no debe importar:

```text
React
Next.js
Supabase
Browser APIs
```

---

# 61. Browser APIs

Browser APIs deben permanecer en Presentation o adapters apropiados.

Ejemplos:

```text
window
document
canvas
File
Blob
URL
localStorage
```

No deben aparecer dentro de reglas puras de dominio.

---

# 62. File Generation

La generación de archivos debe ser una responsabilidad de infraestructura/application.

El dominio produce:

```text
Template
```

La infraestructura produce:

```text
PDF
SVG
PNG
```

---

# 63. SVG

SVG debe utilizar la geometría física.

Debe poder representar:

* cut lines
* fold lines
* tabs
* alignment marks

El SVG debe mantener dimensiones físicas.

---

# 64. Future 3D Architecture

El 3D no forma parte del MVP.

Cuando se implemente:

```text
TemplateGeometry
        ↓
3D Model Builder
        ↓
3D Representation
```

No modificar el modelo 2D para adaptarlo artificialmente al 3D.

El modelo 3D debe consumir la geometría existente.

---

# 65. Future AI Architecture

La IA debe considerarse un proveedor de procesamiento.

Conceptualmente:

```text
Image
 ↓
Vision Provider
 ↓
Semantic Result
 ↓
Domain Transformation
 ↓
Geometry
```

La respuesta de un modelo de IA no debe convertirse directamente en entidades de dominio sin validación.

La salida debe validarse.

---

# 66. Migration Strategy

La arquitectura debe poder evolucionar.

Si una implementación inicial es reemplazada:

```text
Current implementation
        ↓
Adapter
        ↓
New implementation
```

Evitar reescribir el dominio para cambiar infraestructura.

---

# 67. Architecture Decision Rules

Antes de agregar una nueva tecnología, evaluar:

```text
Problem
↓
Current capabilities
↓
Simple solution
↓
Existing dependency
↓
New dependency
```

Siempre elegir la solución más sencilla que cumpla los requisitos.

---

# 68. What NOT To Build

La arquitectura inicial NO debe incluir:

* microservices
* Kubernetes
* event bus
* message broker
* CQRS completo
* Event Sourcing
* distributed transactions
* service mesh
* infrastructure as code compleja
* dependency injection container global

Estas tecnologías solamente deben considerarse si la escala real del producto las justifica.

---

# 69. Architectural Evolution

La arquitectura puede cambiar.

Un patrón o módulo puede introducirse posteriormente cuando aparezca una necesidad real.

La arquitectura inicial debe optimizar:

```text
clarity
+
correctness
+
iteration speed
```

No para una escala hipotética.

---

# 70. Definition of Architectural Completion

Una feature está arquitectónicamente correcta cuando:

```text
[ ] Responsibility is clear
[ ] Dependencies point in the correct direction
[ ] Domain is independent from infrastructure
[ ] Physical units are preserved
[ ] No unnecessary abstraction exists
[ ] Tests can isolate domain logic
[ ] Errors are meaningful
[ ] Security boundaries are respected
[ ] Documentation is updated
```

---

# 71. Reference Architecture

La arquitectura conceptual final del MVP es:

```text
                         USER
                           │
                           ▼
                    ┌──────────────┐
                    │   Next.js    │
                    │ Presentation │
                    └──────┬───────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │   Application   │
                  │                 │
                  │ CreateProject   │
                  │ ProcessImage    │
                  │ GenerateTemplate│
                  │ GeneratePdf     │
                  └────────┬────────┘
                           │
                           ▼
              ┌─────────────────────────┐
              │         DOMAIN          │
              │                         │
              │ Projects                │
              │ Templates               │
              │ Geometry                │
              │ Dimensions              │
              │ PaperFormats            │
              │ TemplatePages           │
              └────────────┬────────────┘
                           │
                           ▼
                ┌────────────────────┐
                │  Infrastructure    │
                │                    │
                │ Supabase           │
                │ Storage            │
                │ Image Providers    │
                │ PDF Renderer       │
                └────────────────────┘
```

---

# 72. Final Rule

La arquitectura debe responder a la complejidad real del producto.

No construir infraestructura para problemas que todavía no existen.

No sacrificar la corrección geométrica por simplicidad.

No sacrificar simplicidad por patrones.

La regla principal es:

> **Keep the domain pure, keep boundaries explicit, keep physical geometry accurate, and introduce complexity only when the product requires it.**
