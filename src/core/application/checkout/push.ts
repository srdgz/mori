import { actorFor, canViewOrder, GUEST } from "@/core/domain/access/actor";
import type { Locale } from "@/core/domain/shared/locale";
import type { OrderRepository, OrderView } from "../ports/checkout";
import type { Identity } from "../ports/identity";
import type { PushMessage, PushSender, PushSubscriptionData, PushSubscriptionRepository } from "../ports/push";

export type PushDeps = { subscriptions: PushSubscriptionRepository; sender: PushSender };

export type PushKind = "order_ready" | "order_out_for_delivery";

const COPY: Record<Locale, Record<PushKind, { title: string; body: string }>> = {
  es: {
    order_ready: { title: "¡Tu pedido está listo!", body: "Pásate a recoger el pedido {code}. Te esperamos." },
    order_out_for_delivery: { title: "Tu pedido va de camino", body: "El pedido {code} ya ha salido. Llega en unos minutos." },
  },
  en: {
    order_ready: { title: "Your order is ready!", body: "Come and collect order {code}. We're waiting for you." },
    order_out_for_delivery: {
      title: "Your order is on its way",
      body: "Order {code} has left the shop. It'll be with you in a few minutes.",
    },
  },
};

export function pushMessage(kind: PushKind, order: Pick<OrderView, "code" | "locale">, url: string): PushMessage {
  const copy = COPY[order.locale][kind];
  return { title: copy.title, body: copy.body.replace("{code}", order.code), url, tag: `${order.code}-${kind}` };
}

export async function notifyOrder(deps: PushDeps, orderId: string, message: PushMessage): Promise<number> {
  let sent = 0;
  for (const subscription of await deps.subscriptions.forOrder(orderId)) {
    try {
      const outcome = await deps.sender.send(subscription, message);
      if (outcome === "gone") await deps.subscriptions.remove(subscription.endpoint);
      else sent += 1;
    } catch {
      continue;
    }
  }
  return sent;
}

const HTTPS = /^https:\/\//;

export function makeSubscribeToOrder(deps: { orders: OrderRepository; identity: Identity; subscriptions: PushSubscriptionRepository }) {
  return async (
    code: string,
    token: string | null,
    subscription: PushSubscriptionData,
  ): Promise<"subscribed" | "not_found" | "invalid"> => {
    if (!HTTPS.test(subscription.endpoint) || !subscription.keys.p256dh || !subscription.keys.auth) return "invalid";
    const order = await deps.orders.byCode(code.toUpperCase());
    const user = await deps.identity.currentUser();
    if (!order || !canViewOrder(user ? actorFor(user) : GUEST, order, token ?? undefined)) return "not_found";
    await deps.subscriptions.add(order.id, subscription);
    return "subscribed";
  };
}
