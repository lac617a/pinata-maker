# Legal pages

How the requirements of `PRD.md` §41 are met: which pages exist, where their
data comes from, and what forces them to change.

This is not legal advice. The texts follow Colombian law (§5) and were
first written on the GDPR, the strictest framework that could apply. Before
treating them as final, someone who knows Colombian law should review them.

---

# 1. The pages

```text
/privacidad    data policy: what, why, where, how long, rights, requests
/terminos      use, limits, account, ownership of the images
/cookies       which cookies and what for
/aviso-legal   who runs the site and how to reach them
```

They are linked from the footer of **every** page, private area included
(AC-19): the footer is in the root layout. The footer calls the first one
"Tratamiento de datos".

---

# 2. The owner's details

They live in one file, `src/components/legal/site-owner.ts`: owner, ID,
address, country, e-mail, phone, data protection authority, hosting provider
and Supabase region. Every page quotes them from there.

While any value is still a bracketed placeholder (`[TITULAR]`…), every legal
page shows a visible draft notice naming what is missing: they must not be
published that way. Since 2026-09-21 all of them are filled in.

---

# 3. The texts describe the real system

They are not a generic template: they say what the app does today.

* Without an account, the image and the PDF **are not stored**
  (`usage.md` §2).
* The `pm_visitor` cookie and the IP are kept as an HMAC fingerprint; the
  IP's changes every day; the counter goes after seven days
  (`usage.md` §5-§6).
* Supabase is the only data provider: authentication, database and files.
  No external service processes images.
* Deleting an image, a PDF, a project or the whole account removes rows and
  files, from the app (§6).

**If what is stored, for how long or by whom changes, these pages change in
the same commit** — and `DATA_POLICY_VERSION` too, if the change is
substantial (§5). It is part of that change's definition of done.

---

# 4. Cookies and consent

Today there are only necessary cookies — the Supabase session and
`pm_visitor` — and they need no consent. That is why **there is no banner
yet**: a notice with nothing to reject protects nobody and trains people to
ignore it. `pm-terms-accepted` is `localStorage`, not a cookie (§8).

The banner comes with AdSense, together: ask before loading any ad script,
make rejecting personalised ads as easy as accepting them, and let the
decision be changed (`PRD.md` §40, AC-20). The cookie policy changes in the
same commit.

---

# 5. Colombian law

Decided on 2026-09-21: the site is run from Colombia, so the texts follow
Ley 1581 de 2012 and Decreto 1377 de 2013 (compiled in Decreto 1074 de
2015), not the GDPR they were first written on.

## What the data policy must contain

Art. 13 of the decree, and where each point is in `/privacidad`:

```text
name, address, e-mail and phone of the controller     §1
treatment and purposes                                §2
rights of the data subject (Ley 1581, art. 8)         §6
who handles requests                                  §7
procedure for queries and complaints                  §7
effective date and how long data is kept              §10, §5
```

The authority is the **Superintendencia de Industria y Comercio (SIC)**.
A complaint there needs a prior claim to the controller (Ley 1581, art. 16),
and the policy says so.

Deadlines, from Ley 1581:

```text
query       10 business days, extendable by 5     (art. 14)
complaint   15 business days, extendable by 8     (art. 15)
            5 days to ask for missing information; 2 months without it
            counts as withdrawn
```

## The authorization

Art. 9: prior, express and informed, and the controller keeps proof.

* The sign-up form has an **unticked, required box** linking to the policy
  and the terms. The server refuses a sign-up without an explicit `true`
  (`DATA_AUTHORIZATION_REQUIRED`), before calling Supabase.
* The proof is **which policy version and when**
  (`DATA_POLICY_VERSION`). It travels as user metadata and a trigger copies
  it into `data_authorizations` (`0009_data_authorizations.sql`), a table
  nobody can edit; its owner can read it.
* The same trigger **refuses any account without it.** The anon key is
  public and the Supabase sign-up API can be called directly; with this the
  rule holds in the database, whoever calls.
* A substantial change of the policy bumps `DATA_POLICY_VERSION`, and every
  account is asked to accept the new version (§7).

Without an account, the download needs an explicit tick too (§8).

## Deploying 0009

Order matters: **deploy the code first, then apply the migration.** Applied
first, the trigger would refuse every sign-up from the old code, which does
not send the authorization yet.

Accounts created before 0009 have no recorded authorization; they are
asked once (§7).

---

# 6. Deleting data

The right to deletion (Ley 1581, art. 8) is exercised from the app, not by
e-mail:

```text
an image or a PDF    from the project; row and file go
a project            from the list; its images and PDFs go first
the account          "Tu cuenta" in /proyectos, typing BORRAR
```

## Files before rows

The storage policies let an owner delete a file only while its project
exists (0006). So `deleteProjectWithFiles` removes images and PDFs through
the Storage API first, then the project. If a file cannot be removed,
nothing else is deleted and trying again finishes the job. Deleting the
project first would leave files nobody can reach or remove; that was the
debt of `storage.md` §164, now closed.

## The account

There is no service key, so the admin API that deletes users is out of
reach. `delete_my_account()` (`0010_delete_own_account.sql`) deletes the
caller's own account only, and **refuses while it still has projects**: the
app deletes every project with its files first, and only then calls it.
The usage counter goes explicitly (it is keyed by text); the proof of
authorization, sessions and identities go by cascade. The session cookies
are cleared afterwards.

The server requires `{ "confirm": true }` in the request, and the screen
asks to type BORRAR: it cannot be undone.

## Deploying 0010

Order matters, and it is the opposite of 0009: **apply 0010 before
deploying the code.** The old code never calls the function, so applying it
first is harmless. Deployed without it, deleting an account would remove
every project and then fail at the last step, leaving an empty account.
`pnpm check:supabase` checks that the function exists.

---

# 7. Asking existing accounts

Two kinds of account lack an authorization for the current policy: those
created before 0009 recorded it, and all of them after the policy changes
version. Entering `/proyectos`, such an account sees the same box as at
sign-up, unticked and required, **instead of** its projects, once.

* Accepting goes through `record_my_data_authorization`
  (`0011_record_own_data_authorization.sql`): it takes the user from the
  session and the time from the database, which is the proof.
* The check reads `data_authorizations` (0009), where each person sees only
  their own rows.
* **If the check itself fails** — 0009 not applied yet, Supabase down — the
  person gets through and the failure is logged. A pending migration must
  not lock every account out of its own projects.
* Declining is possible: sign out, or ask for the account to be deleted.

## Deploying 0011

Apply it **before** deploying the code: the old code never calls it, and
without it an account asked to accept could not.

```text
0010, 0011   before the push
0009         after the push
```

---

# 8. Accepting without an account

Decided on 2026-09-21, like Block Posters: a download without an account
starts by accepting the terms and the data policy, with a tick of the
person's own. A passive "by generating you accept" notice was there before;
it is gone.

* In `/crear`, once an image is chosen, an **unticked box** appears next to
  the download. Until it is ticked the buttons stay disabled, and on a phone
  the floating bar says why.
* **The server requires it too.** `POST /api/posters` from an anonymous
  visitor without `acceptedTerms: true` answers 400
  `TERMS_ACCEPTANCE_REQUIRED`, before generating or counting anything. An
  account is not asked: it accepted at sign-up.
* **Remembered per browser and per policy version** (`localStorage`,
  `pm-terms-accepted`): ticked once, not asked again on the next visit;
  asked again when `DATA_POLICY_VERSION` changes. If storage is blocked it
  is simply asked every time. The server check does not depend on it.

There is no record of the anonymous acceptance: there is no identity to tie
it to, and the treatment it covers is minimal (the image is not stored).
The proof is that no PDF is generated without it.
