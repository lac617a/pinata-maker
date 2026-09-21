/**
 * Errores de la autenticación.
 *
 * Ninguno de ellos revela si una dirección está registrada. Ver §credentials
 * y docs/PRD.md §25.
 */

/** Los datos no tienen la forma de unas credenciales. */
export class InvalidCredentialsError extends Error {
  readonly code = "INVALID_CREDENTIALS_FORMAT";

  constructor(message: string) {
    super(message);
    this.name = "InvalidCredentialsError";
  }
}

/**
 * Las credenciales no sirven para entrar.
 *
 * Es el mismo error tanto si la dirección no existe como si la contraseña es
 * incorrecta. Distinguirlos permitiría averiguar quién tiene cuenta.
 */
export class AuthenticationFailedError extends Error {
  readonly code = "AUTHENTICATION_FAILED";

  constructor(message: string) {
    super(message);
    this.name = "AuthenticationFailedError";
  }
}

/** El servicio de autenticación no respondió o falló. */
export class AuthServiceError extends Error {
  readonly code = "AUTH_SERVICE_FAILED";

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "AuthServiceError";
  }
}

/**
 * An account without the data policy authorization. Colombian law requires
 * it before any personal data is processed (docs/legal.md §5).
 */
export class DataAuthorizationRequiredError extends Error {
  readonly code = "DATA_AUTHORIZATION_REQUIRED";

  constructor(message: string) {
    super(message);
    this.name = "DataAuthorizationRequiredError";
  }
}
