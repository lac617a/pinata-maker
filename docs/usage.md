# Usage without an account, and the daily limit

How the tool is used without signing up and how much can be used per day.
The requirements are in `PRD.md` §38 and §39; this document says how they
are met.

---

# 1. What counts

Every generated PDF counts one, from a saved project or without saving
anything. Seeing the image, cropping it, changing the size and looking at
the preview do not count: all of that happens in the browser and costs the
server nothing.

---

# 2. Without an account, nothing is stored

Decided on 2026-09-21. The anonymous visitor keeps no projects
(`PRD.md` §38), and the most direct way to meet that is to store nothing:

```text
browser            picks the image, crops it, chooses the size; the image stays
POST /api/posters  image + options → the PDF in the response
server             validates the image, generates the PDF, counts one, returns it
```

Neither the image nor the document goes through object storage: nothing to
clean up or protect afterwards. Signing up later starts from scratch.

Supabase's anonymous sessions were ruled out: they would have given the
anonymous visitor projects, against the PRD, and abandoned users to clean
up.

The same route serves someone with an account who does not want a project:
then it counts against the account's quota.

Before the PDF, an anonymous visitor accepts the terms and the data policy
with an explicit tick; the server refuses without it (`legal.md` §8).

---

# 3. The limits

```text
ANONYMOUS     3 a day
REGISTERED   20 a day
PAID        200 a day    (the level exists; payments do not)
```

Decided on 2026-09-21. Three are enough to try a couple of sizes without an
account; signing up multiplies them and is a clear reason to do it.

They are configuration (`PRD.md` §39): `USAGE_LIMIT_ANONYMOUS`,
`USAGE_LIMIT_REGISTERED` and `USAGE_LIMIT_PAID` change them without code. A
value that is not a positive whole number makes the request fail: a
mistyped limit must not leave the tool open or closed without anyone
noticing.

---

# 4. The day is UTC's

The counter resets at midnight UTC. A fixed zone and not the visitor's: the
browser's zone is chosen by the client, and changing it would give a new
day. The UI shows at what local time it renews.

---

# 5. How the anonymous visitor is recognised

By cookie **and** by IP, decided on 2026-09-21. Usage is the higher of the
two, and consuming adds to both:

* clearing the cookie is not enough to start over: the IP still counts;
* two people behind the same IP share the limit. That is the price of the
  above, accepted by PRD §39: contain normal abuse, not prevent it.

```text
pm_visitor      httpOnly cookie, a random UUID, one year
visitor:<hmac>  HMAC-SHA256 of the cookie with USAGE_HASH_SECRET
ip:<hmac>       HMAC-SHA256 of the day and the IP, same secret
```

Neither is stored in clear. The IP's fingerprint includes the day: today's
cannot be related to yesterday's. The IP is still personal data, and the
data policy says so (`legal.md` §3).

`USAGE_HASH_SECRET` is required, at least 32 random characters. Without it
the route answers 503 and the log names the missing variable. Without a
secret, anyone could recompute an IP's fingerprint and spend its quota.

The IP comes from `x-forwarded-for`, set by the platform. Without a proxy in
front anyone could invent it; that is why it never counts alone.

---

# 6. Where it is counted

`0008_usage_counters.sql`. A table `usage_counters (subject, day, used)`
nobody can access directly, and two `security definer` functions:

```text
usage_used(subjects, day)            how much was used: the highest
usage_consume(subjects, day, limit)  adds one if any is left, in one operation
```

There is no service key (`roadmap.md` §3), and the anonymous visitor must be
able to count: so these are functions the `anon` role can run, not
permissions on the table. They check what they receive:

* one to four subjects, prefixed `user:`, `visitor:` or `ip:`;
* a `user:` only if it is the token's (`auth.uid()`): nobody spends or reads
  another account's quota;
* today, with one day of margin: the table cannot be filled with invented
  days.

`usage_consume` locks the rows before reading: two simultaneous requests
cannot both take the last document. It also deletes days older than a week.

What it cannot prevent: someone with the public key calling
`usage_consume` with invented fingerprints. It only adds, and without the
secret nobody's fingerprint can be found.

The test against the real database runs with `SUPABASE_TEST_USAGE=1` and
needs the migration applied.

---

# 7. The access level

Today every account is `REGISTERED`. `PAID` exists in the type and in the
limits so that payments do not force a rewrite (`PRD.md` §38); when they
come, the level will come from the user's profile instead of from having a
session.

---

# 8. When it is charged

```text
1. Anything left?       if not, 429 before working
2. Generate the PDF     a wrong size or crop costs nothing
3. Consume one          atomic; if another request took the last one, 429
4. Deliver or store     only after consuming
```

Step 1 is a shortcut to avoid generating what will be refused; step 3 is
what guarantees the limit. In a saved project, step 4 stores the document:
if consuming fails nothing is stored. If storing fails after consuming, that
document counts: rare, and better than delivering without counting.

---

# 9. API

```text
GET  /api/usage                   { usage: { level, limit, used, remaining, resetsAt } }
POST /api/posters                 multipart: image + options (JSON) → application/pdf
POST /api/projects/[id]/posters   JSON; the response carries `usage`
```

`options` carries `width` or `height` in mm, an optional `crop` in pixels,
an optional `paper`, an optional `joining` (`OVERLAP` or `TRIM`,
`pdf.md` §99) and, without an account, `acceptedTerms: true`. The PDF
response carries `x-usage-limit`, `x-usage-remaining` and
`cache-control: no-store`.

A reached limit answers **429** with `USAGE_LIMIT_REACHED`. It is not a
failure: the UI presents it as a planned state and offers signing up or
coming back tomorrow (`PRD.md` §39).

---

# 10. The UI

`/crear` is public: pick an image — with a button or by dragging it — crop
it, choose the size and download. The image is shown from a local link to
the file (`URL.createObjectURL`) and does not leave the browser until the
PDF is requested; if it is too heavy, the browser shrinks it first
(`image-processing.md` §111).

The poster studio is the same in `/crear` and in a project; only the
download changes (`poster-downloads.ts`): store in the project and download
by signed link, or receive the PDF in the response.

Above the studio, always, how many are left today and at what local time
they renew. The anonymous visitor is reminded that an account gets more.
With the quota spent:

* the download is disabled, but cropping and sizing still work;
* the anonymous visitor sees "Crear cuenta gratis" and "Ya tengo cuenta";
* an account sees when it renews.

A 429 that arrives anyway — another tab took the last one — is shown as a
notice and the counter is fetched again.

## How it was checked

In the browser, without a session, against the real database: three PDFs
generated (2, 1, 0 left), the fourth answers 429, and reloading shows the
limit-reached state with the download disabled. The cookie is not visible
from JavaScript (`httpOnly`).
