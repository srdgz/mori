"use server";

import { z } from "zod";
import { clientKey } from "@/app/client-key";
import { checkout } from "@/composition/checkout";
import type { CheckoutQuote, PlaceOrderResult } from "@/core/application/checkout/checkout";
import type { SyncedCart } from "@/core/application/checkout/orders";
import type { Cart, CartLine } from "@/core/domain/cart/cart";

const lineSchema = z.object({
  productId: z.string().max(64),
  optionIds: z.array(z.string().max(64)).max(20),
  quantity: z.number().int().min(1).max(20),
});
const cartSchema = z.array(lineSchema).max(20);

const addressSchema = z.object({
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200).nullable(),
  postalCode: z.string().trim().max(10),
  city: z.string().trim().min(1).max(80),
  instructions: z.string().trim().max(300).nullable(),
});

const fulfilmentSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("pickup"), slotStart: z.string().datetime().nullable() }),
  z.object({ kind: z.literal("delivery"), address: addressSchema }),
]);

function toCart(input: unknown): Cart | null {
  const parsed = cartSchema.safeParse(input);
  return parsed.success ? (parsed.data as unknown as CartLine[]) : null;
}

function toFulfilment(input: z.infer<typeof fulfilmentSchema>) {
  return input.kind === "pickup"
    ? { kind: "pickup" as const, slotStart: input.slotStart ? new Date(input.slotStart) : null }
    : { kind: "delivery" as const, address: input.address };
}

export async function syncCartAction(lines: Cart, owner: string | null): Promise<SyncedCart | null> {
  const cart = toCart(lines);
  if (!cart) return null;
  return checkout().syncCart(cart, typeof owner === "string" ? owner : null);
}

export type QuoteInput = {
  cart: Cart;
  fulfilment: z.infer<typeof fulfilmentSchema>;
  couponCode: string | null;
  email: string | null;
  redeemLine: string | null;
};

export async function quoteAction(input: QuoteInput): Promise<CheckoutQuote | null> {
  const cart = toCart(input.cart);
  const fulfilment = fulfilmentSchema.safeParse(input.fulfilment);
  if (!cart || !fulfilment.success) return null;
  return checkout().quoteCheckout({
    cart,
    fulfilment: toFulfilment(fulfilment.data),
    couponCode: input.couponCode?.slice(0, 40) || null,
    email: input.email?.slice(0, 200) || null,
    redeemLine: typeof input.redeemLine === "string" ? input.redeemLine.slice(0, 600) : null,
  });
}

const placeSchema = z.object({
  cart: cartSchema,
  contact: z.object({ name: z.string().max(80), email: z.string().max(200), phone: z.string().max(30) }),
  fulfilment: fulfilmentSchema,
  notes: z.string().max(300),
  couponCode: z.string().max(40).nullable(),
  redeemLine: z.string().max(600).nullable(),
  locale: z.string().max(5),
});

export type PlaceInput = Omit<z.infer<typeof placeSchema>, "cart"> & { cart: Cart };

export async function placeOrderAction(input: PlaceInput): Promise<PlaceOrderResult | { ok: false; error: "unavailable" | "generic" }> {
  const parsed = placeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "generic" };
  return checkout().placeOrder({
    ...parsed.data,
    clientKey: await clientKey(),
    cart: parsed.data.cart as unknown as CartLine[],
    fulfilment: toFulfilment(parsed.data.fulfilment),
  });
}
