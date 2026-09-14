# Piñata Maker — Product Requirements Document

**Version:** 1.0
**Status:** Draft
**Product:** Piñata Maker
**Document:** Product Requirements Document

---

# 1. Product Overview

Piñata Maker es una aplicación web que permite a fabricantes de piñatas transformar una imagen de referencia en una plantilla física preparada para imprimir, recortar y ensamblar.

El usuario proporciona una imagen, define las dimensiones físicas de la figura y selecciona el formato de papel disponible.

La aplicación procesa la imagen, obtiene su contorno, genera una geometría escalada y divide automáticamente la plantilla en páginas imprimibles.

El resultado final es un archivo PDF que puede imprimirse a escala real.

---

# 2. Problem

Actualmente, muchos fabricantes de piñatas deben realizar manualmente varias tareas:

* Buscar una imagen adecuada.
* Separar la figura del fondo.
* Adaptar la figura a un tamaño determinado.
* Dibujar o modificar manualmente el contorno.
* Dividir figuras grandes en varias hojas.
* Alinear las hojas impresas.
* Mantener las dimensiones reales.
* Crear las piezas necesarias para construir la piñata.

Estas tareas requieren tiempo y conocimientos técnicos o de diseño.

Piñata Maker busca reducir este trabajo mediante un flujo automatizado y sencillo.

---

# 3. Target User

El producto está dirigido principalmente a:

* Fabricantes de piñatas.
* Emprendedores de decoración.
* Personas que realizan piñatas personalizadas.
* Pequeños negocios de fiestas.
* Diseñadores que crean moldes para manualidades.

El usuario final no necesariamente tiene conocimientos de diseño gráfico, CAD o software vectorial.

Por esta razón, la interfaz debe priorizar simplicidad y claridad.

---

# 4. Product Goal

Permitir que un usuario pase de:

> "Tengo una imagen y necesito hacer una piñata de este tamaño"

a:

> "Tengo un molde listo para imprimir."

en pocos pasos.

---

# 5. Core User Flow

```text
Crear proyecto
      ↓
Subir imagen
      ↓
Procesar imagen
      ↓
Obtener figura
      ↓
Configurar dimensiones
      ↓
Generar plantilla
      ↓
Revisar plantilla
      ↓
Dividir en hojas
      ↓
Generar PDF
      ↓
Imprimir
```

---

# 6. MVP Scope

El MVP debe concentrarse exclusivamente en el flujo:

```text
IMAGE
→ SILHOUETTE
→ GEOMETRY
→ SCALE
→ TILING
→ PDF
```

El MVP debe permitir:

1. Crear un proyecto.
2. Subir una imagen.
3. Obtener una figura aislada.
4. Configurar dimensiones.
5. Generar un contorno.
6. Escalar el contorno a dimensiones físicas.
7. Seleccionar formato de papel.
8. Dividir automáticamente la plantilla en páginas.
9. Agregar marcas de alineación.
10. Generar PDF.
11. Descargar PDF.
12. Guardar el proyecto.

---

# 7. Feature: Project

## Description

Un proyecto representa un trabajo de fabricación de una piñata.

## Project data

Debe almacenar como mínimo:

* id
* userId
* name
* originalImage
* template configuration
* generated template
* generated files
* createdAt
* updatedAt

## User actions

El usuario puede:

* Crear proyecto.
* Ver proyecto.
* Editar proyecto.
* Eliminar proyecto.
* Generar nuevamente el molde.
* Descargar archivos.

---

# 8. Feature: Image Upload

## Description

El usuario puede cargar una imagen que será utilizada como referencia.

## Supported formats

* PNG
* JPEG
* WEBP

## Validation

La aplicación debe validar:

* MIME type.
* Extensión.
* Tamaño máximo.
* Dimensiones mínimas.
* Dimensiones máximas.

La validación debe realizarse tanto en cliente como en servidor.

## UX

El usuario debe poder:

* Arrastrar una imagen.
* Seleccionar una imagen desde el dispositivo.
* Ver una previsualización.
* Reemplazar la imagen.

---

# 9. Feature: Image Processing

## Objective

Obtener la figura principal eliminando el fondo cuando sea necesario.

## Pipeline

```text
Original Image
      ↓
Image Validation
      ↓
Background Removal
      ↓
Foreground Image
      ↓
Alpha Mask
      ↓
Contour Detection
```

El procesamiento debe producir información que pueda convertirse en geometría.

No se debe utilizar simplemente la imagen rasterizada como plantilla.

## Error cases

Debe manejar:

* Imagen sin figura detectable.
* Imagen completamente transparente.
* Imagen demasiado compleja.
* Servicio de procesamiento no disponible.
* Imagen inválida.

---

# 10. Feature: Template Configuration

El usuario debe poder definir las dimensiones finales.

## Dimensions

* Width
* Height
* Depth

Las dimensiones deben utilizar unidades físicas.

Unidad principal:

**millimeters (mm)**

Ejemplo:

```text
Width: 800 mm
Height: 1000 mm
Depth: 200 mm
```

## Paper formats

Soportar:

* A4
* A3
* Letter

## Orientation

* Portrait
* Landscape

## Margins

Permitir configurar el margen de impresión.

Valor inicial recomendado:

5 mm

## Overlap

Permitir definir el solapamiento entre páginas.

Valor inicial recomendado:

10 mm

---

# 11. Physical Scale

La escala física es una regla crítica del producto.

Si el usuario configura:

```text
Width = 800 mm
Height = 1000 mm
```

la geometría resultante debe representar exactamente:

```text
800 × 1000 mm
```

cuando el PDF sea impreso al 100%.

No se debe depender de:

* CSS pixels.
* Browser viewport.
* DPI del navegador.
* Resolución de pantalla.

La geometría interna debe utilizar unidades físicas.

---

# 12. Feature: Template Generation

## Objective

Transformar la figura procesada en una plantilla física.

## Pipeline

```text
Alpha Mask
    ↓
Contour Detection
    ↓
Contour Simplification
    ↓
Polygon
    ↓
Physical Scaling
    ↓
Template Geometry
```

## Template Geometry

Debe representar:

* Contorno.
* Líneas de corte.
* Líneas de doblado.
* Pestañas.
* Marcas de alineación.

---

# 13. Template Parts

Una plantilla puede contener diferentes piezas.

Ejemplos:

```text
Front
Back
Side
Top
Bottom
Tabs
```

No todas las plantillas requieren todas las piezas.

La generación debe depender del tipo de plantilla.

---

# 14. Feature: Page Tiling

## Objective

Dividir automáticamente una plantilla que sea mayor que una hoja física.

Ejemplo:

```text
Template:
800 × 1000 mm

Paper:
A4
```

La aplicación debe dividir la plantilla en múltiples páginas.

Ejemplo:

```text
A1  A2  A3
B1  B2  B3
C1  C2  C3
D1  D2  D3
```

El algoritmo debe intentar minimizar desperdicio de papel.

---

# 15. Page Identification

Cada página debe tener información suficiente para ensamblarla.

Debe incluir:

* Piece identifier.
* Page number.
* Total pages.
* Alignment marks.
* Scale information.

Ejemplo:

```text
Piece: FRONT
Page: A2
Total: 12
```

---

# 16. Alignment System

Las páginas deben incluir marcas que permitan identificar cómo unirlas.

Ejemplo:

```text
A1 → A2
A2 → A3

B1 → B2
B2 → B3
```

Las marcas deben ser claras y fáciles de interpretar.

---

# 17. Calibration

Cada página debe incluir una referencia física para comprobar la escala.

Ejemplo:

```text
Calibration
0 ───────── 100 mm
```

El usuario puede medir esta referencia después de imprimir.

Si no mide 100 mm, debe saber que la impresora está aplicando escalado.

---

# 18. Feature: PDF Generation

El PDF es el principal resultado del MVP.

## Requirements

Debe:

* Mantener el tamaño físico de página.
* Mantener las dimensiones reales.
* Utilizar geometría vectorial cuando sea posible.
* Mantener líneas de corte.
* Mantener líneas de doblado.
* Mantener marcas de alineación.
* Incluir identificadores de página.
* Incluir calibración.

## Printing instructions

El PDF debe incluir instrucciones:

> Imprimir al 100% / tamaño real.

> No utilizar "Ajustar a página".

---

# 19. PDF Page Types

El documento puede contener:

### Página de instrucciones

Incluye:

* Nombre del proyecto.
* Dimensiones.
* Formato de papel.
* Escala.
* Instrucciones de impresión.

### Páginas de plantilla

Cada página contiene la geometría correspondiente.

---

# 20. Feature: Template Preview

Antes de descargar el PDF, el usuario debe poder visualizar el resultado.

Debe mostrar:

* Tamaño total.
* Número de páginas.
* Distribución.
* Piezas.
* Identificadores.

El preview no necesita representar exactamente el PDF a nivel de impresión, pero debe permitir comprobar visualmente el resultado.

---

# 21. Project Dashboard

El usuario debe tener una pantalla:

```text
Mis proyectos
```

Cada proyecto debe mostrar:

* Imagen.
* Nombre.
* Dimensiones.
* Fecha.
* Estado.

Acciones:

* Abrir.
* Editar.
* Generar.
* Descargar.
* Eliminar.

---

# 22. States

El proyecto debe tener estados claros.

Ejemplo:

```text
DRAFT
PROCESSING
READY
ERROR
```

No utilizar estados genéricos como:

```text
status = "something"
```

Cada estado debe representar una condición real del dominio.

---

# 23. Error Handling

Los errores deben ser comprensibles para el usuario.

Ejemplo:

En lugar de:

```text
Something went wrong.
```

mostrar:

```text
No pudimos detectar una figura en la imagen.
Prueba con una imagen donde el personaje tenga un fondo más limpio.
```

Los errores técnicos deben registrarse internamente sin exponer detalles innecesarios.

---

# 24. Authentication

Los usuarios deben autenticarse para guardar proyectos.

El sistema debe utilizar Supabase Auth.

Cada proyecto pertenece a un usuario.

Un usuario no puede acceder a proyectos pertenecientes a otro usuario.

---

# 25. Authorization

Supabase Row Level Security debe proteger:

* projects
* templates
* template_parts
* generated_files
* image_assets

Regla principal:

```text
auth.uid() = user_id
```

cuando corresponda al modelo.

La seguridad no debe depender únicamente del frontend.

---

# 26. Storage

Las imágenes y archivos generados deben almacenarse en Supabase Storage.

Separar conceptualmente:

```text
original-images
processed-images
generated-files
```

Los nombres y paths deben evitar colisiones.

---

# 27. Non-Goals

NO implementar en el MVP:

* Generación 3D avanzada.
* IA generativa de personajes.
* Marketplace.
* Sistema de pagos.
* Colaboración entre usuarios.
* Equipos.
* Red social.
* Chat.
* Editor CAD completo.
* Animaciones.
* Realidad aumentada.
* Aplicación móvil.

Estas funcionalidades pueden evaluarse posteriormente.

---

# 28. Future Features

Después del MVP:

## Editor

Permitir:

* mover
* rotar
* escalar
* dividir
* unir
* duplicar
* agregar pestañas
* agregar líneas de doblado
* agregar líneas de corte

## SVG

Exportar plantillas en SVG.

## 3D Preview

Crear una representación aproximada de la estructura.

## AI Template Generation

Utilizar modelos de visión para ayudar a identificar:

* partes del personaje
* estructura
* geometría
* piezas necesarias

## Template Library

Permitir reutilizar plantillas.

---

# 29. UX Principles

La aplicación debe:

* Ser visual.
* Ser sencilla.
* Tener pocos pasos.
* Mostrar feedback durante procesamiento.
* Evitar terminología técnica innecesaria.
* Mostrar medidas claramente.
* Permitir volver atrás sin perder información.

El usuario debe saber siempre:

```text
Dónde estoy
Qué estoy configurando
Qué resultado obtendré
```

---

# 30. Accessibility

Debe considerarse:

* navegación mediante teclado
* labels apropiados
* contraste suficiente
* estados de focus
* mensajes de error accesibles
* botones claramente identificables

---

# 31. Performance

El procesamiento de imágenes puede ser costoso.

No bloquear innecesariamente el navegador.

Cuando una operación sea pesada:

```text
UI
↓
Server
↓
Processing
↓
Result
```

Mostrar estado:

```text
Procesando imagen...
Generando geometría...
Preparando páginas...
Generando PDF...
```

---

# 32. Acceptance Criteria — MVP

El MVP será considerado funcional cuando un usuario pueda realizar el siguiente proceso:

### AC-01

Crear un proyecto.

### AC-02

Subir una imagen válida.

### AC-03

Visualizar la imagen cargada.

### AC-04

Procesar la imagen y obtener una figura aislada.

### AC-05

Configurar:

```text
Width
Height
Depth
Paper format
Orientation
Margin
Overlap
```

### AC-06

Generar una plantilla.

### AC-07

La plantilla debe conservar las dimensiones físicas configuradas.

### AC-08

Una plantilla mayor que el papel debe dividirse automáticamente.

### AC-09

Las páginas deben tener identificadores.

### AC-10

Las páginas deben incluir marcas de alineación.

### AC-11

Las páginas deben incluir una referencia de calibración.

### AC-12

Generar PDF.

### AC-13

El PDF debe poder descargarse.

### AC-14

El usuario puede volver a abrir el proyecto.

### AC-15

Los proyectos de otros usuarios no son accesibles.

---

# 33. Quality Requirements

El producto debe priorizar:

## Accuracy

Las dimensiones físicas deben ser confiables.

## Reliability

Un error en procesamiento no debe perder el proyecto.

## Maintainability

El código debe estar modularizado por dominio.

## Testability

Las reglas geométricas y físicas deben ser testeables sin depender de React.

## Security

Los archivos y proyectos deben estar protegidos.

---

# 34. Product Metrics

Inicialmente medir:

* proyectos creados
* imágenes procesadas
* plantillas generadas
* PDFs generados
* PDFs descargados
* errores de procesamiento
* tiempo promedio de generación

No implementar analytics complejo en el MVP.

---

# 35. Technical Constraints

Las decisiones técnicas detalladas no pertenecen a este documento.

El PRD define el comportamiento esperado.

La arquitectura técnica debe documentarse en:

```text
docs/architecture.md
```

Las decisiones arquitectónicas importantes deben documentarse mediante ADR.

---

# 36. Definition of Done

Una funcionalidad del producto está terminada cuando:

* Cumple los requisitos del PRD.
* Tiene criterios de aceptación cubiertos.
* Tiene validaciones necesarias.
* Tiene tests relevantes.
* Maneja errores.
* Respeta seguridad.
* No introduce abstracciones innecesarias.
* Está documentada cuando corresponde.
* No rompe funcionalidades existentes.

---

# 37. MVP Success Definition

El MVP debe demostrar que un usuario puede completar:

```text
Tengo una imagen
       ↓
Quiero una piñata de 80 × 100 cm
       ↓
La aplicación procesa la imagen
       ↓
Genera el molde
       ↓
Lo divide en hojas A4
       ↓
Descargo el PDF
       ↓
Imprimo al 100%
       ↓
Puedo utilizar el molde físicamente
```

El éxito del MVP no se mide por la cantidad de funcionalidades implementadas.

Se mide por la capacidad de generar un molde físicamente útil y correctamente escalado.
