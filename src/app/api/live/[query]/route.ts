import { z } from "zod";
import { admin, checkout } from "@/composition/checkout";
import { isLocalDate } from "@/core/domain/shared/zoned-time";

export const runtime = "nodejs";

const orderInput = z.object({ code: z.string().trim().max(12), token: z.string().uuid().nullable() });
const boardInput = z.object({ day: z.string().refine(isLocalDate) });

type Context = { params: Promise<{ query: string }> };

export async function POST(request: Request, { params }: Context) {
  const { query } = await params;
  const headers = { "Cache-Control": "no-store" };
  const body: unknown = await request.json().catch(() => null);
  if (query === "board") {
    const board = boardInput.safeParse(body);
    if (!board.success) return Response.json({ error: "invalid_input" }, { status: 400, headers });
    const sealedBoard = await admin().sealBoardQuery(board.data.day as `${number}-${number}-${number}`);
    if (!sealedBoard) return Response.json({ error: "not_available" }, { status: 404, headers });
    return Response.json(sealedBoard, { headers });
  }
  if (query !== "order") return Response.json({ error: "unknown_query" }, { status: 404, headers });
  const input = orderInput.safeParse(body);
  if (!input.success) return Response.json({ error: "invalid_input" }, { status: 400, headers });
  const sealed = await checkout().sealOrderQuery(input.data.code, input.data.token);
  if (!sealed) return Response.json({ error: "not_available" }, { status: 404, headers });
  return Response.json(sealed, { headers });
}
