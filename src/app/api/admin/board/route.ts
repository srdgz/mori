import { admin } from "@/composition/checkout";
import { boardTag } from "@/core/application/admin/orders";
import { isLocalDate } from "@/core/domain/shared/zoned-time";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const day = new URL(request.url).searchParams.get("day");
  const board = await admin().getBoard(day && isLocalDate(day) ? day : null);
  if (!board) return Response.json({ error: "forbidden" }, { status: 403, headers: { "Cache-Control": "no-store" } });
  const etag = `W/"${boardTag(board.day, board.version)}"`;
  const headers = { ETag: etag, "Cache-Control": "private, no-cache" };
  if (request.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers });
  return Response.json({ day: board.day, version: board.version }, { headers });
}
