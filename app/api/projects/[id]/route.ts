import { handleDeleteProject } from "@/presentation/http/account-endpoints";
import {
  handleGetProject,
  handleRenameProject,
} from "@/presentation/http/project-endpoints";
import { exportRequestContext } from "@/presentation/next/export-request-context";
import { projectRequestContext } from "@/presentation/next/project-request-context";

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

  // With files: the export context carries the buckets (docs/legal.md §6).
  return handleDeleteProject(id, await exportRequestContext());
}
