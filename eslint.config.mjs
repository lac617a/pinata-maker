import { FlatCompat } from "@eslint/eslintrc";
import prettier from "eslint-config-prettier";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import tseslint from "typescript-eslint";

/**
 * Reglas de lint del proyecto.
 *
 * Config plana de ESLint 9. Sustituye a `next lint`, que abría un asistente
 * interactivo y fallaba en cualquier entorno no interactivo
 * (`docs/roadmap.md` §6).
 *
 * Lo que se comprueba aquí es lo que una revisión humana no debería tener que
 * mirar: orden de los imports, imports que suben por el árbol de carpetas y
 * errores del compilador que TypeScript no marca por sí solo. El estilo lo
 * decide Prettier, y `eslint-config-prettier` apaga todo lo que se solape.
 */
const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

export default tseslint.config(
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      "tsconfig.tsbuildinfo",
    ],
  },

  ...compat.extends("next/core-web-vitals"),

  {
    files: ["**/*.{ts,tsx,mts}"],
    extends: [...tseslint.configs.recommended],
    rules: {
      // Un argumento que existe para cumplir una interfaz se marca con `_`.
      // El repositorio los usa: `_userId` cuando el filtro lo aplica RLS.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      // El dominio importa muchos tipos. Marcarlos como tales evita que
      // acaben en el bundle y deja claro qué es valor y qué es forma.
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],

      /**
       * Nada de subir por el árbol de carpetas.
       *
       * `../../../../src/presentation/...` no dice de dónde viene nada y se
       * rompe al mover un archivo. Los imports entre módulos van por el alias
       * `@/`, que es absoluto y estable. Los hermanos —`./errors`— siguen
       * siendo relativos: están al lado, y obligarlos a dar la vuelta por la
       * raíz no aclara nada.
       */
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["../*", "..\\*"],
              message:
                "Usa el alias absoluto `@/...` en lugar de subir por el árbol de carpetas. Los imports de la misma carpeta (`./x`) sí son relativos.",
            },
          ],
        },
      ],
    },
  },

  {
    files: ["**/*.{js,mjs,cjs,ts,tsx,mts}"],
    plugins: { "simple-import-sort": simpleImportSort },
    rules: {
      // Orden automático y arreglable: paquetes, después `@/`, después los
      // hermanos. Nadie tiene que discutirlo en una revisión.
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
    },
  },

  {
    // Los scripts son Node puro, sin dominio ni alias.
    files: ["scripts/**/*.mjs"],
    rules: { "no-restricted-imports": "off" },
  },

  prettier,
);
