import { handleUnsavedPoster } from "@/presentation/http/usage-endpoints";
import { usageRequestContext } from "@/presentation/next/usage-request-context";

/**
 * Generar un PDF grande lleva unos segundos. El máximo del plan gratuito
 * de Vercel; en otro proveedor se ignora (docs/deploy.md §4).
 */
export const maxDuration = 60;

/** El póster sin guardar nada, con cuenta o sin ella. Ver docs/usage.md §2. */
export async function POST(request: Request): Promise<Response> {
  return handleUnsavedPoster(request, await usageRequestContext());
}
