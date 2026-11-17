import { createRealtime } from "@neon/realtime/server";
import { drizzleAdapter } from "@neon/realtime-drizzle";
import { eq } from "drizzle-orm";
import type { LiveQuerySealer, SealedQuery } from "@/core/application/ports/live";
import type { Database } from "../db/database";
import { orderEvents } from "../db/schema";

export class NeonLiveQuerySealer implements LiveQuerySealer {
  private readonly realtime;

  constructor(
    private readonly db: Database,
    readonly url: string,
    options: { secret: string; database: string },
  ) {
    this.realtime = createRealtime({ secret: options.secret, db: options.database, adapter: drizzleAdapter() });
  }

  sealOrder(orderId: string): Promise<SealedQuery> {
    const query = this.db
      .select({ id: orderEvents.id, status: orderEvents.status })
      .from(orderEvents)
      .where(eq(orderEvents.orderId, orderId));
    return this.realtime.seal({ query });
  }
}
