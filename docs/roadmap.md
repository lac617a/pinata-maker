# Piñata Maker — Roadmap

Estado del desarrollo: qué existe, qué decisiones ya están cerradas y qué
queda por construir.

Este documento **no define comportamiento**. Es un registro de estado. Cuando
haya conflicto, mandan `PRD.md`, `domain.md`, `architecture.md` y la
documentación del subsistema, en ese orden (`AGENTS.md` §6).

Debe actualizarse al terminar cada fase.

Cada feature termina en un commit: el historial es lo que explica qué se hizo
y cuándo. La regla completa está en `AGENTS.md` §54.

---

# 1. Estado actual

El **bucle físico está cerrado**. Dada una `TemplateGeometry` en milímetros,
el sistema produce un PDF imprimible a tamaño real, repartido en hojas, con
marcas de alineación, regla de calibración e identidad de página.

Del lado de la imagen, todo lo determinista está hecho: validación del
archivo, umbral del canal alfa, regiones conexas y trazado del contorno. Falta
únicamente quitar el fondo, que es un adaptador de infraestructura.

No hay todavía capa de aplicación, ni persistencia, ni interfaz.

```text
[✓] Máscara alfa → contorno en pixels → geometría en mm
[✓] Silueta + profundidad → piezas con pliegues y pestañas
[✓] Geometría en mm → reparto en páginas → PrintLayout
[✓] PrintLayout → PDF
[ ] Imagen real → máscara alfa (eliminación de fondo)
[ ] Proyecto, persistencia, autenticación, interfaz
```

De punta a punta, con un solo caso de uso: una máscara elíptica de 600 × 800
px pedida a 800 × 1000 mm con 200 mm de profundidad produce 17 piezas, 2,10 m²
de papel y un único PDF de 48 hojas A4 con su hoja de instrucciones.

A partir de aquí la validación que importa es física: imprimir un molde
conocido y medirlo con una regla real (`printing.md` §75).

Verificación:

```bash
pnpm test        # 297 tests, más 7 de integración que necesitan cuenta
pnpm exec tsc --noEmit
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

## 2.11 Prueba de la cadena completa

`src/modules/pipeline.test.ts` recorre máscara → contorno → geometría →
plantilla → reparto en páginas.

Existe porque hay errores que solo viven en la costura: cada módulo puede ser
correcto por separado y la cadena estar mal. El caso que la motivó está en
§6.

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

Detalle que confunde al leer geometría de páginas: el recorte **une los
fragmentos a través del punto de cierre** del polígono, así que el contorno de
una hoja puede empezar en mitad de un lado y no en el primer punto original.
Es correcto: el trazo es continuo.

---

# 4. Lo que falta

Orden recomendado. **Las fases A y C están terminadas, la B lo está salvo la
eliminación de fondo y la D a falta de lo que exige persistencia** (ver §2.3,
§2.5, §2.6 y §2.7); las letras se mantienen para no invalidar las referencias
de este documento.

## Fase B — Eliminación de fondo (lo único que queda)

La parte determinista está hecha: validación, umbral, regiones conexas y
trazado del contorno. Queda el adaptador que produce la máscara alfa a partir
de la imagen del usuario.

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

Queda fuera, por decisión explícita:

* Siluetas con huecos, que necesitan una pared interior propia
  (`template.md` §121).
* Colocación manual de pestañas: en el MVP son automáticas.
* Versionado e inmutabilidad de plantillas publicadas (`AGENTS.md` §17), que
  no tiene sentido hasta que exista persistencia (fase E).

## Fase D — Capa de aplicación

**Parcial.** Ver §2.7. `GenerateTemplate` y `GeneratePdf` están hechos: una
máscara alfa produce un PDF completo sin pasar por ninguna capa más.

Falta lo que depende de persistencia y no puede construirse antes de la fase
E: `CreateProject`, `UploadImage`, `DownloadExport`.

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

Falta:

* Plantillas y sus versiones, con inmutabilidad (`storage.md` §15-§22,
  `AGENTS.md` §17).
* Assets, separando el original del procesado (`AGENTS.md` §19,
  `storage.md` §37-§49).
* Exports y object storage.
* Plantillas persistidas: hoy una plantilla se genera y se pierde.

El repositorio de proyectos fija el patrón que los demás deben seguir.

## Fase F — Presentación

`app/page.tsx` es todavía la página de bienvenida inicial.

* Subida de imagen con arrastrar y soltar, previsualización y reemplazo.
* Formulario de configuración: ancho, alto, profundidad, papel, orientación,
  margen, solape.
* Vista previa de la plantilla y del reparto en páginas. La previsualización
  es orientativa: nunca es la fuente de verdad física (`printing.md` §78).
* Panel de proyectos, estados y manejo de errores (PRD §21, §22, §23).
* Hoja de instrucciones del documento (PRD §19).

## Fase G — Acceso, límites y monetización

Requisitos en `PRD.md` §38 y §39. Criterios AC-16 a AC-18 y AC-21.

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

---

# 6. Deuda conocida

* `pnpm lint` no está configurado: lanza el asistente interactivo de Next y
  falla. Hay que migrar a la CLI de ESLint.
* `CUSTOM_SCALE` no está implementado. Requiere escalar la geometría antes del
  reparto en páginas (`printing.md` §17, §19). El renderer de PDF ya rechaza
  con un error explícito cualquier escala distinta de la real.
* El pie de página del PDF puede caer sobre la plantilla en una hoja muy
  ocupada. Es un compromiso consciente: a diferencia de la regla de
  calibración, la etiqueta de la hoja no puede omitirse (`pdf.md` §87).
* El PDF no incrusta la imagen de referencia (`pdf.md` §88, PRD §24).
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
* La orientación EXIF no se normaliza. Una foto girada produciría un contorno
  girado (`image-processing.md` §9).
* El umbral de figura ambigua (la mitad del área mayor) es provisional
  mientras el producto no decida si el usuario puede elegir la figura a mano
  (`image-processing.md` §101).
* El reparto en páginas no descarta hojas sin geometría. Optimizar el uso de
  papel es una decisión pendiente, no un olvido.
* Los márgenes de hardware de la impresora no se modelan (`printing.md` §12).

---

# 7. Criterios de aceptación del MVP

| AC | Criterio | Estado |
| --- | --- | --- |
| AC-01 | Crear un proyecto | Dominio y persistencia listos; falta interfaz (F) |
| AC-02 | Subir una imagen válida | Validación lista; falta interfaz (F) |
| AC-03 | Visualizar la imagen cargada | Pendiente (F) |
| AC-04 | Obtener una figura aislada | Parcial: falta la eliminación de fondo |
| AC-05 | Configurar medidas y papel | Dominio listo; falta interfaz (F) |
| AC-06 | Generar una plantilla | **Hecho y probado** |
| AC-07 | Conservar las dimensiones físicas | **Hecho y probado** |
| AC-08 | Dividir automáticamente en páginas | **Hecho y probado** |
| AC-09 | Identificadores de página | **Hecho y probado** |
| AC-10 | Marcas de alineación | **Hecho y probado** |
| AC-11 | Referencia de calibración | **Hecho y probado** |
| AC-12 | Generar PDF | **Hecho y probado** |
| AC-13 | Descargar el PDF | Documento listo; falta entregarlo (E, F) |
| AC-14 | Reabrir el proyecto | API lista; falta interfaz (F) |
| AC-15 | Aislamiento entre usuarios | **Hecho y probado** para proyectos |
