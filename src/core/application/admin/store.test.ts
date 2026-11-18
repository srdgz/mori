import { beforeEach, describe, expect, it } from "vitest";
import type { EditableSettings } from "@/core/domain/fulfilment/store-settings";
import type { Coupon } from "@/core/domain/promotions/coupon";
import { money } from "@/core/domain/shared/money";
import type { LocalDate } from "@/core/domain/shared/zoned-time";
import { MemoryIdentity } from "@/infrastructure/memory/memory-identity";
import type { AdminCoupon, AdminSettingsRepository, CustomerRow, SalesReports, StoreSettingsView } from "../ports/admin-store";
import {
  CUSTOMER_PAGE,
  makeCreateCoupon,
  makeEditClosures,
  makeEditZones,
  makeGetDashboard,
  makeGetStoreSettings,
  makeListCoupons,
  makeListCustomers,
  makeSaveStoreSettings,
  makeSetCouponActive,
} from "./store";

let identity: MemoryIdentity;

beforeEach(() => {
  identity = new MemoryIdentity();
});

function signIn(role: "admin" | "staff") {
  identity.signInAs(identity.addUser({ email: `${role}@example.com` }, role));
}

class FakeCoupons {
  readonly stored: AdminCoupon[] = [];
  async list() {
    return this.stored;
  }
  async create(coupon: Coupon) {
    if (this.stored.some((c) => c.code === coupon.code)) return "code_taken" as const;
    this.stored.push({ ...coupon, id: `c${this.stored.length + 1}`, uses: 0 });
    return { id: `c${this.stored.length}` };
  }
  async setActive(id: string, active: boolean) {
    const coupon = this.stored.find((c) => c.id === id);
    if (!coupon) return false;
    this.stored.splice(this.stored.indexOf(coupon), 1, { ...coupon, isActive: active });
    return true;
  }
}

const coupon: Coupon = {
  code: " verano25 ",
  kind: "percent",
  value: 25,
  minSubtotal: money(0),
  firstOrderOnly: false,
  maxUses: null,
  perCustomerLimit: 1,
  startsAt: null,
  endsAt: null,
  isActive: true,
};

describe("coupons", () => {
  it("lets admins create, list and switch coupons with a clean code", async () => {
    signIn("admin");
    const coupons = new FakeCoupons();
    expect(await makeCreateCoupon({ coupons, identity })(coupon)).toEqual({ ok: true, id: "c1" });
    expect(await makeCreateCoupon({ coupons, identity })(coupon)).toEqual({ ok: false, error: "code_taken", fields: ["code"] });
    expect(await makeCreateCoupon({ coupons, identity })({ ...coupon, code: "!" })).toEqual({
      ok: false,
      error: "invalid",
      fields: ["code"],
    });
    expect((await makeListCoupons({ coupons, identity })())?.[0]?.code).toBe("VERANO25");
    expect(await makeSetCouponActive({ coupons, identity })("c1", false)).toBe(true);
    expect(coupons.stored[0]?.isActive).toBe(false);
  });

  it("is closed to staff", async () => {
    signIn("staff");
    const coupons = new FakeCoupons();
    expect(await makeListCoupons({ coupons, identity })()).toBeNull();
    expect(await makeCreateCoupon({ coupons, identity })(coupon)).toEqual({ ok: false, error: "forbidden", fields: [] });
    expect(await makeSetCouponActive({ coupons, identity })("c1", false)).toBe(false);
  });
});

const hours = { opens: "08:00", closes: "20:00" } as const;
const editable: EditableSettings = {
  ordersPaused: false,
  prepMinutes: 15,
  slotCapacity: 8,
  daysAhead: 1,
  schedule: { 0: null, 1: hours, 2: hours, 3: hours, 4: hours, 5: hours, 6: hours },
  delivery: { enabled: true, minimumCents: 1200, feeCents: 250, freeFromCents: 2500, lastOrderMinutes: 30, etaMin: 30, etaMax: 45 },
};

class FakeSettings implements AdminSettingsRepository {
  view: StoreSettingsView = { ...editable, closures: [], zones: ["28004"] };
  async load() {
    return this.view;
  }
  async save(settings: EditableSettings) {
    this.view = { ...this.view, ...settings };
  }
  async addClosure(day: LocalDate) {
    this.view = { ...this.view, closures: [...this.view.closures, day] };
  }
  async removeClosure(day: LocalDate) {
    this.view = { ...this.view, closures: this.view.closures.filter((d) => d !== day) };
  }
  async addZone(code: string) {
    this.view = { ...this.view, zones: [...this.view.zones, code] };
  }
  async removeZone(code: string) {
    this.view = { ...this.view, zones: this.view.zones.filter((z) => z !== code) };
  }
}

describe("settings", () => {
  it("saves valid settings, edits closures and zones and refreshes the site", async () => {
    signIn("admin");
    const settings = new FakeSettings();
    let changes = 0;
    const deps = { settings, identity, onChange: () => void (changes += 1) };
    expect(await makeSaveStoreSettings(deps)({ ...editable, ordersPaused: true })).toEqual({ ok: true });
    expect(await makeSaveStoreSettings(deps)({ ...editable, slotCapacity: 0 })).toEqual({
      ok: false,
      error: "invalid",
      fields: ["slotCapacity"],
    });
    expect(await makeEditClosures(deps)("add", "2031-12-25")).toBe(true);
    expect(await makeEditClosures(deps)("remove", "2031-12-25")).toBe(true);
    expect(await makeEditZones(deps)("add", " 28010 ")).toBe(true);
    expect(await makeEditZones(deps)("add", "2801")).toBe(false);
    expect(await makeEditZones(deps)("remove", "28004")).toBe(true);
    expect(await makeGetStoreSettings({ settings, identity })()).toMatchObject({ ordersPaused: true, closures: [], zones: ["28010"] });
    expect(changes).toBe(5);
  });

  it("is closed to staff", async () => {
    signIn("staff");
    const settings = new FakeSettings();
    const deps = { settings, identity, onChange: () => undefined };
    expect(await makeGetStoreSettings(deps)()).toBeNull();
    expect(await makeSaveStoreSettings(deps)(editable)).toEqual({ ok: false, error: "forbidden", fields: [] });
    expect(await makeEditClosures(deps)("add", "2031-12-25")).toBe(false);
    expect(await makeEditZones(deps)("add", "28010")).toBe(false);
  });
});

describe("ListCustomers", () => {
  const row = (i: number): CustomerRow => ({
    id: `u${i}`,
    name: `Cliente ${i}`,
    email: `c${i}@example.com`,
    createdAt: new Date(0),
    orders: 1,
    spentCents: 450,
    lastOrderAt: null,
  });

  it("pages through customers for admins only", async () => {
    const calls: [string, number, number][] = [];
    const customers = {
      list: async (search: string, limit: number, offset: number) => {
        calls.push([search, limit, offset]);
        return Array.from({ length: offset === 0 ? limit : 3 }, (_, i) => row(i));
      },
    };
    signIn("staff");
    expect(await makeListCustomers({ customers, identity })("", 0)).toBeNull();
    signIn("admin");
    const first = await makeListCustomers({ customers, identity })("  ana ", 0);
    expect(first?.customers).toHaveLength(CUSTOMER_PAGE);
    expect(first?.hasMore).toBe(true);
    const second = await makeListCustomers({ customers, identity })("", -2.5);
    expect(second?.hasMore).toBe(true);
    expect((await makeListCustomers({ customers, identity })("", 1))?.hasMore).toBe(false);
    expect(calls[0]).toEqual(["ana", CUSTOMER_PAGE + 1, 0]);
    expect(calls[2]).toEqual(["", CUSTOMER_PAGE + 1, CUSTOMER_PAGE]);
  });
});

describe("GetDashboard", () => {
  const clock = { now: () => new Date("2030-01-07T12:00:00Z") };

  it("sums today and the last week and trims the quiet hours", async () => {
    const ranges: string[] = [];
    const reports: SalesReports = {
      summary: async (from, to) => {
        ranges.push(`${from.toISOString()}|${to.toISOString()}`);
        return from.getUTCDate() === 6
          ? { totalCents: 900, orders: 2, pickup: 2, delivery: 0 }
          : { totalCents: 5000, orders: 4, pickup: 3, delivery: 1 };
      },
      byHour: async () => [
        { hour: 9, totalCents: 1000 },
        { hour: 12, totalCents: 4000 },
      ],
      topProducts: async () => [{ name: "Classic Matcha", quantity: 7 }],
    };
    signIn("admin");
    const dashboard = await makeGetDashboard({ reports, identity, clock, timeZone: "Europe/Madrid" })();
    expect(ranges).toEqual(["2030-01-06T23:00:00.000Z|2030-01-07T23:00:00.000Z", "2029-12-31T23:00:00.000Z|2030-01-07T23:00:00.000Z"]);
    expect(dashboard?.today.totalCents).toBe(900);
    expect(dashboard?.averageCents).toBe(1250);
    expect(dashboard?.byHour.map((h) => h.hour)).toEqual([8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
    expect(dashboard?.byHour[1]).toEqual({ hour: 9, totalCents: 1000 });
    expect(dashboard?.byHour[2]?.totalCents).toBe(0);
    expect(dashboard?.top).toEqual([{ name: "Classic Matcha", quantity: 7 }]);
  });

  it("handles a week without sales and stays closed to staff", async () => {
    const empty = { totalCents: 0, orders: 0, pickup: 0, delivery: 0 };
    const reports: SalesReports = { summary: async () => empty, byHour: async () => [], topProducts: async () => [] };
    signIn("admin");
    expect(await makeGetDashboard({ reports, identity, clock, timeZone: "Europe/Madrid" })()).toMatchObject({
      averageCents: 0,
      byHour: [],
    });
    signIn("staff");
    expect(await makeGetDashboard({ reports, identity, clock, timeZone: "Europe/Madrid" })()).toBeNull();
  });
});
