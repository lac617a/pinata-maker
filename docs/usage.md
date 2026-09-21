# Uso sin cuenta y límite diario

Cómo se usa la herramienta sin registrarse y cuánto se puede usar al día.
Los requisitos están en `PRD.md` §38 y §39; este documento dice cómo se
cumplen.

---

# 1. Qué se cuenta

Cada PDF generado cuenta uno, se genere desde un proyecto guardado o sin
guardar nada. Ver la imagen, recortarla, cambiar el tamaño y mirar la vista
previa no cuentan: todo eso ocurre en el navegador y no cuesta nada al
servidor.

---

# 2. Sin cuenta no se guarda nada

Decisión del 2026-09-21. El visitante anónimo no conserva proyectos
(`PRD.md` §38), y la forma más directa de cumplirlo es no guardar nada:

```text
navegador   elige la imagen, la recorta y elige el tamaño; la imagen no sale
POST /api/posters   imagen + opciones → PDF en la respuesta
servidor    valida la imagen, genera el PDF, cuenta uno y lo devuelve
```

Ni la imagen ni el documento pasan por el object storage: no hay nada que
limpiar ni que proteger después. Si luego se registra, empieza de cero.

Se descartó la sesión anónima de Supabase: habría dado proyectos al anónimo,
contra el PRD, y usuarios abandonados que limpiar.

La misma ruta sirve a quien tiene cuenta y no quiere crear un proyecto:
entonces cuenta en el cupo de su cuenta.

---

# 3. Los límites

```text
ANONYMOUS     3 al día
REGISTERED   20 al día
PAID        200 al día    (el nivel existe; el cobro no)
```

Decididos el 2026-09-21. Tres bastan para probar un par de tamaños sin
cuenta; el registro los multiplica y es un motivo claro para crearla.

Son configuración (`PRD.md` §39): `USAGE_LIMIT_ANONYMOUS`,
`USAGE_LIMIT_REGISTERED` y `USAGE_LIMIT_PAID` los cambian sin tocar código.
Un valor que no sea un entero positivo hace fallar la petición: un límite mal
escrito no debe dejar la herramienta abierta ni cerrada sin que se note.

---

# 4. El día es el de UTC

El contador vuelve a cero a medianoche UTC. Una zona fija y no la del
visitante: la del navegador la decide el cliente, y cambiarla daría un día
nuevo. La interfaz enseña a qué hora local se renueva.

---

# 5. Cómo se reconoce al anónimo

Por su cookie **y** por su IP, decidido el 2026-09-21. El uso es el mayor de
los dos, y consumir suma a los dos:

* borrar la cookie no basta para empezar de cero: la IP sigue contando;
* dos personas tras la misma IP comparten el límite. Es el precio de lo
  anterior, aceptado por el PRD §39: contener el abuso normal, no impedirlo.

```text
pm_visitor      cookie httpOnly, un UUID al azar, un año
visitor:<hmac>  HMAC-SHA256 de la cookie con USAGE_HASH_SECRET
ip:<hmac>       HMAC-SHA256 del día y la IP, con el mismo secreto
```

Ninguna de las dos se guarda en claro. La huella de la IP lleva el día: la de
hoy no se puede relacionar con la de ayer. Aun así la IP es un dato personal
y la política de privacidad de la fase H tiene que mencionarla.

`USAGE_HASH_SECRET` es obligatorio, de 32 caracteres al azar como mínimo.
Sin él la ruta responde 503 y el registro dice qué variable falta. Sin
secreto, cualquiera podría recalcular la huella de una IP y gastarle el cupo.

La IP sale de `x-forwarded-for`, que fija la plataforma. Sin proxy delante
cualquiera podría inventarla; por eso nunca cuenta sola.

---

# 6. Dónde se cuenta

`0008_usage_counters.sql`. Una tabla `usage_counters (subject, day, used)` a
la que nadie tiene acceso directo, y dos funciones `security definer`:

```text
usage_used(subjects, day)            cuánto se ha usado: el mayor
usage_consume(subjects, day, limit)  suma uno si queda, en una operación
```

No hay clave de servicio en el proyecto (`roadmap.md` §3), y el anónimo tiene
que poder contar: por eso son funciones que el rol `anon` puede ejecutar, y
no permisos sobre la tabla. Comprueban lo que reciben:

* entre uno y cuatro sujetos, con prefijo `user:`, `visitor:` o `ip:`;
* un `user:` solo si es el del token (`auth.uid()`): nadie gasta ni lee el
  cupo de otra cuenta;
* el día de hoy, con uno de margen: no se puede llenar la tabla de días
  inventados.

`usage_consume` bloquea las filas antes de leer: dos peticiones a la vez no
se llevan las dos el último documento. Borra de paso los días de hace más de
una semana.

Lo que no puede impedir: que alguien con la clave pública llame a
`usage_consume` con huellas inventadas. Solo suma, y sin el secreto no puede
dar con la huella de nadie.

La prueba contra la base de datos real se activa con `SUPABASE_TEST_USAGE=1`
y necesita la migración aplicada.

---

# 7. El nivel de acceso

Hoy todo usuario con cuenta es `REGISTERED`. El nivel `PAID` existe en el
tipo y en los límites para que el cobro no obligue a rehacer esto
(`PRD.md` §38); cuando llegue, el nivel saldrá del perfil del usuario en
lugar de deducirse de que tenga sesión.

---

# 8. Cuándo se cobra

```text
1. ¿Queda algo?          si no, 429 antes de trabajar
2. Generar el PDF        un error de medida o de recorte no cuesta nada
3. Consumir uno          atómico; si otra petición se llevó el último, 429
4. Entregar o guardar    solo después de consumir
```

El paso 1 es un atajo para no generar lo que se va a negar; el que garantiza
el límite es el 3. En un proyecto guardado, el 4 es guardar el documento: si
el consumo falla no se guarda nada. Si el guardado falla después de consumir,
ese documento cuenta: es raro y preferible a entregar sin contar.

---

# 9. API

```text
GET  /api/usage     { usage: { level, limit, used, remaining, resetsAt } }
POST /api/posters   multipart: image + options (JSON) → application/pdf
POST /api/projects/[id]/posters   como antes; la respuesta trae `usage`
```

`options` lleva `width` o `height` en mm, `crop` opcional en pixels y `paper`
opcional. La respuesta en PDF trae `x-usage-limit` y `x-usage-remaining`, y
`cache-control: no-store`.

Un límite alcanzado responde **429** con el código `USAGE_LIMIT_REACHED`. No
es un fallo: la interfaz lo presenta como un estado previsto y ofrece
registrarse o volver mañana (`PRD.md` §39).

---

# 10. La interfaz

`/crear` es pública: elegir una imagen —con botón o arrastrándola—,
recortarla, elegir el tamaño y descargar. La imagen se enseña desde un enlace
local al archivo (`URL.createObjectURL`) y no sale del navegador hasta que se
pide el PDF.

El estudio del póster es el mismo en `/crear` y en un proyecto; lo único que
cambia es qué hace el botón de descargar (`poster-downloads.ts`): guardar en
el proyecto y bajar con enlace firmado, o recibir el PDF en la respuesta.

Encima del estudio, siempre, cuánto queda hoy y a qué hora local se renueva.
Al anónimo se le recuerda que con cuenta tiene más. Con el cupo gastado:

* el botón de descargar se desactiva, pero recortar y medir siguen
  funcionando;
* el anónimo ve «Crear cuenta gratis» y «Ya tengo cuenta»;
* quien tiene cuenta ve a qué hora se renueva.

Un 429 que llegue igualmente —otra pestaña gastó el último— se enseña como
aviso y vuelve a pedir el contador.

## Cómo se comprobó

En el navegador, sin sesión y contra la base de datos real: tres PDF
generados (quedan 2, 1, 0), el cuarto responde 429, y al recargar la página
enseña el estado de límite alcanzado con el botón desactivado. La cookie no
se ve desde JavaScript (`httpOnly`).
