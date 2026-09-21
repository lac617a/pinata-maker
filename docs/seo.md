# SEO

How the requirements of `PRD.md` §42 and criteria AC-22 and AC-23 are met.

---

# 1. What ranks

The landing (`/`) is the content: what the tool does, how it works in four
steps, examples with sizes computed by the poster module itself, why use it,
and a FAQ. It is server-rendered.

The FAQ carries `FAQPage` structured data with the same text that is shown:
nothing a visitor cannot read.

`/crear` is the tool. It is a client page, but its title and description are
served from the server.

The guides (§6) are the content beyond the landing.

---

# 2. The site's address

`NEXT_PUBLIC_SITE_URL`, read in one place (`infrastructure/site-url.ts`).
It feeds `metadataBase` — which completes canonical URLs and Open Graph —,
the sitemap, `robots.txt` and the e-mail confirmation link.

Without it, development uses `http://localhost:3000`; **in production the
app refuses to start**. A sitemap with links to `localhost` would be worse
than an error: search engines would accept it silently.

---

# 3. What is indexed and what is not

`PUBLIC_PAGES` (`presentation/next/public-pages.ts`) is the one list of
public pages: `sitemap.xml` comes from it. A new public page is added there
and uses `publicPageMetadata` for its title, description, canonical URL and
Open Graph.

```text
indexed      /  /crear  /guias  /guias/*  /privacidad  /terminos  /cookies
             /aviso-legal
noindex      /proyectos (and everything under it)  /acceder  /crear-cuenta
blocked      /api/   in robots.txt
```

`/proyectos` is **not** blocked in `robots.txt`, on purpose: blocked, a
search engine cannot read its `noindex` and could still list the URL,
without content, if someone links to it. It is protected by its `noindex`
and by redirecting to `/acceder` without a session, which is `noindex` too.

---

# 4. What is left

* Register the domain in Google Search Console and send the sitemap.
* More guides beyond the first two (§6): decorating with crepe paper, a
  number piñata step by step, how much a piñata can hold.
* Measure the Core Web Vitals of the landing and of `/crear` in production.

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

