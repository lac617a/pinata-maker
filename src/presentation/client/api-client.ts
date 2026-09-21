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

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      response.status,
      typeof body?.code === "string" ? body.code : "UNEXPECTED",
      typeof body?.message === "string" ? body.message : UNEXPECTED_MESSAGE,
    );
  }

  return body as T;
}
