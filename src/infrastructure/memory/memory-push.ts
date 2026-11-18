import type { PushMessage, PushSender, PushSubscriptionData, PushSubscriptionRepository } from "@/core/application/ports/push";

export class MemoryPushSubscriptions implements PushSubscriptionRepository {
  readonly rows: { orderId: string; subscription: PushSubscriptionData }[] = [];

  async add(orderId: string, subscription: PushSubscriptionData): Promise<void> {
    if (this.rows.some((r) => r.orderId === orderId && r.subscription.endpoint === subscription.endpoint)) return;
    this.rows.push({ orderId, subscription });
  }

  async forOrder(orderId: string): Promise<PushSubscriptionData[]> {
    return this.rows.filter((r) => r.orderId === orderId).map((r) => r.subscription);
  }

  async remove(endpoint: string): Promise<void> {
    for (let i = this.rows.length - 1; i >= 0; i--) if (this.rows[i]!.subscription.endpoint === endpoint) this.rows.splice(i, 1);
  }
}

export class MemoryPushSender implements PushSender {
  readonly sent: { endpoint: string; message: PushMessage }[] = [];

  constructor(private readonly gone: readonly string[] = []) {}

  async send(subscription: PushSubscriptionData, message: PushMessage): Promise<"sent" | "gone"> {
    if (this.gone.includes(subscription.endpoint)) return "gone";
    if (subscription.endpoint.includes("broken")) throw new Error("push service down");
    this.sent.push({ endpoint: subscription.endpoint, message });
    return "sent";
  }
}
