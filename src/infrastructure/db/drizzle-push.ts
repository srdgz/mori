import { eq } from "drizzle-orm";
import type { PushSubscriptionData, PushSubscriptionRepository } from "@/core/application/ports/push";
import type { Database } from "./database";
import { pushSubscriptions } from "./schema";

export class DrizzlePushSubscriptions implements PushSubscriptionRepository {
  constructor(private readonly db: Database) {}

  async add(orderId: string, subscription: PushSubscriptionData): Promise<void> {
    await this.db
      .insert(pushSubscriptions)
      .values({ orderId, endpoint: subscription.endpoint, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth })
      .onConflictDoUpdate({
        target: [pushSubscriptions.orderId, pushSubscriptions.endpoint],
        set: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
      });
  }

  async forOrder(orderId: string): Promise<PushSubscriptionData[]> {
    const rows = await this.db.select().from(pushSubscriptions).where(eq(pushSubscriptions.orderId, orderId));
    return rows.map((r) => ({ endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } }));
  }

  async remove(endpoint: string): Promise<void> {
    await this.db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
  }
}
