"use server";

import { z } from "zod";
import { admin } from "@/composition/checkout";
import type { SaveProductResult } from "@/core/application/admin/catalog";
import type { CreateCouponResult, SaveSettingsResult } from "@/core/application/admin/store";
import type { EditableSettings } from "@/core/domain/fulfilment/store-settings";
import { money } from "@/core/domain/shared/money";
import { isLocalDate } from "@/core/domain/shared/zoned-time";
import type { ProductDraft } from "@/core/domain/catalog/product-draft";
import { ORDER_STATUSES } from "@/core/domain/ordering/order-status";

const codeSchema = z.string().trim().min(4).max(12);
const statusSchema = z.enum(ORDER_STATUSES);

export type AdminActionResult = "done" | "forbidden" | "not_found" | "invalid_transition" | "invalid_input";

export async function advanceOrderAction(code: string, next: string): Promise<AdminActionResult> {
  const parsedCode = codeSchema.safeParse(code);
  const parsedNext = statusSchema.safeParse(next);
  if (!parsedCode.success || !parsedNext.success) return "invalid_input";
  const result = await admin().advanceOrderStatus(parsedCode.data, parsedNext.data);
  return result === "advanced" ? "done" : result;
}

export async function cancelOrderAction(code: string): Promise<AdminActionResult> {
  const parsed = codeSchema.safeParse(code);
  if (!parsed.success) return "invalid_input";
  return admin().cancelOrder(parsed.data);
}

export async function refundOrderAction(code: string): Promise<AdminActionResult> {
  const parsed = codeSchema.safeParse(code);
  if (!parsed.success) return "invalid_input";
  return admin().refundOrder(parsed.data);
}

const localizedSchema = z.object({ es: z.string().trim().max(600), en: z.string().trim().max(600) });

const draftSchema = z.object({
  id: z.string().uuid().nullable(),
  slug: z.string().trim().max(60),
  categoryId: z.string().uuid().or(z.literal("")),
  name: z.string().max(60),
  image: z.string().trim().max(300),
  priceCents: z.number().int(),
  cupColor: z.string().trim().max(7),
  cupName: localizedSchema,
  shortDescription: localizedSchema,
  description: localizedSchema,
  alt: localizedSchema,
  isVegan: z.boolean(),
  isAvailable: z.boolean(),
  isFeatured: z.boolean(),
  sort: z.number().int().min(0).max(999),
  groups: z.array(z.object({ groupId: z.string().uuid(), defaultOptionId: z.string().uuid().nullable() })).max(10),
});

export async function saveProductAction(input: ProductDraft): Promise<SaveProductResult> {
  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid", fields: [] };
  return admin().saveProduct(parsed.data);
}

export async function setProductAvailabilityAction(id: string, available: boolean): Promise<boolean> {
  if (!z.string().uuid().safeParse(id).success) return false;
  return admin().setProductAvailability(id, available === true);
}

export async function setOptionAvailabilityAction(id: string, available: boolean): Promise<boolean> {
  if (!z.string().uuid().safeParse(id).success) return false;
  return admin().setOptionAvailability(id, available === true);
}

const couponSchema = z.object({
  code: z.string().max(30),
  kind: z.enum(["percent", "amount"]),
  value: z.number(),
  minSubtotalCents: z.number().int().min(0).max(100_000),
  firstOrderOnly: z.boolean(),
  maxUses: z.number().int().nullable(),
  perCustomerLimit: z.number().int().nullable(),
  startsAt: z.string().datetime().nullable(),
  endsAt: z.string().datetime().nullable(),
});

export type CouponFormInput = z.infer<typeof couponSchema>;

export async function createCouponAction(input: CouponFormInput): Promise<CreateCouponResult> {
  const parsed = couponSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid", fields: ["value"] };
  const { minSubtotalCents, startsAt, endsAt, ...rest } = parsed.data;
  return admin().createCoupon({
    ...rest,
    minSubtotal: money(minSubtotalCents),
    startsAt: startsAt ? new Date(startsAt) : null,
    endsAt: endsAt ? new Date(endsAt) : null,
    isActive: true,
  });
}

export async function setCouponActiveAction(id: string, active: boolean): Promise<boolean> {
  return admin().setCouponActive(id, active === true);
}

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const daySchema = z.object({ opens: timeSchema, closes: timeSchema }).nullable();
const settingsSchema = z.object({
  ordersPaused: z.boolean(),
  prepMinutes: z.number(),
  slotCapacity: z.number(),
  daysAhead: z.number(),
  schedule: z.object({ 0: daySchema, 1: daySchema, 2: daySchema, 3: daySchema, 4: daySchema, 5: daySchema, 6: daySchema }),
  delivery: z.object({
    enabled: z.boolean(),
    minimumCents: z.number(),
    feeCents: z.number(),
    freeFromCents: z.number(),
    lastOrderMinutes: z.number(),
    etaMin: z.number(),
    etaMax: z.number(),
  }),
});

export async function saveSettingsAction(input: EditableSettings): Promise<SaveSettingsResult> {
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid", fields: [] };
  return admin().saveStoreSettings(parsed.data as EditableSettings);
}

export async function editClosureAction(change: "add" | "remove", day: string): Promise<boolean> {
  if ((change !== "add" && change !== "remove") || !isLocalDate(day)) return false;
  return admin().editClosures(change, day);
}

export async function editZoneAction(change: "add" | "remove", postalCode: string): Promise<boolean> {
  if (change !== "add" && change !== "remove") return false;
  return admin().editZones(change, String(postalCode));
}
