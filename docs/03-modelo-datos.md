# 03 · Modelo de datos

Supabase Postgres. Los importes se guardan en **céntimos** (`integer`) y los textos traducibles en `jsonb` con las claves `es` y `en`. Todas las tablas tienen RLS activada.

## Diagrama

```
auth.users 1─1 profiles 1─n addresses
                  │ 1─n favourites n─1 products
                  │ 1─1 carts
                  │ 1─n loyalty_ledger
                  │ 1─n orders 1─n order_items n─1 products
                  │           1─n order_events
                  │           n─1 coupons 1─n coupon_redemptions
categories 1─n products n─n option_groups (product_option_groups) 1─n options
store_settings (fila única) · opening_hours · closures · delivery_zones
```

## Roles y utilidades

```sql
create type app_role as enum ('customer', 'staff', 'admin');
create type fulfilment_kind as enum ('pickup', 'delivery');
create type order_status as enum (
  'pending_payment', 'received', 'preparing', 'ready', 'out_for_delivery',
  'completed', 'cancelled', 'refunded', 'expired'
);

create function public.current_role() returns app_role
language sql stable as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role')::app_role, 'customer')
$$;

create function public.is_staff() returns boolean
language sql stable as $$ select public.current_role() in ('staff', 'admin') $$;

create function public.is_admin() returns boolean
language sql stable as $$ select public.current_role() = 'admin' $$;
```

El rol se copia en el JWT con un *custom access token hook* que lee `profiles.role`.

## Clientes

```sql
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  phone text,
  locale text not null default 'es' check (locale in ('es', 'en')),
  marketing_opt_in boolean not null default false,
  role app_role not null default 'customer',
  stripe_customer_id text unique,
  created_at timestamptz not null default now()
);

create table addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  label text not null,
  line1 text not null,
  line2 text,
  postal_code text not null check (postal_code ~ '^\d{5}$'),
  city text not null default 'Madrid',
  instructions text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index addresses_one_default on addresses (user_id) where is_default;

create table favourites (
  user_id uuid references profiles on delete cascade,
  product_id uuid references products on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table carts (
  user_id uuid primary key references profiles on delete cascade,
  lines jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

create table loyalty_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles on delete cascade,
  order_id uuid references orders on delete set null,
  delta integer not null,
  reason text not null check (reason in ('purchase', 'redeem', 'refund', 'adjustment')),
  created_at timestamptz not null default now()
);
create view loyalty_balance with (security_invoker = true) as
  select user_id, sum(delta)::int as stamps from loyalty_ledger group by user_id;
```

## Catálogo

```sql
create table categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name jsonb not null,
  sort integer not null default 0
);

create table products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  category_id uuid not null references categories,
  name text not null,
  short_description jsonb not null,
  description jsonb not null,
  alt jsonb not null,
  image_path text,
  cup_color text not null check (cup_color ~ '^#[0-9a-fA-F]{6}$'),
  cup_name jsonb not null,
  base_price_cents integer not null check (base_price_cents > 0),
  is_vegan boolean not null default false,
  is_available boolean not null default true,
  is_featured boolean not null default false,
  sort integer not null default 0,
  updated_at timestamptz not null default now()
);

create table option_groups (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name jsonb not null,
  selection text not null check (selection in ('single', 'multiple')),
  required boolean not null,
  sort integer not null default 0
);

create table options (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references option_groups on delete cascade,
  code text not null,
  name jsonb not null,
  price_delta_cents integer not null default 0,
  is_available boolean not null default true,
  sort integer not null default 0,
  unique (group_id, code)
);

create table product_option_groups (
  product_id uuid references products on delete cascade,
  group_id uuid references option_groups on delete cascade,
  default_option_id uuid references options,
  allowed_option_ids uuid[],
  primary key (product_id, group_id)
);
```

`allowed_option_ids` permite, por ejemplo, que Strawberry Matcha solo ofrezca la temperatura «Frío».

## Tienda

```sql
create table store_settings (
  id smallint primary key default 1 check (id = 1),
  timezone text not null default 'Europe/Madrid',
  prep_minutes integer not null default 15,
  slot_minutes integer not null default 15,
  slot_capacity integer not null default 8,
  schedule_days_ahead integer not null default 1,
  orders_paused boolean not null default false,
  delivery_enabled boolean not null default true,
  delivery_min_cents integer not null default 1200,
  delivery_fee_cents integer not null default 250,
  delivery_free_from_cents integer not null default 2500,
  delivery_last_order_minutes integer not null default 30,
  delivery_eta_min integer not null default 30,
  delivery_eta_max integer not null default 45,
  loyalty_stamps_required integer not null default 8,
  vat_rate_bp integer not null default 1000
);

create table opening_hours (
  weekday smallint primary key check (weekday between 0 and 6),
  opens_at time,
  closes_at time,
  check ((opens_at is null) = (closes_at is null))
);

create table closures (
  day date primary key,
  reason jsonb
);

create table delivery_zones (
  postal_code text primary key check (postal_code ~ '^\d{5}$'),
  is_active boolean not null default true
);

create table coupons (
  id uuid primary key default gen_random_uuid(),
  code citext unique not null,
  kind text not null check (kind in ('percent', 'amount')),
  value integer not null check (value > 0),
  min_subtotal_cents integer not null default 0,
  first_order_only boolean not null default false,
  max_uses integer,
  per_customer_limit integer default 1,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
```

## Pedidos

```sql
create table orders (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  customer_id uuid references profiles on delete set null,
  contact_name text not null,
  contact_email citext not null,
  contact_phone text not null,
  locale text not null check (locale in ('es', 'en')),
  fulfilment fulfilment_kind not null,
  scheduled_for timestamptz,
  slot_start timestamptz,
  delivery_address jsonb,
  notes text,
  status order_status not null default 'pending_payment',
  subtotal_cents integer not null,
  discount_cents integer not null default 0,
  delivery_fee_cents integer not null default 0,
  total_cents integer not null,
  vat_cents integer not null,
  coupon_id uuid references coupons,
  stamps_redeemed integer not null default 0,
  payment_intent_id text unique,
  paid_at timestamptz,
  refunded_cents integer not null default 0,
  tracking_token uuid not null default gen_random_uuid(),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((fulfilment = 'pickup') = (slot_start is not null)),
  check ((fulfilment = 'delivery') = (delivery_address is not null))
);
create index orders_board on orders (slot_start, status);
create index orders_customer on orders (customer_id, created_at desc);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders on delete cascade,
  product_id uuid references products on delete set null,
  product_name text not null,
  options jsonb not null,
  unit_price_cents integer not null,
  quantity integer not null check (quantity between 1 and 20),
  line_total_cents integer not null
);

create table order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references orders on delete cascade,
  status order_status not null,
  actor_id uuid references profiles on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create table coupon_redemptions (
  coupon_id uuid references coupons,
  order_id uuid references orders on delete cascade,
  customer_email citext not null,
  primary key (coupon_id, order_id)
);
```

`order_items` guarda una **copia** del nombre, las opciones y los precios: un pedido antiguo no cambia aunque el producto se edite o se borre.

## Funciones atómicas

| Función | Quién la llama | Qué hace |
| --- | --- | --- |
| `create_order(order jsonb, items jsonb)` | Servidor (`PlaceOrder`, clave de servicio) | Bloquea la franja con `pg_advisory_xact_lock`, comprueba la capacidad contando pedidos no cancelados ni caducados e inserta el pedido, sus líneas y el primer evento. Si no hay hueco, lanza `slot_full` |
| `confirm_payment(payment_intent text)` | Webhook (`ConfirmPayment`) | Idempotente. Pasa `pending_payment` a `received`, fija `paid_at`, registra el cupón, resta los sellos canjeados y suma los ganados |
| `advance_order_status(order_id uuid, next order_status)` | Panel (sesión de staff) | `security definer`. Comprueba `is_staff()` y la transición permitida, actualiza el pedido e inserta el evento |
| `expire_unpaid_orders()` | Cron cada 5 min | Pasa a `expired` los pedidos en `pending_payment` de más de 30 min |
| `delete_my_account()` | Cuenta del cliente | Anonimiza sus pedidos (nombre, email y teléfono) y borra el usuario de `auth.users` desde el servidor |

**Trigger en `orders`:** tras cada cambio de `status` emite un *broadcast* de Realtime al canal `order:<code>` con el estado y la hora. Así el seguimiento de un invitado no necesita leer la tabla.

## Políticas RLS

| Tabla | `select` | `insert` / `update` / `delete` |
| --- | --- | --- |
| `profiles` | Propio; staff todos | `update` propio, salvo `role` y `stripe_customer_id` (privilegios de columna); admin todo |
| `addresses`, `favourites`, `carts` | Propios | Propios |
| `loyalty_ledger` | Propio; staff todos | Solo funciones |
| `categories`, `products`, `option_groups`, `options`, `product_option_groups` | Todos | Admin |
| `store_settings`, `opening_hours`, `closures`, `delivery_zones` | Todos | Admin |
| `coupons`, `coupon_redemptions` | Admin | Admin; validación desde el servidor |
| `orders` | `customer_id = auth.uid()` o staff | Solo funciones y servidor |
| `order_items`, `order_events` | Si el pedido es visible | Solo funciones y servidor |

```sql
alter table orders enable row level security;

create policy "customers read their orders" on orders
  for select to authenticated
  using (customer_id = (select auth.uid()) or public.is_staff());

create policy "order items follow their order" on order_items
  for select to authenticated
  using (exists (
    select 1 from orders o
    where o.id = order_id and (o.customer_id = (select auth.uid()) or public.is_staff())
  ));

create policy "catalog is public" on products
  for select to anon, authenticated using (true);

create policy "admins manage the catalog" on products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

revoke update on profiles from authenticated;
grant update (full_name, phone, locale, marketing_opt_in) on profiles to authenticated;
```

## Datos de demostración (`seed.sql`)

- Las 6 bebidas actuales, los grupos de opciones del D-03, horario, zonas de reparto y cupones `BIENVENIDA10` y `MATCHAMIGO`.
- Cuentas de demostración `staff@demo.mori` (rol staff, solo tablero) y `cliente@demo.mori` (con historial y 5 sellos). Las contraseñas se documentan en el README.
- El cron de la demo crea pedidos `is_demo = true` a lo largo del día y los avanza de estado para que el tablero tenga movimiento.

## Tests de base de datos (pgTAP sobre PGlite)

- Un cliente no ve pedidos de otro y no puede cambiarse el rol.
- Un invitado (`anon`) no lee `orders`.
- El staff puede avanzar un pedido de `received` a `preparing`, pero no de `pending_payment` a `completed`.
- El staff no puede editar productos; el admin sí.
- `create_order` rechaza una franja llena aunque lleguen dos peticiones a la vez (se simula con dos transacciones).
- `confirm_payment` llamado dos veces suma los sellos una sola vez.
