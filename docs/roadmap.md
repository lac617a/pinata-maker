# Piñata Maker — Roadmap

Estado del desarrollo: qué existe, qué decisiones ya están cerradas y qué
queda por construir.

Este documento **no define comportamiento**. Es un registro de estado. Cuando
haya conflicto, mandan `PRD.md`, `domain.md`, `architecture.md` y la
documentación del subsistema, en ese orden (`AGENTS.md` §6).

Debe actualizarse al terminar cada fase.

Los huecos entre lo construido y lo que hace falta para funcionar con usuarios
de verdad están en §8.

Cada feature termina en un commit: el historial es lo que explica qué se hizo
y cuándo. La regla completa está en `AGENTS.md` §54.

---

# 1. Estado actual

**El producto es la imagen en mosaico** desde el 2026-09-21 (`PRD.md` §44):
el usuario sube una imagen, la recorta si quiere, elige cuánto mide en
centímetros y descarga un PDF con la imagen ampliada a tamaño real y
repartida en hojas, con mapa de montaje, marcas de alineación y regla de
calibración. Es lo que hace Block Posters, pensado para quien fabrica
piñatas.

El ciclo real —subir, recortar, elegir tamaño, descargar— funciona con la
base de datos al día (migraciones 0001 a 0007), confirmado por el usuario el
2026-09-21.

```text
[✓] Imagen → cabecera leída del propio archivo (formato, tamaño, EXIF)
[✓] Recorte opcional → póster en mm con la proporción del recorte
[✓] Póster → reparto en hojas con solape, etiquetas y marcas
[✓] PDF: hoja de resumen con mapa y regla, y un trozo de imagen por hoja
[✓] Fotos de móvil con orientación EXIF, derechas en la vista y en el PDF
[✓] Aviso de resolución antes de imprimir
[✓] Proyecto, imagen y PDF persistidos con RLS; descarga con enlace firmado
[ ] Imprimir un póster y medirlo con una regla (§8.1)
[✓] Acceso sin cuenta con límite diario (fase G, `usage.md`)
[ ] Landing, páginas legales y SEO (fase H)
```

La plantilla con piezas —silueta, tiras laterales, pestañas, versiones— sigue
en el código con sus pruebas, sin interfaz. Lo que la sección 2 cuenta de
ella sigue siendo cierto; ya no es el camino del usuario.

Verificación:

```bash
pnpm verify      # 561 tests, más 30 de integración que necesitan cuenta
```

---

# 2. Lo que está hecho

## 2.1 Infraestructura del proyecto

* Next.js 15 (App Router) con `app/` en la raíz y el dominio en `src/modules/`.
* Vitest configurado en `vitest.config.mts`, entorno `node`, solo
  `src/**/*.test.ts`. El dominio se prueba sin React ni navegador.
* `pnpm` con overrides de seguridad para `postcss` y `sharp` en
  `pnpm-workspace.yaml`.
* `.gitignore` cubriendo artefactos de Next, pnpm, Supabase CLI y entorno.
* Tailwind v4, shadcn/ui sobre la escala `stone` y TanStack Query para los
  datos del navegador. Los componentes viven en `src/components/ui/` y son
  código del proyecto, no una dependencia.
* ESLint 9 en config plana y Prettier. El lint comprueba el orden de los
  imports y prohíbe los que suben por el árbol de carpetas: entre carpetas se
  importa con el alias absoluto `@/`. `pnpm verify` encadena formato, lint,
  tipos y tests.
* Supabase con `@supabase/supabase-js` y `@supabase/ssr`. El esquema vive en
  `supabase/migrations/` y se aplica a mano: la clave anónima no puede
  ejecutar DDL, que es justo lo que se quiere.
* `pnpm check:supabase` comprueba entorno, conexión, tablas y RLS sin imprimir
  ningún valor de configuración. Los buckets no: la clave anónima no puede
  leer `storage.buckets`, y de eso se encargan las pruebas de integración.
* `pnpm test:integration` ejecuta las pruebas contra la base de datos real.
  Necesita `SUPABASE_TEST_EMAIL` y `SUPABASE_TEST_PASSWORD` en el entorno; sin
  ellas se salta.

## 2.2 `src/modules/geometry/`

Vocabulario físico común. No depende de nada externo al dominio.

| Archivo | Responsabilidad |
| --- | --- |
| `units.ts` | `Millimeters`, tolerancia de comparación (0,001 mm) |
| `errors.ts` | `InvalidGeometryError`, `InvalidDimensionsError`, `InvalidScaleError` |
| `dimensions.ts` | `Dimensions` validadas (positivas y finitas) |
| `point.ts` | `Point` (posición) y `Vector` (desplazamiento) |
| `bounding-box.ts` | Extensión espacial, derivación desde puntos |
| `scale.ts` | Escalado proporcional, `fitToDimensions`, detección de deformación |
| `polygon.ts` | Polígono con bandera `closed` explícita, traslación inmutable |
| `clip.ts` | Recorte contra rectángulo (Liang-Barsky) |
| `template-geometry.ts` | Contornos, huecos, líneas de corte y de doblado |

## 2.3 `src/modules/image-processing/`

Boundary donde los pixels se convierten en milímetros.

| Archivo | Responsabilidad |
| --- | --- |
| `image-validation.ts` | Formato, extensión, peso y dimensiones; límites en un solo sitio |
| `mask.ts` | `AlphaMask`, `BinaryMask` y umbral del canal alfa |
| `mask-components.ts` | Regiones conexas y elección explícita de la figura principal |
| `contour-extraction.ts` | Máscara → contorno de pixels, con sus huecos |
| `pixel-contour.ts` | Tipos en espacio imagen, limpieza y validación del contorno |
| `simplification.ts` | Douglas-Peucker iterativo, tolerancia derivada de mm |
| `contour-to-geometry.ts` | Contorno en pixels → polígono en mm al tamaño pedido |
| `errors.ts` | Causas distinguibles: formato, tamaño, máscara vacía, figura ambigua |

Invariantes cubiertas por tests:

* El nombre del archivo y el tipo declarado deben coincidir.
* El antialiasing del borde queda fuera de la figura: un pixel más
  transparente que opaco es fondo.
* Dos partes que se tocan por una esquina son una sola pieza, tanto al
  agrupar regiones como al trazar el contorno.
* El contorno sigue el borde exterior de los pixels, no sus centros.
* Un hueco de la figura sale separado del contorno exterior.
* Una imagen con dos figuras de tamaño comparable falla en lugar de unirlas o
  elegir al azar.
* Una imagen completamente transparente se reporta como tal.

Las decisiones de implementación están documentadas en `image-processing.md`
§98-§106.

`convertContourToPhysicalGeometry` ya resuelve el escalado físico del PRD §11:
recibe las dimensiones que pide el usuario, ajusta de forma proporcional
contenida, deriva la escala del **contorno** y no del lienzo, y avisa mediante
`requiresDistortionForExactFit` cuando cumplir las dos medidas exigiría
deformar la figura.

## 2.4 `src/modules/printing/`

| Archivo | Responsabilidad |
| --- | --- |
| `paper-format.ts` | A4, A3, Letter, orientación |
| `margins.ts` | Márgenes y área imprimible |
| `tiling.ts` | Retícula de páginas, solape, etiquetas `A1`/`B3` |
| `page-geometry.ts` | Recorte a una hoja y paso a coordenadas locales |
| `alignment.ts` | Marcas de alineación entre hojas adyacentes |
| `calibration.ts` | Regla física de 100 mm en una esquina libre |
| `print-layout.ts` | `createPrintLayout`: compone `PrintLayout` y `PrintPage`, incluido `printableOrigin` |
| `errors.ts` | Errores de configuración de impresión |

Invariantes cubiertas por tests:

* Repartir en páginas no cambia el tamaño físico del molde.
* Las páginas se recortan, nunca se escalan ni se estiran.
* La geometría que cruza el borde del papel produce polilíneas abiertas, para
  no inventar líneas de corte por el canto de la hoja.
* Las marcas de alineación caen en la misma posición física global en las dos
  hojas que comparten un borde.
* La misma geometría con la misma configuración produce siempre el mismo
  documento.

## 2.5 `src/modules/pdf-generation/`

Boundary de salida. Convierte un `PrintLayout` ya calculado en un documento.

| Archivo | Responsabilidad |
| --- | --- |
| `pdf-units.ts` | Única conversión mm → pt del sistema, sin redondeo |
| `pdf-style.ts` | Grosores, patrón de los pliegues, tamaños de texto y fuente |
| `page-drawing.ts` | `PrintPage` → plano de dibujo en mm sobre el papel |
| `print-renderer.ts` | `PrintRenderer`, `PrintableDocument`, límites y nombre de archivo |
| `infrastructure/jspdf-print-renderer.ts` | Único archivo que importa `jspdf` |
| `errors.ts` | Errores del boundary, no del dominio |

Invariantes cubiertas por tests:

* Una pulgada son 72 puntos y la conversión no redondea.
* El documento tiene exactamente las páginas del layout, en su mismo orden.
* Cada hoja mide lo que declara el layout, en A4, A3, Letter y en las dos
  orientaciones. El renderer lo verifica antes de entregar el documento.
* La regla de calibración mide exactamente su longitud declarada.
* Los pliegues salen con un trazo distinto del de los cortes.
* El mismo layout produce el mismo documento, salvo el `/ID` que la librería
  genera al azar.
* Un layout que pida una escala distinta de la real falla con un error
  explícito en lugar de imprimirse al 100 %.

Las decisiones de implementación están documentadas en `pdf.md` §80-§88.

## 2.6 `src/modules/templates/`

Convierte una silueta y una profundidad en piezas recortables.

| Archivo | Responsabilidad |
| --- | --- |
| `template.ts` | `Template`, `TemplatePiece` y el coste en papel |
| `silhouette-profile.ts` | Recorrido del perímetro: arco, giro y curvatura |
| `tabs.ts` | Reparto de pestañas derivado de la curvatura |
| `perimeter-extrusion.ts` | La derivación: silueta + profundidad → piezas |
| `assembly.ts` | Grafo de conexiones, pasos y validación del montaje |
| `errors.ts` | Silueta no soportada, configuración y montaje inválidos |

Invariantes cubiertas por tests:

* Las piezas laterales cubren el perímetro completo, ni más ni menos.
* La tira mide exactamente la profundidad pedida, más una pestaña por lado.
* Una curva lisa no recibe dobleces transversales; una esquina sí.
* Las pestañas de una curva cerrada son más cortas que las de un tramo recto.
* Ninguna pestaña cruza una línea de doblez.
* El anillo lateral se cierra y ninguna pieza queda fuera del grafo.
* Todas las conexiones salen de la pieza que posee la pestaña.
* El montaje termina en `CLOSE`, no en `ATTACH`.
* Una silueta con huecos falla de forma explícita.

El modelo está en `template.md` §110-§122 y su montaje en `assembly.md`
§99-§105.

## 2.7 `src/application/`

Casos de uso. Coordinan módulos sin contener reglas físicas
(`architecture.md` §6 y §73).

| Archivo | Responsabilidad |
| --- | --- |
| `generate-template.ts` | Máscara alfa → plantilla, con avisos y coste en papel |
| `generate-printable-document.ts` | Plantilla → un PDF con todas las piezas |

Lo único que aportan es el contexto que ningún módulo tiene solo: con qué
papel se imprime, y por tanto cuánto puede medir una pieza lateral. La
plantilla no conoce el formato de hoja y la impresión no conoce las piezas.

`generateTemplate` devuelve además avisos que el dominio ya calculaba y nadie
leía: figuras descartadas, tamaño exacto imposible sin deformar, y detalle
limitado por la resolución de la imagen.

## 2.8 `src/modules/projects/` y `src/infrastructure/supabase/`

Primera parte de la persistencia: el proyecto del usuario.

| Archivo | Responsabilidad |
| --- | --- |
| `projects/project.ts` | Entidad, estados de `PRD.md` §22 y transiciones válidas |
| `projects/project-repository.ts` | Interfaz; toda operación recibe quién la pide |
| `projects/in-memory-project-repository.ts` | Implementación de referencia |
| `projects/project-repository.contract.ts` | Qué significa cumplir el contrato |
| `projects/infrastructure/supabase-project-repository.ts` | Único archivo que conoce la tabla |
| `infrastructure/supabase/environment.ts` | Lee y valida la configuración |
| `infrastructure/supabase/client.ts` | Cliente por petición |
| `supabase/migrations/0001_projects.sql` | Esquema y políticas RLS |

El aislamiento entre usuarios (AC-15) se aplica **dos veces**: en el dominio,
donde se lee el porqué, y en la base de datos con RLS, donde no se puede
olvidar desde una ruta nueva. Un proyecto ajeno responde igual que uno
inexistente, para no revelar qué identificadores existen.

El contrato del repositorio se ejecuta contra cada implementación, de modo que
«funciona» significa lo mismo para la de memoria y para la de Supabase.

Decisiones documentadas en `storage.md` §140-§146.

## 2.9 `src/presentation/` y `app/api/`

La API de proyectos, con autenticación real.

| Archivo | Responsabilidad |
| --- | --- |
| `infrastructure/supabase/request-client.ts` | Cliente por petición y usuario autenticado |
| `presentation/http/project-endpoints.ts` | Petición → caso de uso → respuesta |
| `presentation/http/error-response.ts` | Fallo del dominio → código y mensaje |
| `presentation/next/project-request-context.ts` | Único punto que junta Next, Supabase y el dominio |
| `app/api/projects/` | Rutas: construyen el contexto y delegan |

Los endpoints son funciones de `(Request, contexto)` a `Response` y se prueban
con un repositorio en memoria, sin servidor ni base de datos. Esa es la forma
de que una ruta sea fina de verdad (`architecture.md` §74).

Invariantes cubiertas por tests:

* Sin sesión, las cinco operaciones responden 401.
* Un proyecto ajeno responde 404, no 403: un 403 confirmaría que existe.
* Un proyecto inexistente y uno ajeno dan la misma respuesta.
* El cuerpo no incluye `ownerId`.
* Renombrar o eliminar algo ajeno no lo cambia.

La autenticación usa `getUser` y no `getSession`: en el servidor, confiar en
la cookie es confiar en el navegador (`architecture.md` §75).

## 2.10 `src/modules/accounts/`

Registro, inicio y cierre de sesión, detrás del puerto `AuthGateway`.

| Archivo | Responsabilidad |
| --- | --- |
| `credentials.ts` | Forma del correo y longitud de la contraseña |
| `auth-gateway.ts` | Puerto |
| `infrastructure/supabase-auth-gateway.ts` | Único archivo que conoce Supabase Auth |
| `presentation/http/auth-endpoints.ts` | Las tres rutas, probadas con un servicio de mentira |

Invariantes cubiertas por tests:

* El registro responde lo mismo con una dirección nueva que con una ya
  registrada: decirlo permitiría averiguar quién tiene cuenta.
* El inicio de sesión falla igual con dirección desconocida que con
  contraseña incorrecta.
* `sign-in` no devuelve token: la sesión viaja en cookies.
* Un rechazo es 401 y una avería del servicio es 503.

Decisiones en `architecture.md` §76.

## 2.11 `src/modules/assets/`

La imagen original que sube el usuario.

| Archivo | Responsabilidad |
| --- | --- |
| `asset.ts` | Entidad y ruta de almacenamiento determinista |
| `asset-repository.ts` | Interfaz de la fila |
| `asset-storage.ts` | Interfaz del archivo, aparte de la fila |
| `asset-repository.contract.ts` | Qué significa cumplir el contrato |
| `infrastructure/` | Adaptadores de Supabase: tabla y bucket |
| `supabase/migrations/0002_assets.sql` | Tabla, RLS, bucket privado y políticas |
| `presentation/http/asset-endpoints.ts` | Subir, listar y borrar |

Invariantes cubiertas por tests:

* Subir a un proyecto ajeno no sube nada.
* El original es inmutable: subir otra imagen crea un asset nuevo.
* La ruta se organiza por proyecto y nunca lleva el nombre del archivo.
* Si falla guardar la fila, el archivo subido se borra.
* Borrar una imagen ajena no borra nada.
* La respuesta no expone la ruta de almacenamiento.
* Contra la base de datos real: la propiedad transitiva se aplica y el bucket
  no entrega el archivo sin firma.

Decisiones en `storage.md` §147-§152.

## 2.12 Versiones de plantilla

La plantilla publicada de un proyecto. Hasta aquí se generaba y se perdía al
terminar la petición.

| Archivo | Responsabilidad |
| --- | --- |
| `templates/template-definition.ts` | Plantilla ↔ documento guardable, con `schemaVersion` |
| `templates/template-version.ts` | La versión publicada y su numeración |
| `templates/template-version-repository.ts` | Interfaz: `create`, nunca `save` |
| `templates/template-version-repository.contract.ts` | Qué significa cumplirlo |
| `templates/infrastructure/` | Adaptador de Supabase |
| `application/manage-template-versions.ts` | Publicar, listar y abrir |
| `presentation/http/template-endpoints.ts` | Las tres rutas |
| `supabase/migrations/0003_template_versions.sql` | Tabla, restricciones y RLS |

Invariantes cubiertas por tests:

* Una plantilla guardada y recuperada es **la misma plantilla**, con sus
  pliegues distinguidos de sus cortes.
* Publicar nunca sustituye: la versión anterior sigue diciendo lo mismo.
* Los números son correlativos **dentro del proyecto**, no del sistema.
* Publicar sobre un estado que ya no es el actual responde 409.
* Un documento con otro `schemaVersion` se rechaza en lugar de leerse «lo
  mejor posible».
* Un contorno abierto o una coordenada infinita fallan al leer el documento,
  no al imprimirlo.
* Un documento sin techo de piezas o de puntos no se acepta.
* Un listado no arrastra la geometría de cada versión.
* Contra la base de datos real: una versión publicada no se puede modificar ni
  borrar suelta, y dos publicaciones con el mismo número no caben.

Decisiones documentadas en `storage.md` §153-§159.

## 2.13 Exports y object storage

El documento generado de una versión de plantilla, y el puerto de
almacenamiento de archivos que comparte con las imágenes.

| Archivo | Responsabilidad |
| --- | --- |
| `storage/object-storage.ts` | Puerto: subir, borrar y firmar un enlace |
| `storage/in-memory-object-storage.ts` | Implementación de referencia |
| `infrastructure/supabase/supabase-object-storage.ts` | Un adaptador, dos buckets |
| `exports/export.ts` | Entidad del documento y su ruta |
| `exports/export-repository.ts` | Interfaz: crear, listar y borrar |
| `exports/export-repository.contract.ts` | Qué significa cumplirlo |
| `application/export-printable-document.ts` | Generar, entregar y borrar |
| `presentation/http/export-endpoints.ts` | Las cuatro rutas |
| `supabase/migrations/0004_exports.sql` | Tabla, RLS, bucket y políticas |

Invariantes cubiertas por tests:

* El documento guardado es un PDF de verdad, con el renderer real de punta a
  punta: versión guardada → PDF → archivo → enlace de descarga.
* Cada generación es un artefacto propio: volver a exportar no pisa el
  documento anterior.
* El export registra de qué versión, con qué papel y con qué generador salió.
* Si falla guardar la fila, el archivo subido se borra.
* Al borrar, primero la fila y después el archivo.
* La ruta de almacenamiento no sale en la respuesta de la API.
* Un formato de papel desconocido se rechaza con 400.
* Exportar una versión de otro proyecto responde 404.
* Contra la base de datos real: un export no se puede modificar, la versión
  de la que salió no se puede borrar mientras exista, y el bucket no entrega
  el documento sin firma.

El PDF se guarda entero en lugar de regenerarse en cada descarga, por la misma
razón por la que las versiones son inmutables: regenerarlo con otro generador
daría un documento distinto del que el usuario tiene impreso.

Decisiones documentadas en `storage.md` §160-§164.

## 2.14 Interfaz

Primera parte de la fase F. Cubre el ciclo entero del producto con la API que
ya existía.

| Archivo | Responsabilidad |
| --- | --- |
| `app/acceder/`, `app/crear-cuenta/` | Entrar y registrarse |
| `app/proyectos/layout.tsx` | Guarda de sesión, en servidor |
| `app/proyectos/page.tsx` | Panel: crear, renombrar, borrar |
| `app/proyectos/[id]/page.tsx` | Imagen, molde, versiones y documentos |
| `presentation/client/api/` | Un archivo por recurso: tipos, peticiones y hooks |
| `presentation/client/api-client.ts` | `{ code, message }` de la API → `ApiError` |
| `presentation/client/image-decoding.ts` | Único archivo que toca un canvas |
| `presentation/next/supabase.ts` | Cookies de la petición, en un solo sitio |
| `components/ui/` | shadcn/ui |
| `components/{session,projects,templates,exports}/` | Las pantallas |

> **Desde el 2026-09-21 la salida del producto es la imagen en mosaico**
> (`PRD.md` §44). Lo que sigue en esta sección describe la primera
> interfaz, con plantillas; la pantalla del proyecto ahora es la del póster:
> imagen, recorte opcional (`pdf.md` §95), tamaño en cm con las hojas al
> lado, vista previa con la retícula y descarga. Las piezas, las versiones de plantilla y su API siguen en el
> código, sin interfaz.

Lo que el usuario puede hacer hoy:

1. Crear una cuenta y entrar.
2. Crear un proyecto y subirle una imagen.
3. Ajustar medidas y papel **mirando el molde**: se recalcula solo y enseña
   cada pieza con la figura recortada dentro, la retícula de hojas encima con
   sus etiquetas y cuántas hojas lleva cada una (PRD §20).
4. **Descargar el PDF en un clic**, con la figura a color dentro del frente y
   de la espalda, recortada por la silueta y repartida en las hojas
   (`pdf.md` §93). Por debajo son tres operaciones —publicar
   la versión, generar el documento y firmar el enlace—, pero el usuario no
   tiene por qué saberlo.

Las versiones y los documentos generados quedan como historial, plegado:
son registro, no pasos. Una versión nace al descargar con medidas nuevas; si
las medidas y la imagen no cambian, se reutiliza la de esa visita.

La vista previa usa el mismo `createPrintLayout` que el documento, así que
el reparto en hojas es exacto aunque el dibujo sea orientativa
(`printing.md` §78). El enlace de descarga lleva el nombre del archivo y
se descarga sin abrir otra pestaña: nada que el navegador pueda bloquear.

## 2.15 La plantilla se deriva en el navegador

El dominio es TypeScript puro y el navegador ya trae un decodificador, así que
un PNG con transparencia se convierte en molde hoy, sin esperar a la fase B:
`image-decoding.ts` saca la máscara alfa con un canvas y `generateTemplate`
sigue desde ahí exactamente igual que en el servidor.

Es el borrador de `storage.md` §18 y es provisional (§158): la verdad física
pertenece al servidor. Lo que lo sostiene mientras tanto es que nada se guarda
tal cual —la definición pasa por los constructores del dominio al publicarse—
y que el PDF, que es lo que se imprime, se genera siempre en el servidor
desde la versión guardada.

Una imagen sin transparencia produce un molde con la forma del rectángulo
entero. El sistema lo detecta y avisa en lugar de fallar: es correcto y casi
nunca es lo que el usuario quería (`image-processing.md` §108).

## 2.16 Prueba de la cadena completa

`src/modules/pipeline.test.ts` recorre máscara → contorno → geometría →
plantilla → reparto en páginas.

Existe porque hay errores que solo viven en la costura: cada módulo puede ser
correcto por separado y la cadena estar mal. El caso que la motivó está en
§6.

## 2.17 El póster

La salida del producto (`PRD.md` §44). Reutiliza el reparto en hojas de las
plantillas; lo nuevo es qué se dibuja y cómo se elige el tamaño.

| Pieza | Qué hace |
| --- | --- |
| `image-processing/image-header.ts` | Formato, tamaño y orientación EXIF leídos del archivo, sin decodificarlo |
| `posters/poster.ts` | Tamaño en mm desde un lado, reparto en hojas, medidas de hojas justas |
| `posters/crop.ts` | Recorte en pixels, validado contra la imagen; dónde va la imagen entera |
| `posters/resolution.ts` | Pixels por pulgada y nitidez según la distancia (`pdf.md` §96) |
| `pdf-generation/image-orientation.ts` | Las ocho orientaciones EXIF como matriz de dibujo (`pdf.md` §97) |
| `application/export-poster.ts` | Lee la imagen guardada, genera el PDF y lo guarda |
| `POST /api/projects/[id]/posters` | Imagen, recorte opcional, un lado en mm y papel |
| `components/posters/` | Recorte, tamaño en cm con hojas al lado, vista previa y descarga |

El servidor decide con lo guardado: la proporción, el recorte y el giro se
comprueban contra la cabecera del archivo, no contra lo que diga el
navegador (`storage.md` §166).

---

# 3. Decisiones cerradas

No volver a abrirlas sin un motivo nuevo.

| Decisión | Motivo |
| --- | --- |
| `app/` en la raíz, dominio en `src/modules/` | Refleja el proyecto existente sin mover la ruta de Next |
| `printing/` es un módulo aparte de `geometry/` | Evita que el vocabulario geométrico dependa de conceptos de papel |
| `TemplateGeometry` vive en `geometry/` | Módulo estable del que depende impresión, no al revés |
| Todo el dominio en milímetros | Un único sistema de unidades elimina conversiones implícitas |
| Los pixels no salen de `image-processing/` | La conversión ocurre en un único punto |
| Vitest en entorno `node`, sin tests de UI | El valor está en las reglas físicas |
| Solo escala real (`PRINT_SCALE_ACTUAL_SIZE`) | MVP del PRD; el layout la declara en lugar de suponerla |
| La calibración puede faltar en una hoja | Preferible a imprimir una regla encima del molde |
| Las páginas vacías no se eliminan del reparto | Pueden contener material físico interior de la figura |
| `jspdf` solo se importa en `pdf-generation/infrastructure/` | La librería debe poder sustituirse sin tocar el dominio |
| Entre `PrintPage` y la librería hay un plano de dibujo en mm | Permite probar qué se dibuja sin generar un PDF |
| `PrintPage` expone `printableOrigin` | Los márgenes asimétricos hacen ambiguo deducirlo del tamaño |
| El documento es monocromo y usa Helvetica sin incrustar | Imprime igual en cualquier lector e impresora |
| La advertencia de escala se imprime en cada hoja | El documento no controla el visor ni el driver |
| Vecindad de 8 para la figura | El papel no se separa por una esquina |
| El contorno se traza por las aristas de la retícula | El trazo cae donde hay que cortar, no medio pixel adentro |
| Dos figuras comparables fallan en vez de unirse | La plantilla debe corresponder a lo que el usuario subió |
| Umbral alfa por defecto en 128 | Un pixel más opaco que transparente es figura |
| Extrusión perimetral para derivar las piezas | Con 200 mm de profundidad, pestañas en la silueta exigirían 100 mm |
| Todas las pestañas viven en la tira lateral | Recortar las caras es un corte continuo, sin entrantes |
| Pestañas automáticas, más cortas en curvas cerradas | Una pestaña recta sobre una curva se despega |
| `BACK` se declara reflejado aunque la silueta sea simétrica | Las caras se pegan mirándose: una se voltea |
| La simplificación nunca baja de 1,5 px | Por debajo de un pixel no hay figura, hay rasterización |
| La geometría de una pieza es una `TemplateGeometry` | Queda lista para imprimirse sin traducción intermedia |
| Los casos de uso viven en `src/application/` | Coordinan varios módulos y no pertenecen a ninguno |
| Toda la piñata en un solo PDF, con hoja de instrucciones | El usuario descarga un archivo, no uno por pieza |
| La numeración de hoja es local a la pieza | Al montar se trabaja pieza a pieza, no por número global |
| Estados `DRAFT`, `PROCESSING`, `READY`, `ERROR` | Los del PRD §22; `ARCHIVED` no lo pide nadie |
| Entre carpetas se importa con el alias `@/`, nunca con `../` | Un import que sube por el árbol se rompe al mover el archivo |
| TanStack Query y no SWR | El flujo es de mutaciones —subir, publicar, exportar— y necesita invalidación y reintentos con criterio |
| shadcn/ui en lugar de una librería de componentes | El código es del proyecto: se ajusta sin pelearse con el tema de nadie |
| Un 4xx no se reintenta y una mutación nunca se repite sola | Publicar dos veces crearía dos versiones |
| Un solo puerto de object storage para imágenes y documentos | Dos consumidores que necesitan lo mismo; el bucket lo decide el adaptador |
| El PDF se guarda entero y no se regenera al descargarlo | Otro generador daría un documento distinto del que el usuario imprimió |
| El PDF se entrega con un enlace firmado, no servido por la aplicación | Cincuenta hojas no deben atravesar el proceso que atiende peticiones |
| Un export sí se puede borrar; una versión no | El documento es regenerable desde su versión; la versión no lo es |
| La plantilla de un proyecto es la serie de sus versiones | Una tabla `templates` con solo un id no responde a ninguna pregunta |
| El repositorio de versiones no tiene `save` | Una versión publicada no se corrige: se publica la siguiente |
| La tabla de versiones no tiene política de UPDATE ni de DELETE | La inmutabilidad no puede depender de que el código se acuerde |
| La geometría va en `jsonb` y los metadatos en columnas | Un listado no debe leer documentos de cientos de kilobytes |
| Los puntos se guardan como pares `[x, y]` | Miles de puntos por plantilla; los nombres de campo repetidos pesan |
| Una definición guardada se valida al leerla | Lo que vuelve de fuera del proceso no es de fiar por tener la forma correcta |
| Toda operación del repositorio recibe el usuario | El aislamiento no puede depender de acordarse de filtrar |
| Un proyecto ajeno responde como inexistente | Distinguirlos revelaría qué identificadores existen |
| No hay clave de servicio | Todo el acceso pasa por el token del usuario y RLS |
| Las rutas de `app/` solo construyen el contexto | Lo que hace el trabajo debe poder probarse sin servidor |
| Un proyecto ajeno responde 404, no 403 | Un 403 confirmaría que existe |
| `getUser` y nunca `getSession` en servidor | La cookie la manda el cliente y puede estar manipulada |
| Ninguna respuesta revela quién tiene cuenta | El registro y el login serían un buscador de usuarios |
| `sign-in` no devuelve token | En el cuerpo acabaría en `localStorage` |
| Contraseña de 8 caracteres mínimo | Más estricto que el mínimo de Supabase, a propósito |
| Las credenciales de prueba viven en el entorno | Nunca en el código ni en el repositorio |
| Fila y archivo son interfaces separadas | Fallan por separado y hay que poder deshacer una |
| El bucket es privado, con URL firmada de 10 minutos | Bastante para mostrar, poco para repartir |
| La sesión se comprueba antes de leer el cuerpo | Un anónimo no debe hacer que el servidor cargue 10 MB |
| La salida es la imagen en mosaico, no el molde con piezas | Es lo que el fabricante necesita: pega la imagen en cartón y recorta él (`PRD.md` §44) |
| Las hojas se solapan 1 cm en lugar de llevar borde para recortar | Se pegan a ojo por las cruces; a cambio, la interfaz propone medidas de hojas justas |
| El tamaño se elige en cm; las hojas se enseñan al lado | Un fabricante piensa en centímetros, no en hojas |
| Recortar y girar no tocan el archivo guardado | El PDF lleva la imagen entera y la recorta y gira al dibujarla; sin recodificar |
| La resolución se avisa, no se impide | Una piñata grande algo borrosa puede ser lo que se quiere |

Detalle que confunde al leer geometría de páginas: el recorte **une los
fragmentos a través del punto de cierre** del polígono, así que el contorno de
una hoja puede empezar en mitad de un lado y no en el primer punto original.
Es correcto: el trazo es continuo.

---

# 4. Lo que falta

Orden recomendado para el producto de hoy, el póster:

1. Imprimir un póster y medirlo (§8.1).
2. Pulido del póster (abajo).
3. ~~Fase G: acceso sin cuenta y límites.~~ Hecha salvo el pago.
4. Fase H: landing, páginas legales y SEO.

**Las fases B, C y D quedan aparcadas**: servían al molde con piezas. El
póster no necesita quitar el fondo —el usuario recorta la figura a mano sobre
el cartón— ni derivar piezas. Se describen tal cual por si el molde vuelve
como opción (`PRD.md` §44). Las letras se mantienen para no invalidar las
referencias de este documento.

## Póster — pulido

* Opción sin solape, con borde blanco para recortar como Block Posters.
  Ahorra una columna en muchas medidas (`pdf.md` §94).
* Arrastrar y soltar al subir la imagen.
* Guardar el recorte en el documento generado, para poder regenerarlo igual
  (`pdf.md` §95). Hoy no hace falta: el PDF se guarda entero.
* Figura de ejemplo para probar sin subir nada (§8.11). La necesita también
  la landing de la fase H.

## Fase B — Eliminación de fondo (para imágenes opacas)

La parte determinista está hecha: validación, umbral, regiones conexas y
trazado del contorno. Y una imagen que **ya trae transparencia** funciona de
punta a punta: el navegador la decodifica y el dominio sigue desde la máscara
(§2.15).

Queda el caso que exige decidir: una foto opaca, donde hay que separar figura
de fondo.

* Decidir servicio externo o implementación local (§5.2). Es un adaptador de
  infraestructura, no dominio, y su contrato ya está abstraído
  (`image-processing.md` §16 y §19).
* Casos de error del PRD §9 que dependen de él: sin figura detectable y
  servicio caído. Los demás —imagen transparente, figura ambigua, imagen
  inválida— ya están cubiertos.
* Normalización de orientación EXIF antes de segmentar
  (`image-processing.md` §9).

Documentación: `image-processing.md` §98-§106.

## Fase C — Generación de plantilla

**Terminada.** Ver §2.6. El modelo de extrusión perimetral está implementado
y probado, con su validación de ensamblaje.

El versionado inmutable de las plantillas publicadas (`AGENTS.md` §17)
también está hecho, ya con persistencia detrás (§2.12).

Queda fuera, por decisión explícita:

* Siluetas con huecos, que necesitan una pared interior propia
  (`template.md` §121).
* Colocación manual de pestañas: en el MVP son automáticas.

## Fase D — Capa de aplicación

**Parcial.** Ver §2.7. `GenerateTemplate` y `GeneratePdf` están hechos: una
máscara alfa produce un PDF completo sin pasar por ninguna capa más.

`CreateProject`, `UploadImage`, la publicación de versiones y
`DownloadExport` también (§2.7, §2.9, §2.11, §2.12 y §2.13).

Lo único que falta de esta fase es `ProcessImage`.

`ProcessImage` depende además de la eliminación de fondo (fase B). Cuando
exista, será un caso de uso delgado: el adaptador entrega una `AlphaMask` y
`generateTemplate` sigue desde ahí sin cambios.

## Fase E — Infraestructura

**Parcial.** Ver §2.8. El proyecto del usuario está persistido, con su
repositorio, su contrato y sus políticas RLS.

La migración está **aplicada y verificada**: `pnpm check:supabase` confirma
que la tabla existe y que un cliente sin sesión ni siquiera puede tocarla
—responde `42501`, que es el `revoke` de la migración actuando antes incluso
que RLS—.

El registro y el inicio de sesión también están hechos (§2.10).

Las versiones de plantilla (§2.12) y los exports (§2.13) también. Las cuatro
migraciones se aplican a mano y en orden; `pnpm check:supabase` comprueba las
cuatro tablas y los dos buckets.

Falta:

* El asset procesado, que separa el original de lo que produce la
  eliminación de fondo (`AGENTS.md` §19). El original ya está (§2.11).
* Limpiar los archivos huérfanos y decidir la retención (`storage.md` §164).

El repositorio de proyectos fija el patrón que los demás deben seguir:
interfaz en el dominio, contrato compartido, adaptador en `infrastructure/`,
y el usuario en cada operación.

## Fase F — Presentación

**Parcial.** El ciclo completo está cubierto (§2.14): sesión, proyectos,
imagen, molde con su coste, versiones y descarga del PDF.

Desde el 2026-09-21 la pantalla del proyecto es la del póster (§2.17): la
interfaz de plantillas se retiró. Lo pendiente del póster está en «Póster —
pulido».

Falta:

* Margen y solape en el formulario: hoy son los valores del producto y no se
  pueden tocar desde la interfaz.
* Los estados del proyecto no se mueven desde la interfaz: generar un PDF no
  lo lleva a `READY` (`storage.md` §159).

## Fase G — Acceso, límites y monetización

Requisitos en `PRD.md` §38 y §39. Criterios AC-16 a AC-18 y AC-21.

**Hecha salvo el nivel de pago, el 2026-09-21** (`usage.md`): `/crear` sin
cuenta y sin guardar nada, límite diario de 3 sin cuenta y 20 con cuenta
contado en la base de datos (migración 0008), el anónimo reconocido por
cookie e IP con huella HMAC, y el límite alcanzado como estado previsto con
el registro como salida.

Queda:

* El nivel de pago en el perfil del usuario: hoy toda cuenta es
  `REGISTERED` (`usage.md` §7). Llega con el cobro.
* Mencionar la IP en la política de privacidad (fase H, `usage.md` §5).

Lo que pedía la fase, por contexto:

El producto se usa **sin cuenta**, con un límite diario; la cuenta sirve para
guardar proyectos y acceder a más herramientas; el nivel de pago quita la
publicidad y añade herramientas profesionales.

* Uso anónimo de punta a punta: subir, configurar y descargar sin registro.
* Contador de uso diario **en servidor**, por nivel de acceso. Nunca en
  cliente: un contador en el navegador no es un límite.
* Estado de «límite alcanzado» como estado previsto de la interfaz, con el
  registro como salida, y avisado antes de que el usuario haga el trabajo.
* Nivel de acceso en el modelo de usuario, aunque el cobro llegue después.

**El sistema de pagos sigue fuera del MVP** (`PRD.md` §27). Lo que entra ahora
es que el modelo no impida añadirlo.

## Fase H — Publicación: SEO y páginas legales

Requisitos en `PRD.md` §40, §41 y §42. Criterios AC-19, AC-20, AC-22 y AC-23.

Condiciona poder publicar con Google AdSense, no la utilidad de la
herramienta. Por eso va al final: sin molde correcto no hay nada que
posicionar.

* ~~**Landing page amigable**~~ **Hecha el 2026-09-21** (`app/page.tsx`):
  cómo funciona en cuatro pasos, ejemplos, por qué aquí y preguntas
  frecuentes con datos estructurados `FAQPage`. Los ejemplos no están
  escritos a mano: medidas y hojas salen del módulo de pósters, y son hojas
  justas en los dos sentidos. Las ilustraciones usan los tokens
  `--illustration-*` del tema. Lo que se pidió: explica en pasos cómo
  funciona (subir, recortar, elegir tamaño, imprimir y pegar), enseña
  ejemplos de piñatas hechas con el póster y dice por qué usar esta web y no
  una herramienta genérica de pósters: medidas en cm, hojas justas, mapa de
  montaje, regla de calibración y aviso de resolución. Es también el
  contenido indexable que pide el SEO, y el sitio natural para la figura de
  ejemplo (§8.11).
* **Páginas legales hechas el 2026-09-21** (`legal.md`), con los datos del
  titular como marcadores y un aviso de borrador visible mientras falten.
  **Antes de publicar:** rellenar `src/components/legal/site-owner.ts` y que
  alguien que conozca la ley del país revise los textos. Lo que se pidió:
* Las cuatro páginas legales, enlazadas desde el pie: privacidad, términos,
  cookies y aviso legal. Sin ellas AdSense no aprueba la cuenta.
* Consentimiento de cookies con rechazo efectivo de la publicidad
  personalizada.
* Contenido público indexable con valor real, servido desde el servidor.
* Metadatos por página, `sitemap.xml` y `robots.txt` generados.
* Panel de proyectos y URLs de trabajo fuera del índice.
* Integración de AdSense, nunca dentro del PDF.

---

# 5. Preguntas abiertas

1. ~~¿Cómo se derivan las piezas y los pliegues desde silueta + profundidad?~~
   **Resuelta:** extrusión perimetral, `template.md` §110-§122.
2. ¿La eliminación de fondo es un servicio externo o se hace en el servidor?
   Afecta a coste, latencia y modo de fallo.
3. ~~¿Las pestañas se generan automáticamente o las coloca el usuario?~~
   **Resuelta:** automáticas, con distribución derivada de la curvatura
   (`template.md` §116). Si luego se quieren editables, hay que guardarlas
   como datos y no como geometría ya fusionada.
4. ~~¿La hoja de instrucciones es una página más del PDF o un documento
   aparte?~~ **Resuelta:** una página más, como ya indicaba PRD §19
   (`pdf.md` §91). Separarla permitiría imprimir la plantilla sin haber leído
   la advertencia de escala.
5. ¿Cuál es el límite diario para el usuario anónimo y para el registrado?
   Depende del coste real de quitar el fondo, que todavía no se conoce
   (pregunta 2).
6. ¿Cómo se identifica al usuario anónimo para contarle el uso? Cualquier
   método es evadible; hay que decidir cuánto esfuerzo merece.
7. ¿Qué herramientas justifican registrarse y cuáles el nivel de pago? Sin una
   respuesta, el registro no ofrece nada a cambio.
8. ¿El producto es solo en español? Afecta a URLs, metadatos y mercado, y
   meter i18n después de la fase F es reescribir la fase F (§8.10).
9. ¿Con qué se prueba la interfaz? La suite de dominio no cubre navegador a
   propósito, y la fase F se queda sin red si no se decide antes (§8.9).
10. ¿La imagen se sube a través del servidor o directamente al object storage
    con una URL firmada? Hoy pasa entera por memoria del servidor (§8.5).

---

# 6. Deuda conocida

* `CUSTOM_SCALE` no está implementado. Requiere escalar la geometría antes del
  reparto en páginas (`printing.md` §17, §19). El renderer de PDF ya rechaza
  con un error explícito cualquier escala distinta de la real.
* El pie de página del PDF puede caer sobre la plantilla en una hoja muy
  ocupada. Es un compromiso consciente: a diferencia de la regla de
  calibración, la etiqueta de la hoja no puede omitirse (`pdf.md` §87).
* Los huecos de la silueta se extraen pero no se convierten a milímetros. El
  modelo de extrusión no los cubre: un hueco es una pared interior y necesita
  su propia tira. Falla de forma explícita (`template.md` §121).
* Cada pieza se imprime en su propio documento, así que dos piezas pequeñas
  nunca comparten hoja. Agruparlas es un problema de empaquetado que todavía
  no se ha abordado: hoy cuesta hojas, no corrección.
* La plantilla completa de una figura de un metro supera las cuarenta hojas.
  Es lo que cuesta físicamente, pero conviene avisar antes de generar
  (`template.md` §120).
* Los valores iniciales de los parámetros de derivación —anchura de pestaña,
  umbral de doblez, tolerancia de planitud— son un punto de partida razonado,
  no medido. Se ajustan cuando haya moldes impresos y montados
  (`template.md` §118).
* La orientación EXIF se aplica al dibujar el póster (`pdf.md` §97), pero
  no se normaliza para segmentar: una máscara de la fase B sacada de los
  bytes guardados saldría tumbada (`image-processing.md` §9).
* El umbral de figura ambigua (la mitad del área mayor) es provisional
  mientras el producto no decida si el usuario puede elegir la figura a mano
  (`image-processing.md` §101).
* El reparto en páginas no descarta hojas sin geometría. Optimizar el uso de
  papel es una decisión pendiente, no un olvido.
* Borrar una cuenta entera no se puede hacer desde la aplicación: la
  política de privacidad lo ofrece por correo, en 30 días, y alguien lo
  tiene que hacer a mano hasta que exista (`legal.md` §3).
* Los archivos del object storage no se borran al borrar un proyecto: las
  filas se van en cascada y el bucket no se entera. Hace falta un proceso de
  limpieza o borrar los archivos antes (`storage.md` §59 y §164).
* El PDF se genera dentro de la petición. Para una piñata de un metro son
  unos segundos; si llega a molestar, el export ya tiene identidad propia
  para poder consultarse en segundo plano (`storage.md` §115).
* Los márgenes de hardware de la impresora no se modelan (`printing.md` §12).

---

# 7. Criterios de aceptación del MVP

| AC | Criterio | Estado |
| --- | --- | --- |
| AC-01 | Crear un proyecto | **Hecho y probado** |
| AC-02 | Subir una imagen válida | **Hecho y probado** |
| AC-03 | Visualizar la imagen cargada | **Hecho y probado** |
| AC-04 | Obtener una figura aislada | Aparcado con el molde: el póster no la necesita |
| AC-05 | Configurar medidas y papel | **Hecho y probado**, en cm y con recorte |
| AC-06 | Generar una plantilla | **Hecho y probado**; hoy la salida es el póster |
| AC-07 | Conservar las dimensiones físicas | **Hecho y probado** |
| AC-08 | Dividir automáticamente en páginas | **Hecho y probado** |
| AC-09 | Identificadores de página | **Hecho y probado** |
| AC-10 | Marcas de alineación | **Hecho y probado** |
| AC-11 | Referencia de calibración | **Hecho y probado** |
| AC-12 | Generar PDF | **Hecho y probado** |
| AC-13 | Descargar el PDF | **Hecho y probado** |
| AC-14 | Reabrir el proyecto | **Hecho y probado** |
| AC-15 | Aislamiento entre usuarios | **Hecho y probado** para proyectos |
| AC-16 | Generar y descargar sin cuenta | **Hecho y probado** (`usage.md` §10) |
| AC-17 | El límite se cuenta en el servidor | **Hecho y probado**, atómico en la base de datos |
| AC-18 | Al alcanzarlo se explica y se ofrece registrarse | **Hecho y probado** |
| AC-19 | Las cuatro páginas legales, enlazadas desde el pie | **Hecho**, con los datos del titular pendientes (`legal.md` §2) |
| AC-20 | Rechazar la publicidad personalizada | Pendiente: llega con AdSense (`legal.md` §4) |

---

# 8. Lo que no estaba contemplado

Repaso del proyecto a fecha de hoy. No son requisitos —los requisitos están en
`PRD.md`— sino huecos entre lo que hay construido y lo que hace falta para que
esto funcione con usuarios de verdad. Cada uno dice qué pasa si se ignora.

## 8.1 Nadie ha impreso un molde todavía

Es el riesgo más grande del proyecto y no se parece a ninguno de los demás.

Con el póster (§2.17) la prueba es más sencilla que con el molde: imprimir la
hoja de resumen y medir la regla de 10 cm, y después dos hojas vecinas y
comprobar que las cruces coinciden al solaparlas.

Todo lo que dice que la escala es correcta son tests: comprueban que el
sistema hace lo que el sistema cree que debe hacer. Que un cuadrado de 100 mm
en el PDF mida 100 mm **con una regla, en papel** no lo ha comprobado nadie.
Entre el PDF y el papel hay un visor, un driver y una impresora, y cualquiera
de los tres puede escalar sin avisar.

`printing.md` §75 ya lo pide. La diferencia es de orden: conviene hacerlo
**antes** de construir la interfaz, porque si el molde sale a 96 % todo lo que
se construya encima sobra.

Hace falta un procedimiento repetible y registrado: qué se imprime, con qué
ajustes del diálogo de impresión, qué se mide y qué desviación se acepta.

## 8.2 La previsualización va a necesitar un renderer que no existe

La fase F pide vista previa de la plantilla y del reparto en páginas. Hoy la
única salida es un PDF, y previsualizar generando PDFs es lento y pesado.

`PrintRenderer` es una interfaz precisamente para esto (`printing.md` §66-§68):
un renderer que produzca SVG da previsualización barata en el navegador y, de
paso, una forma de mirar una plantilla cuando algo sale raro. Es la pieza de
fase F con más valor por línea escrita.

## 8.3 El montaje se calcula y no se imprime

`templates/assembly.ts` produce el grafo de conexiones y los pasos de montaje,
con sus tests. Nada de eso llega al usuario: la hoja de instrucciones del PDF
solo lleva medidas y la advertencia de escala.

Es trabajo ya hecho y pagado que no se ve. Un usuario con diecisiete piezas
recortadas y sin instrucciones tiene un problema que el sistema ya sabe
resolver.

## 8.4 No hay forma de saber qué falló

No hay registro estructurado ni captura de errores. Cuando alguien diga «no me
sale el PDF», hoy no hay nada que mirar: el error se imprime en la consola del
servidor y se pierde.

Antes de abrir esto al público hace falta, como mínimo, saber qué petición
falló, con qué código de los de `error-response.ts` y cuántas veces. Los
códigos ya existen y son estables, que es la mitad del trabajo.

## 8.5 Nada impide el abuso puntual

La fase G cubre el límite **diario** por nivel de acceso. No cubre la ráfaga:
cien subidas en un minuto, o cien PDFs de quinientas hojas. Generar un
documento es trabajo de CPU dentro de la petición, así que un solo cliente
puede tumbar el servidor sin saltarse ningún límite diario.

Además, la imagen se sube **a través del servidor**: se carga entera en
memoria para reenviarla al bucket. Subir directamente al object storage con
una URL firmada quita ese coste y ese riesgo de en medio.

## 8.6 El archivo se valida por lo que dice ser — resuelto

La subida lee la cabecera y rechaza un contenido distinto del declarado
(`image-processing.md` §110). Queda como estaba escrito abajo por contexto.


`validateImageUpload` comprueba el tipo declarado, la extensión y el peso. No
mira el contenido: un archivo puede llamarse `.png`, declarar `image/png` y
ser otra cosa (`storage.md` §122).

La comprobación real llega sola con el decodificador de la fase B, pero
conviene que esté escrito para que nadie dé por hecho que ya se hace.

## 8.7 Las migraciones se aplican a mano y nadie comprueba que estén

`pnpm check:supabase` dice si las tablas existen, y eso ya evita el peor caso.
Lo que no hay es un registro de qué migración se aplicó y cuándo: el entorno y
el repositorio pueden separarse sin que nada lo note hasta que una consulta
falla.

## 8.8 No hay integración continua

`pnpm verify` encadena formato, lint, tipos y tests, pero solo corre si
alguien se acuerda. Un trabajo que lo ejecute en cada push cuesta media hora
de configurar y es lo que hace que el verde signifique algo.

Las pruebas de integración necesitan credenciales y una cuenta de prueba, así
que van en un trabajo aparte, no en el de cada push.

## 8.9 La interfaz no tiene forma de probarse

La suite de Vitest es de dominio a propósito: entorno `node`, sin React ni
navegador (`geometry.md` §84). Esa decisión sigue siendo buena, pero deja la
fase F sin red.

Hace falta decidir **ahora**, antes de escribir cuarenta pantallas, con qué se
prueba el flujo completo en un navegador de verdad —subir, configurar,
descargar el PDF— y que esa suite viva separada de la del dominio.

## 8.10 Si se quiere inglés, se decide antes de escribir las pantallas

Los textos de la interfaz y los mensajes de `error-response.ts` están en
español dentro del código. Para un producto que depende de SEO, el idioma no
es un detalle de presentación: cambia las URLs, los metadatos y el mercado al
que se puede llegar.

Meter i18n después de la fase F es reescribir la fase F.

## 8.11 Quien llega sin una imagen no puede probar nada

La herramienta exige subir algo antes de enseñar nada. Una figura de ejemplo
—con su molde ya generado— deja probar el producto en un clic, da contenido
indexable para la fase H y sirve de caso de prueba físico para §8.1.

## 8.12 Copias de seguridad y qué pasa si se pierde

Hay trabajo de usuarios guardado —proyectos, plantillas publicadas,
documentos— y ninguna política escrita sobre copias, retención ni
recuperación. Conviene decidirlo mientras la respuesta todavía puede ser «no
hace falta nada».
