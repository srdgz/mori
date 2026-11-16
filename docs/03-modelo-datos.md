# 03 · Modelo de datos

Postgres en Neon. El esquema se define con Drizzle en `src/infrastructure/db/schema` y estas son las tablas que genera. Los importes se guardan en **céntimos** (`integer`) y los textos traducibles en `jsonb` con las claves `es` y `en`.

## Diagrama

```
users 1─n sessions
  │   1─n accounts (email y contraseña, Google)
  │ 1─n addresses
  │ 1─n favourites n─1 products
  │ 1─1 carts
  │ 1─n loyalty_ledger
  │ 1─n orders 1─n order_items n─1 products
  │           1─n order_events
  │           n─1 coupons 1─n coupon_redemptions
categories 1─n products n─n option_groups (product_option_groups) 1─n options
store_settings (fila única) · opening_hours · closures · delivery_zones
verifications · rate_limits (uso interno de Better Auth y de los cupones)
```

## Tipos

```sql
create type app_role as enum ('customer', 'staff', 'admin');
create type fulfilment_kind as enum ('pickup', 'delivery');
create type order_status as enum (
  'pending_payment', 'received', 'preparing', 'ready', 'out_for_delivery',
  'completed', 'cancelled', 'refunded', 'expired'
);
```

## Usuarios y sesiones

Las tablas `users`, `sessions`, `accounts` y `verifications` son las de Better Auth, con nombres en plural y `uuid` como identificador. Los datos de perfil van como campos adicionales del usuario, así que no hace falta una tabla `profiles` aparte.

```sql
create table users (
  id uuid primary key,
  name text not null,
  email citext unique not null,
  email_verified boolean not null default false,
  image text,
  phone text,
  locale text not null default 'es' check (locale in ('es', 'en')),
  marketing_opt_in boolean not null default false,
  role app_role not null default 'customer',
  is_demo boolean not null default false,
  stripe_customer_id text unique,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table sessions (
  id uuid primary key,
  user_id uuid not null references users on delete cascade,
  token text unique not null,
  expires_at timestamptz not null,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table accounts (
  id uuid primary key,
  user_id uuid not null references users on delete cascade,
  account_id text not null,
  provider_id text not null,
  password text,
  access_token text,
  refresh_token text,
  id_token text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  scope text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table verifications (
  id uuid primary key,
  identifier text not null,
  value text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table rate_limits (
  key text primary key,
  count integer not null,
  last_request bigint not null
);
```

- **Campos protegidos:** `role`, `is_demo` y `stripe_customer_id` se declaran en Better Auth con `input: false`, así que ni el registro ni la edición de perfil pueden escribirlos.
- **Contraseñas:** Better Auth las guarda con hash en `accounts.password`.

## Datos del cliente

```sql
create table addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users on delete cascade,
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
  user_id uuid references users on delete cascade,
  product_id uuid references products on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table carts (
  user_id uuid primary key references users on delete cascade,
  lines jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

create table loyalty_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references users on delete cascade,
  order_id uuid references orders on delete set null,
  delta integer not null,
  reason text not null check (reason in ('purchase', 'redeem', 'refund', 'adjustment')),
  created_at timestamptz not null default now()
);
create view loyalty_balance as
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
  image_url text,
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

- `allowed_option_ids` permite, por ejemplo, que Strawberry Matcha solo ofrezca la temperatura «Frío».
- `image_url` apunta a una foto del repositorio (las seis actuales) o a una subida a Vercel Blob desde el panel.

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
  unpaid_hold_minutes integer not null default 30,
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
  customer_id uuid references users on delete set null,
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
create index orders_updated on orders (updated_at);

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
  actor_id uuid references users on delete set null,
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

- `order_items` guarda una **copia** del nombre, las opciones y los precios: un pedido antiguo no cambia aunque el producto se edite o se borre.
- `orders.updated_at` es la base del `ETag` del sondeo: el tablero y el seguimiento solo reciben datos cuando cambia.

## Funciones y triggers

Todas se llaman con una sola sentencia, así que son atómicas también con el driver HTTP de Neon.

| Función | Quién la llama | Qué hace |
| --- | --- | --- |
| `create_order(order jsonb, items jsonb)` | `PlaceOrder` | Bloquea la franja con `pg_advisory_xact_lock`, cuenta los pedidos que la ocupan (pagados, o sin pagar de menos de `unpaid_hold_minutes`) e inserta el pedido, sus líneas y el primer evento. Si no hay hueco, lanza `slot_full` |
| `confirm_payment(payment_intent text)` | `ConfirmPayment` (webhook) | Idempotente. Pasa `pending_payment` a `received`, fija `paid_at`, registra el cupón, resta los sellos canjeados y suma los ganados |
| `advance_order_status(order_id uuid, next order_status, actor uuid)` | `AdvanceOrderStatus` | Comprueba que la transición está permitida (la misma tabla que el dominio), actualiza el pedido e inserta el evento. El rol ya lo ha comprobado el caso de uso |
| `expire_unpaid_orders()` | `ExpireUnpaidOrders` (trabajo programado) | Pasa a `expired` los pedidos en `pending_payment` de más de 30 min |
| `anonymize_customer(user_id uuid)` | `DeleteAccount` | Anonimiza sus pedidos (nombre, email y teléfono) y marca `users.deleted_at`. Después Better Auth borra sesiones y cuentas |

**Trigger en `orders`:** mantiene `updated_at` al día en cada cambio.

## Permisos

No hay RLS porque el navegador nunca se conecta a la base de datos: todas las consultas pasan por casos de uso en el servidor. Las políticas viven en `src/core/domain/access` y se prueban al 100 %:

| Recurso | Leer | Crear / cambiar / borrar |
| --- | --- | --- |
| Perfil | Propio; staff todos | Propio, salvo `role`, `is_demo` y `stripe_customer_id`; admin todo |
| Direcciones, favoritos, carrito | Propios | Propios |
| Sellos | Propios; staff todos | Solo `confirm_payment` y reembolsos |
| Catálogo | Todos | Admin |
| Ajustes, horario, cierres, zonas | Todos | Admin |
| Cupones | Admin | Admin; el checkout los valida en el servidor |
| Pedidos | Propios, invitado con `tracking_token`, staff todos | Crear: cualquiera por `PlaceOrder`. Cambiar estado: staff. Reembolsar: admin |
| Clientes y panel de datos | Admin | — |

El staff de demo (`is_demo = true`) tiene los mismos permisos de lectura que el staff y además puede avanzar pedidos de demostración, pero ninguna acción de admin.

## Datos de demostración (`db/seed.ts`)

- Las 6 bebidas actuales, los grupos de opciones del D-03, horario, zonas de reparto y cupones `BIENVENIDA10` y `MATCHAMIGO`.
- Cuentas de demostración `staff@demo.mori` (rol staff, `is_demo`) y `cliente@demo.mori` (con historial y 5 sellos), creadas con la API de Better Auth para que las contraseñas lleven el mismo hash. Las contraseñas se documentan en el README.
- El trabajo programado de la demo crea pedidos `is_demo = true` a lo largo del día y los avanza de estado para que el tablero tenga movimiento.

## Tests de base de datos

Se ejecutan con Vitest sobre PGlite, con las migraciones reales aplicadas:

- Los repositorios de Drizzle pasan la misma batería de contratos que los de memoria.
- `advance_order_status` acepta de `received` a `preparing`, pero rechaza de `pending_payment` a `completed`.
- `confirm_payment` llamado dos veces suma los sellos una sola vez.
- Un pedido sin pagar de hace 31 minutos ya no ocupa su franja.
- `anonymize_customer` deja los pedidos sin datos personales y conserva los importes.

La prueba de concurrencia necesita dos conexiones reales: dos `create_order` a la vez sobre la última plaza de una franja, de los que solo uno debe entrar. Por eso se ejecuta en CI contra un servicio Postgres de GitHub Actions.
