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
* A substantial change of the policy bumps `DATA_POLICY_VERSION`. Asking
  existing accounts to accept the new version is still to be built.

Without an account, generating a PDF accepts the minimal treatment the
policy describes; `/crear` says so next to the tool.

## Deploying 0009

Order matters: **deploy the code first, then apply the migration.** Applied
first, the trigger would refuse every sign-up from the old code, which does
not send the authorization yet.

Accounts created before 0009 have no recorded authorization.
