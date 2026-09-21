# Piñata Maker — Roadmap

The state of development: what exists, which decisions are closed and what
is left to build.

This document **does not define behaviour**. It is a record of state. When
something disagrees, `PRD.md`, `domain.md`, `architecture.md` and the
subsystem docs win, in that order (`AGENTS.md` §6).

It is updated whenever a piece of work is finished. Every feature ends in a
commit, so the git history is what tells what was done and when
(`AGENTS.md` §54).

Gaps between what is built and what real users need are in §8.

---

# 1. Current state

**Live at https://maker.profiya.com** since 2026-09-21 (Vercel + Supabase).

**The product is the image enlarged across sheets** (`PRD.md` §44): pick an
image, crop it if you want, choose how big it is in centimetres and how the
sheets go together, and download a PDF with the image at real size, split
into sheets, with an assembly map, alignment marks and a calibration ruler.
What Block Posters does, made for people who make piñatas.

```text
[✓] Image → size and EXIF orientation read from the file itself
[✓] The browser shrinks heavy images to fit a request (3.5 MB)
[✓] Optional crop → poster in mm with the crop's proportion
[✓] Poster → sheets, overlapping 1 cm or trimmed edge to edge
[✓] PDF: summary sheet with map and ruler, one piece of image per sheet
[✓] Phone photos upright in the preview and in the PDF
[✓] Resolution warning before printing
[✓] Without an account: 3 PDFs a day, nothing stored, terms accepted
[✓] With an account: 20 a day, projects, images and PDFs saved with RLS
[✓] Landing, two guides, share picture, sitemap, legal pages (Colombia)
[✓] Data authorization with proof; account deletion from the app
[✓] CI on every push; production build checked in a clean copy
[ ] Print a poster and measure the 10 cm ruler (§8.1)
[ ] AdSense and its cookie consent (AC-20)
[ ] Paid tier
```

The mould with pieces — silhouette, side strips, tabs, versions — is still
in the code with its tests, without UI (§2.12).

Verification:

```bash
pnpm verify            # 609 tests, plus 30 integration tests that need an account
pnpm check:supabase    # every migration, 0001 to 0011
```

---

# 2. What is built

## 2.1 Project infrastructure

* Next.js 15 (App Router), `app/` at the root, the domain in `src/modules/`,
  use cases in `src/application/`.
* Vitest in a `node` environment, only `src/**/*.test.ts`: the domain is
  tested without React or a browser. Repository contracts
  (`*.contract.ts`) run against the in-memory and the Supabase
  implementation.
* Tailwind v4, shadcn/ui on the `stone` scale, TanStack Query for browser
  data.
* ESLint 9 (flat config) and Prettier: import order enforced, `../`
  forbidden. `pnpm verify` chains format, lint, types and tests.
* `pnpm` 11 pinned in `package.json`; Node 22. `.gitattributes` forces LF.
* Supabase (`@supabase/supabase-js`, `@supabase/ssr`). Eleven migrations in
  `supabase/migrations/`, applied by hand. `pnpm check:supabase` checks the
  environment, the connection, every table and function, and RLS, printing
  no value.
* `pnpm test:integration` runs against the real database with
  `SUPABASE_TEST_EMAIL` and `SUPABASE_TEST_PASSWORD`; without them it skips.

## 2.2 The poster — the product

`PRD.md` §44. It reuses the tiling of the mould; what changes is what is
drawn and how the size is chosen.

| Piece | What it does |
| --- | --- |
| `posters/poster.ts` | Size in mm from one side, tiling, whole-sheet sizes, last-sheet usage |
| `posters/crop.ts` | Crop in pixels, validated against the image; where the whole image goes |
| `posters/resolution.ts` | Pixels per inch and sharpness by viewing distance (`pdf.md` §96) |
| `posters/joining.ts` | Overlap 1 cm or trim edge to edge (`pdf.md` §99) |
| `application/make-poster-document.ts` | Bytes → PDF, shared by both paths |
| `application/export-poster.ts` | From a saved image; stores the PDF |
| `application/generate-unsaved-poster.ts` | Without saving anything; charges the daily limit |
| `components/posters/` | Crop, size in cm with sheets beside it, preview, download |

* The server decides with the stored file: proportion, crop and rotation
  are checked against its header (`storage.md` §166).
* The PDF embeds the image once; crop and rotation are drawn, never
  re-encoded (`pdf.md` §95, §97). PNGs are compressed (`pdf.md` §98).
* Whole-sheet buttons avoid a nearly empty last column; the resolution
  warning proposes the largest sharp size, rounded down to whole sheets.
* On a phone, the download floats at the bottom of the screen.

## 2.3 Images

| Piece | What it does |
| --- | --- |
| `image-processing/image-header.ts` | Format, size and EXIF orientation from the first bytes (`image-processing.md` §110) |
| `image-processing/upload-preparation.ts` | When to send as is, how to shrink (`image-processing.md` §111) |
| `presentation/client/prepare-image.ts` | Redraws and re-encodes in the browser until it fits |
| `pdf-generation/image-orientation.ts` | The eight EXIF orientations as a drawing matrix |

* An upload is refused if its content is not what it declares.
* Phone photos are accepted; the PDF straightens them (`pdf.md` §97).
* Heavy images are shrunk in the browser to 3.5 MB, at most 4096 px on the
  longest side; PNG first, JPEG on white if it does not fit.

The deterministic mask → contour → mm chain of the mould
(`image-processing.md` §98-§109) is still there, parked with it.

## 2.4 Printing

| File | Responsibility |
| --- | --- |
| `paper-format.ts` | A4, A3, Letter, orientation |
| `margins.ts` | Margins and printable area |
| `tiling.ts` | Grid of sheets, overlap (0 allowed), `A1`/`B3` labels |
| `page-geometry.ts` | Clipping to a sheet and local coordinates |
| `alignment.ts` | Crosses between neighbouring sheets |
| `calibration.ts` | 100 mm ruler |
| `print-layout.ts` | `createPrintLayout`: `PrintLayout` and `PrintPage` |

Tested: tiling never changes the physical size; sheets are clipped, never
scaled; crosses fall on the same global position on both sheets; the same
input gives the same layout.

## 2.5 PDF generation

| File | Responsibility |
| --- | --- |
| `pdf-units.ts` | The one mm → pt conversion, no rounding |
| `pdf-style.ts` | Line widths, text sizes, font |
| `page-drawing.ts` | A page as a drawing plan in mm; the poster summary sheet |
| `print-renderer.ts` | `PrintRenderer`, `PrintableDocument`, limits |
| `infrastructure/jspdf-print-renderer.ts` | The only file importing `jspdf` |

Tested: every sheet measures what the layout says in every paper and
orientation; the ruler measures its length; the poster's map shows the same
placement as the sheets; trim marks stay in the margin; a PNG is never
embedded raw.

## 2.6 Persistence: projects, images, PDFs

| Piece | What it does |
| --- | --- |
| `projects/` | The user's project; every repository operation takes the user |
| `assets/` | The original image: row and file, separate interfaces |
| `exports/` | A generated PDF, from a template version or from an image |
| `storage/object-storage.ts` | One port for both private buckets |
| `application/delete-account.ts` | A project with its files; the whole account |

* Isolation (AC-15) twice: in the domain and in RLS. A foreign project
  answers 404, never 403.
* Files live in private buckets and are served with signed URLs of 10
  minutes; the PDF is stored whole, never regenerated on download.
* Deleting a project removes its images and PDFs first, then the rows:
  storage policies only allow it while the project exists (`legal.md` §6).

Decisions in `storage.md` §140-§166.

## 2.7 Accounts and data protection

| Piece | What it does |
| --- | --- |
| `accounts/credentials.ts`, `auth-gateway.ts` | Sign-up, sign-in, sign-out behind a port |
| `accounts/data-authorization.ts` | The policy version and an explicit yes |
| `accounts/data-authorization-store.ts` | Proof of each authorization |
| `accounts/infrastructure/` | Supabase adapters: auth, proof, account removal |

* Sign-up needs an unticked, required box; the proof (policy version and
  time) is copied by a trigger into `data_authorizations`, and the database
  refuses an account without it (0009).
* Existing accounts, and every account after a policy change, accept once
  on entering `/proyectos` (0011).
* Anyone can delete their account from the app, typing BORRAR (0010).
* No response tells who has an account; `sign-in` returns no token.

Decisions in `architecture.md` §76 and `legal.md` §5-§8.

## 2.8 Usage without an account and the daily limit

`usage.md`. `/crear` is public: the image stays in the browser until the PDF
is requested, and nothing is stored. Every PDF counts: 3 a day without an
account, 20 with one, configurable. The counter lives in the database
(0008), atomic, reachable only through two functions; the anonymous visitor
is counted by an httpOnly cookie and by IP, both kept as HMAC. A reached
limit is a planned state that offers signing up.

Without an account, the download needs the terms and the data policy
accepted with a tick; the server refuses without it (`legal.md` §8).

## 2.9 API and presentation

* `app/api/` routes only build the context and delegate to
  `presentation/http/`, functions of `(Request, context) → Response` tested
  without a server.
* Errors carry a stable `code`; `error-response.ts` maps it to a status and
  a Spanish message. A 413 from the platform gets its own message.
* The session is checked with `getUser`, never `getSession`.

## 2.10 The public site

* **Landing** (`app/page.tsx`): steps, examples computed by the poster
  module itself, reasons, FAQ with `FAQPage` data.
* **Guides** (`/guias`): making a cardboard piñata, printing and joining the
  sheets (overlap or trim), with SVG drawings of what the PDF prints.
* **SEO** (`seo.md`): metadata, canonical URLs, Open Graph with a generated
  share picture, `sitemap.xml`, `robots.txt`, `noindex` on the private area.
* **Legal pages** (`legal.md`): data policy under Ley 1581, terms, cookies,
  legal notice, linked from every footer. Owner details in
  `components/legal/site-owner.ts`.

## 2.11 CI and deployment

`deploy.md`. `.github/workflows/verify.yml` runs `pnpm verify` and the build
on every push. Vercel deploys `main`. Routes that generate PDFs get 60
seconds; `NEXT_PUBLIC_SITE_URL` and `USAGE_HASH_SECRET` are required in
production.

## 2.12 Parked: the mould with pieces

Built and tested before the product became the poster; no UI since
2026-09-21. Kept in case the mould comes back as an option (`PRD.md` §44).

* `templates/`: perimeter extrusion (silhouette + depth → front, back, side
  strips with tabs), assembly graph, paper cost (`template.md` §110-§122,
  `assembly.md` §99-§105).
* Immutable template versions with their own table, no UPDATE policy
  (`storage.md` §153-§159).
* `generateTemplate` and `generatePrintableDocument`, and
  `src/modules/pipeline.test.ts` over the whole chain.

---

# 3. Closed decisions

Do not reopen them without a new reason.

| Decision | Reason |
| --- | --- |
| `app/` at the root, domain in `src/modules/` | Matches the existing project without moving the Next route |
| `printing/` separate from `geometry/` | Geometry must not depend on paper concepts |
| The whole domain in millimetres | One unit system removes implicit conversions |
| Vitest in `node`, no UI tests | The value is in the physical rules |
| Actual scale only | The layout declares it instead of assuming it |
| `jspdf` only in `pdf-generation/infrastructure/` | The library must be replaceable without touching the domain |
| A drawing plan in mm between `PrintPage` and the library | What is drawn can be tested without a PDF |
| The scale warning on every sheet | The document controls neither the viewer nor the driver |
| Use cases in `src/application/` | They coordinate modules and belong to none |
| `@/` across folders, never `../` | An import up the tree breaks when a file moves |
| TanStack Query, not SWR | The flow is mutations and needs invalidation with judgement |
| shadcn/ui, not a component library | The code is ours: adjusted without fighting a theme |
| A 4xx is not retried; a mutation never repeats | Publishing twice would create two versions |
| One object storage port for images and PDFs | Two consumers needing the same; the adapter picks the bucket |
| The PDF is stored whole, never regenerated | Another generator would give a different document from the one printed |
| PDFs are delivered by signed URL | Fifty sheets must not go through the request process |
| Every repository operation takes the user | Isolation cannot depend on remembering to filter |
| A foreign resource answers 404, not 403 | A 403 would confirm it exists |
| No service key | All access goes through the user's token and RLS; privileged steps are `security definer` functions that check their caller |
| `getUser`, never `getSession`, on the server | The cookie is sent by the client |
| No response tells who has an account | Sign-up and sign-in would become a user search |
| Row and file are separate interfaces | They fail separately and one must be undoable |
| Private buckets, signed URLs of 10 minutes | Enough to show, too little to share around |
| The output is the image across sheets, not the mould | What the maker needs: glue it on cardboard and cut it (`PRD.md` §44) |
| Size in cm; sheets shown beside it | A maker thinks in centimetres, not sheets |
| Overlap 1 cm by default; trimming as an option | Easier by eye; trimming saves sheets for those who want it (`pdf.md` §99) |
| Crop and rotation never touch the stored file | Drawn in the PDF; no re-encoding, no quality loss |
| Resolution is warned, never blocked | A big, slightly blurry piñata may be what is wanted |
| The browser shrinks images; the server keeps its limits | Fits Vercel's 4.5 MB without trusting the browser (`image-processing.md` §111) |
| Without an account nothing is stored | The PRD: the anonymous visitor keeps no projects (`usage.md` §2) |
| The daily limit is counted in the database, atomically | A counter in the browser is not a limit |
| The anonymous visitor is counted by cookie and IP, as HMAC | Clearing cookies is not enough; neither is stored in clear |
| Legal texts follow Colombian law | The site is run from Colombia (`legal.md` §5) |
| Authorization only by an explicit, unticked box | Ley 1581 art. 9: prior, express, informed |
| The rules that protect data live in the database | The Supabase API is public; the app is not the only caller |

---

# 4. What is left

In order, for the product as it is today:

1. **Print a poster and measure it** (§8.1). The only check no test can do.
2. **Search Console**: register the domain and send the sitemap.
3. **A legal review** of the texts by someone who knows Colombian law.
4. **AdSense with its cookie consent** (AC-20), together: ask before loading
   any ad script, rejecting as easy as accepting (`legal.md` §4). Needs the
   AdSense account first.
5. **Poster polish:**
   * store the crop and the joining in the export record, to regenerate the
     same document (`pdf.md` §95, §99);
   * a sample figure to try without uploading anything (§8.11).
6. **More guides**: decorating with crepe paper, a number piñata step by
   step, how much a piñata can hold (`seo.md` §4).
7. **Paid tier**: the level already exists in the model (`usage.md` §7); it
   comes with payments, which the PRD leaves out of the MVP (§27).

**Parked with the mould** (§2.12): background removal for opaque photos
(the old phase B), `ProcessImage`, the processed asset, holes in
silhouettes, manual tabs. The poster does not need them: the maker cuts the
figure out by hand on the cardboard.

---

# 5. Open questions

1. ~~How are pieces and folds derived from silhouette + depth?~~ **Resolved:**
   perimeter extrusion (`template.md` §110-§122).
2. Background removal: an external service or our own server? Only matters
   if the mould comes back.
3. ~~Tabs automatic or placed by hand?~~ **Resolved:** automatic.
4. ~~Instructions as a page of the PDF?~~ **Resolved:** a page, the summary
   sheet.
5. ~~Daily limits?~~ **Resolved:** 3 without an account, 20 with one,
   configurable (`usage.md` §3).
6. ~~How to identify the anonymous visitor?~~ **Resolved:** cookie and IP,
   as HMAC (`usage.md` §5).
7. Which tools justify signing up, and which the paid tier? Today an account
   offers more PDFs and saved projects.
8. Spanish only? The site, its URLs and messages are in Spanish; adding
   languages now means translating every screen and guide (§8.10).
9. How is the UI tested in a real browser? The domain suite does not cover
   it on purpose (§8.9).
10. ~~Upload through the server or straight to storage?~~ **Resolved for
    now:** through the server, with the browser shrinking to fit; straight to
    storage stays the next step if huge prints are needed (§6).

---

# 6. Known debt

* The PDF is generated inside the request. A 1 m piñata takes a few seconds;
  if it becomes a problem, an export already has an identity that could be
  polled in the background (`storage.md` §115).
* Images go through the server. Uploading straight to the bucket with a
  signed URL would allow full-resolution huge prints; for anonymous use it
  means storing for a few minutes and changing the privacy policy.
* The crop and the joining are not stored with an export (§4, item 5).
* A printer's hardware margins are not modelled (`printing.md` §12); the 5
  mm margin fits every home printer tested so far, which is none (§8.1).
* The page footer can fall over the image on a busy sheet; unlike the
  ruler, the sheet label cannot be left out (`pdf.md` §87).
* Project states do not move from the UI: generating a PDF does not set
  `READY` (`storage.md` §159).
* Parked with the mould: `CUSTOM_SCALE`, holes in silhouettes, pieces never
  sharing a sheet, unmeasured derivation parameters, the provisional
  ambiguous-figure threshold, EXIF not normalised before segmenting.

---

# 7. Acceptance criteria

MVP (`PRD.md` §32) and public launch (`PRD.md` §43).

| AC | Criterion | State |
| --- | --- | --- |
| AC-01 | Create a project | **Done and tested** |
| AC-02 | Upload a valid image | **Done and tested** |
| AC-03 | See the uploaded image | **Done and tested** |
| AC-04 | Get an isolated figure | Parked with the mould; the poster does not need it |
| AC-05 | Configure measures and paper | **Done and tested**, in cm, with crop and joining |
| AC-06 | Generate a template | **Done and tested**; today the output is the poster |
| AC-07 | Keep physical dimensions | **Done and tested**; on paper, pending (§8.1) |
| AC-08 | Split into pages automatically | **Done and tested** |
| AC-09 | Page identifiers | **Done and tested** |
| AC-10 | Alignment marks | **Done and tested** |
| AC-11 | Calibration reference | **Done and tested** |
| AC-12 | Generate a PDF | **Done and tested** |
| AC-13 | Download the PDF | **Done and tested** |
| AC-14 | Reopen the project | **Done and tested** |
| AC-15 | Isolation between users | **Done and tested** |
| AC-16 | Generate and download without an account | **Done and tested** (`usage.md` §10) |
| AC-17 | The limit is counted on the server | **Done and tested**, atomic in the database |
| AC-18 | When reached, it is explained and sign-up offered | **Done and tested** |
| AC-19 | Four legal pages linked from the footer | **Done**; legal review pending |
| AC-20 | Personalised ads can be rejected | Pending: comes with AdSense (`legal.md` §4) |
| AC-21 | No ads in the PDF | **Done**: there are no ads, and they will never go in the PDF |
| AC-22 | Public pages rendered, with metadata and sitemap | **Done** (`seo.md`) |
| AC-23 | Private pages out of search engines | **Done**: `noindex` and redirect (`seo.md` §3) |

---

# 8. What was not in the plan

Gaps between what is built and what real users need. Not requirements —
those are in `PRD.md`. Each one says what happens if ignored.

## 8.1 Nobody has printed a poster yet

The biggest risk of the project. Everything saying the scale is right is a
test: it checks the system does what the system thinks it should. That a
100 mm line in the PDF measures 100 mm **with a ruler, on paper** has not
been checked. Between the PDF and the paper there are a viewer, a driver and
a printer, and any of them can scale without saying so.

With the poster the check is simple: print the summary sheet and measure the
10 cm ruler; then two neighbouring sheets and check the crosses meet, both
overlapping and trimming. It needs a repeatable, recorded procedure: what is
printed, with which print settings, what is measured, what deviation is
accepted.

## 8.2 The preview needs a renderer that does not exist — resolved

The poster preview is SVG drawn from the same `posterLayout` as the PDF, so
the sheets shown are the sheets printed. No PDF is generated to preview.

## 8.3 The mould's assembly is computed and never printed — parked

`templates/assembly.ts` produces assembly steps nobody sees. It only matters
if the mould comes back.

## 8.4 There is no way to know what failed

No structured logging or error capture: an error is printed in the Vercel
function log and nothing else. Before real traffic, at least know which
request failed, with which `error-response.ts` code and how often. The codes
exist and are stable, which is half the work.

## 8.5 Nothing stops a burst

The daily limit counts PDFs per person per day. It does not stop a burst:
many requests in a minute, each generating a PDF inside the request. Vercel
contains it somewhat (function limits, per-request time), but there is no
rate limit of our own.

## 8.6 Files are validated by what they claim — resolved

The upload reads the header and refuses content different from what it
declares (`image-processing.md` §110).

## 8.7 Migrations are applied by hand

`pnpm check:supabase` checks every table and function of the eleven
migrations, which catches the worst case. There is still no record of which
migration was applied when: the environment and the repository can drift
until the check is run.

## 8.8 No continuous integration — resolved

`.github/workflows/verify.yml` runs on every push (`deploy.md` §2).
Integration tests need credentials and are not part of it.

## 8.9 The UI cannot be tested

The Vitest suite is domain-only on purpose. The UI has been checked by hand
in a browser for every change, which does not scale. A browser suite
(Playwright) over upload → size → download, separate from the domain's, is
still to be decided.

## 8.10 Languages

Everything a visitor sees is in Spanish, inside the code. Adding languages
means URLs, metadata, messages, guides and legal texts per language. Worth
deciding before the content grows.

## 8.11 Arriving without an image, there is nothing to try

The tool needs an image before showing anything. A sample figure would let
visitors try it in one click and would serve as the physical test case of
§8.1.

## 8.12 Backups

Users' work is stored — projects, images, PDFs — and there is no written
policy on backups or recovery. What the Supabase plan covers, and how a
restore would go, should be written down while the answer can still be
"nothing more is needed".
