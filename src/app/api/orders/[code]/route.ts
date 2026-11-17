import { checkout } from "@/composition/checkout";
import { trackingSnapshot } from "@/core/application/checkout/tracking";

export const runtime = "nodejs";

type Context = { params: Promise<{ code: string }> };

export async function GET(request: Request, { params }: Context) {
  const { code } = await params;
  const token = new URL(request.url).searchParams.get("t");
  const tracking = await checkout().trackOrder(code, token);
  if (!tracking) return Response.json({ error: "not_found" }, { status: 404, headers: { "Cache-Control": "no-store" } });

  const etag = `W/"${tracking.version}"`;
  const headers = { ETag: etag, "Cache-Control": "private, no-cache" };
  if (request.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers });

  return Response.json(trackingSnapshot(tracking), { headers });
}
