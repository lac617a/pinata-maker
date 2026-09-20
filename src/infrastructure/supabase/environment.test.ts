import { describe, expect, it } from "vitest";

import {
  MissingSupabaseConfigurationError,
  readSupabaseConfiguration,
  SUPABASE_ANON_KEY_VARIABLE,
  SUPABASE_URL_VARIABLE,
} from "./environment";

const complete = {
  [SUPABASE_URL_VARIABLE]: "https://example.supabase.co",
  [SUPABASE_ANON_KEY_VARIABLE]: "anon-key",
};

describe("Supabase configuration", () => {
  it("should read the variables the deployment provides", () => {
    expect(readSupabaseConfiguration(complete)).toEqual({
      url: "https://example.supabase.co",
      anonKey: "anon-key",
    });
  });

  it("should fail when a variable is missing", () => {
    expect(() =>
      readSupabaseConfiguration({
        [SUPABASE_URL_VARIABLE]: "https://example.supabase.co",
      }),
    ).toThrow(MissingSupabaseConfigurationError);
  });

  it("should treat a blank variable as missing", () => {
    expect(() =>
      readSupabaseConfiguration({ ...complete, [SUPABASE_URL_VARIABLE]: "  " }),
    ).toThrow(MissingSupabaseConfigurationError);
  });

  it("should name the missing variable without revealing any value", () => {
    const error = (() => {
      try {
        readSupabaseConfiguration({ [SUPABASE_URL_VARIABLE]: "https://x.co" });
        return null;
      } catch (thrown) {
        return thrown as Error;
      }
    })();

    // El mensaje acaba en un log: dice qué falta, nunca qué vale lo demás.
    expect(error?.message).toContain(SUPABASE_ANON_KEY_VARIABLE);
    expect(error?.message).not.toContain("https://x.co");
  });
});
