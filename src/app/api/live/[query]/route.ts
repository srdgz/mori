import { z } from "zod";
import { checkout } from "@/composition/checkout";

export const runtime = "nodejs";

const orderInput = z.object({ code: z.string().trim().max(12), token: z.string().uuid().nullable() });

type Context = { params: Promise<{ query: string }> };

export async function POST(request: Request, { params }: Context) {
  const { query } = await params;
  const headers = { "Cache-Control": "no-store" };
  if (query !== "order") return Response.json({ error: "unknown_query" }, { status: 404, headers });
  const input = orderInput.safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ error: "invalid_input" }, { status: 400, headers });
  const sealed = await checkout().sealOrderQuery(input.data.code, input.data.token);
  if (!sealed) return Response.json({ error: "not_available" }, { status: 404, headers });
  return Response.json(sealed, { headers });
}
