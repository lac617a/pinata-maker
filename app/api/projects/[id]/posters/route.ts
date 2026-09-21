import { handleExportPoster } from "@/presentation/http/poster-endpoints";
import { posterRequestContext } from "@/presentation/next/export-request-context";

/**
 * Generar un PDF grande lleva unos segundos. El máximo del plan gratuito
 * de Vercel; en otro proveedor se ignora (docs/deploy.md §4).
 */
export const maxDuration = 60;

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(
  request: Request,
  { params }: RouteParams,
): Promise<Response> {
  const { id } = await params;

  return handleExportPoster(request, id, await posterRequestContext());
}
