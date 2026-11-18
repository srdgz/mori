import { can, type Permission } from "@/core/domain/access/actor";
import { isPostalCode, settingsErrors, type EditableSettings, type SettingsField } from "@/core/domain/fulfilment/store-settings";
import { couponErrors, normaliseCode, type Coupon, type CouponField } from "@/core/domain/promotions/coupon";
import { addDays, localDate, zonedInstant, type LocalDate } from "@/core/domain/shared/zoned-time";
import { currentActor } from "../checkout/tracking";
import type {
  AdminCoupon,
  AdminCouponRepository,
  AdminSettingsRepository,
  CustomerDirectory,
  CustomerRow,
  SalesReports,
  SalesSummary,
  StoreSettingsView,
} from "../ports/admin-store";
import type { Clock } from "../ports/clock";
import type { Identity } from "../ports/identity";

async function allowed(identity: Identity, permission: Permission): Promise<boolean> {
  return can(await currentActor(identity), permission);
}

export type CreateCouponResult =
  | Readonly<{ ok: true; id: string }>
  | Readonly<{ ok: false; error: "forbidden" | "code_taken" | "invalid"; fields: readonly CouponField[] }>;

export function makeListCoupons(deps: { coupons: AdminCouponRepository; identity: Identity }) {
  return async (): Promise<AdminCoupon[] | null> => ((await allowed(deps.identity, "coupons.manage")) ? deps.coupons.list() : null);
}

export function makeCreateCoupon(deps: { coupons: AdminCouponRepository; identity: Identity }) {
  return async (coupon: Coupon): Promise<CreateCouponResult> => {
    if (!(await allowed(deps.identity, "coupons.manage"))) return { ok: false, error: "forbidden", fields: [] };
    const normalised = { ...coupon, code: normaliseCode(coupon.code) };
    const fields = couponErrors(normalised);
    if (fields.length > 0) return { ok: false, error: "invalid", fields };
    const created = await deps.coupons.create(normalised);
    return created === "code_taken" ? { ok: false, error: "code_taken", fields: ["code"] } : { ok: true, id: created.id };
  };
}

export function makeSetCouponActive(deps: { coupons: AdminCouponRepository; identity: Identity }) {
  return async (id: string, active: boolean): Promise<boolean> =>
    (await allowed(deps.identity, "coupons.manage")) && deps.coupons.setActive(id, active);
}

type SettingsDeps = { settings: AdminSettingsRepository; identity: Identity; onChange: () => void };

export type SaveSettingsResult =
  Readonly<{ ok: true }> | Readonly<{ ok: false; error: "forbidden" | "invalid"; fields: readonly SettingsField[] }>;

export function makeGetStoreSettings(deps: Omit<SettingsDeps, "onChange">) {
  return async (): Promise<StoreSettingsView | null> => ((await allowed(deps.identity, "settings.manage")) ? deps.settings.load() : null);
}

export function makeSaveStoreSettings(deps: SettingsDeps) {
  return async (settings: EditableSettings): Promise<SaveSettingsResult> => {
    if (!(await allowed(deps.identity, "settings.manage"))) return { ok: false, error: "forbidden", fields: [] };
    const fields = settingsErrors(settings);
    if (fields.length > 0) return { ok: false, error: "invalid", fields };
    await deps.settings.save(settings);
    deps.onChange();
    return { ok: true };
  };
}

export function makeEditClosures(deps: SettingsDeps) {
  return async (change: "add" | "remove", day: LocalDate): Promise<boolean> => {
    if (!(await allowed(deps.identity, "settings.manage"))) return false;
    await (change === "add" ? deps.settings.addClosure(day) : deps.settings.removeClosure(day));
    deps.onChange();
    return true;
  };
}

export function makeEditZones(deps: SettingsDeps) {
  return async (change: "add" | "remove", postalCode: string): Promise<boolean> => {
    const code = postalCode.trim();
    if (!isPostalCode(code) || !(await allowed(deps.identity, "settings.manage"))) return false;
    await (change === "add" ? deps.settings.addZone(code) : deps.settings.removeZone(code));
    deps.onChange();
    return true;
  };
}

export const CUSTOMER_PAGE = 25;

export function makeListCustomers(deps: { customers: CustomerDirectory; identity: Identity }) {
  return async (search: string, page: number): Promise<Readonly<{ customers: CustomerRow[]; hasMore: boolean }> | null> => {
    if (!(await allowed(deps.identity, "customers.view"))) return null;
    const safePage = Math.max(0, Math.floor(page));
    const rows = await deps.customers.list(search.trim().slice(0, 80), CUSTOMER_PAGE + 1, safePage * CUSTOMER_PAGE);
    return { customers: rows.slice(0, CUSTOMER_PAGE), hasMore: rows.length > CUSTOMER_PAGE };
  };
}

export type Dashboard = Readonly<{
  today: SalesSummary;
  week: SalesSummary;
  averageCents: number;
  byHour: readonly Readonly<{ hour: number; totalCents: number }>[];
  top: readonly Readonly<{ name: string; quantity: number }>[];
}>;

export function makeGetDashboard(deps: { reports: SalesReports; identity: Identity; clock: Clock; timeZone: string }) {
  return async (): Promise<Dashboard | null> => {
    if (!(await allowed(deps.identity, "dashboard.view"))) return null;
    const day = localDate(deps.clock.now(), deps.timeZone);
    const end = zonedInstant(addDays(day, 1), 0, deps.timeZone);
    const todayStart = zonedInstant(day, 0, deps.timeZone);
    const weekStart = zonedInstant(addDays(day, -6), 0, deps.timeZone);
    const [today, week, hours, top] = await Promise.all([
      deps.reports.summary(todayStart, end),
      deps.reports.summary(weekStart, end),
      deps.reports.byHour(weekStart, end, deps.timeZone),
      deps.reports.topProducts(weekStart, end, 5),
    ]);
    const byHour = Array.from({ length: 24 }, (_, hour) => ({ hour, totalCents: hours.find((h) => h.hour === hour)?.totalCents ?? 0 }));
    const firstHour = byHour.findIndex((h) => h.totalCents > 0);
    const lastHour = byHour.findLastIndex((h) => h.totalCents > 0);
    return {
      today,
      week,
      averageCents: week.orders > 0 ? Math.round(week.totalCents / week.orders) : 0,
      byHour: firstHour < 0 ? [] : byHour.slice(Math.min(firstHour, 8), Math.max(lastHour, 20) + 1),
      top,
    };
  };
}
