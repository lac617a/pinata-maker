import {
  handleDeleteProject,
  handleGetProject,
  handleRenameProject,
} from "../../../../src/presentation/http/project-endpoints";
import { projectRequestContext } from "../../../../src/presentation/next/project-request-context";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(
  _request: Request,
  { params }: RouteParams,
): Promise<Response> {
  const { id } = await params;

  return handleGetProject(id, await projectRequestContext());
}

export async function PATCH(
  request: Request,
  { params }: RouteParams,
): Promise<Response> {
  const { id } = await params;

  return handleRenameProject(request, id, await projectRequestContext());
}

export async function DELETE(
  _request: Request,
  { params }: RouteParams,
): Promise<Response> {
  const { id } = await params;

  return handleDeleteProject(id, await projectRequestContext());
}
