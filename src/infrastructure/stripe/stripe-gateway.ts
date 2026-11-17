import Stripe from "stripe";
import type { PaymentEvent, PaymentGateway, PaymentIntent } from "@/core/application/ports/checkout";
import type { Money } from "@/core/domain/shared/money";

export class StripePaymentGateway implements PaymentGateway {
  constructor(
    private readonly stripe: Stripe,
    private readonly webhookSecret: string | null,
  ) {}

  async createIntent(input: { orderId: string; code: string; amount: Money; email: string }): Promise<PaymentIntent> {
    const intent = await this.stripe.paymentIntents.create(
      {
        amount: input.amount.cents,
        currency: "eur",
        automatic_payment_methods: { enabled: true },
        receipt_email: input.email,
        description: `MŌRI · ${input.code}`,
        metadata: { orderId: input.orderId, code: input.code },
      },
      { idempotencyKey: `order-${input.orderId}` },
    );
    if (!intent.client_secret) throw new Error("Stripe did not return a client secret");
    return { id: intent.id, clientSecret: intent.client_secret };
  }

  parseWebhook(rawBody: string, signature: string): PaymentEvent {
    if (!this.webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
    const event = this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
    if (event.type === "payment_intent.succeeded") return { type: "succeeded", paymentIntentId: event.data.object.id };
    if (event.type === "payment_intent.payment_failed") return { type: "failed", paymentIntentId: event.data.object.id };
    return { type: "ignored", paymentIntentId: null };
  }
}
