import { afterEach, describe, expect, it, vi } from "vitest";

import { ObjectStorageError } from "@/modules/storage/object-storage";

import { toErrorResponse } from "./error-response";

describe("Error response", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should log the cause of a known server failure", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const cause = { message: "new row violates row-level security policy" };

    const response = toErrorResponse(
      new ObjectStorageError("Could not store the file.", { cause }),
    );

    // El usuario recibe el mensaje genérico; la causa tiene que quedar en el
    // registro. Sin ella, un bucket mal configurado era un 503 sin rastro.
    expect(response.status).toBe(503);
    expect(log).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0][1]).toMatchObject({ cause });
  });

  it("should not show the cause to the user", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    const response = toErrorResponse(
      new ObjectStorageError("Could not store the file.", {
        cause: { message: "new row violates row-level security policy" },
      }),
    );

    expect(await response.json()).toEqual({
      code: "OBJECT_STORAGE_FAILED",
      message: "No pudimos guardar el archivo. Inténtalo de nuevo.",
    });
  });

  it("should not log a failure that belongs to the request", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    // Un 404 es una respuesta, no un incidente.
    toErrorResponse({ code: "PROJECT_NOT_FOUND" });

    expect(log).not.toHaveBeenCalled();
  });

  it("should log an unknown failure", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = toErrorResponse(new Error("boom"));

    expect(response.status).toBe(500);
    expect(log).toHaveBeenCalledTimes(1);
  });
});
