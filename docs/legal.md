# Páginas legales

Cómo se cumplen los requisitos de `PRD.md` §41: qué páginas hay, de dónde
salen sus datos y qué obliga a cambiarlas.

No es asesoría jurídica. Los textos están escritos sobre la base del RGPD,
la norma más exigente de las que pueden aplicar: cumplirla cubre la mayor
parte de las leyes latinoamericanas de protección de datos. Antes de publicar
conviene que alguien que conozca la ley del país del titular los revise.

---

# 1. Las páginas

```text
/privacidad    qué datos, para qué, dónde, cuánto tiempo, derechos
/terminos      uso, límites, cuenta, propiedad de las imágenes
/cookies       qué cookies y para qué
/aviso-legal   quién es el titular y cómo contactar
```

Están enlazadas desde el pie de **todas** las páginas, incluido el área
privada (AC-19): el pie va en el layout raíz.

---

# 2. Los datos del titular

Viven en un solo archivo, `src/components/legal/site-owner.ts`: titular,
identificación, dirección, país, correo, autoridad de protección de datos,
proveedor de alojamiento y región de Supabase.

Decisión del 2026-09-21: se escriben como marcadores (`[TITULAR]`,
`[PAÍS]`…) hasta que el titular los dé. **Mientras quede alguno, cada página
legal enseña un aviso de borrador** que nombra los que faltan. No deben
publicarse así: AdSense las revisa, y un aviso legal con marcadores no
identifica a nadie.

---

# 3. Los textos describen el sistema real

No son una plantilla genérica: dicen lo que hace la aplicación hoy.

* Sin cuenta, la imagen y el PDF **no se guardan** (`usage.md` §2).
* La cookie `pm_visitor` y la IP se guardan como huella HMAC; la de la IP
  cambia cada día; el contador se borra a los siete días (`usage.md` §5-§6).
* Supabase es el único proveedor de datos: autenticación, base de datos y
  archivos. No hay servicio externo de eliminación de fondo.
* Borrar una imagen o un PDF borra el registro y el archivo. Borrar la
  cuenta entera se pide por correo: la aplicación todavía no lo hace sola, y
  borrar un proyecto deja sus archivos en el bucket (`storage.md` §164).
  La política no promete lo que el sistema no hace.

**Si cambia qué se guarda, cuánto tiempo o quién interviene, estas páginas
cambian en el mismo commit.** Es parte de la definición de terminado de ese
cambio.

---

# 4. Cookies y consentimiento

Hoy solo hay cookies necesarias —la sesión de Supabase y `pm_visitor`— y no
requieren consentimiento. Por eso **no hay banner todavía**: un aviso sin
nada que rechazar no protege a nadie y entrena a ignorarlo.

El banner llega con AdSense, y juntos: antes de cargar cualquier script
publicitario se pregunta, rechazar la publicidad personalizada tiene que ser
tan fácil como aceptarla, y la decisión se puede cambiar (`PRD.md` §40,
AC-20). La política de cookies se actualiza en el mismo cambio.

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

Without an account, generating a PDF accepts the minimal treatment the
policy describes; `/crear` says so next to the tool.

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
