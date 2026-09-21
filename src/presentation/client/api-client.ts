/**
 * Cliente HTTP del navegador.
 *
 * La API responde siempre con la misma forma de error —`{ code, message }`,
 * `presentation/http/error-response.ts`—, así que el navegador puede tratar
 * un fallo como un dato y no como una excepción sin forma.
 *
 * Es deliberadamente pequeño: no cachea, no reintenta y no sabe de estado.
 * De eso se encarga TanStack Query, que es quien tiene el contexto para
 * decidirlo.
 */

/** Fallo que la API describió. Ver docs/PRD.md §23. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /**
   * Un 4xx es culpa de la petición: repetirla da lo mismo.
   *
   * Es la diferencia que decide si reintentar tiene sentido.
   */
  get isClientFault(): boolean {
    return this.status >= 400 && this.status < 500;
  }
}

const UNEXPECTED_MESSAGE =
  "Algo falló por nuestra parte. Inténtalo de nuevo en un momento.";

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      // El cuerpo `FormData` lleva su propio `content-type` con el boundary:
      // fijarlo a mano rompería la subida de archivos.
      ...(init?.body instanceof FormData
        ? {}
        : { "content-type": "application/json" }),
      ...init?.headers,
    },
  });

  if (response.status === 204) {
    return undefined as T;
  }

  if (!response.ok) {
    throw await errorFrom(response);
  }

  return (await response.json().catch(() => null)) as T;
}

/**
 * The error a failed response describes.
 *
 * Almost always the API's own `{ code, message }`. A 413 may come instead
 * from the hosting platform, before the request reaches the app, with a body
 * that is not JSON: it gets its own message rather than a generic failure
 * (docs/deploy.md §4).
 */
export async function errorFrom(response: Response): Promise<ApiError> {
  const body = await response.json().catch(() => null);

  if (typeof body?.code === "string" && typeof body?.message === "string") {
    return new ApiError(response.status, body.code, body.message);
  }

  if (response.status === 413) {
    return new ApiError(413, "PAYLOAD_TOO_LARGE", PAYLOAD_TOO_LARGE_MESSAGE);
  }

  return new ApiError(response.status, "UNEXPECTED", UNEXPECTED_MESSAGE);
}

const PAYLOAD_TOO_LARGE_MESSAGE =
  "La imagen es demasiado grande para enviarla. Prueba con una más pequeña o recórtala antes.";
