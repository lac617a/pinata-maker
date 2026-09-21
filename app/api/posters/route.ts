import { handleUnsavedPoster } from "@/presentation/http/usage-endpoints";
import { usageRequestContext } from "@/presentation/next/usage-request-context";

/** El póster sin guardar nada, con cuenta o sin ella. Ver docs/usage.md §2. */
export async function POST(request: Request): Promise<Response> {
  return handleUnsavedPoster(request, await usageRequestContext());
}
