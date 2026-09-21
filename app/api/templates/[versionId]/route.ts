import { handleGetTemplateVersion } from "@/presentation/http/template-endpoints";
import { templateRequestContext } from "@/presentation/next/template-request-context";

type RouteParams = { params: Promise<{ versionId: string }> };

export async function GET(
  _request: Request,
  { params }: RouteParams,
): Promise<Response> {
  const { versionId } = await params;

  return handleGetTemplateVersion(versionId, await templateRequestContext());
}
