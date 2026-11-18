import { beforeEach, describe, expect, it } from "vitest";
import { money } from "@/core/domain/shared/money";
import { MemoryOrderRepository, MemoryPaymentGateway } from "@/infrastructure/memory/memory-checkout";
import { MemoryIdentity } from "@/infrastructure/memory/memory-identity";
import { newOrder } from "@/test/order-contract";
import { boardTag, boardVersion, makeCancelOrder, makeSealBoardQuery, makeGetBoard, makeGetStaffOrder, makeRefundOrder } from "./orders";

const today = new Date("2030-01-07T09:00:00Z");
const clock = { now: () => today };

let orders: MemoryOrderRepository;
let identity: MemoryIdentity;
let payments: MemoryPaymentGateway;

beforeEach(() => {
  orders = new MemoryOrderRepository(50);
  identity = new MemoryIdentity();
  payments = new MemoryPaymentGateway();
});

async function placed(overrides: Parameters<typeof newOrder>[0] = {}, paid = true) {
  const input = newOrder(overrides);
  const created = await orders.create(input);
  if (typeof created === "string") throw new Error(created);
  if (paid) {
    await orders.attachPayment(created.id, `pi_${input.code}`);
    await orders.confirmPayment(`pi_${input.code}`);
  }
  return { ...created, code: input.code };
}

function signIn(role: "staff" | "admin" | "customer", isDemo = false) {
  identity.signInAs(identity.addUser({ email: `${role}${isDemo ? "-demo" : ""}@example.com`, isDemo }, role));
}

describe("GetBoard", () => {
  it("shows today's paid orders by column for the staff", async () => {
    const first = await placed({ slotStart: new Date("2030-01-07T10:00:00Z") });
    const second = await placed({ slotStart: new Date("2030-01-07T11:00:00Z") });
    await orders.advance(second.id, "preparing");
    await placed({ slotStart: new Date("2030-01-07T12:00:00Z") }, false);
    await placed({ slotStart: new Date("2030-01-08T10:00:00Z") });
    signIn("staff");

    const board = await makeGetBoard({ orders, identity, clock, timeZone: "Europe/Madrid" })();
    expect(board?.day).toBe("2030-01-07");
    expect(board?.columns.new.map((c) => c.code)).toEqual([first.code]);
    expect(board?.columns.preparing.map((c) => c.code)).toEqual([second.code]);
    expect(board?.columns.new[0]?.lines).toEqual([
      { name: "Classic Matcha", quantity: 2 },
      { name: "Vanilla Matcha", quantity: 1 },
    ]);
    expect(board?.version).toBe(`${first.code}:received|${second.code}:preparing`);
    expect(board?.canAdvance({ isDemo: false })).toBe(true);
  });

  it("opens any day and lets the demo staff move only example orders", async () => {
    const order = await placed({ slotStart: new Date("2030-01-08T10:00:00Z"), isDemo: true });
    signIn("staff", true);
    const board = await makeGetBoard({ orders, identity, clock, timeZone: "Europe/Madrid" })("2030-01-08");
    expect(board?.columns.new.map((c) => c.code)).toEqual([order.code]);
    expect(board?.canAdvance({ isDemo: true })).toBe(true);
    expect(board?.canAdvance({ isDemo: false })).toBe(false);
  });

  it("is closed to customers and visitors", async () => {
    const getBoard = makeGetBoard({ orders, identity, clock, timeZone: "Europe/Madrid" });
    expect(await getBoard()).toBeNull();
    signIn("customer");
    expect(await getBoard()).toBeNull();
  });

  it("builds an empty version for an empty day", () => {
    expect(boardVersion([])).toBe("");
  });
});

describe("GetStaffOrder", () => {
  it("gives the staff the next step and what they may do", async () => {
    const order = await placed({ notes: "sin hielo" });
    signIn("staff");
    const view = await makeGetStaffOrder({ orders, identity })(order.code.toLowerCase());
    expect(view).toMatchObject({ next: "preparing", canAdvance: true, canCancel: true, canRefund: false });
    expect(view?.order.notes).toBe("sin hielo");
    expect(view?.timeline.steps[0]?.state).toBe("current");
  });

  it("lets admins refund and keeps real orders read-only for the demo staff", async () => {
    const order = await placed();
    signIn("admin");
    expect(await makeGetStaffOrder({ orders, identity })(order.code)).toMatchObject({ canRefund: true, canAdvance: true });
    signIn("staff", true);
    expect(await makeGetStaffOrder({ orders, identity })(order.code)).toMatchObject({
      canAdvance: false,
      canCancel: false,
      canRefund: false,
    });
  });

  it("hides orders from customers and unknown codes", async () => {
    const order = await placed();
    signIn("customer");
    expect(await makeGetStaffOrder({ orders, identity })(order.code)).toBeNull();
    signIn("staff");
    expect(await makeGetStaffOrder({ orders, identity })("MR-NONE")).toBeNull();
  });
});

describe("CancelOrder", () => {
  it("cancels a new order and refunds the payment in full", async () => {
    const order = await placed();
    signIn("staff");
    expect(await makeCancelOrder({ orders, identity, payments })(order.code)).toBe("done");
    const stored = await orders.byCode(order.code);
    expect(stored?.status).toBe("cancelled");
    expect(stored?.refunded).toEqual(money(1680));
    expect(payments.refunds).toEqual([{ orderId: order.id, paymentIntentId: `pi_${order.code}`, amountCents: 1680 }]);
  });

  it("does not touch Stripe for an example order without payment", async () => {
    const input = newOrder({ isDemo: true });
    const created = await orders.create(input);
    if (typeof created === "string") throw new Error(created);
    await orders.advance(created.id, "preparing");
    const stored = orders.orders.find((o) => o.id === created.id)!;
    Object.assign(stored, { status: "received" });
    signIn("staff", true);
    expect(await makeCancelOrder({ orders, identity, payments })(input.code)).toBe("done");
    expect(payments.refunds).toEqual([]);
    expect((await orders.byCode(input.code))?.refunded).toEqual(money(0));
  });

  it("never sends example orders to Stripe even with a fake payment", async () => {
    const order = await placed({ isDemo: true });
    signIn("staff", true);
    expect(await makeCancelOrder({ orders, identity, payments })(order.code)).toBe("done");
    expect(payments.refunds).toEqual([]);
  });

  it("refuses orders already in preparation, real orders for the demo staff and customers", async () => {
    const order = await placed();
    const cancel = makeCancelOrder({ orders, identity, payments });
    signIn("customer");
    expect(await cancel(order.code)).toBe("forbidden");
    signIn("staff", true);
    expect(await cancel(order.code)).toBe("forbidden");
    signIn("staff");
    expect(await cancel("MR-NONE")).toBe("not_found");
    await orders.advance(order.id, "preparing");
    expect(await cancel(order.code)).toBe("invalid_transition");
    expect(payments.refunds).toEqual([]);
  });

  it("reports a status that changed in the meantime", async () => {
    const order = await placed();
    signIn("staff");
    orders.advance = async () => "invalid_transition";
    expect(await makeCancelOrder({ orders, identity, payments })(order.code)).toBe("invalid_transition");
    expect(payments.refunds).toEqual([]);
  });
});

describe("RefundOrder", () => {
  it("lets an admin refund what is left of a completed order", async () => {
    const order = await placed();
    for (const step of ["preparing", "ready", "completed"] as const) await orders.advance(order.id, step);
    await orders.recordRefund(order.id, money(500));
    signIn("admin");
    expect(await makeRefundOrder({ orders, identity, payments })(order.code)).toBe("done");
    expect(payments.refunds[0]?.amountCents).toBe(1180);
    expect((await orders.byCode(order.code))?.status).toBe("refunded");
    expect(await makeRefundOrder({ orders, identity, payments })(order.code)).toBe("invalid_transition");
  });

  it("is only for admins and existing orders", async () => {
    const order = await placed();
    const refund = makeRefundOrder({ orders, identity, payments });
    signIn("staff");
    expect(await refund(order.code)).toBe("forbidden");
    signIn("admin");
    expect(await refund("MR-NONE")).toBe("not_found");
  });
});

describe("boardTag", () => {
  it("is short, stable and changes with the board", () => {
    expect(boardTag("2030-01-07", "A:received")).toBe(boardTag("2030-01-07", "A:received"));
    expect(boardTag("2030-01-07", "A:received")).not.toBe(boardTag("2030-01-07", "A:preparing"));
    expect(boardTag("2030-01-07", "A:received")).toMatch(/^2030-01-07\.[0-9a-z]+$/);
  });
});

describe("SealBoardQuery", () => {
  const sealer = {
    url: "wss://realtime.test",
    sealOrder: async () => ({ capability: "order", expiresAt: 1, queryFingerprint: "order" }),
    sealBoard: async (from: Date, to: Date) => ({
      capability: `${from.toISOString()}|${to.toISOString()}`,
      expiresAt: 1,
      queryFingerprint: "board",
    }),
  };

  it("seals the day's board in Madrid time for the staff only", async () => {
    const seal = makeSealBoardQuery({ identity, sealer, timeZone: "Europe/Madrid" });
    expect(await seal("2030-01-07")).toBeNull();
    signIn("staff");
    expect(await seal("2030-01-07")).toEqual({
      url: "wss://realtime.test",
      sealed: { capability: "2030-01-06T23:00:00.000Z|2030-01-07T23:00:00.000Z", expiresAt: 1, queryFingerprint: "board" },
    });
  });

  it("does nothing without Realtime", async () => {
    signIn("staff");
    expect(await makeSealBoardQuery({ identity, sealer: null, timeZone: "Europe/Madrid" })("2030-01-07")).toBeNull();
  });
});
