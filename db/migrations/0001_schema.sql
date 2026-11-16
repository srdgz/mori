CREATE TYPE "public"."app_role" AS ENUM('customer', 'staff', 'admin');--> statement-breakpoint
CREATE TYPE "public"."fulfilment_kind" AS ENUM('pickup', 'delivery');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending_payment', 'received', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled', 'refunded', 'expired');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"password" text,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"label" text NOT NULL,
	"line1" text NOT NULL,
	"line2" text,
	"postal_code" text NOT NULL,
	"city" text DEFAULT 'Madrid' NOT NULL,
	"instructions" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "addresses_postal_code" CHECK ("addresses"."postal_code" ~ '^[0-9]{5}$')
);
--> statement-breakpoint
CREATE TABLE "carts" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"lines" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" jsonb NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "closures" (
	"day" date PRIMARY KEY NOT NULL,
	"reason" jsonb
);
--> statement-breakpoint
CREATE TABLE "coupon_redemptions" (
	"coupon_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"customer_email" "citext" NOT NULL,
	CONSTRAINT "coupon_redemptions_coupon_id_order_id_pk" PRIMARY KEY("coupon_id","order_id")
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" "citext" NOT NULL,
	"kind" text NOT NULL,
	"value" integer NOT NULL,
	"min_subtotal_cents" integer DEFAULT 0 NOT NULL,
	"first_order_only" boolean DEFAULT false NOT NULL,
	"max_uses" integer,
	"per_customer_limit" integer DEFAULT 1,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coupons_code_unique" UNIQUE("code"),
	CONSTRAINT "coupons_kind" CHECK ("coupons"."kind" in ('percent', 'amount')),
	CONSTRAINT "coupons_value_positive" CHECK ("coupons"."value" > 0)
);
--> statement-breakpoint
CREATE TABLE "delivery_zones" (
	"postal_code" text PRIMARY KEY NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "delivery_zones_postal_code" CHECK ("delivery_zones"."postal_code" ~ '^[0-9]{5}$')
);
--> statement-breakpoint
CREATE TABLE "favourites" (
	"user_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "favourites_user_id_product_id_pk" PRIMARY KEY("user_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "loyalty_ledger" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "loyalty_ledger_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" uuid NOT NULL,
	"order_id" uuid,
	"delta" integer NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "loyalty_ledger_reason" CHECK ("loyalty_ledger"."reason" in ('purchase', 'redeem', 'refund', 'adjustment'))
);
--> statement-breakpoint
CREATE TABLE "opening_hours" (
	"weekday" smallint PRIMARY KEY NOT NULL,
	"opens_at" time,
	"closes_at" time,
	CONSTRAINT "opening_hours_weekday" CHECK ("opening_hours"."weekday" between 0 and 6),
	CONSTRAINT "opening_hours_both_or_none" CHECK (("opening_hours"."opens_at" is null) = ("opening_hours"."closes_at" is null))
);
--> statement-breakpoint
CREATE TABLE "option_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" jsonb NOT NULL,
	"selection" text NOT NULL,
	"required" boolean NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "option_groups_code_unique" UNIQUE("code"),
	CONSTRAINT "option_groups_selection" CHECK ("option_groups"."selection" in ('single', 'multiple'))
);
--> statement-breakpoint
CREATE TABLE "options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" jsonb NOT NULL,
	"price_delta_cents" integer DEFAULT 0 NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "options_group_code" UNIQUE("group_id","code"),
	CONSTRAINT "options_price_delta" CHECK ("options"."price_delta_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "order_events" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "order_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"order_id" uuid NOT NULL,
	"status" "order_status" NOT NULL,
	"actor_id" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid,
	"product_name" text NOT NULL,
	"options" jsonb NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"quantity" integer NOT NULL,
	"line_total_cents" integer NOT NULL,
	CONSTRAINT "order_items_quantity" CHECK ("order_items"."quantity" between 1 and 20)
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"customer_id" uuid,
	"contact_name" text NOT NULL,
	"contact_email" "citext" NOT NULL,
	"contact_phone" text NOT NULL,
	"locale" text NOT NULL,
	"fulfilment" "fulfilment_kind" NOT NULL,
	"scheduled_for" timestamp with time zone,
	"slot_start" timestamp with time zone,
	"delivery_address" jsonb,
	"notes" text,
	"status" "order_status" DEFAULT 'pending_payment' NOT NULL,
	"subtotal_cents" integer NOT NULL,
	"discount_cents" integer DEFAULT 0 NOT NULL,
	"delivery_fee_cents" integer DEFAULT 0 NOT NULL,
	"total_cents" integer NOT NULL,
	"vat_cents" integer NOT NULL,
	"coupon_id" uuid,
	"stamps_redeemed" integer DEFAULT 0 NOT NULL,
	"payment_intent_id" text,
	"paid_at" timestamp with time zone,
	"refunded_cents" integer DEFAULT 0 NOT NULL,
	"tracking_token" uuid DEFAULT gen_random_uuid() NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_code_unique" UNIQUE("code"),
	CONSTRAINT "orders_payment_intent_id_unique" UNIQUE("payment_intent_id"),
	CONSTRAINT "orders_locale" CHECK ("orders"."locale" in ('es', 'en')),
	CONSTRAINT "orders_pickup_has_slot" CHECK (("orders"."fulfilment" = 'pickup') = ("orders"."slot_start" is not null)),
	CONSTRAINT "orders_delivery_has_address" CHECK (("orders"."fulfilment" = 'delivery') = ("orders"."delivery_address" is not null))
);
--> statement-breakpoint
CREATE TABLE "product_option_groups" (
	"product_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	"default_option_id" uuid,
	"allowed_option_ids" uuid[],
	CONSTRAINT "product_option_groups_product_id_group_id_pk" PRIMARY KEY("product_id","group_id")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"category_id" uuid NOT NULL,
	"name" text NOT NULL,
	"short_description" jsonb NOT NULL,
	"description" jsonb NOT NULL,
	"alt" jsonb NOT NULL,
	"image" text NOT NULL,
	"cup_color" text NOT NULL,
	"cup_name" jsonb NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"base_price_cents" integer NOT NULL,
	"is_vegan" boolean DEFAULT false NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug"),
	CONSTRAINT "products_cup_color" CHECK ("products"."cup_color" ~ '^#[0-9a-fA-F]{6}$'),
	CONSTRAINT "products_price_positive" CHECK ("products"."base_price_cents" > 0)
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "store_settings" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"timezone" text DEFAULT 'Europe/Madrid' NOT NULL,
	"prep_minutes" integer DEFAULT 15 NOT NULL,
	"slot_minutes" integer DEFAULT 15 NOT NULL,
	"slot_capacity" integer DEFAULT 8 NOT NULL,
	"schedule_days_ahead" integer DEFAULT 1 NOT NULL,
	"orders_paused" boolean DEFAULT false NOT NULL,
	"delivery_enabled" boolean DEFAULT true NOT NULL,
	"delivery_min_cents" integer DEFAULT 1200 NOT NULL,
	"delivery_fee_cents" integer DEFAULT 250 NOT NULL,
	"delivery_free_from_cents" integer DEFAULT 2500 NOT NULL,
	"delivery_last_order_minutes" integer DEFAULT 30 NOT NULL,
	"delivery_eta_min" integer DEFAULT 30 NOT NULL,
	"delivery_eta_max" integer DEFAULT 45 NOT NULL,
	"unpaid_hold_minutes" integer DEFAULT 30 NOT NULL,
	"loyalty_stamps_required" integer DEFAULT 8 NOT NULL,
	"vat_rate_bp" integer DEFAULT 1000 NOT NULL,
	CONSTRAINT "store_settings_single_row" CHECK ("store_settings"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" "citext" NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"phone" text,
	"locale" text DEFAULT 'es' NOT NULL,
	"marketing_opt_in" boolean DEFAULT false NOT NULL,
	"role" "app_role" DEFAULT 'customer' NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"stripe_customer_id" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_stripe_customer_id_unique" UNIQUE("stripe_customer_id")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favourites" ADD CONSTRAINT "favourites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favourites" ADD CONSTRAINT "favourites_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_ledger" ADD CONSTRAINT "loyalty_ledger_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_ledger" ADD CONSTRAINT "loyalty_ledger_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "options" ADD CONSTRAINT "options_group_id_option_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."option_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_option_groups" ADD CONSTRAINT "product_option_groups_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_option_groups" ADD CONSTRAINT "product_option_groups_group_id_option_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."option_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_option_groups" ADD CONSTRAINT "product_option_groups_default_option_id_options_id_fk" FOREIGN KEY ("default_option_id") REFERENCES "public"."options"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "addresses_one_default" ON "addresses" USING btree ("user_id") WHERE "addresses"."is_default";--> statement-breakpoint
CREATE INDEX "orders_board" ON "orders" USING btree ("slot_start","status");--> statement-breakpoint
CREATE INDEX "orders_customer" ON "orders" USING btree ("customer_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "orders_updated" ON "orders" USING btree ("updated_at");