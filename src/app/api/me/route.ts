import { getIdentity } from "@/composition/auth";

export async function GET() {
  const avatar = await getIdentity().avatar();
  return Response.json(avatar, { headers: { "Cache-Control": "private, no-store" } });
}
