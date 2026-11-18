import { z } from "zod";
import { checkout, pushPublicKey } from "@/composition/checkout";

export const runtime = "nodejs";

const schema = z.object({
  code: z.string().trim().max(12),
  token: z.string().uuid().nullable(),
  subscription: z.object({
    endpoint: z.string().url().max(1000),
    keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(100) }),
  }),
});

export async function POST(request: Request) {
  if (!pushPublicKey()) return Response.json({ error: "disabled" }, { status: 503 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid" }, { status: 400 });
  const { code, token, subscription } = parsed.data;
  const outcome = await checkout().subscribeToOrder(code, token, subscription);
  if (outcome === "not_found") return Response.json({ error: outcome }, { status: 404 });
  if (outcome === "invalid") return Response.json({ error: outcome }, { status: 400 });
  return Response.json({ ok: true }, { status: 201 });
}
