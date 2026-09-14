# Piñata Maker — Image Processing

**Version:** 1.0
**Status:** Draft
**Last Updated:** 2026-09-14

---

# 1. Purpose

Este documento define el pipeline de procesamiento de imágenes de Piñata Maker.

El objetivo es transformar una imagen de referencia en información geométrica utilizable por el dominio.

Pipeline principal:

```text
Input Image
    ↓
Image Validation
    ↓
Preprocessing
    ↓
Subject Detection
    ↓
Background Removal
    ↓
Mask
    ↓
Contour Extraction
    ↓
Contour Cleanup
    ↓
Contour Simplification
    ↓
Normalized Geometry
    ↓
Physical Scaling
    ↓
Template Geometry
```

---

# 2. Core Principle

El procesamiento de imágenes debe distinguir claramente entre:

```text
Image Interpretation
```

y:

```text
Physical Geometry
```

Una imagen puede indicar:

* qué figura existe
* dónde está la figura
* cuál es aproximadamente su contorno

Pero una imagen por sí sola no conoce necesariamente:

* dimensiones físicas reales
* escala de impresión
* tamaño final de la piñata
* profundidad real

Por lo tanto:

> **La imagen proporciona geometría relativa; el usuario o la configuración del proyecto determina la escala física.**

---

# 3. Responsibilities

Image Processing es responsable de:

* validar imágenes
* normalizar imágenes
* detectar el sujeto
* eliminar el fondo
* generar máscaras
* extraer contornos
* limpiar contornos
* simplificar geometría
* producir una representación intermedia

No es responsable de:

* generar PDF
* dividir páginas
* decidir formato A4/A3/Letter
* autenticación
* almacenamiento
* persistencia
* UI
* impresión física

---

# 4. Image Processing Boundary

El procesamiento de imagen puede trabajar en:

```text
pixels
```

El dominio geométrico trabaja en:

```text
millimeters
```

Boundary:

```text
Image Processing
pixels
    ↓
conversion
    ↓
Domain Geometry
millimeters
```

Nunca introducir pixels directamente en `TemplateGeometry`.

---

# 5. Supported Input

El sistema debe definir explícitamente los formatos soportados.

Inicialmente:

```text
JPEG
PNG
WEBP
```

No implementar soporte adicional únicamente por previsión futura.

---

# 6. Image Validation

Antes de procesar una imagen:

```text
validateImage()
```

debe comprobar:

```text
mime type
file size
width
height
readability
```

---

# 7. Invalid Images

Rechazar imágenes que:

* no puedan decodificarse
* tengan dimensiones inválidas
* estén corruptas
* tengan un formato no soportado
* superen el límite configurado

Los límites deben ser configuración del sistema y no valores dispersos por el código.

---

# 8. Image Metadata

La información relevante puede incluir:

```text
width
height
aspectRatio
mimeType
fileSize
orientation
```

Ejemplo:

```text
ImageMetadata {
    width: 2000
    height: 2500
    mimeType: "image/png"
}
```

---

# 9. EXIF Orientation

Si el formato contiene orientación EXIF:

```text
EXIF orientation
```

debe normalizarse antes de procesar el contenido.

La orientación final debe ser consistente.

No permitir que:

```text
EXIF orientation
```

produzca un contorno diferente dependiendo del renderer.

---

# 10. Preprocessing

El preprocessing prepara la imagen para segmentación.

Puede incluir:

```text
resize
denoise
contrast normalization
color normalization
orientation normalization
```

No aplicar filtros destructivos innecesarios.

---

# 11. Original Image Preservation

El procesamiento nunca debe destruir la imagen original.

Pipeline:

```text
Original Image
      │
      ├──────────────→ Original Asset
      │
      ▼
Processing Copy
```

El asset original debe permanecer disponible para reprocesamiento.

---

# 12. Processing Reproducibility

Siempre que sea posible:

```text
same image
+
same processing configuration
+
same processor version
```

debe producir:

```text
same processing result
```

Si se utiliza IA no determinista, el sistema debe almacenar suficiente información para identificar el procesamiento realizado.

---

# 13. Processing Version

Cada resultado debe identificar:

```text
processorVersion
```

Ejemplo:

```text
processorVersion = "1.0"
```

Esto permite distinguir resultados generados por diferentes algoritmos.

---

# 14. Processing Pipeline

El pipeline oficial es:

```text
Upload
  ↓
Validation
  ↓
Normalization
  ↓
Segmentation
  ↓
Mask Cleanup
  ↓
Contour Extraction
  ↓
Contour Simplification
  ↓
Geometry Normalization
  ↓
Physical Scaling
```

---

# 15. Segmentation

Segmentation determina qué parte de la imagen representa el objeto principal.

Resultado:

```text
foreground
+
background
```

---

# 16. Segmentation Strategies

El sistema puede utilizar diferentes estrategias:

```text
Automatic segmentation
AI segmentation
Background removal
User-assisted segmentation
```

La estrategia debe estar abstraída.

No acoplar el dominio a un proveedor específico.

---

# 17. AI Boundary

Si se utiliza IA:

```text
AI Provider
    ↓
Segmentation Result
    ↓
Validation
    ↓
Image Processing Domain
```

La respuesta de IA debe tratarse como una entrada no confiable.

No asumir que la IA produjo una máscara perfecta.

---

# 18. AI Is Not the Source of Truth

La IA puede equivocarse.

Errores posibles:

```text
missing parts
extra background
holes
incorrect contour
detached elements
incorrect object selection
```

Por lo tanto:

> **La salida de IA siempre debe pasar por validación determinística.**

---

# 19. Segmentation Result

Conceptualmente:

```typescript
type SegmentationResult = {
    mask: Mask;
    confidence?: number;
};
```

La implementación concreta puede variar.

---

# 20. Confidence

Si el proveedor proporciona confidence:

```text
confidence
```

puede utilizarse para determinar si:

```text
automatic acceptance
```

o:

```text
manual review
```

No asumir que `confidence = 0.95` significa automáticamente que la geometría es correcta.

La confidence es una señal, no una garantía.

---

# 21. Mask

Una mask representa qué pixels pertenecen al objeto.

Conceptualmente:

```text
0 = background
1 = foreground
```

También puede utilizarse una máscara con valores continuos si el algoritmo lo requiere.

---

# 22. Binary Mask

Para extracción de contornos se puede convertir:

```text
soft mask
```

en:

```text
binary mask
```

utilizando un threshold explícito.

Ejemplo:

```text
value >= threshold → foreground
value < threshold   → background
```

El threshold debe ser configuración.

No hardcodearlo en múltiples lugares.

---

# 23. Mask Cleanup

Una máscara puede contener:

```text
small holes
small isolated regions
noise
gaps
```

El cleanup puede utilizar operaciones como:

```text
opening
closing
hole filling
connected components
```

---

# 24. Cleanup Principle

No eliminar detalles pequeños automáticamente sin considerar su impacto físico.

Un detalle de:

```text
2 px
```

no necesariamente es irrelevante.

Su importancia depende de la escala física final.

---

# 25. Connected Components

Cuando existan múltiples regiones:

```text
Component A
Component B
Component C
```

el sistema debe decidir explícitamente cuál representa el objeto principal.

No asumir:

```text
largest component = correct object
```

en todos los casos.

---

# 26. Main Subject Selection

La selección del objeto principal puede considerar:

```text
area
position
confidence
semantic information
user selection
```

La estrategia debe ser explícita.

---

# 27. Multiple Objects

Si la imagen contiene varios objetos:

```text
Object A
Object B
Object C
```

el sistema no debe unirlos silenciosamente.

Debe existir una decisión de producto sobre:

```text
single object
multiple parts
manual selection
```

---

# 28. Background Removal

El background removal debe producir:

```text
foreground mask
```

No debe modificar arbitrariamente:

```text
physical dimensions
```

porque todavía estamos trabajando en pixels.

---

# 29. Transparent Background

Cuando sea posible, el resultado intermedio puede representarse como:

```text
RGBA
```

con alpha:

```text
alpha = 0 → background
alpha = 1 → foreground
```

Pero para geometría, la máscara debe seguir siendo la fuente de verdad.

---

# 30. Alpha Channel

No utilizar directamente el alpha como geometría sin validación.

El alpha puede contener:

```text
antialiasing
semi-transparent edges
noise
```

Debe convertirse a una representación adecuada para extracción de contornos.

---

# 31. Antialiasing

Los bordes de una imagen pueden contener pixels parcialmente transparentes.

Por ejemplo:

```text
alpha = 0.1
alpha = 0.5
alpha = 0.9
```

La extracción del contorno debe definir cómo tratar estos valores.

No asumir que cualquier pixel distinto de cero pertenece al objeto.

---

# 32. Threshold

El threshold debe ser explícito.

Conceptualmente:

```text
alpha >= threshold
    → foreground
```

El valor debe ser configurable.

---

# 33. Contour Extraction

Una vez obtenida una máscara válida:

```text
Mask
 ↓
Contour Extraction
 ↓
Raw Contour
```

El resultado inicial puede contener una gran cantidad de puntos.

---

# 34. Contour Representation

El resultado debe poder representarse como:

```text
Point[]
```

donde cada punto inicialmente está en:

```text
pixels
```

---

# 35. Pixel Coordinate System

Durante image processing:

```text
Origin = top-left
X → right
Y → down
```

Esto coincide deliberadamente con el sistema de coordenadas utilizado por el dominio.

La unidad continúa siendo diferente:

```text
Image Processing = px
Domain = mm
```

---

# 36. Contour Bounds

Calcular:

```text
minX
minY
maxX
maxY
```

sobre el contorno.

Esto permite conocer:

```text
sourceWidth
sourceHeight
```

en pixels.

---

# 37. Contour Cleanup

Después de extraer el contorno:

```text
Raw Contour
    ↓
Remove duplicate points
    ↓
Remove invalid points
    ↓
Remove tiny segments
    ↓
Normalize ordering
```

---

# 38. Duplicate Points

Eliminar puntos consecutivos idénticos.

Ejemplo:

```text
A → B → B → C
```

se convierte en:

```text
A → B → C
```

---

# 39. Invalid Points

Eliminar o rechazar:

```text
NaN
Infinity
undefined coordinates
```

El comportamiento debe ser explícito.

Para geometría crítica, preferir rechazar resultados corruptos antes que repararlos silenciosamente.

---

# 40. Tiny Segments

Segmentos extremadamente pequeños pueden ser ruido.

Sin embargo:

> La eliminación debe utilizar una tolerancia documentada y considerar la escala física final.

---

# 41. Contour Simplification

Los contornos de una imagen pueden contener miles de puntos.

Debe existir una fase de simplificación:

```text
Raw Contour
    ↓
Simplification
    ↓
Usable Contour
```

---

# 42. Simplification Goals

La simplificación debe:

* reducir puntos
* preservar forma
* conservar esquinas relevantes
* evitar deformaciones significativas
* mantener topología
* producir resultados deterministas

---

# 43. Simplification Algorithm

Una opción inicial:

```text
Douglas-Peucker
```

La implementación debe estar encapsulada.

No permitir que una librería externa defina directamente la estructura del dominio.

---

# 44. Simplification Tolerance

La tolerancia debe estar relacionada con la precisión física requerida.

Idealmente:

```text
pixel tolerance
        ↓
physical tolerance
```

Debe evitarse una tolerancia arbitraria que funcione solamente para una resolución concreta.

---

# 45. Resolution Independence

Una imagen:

```text
1000 × 1000 px
```

y otra:

```text
4000 × 4000 px
```

representando la misma figura deberían producir geometrías físicamente comparables después de normalización y escalado.

No depender exclusivamente del número de pixels.

---

# 46. Image Aspect Ratio

Calcular:

```text
aspectRatio = width / height
```

y preservarlo cuando la transformación sea proporcional.

---

# 47. Physical Scaling Boundary

Hasta este punto:

```text
pixels
```

Después:

```text
millimeters
```

Boundary:

```text
Pixel Geometry
      ↓
Physical Scaling
      ↓
Domain Geometry
```

---

# 48. Physical Dimensions

La escala física debe derivarse de una configuración explícita.

Ejemplo:

```text
targetWidth = 800 mm
```

No utilizar:

```text
DPI
screen width
browser width
image DPI metadata
```

como sustituto silencioso de una dimensión física definida por el producto.

---

# 49. DPI

DPI puede existir como metadata de imagen.

No asumir:

```text
300 DPI
```

significa automáticamente que el usuario quiere imprimir la figura a ese tamaño.

DPI describe una relación de resolución, no necesariamente la dimensión física deseada del producto.

---

# 50. Image-to-Millimeter Conversion

Si:

```text
sourceWidth = 2000 px
```

y:

```text
targetWidth = 800 mm
```

entonces:

```text
scale = 800 / 2000
```

Cada coordenada:

```text
x_mm = x_px * scale
y_mm = y_px * scale
```

cuando se conserva la relación de aspecto.

---

# 51. Preserve Aspect Ratio

Por defecto:

```text
preserveAspectRatio = true
```

No deformar una figura automáticamente.

---

# 52. Exact Target Dimensions

Si el usuario especifica:

```text
800 × 1000 mm
```

pero la geometría original tiene:

```text
400 × 450 mm
```

no asumir que debe deformarse para alcanzar:

```text
800 × 1000
```

Primero determinar:

```text
uniform scale
```

y documentar cualquier diferencia restante.

---

# 53. Cropping vs Scaling

No utilizar cropping para forzar dimensiones físicas.

Separar claramente:

```text
crop
scale
fit
stretch
```

Son operaciones diferentes.

---

# 54. Fit Modes

Los modos posibles pueden ser:

```text
CONTAIN
COVER
EXACT
```

Pero no implementar todos automáticamente.

El MVP debe seleccionar explícitamente el comportamiento soportado.

---

# 55. Recommended MVP Behavior

Para generación de moldes:

```text
CONTAIN + preserveAspectRatio
```

es el comportamiento seguro por defecto.

Esto evita deformar la figura.

Si se requieren dimensiones exactas en ambos ejes, debe existir una decisión explícita sobre deformación.

---

# 56. Normalization

Antes de convertir a milímetros:

```text
Raw Contour
```

debe normalizarse.

Una estrategia:

```text
minX → 0
minY → 0
```

Resultado:

```text
normalizedX = x - minX
normalizedY = y - minY
```

---

# 57. Normalization Invariant

La normalización:

```text
must not change shape
must not change scale
```

solamente cambia la posición.

---

# 58. Physical Geometry Creation

Después de normalizar:

```text
Pixel Contour
     ↓
Normalization
     ↓
Scale
     ↓
Point<mm>
```

El resultado puede convertirse en:

```text
Polygon
```

o:

```text
TemplateGeometry
```

según el pipeline.

---

# 59. Geometry Validation

Antes de pasar al dominio:

```text
validateContour()
```

Debe comprobar:

```text
finite points
minimum number of points
valid bounds
non-zero dimensions
```

---

# 60. Topology Validation

Cuando corresponda, comprobar:

```text
self intersections
closed contour
holes
nested contours
```

No asumir que todos los contornos extraídos son válidos.

---

# 61. Self-Intersection

Un contorno auto-intersectado puede producir una geometría ambigua.

Ejemplo conceptual:

```text
\ /
 X
/ \
```

Este tipo de resultado debe:

```text
be rejected
```

o:

```text
be repaired explicitly
```

Nunca corregirse silenciosamente sin una regla.

---

# 62. Holes

Si la imagen contiene agujeros:

```text
Object
 └── Hole
```

la máscara debe conservarlos cuando sean relevantes para el molde.

No rellenarlos automáticamente.

---

# 63. Small Holes

Los agujeros pequeños pueden ser:

```text
noise
```

o:

```text
real feature
```

La decisión debe basarse en una regla física o de producto.

No utilizar únicamente:

```text
hole area in pixels
```

cuando el tamaño físico final sea relevante.

---

# 64. Semantic Processing

Si la aplicación utiliza IA para identificar:

```text
head
body
tail
ears
legs
```

estos datos deben considerarse metadata semántica.

No deben modificar automáticamente la geometría sin una regla explícita.

---

# 65. AI Semantic Result

Conceptualmente:

```text
SemanticResult {
    objectType
    parts[]
    confidence
}
```

Esto puede ayudar a seleccionar una estrategia de plantilla.

No reemplaza la geometría.

---

# 66. AI Failure

Si el proveedor de IA falla:

```text
AI_FAILURE
```

no debe corromper el proyecto.

El sistema debe poder representar:

```text
processing failed
```

y permitir reintentar.

---

# 67. External Provider Isolation

No utilizar directamente dentro del dominio:

```text
OpenAI
Google Vision
AWS Rekognition
remove.bg
Replicate
```

Crear una abstracción:

```text
SegmentationProvider
```

La implementación concreta pertenece a infraestructura.

---

# 68. Provider Contract

Conceptualmente:

```typescript
interface SegmentationProvider {
    segment(input: ImageInput): Promise<SegmentationResult>;
}
```

El contrato puede evolucionar según el proveedor real.

---

# 69. Provider Independence

El dominio debe poder probarse utilizando:

```text
FakeSegmentationProvider
```

sin realizar llamadas externas.

---

# 70. Deterministic Processing

Las etapas determinísticas deben mantenerse determinísticas:

```text
mask cleanup
contour extraction
normalization
simplification
scaling
validation
```

La IA no debe controlar estas etapas.

---

# 71. Processing Result

Conceptualmente:

```text
ImageProcessingResult {
    sourceImage
    mask
    contour
    normalizedContour
    metadata
    processorVersion
}
```

No es necesario persistir todos estos elementos si no existe una necesidad real.

---

# 72. Intermediate Artifacts

Posibles artifacts:

```text
original
normalized
mask
transparent foreground
contour
debug preview
```

No almacenar todos por defecto.

Persistir únicamente los necesarios para:

* debugging
* reproducibility
* UX
* reprocessing

---

# 73. Caching

El procesamiento puede beneficiarse de caching.

Una futura clave podría considerar:

```text
imageHash
processorVersion
processingConfiguration
providerVersion
```

No implementar caching complejo antes de medir la necesidad.

---

# 74. Hashing

Un hash puede utilizarse para detectar si la imagen cambió.

No utilizar:

```text
filename
```

como identidad de contenido.

---

# 75. Image Processing Configuration

La configuración debe estar centralizada.

Ejemplo conceptual:

```text
ImageProcessingConfig {
    segmentationStrategy
    threshold
    simplificationTolerance
    minimumComponentSize
}
```

Los valores deben ser versionables.

---

# 76. Configuration Version

Un resultado debe poder identificar:

```text
processingConfigVersion
```

cuando las reglas cambien.

Esto facilita reproducibilidad.

---

# 77. Error Classification

Errores de procesamiento deben distinguirse.

Ejemplos:

```text
INVALID_IMAGE
UNSUPPORTED_FORMAT
IMAGE_TOO_LARGE
DECODING_FAILED
SEGMENTATION_FAILED
NO_SUBJECT_FOUND
INVALID_MASK
CONTOUR_EXTRACTION_FAILED
INVALID_CONTOUR
PROCESSING_TIMEOUT
PROVIDER_ERROR
```

No utilizar un único:

```text
PROCESSING_ERROR
```

para todos los casos si la aplicación necesita actuar diferente según el error.

---

# 78. No Subject Found

Si no se detecta ningún sujeto:

```text
NO_SUBJECT_FOUND
```

Debe considerarse un resultado válido del proceso, no necesariamente una excepción inesperada.

---

# 79. Ambiguous Subject

Si existen múltiples candidatos similares:

```text
AMBIGUOUS_SUBJECT
```

puede requerirse intervención del usuario.

No seleccionar arbitrariamente.

---

# 80. Processing Timeout

Las operaciones que dependan de servicios externos deben tener timeout.

Nunca dejar un proyecto indefinidamente en:

```text
PROCESSING
```

---

# 81. Retry

Los retries deben existir en Application/Infrastructure.

No implementar retries infinitos.

Los errores permanentes no deben reintentarse indefinidamente.

---

# 82. Security

Las imágenes son datos de usuario.

El procesamiento debe evitar:

```text
unsafe file assumptions
path traversal
untrusted filenames
unvalidated MIME types
unbounded image dimensions
```

La validación debe realizarse antes de procesamiento costoso.

---

# 83. Resource Limits

Definir límites para:

```text
maximum file size
maximum width
maximum height
maximum pixels
maximum contour points
maximum processing time
```

Los límites deben estar centralizados.

---

# 84. Denial of Service Protection

Una imagen con dimensiones extremadamente grandes puede consumir recursos excesivos.

Por lo tanto:

```text
pixel count
```

debe validarse antes de procesamiento completo.

---

# 85. Memory Management

Evitar crear múltiples copias gigantes de una imagen si no son necesarias.

Pipeline preferido:

```text
Original
   ↓
Validated Processing Representation
   ↓
Mask
   ↓
Contour
```

Liberar intermediarios cuando ya no sean necesarios.

---

# 86. Testing

Image Processing debe probarse por etapas.

```text
Image validation
Normalization
Mask conversion
Mask cleanup
Contour extraction
Contour cleanup
Simplification
Scaling
Geometry validation
```

---

# 87. Test Fixtures

Crear fixtures pequeñas y representativas.

Ejemplos:

```text
simple circle
simple square
star
irregular animal silhouette
shape with hole
shape with multiple components
noisy contour
transparent PNG
JPEG with EXIF orientation
```

No utilizar únicamente imágenes complejas reales.

---

# 88. Golden Image Tests

Cuando sea útil:

```text
input image
+
processing configuration
=
expected mask / contour
```

puede utilizarse como golden test.

Debe documentarse cualquier tolerancia visual aceptada.

---

# 89. Geometry Golden Tests

El resultado más importante debe poder probarse como geometría:

```text
input
→ expected contour
```

No depender únicamente de:

```text
pixel screenshot comparison
```

---

# 90. Provider Contract Tests

Cada proveedor de segmentación debe cumplir el mismo contrato.

Ejemplo:

```text
Provider A
Provider B
Fake Provider
```

deben producir resultados compatibles con:

```text
SegmentationResult
```

---

# 91. No Provider-Specific Domain Logic

Incorrecto:

```text
if provider === "provider-a":
    contour = ...
```

dentro del dominio.

Correcto:

```text
provider
   ↓
standard result
   ↓
domain processing
```

---

# 92. Observability

Registrar suficiente información para diagnosticar:

```text
processing duration
processor version
configuration version
provider
image dimensions
result status
error category
```

No registrar innecesariamente el contenido de la imagen.

---

# 93. Debug Information

En desarrollo puede ser útil conservar:

```text
mask preview
contour preview
bounding box
processing stages
```

No convertir estos artifacts de debug en dependencias del dominio.

---

# 94. Processing Pipeline Summary

Pipeline final:

```text
┌─────────────────────┐
│    Input Image      │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│      Validate       │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│     Normalize       │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│     Segmentation    │
│   AI / Algorithm    │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│    Mask Cleanup     │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│  Contour Extraction │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│  Contour Cleanup    │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│  Simplification     │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│    Normalization    │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ Physical Scaling    │
│       px → mm       │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ Geometry Validation │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ Template Geometry   │
└─────────────────────┘
```

---

# 95. Critical Rules

Estas reglas son obligatorias:

```text
1. Original images must never be destroyed.

2. Image processing may use pixels.

3. Domain geometry must use millimeters.

4. AI output is never automatically trusted.

5. AI output must pass deterministic validation.

6. Physical dimensions must come from explicit product configuration.

7. DPI must not silently determine physical dimensions.

8. Aspect ratio is preserved by default.

9. Non-uniform scaling is prohibited by default.

10. Tiling does not belong to image processing.

11. PDF generation does not belong to image processing.

12. Provider-specific logic must remain outside the domain.

13. Processing versions must be identifiable.

14. Configuration changes must be traceable.

15. Processing must be deterministic whenever possible.

16. Ambiguous segmentation must not silently select an arbitrary object.

17. Resource limits must be enforced.

18. Processing failures must be classified.

19. Geometry must be validated before entering the domain.

20. Pixel coordinates must never be mistaken for physical dimensions.
```

---

# 96. Acceptance Criteria

El módulo se considera correcto cuando:

```text
[ ] Invalid images are rejected.

[ ] Supported formats are validated.

[ ] EXIF orientation is normalized.

[ ] Original images remain unchanged.

[ ] Segmentation providers are abstracted.

[ ] AI results pass deterministic validation.

[ ] Masks can be cleaned.

[ ] Contours can be extracted.

[ ] Duplicate and invalid points are handled.

[ ] Contours can be simplified.

[ ] Simplification preserves required topology.

[ ] Pixel coordinates can be converted to millimeters.

[ ] Physical dimensions come from explicit configuration.

[ ] Aspect ratio is preserved by default.

[ ] Non-uniform scaling cannot happen accidentally.

[ ] Invalid contours are rejected.

[ ] Multiple/ambiguous subjects are handled explicitly.

[ ] Processing versions are traceable.

[ ] Resource limits are enforced.

[ ] Processing errors are classified.

[ ] Provider failures can be retried at the application layer.

[ ] The final result can be consumed by the geometry domain.

[ ] Image processing can be tested without external AI providers.
```

---

# 97. Final Principle

Piñata Maker debe tratar la IA como una herramienta de interpretación, no como una autoridad geométrica.

La responsabilidad está separada:

```text
AI
 ↓
"Creo que esta es la figura"
 ↓
Segmentation
 ↓
"Esta es la máscara"
 ↓
Deterministic Processing
 ↓
"Este es el contorno"
 ↓
Geometry Domain
 ↓
"Estas son sus dimensiones físicas"
 ↓
Template
 ↓
PDF
```

La IA puede equivocarse.

La geometría física no puede depender de una suposición silenciosa.

> **AI assists. Deterministic geometry decides.**
