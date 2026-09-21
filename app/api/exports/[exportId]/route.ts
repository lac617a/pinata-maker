import {
  handleDeleteExport,
  handleDownloadExport,
} from "@/presentation/http/export-endpoints";
import { exportRequestContext } from "@/presentation/next/export-request-context";

type RouteParams = { params: Promise<{ exportId: string }> };

export async function GET(
  _request: Request,
  { params }: RouteParams,
): Promise<Response> {
  const { exportId } = await params;

  return handleDownloadExport(exportId, await exportRequestContext());
}

export async function DELETE(
  _request: Request,
  { params }: RouteParams,
): Promise<Response> {
  const { exportId } = await params;

  return handleDeleteExport(exportId, await exportRequestContext());
}
