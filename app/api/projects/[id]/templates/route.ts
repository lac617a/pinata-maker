import {
  handleListTemplateVersions,
  handlePublishTemplateVersion,
} from "@/presentation/http/template-endpoints";
import { templateRequestContext } from "@/presentation/next/template-request-context";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(
  _request: Request,
  { params }: RouteParams,
): Promise<Response> {
  const { id } = await params;

  return handleListTemplateVersions(id, await templateRequestContext());
}

export async function POST(
  request: Request,
  { params }: RouteParams,
): Promise<Response> {
  const { id } = await params;

  return handlePublishTemplateVersion(
    request,
    id,
    await templateRequestContext(),
  );
}
