# Piñata Maker — Storage

**Version:** 1.0
**Status:** Draft
**Last Updated:** 2026-09-14

---

# 1. Purpose

Este documento define cómo Piñata Maker persiste y recupera:

* proyectos
* plantillas
* versiones
* documentos del editor
* imágenes originales
* imágenes procesadas
* archivos generados
* PDFs
* metadatos relacionados

El objetivo principal es mantener una separación estricta entre:

```text
Domain
Application
Storage
Infrastructure
```

---

# 2. Core Principle

El dominio no debe conocer dónde se almacenan los datos.

```text
Domain
   ↓
Repository Interface
   ↓
Storage Adapter
   ↓
Database / Object Storage
```

Nunca:

```text
Domain
   ↓
Supabase
```

---

# 3. Storage Responsibilities

Storage es responsable de:

```text
persistence
retrieval
versioning
file storage
metadata
transactions
consistency
deletion
retention
```

No es responsable de:

```text
geometry
image processing
assembly rules
printing layout
PDF rendering
editor interaction
```

---

# 4. Storage Types

El sistema debe diferenciar entre:

```text
Relational Storage
Object Storage
Temporary Storage
Cache
```

---

# 5. Relational Storage

La base de datos almacena información estructurada.

Ejemplos:

```text
projects
templates
template_versions
assemblies
users
metadata
```

---

# 6. Object Storage

Los archivos binarios deben almacenarse en Object Storage.

Ejemplos:

```text
original images
processed images
PDF files
preview images
exports
```

No almacenar archivos binarios grandes directamente en tablas salvo que exista una razón concreta.

---

# 7. Temporary Storage

Los archivos intermedios pueden ser temporales:

```text
image processing output
temporary previews
intermediate PDFs
render artifacts
```

Deben tener una política de expiración.

---

# 8. Cache

La cache no es la fuente de verdad.

```text
Database
   ↓
Source of Truth

Cache
   ↓
Optimization
```

Si la cache desaparece, el sistema debe poder reconstruirse.

---

# 9. Source of Truth

Para cada recurso debe existir una única fuente de verdad.

Ejemplo:

```text
Template
→ Database

Original Image
→ Object Storage

Editor Viewport
→ Client state
```

---

# 10. Project

El concepto principal de persistencia puede ser:

```text
Project
```

Un proyecto agrupa:

```text
Template
Assembly
Assets
Versions
Exports
```

---

# 11. Project Model

Conceptualmente:

```typescript
type Project = {
    id: ProjectId;
    name: string;
    createdAt: Date;
    updatedAt: Date;
};
```

No agregar propiedades solamente porque "podrían ser útiles".

---

# 12. Project Identity

Cada proyecto debe tener un ID estable.

```typescript
type ProjectId = string;
```

Nunca utilizar:

```text
filename
project name
array index
timestamp
```

como identidad.

---

# 13. Project Ownership

Si existen usuarios:

```text
User
  ↓
Project
```

La relación debe persistirse explícitamente.

No confiar solamente en información enviada por el cliente.

---

# 14. Project Status

Si el producto requiere estados:

```text
DRAFT
READY
ARCHIVED
```

deben estar definidos explícitamente.

No usar strings arbitrarios.

---

# 15. Template Persistence

Una Template persistida debe mantener:

```text
template identity
version
pieces
configuration
metadata
```

La representación exacta debe seguir `template.md`.

---

# 16. Template Versioning

Las plantillas deben ser versionables.

Conceptualmente:

```text
Project
  │
  ├── Template v1
  ├── Template v2
  └── Template v3
```

Esto permite recuperar estados anteriores.

---

# 17. Immutable Versions

Una versión publicada o utilizada para generar un resultado debe considerarse inmutable.

```text
Template v3
```

no debe modificarse silenciosamente.

Un cambio produce:

```text
Template v4
```

---

# 18. Draft vs Version

El editor puede trabajar con un estado editable:

```text
Draft
```

y generar una versión:

```text
Version
```

cuando el usuario guarda/publica según el flujo del producto.

---

# 19. Version Identity

Conceptualmente:

```typescript
type TemplateVersionId = string;
```

Debe ser diferente del:

```text
TemplateId
```

---

# 20. Version Metadata

Una versión puede registrar:

```text
version number
createdAt
createdBy
source version
generator version
```

solo cuando estos datos sean realmente necesarios.

---

# 21. Optimistic Versioning

Para evitar sobrescribir cambios concurrentes:

```text
expectedVersion
```

puede utilizarse al guardar.

Ejemplo:

```text
Client has v5
Server has v6
       ↓
Save rejected
```

Esto evita pérdida silenciosa de trabajo.

---

# 22. Concurrent Save

Nunca sobrescribir automáticamente una versión más nueva sin una estrategia explícita.

---

# 23. Repository Pattern

La aplicación debe depender de interfaces.

Ejemplo:

```typescript
interface ProjectRepository {
    getById(id: ProjectId): Promise<Project | null>;
    save(project: Project): Promise<void>;
    delete(id: ProjectId): Promise<void>;
}
```

La implementación concreta no pertenece al dominio.

---

# 24. Template Repository

Conceptualmente:

```typescript
interface TemplateRepository {
    getById(id: TemplateId): Promise<Template | null>;
    save(template: Template): Promise<void>;
}
```

---

# 25. Version Repository

Conceptualmente:

```typescript
interface TemplateVersionRepository {
    getById(id: TemplateVersionId): Promise<TemplateVersion | null>;
    create(version: TemplateVersion): Promise<void>;
}
```

---

# 26. Asset Repository

Los assets requieren una abstracción diferente.

```typescript
interface AssetRepository {
    create(input: CreateAssetInput): Promise<Asset>;
    getById(id: AssetId): Promise<Asset | null>;
    delete(id: AssetId): Promise<void>;
}
```

---

# 27. Repository Responsibility

Un Repository debe encargarse de persistencia.

No debe:

```text
calculate geometry
generate PDF
process image
validate assembly
```

---

# 28. Repository vs Service

Repository:

```text
"What is stored?"
```

Service:

```text
"What operation should happen?"
```

No mezclar ambas responsabilidades.

---

# 29. DTO Boundary

Los datos de infraestructura no deben filtrarse directamente al dominio.

```text
Database Row
   ↓
Mapper
   ↓
Domain Entity
```

---

# 30. Persistence Mapper

Conceptualmente:

```text
ProjectMapper
TemplateMapper
AssemblyMapper
AssetMapper
```

Los mappers convierten:

```text
Persistence Model
↔
Domain Model
```

---

# 31. Database Models

No asumir que:

```text
database schema === domain model
```

Pueden coincidir parcialmente, pero son modelos diferentes.

---

# 32. JSON Storage

Para estructuras complejas como:

```text
Template
Assembly
Geometry
```

puede utilizarse JSON cuando sea apropiado.

Pero no convertir toda la base de datos en una única columna JSON sin analizar las necesidades de consulta.

---

# 33. JSON Boundary

Si se almacena:

```text
template_definition
```

debe existir una versión de esquema.

Ejemplo:

```text
schemaVersion: 1
```

---

# 34. Schema Version

El `schemaVersion` permite migrar documentos antiguos:

```text
v1
 ↓
Migration
 ↓
v2
```

---

# 35. Migration Responsibility

Las migraciones de datos deben pertenecer a Infrastructure/Application tooling.

No al dominio.

---

# 36. Backward Compatibility

Si existen proyectos antiguos:

```text
old schema
```

deben migrarse antes de ser usados por el dominio actual.

---

# 37. Asset Model

Conceptualmente:

```typescript
type Asset = {
    id: AssetId;
    projectId: ProjectId;
    type: AssetType;
    storageKey: string;
    mimeType: string;
    size: number;
    createdAt: Date;
};
```

---

# 38. Asset Types

MVP:

```text
ORIGINAL_IMAGE
PROCESSED_IMAGE
PREVIEW
PDF
EXPORT
```

No crear tipos sin una necesidad real.

---

# 39. Asset Identity

Los assets deben tener:

```text
AssetId
```

separado del:

```text
storageKey
```

---

# 40. Asset ID vs Storage Key

Ejemplo:

```text
AssetId:
asset_123

StorageKey:
projects/project_123/assets/asset_123/original.png
```

La aplicación utiliza `AssetId`.

Infrastructure conoce `storageKey`.

---

# 41. Storage Keys

Los keys deben ser deterministas y organizados.

Ejemplo:

```text
projects/
  {projectId}/
    assets/
      {assetId}/
        original.png
        processed.png
```

---

# 42. Do Not Use User Filenames as Keys

Evitar:

```text
projects/my-project/mickey-final-final-2.png
```

como identificador principal.

Los nombres originales pueden conservarse como metadata.

---

# 43. File Metadata

Puede almacenarse:

```text
originalName
mimeType
size
checksum
width
height
createdAt
```

según el tipo de archivo.

---

# 44. MIME Type

El MIME type debe validarse.

No confiar únicamente en:

```text
file extension
```

---

# 45. File Size

Debe existir un límite de tamaño por tipo de archivo.

Ejemplo conceptual:

```text
original image
processed image
PDF
```

cada uno puede tener límites diferentes.

Los límites reales deben definirse en configuración.

---

# 46. Image Storage

El archivo original debe conservarse cuando el producto requiera edición posterior.

```text
Original
   ↓
Processing
   ↓
Processed
```

No reemplazar automáticamente el original.

---

# 47. Original Asset

El original debe ser inmutable.

Si el usuario vuelve a procesarlo:

```text
Original
   ↓
New Processing Result
```

---

# 48. Processed Asset

Una imagen procesada puede estar asociada a:

```text
sourceAssetId
processingVersion
processingConfiguration
```

Esto permite reproducibilidad.

---

# 49. Processing Metadata

Ejemplo conceptual:

```typescript
type ProcessingMetadata = {
    sourceAssetId: AssetId;
    processorVersion: string;
    configuration: Record<string, unknown>;
};
```

No almacenar información redundante sin necesidad.

---

# 50. Generated Files

Los archivos generados deben tratarse como artefactos.

Ejemplo:

```text
Template
 ↓
PrintLayout
 ↓
PDF
```

El PDF no reemplaza la Template.

---

# 51. PDF Storage

El PDF puede almacenarse:

```text
projects/{projectId}/exports/{exportId}/document.pdf
```

---

# 52. Export Identity

Un export debe tener identidad propia:

```typescript
type ExportId = string;
```

---

# 53. Export Metadata

Puede incluir:

```text
exportId
projectId
templateVersionId
printingVersion
pdfVersion
createdAt
```

Esto permite reproducir el contexto del archivo.

---

# 54. Reproducibility

Un PDF generado debería poder relacionarse con las versiones utilizadas:

```text
Template v8
Assembly v4
Printing v3
PDF Generator v2
```

---

# 55. Generated Artifact Immutability

Un PDF ya generado debe considerarse inmutable.

Si cambia la plantilla:

```text
old PDF
```

permanece asociado a su versión.

---

# 56. Deletion

Eliminar un proyecto no necesariamente significa borrar inmediatamente todos los archivos.

Debe existir una política definida:

```text
soft delete
hard delete
retention period
```

---

# 57. Soft Delete

Si se utiliza:

```text
deletedAt
```

los recursos dejan de estar disponibles normalmente.

---

# 58. Hard Delete

La eliminación física debe contemplar:

```text
database records
object storage files
derived assets
exports
```

---

# 59. Orphaned Files

Debe existir una estrategia para detectar archivos sin referencia:

```text
Object Storage
     ↓
No database reference
     ↓
Orphan
```

Estos pueden limpiarse mediante un proceso periódico.

---

# 60. Orphan Cleanup

No eliminar automáticamente un archivo simplemente porque no tenga una referencia temporal.

Debe existir:

```text
grace period
```

para evitar borrar archivos durante operaciones incompletas.

---

# 61. Transactions

Cuando una operación modifica varias entidades relacionadas:

```text
Project
Template
Version
```

debe evaluarse si necesita una transacción.

---

# 62. Database Transaction

Ejemplo:

```text
Create Template Version
      +
Update Project
```

deberían completarse juntos cuando la consistencia lo requiera.

---

# 63. Object Storage Is Not Transactional

Una subida a Object Storage y una transacción de base de datos pueden fallar independientemente.

Debe existir una estrategia de recuperación.

---

# 64. Upload Flow

Recomendado:

```text
1. Create asset intent
2. Upload file
3. Verify upload
4. Persist metadata
5. Mark asset READY
```

---

# 65. Asset States

Conceptualmente:

```text
PENDING
UPLOADING
READY
FAILED
DELETED
```

---

# 66. Failed Upload

Si falla una subida:

```text
Asset = FAILED
```

y debe poder reintentarse o limpiarse.

---

# 67. Upload Retry

Los retries deben ser limitados.

No realizar retries infinitos.

---

# 68. Presigned URLs

Si el proveedor lo soporta, pueden utilizarse URLs temporales para subir/descargar archivos.

El cliente no debería recibir credenciales permanentes del storage.

---

# 69. Public vs Private Assets

Definir explícitamente:

```text
PUBLIC
PRIVATE
```

No hacer todos los archivos públicos por defecto.

---

# 70. Original Images

Las imágenes originales de proyectos deben ser privadas salvo que exista un requisito explícito de publicación.

---

# 71. PDF Access

Los PDFs pueden ser:

```text
private
temporary download
public share
```

según la funcionalidad.

---

# 72. Temporary URLs

Las URLs temporales deben tener expiración.

No persistir URLs temporales como si fueran identificadores permanentes.

Guardar:

```text
AssetId
StorageKey
```

y generar la URL cuando sea necesario.

---

# 73. Storage Provider

El sistema debe poder abstraer el proveedor.

Ejemplo:

```text
ObjectStorage
├── SupabaseStorageAdapter
└── FutureStorageAdapter
```

No introducir múltiples proveedores hasta que exista una necesidad real.

---

# 74. Supabase

Si se utiliza Supabase:

```text
Application
    ↓
Repository / Storage Interface
    ↓
Supabase Adapter
    ↓
Postgres / Storage
```

El dominio no importa el SDK de Supabase.

---

# 75. Supabase Tables

La estructura concreta de tablas debe seguir las necesidades reales.

Posible modelo inicial:

```text
projects
templates
template_versions
assets
exports
```

No crear tablas simplemente para cada objeto de TypeScript.

---

# 76. Row Level Security

Si se utiliza Supabase/Postgres con usuarios:

```text
RLS
```

debe proteger los datos a nivel de base de datos.

La autorización del frontend no es suficiente.

---

# 77. Project Isolation

Un usuario solamente debe poder acceder a proyectos autorizados.

Regla conceptual:

```text
user
  ↓
project membership / ownership
  ↓
project data
```

---

# 78. Asset Isolation

Los assets deben seguir las mismas reglas de autorización del proyecto al que pertenecen.

No asumir que esconder la URL protege el archivo.

---

# 79. Storage Policies

Las políticas de Object Storage deben validar:

```text
project ownership
membership
asset path
operation
```

según el modelo de permisos.

---

# 80. Service Role

Las credenciales privilegiadas:

```text
service role
admin credentials
```

nunca deben enviarse al navegador.

---

# 81. Client Storage Access

El cliente debe utilizar:

```text
public key / controlled access
```

según el proveedor y las políticas configuradas.

---

# 82. Secrets

Nunca almacenar:

```text
storage secrets
database passwords
service role keys
```

en:

```text
Template
Editor State
client bundle
localStorage
```

---

# 83. Environment Variables

Las credenciales deben venir de configuración segura del entorno.

---

# 84. Caching

Puede utilizarse cache para:

```text
project metadata
template reads
asset metadata
```

pero cualquier cache debe invalidarse correctamente después de cambios.

---

# 85. Cache Invalidation

Después de:

```text
save template
```

no servir inmediatamente una versión antigua desde cache.

---

# 86. Offline Support

Offline editing no es requisito del MVP salvo que el producto lo defina.

Si se agrega:

```text
Local Storage
IndexedDB
Service Worker
```

debe diseñarse como una capa independiente.

---

# 87. Local Draft

Si existe soporte de borradores locales:

```text
LocalDraft
```

no debe confundirse con:

```text
ServerVersion
```

---

# 88. Conflict Resolution

Cuando:

```text
Local Draft
+
Server Version
```

difieran, no sobrescribir silenciosamente.

Debe existir una estrategia:

```text
reload
replace
merge
duplicate
```

según el producto.

---

# 89. Audit Metadata

Cuando sea necesario, registrar:

```text
createdAt
updatedAt
createdBy
updatedBy
```

No almacenar un historial completo de cada modificación si no existe un requerimiento.

---

# 90. Audit Log

Un Audit Log es diferente de:

```text
Editor History
```

Editor History:

```text
undo / redo
```

Audit Log:

```text
who changed what and when
```

---

# 91. Editor History Persistence

El historial de undo/redo no debe persistirse por defecto.

Guardar únicamente si existe un requerimiento explícito.

---

# 92. Autosave

Si el editor tiene autosave:

```text
Editor
 ↓
Debounce
 ↓
Save Draft
```

No guardar cada evento del mouse.

---

# 93. Save Frequency

La frecuencia de autosave debe ser configurable.

No hardcodear tiempos en múltiples componentes.

---

# 94. Save Failures

Un fallo de persistencia debe:

```text
preserve local state
notify user
allow retry
```

No borrar el documento en memoria.

---

# 95. Data Integrity

Antes de persistir:

```text
validate domain
validate ownership
validate references
validate version
```

---

# 96. Persistence Validation

Storage no reemplaza Domain Validation.

El flujo debe ser:

```text
Command
 ↓
Domain
 ↓
Validation
 ↓
Repository
```

No:

```text
Repository
 ↓
hope data is valid
```

---

# 97. Serialization Errors

Si un objeto no puede serializarse:

```text
fail explicitly
```

No guardar un documento parcialmente corrupto.

---

# 98. Corrupted Documents

Si un documento persistido no puede reconstruirse:

```text
INVALID_PERSISTED_DOCUMENT
```

Debe registrarse el error y evitar que el dominio reciba datos inválidos.

---

# 99. Backup

La base de datos debe contar con backups gestionados por la infraestructura utilizada.

La aplicación no debe implementar su propio sistema de backup como parte del MVP.

---

# 100. Disaster Recovery

Debe definirse posteriormente:

```text
RPO
RTO
backup retention
restore procedure
```

cuando el producto llegue a producción.

---

# 101. Monitoring

Monitorizar:

```text
storage errors
database errors
upload failures
download failures
orphan assets
slow queries
```

---

# 102. Logging

Los logs no deben contener:

```text
passwords
tokens
private URLs
sensitive file contents
```

---

# 103. Testing

Storage debe probarse con:

```text
Repository tests
Integration tests
Storage adapter tests
```

---

# 104. Repository Tests

Probar:

```text
create
read
update
delete
versioning
concurrency
```

---

# 105. Storage Adapter Tests

Probar:

```text
upload
download
delete
signed URL generation
metadata
failure handling
```

---

# 106. Integration Tests

Probar el flujo real:

```text
Project
 ↓
Template
 ↓
Asset
 ↓
Version
 ↓
Export
```

cuando sea necesario.

---

# 107. Test Data

No utilizar archivos de producción para tests.

Crear fixtures controladas.

---

# 108. Naming Conventions

IDs:

```text
projectId
templateId
assetId
exportId
```

Storage keys:

```text
projects/{projectId}/assets/{assetId}/...
```

Mantener una convención única.

---

# 109. Timestamps

Utilizar timestamps consistentes y preferiblemente UTC en persistencia.

La UI puede convertirlos a la zona horaria del usuario.

---

# 110. IDs

Los IDs deben generarse de forma segura y estable.

No depender de:

```text
array index
database row position
filename
```

---

# 111. Pagination

Para colecciones potencialmente grandes:

```text
projects
exports
assets
versions
```

utilizar paginación.

No cargar todo automáticamente.

---

# 112. Soft Limits

Definir límites para:

```text
project count
asset count
file size
version count
export count
```

cuando el producto los requiera.

No inventar límites arbitrarios en el dominio.

---

# 113. Retention

Los archivos temporales deben tener una política:

```text
createdAt
expiresAt
cleanup
```

---

# 114. Garbage Collection

Puede existir un proceso:

```text
Storage Cleanup Job
```

para eliminar:

```text
expired temporary assets
failed uploads
orphaned objects
```

---

# 115. Background Jobs

Los procesos pesados no deben bloquear la petición HTTP.

Ejemplos:

```text
image processing
PDF generation
cleanup
large exports
```

pueden ejecutarse mediante jobs cuando el volumen lo justifique.

---

# 116. Storage Events

Si existen eventos:

```text
AssetUploaded
AssetDeleted
ExportCreated
```

deben representar eventos relevantes, no cada operación interna.

---

# 117. Domain Events vs Storage Events

Domain:

```text
TemplateUpdated
```

Storage:

```text
FileUploaded
```

No mezclarlos.

---

# 118. Storage Errors

Los errores de infraestructura deben mapearse a errores de aplicación.

Ejemplo:

```text
Storage timeout
```

→

```text
ASSET_UPLOAD_FAILED
```

---

# 119. Retryable Errors

Diferenciar:

```text
retryable
non-retryable
```

Ejemplo:

```text
network timeout
```

puede ser retryable.

```text
invalid file
```

no debería reintentarse automáticamente.

---

# 120. Idempotency

Las operaciones de subida/generación que puedan reintentarse deben ser idempotentes cuando sea posible.

Ejemplo:

```text
same export request
```

no debería generar accidentalmente múltiples archivos si la operación requiere idempotencia.

---

# 121. File Integrity

Para archivos importantes puede utilizarse:

```text
checksum
```

para detectar corrupción o duplicados.

---

# 122. Content Validation

Los archivos deben validarse antes de considerarlos `READY`.

Especialmente:

```text
mime type
size
image dimensions
file integrity
```

según el tipo.

---

# 123. Image Dimensions

Para imágenes:

```text
width
height
```

pueden almacenarse como metadata para evitar leer el archivo constantemente.

---

# 124. PDF Metadata

Para PDFs generados puede almacenarse:

```text
page count
size
generator version
```

si es útil para el producto.

---

# 125. Storage Independence

La aplicación debe poder reemplazar:

```text
Supabase Storage
```

por otro proveedor sin modificar:

```text
domain
geometry
template
assembly
editor
```

---

# 126. Recommended Layers

```text
src/
├── domain/
│
├── application/
│   └── ...
│
├── infrastructure/
│   └── storage/
│       ├── database/
│       ├── object-storage/
│       ├── repositories/
│       └── mappers/
│
└── presentation/
```

---

# 127. Infrastructure Example

Conceptualmente:

```text
infrastructure/storage/
├── repositories/
│   ├── SupabaseProjectRepository
│   ├── SupabaseTemplateRepository
│   └── SupabaseAssetRepository
│
├── object-storage/
│   └── SupabaseObjectStorage
│
└── mappers/
    ├── project.mapper
    ├── template.mapper
    └── asset.mapper
```

Los nombres concretos pueden cambiar.

---

# 128. Object Storage Interface

Conceptualmente:

```typescript
interface ObjectStorage {
    upload(input: UploadInput): Promise<StoredObject>;
    delete(key: string): Promise<void>;
    createSignedUrl(key: string, expiresIn: number): Promise<string>;
}
```

---

# 129. Database Interface

Los repositories deben ocultar el proveedor.

```text
Application
 ↓
ProjectRepository
 ↓
SupabaseProjectRepository
```

---

# 130. No Generic Storage Service

Evitar:

```text
StorageService
```

que haga:

```text
database
uploads
PDFs
images
projects
authentication
cleanup
```

Eso crea un God Object.

Separar por responsabilidad.

---

# 131. Dependency Injection

La aplicación debería recibir interfaces:

```text
ProjectRepository
TemplateRepository
AssetRepository
ObjectStorage
```

y no instanciar directamente:

```text
new SupabaseClient()
```

dentro de los casos de uso.

---

# 132. Testing with In-Memory Repositories

Para tests:

```text
InMemoryProjectRepository
InMemoryTemplateRepository
```

pueden utilizarse.

Esto permite probar Application sin infraestructura real.

---

# 133. Do Not Fake Everything

Los repositories en memoria no sustituyen los integration tests.

Debe existir cobertura de infraestructura real cuando sea importante.

---

# 134. Storage Contract

El contrato mínimo es:

```text
Create
Read
Update
Delete
Version
Upload
Download
```

Cada recurso solamente implementa las operaciones que necesita.

---

# 135. No CRUD by Default

No asumir que todo recurso necesita:

```text
create
read
update
delete
```

Por ejemplo:

```text
TemplateVersion
```

puede ser inmutable y solamente permitir:

```text
create
read
```

---

# 136. Immutability

La inmutabilidad debe utilizarse cuando el dominio lo requiera.

Especialmente:

```text
published versions
generated exports
original assets
```

---

# 137. Final Data Flow

```text
                  ┌──────────────┐
                  │    Editor    │
                  └──────┬───────┘
                         │
                         ▼
                  ┌──────────────┐
                  │ Application  │
                  └──────┬───────┘
                         │
                         ▼
                  ┌──────────────┐
                  │    Domain    │
                  └──────┬───────┘
                         │
                         ▼
                Repository Interface
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
        Database Adapter      Object Storage
              │                     │
              ▼                     ▼
           Postgres              Files
```

---

# 138. Final Rules

Estas reglas son obligatorias:

```text
1. Domain must not depend on storage.

2. Domain must not import Supabase.

3. Domain must not import database clients.

4. Domain must not import object-storage SDKs.

5. Persistence models must not automatically become domain models.

6. Repository interfaces must hide infrastructure.

7. Binary files belong in object storage.

8. Structured metadata belongs in the database.

9. Storage keys must not be domain identities.

10. Asset IDs must be independent from storage keys.

11. Original assets must remain immutable when required.

12. Generated PDFs must be treated as artifacts.

13. Generated artifacts must reference the versions used to create them.

14. Template versions should be immutable once published.

15. Concurrent writes must not silently overwrite newer versions.

16. Client authorization must not be the only security boundary.

17. Database authorization must be enforced server-side.

18. Object storage access must follow project permissions.

19. Temporary URLs must expire.

20. Secrets must never reach the client.

21. Failed uploads must be recoverable or cleanable.

22. Orphaned files must have a cleanup strategy.

23. Temporary files must have a retention policy.

24. Autosave must not persist every editor event.

25. Repository operations must not contain domain logic.

26. Storage adapters must not contain UI logic.

27. Storage errors must be mapped to application-level errors.

28. Retryable and non-retryable failures must be distinguished.

29. Important storage operations should be idempotent.

30. Schema versions must exist for persisted complex documents.

31. Migrations must be explicit.

32. Cache is never the source of truth.

33. Undo/redo history should not be persisted unless explicitly required.

34. Do not create a generic StorageService that becomes a God Object.

35. Do not introduce abstractions without a concrete architectural need.

36. The storage provider must be replaceable without modifying the domain.
```

---

# 139. Final Principle

Storage debe ser **infraestructura, no dominio**.

La regla fundamental:

> **The domain defines what the data means. Storage defines how the data is persisted.**

Y para Piñata Maker:

```text
Domain
   ↓
"What is a Template?"

Storage
   ↓
"Where and how is that Template persisted?"

Object Storage
   ↓
"Where is the original image/PDF physically stored?"

Editor
   ↓
"How does the user interact with the Template?"
```

Nunca invertir esas responsabilidades.
