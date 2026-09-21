import {
  handleExportTemplateVersion,
  handleListProjectExports,
} from "../../../../../src/presentation/http/export-endpoints";
import { exportRequestContext } from "../../../../../src/presentation/next/export-request-context";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(
  _request: Request,
  { params }: RouteParams,
): Promise<Response> {
  const { id } = await params;

  return handleListProjectExports(id, await exportRequestContext());
}

export async function POST(
  request: Request,
  { params }: RouteParams,
): Promise<Response> {
  const { id } = await params;

  return handleExportTemplateVersion(request, id, await exportRequestContext());
}
