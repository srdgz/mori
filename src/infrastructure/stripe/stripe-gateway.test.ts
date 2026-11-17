import Stripe from "stripe";
import { describe, expect, it } from "vitest";
import { StripePaymentGateway } from "./stripe-gateway";

const secret = "whsec_test_secret";
const stripe = new Stripe("sk_test_unused");

function signed(type: string, id = "pi_123") {
  const payload = JSON.stringify({ id: "evt_1", object: "event", type, data: { object: { id, object: "payment_intent" } } });
  return { payload, signature: stripe.webhooks.generateTestHeaderString({ payload, secret }) };
}

describe("StripePaymentGateway.parseWebhook", () => {
  const gateway = new StripePaymentGateway(stripe, secret);

  it("reads a successful payment", () => {
    const { payload, signature } = signed("payment_intent.succeeded");
    expect(gateway.parseWebhook(payload, signature)).toEqual({ type: "succeeded", paymentIntentId: "pi_123" });
  });

  it("reads a failed payment and ignores other events", () => {
    const failed = signed("payment_intent.payment_failed");
    expect(gateway.parseWebhook(failed.payload, failed.signature)).toEqual({ type: "failed", paymentIntentId: "pi_123" });
    const other = signed("charge.refunded");
    expect(gateway.parseWebhook(other.payload, other.signature)).toEqual({ type: "ignored", paymentIntentId: null });
  });

  it("rejects a forged or unsigned event", () => {
    const { payload } = signed("payment_intent.succeeded");
    expect(() => gateway.parseWebhook(payload, "t=1,v1=forged")).toThrow();
    expect(() => new StripePaymentGateway(stripe, null).parseWebhook(payload, "x")).toThrow("STRIPE_WEBHOOK_SECRET");
  });
});
