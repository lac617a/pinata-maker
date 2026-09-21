import { QueryClient } from "@tanstack/react-query";

import { ApiError } from "./api-client";

/**
 * Configuración del cliente de datos.
 *
 * Vive aparte del proveedor para que las decisiones estén en un sitio que se
 * pueda leer y probar, y no escondidas en un componente.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        /**
         * Reintentar solo cuando repetir puede cambiar algo.
         *
         * Un 404 o un 400 no mejoran por insistir: lo único que se consigue
         * es tardar tres veces más en enseñar el error. Un 5xx o una red
         * caída sí.
         */
        retry: (failureCount, error) => {
          if (error instanceof ApiError && error.isClientFault) {
            return false;
          }

          return failureCount < 2;
        },
        // Un proyecto no cambia solo: no hace falta volver a pedirlo cada vez
        // que el usuario vuelve a la pestaña.
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
      mutations: {
        // Una mutación repetida puede duplicar trabajo: publicar dos veces
        // una plantilla crea dos versiones. Nunca se reintenta sola.
        retry: false,
      },
    },
  });
}
