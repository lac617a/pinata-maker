import { handleSignOut } from "@/presentation/http/auth-endpoints";
import { authRequestContext } from "@/presentation/next/auth-request-context";

export async function POST(): Promise<Response> {
  return handleSignOut(await authRequestContext());
}
