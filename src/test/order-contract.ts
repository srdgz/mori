import { describe, expect, it } from "vitest";
import type { LoyaltyRepository, NewOrder, OrderRepository } from "@/core/application/ports/checkout";
import type { UserId } from "@/core/domain/access/actor";
import { money } from "@/core/domain/shared/money";

export type OrderSetup = {
  orders: OrderRepository;
  loyalty: LoyaltyRepository;
  customerId: UserId;
  setCapacity(capacity: number): Promise<void>;
};

const slot = new Date("2030-01-07T10:00:00Z");
let sequence = 0;

export function newOrder(overrides: Partial<NewOrder> = {}): NewOrder {
  sequence += 1;
  return {
    code: `MR-T${String(sequence).padStart(3, "0")}`,
    customerId: null,
    contact: { name: "Ana", email: "ana@example.com", phone: "600000000" },
    locale: "es",
    fulfilment: "pickup",
    slotStart: slot,
    deliveryAddress: null,
    notes: null,
    subtotal: money(1680),
    discount: money(0),
    deliveryFee: money(0),
    total: money(1680),
    vat: money(153),
    couponId: null,
    lines: [
      {
        productId: "10000000-0000-4000-8000-000000000001",
        productName: "Classic Matcha",
        options: [{ group: "size", code: "large", name: { es: "Grande", en: "Large" }, priceDeltaCents: 90 }],
        unitPrice: money(580),
        quantity: 2,
        total: money(1160),
      },
      {
        productId: "10000000-0000-4000-8000-000000000003",
        productName: "Vanilla Matcha",
        options: [],
        unitPrice: money(520),
        quantity: 1,
        total: money(520),
      },
    ],
    ...overrides,
  };
}

export function orderRepositoryContract(name: string, setup: () => Promise<OrderSetup>) {
  describe(`${name} (OrderRepository contract)`, () => {
    it("stores an order and reads it back by code", async () => {
      const { orders } = await setup();
      const input = newOrder();
      const created = await orders.create(input);
      if (typeof created === "string") throw new Error(created);
      const view = await orders.byCode(input.code);
      expect(view).toMatchObject({
        id: created.id,
        code: input.code,
        status: "pending_payment",
        trackingToken: created.trackingToken,
        contactEmail: "ana@example.com",
        fulfilment: "pickup",
        slotStart: slot,
        total: money(1680),
        vat: money(153),
      });
      expect(view?.lines).toEqual(input.lines);
      expect(await orders.byId(created.id)).toEqual(view);
      expect(await orders.byCode("MR-NONE")).toBeNull();
    });

    it("keeps a delivery address", async () => {
      const { orders } = await setup();
      const address = { line1: "C/ del Pez 12", line2: "2º B", postalCode: "28004", city: "Madrid", instructions: null };
      const input = newOrder({ fulfilment: "delivery", slotStart: null, deliveryAddress: address });
      await orders.create(input);
      expect((await orders.byCode(input.code))?.deliveryAddress).toEqual(address);
    });

    it("refuses a repeated code and a full slot", async () => {
      const { orders, setCapacity } = await setup();
      const first = newOrder({ slotStart: new Date("2030-01-07T11:00:00Z") });
      await orders.create(first);
      expect(
        await orders.create({
          ...newOrder({
            slotStart: null,
            fulfilment: "delivery",
            deliveryAddress: { line1: "x", line2: null, postalCode: "28004", city: "Madrid", instructions: null },
          }),
          code: first.code,
        }),
      ).toBe("code_taken");
      await setCapacity(1);
      expect(await orders.create(newOrder({ slotStart: new Date("2030-01-07T11:00:00Z") }))).toBe("slot_full");
      await setCapacity(8);
    });

    it("counts the load of each slot in a range", async () => {
      const { orders } = await setup();
      const start = new Date("2030-01-08T09:00:00Z");
      await orders.create(newOrder({ slotStart: start }));
      await orders.create(newOrder({ slotStart: start }));
      const load = await orders.slotLoad(new Date("2030-01-08T00:00:00Z"), new Date("2030-01-09T00:00:00Z"));
      expect(load.get(start.getTime())).toBe(2);
    });

    it("confirms a payment once and counts paid orders", async () => {
      const { orders, customerId } = await setup();
      const input = newOrder({ customerId, contact: { name: "Eva", email: "eva@example.com", phone: "600000000" } });
      const created = await orders.create(input);
      if (typeof created === "string") throw new Error(created);
      expect(await orders.paidOrderCount("eva@example.com", null)).toBe(0);

      await orders.attachPayment(created.id, `pi_${input.code}`);
      expect(await orders.confirmPayment(`pi_${input.code}`)).toEqual({ orderId: created.id, confirmedNow: true });
      expect(await orders.confirmPayment(`pi_${input.code}`)).toEqual({ orderId: created.id, confirmedNow: false });
      expect(await orders.confirmPayment("pi_unknown")).toBeNull();

      expect((await orders.byId(created.id))?.status).toBe("received");
      expect(await orders.paidOrderCount("eva@example.com", null)).toBe(1);
      expect(await orders.paidOrderCount("other@example.com", customerId)).toBe(1);
    });

    it("confirms a free order without a payment, redeeming the stamps once and no stamp for the free drink", async () => {
      const { orders, loyalty, customerId } = await setup();
      const start = await loyalty.balance(customerId);
      const paid = await orders.create(newOrder({ customerId }));
      if (typeof paid === "string") throw new Error(paid);
      expect(await orders.confirmFree(paid.id)).toBe(false);

      const free = await orders.create(newOrder({ customerId, discount: money(1680), total: money(0), vat: money(0), stampsRedeemed: 8 }));
      if (typeof free === "string") throw new Error(free);
      expect(await orders.confirmFree(free.id)).toBe(true);
      expect(await orders.confirmFree(free.id)).toBe(false);
      expect(await orders.confirmFree("00000000-0000-4000-8000-000000000000")).toBe(false);
      expect((await orders.byId(free.id))?.status).toBe("received");
      expect((await orders.byId(paid.id))?.status).toBe("pending_payment");
      expect(await loyalty.balance(customerId)).toBe(start - 8 + 2);
    });

    it("records each step, advances only along the flow and lists a customer's orders", async () => {
      const { orders, customerId } = await setup();
      const input = newOrder({ customerId, contact: { name: "Noa", email: "noa@example.com", phone: "600000000" } });
      const created = await orders.create(input);
      if (typeof created === "string") throw new Error(created);
      await orders.attachPayment(created.id, `pi_${input.code}`);
      await orders.confirmPayment(`pi_${input.code}`);

      expect(await orders.advance(created.id, "ready", null)).toBe("invalid_transition");
      expect(await orders.advance(created.id, "preparing", null)).toBe("advanced");
      expect(await orders.advance("00000000-0000-4000-8000-000000000000", "preparing", null)).toBe("not_found");
      const view = await orders.byId(created.id);
      expect(view?.status).toBe("preparing");
      expect(view?.events.map((e) => e.status)).toEqual(["pending_payment", "received", "preparing"]);
      expect(view?.events.every((e) => e.at instanceof Date)).toBe(true);

      const unpaid = newOrder({ customerId });
      await orders.create(unpaid);
      const listed = await orders.listByCustomer(customerId, 10, null);
      const mine = listed.find((o) => o.code === input.code);
      expect(mine).toMatchObject({ status: "preparing", fulfilment: "pickup", items: 3, total: money(1680) });
      expect(listed.some((o) => o.code === unpaid.code)).toBe(false);
      expect(await orders.listByCustomer(customerId, 10, new Date(0))).toEqual([]);
    });

    it("links a guest order to a customer only once", async () => {
      const { orders, customerId } = await setup();
      const input = newOrder();
      const created = await orders.create(input);
      if (typeof created === "string") throw new Error(created);
      expect(await orders.assignCustomer(created.id, customerId)).toBe(true);
      expect((await orders.byId(created.id))?.customerId).toBe(customerId);
      expect(await orders.assignCustomer(created.id, customerId)).toBe(false);
    });

    it("lists a day's paid orders for the board and records refunds", async () => {
      const { orders } = await setup();
      const day = new Date("2031-03-03T00:00:00Z");
      const paid = newOrder({ slotStart: new Date("2031-03-03T10:00:00Z"), notes: "sin hielo", isDemo: true });
      const unpaid = newOrder({ slotStart: new Date("2031-03-03T09:00:00Z") });
      const tomorrow = newOrder({ slotStart: new Date("2031-03-04T10:00:00Z") });
      for (const input of [paid, unpaid, tomorrow]) await orders.create(input);
      for (const input of [paid, tomorrow]) {
        const view = await orders.byCode(input.code);
        await orders.attachPayment(view!.id, `pi_${input.code}`);
        await orders.confirmPayment(`pi_${input.code}`);
      }

      const board = await orders.board(day, new Date("2031-03-04T00:00:00Z"));
      expect(board.map((c) => c.code)).toEqual([paid.code]);
      expect(board[0]).toMatchObject({
        status: "received",
        fulfilment: "pickup",
        isDemo: true,
        notes: "sin hielo",
        postalCode: null,
        total: money(1680),
        lines: [
          { name: "Classic Matcha", quantity: 2 },
          { name: "Vanilla Matcha", quantity: 1 },
        ],
      });
      expect(await orders.board(new Date("2031-03-05T00:00:00Z"), new Date("2031-03-06T00:00:00Z"))).toEqual([]);

      const view = await orders.byCode(paid.code);
      expect(view).toMatchObject({ isDemo: true, notes: "sin hielo", contactPhone: "600000000", paymentIntentId: `pi_${paid.code}` });
      await orders.recordRefund(view!.id, money(500));
      await orders.recordRefund(view!.id, money(180));
      expect((await orders.byId(view!.id))?.refunded).toEqual(money(680));
    });

    it("earns a stamp per paid drink, spends redeemed stamps and gives them back on cancellation", async () => {
      const { orders, loyalty, customerId } = await setup();
      const start = await loyalty.balance(customerId);
      const pay = async (overrides: Parameters<typeof newOrder>[0]) => {
        const input = newOrder({ customerId, slotStart: new Date("2031-05-05T10:00:00Z"), ...overrides });
        const created = await orders.create(input);
        if (typeof created === "string") throw new Error(created);
        await orders.attachPayment(created.id, `pi_${input.code}`);
        await orders.confirmPayment(`pi_${input.code}`);
        await orders.confirmPayment(`pi_${input.code}`);
        return created.id;
      };

      await pay({});
      expect(await loyalty.balance(customerId)).toBe(start + 3);
      const unpaid = newOrder({ customerId, slotStart: new Date("2031-05-05T10:15:00Z") });
      await orders.create(unpaid);
      expect(await loyalty.balance(customerId)).toBe(start + 3);

      const redeemed = await pay({ stampsRedeemed: 2 });
      expect(await loyalty.balance(customerId)).toBe(start + 3);
      expect(await orders.advance(redeemed, "cancelled", null)).toBe("advanced");
      expect(await loyalty.balance(customerId)).toBe(start + 3);

      const guest = newOrder({ slotStart: new Date("2031-05-05T10:30:00Z") });
      const created = await orders.create(guest);
      if (typeof created === "string") throw new Error(created);
      await orders.attachPayment(created.id, `pi_${guest.code}`);
      await orders.confirmPayment(`pi_${guest.code}`);
      expect(await loyalty.balance(customerId)).toBe(start + 3);
      expect(await loyalty.balance("00000000-0000-4000-8000-00000000abcd" as UserId)).toBe(0);
    });
  });
}
