import type { EditableSettings } from "@/core/domain/fulfilment/store-settings";
import type { Coupon } from "@/core/domain/promotions/coupon";
import type { LocalDate } from "@/core/domain/shared/zoned-time";

export type AdminCoupon = Coupon & Readonly<{ id: string; uses: number }>;

export interface AdminCouponRepository {
  list(): Promise<AdminCoupon[]>;
  create(coupon: Coupon): Promise<{ id: string } | "code_taken">;
  setActive(id: string, active: boolean): Promise<boolean>;
}

export type StoreSettingsView = EditableSettings & Readonly<{ closures: readonly LocalDate[]; zones: readonly string[] }>;

export interface AdminSettingsRepository {
  load(): Promise<StoreSettingsView>;
  save(settings: EditableSettings): Promise<void>;
  addClosure(day: LocalDate): Promise<void>;
  removeClosure(day: LocalDate): Promise<void>;
  addZone(postalCode: string): Promise<void>;
  removeZone(postalCode: string): Promise<void>;
}

export type CustomerRow = Readonly<{
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  orders: number;
  spentCents: number;
  lastOrderAt: Date | null;
}>;

export interface CustomerDirectory {
  list(search: string, limit: number, offset: number): Promise<CustomerRow[]>;
}

export type SalesSummary = Readonly<{ totalCents: number; orders: number; pickup: number; delivery: number }>;

export interface SalesReports {
  summary(from: Date, to: Date): Promise<SalesSummary>;
  byHour(from: Date, to: Date, timeZone: string): Promise<readonly Readonly<{ hour: number; totalCents: number }>[]>;
  topProducts(from: Date, to: Date, limit: number): Promise<readonly Readonly<{ name: string; quantity: number }>[]>;
}
