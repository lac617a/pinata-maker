import { handleAcceptDataPolicy } from "@/presentation/http/account-endpoints";
import { dataAuthorizationRequestContext } from "@/presentation/next/data-authorization-context";

/** The signed-in person accepts the current data policy (docs/legal.md §7). */
export async function POST(request: Request): Promise<Response> {
  return handleAcceptDataPolicy(
    request,
    await dataAuthorizationRequestContext(),
  );
}
