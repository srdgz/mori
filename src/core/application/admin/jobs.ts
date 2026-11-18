import { priceCart } from "@/core/domain/cart/cart";
import { localMoment, openStatus } from "@/core/domain/fulfilment/opening-hours";
import { firstAvailable } from "@/core/domain/fulfilment/pickup-slots";
import { checkoutTotals, pickupCode } from "@/core/domain/ordering/checkout";
import { demoLines, demoStep } from "@/core/domain/ordering/demo";
import { ZERO } from "@/core/domain/shared/money";
import { addDays, localDate, zonedInstant } from "@/core/domain/shared/zoned-time";
import { loadDays, snapshot } from "../checkout/checkout";
import type { CatalogRepository } from "../ports/catalog-repository";
import type { DeliveryAddress, OrderRepository, Random, SettingsRepository } from "../ports/checkout";
import type { Clock } from "../ports/clock";

export const DEMO_ACTIVE_LIMIT = 3;

export const DEMO_CONTACT = { name: "Cliente de ejemplo", email: "pedidos@demo.mori", phone: "+34 600 000 000" } as const;

export function makeExpireOrders(orders: OrderRepository) {
  return (): Promise<number> => orders.expireUnpaid();
}

type DemoDeps = { orders: OrderRepository; catalog: CatalogRepository; settings: SettingsRepository; clock: Clock; random: Random };

export function makeRunDemoOrders(deps: DemoDeps) {
  return async (): Promise<Readonly<{ advanced: number; created: string | null }>> => {
    const now = deps.clock.now();
    const shop = await deps.settings.load();
    const today = localDate(now, shop.timeZone);
    const cards = (
      await deps.orders.board(zonedInstant(today, 0, shop.timeZone), zonedInstant(addDays(today, 1), 0, shop.timeZone))
    ).filter((card) => card.isDemo);

    let advanced = 0;
    for (const card of cards) {
      const order = await deps.orders.byCode(card.code);
      const last = order?.events.at(-1);
      if (!order || !last) continue;
      const next = demoStep(order.status, order.fulfilment, (now.getTime() - last.at.getTime()) / 60_000);
      if (next && (await deps.orders.advance(order.id, next, null)) === "advanced") advanced += 1;
    }

    const active = cards.filter((card) => card.status !== "completed" && card.status !== "cancelled" && card.status !== "refunded").length;
    const open = openStatus(shop.schedule, localMoment(now, shop.timeZone)).state === "open";
    if (!open || shop.ordersPaused || active >= DEMO_ACTIVE_LIMIT) return { advanced, created: null };

    const menu = await deps.catalog.all();
    const priced = priceCart(
      demoLines(menu, () => deps.random.next()),
      menu,
    );
    if (priced.lines.length === 0) return { advanced, created: null };

    const delivery = shop.delivery.enabled && shop.delivery.zones.length > 0 && deps.random.next() < 0.3;
    const slot = delivery ? null : firstAvailable(await loadDays(shop, deps.orders, now));
    if (!delivery && !slot) return { advanced, created: null };
    const address: DeliveryAddress | null = delivery
      ? { line1: "C/ del Pez 12", line2: null, postalCode: shop.delivery.zones[0]!, city: "Madrid", instructions: null }
      : null;
    const deliveryFee = delivery && priced.subtotal.cents < shop.delivery.freeFrom.cents ? shop.delivery.fee : ZERO;
    const totals = checkoutTotals({ subtotal: priced.subtotal, discount: ZERO, deliveryFee, vatRateBasisPoints: shop.vatRateBasisPoints });

    for (let attempt = 0; attempt < 5; attempt++) {
      const code = pickupCode(() => deps.random.next());
      const created = await deps.orders.create({
        code,
        customerId: null,
        contact: DEMO_CONTACT,
        locale: "es",
        fulfilment: delivery ? "delivery" : "pickup",
        slotStart: slot?.start ?? null,
        deliveryAddress: address,
        notes: null,
        subtotal: totals.subtotal,
        discount: totals.discount,
        deliveryFee: totals.deliveryFee,
        total: totals.total,
        vat: totals.vat,
        couponId: null,
        lines: snapshot(priced),
        isDemo: true,
      });
      if (created === "code_taken") continue;
      if (created === "slot_full") return { advanced, created: null };
      await deps.orders.attachPayment(created.id, `demo_${code}`);
      await deps.orders.confirmPayment(`demo_${code}`);
      return { advanced, created: code };
    }
    return { advanced, created: null };
  };
}
