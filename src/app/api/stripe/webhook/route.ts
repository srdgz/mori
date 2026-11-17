import { checkout } from "@/composition/checkout";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });
  const body = await request.text();
  try {
    const result = await checkout().confirmPayment(body, signature);
    return Response.json({ received: true, result });
  } catch (error) {
    console.error("Stripe webhook rejected", error);
    return new Response("Invalid webhook", { status: 400 });
  }
}
