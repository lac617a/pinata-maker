import { handleSignOut } from "../../../../src/presentation/http/auth-endpoints";
import { authRequestContext } from "../../../../src/presentation/next/auth-request-context";

export async function POST(): Promise<Response> {
  return handleSignOut(await authRequestContext());
}
