# CLAUDE.md

Operating guide for Claude Code in this repository.

> **Engineering, architecture and documentation rules live in
> [`AGENTS.md`](AGENTS.md). Read it before changing code.** This file does
> not replace or summarise it; it adds what an agent needs to work in this
> repo in particular (commands, real structure, observed conventions) and
> points to the rest.

---

## 0. Language

Decided by the user on 2026-09-21:

* **Talk to the user in Spanish.** Every message, summary, question and
  explanation addressed to them.
* **Everything else may be in English:** code, comments, docs, commit
  messages. The living docs (this file, `docs/roadmap.md`, `legal`, `usage`,
  `seo`, `deploy`) are in English. The specifications (`PRD`, `domain`,
  `architecture`, `geometry`, `printing`, `template`, `pdf`,
  `image-processing`, `storage`, `assembly`, `editor`, `AGENTS`) stay in
  Spanish; new sections in them may be in English. Do not rewrite existing
  Spanish text just to change language.
* **Product copy** — what the site shows its visitors — is in Spanish.

---

## 1. Before touching code

1. `AGENTS.md` — binding rules (§3 Golden Rule, §6 document precedence, §38
   change workflow, §50 final checklist, §52 definition of done).
2. `docs/roadmap.md` — where the project is today, closed decisions,
   pending work and known debt. It records **state**, not requirements, and
   is updated when a piece of work is finished.
3. The docs of the subsystem you are about to touch (`docs/`).

Precedence when documents disagree (`AGENTS.md` §6):

```text
PRD → domain → architecture → subsystem doc → existing implementation
```

What each document defines is mapped in `AGENTS.md` §5.

---

## 2. Commands

```bash
pnpm verify            # format:check + lint + tsc + test. Run before committing.
```

```bash
pnpm test              # Vitest, 609 tests (30 more need a Supabase account)
```

```bash
pnpm check:supabase    # Variables, connection, tables, RLS and the functions of every migration. Prints no values.
```

```bash
pnpm exec tsc --noEmit # Type check
pnpm lint              # ESLint: import order, `../` forbidden
pnpm lint:fix          # ESLint --fix: sorts imports
pnpm format            # Prettier over the repo (docs/ is excluded)
pnpm test:watch        # Vitest in watch mode
pnpm dev               # Next.js dev server
pnpm build             # Production build
```

A single test file:

```bash
pnpm exec vitest run src/modules/printing/calibration.test.ts
```

Style is Prettier's and ESLint's business; neither should come up in a
review. `docs/` is not formatted by Prettier on purpose: normalising it would
bury content changes in the diff.

Package manager: `pnpm` 11, pinned in `package.json` (`packageManager`), with
security overrides for `postcss` and `sharp` in `pnpm-workspace.yaml`. Never
npm or yarn. Node 22 or later.

`.gitattributes` forces LF everywhere: with `core.autocrlf`, a fresh clone on
Windows used to fail `format:check` on every file.

---

## 3. Real structure

```text
app/                        Routes (App Router). Stays at the root.
app/api/                    API. Routes only build the context and delegate.
src/application/            Use cases. Coordinate modules, no rules of their own.
src/presentation/http/      Request → use case → response. No Next.
src/presentation/next/      The one place that joins Next, Supabase and the domain.
src/presentation/client/    Browser: HTTP client, TanStack Query, image preparation.
src/components/ui/          shadcn/ui components. Project code, not a dependency.
src/components/<area>/      Screens: posters, projects, session, usage, exports,
                            landing, guides, legal, site.
src/infrastructure/         Shared adapters: Supabase client, site URL, usage secret.
supabase/migrations/        Schema, RLS and functions. Applied by hand (0001-0011).
src/modules/
├── geometry/               Physical vocabulary in mm. Depends on nothing.
├── image-processing/       File header, upload preparation, mask → contour → mm.
├── accounts/               Sign-up, session, data authorization, account removal.
├── assets/                 The project's original image: row and file.
├── posters/                The product's output: size, crop, resolution, joining.
├── projects/               The user's project and its repository.
├── usage/                  Access levels and the daily limit, with its counter.
├── templates/              Silhouette + depth → pieces (parked, no UI).
├── printing/               Paper, margins, tiling, PrintLayout.
├── storage/                Object storage port: put, remove, sign.
├── exports/                A generated PDF and its file.
└── pdf-generation/         PrintLayout → PDF. Output boundary.
    └── infrastructure/     The only place that imports jspdf.
docs/                       Source of truth for behaviour.
```

`src/domain/` and `src/infrastructure/pdf/` exist empty and are unused:
leftovers. The structure grows with need (`docs/architecture.md` §4, §73).

The product's pipeline, the poster (`docs/PRD.md` §44):

```text
image file ─► header (size, EXIF) ─► crop ─► poster in mm ─► PrintLayout ─► PDF
   browser shrinks it   image-processing      posters          printing    pdf-generation
   if it is too heavy   └────────────── makePosterDocument / generatePosterDocument ──────┘
```

The parked mould pipeline (`templates/`) still has its end-to-end test,
`src/modules/pipeline.test.ts`.

---

## 4. Conventions in the code

* **The whole domain works in millimetres.** Pixels stay in
  `image-processing/` and `posters/` (crop); PDF points never enter the
  domain.
* `readonly` types, `create*` functions that validate invariants and throw
  domain errors with a stable `code`; `presentation/http/error-response.ts`
  maps each code to a status and a Spanish message.
* **Absolute imports with `@/` across folders**, relative only between
  siblings (`./errors`). `../` is forbidden by ESLint. ESLint sorts imports:
  packages, then `@/`, then siblings.
* **Comments explain the *why*** and cite the doc section behind it. Old
  ones are in Spanish; new ones may be in English (§0).
* **Tests in English**, describing behaviour (`AGENTS.md` §28), in a
  `*.test.ts` next to the module. Vitest runs in `node` and only
  `src/**/*.test.ts`: no UI tests in that suite. Contracts
  (`*.contract.ts`) run against the in-memory and the Supabase
  implementation alike.
* **The UI uses theme tokens**, never a literal colour (`bg-background`,
  `text-muted-foreground`, `--illustration-*` for drawings), defined in
  `app/globals.css`. `app/opengraph-image.tsx` is the one exception:
  ImageResponse cannot read CSS variables, so it mirrors them.
* shadcn components are project code: after `pnpm dlx shadcn@latest add`,
  run `pnpm lint:fix` and `pnpm format`.
* Browser data goes through TanStack Query (`src/presentation/client/`). A
  4xx is not retried and a mutation never repeats on its own.
* **The server decides with what is stored**, never with what the browser
  says: image size and orientation come from the file header, crops are
  validated against it, limits are counted in the database.
* No Supabase service key exists or should be added. What needs more than
  the user's token is a `security definer` function that checks its caller
  (`usage_*`, `delete_my_account`, `record_my_data_authorization`).

---

## 5. Every change ends in a commit

A project rule (`AGENTS.md` §54, §38 step 11). One feature, one commit:
implementation, tests and docs together, after `pnpm verify` passes.

Prefixes: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`, with the area
when it helps — `feat(posters): ...`. Commits and pushes are the user's
call unless they ask: the default branch is `main`, deployed by Vercel.

---

## 6. State, in short

The authoritative version is `docs/roadmap.md`.

* **Live at https://maker.profiya.com** (Vercel + Supabase). CI runs
  `pnpm verify` and the build on every push (`docs/deploy.md`).
* **The product is the image enlarged across sheets** (`docs/PRD.md` §44):
  pick an image, crop it, choose the size in cm, overlap or trim, download
  the PDF. Without an account at `/crear` (3 PDFs a day, nothing stored,
  terms accepted explicitly); with one in `/proyectos` (20 a day, saved).
* **The browser shrinks images** to 3.5 MB before sending: Vercel refuses
  more than 4.5 MB (`docs/image-processing.md` §111).
* **Legal pages follow Colombian law** (Ley 1581 de 2012): data policy,
  authorization with proof at sign-up, account deletion from the app
  (`docs/legal.md`).
* **Eleven migrations, applied by hand.** Always run `pnpm check:supabase`
  before assuming the database is up to date. Order notes for 0009-0011 are
  in `docs/legal.md` §5-§7.
* **Parked with the mould:** background removal and piece derivation. The
  poster does not need them.
* **Next** (`docs/roadmap.md` §4): print a poster and measure the 10 cm
  ruler; Search Console; a legal review; AdSense with its cookie banner when
  there is an account.
