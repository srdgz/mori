import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  customType,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  time,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { LocalizedText } from "@/core/domain/shared/locale";
import { FULFILMENT_KINDS, ORDER_STATUSES } from "@/core/domain/ordering/order-status";

const citext = customType<{ data: string }>({ dataType: () => "citext" });

const timestamptz = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
const createdAt = () => timestamptz("created_at").notNull().defaultNow();
const updatedAt = () => timestamptz("updated_at").notNull().defaultNow();
const localized = (name: string) => jsonb(name).$type<LocalizedText>();

export const appRole = pgEnum("app_role", ["customer", "staff", "admin"]);
export const fulfilmentKind = pgEnum("fulfilment_kind", FULFILMENT_KINDS);
export const orderStatus = pgEnum("order_status", ORDER_STATUSES);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: citext("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  phone: text("phone"),
  locale: text("locale").notNull().default("es"),
  marketingOptIn: boolean("marketing_opt_in").notNull().default(false),
  role: appRole("role").notNull().default("customer"),
  isDemo: boolean("is_demo").notNull().default(false),
  stripeCustomerId: text("stripe_customer_id").unique(),
  deletedAt: timestamptz("deleted_at"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamptz("expires_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("sessions_user").on(t.userId)],
);

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    password: text("password"),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamptz("access_token_expires_at"),
    refreshTokenExpiresAt: timestamptz("refresh_token_expires_at"),
    scope: text("scope"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("accounts_user").on(t.userId)],
);

export const verifications = pgTable(
  "verifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamptz("expires_at").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("verifications_identifier").on(t.identifier)],
);

export const rateLimits = pgTable("rate_limits", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: localized("name").notNull(),
  sort: integer("sort").notNull().default(0),
});

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id),
    name: text("name").notNull(),
    shortDescription: localized("short_description").notNull(),
    description: localized("description").notNull(),
    alt: localized("alt").notNull(),
    image: text("image").notNull(),
    cupColor: text("cup_color").notNull(),
    cupName: localized("cup_name").notNull(),
    tags: jsonb("tags").$type<LocalizedText[]>().notNull().default([]),
    basePriceCents: integer("base_price_cents").notNull(),
    isVegan: boolean("is_vegan").notNull().default(false),
    isAvailable: boolean("is_available").notNull().default(true),
    isFeatured: boolean("is_featured").notNull().default(false),
    sort: integer("sort").notNull().default(0),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("products_cup_color", sql`${t.cupColor} ~ '^#[0-9a-fA-F]{6}$'`),
    check("products_price_positive", sql`${t.basePriceCents} > 0`),
  ],
);

export const optionGroups = pgTable(
  "option_groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull().unique(),
    name: localized("name").notNull(),
    selection: text("selection", { enum: ["single", "multiple"] }).notNull(),
    required: boolean("required").notNull(),
    sort: integer("sort").notNull().default(0),
  },
  (t) => [check("option_groups_selection", sql`${t.selection} in ('single', 'multiple')`)],
);

export const options = pgTable(
  "options",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => optionGroups.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: localized("name").notNull(),
    priceDeltaCents: integer("price_delta_cents").notNull().default(0),
    isAvailable: boolean("is_available").notNull().default(true),
    sort: integer("sort").notNull().default(0),
  },
  (t) => [unique("options_group_code").on(t.groupId, t.code), check("options_price_delta", sql`${t.priceDeltaCents} >= 0`)],
);

export const productOptionGroups = pgTable(
  "product_option_groups",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    groupId: uuid("group_id")
      .notNull()
      .references(() => optionGroups.id, { onDelete: "cascade" }),
    defaultOptionId: uuid("default_option_id").references(() => options.id, { onDelete: "set null" }),
    allowedOptionIds: uuid("allowed_option_ids").array(),
  },
  (t) => [primaryKey({ columns: [t.productId, t.groupId] })],
);

export const storeSettings = pgTable(
  "store_settings",
  {
    id: smallint("id").primaryKey().default(1),
    timezone: text("timezone").notNull().default("Europe/Madrid"),
    prepMinutes: integer("prep_minutes").notNull().default(15),
    slotMinutes: integer("slot_minutes").notNull().default(15),
    slotCapacity: integer("slot_capacity").notNull().default(8),
    scheduleDaysAhead: integer("schedule_days_ahead").notNull().default(1),
    ordersPaused: boolean("orders_paused").notNull().default(false),
    deliveryEnabled: boolean("delivery_enabled").notNull().default(true),
    deliveryMinCents: integer("delivery_min_cents").notNull().default(1200),
    deliveryFeeCents: integer("delivery_fee_cents").notNull().default(250),
    deliveryFreeFromCents: integer("delivery_free_from_cents").notNull().default(2500),
    deliveryLastOrderMinutes: integer("delivery_last_order_minutes").notNull().default(30),
    deliveryEtaMin: integer("delivery_eta_min").notNull().default(30),
    deliveryEtaMax: integer("delivery_eta_max").notNull().default(45),
    unpaidHoldMinutes: integer("unpaid_hold_minutes").notNull().default(30),
    loyaltyStampsRequired: integer("loyalty_stamps_required").notNull().default(8),
    vatRateBp: integer("vat_rate_bp").notNull().default(1000),
  },
  (t) => [check("store_settings_single_row", sql`${t.id} = 1`)],
);

export const openingHours = pgTable(
  "opening_hours",
  {
    weekday: smallint("weekday").primaryKey(),
    opensAt: time("opens_at"),
    closesAt: time("closes_at"),
  },
  (t) => [
    check("opening_hours_weekday", sql`${t.weekday} between 0 and 6`),
    check("opening_hours_both_or_none", sql`(${t.opensAt} is null) = (${t.closesAt} is null)`),
  ],
);

export const closures = pgTable("closures", {
  day: date("day").primaryKey(),
  reason: localized("reason"),
});

export const deliveryZones = pgTable(
  "delivery_zones",
  {
    postalCode: text("postal_code").primaryKey(),
    isActive: boolean("is_active").notNull().default(true),
  },
  (t) => [check("delivery_zones_postal_code", sql`${t.postalCode} ~ '^[0-9]{5}$'`)],
);

export const coupons = pgTable(
  "coupons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: citext("code").notNull().unique(),
    kind: text("kind", { enum: ["percent", "amount"] }).notNull(),
    value: integer("value").notNull(),
    minSubtotalCents: integer("min_subtotal_cents").notNull().default(0),
    firstOrderOnly: boolean("first_order_only").notNull().default(false),
    maxUses: integer("max_uses"),
    perCustomerLimit: integer("per_customer_limit").default(1),
    startsAt: timestamptz("starts_at"),
    endsAt: timestamptz("ends_at"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [check("coupons_kind", sql`${t.kind} in ('percent', 'amount')`), check("coupons_value_positive", sql`${t.value} > 0`)],
);

export const addresses = pgTable(
  "addresses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    line1: text("line1").notNull(),
    line2: text("line2"),
    postalCode: text("postal_code").notNull(),
    city: text("city").notNull().default("Madrid"),
    instructions: text("instructions"),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("addresses_one_default")
      .on(t.userId)
      .where(sql`${t.isDefault}`),
    check("addresses_postal_code", sql`${t.postalCode} ~ '^[0-9]{5}$'`),
  ],
);

export const favourites = pgTable(
  "favourites",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.productId] })],
);

export const carts = pgTable("carts", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  lines: jsonb("lines").notNull().default([]),
  updatedAt: updatedAt(),
});

export type DeliveryAddress = { line1: string; line2?: string; postalCode: string; city: string; instructions?: string };

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull().unique(),
    customerId: uuid("customer_id").references(() => users.id, { onDelete: "set null" }),
    contactName: text("contact_name").notNull(),
    contactEmail: citext("contact_email").notNull(),
    contactPhone: text("contact_phone").notNull(),
    locale: text("locale").notNull(),
    fulfilment: fulfilmentKind("fulfilment").notNull(),
    scheduledFor: timestamptz("scheduled_for"),
    slotStart: timestamptz("slot_start"),
    deliveryAddress: jsonb("delivery_address").$type<DeliveryAddress>(),
    notes: text("notes"),
    status: orderStatus("status").notNull().default("pending_payment"),
    subtotalCents: integer("subtotal_cents").notNull(),
    discountCents: integer("discount_cents").notNull().default(0),
    deliveryFeeCents: integer("delivery_fee_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull(),
    vatCents: integer("vat_cents").notNull(),
    couponId: uuid("coupon_id").references(() => coupons.id),
    stampsRedeemed: integer("stamps_redeemed").notNull().default(0),
    paymentIntentId: text("payment_intent_id").unique(),
    paidAt: timestamptz("paid_at"),
    refundedCents: integer("refunded_cents").notNull().default(0),
    trackingToken: uuid("tracking_token").notNull().defaultRandom(),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("orders_board").on(t.slotStart, t.status),
    index("orders_customer").on(t.customerId, t.createdAt.desc()),
    index("orders_updated").on(t.updatedAt),
    check("orders_locale", sql`${t.locale} in ('es', 'en')`),
    check("orders_pickup_has_slot", sql`(${t.fulfilment} = 'pickup') = (${t.slotStart} is not null)`),
    check("orders_delivery_has_address", sql`(${t.fulfilment} = 'delivery') = (${t.deliveryAddress} is not null)`),
  ],
);

export type OrderItemOption = { group: string; code: string; name: LocalizedText; priceDeltaCents: number };

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    productName: text("product_name").notNull(),
    options: jsonb("options").$type<OrderItemOption[]>().notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    quantity: integer("quantity").notNull(),
    lineTotalCents: integer("line_total_cents").notNull(),
  },
  (t) => [check("order_items_quantity", sql`${t.quantity} between 1 and 20`)],
);

export const orderEvents = pgTable("order_events", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  status: orderStatus("status").notNull(),
  actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
  note: text("note"),
  createdAt: createdAt(),
});

export const couponRedemptions = pgTable(
  "coupon_redemptions",
  {
    couponId: uuid("coupon_id")
      .notNull()
      .references(() => coupons.id),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    customerEmail: citext("customer_email").notNull(),
  },
  (t) => [primaryKey({ columns: [t.couponId, t.orderId] })],
);

export const loyaltyLedger = pgTable(
  "loyalty_ledger",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    delta: integer("delta").notNull(),
    reason: text("reason", { enum: ["purchase", "redeem", "refund", "adjustment"] }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [check("loyalty_ledger_reason", sql`${t.reason} in ('purchase', 'redeem', 'refund', 'adjustment')`)],
);

export const categoriesRelations = relations(categories, ({ many }) => ({ products: many(products) }));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  optionGroups: many(productOptionGroups),
}));

export const optionGroupsRelations = relations(optionGroups, ({ many }) => ({ options: many(options) }));

export const optionsRelations = relations(options, ({ one }) => ({
  group: one(optionGroups, { fields: [options.groupId], references: [optionGroups.id] }),
}));

export const productOptionGroupsRelations = relations(productOptionGroups, ({ one }) => ({
  product: one(products, { fields: [productOptionGroups.productId], references: [products.id] }),
  group: one(optionGroups, { fields: [productOptionGroups.groupId], references: [optionGroups.id] }),
}));
