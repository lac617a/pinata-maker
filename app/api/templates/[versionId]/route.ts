import { handleGetTemplateVersion } from "../../../../src/presentation/http/template-endpoints";
import { templateRequestContext } from "../../../../src/presentation/next/template-request-context";

type RouteParams = { params: Promise<{ versionId: string }> };

export async function GET(
  _request: Request,
  { params }: RouteParams,
): Promise<Response> {
  const { versionId } = await params;

  return handleGetTemplateVersion(versionId, await templateRequestContext());
}
