/**
 * Traducción de un fallo del dominio a una respuesta HTTP.
 *
 * El usuario recibe un código estable y un mensaje que explica qué pasó y qué
 * puede hacer. El detalle técnico se registra, no se enseña.
 * Ver docs/PRD.md §23.
 */

export type ErrorBody = {
  readonly code: string;
  readonly message: string;
};

type ErrorPresentation = {
  readonly status: number;
  readonly message: string;
};

/**
 * Qué se le dice al usuario por cada causa conocida.
 *
 * Los mensajes viven en un único sitio para que cambiar la redacción no exija
 * buscarla por las rutas. La redacción final pertenece a producto.
 */
const KNOWN_ERRORS: Record<string, ErrorPresentation> = {
  INVALID_PROJECT: {
    status: 400,
    message: "Los datos del proyecto no son válidos.",
  },
  INVALID_PROJECT_TRANSITION: {
    status: 409,
    message: "El proyecto no puede pasar a ese estado desde el actual.",
  },
  PROJECT_NOT_FOUND: {
    status: 404,
    message: "No encontramos ese proyecto.",
  },
  PROJECT_STORAGE_FAILED: {
    status: 503,
    message: "No pudimos guardar los cambios. Inténtalo de nuevo.",
  },
  DATA_AUTHORIZATION_REQUIRED: {
    status: 400,
    message:
      "Para crear la cuenta tienes que autorizar el tratamiento de tus datos.",
  },
  INVALID_CREDENTIALS_FORMAT: {
    status: 400,
    message: "Revisa el correo y la contraseña.",
  },
  AUTHENTICATION_FAILED: {
    status: 401,
    // El mismo mensaje para una dirección desconocida y para una contraseña
    // incorrecta: distinguirlos diría quién tiene cuenta.
    message: "El correo o la contraseña no son correctos.",
  },
  AUTH_SERVICE_FAILED: {
    status: 503,
    message: "No pudimos verificar tu cuenta. Inténtalo de nuevo.",
  },
  INVALID_ASSET: {
    status: 400,
    message: "El archivo no es válido.",
  },
  ASSET_NOT_FOUND: {
    status: 404,
    message: "No encontramos esa imagen.",
  },
  ASSET_STORAGE_FAILED: {
    status: 503,
    message: "No pudimos guardar la imagen. Inténtalo de nuevo.",
  },
  OBJECT_STORAGE_FAILED: {
    status: 503,
    message: "No pudimos guardar el archivo. Inténtalo de nuevo.",
  },
  INVALID_TEMPLATE_DEFINITION: {
    status: 400,
    message: "Esa plantilla no se puede guardar tal y como llega.",
  },
  TEMPLATE_VERSION_NOT_FOUND: {
    status: 404,
    message: "No encontramos esa versión de la plantilla.",
  },
  TEMPLATE_VERSION_CONFLICT: {
    // 409 y no 200: el cliente publicó sobre un estado que ya no era el
    // actual, y tiene que saberlo para no perder su trabajo.
    status: 409,
    message:
      "Alguien publicó una versión más nueva mientras trabajabas. Vuelve a cargar la plantilla.",
  },
  TEMPLATE_STORAGE_FAILED: {
    status: 503,
    message: "No pudimos guardar la plantilla. Inténtalo de nuevo.",
  },
  INVALID_POSTER_SIZE: {
    status: 400,
    message:
      "Esa medida no sirve: cada lado tiene que medir entre 10 cm y 3 m.",
  },
  INVALID_IMAGE_CROP: {
    status: 400,
    message:
      "Ese recorte no sirve: tiene que caer dentro de la imagen y no ser diminuto.",
  },
  USAGE_LIMIT_REACHED: {
    // 429 es «demasiadas peticiones»: es lo que pasa, y el navegador y
    // cualquier proxy lo entienden como un límite, no como un fallo.
    status: 429,
    message: "Ya usaste los PDF de hoy. Se renuevan a medianoche (UTC).",
  },
  USAGE_COUNTER_UNAVAILABLE: {
    status: 503,
    message: "No pudimos comprobar tu límite diario. Inténtalo de nuevo.",
  },
  INVALID_USAGE_LIMITS: {
    status: 503,
    message: "Algo falló por nuestra parte. Inténtalo de nuevo en un momento.",
  },
  USAGE_NOT_CONFIGURED: {
    status: 503,
    message: "Algo falló por nuestra parte. Inténtalo de nuevo en un momento.",
  },
  INVALID_EXPORT: {
    status: 400,
    message: "No pudimos preparar esa descarga con lo que nos has pedido.",
  },
  EXPORT_NOT_FOUND: {
    status: 404,
    message: "No encontramos ese documento.",
  },
  EXPORT_STORAGE_FAILED: {
    status: 503,
    message: "No pudimos guardar el documento. Inténtalo de nuevo.",
  },
  UNSUPPORTED_IMAGE_FORMAT: {
    status: 415,
    message: "Ese formato de imagen no está soportado. Usa PNG, JPEG o WEBP.",
  },
  IMAGE_FILE_TOO_LARGE: {
    status: 413,
    message: "La imagen pesa demasiado.",
  },
  INVALID_IMAGE_DIMENSIONS: {
    status: 400,
    message: "La imagen no tiene un tamaño utilizable.",
  },
  EMPTY_MASK: {
    status: 422,
    message:
      "No pudimos detectar una figura en la imagen. Prueba con una donde el personaje tenga un fondo más limpio.",
  },
  AMBIGUOUS_SUBJECT: {
    status: 422,
    message:
      "La imagen tiene más de una figura de tamaño parecido. Prueba con una que tenga una sola.",
  },
  UNSUPPORTED_SILHOUETTE: {
    status: 422,
    message: "Esa figura no se puede convertir todavía en una plantilla.",
  },
  INVALID_CONTOUR: {
    status: 422,
    message: "La figura detectada no sirve para recortar una plantilla.",
  },
};

const UNEXPECTED: ErrorPresentation = {
  status: 500,
  message: "Algo falló por nuestra parte. Inténtalo de nuevo en un momento.",
};

/**
 * Qué se le dice al usuario por un código conocido.
 *
 * Lo usa también el navegador: cuando la plantilla se deriva ahí, el error
 * del dominio no pasa por HTTP y no hay respuesta que traducir. El texto es
 * el mismo en los dos sitios porque sale de la misma tabla.
 */
export function messageForErrorCode(code: string | undefined): string | null {
  return code ? (KNOWN_ERRORS[code]?.message ?? null) : null;
}

export function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/**
 * Respuesta para un usuario que no ha iniciado sesión.
 *
 * Es distinta de «no existe»: aquí todavía no sabemos quién pregunta.
 */
export function unauthorizedResponse(): Response {
  return jsonResponse(
    { code: "NOT_AUTHENTICATED", message: "Inicia sesión para continuar." },
    401,
  );
}

/**
 * Un fallo desconocido no revela nada.
 *
 * Su mensaje y su tipo pueden contener rutas, consultas o nombres internos, y
 * se quedan en el registro del servidor.
 */
export function toErrorResponse(error: unknown): Response {
  const code = errorCode(error);
  const known = code ? KNOWN_ERRORS[code] : undefined;

  if (!known) {
    console.error("Unhandled request failure", error);

    return jsonResponse(
      { code: "UNEXPECTED", message: UNEXPECTED.message },
      UNEXPECTED.status,
    );
  }

  if (known.status >= 500) {
    // Un fallo nuestro conocido sigue siendo un fallo nuestro. El usuario
    // recibe el mensaje genérico de la tabla; la causa —la respuesta de
    // Supabase, la política que rechazó la fila— tiene que quedar en el
    // registro o nadie podrá saber qué pasó. Ver docs/roadmap.md §8.4.
    console.error(`Request failed with ${code}`, error);
  }

  return jsonResponse({ code, message: known.message }, known.status);
}

function errorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }

  const code = (error as { code?: unknown }).code;

  return typeof code === "string" ? code : undefined;
}
