import { handleDeleteAccount } from "@/presentation/http/account-endpoints";
import { accountRequestContext } from "@/presentation/next/export-request-context";

/** Deletes the signed-in account. See docs/legal.md §6. */
export async function DELETE(request: Request): Promise<Response> {
  return handleDeleteAccount(request, await accountRequestContext());
}
