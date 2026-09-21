import {
  handleListProjectImages,
  handleUploadProjectImage,
} from "../../../../../src/presentation/http/asset-endpoints";
import { assetRequestContext } from "../../../../../src/presentation/next/asset-request-context";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(
  _request: Request,
  { params }: RouteParams,
): Promise<Response> {
  const { id } = await params;

  return handleListProjectImages(id, await assetRequestContext());
}

export async function POST(
  request: Request,
  { params }: RouteParams,
): Promise<Response> {
  const { id } = await params;

  return handleUploadProjectImage(request, id, await assetRequestContext());
}
