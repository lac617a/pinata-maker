import { handleSignIn } from "@/presentation/http/auth-endpoints";
import { authRequestContext } from "@/presentation/next/auth-request-context";

export async function POST(request: Request): Promise<Response> {
  return handleSignIn(request, await authRequestContext());
}
