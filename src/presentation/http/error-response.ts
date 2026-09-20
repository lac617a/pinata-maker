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

    return jsonResponse({ code: "UNEXPECTED", message: UNEXPECTED.message }, UNEXPECTED.status);
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
