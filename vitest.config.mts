import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // El dominio debe poder probarse sin React, Next.js ni navegador.
    // Ver docs/geometry.md §84.
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
