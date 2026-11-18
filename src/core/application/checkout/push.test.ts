import { beforeEach, describe, expect, it } from "vitest";
import { MemoryOrderRepository } from "@/infrastructure/memory/memory-checkout";
import { MemoryIdentity } from "@/infrastructure/memory/memory-identity";
import { MemoryMailer } from "@/infrastructure/memory/memory-mailer";
import { MemoryPushSender, MemoryPushSubscriptions } from "@/infrastructure/memory/memory-push";
import { newOrder } from "@/test/order-contract";
import { makeSubscribeToOrder, pushMessage } from "./push";
import { makeAdvanceOrderStatus } from "./tracking";

const sub = (endpoint: string) => ({ endpoint, keys: { p256dh: "p256", auth: "auth" } });

let orders: MemoryOrderRepository;
let identity: MemoryIdentity;
let subscriptions: MemoryPushSubscriptions;

beforeEach(() => {
  orders = new MemoryOrderRepository(50);
  identity = new MemoryIdentity();
  subscriptions = new MemoryPushSubscriptions();
});

async function paid() {
  const input = newOrder({ locale: "en" });
  const created = await orders.create(input);
  if (typeof created === "string") throw new Error(created);
  await orders.attachPayment(created.id, `pi_${input.code}`);
  await orders.confirmPayment(`pi_${input.code}`);
  return { ...created, code: input.code };
}

describe("SubscribeToOrder", () => {
  it("subscribes a device with the order link, once", async () => {
    const order = await paid();
    const subscribe = makeSubscribeToOrder({ orders, identity, subscriptions });
    expect(await subscribe(order.code.toLowerCase(), order.trackingToken, sub("https://push.example/a"))).toBe("subscribed");
    expect(await subscribe(order.code, order.trackingToken, sub("https://push.example/a"))).toBe("subscribed");
    expect(subscriptions.rows).toHaveLength(1);
  });

  it("refuses unknown orders, wrong links and odd endpoints", async () => {
    const order = await paid();
    const subscribe = makeSubscribeToOrder({ orders, identity, subscriptions });
    expect(await subscribe(order.code, "nope", sub("https://push.example/a"))).toBe("not_found");
    expect(await subscribe("MR-NONE", order.trackingToken, sub("https://push.example/a"))).toBe("not_found");
    expect(await subscribe(order.code, order.trackingToken, sub("http://push.example/a"))).toBe("invalid");
    expect(await subscribe(order.code, order.trackingToken, { endpoint: "https://push.example/a", keys: { p256dh: "", auth: "x" } })).toBe(
      "invalid",
    );
    expect(subscriptions.rows).toEqual([]);
  });
});

describe("push when the order moves", () => {
  it("tells every subscribed device in the order's language and forgets dead ones", async () => {
    const order = await paid();
    await subscriptions.add(order.id, sub("https://push.example/phone"));
    await subscriptions.add(order.id, sub("https://push.example/old"));
    await subscriptions.add(order.id, sub("https://push.example/broken"));
    const sender = new MemoryPushSender(["https://push.example/old"]);
    identity.signInAs(identity.addUser({ email: "staff@example.com" }, "staff"));
    const advance = makeAdvanceOrderStatus({
      orders,
      identity,
      mailer: new MemoryMailer(),
      trackingUrl: (code, token) => `https://mori.test/en/order/${code}?t=${token}`,
      push: { subscriptions, sender },
    });
    await advance(order.code, "preparing");
    expect(sender.sent).toEqual([]);
    await advance(order.code, "ready");
    expect(sender.sent).toEqual([
      {
        endpoint: "https://push.example/phone",
        message: {
          title: "Your order is ready!",
          body: `Come and collect order ${order.code}. We're waiting for you.`,
          url: `https://mori.test/en/order/${order.code}?t=${order.trackingToken}`,
          tag: `${order.code}-order_ready`,
        },
      },
    ]);
    expect(subscriptions.rows.map((r) => r.subscription.endpoint)).toEqual(["https://push.example/phone", "https://push.example/broken"]);
  });

  it("writes the delivery message in Spanish", () => {
    expect(pushMessage("order_out_for_delivery", { code: "MR-ABCD", locale: "es" }, "/x")).toMatchObject({
      title: "Tu pedido va de camino",
      body: "El pedido MR-ABCD ya ha salido. Llega en unos minutos.",
    });
  });
});
