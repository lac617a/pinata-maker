/**
 * La dirección pública del sitio: `https://…`, sin barra final.
 *
 * La usan las URL canónicas, el sitemap y el enlace de confirmación del
 * correo. Sin ella en desarrollo se usa `localhost`; en producción tiene que
 * estar, o los buscadores recibirían enlaces a `localhost`
 * (docs/seo.md §2).
 */

export const SITE_URL_VARIABLE = "NEXT_PUBLIC_SITE_URL";

const DEVELOPMENT_URL = "http://localhost:3000";

export class InvalidSiteUrlError extends Error {
  readonly code = "INVALID_SITE_URL";

  constructor(message: string) {
    super(message);
    this.name = "InvalidSiteUrlError";
  }
}

export function readSiteUrl(
  environment: Record<string, string | undefined> = process.env,
): string {
  const raw = environment[SITE_URL_VARIABLE]?.trim();

  if (!raw) {
    if (environment.NODE_ENV === "production") {
      throw new InvalidSiteUrlError(
        `${SITE_URL_VARIABLE} must be set in production.`,
      );
    }

    return DEVELOPMENT_URL;
  }

  let url: URL;

  try {
    url = new URL(raw);
  } catch {
    throw new InvalidSiteUrlError(`${SITE_URL_VARIABLE} is not a valid URL.`);
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new InvalidSiteUrlError(
      `${SITE_URL_VARIABLE} must be http or https.`,
    );
  }

  return url.origin;
}
