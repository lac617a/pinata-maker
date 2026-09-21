# Deployment

How the app gets to production and what is checked on every change. Built
for Vercel, the natural host for Next.js; what is not Vercel-specific works
anywhere.

Live at **https://maker.profiya.com** since 2026-09-21. Vercel deploys the
`main` branch.

---

# 1. Before a deploy

```text
[ ] pnpm verify passes
[ ] Migrations applied in the production Supabase, in the right order
      → pnpm check:supabase against it (every table and function)
[ ] New environment variables set in Vercel (§3)
[ ] Legal texts updated in the same commit if what is stored changed
      (legal.md §3)
```

## Migration order

Most migrations can be applied before the code that uses them: old code
never calls what does not exist yet. The exception is one that makes the
database stricter than the running code:

```text
0001-0008, 0010, 0011   before the push
0009                    after the push: it refuses sign-ups that do not
                        carry the data authorization (legal.md §5)
```

Before going public, still pending: a legal review of the texts and a
printed poster with its ruler measured (`roadmap.md` §4, §8.1).

---

# 2. Continuous integration

`.github/workflows/verify.yml` runs on every push and pull request:

```text
pnpm install --frozen-lockfile   the lockfile rules; if it does not match, it fails
pnpm verify                      format, lint, types and tests
pnpm build                       the production build
```

With fake but well-formed variables: the build needs them to start and no
test in the suite talks to Supabase. Integration tests skip themselves
without credentials. The real values live in the host, never in the
repository.

Checked on 2026-09-21 in a clean copy of the repository without `.env`: it
passes. Without `NEXT_PUBLIC_SITE_URL` the build fails naming the variable
(`seo.md` §2).

## Line endings

`.gitattributes` forces LF on every machine. Without it, a clone on Windows
with `core.autocrlf=true` — the usual setting — checked files out as CRLF
and `pnpm verify` failed on all of them without anyone touching anything.

## Versions

`packageManager` in `package.json` pins pnpm (the CI action reads it from
there) and `engines` asks for Node 22 or later. Vercel honours both.

---

# 3. Environment variables

In the host, for production:

```text
NEXT_PUBLIC_SITE_URL            https://the-domain   required (seo.md §2)
NEXT_PUBLIC_SUPABASE_URL        of the production project
NEXT_PUBLIC_SUPABASE_ANON_KEY   of the production project
USAGE_HASH_SECRET               32+ random characters, different from
                                development's (usage.md §5)
USAGE_LIMIT_ANONYMOUS           optional, 3 by default
USAGE_LIMIT_REGISTERED          optional, 20 by default
USAGE_LIMIT_PAID                optional, 200 by default
```

To generate the secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

There is no Supabase service key and none must be added (`roadmap.md` §3).

## In Supabase

* **Authentication → URL Configuration:** `Site URL` with the production
  domain, and in `Redirect URLs` the confirmation address
  `https://the-domain/api/auth/confirm`. Without it, the sign-up e-mail link
  sends the person somewhere else.

---

# 4. Vercel limits that affect this app

## Time

Generating a big PDF takes a few seconds. The three routes that generate
one declare `maxDuration = 60`, the free plan's maximum. Other hosts ignore
it.

## Request and response size: 4.5 MB

A Vercel function accepts no body over 4.5 MB and returns none larger.
Confirmed in production on 2026-09-21: a 5 MB upload got
`413 FUNCTION_PAYLOAD_TOO_LARGE` before reaching the app.

**Resolved by shrinking in the browser** (`image-processing.md` §111): every
image is sent at most 3.5 MB, which also keeps the PDF returned without an
account under the limit. If the platform still answers 413, the browser
shows its own message.

The next step, if huge prints at full resolution are ever needed, is
uploading straight to the bucket with a signed URL (`roadmap.md` §6); for
anonymous use it means storing for a few minutes and changing the privacy
policy.
