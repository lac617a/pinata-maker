"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

import { Toaster } from "@/components/ui/sonner";

import { createQueryClient } from "./query-client";

/**
 * Lo que el navegador necesita alrededor de la aplicación.
 *
 * El cliente se crea con `useState` y no como constante de módulo: en el
 * servidor, una constante la compartirían todas las peticiones y los datos de
 * un usuario acabarían en la caché de otro.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster position="top-center" />
      {process.env.NODE_ENV === "development" ? (
        <ReactQueryDevtools initialIsOpen={false} />
      ) : null}
    </QueryClientProvider>
  );
}
