import { handleReadUsage } from "@/presentation/http/usage-endpoints";
import { usageRequestContext } from "@/presentation/next/usage-request-context";

/** Cuánto le queda hoy a quien pregunta. Ver docs/usage.md §9. */
export async function GET(): Promise<Response> {
  return handleReadUsage(await usageRequestContext());
}
