# Despliegue

Cómo se lleva la aplicación a producción y qué se comprueba en cada cambio.
Pensado para Vercel, el proveedor natural de Next.js; lo que no es propio de
Vercel sirve igual en cualquier otro.

---

# 1. Antes de desplegar

```text
[ ] Migraciones 0001 a 0008 aplicadas, en orden, en el proyecto de Supabase
    de producción.                     →  pnpm check:supabase contra él
[ ] Datos del titular en src/components/legal/site-owner.ts
                                       →  sin aviso de borrador (legal.md §2)
[ ] Textos legales revisados por alguien que conozca la ley del país
[ ] Un póster impreso y la regla de 10 cm medida (roadmap.md §8.1)
```

---

# 2. Integración continua

`.github/workflows/verify.yml` corre en cada push y cada pull request:

```text
pnpm install --frozen-lockfile   el lockfile manda; si no cuadra, falla
pnpm verify                      formato, lint, tipos y pruebas
pnpm build                       el build de producción
```

Con variables falsas pero bien formadas: el build las necesita para
arrancar y ninguna prueba de la suite habla con Supabase. Las de integración
se saltan solas sin credenciales. Los valores de verdad viven en el
proveedor de despliegue, nunca en el repositorio.

Se comprobó el 2026-09-21 en una copia limpia del repositorio, sin `.env`:
pasa entero. Y sin `NEXT_PUBLIC_SITE_URL`, el build falla nombrando la
variable (`seo.md` §2).

## Finales de línea

`.gitattributes` fuerza LF en todas las máquinas. Sin él, un clon en Windows
con `core.autocrlf=true` —lo habitual— sacaba los archivos en CRLF y
`pnpm verify` fallaba en todos, sin que nadie hubiera tocado nada.

## Versiones

`packageManager` en `package.json` fija pnpm (la acción de CI lo lee de
ahí) y `engines` pide Node 22 o más. Vercel respeta los dos.

---

# 3. Variables de entorno

En el proveedor, para producción:

```text
NEXT_PUBLIC_SITE_URL            https://el-dominio   obligatoria (seo.md §2)
NEXT_PUBLIC_SUPABASE_URL        del proyecto de producción
NEXT_PUBLIC_SUPABASE_ANON_KEY   del proyecto de producción
USAGE_HASH_SECRET               32+ caracteres al azar, distinto del de
                                desarrollo (usage.md §5)
USAGE_LIMIT_ANONYMOUS           opcional, 3 por defecto
USAGE_LIMIT_REGISTERED          opcional, 20 por defecto
USAGE_LIMIT_PAID                opcional, 200 por defecto
```

Para generar el secreto:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

No hay clave de servicio de Supabase y no debe añadirse ninguna
(`roadmap.md` §3).

## En Supabase

* **Authentication → URL Configuration:** `Site URL` con el dominio de
  producción, y en `Redirect URLs` la dirección de confirmación:
  `https://el-dominio/api/auth/confirm`. Sin ella, el enlace del correo de
  registro devuelve al usuario a otro sitio.

---

# 4. Límites de Vercel que afectan a esta aplicación

## Tiempo

Generar un PDF grande lleva unos segundos. Las tres rutas que lo generan
declaran `maxDuration = 60`, el máximo del plan gratuito. Otro proveedor lo
ignora.

## Tamaño de petición y de respuesta: 4,5 MB

**Es el límite que más importa.** Una función de Vercel no acepta un cuerpo
de más de 4,5 MB ni devuelve uno mayor, y la aplicación permite imágenes de
hasta 10 MB (`image-processing.md`, `IMAGE_LIMITS`):

* subir una foto de más de 4,5 MB falla con 413 antes de llegar a la
  aplicación;
* `/api/posters` devuelve el PDF en la respuesta: con una foto grande el PDF
  también puede pasar de 4,5 MB.

Los proyectos guardados no sufren lo segundo: el PDF va al bucket y se
descarga con un enlace firmado directamente de Supabase.

Soluciones, de menos a más trabajo:

1. Bajar `maxFileBytes` a 4 MB mientras se despliegue en Vercel.
2. Reducir la imagen en el navegador antes de enviarla cuando pese mucho:
   el aviso de resolución (`pdf.md` §96) dice cuántos pixels hacen falta de
   verdad para el tamaño elegido.
3. Subir directamente al bucket con una URL firmada, sin pasar por la
   función (`roadmap.md` §8.5), y entregar el PDF sin cuenta también desde
   el bucket.

Hasta resolverlo, es la primera cosa que puede fallar en producción.
