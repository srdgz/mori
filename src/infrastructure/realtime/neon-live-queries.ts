import { createRealtime } from "@neon/realtime/server";
import { drizzleAdapter } from "@neon/realtime-drizzle";
import { and, eq, gte, isNull, lt, or } from "drizzle-orm";
import type { LiveQuerySealer, SealedQuery } from "@/core/application/ports/live";
import type { Database } from "../db/database";
import { orderEvents, orders } from "../db/schema";

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

  sealBoard(from: Date, to: Date): Promise<SealedQuery> {
    const query = this.db
      .select({ id: orders.id, status: orders.status })
      .from(orders)
      .where(
        or(
          and(gte(orders.slotStart, from), lt(orders.slotStart, to)),
          and(isNull(orders.slotStart), gte(orders.createdAt, from), lt(orders.createdAt, to)),
        ),
      );
    return this.realtime.seal({ query });
  }
}
