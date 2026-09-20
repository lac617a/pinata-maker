import { describe, expect, it } from "vitest";

import type {
  AuthGateway,
  SignUpOutcome,
} from "../../modules/accounts/auth-gateway";
import type { Credentials } from "../../modules/accounts/credentials";
import {
  AuthenticationFailedError,
  AuthServiceError,
} from "../../modules/accounts/errors";
import type { UserId } from "../../modules/projects/project";
import {
  handleSignIn,
  handleSignOut,
  handleSignUp,
} from "./auth-endpoints";

/**
 * Servicio de autenticación de mentira.
 *
 * Lo que se prueba aquí es la traducción entre HTTP y el dominio, no Supabase
 * Auth. Registra lo que recibió para comprobar que llega normalizado.
 */
class FakeAuthGateway implements AuthGateway {
  received: Credentials | null = null;
  signedOut = false;

  constructor(
    private readonly behaviour: {
      signUp?: SignUpOutcome | Error;
      signIn?: UserId | Error;
      signOut?: Error;
    } = {},
  ) {}

  async signUp(credentials: Credentials): Promise<SignUpOutcome> {
    this.received = credentials;

    const outcome = this.behaviour.signUp ?? "CONFIRMATION_REQUIRED";

    if (outcome instanceof Error) {
      throw outcome;
    }

    return outcome;
  }

  async signIn(credentials: Credentials): Promise<UserId> {
    this.received = credentials;

    const outcome = this.behaviour.signIn ?? "user-1";

    if (outcome instanceof Error) {
      throw outcome;
    }

    return outcome;
  }

  async signOut(): Promise<void> {
    this.signedOut = true;

    if (this.behaviour.signOut) {
      throw this.behaviour.signOut;
    }
  }
}

function post(body: unknown): Request {
  return new Request("http://localhost/api/auth", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const valid = { email: "Alguien@Ejemplo.COM", password: "contraseña-larga" };

describe("Sign up", () => {
  it("should ask the user to confirm the address", async () => {
    const auth = new FakeAuthGateway();
    const response = await handleSignUp(post(valid), { auth });

    expect(response.status).toBe(202);
    expect((await response.json()).status).toBe("CONFIRMATION_REQUIRED");
  });

  it("should answer the same whether the address was new or already known", async () => {
    // Decir «ese correo ya existe» convertiría el registro en una forma de
    // averiguar quién tiene cuenta.
    const nuevo = await handleSignUp(post(valid), {
      auth: new FakeAuthGateway({ signUp: "CONFIRMATION_REQUIRED" }),
    });
    const repetido = await handleSignUp(post(valid), {
      auth: new FakeAuthGateway({ signUp: "CONFIRMATION_REQUIRED" }),
    });

    expect(nuevo.status).toBe(repetido.status);
    expect(await nuevo.json()).toEqual(await repetido.json());
  });

  it("should say so when the project signs the user in directly", async () => {
    const response = await handleSignUp(post(valid), {
      auth: new FakeAuthGateway({ signUp: "SIGNED_IN" }),
    });

    expect(response.status).toBe(201);
  });

  it("should normalise the address before using it", async () => {
    const auth = new FakeAuthGateway();

    await handleSignUp(post(valid), { auth });

    expect(auth.received?.email).toBe("alguien@ejemplo.com");
  });

  it("should reject something that is not an address", async () => {
    const response = await handleSignUp(
      post({ ...valid, email: "alguien-arroba-ejemplo" }),
      { auth: new FakeAuthGateway() },
    );

    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("INVALID_CREDENTIALS_FORMAT");
  });

  it("should reject a password that is too short", async () => {
    const response = await handleSignUp(post({ ...valid, password: "corta" }), {
      auth: new FakeAuthGateway(),
    });

    expect(response.status).toBe(400);
  });

  it("should reject a request with no credentials", async () => {
    for (const body of [{}, "no soy json", { email: "a@b.co" }]) {
      const response = await handleSignUp(post(body), {
        auth: new FakeAuthGateway(),
      });

      expect(response.status).toBe(400);
    }
  });
});

describe("Sign in", () => {
  it("should open the session without returning a token", async () => {
    const response = await handleSignIn(post(valid), {
      auth: new FakeAuthGateway(),
    });

    // La sesión viaja en cookies. Un token en el cuerpo acabaría en
    // localStorage, donde cualquier script de la página puede leerlo.
    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
  });

  it("should answer the same for an unknown address and a wrong password", async () => {
    const rejection = new AuthenticationFailedError("no");

    const desconocida = await handleSignIn(post(valid), {
      auth: new FakeAuthGateway({ signIn: rejection }),
    });
    const contrasena = await handleSignIn(post(valid), {
      auth: new FakeAuthGateway({ signIn: rejection }),
    });

    expect(desconocida.status).toBe(401);
    expect(await desconocida.json()).toEqual(await contrasena.json());
  });

  it("should tell a service failure apart from a rejection", async () => {
    const response = await handleSignIn(post(valid), {
      auth: new FakeAuthGateway({ signIn: new AuthServiceError("caído") }),
    });

    // No es culpa del usuario y merece reintento: 503, no 401.
    expect(response.status).toBe(503);
  });
});

describe("Sign out", () => {
  it("should close the session", async () => {
    const auth = new FakeAuthGateway();
    const response = await handleSignOut({ auth });

    expect(response.status).toBe(204);
    expect(auth.signedOut).toBe(true);
  });

  it("should report a service failure", async () => {
    const response = await handleSignOut({
      auth: new FakeAuthGateway({ signOut: new AuthServiceError("caído") }),
    });

    expect(response.status).toBe(503);
  });
});
