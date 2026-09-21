import { handleDeleteProjectImage } from "@/presentation/http/asset-endpoints";
import { assetRequestContext } from "@/presentation/next/asset-request-context";

type RouteParams = { params: Promise<{ assetId: string }> };

export async function DELETE(
  _request: Request,
  { params }: RouteParams,
): Promise<Response> {
  const { assetId } = await params;

  return handleDeleteProjectImage(assetId, await assetRequestContext());
}
