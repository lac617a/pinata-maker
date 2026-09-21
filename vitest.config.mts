import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  // El mismo alias que `tsconfig.json`: los tests importan como el código.
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    // El dominio debe poder probarse sin React, Next.js ni navegador.
    // Ver docs/geometry.md §84.
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
