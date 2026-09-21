import {
  type AccountServices,
  deleteAccount,
  deleteProjectWithFiles,
  type ProjectFilesServices,
} from "@/application/delete-account";
import { AccountDeletionNotConfirmedError } from "@/modules/accounts/errors";
import type { ProjectId, UserId } from "@/modules/projects/project";

import { toErrorResponse, unauthorizedResponse } from "./error-response";
import { readJsonBody } from "./export-endpoints";

export type ProjectFilesRequestContext = {
  readonly services: ProjectFilesServices;
  readonly userId: UserId | null;
};

export type AccountRequestContext = {
  readonly services: AccountServices;
  readonly userId: UserId | null;
};

/**
 * Deletes a project with its images and PDFs (docs/legal.md §6). A foreign
 * project answers 404, as everywhere.
 */
export async function handleDeleteProject(
  id: ProjectId,
  context: ProjectFilesRequestContext,
): Promise<Response> {
  if (!context.userId) {
    return unauthorizedResponse();
  }

  try {
    await deleteProjectWithFiles(context.services, id, context.userId);

    return new Response(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/**
 * Deletes the signed-in account with everything it holds.
 *
 * The body has to say `{ "confirm": true }`: a request that merely reaches
 * the route, without the person having confirmed it on screen, deletes
 * nothing.
 */
export async function handleDeleteAccount(
  request: Request,
  context: AccountRequestContext,
): Promise<Response> {
  if (!context.userId) {
    return unauthorizedResponse();
  }

  try {
    const body = await readJsonBody(request);

    if (body.confirm !== true) {
      throw new AccountDeletionNotConfirmedError(
        "Deleting an account needs { confirm: true }.",
      );
    }

    await deleteAccount(context.services, context.userId);

    return new Response(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
