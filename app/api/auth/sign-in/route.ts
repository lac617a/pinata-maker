import { handleSignIn } from "../../../../src/presentation/http/auth-endpoints";
import { authRequestContext } from "../../../../src/presentation/next/auth-request-context";

export async function POST(request: Request): Promise<Response> {
  return handleSignIn(request, await authRequestContext());
}
