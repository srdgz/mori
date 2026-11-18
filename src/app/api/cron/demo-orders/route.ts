import { cronAuthorized, jobs } from "@/composition/checkout";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authorized = cronAuthorized(request);
  if (authorized === null) return Response.json({ error: "not_configured" }, { status: 503 });
  if (!authorized) return Response.json({ error: "unauthorized" }, { status: 401 });
  const result = await jobs().runDemoOrders();
  return Response.json(result);
}
