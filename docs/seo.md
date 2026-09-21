# SEO

Cómo se cumplen los requisitos de `PRD.md` §42 y los criterios AC-22 y
AC-23.

---

# 1. Qué se posiciona

La portada (`/`) es el contenido: qué hace la herramienta, cómo funciona en
cuatro pasos, ejemplos con medidas calculadas por el propio módulo de pósters,
por qué usarla y preguntas frecuentes. Se sirve renderizada en el servidor.

Las preguntas frecuentes llevan datos estructurados `FAQPage` con el mismo
texto que se ve: nada que el visitante no pueda leer.

`/crear` es la herramienta. Es de cliente, pero su título y descripción se
sirven desde el servidor.

---

# 2. La dirección del sitio

`NEXT_PUBLIC_SITE_URL`, leída en un solo sitio (`infrastructure/site-url.ts`).
La usan `metadataBase` —que completa canónicas y Open Graph—, el sitemap,
`robots.txt` y el enlace de confirmación del correo.

Sin ella, en desarrollo se usa `http://localhost:3000`; **en producción la
aplicación falla al arrancar**. Un sitemap con enlaces a `localhost` sería
peor que un error: los buscadores lo aceptarían en silencio.

---

# 3. Qué se indexa y qué no

`PUBLIC_PAGES` (`presentation/next/public-pages.ts`) es la única lista de
páginas públicas: de ella sale `sitemap.xml`. Una página pública nueva se
añade ahí y usa `publicPageMetadata` para su título, descripción, canónica y
Open Graph.

```text
indexables   /  /crear  /guias  /guias/*  /privacidad  /terminos  /cookies
             /aviso-legal
noindex      /proyectos (y todo lo que cuelga)  /acceder  /crear-cuenta
bloqueado    /api/   en robots.txt
```

`/proyectos` **no** se bloquea en `robots.txt`, a propósito: si se bloquea, el
buscador no puede leer su `noindex` y aún podría listar la URL, sin contenido,
si alguien la enlaza. Lo protegen su `noindex` y que sin sesión redirige a
`/acceder`, que también lleva `noindex`.

---

# 4. Lo que falta

* More guides beyond the first two (§6): decorating with crepe paper, a
  number piñata step by step, how much a piñata can hold.
* Medir los Core Web Vitals de la portada y de `/crear` una vez desplegado.

---

# 5. The share picture

`app/opengraph-image.tsx` draws the picture WhatsApp, Facebook and X show
for a shared link: 1200 x 630, the title, the domain and the landing's "4"
over its real sheet grid (3 x 3 A4, the same `posterLayout` as the PDF). It
is generated at build time, so it cannot drift from the product.

* The fonts are the site's, fetched as TTF at build time. If the CDN fails,
  the picture falls back to the default font instead of failing the deploy.
* ImageResponse cannot read CSS variables: its colours mirror the theme
  tokens, and change with them.
* Pages that declare their own Open Graph replace the inherited one, image
  included. `publicPageMetadata` names `SHARE_IMAGE` explicitly, so every
  public page carries it. `twitter:card` is `summary_large_image`.

After a deploy, WhatsApp and Facebook may keep showing a cached preview for
a while. Facebook's Sharing Debugger refreshes it on demand.

---

# 6. Guides

Indexable content beyond the landing, as `PRD.md` §42 asks: "qué es una
piñata de cartón, cómo se imprime un molde a tamaño real, cómo se ensambla".

```text
/guias                                        index
/guias/como-hacer-una-pinata-de-carton       from image to hanging piñata
/guias/como-imprimir-y-unir-las-hojas        print at real size, join sheets
```

* **One list** (`components/guides/guides.ts`) feeds the index, the sitemap,
  the landing section and the links between guides. A new guide is a page
  under `app/guias/<slug>/` plus an entry there.
* **Server-rendered**, with Article and BreadcrumbList structured data built
  from the same fields that are shown.
* **The drawings are SVG with the theme tokens** (`guides/diagrams.tsx`), and
  they show what the PDF really prints: the 100 mm ruler, the 1 cm strip with
  crosses, row letters and column numbers. If the PDF changes, the guides
  change with it.
* **The text describes the real product.** The tool gives the front at real
  size; the guide covers what it does not: the back traced in mirror from the
  front, the side strip with tabs, closing it with the sweets inside.

Slugs are plain ASCII (`pinata`, not `piñata`): they are shared on WhatsApp
and typed by hand, and an encoded `ñ` looks broken in both.

On a phone the header has no room for three buttons, so the "Guías" link
hides below `sm`; the footer and the landing keep it one tap away.

