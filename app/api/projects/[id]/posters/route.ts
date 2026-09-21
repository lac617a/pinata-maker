import { handleExportPoster } from "@/presentation/http/poster-endpoints";
import { exportRequestContext } from "@/presentation/next/export-request-context";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(
  request: Request,
  { params }: RouteParams,
): Promise<Response> {
  const { id } = await params;

  return handleExportPoster(request, id, await exportRequestContext());
}
