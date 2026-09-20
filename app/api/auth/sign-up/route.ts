import { handleSignUp } from "../../../../src/presentation/http/auth-endpoints";
import { authRequestContext } from "../../../../src/presentation/next/auth-request-context";

export async function POST(request: Request): Promise<Response> {
  return handleSignUp(request, await authRequestContext());
}
