# 02 · Arquitectura

## Visión general

```
Navegador ──▶ Next.js 16 en Vercel
               ├─ Server Components (páginas, lectura de datos)
               ├─ Server Actions (mutaciones validadas con zod)
               ├─ Route Handlers (webhook de Stripe, cron de la demo, callback de auth)
               └─ proxy.ts (refresca la sesión de Supabase y resuelve el idioma)
                     │
                     ▼
               Casos de uso (src/core/application)
                     │ puertos
          ┌──────────┼───────────┬─────────────┐
          ▼          ▼           ▼             ▼
       Supabase    Stripe      Resend     Reloj / IDs
   (Postgres+RLS,  (PaymentIntents,  (emails)
   Auth, Realtime,  webhooks,
   Storage)         reembolsos)
```

## Capas

| Capa | Carpeta | Puede depender de | Contiene |
| --- | --- | --- | --- |
| Dominio | `src/core/domain` | Nada | Entidades, objetos de valor (`Money`, `Slot`, `PostalCode`), reglas y errores de dominio |
| Aplicación | `src/core/application` | Dominio | Casos de uso y puertos (interfaces) |
| Infraestructura | `src/infrastructure` | Dominio, aplicación | Adaptadores: Supabase, Stripe, Resend, memoria |
| Composición | `src/composition` | Todas | Construye los casos de uso con sus adaptadores (servidor) |
| Presentación | `src/app`, `src/ui` | Aplicación (tipos), composición | Páginas, layouts, componentes, Server Actions, hooks de cliente |

Reglas, comprobadas con `eslint-plugin-boundaries` en CI:
- El dominio no importa nada de fuera de sí mismo, ni siquiera de `zod` o de Next.
- La presentación nunca importa `src/infrastructure`: pide los casos de uso a `src/composition`.
- El código de cliente (`"use client"`) nunca importa `src/composition` ni nada con secretos. Las mutaciones van por Server Actions.
- `server-only` protege los módulos de servidor.

## Estructura de carpetas

```
src/
├─ app/
│  ├─ [locale]/
│  │  ├─ (brand)/            Páginas de marca y legales
│  │  ├─ (shop)/             Carta, producto, carrito, checkout, pedido
│  │  ├─ (account)/          Área de cliente (layout protegido)
│  │  └─ (admin)/            Panel (layout protegido por rol)
│  ├─ api/stripe/webhook/route.ts
│  ├─ api/cron/demo-orders/route.ts
│  └─ auth/callback/route.ts
├─ core/
│  ├─ domain/
│  │  ├─ catalog/            Product, OptionGroup, Option, precio configurado
│  │  ├─ cart/               CartLine, Cart, totales
│  │  ├─ fulfilment/         Horario, franjas, capacidad, zonas, envío
│  │  ├─ ordering/           Order, OrderStatus (máquina de estados), código de recogida
│  │  ├─ promotions/         Coupon, LoyaltyCard
│  │  └─ shared/             Money, Locale, errores de dominio
│  └─ application/
│     ├─ ports/              CatalogRepository, OrderRepository, SettingsRepository,
│     │                      CustomerRepository, PaymentGateway, Mailer, Clock, IdGenerator
│     ├─ catalog/            GetMenu, GetProduct, UpsertProduct, SetAvailability
│     ├─ checkout/           QuoteCart, GetPickupSlots, CheckDeliveryZone, ApplyCoupon,
│     │                      PlaceOrder, ConfirmPayment
│     ├─ orders/             GetOrder, ListCustomerOrders, AdvanceOrderStatus,
│     │                      CancelOrder, RefundOrder, Reorder
│     ├─ account/            UpdateProfile, Manage addresses, ToggleFavourite, DeleteAccount
│     └─ admin/              GetDashboardStats, UpdateSettings, ManageCoupons
├─ infrastructure/
│  ├─ supabase/              Clientes (servidor, navegador, servicio) y repositorios
│  ├─ stripe/                StripePaymentGateway, verificación del webhook
│  ├─ resend/                ResendMailer y plantillas React Email
│  └─ memory/                Repositorios y pasarela en memoria (tests y demo)
├─ composition/              container.ts (servidor)
├─ ui/
│  ├─ brand/                 Componentes de la web de marca (hero, marquee, wave…)
│  ├─ shop/                  Configurador, carrito, checkout, seguimiento
│  ├─ account/
│  ├─ admin/
│  ├─ motion/                Hooks de GSAP y Lenis
│  └─ primitives/            Button, Field, Dialog, Sheet, Tabs, Toast, Badge…
├─ i18n/                     next-intl: rutas traducidas, mensajes es.json / en.json
└─ styles/                   Tailwind 4 con los tokens de marca actuales
supabase/
├─ migrations/               SQL versionado
├─ seed.sql                  Catálogo, ajustes, cupones y usuarios de demo
└─ tests/                    pgTAP
e2e/                         Playwright
```

## Puertos principales

```ts
interface CatalogRepository {
  menu(locale: Locale): Promise<Product[]>;
  bySlug(slug: string, locale: Locale): Promise<Product | null>;
  byIds(ids: ProductId[]): Promise<Product[]>;
  save(product: ProductDraft): Promise<Product>;
  setAvailability(id: ProductId, available: boolean): Promise<void>;
}

interface OrderRepository {
  create(order: NewOrder): Promise<Order>;
  byId(id: OrderId): Promise<Order | null>;
  byCode(code: PickupCode): Promise<Order | null>;
  byPaymentIntent(id: string): Promise<Order | null>;
  forCustomer(customerId: CustomerId, page: Page): Promise<Paginated<OrderSummary>>;
  board(day: LocalDate): Promise<OrderSummary[]>;
  transition(id: OrderId, to: OrderStatus, by: ActorId | null): Promise<Order>;
  slotLoad(day: LocalDate): Promise<Map<SlotStart, number>>;
}

interface PaymentGateway {
  createIntent(input: { orderId: OrderId; amount: Money; customer?: StripeCustomerRef; email: string }): Promise<{ id: string; clientSecret: string }>;
  refund(paymentIntentId: string, amount?: Money): Promise<void>;
  parseWebhook(rawBody: string, signature: string): PaymentEvent;
}

interface Mailer {
  send(message: TransactionalEmail): Promise<void>;
}

interface Clock {
  now(): Date;
}
```

## Caso de uso de ejemplo: `PlaceOrder`

1. Recibe líneas `{productId, optionIds, quantity}`, modalidad, contacto, cupón y sellos a canjear.
2. Carga los productos con `CatalogRepository.byIds` y **recalcula el precio** con el dominio; ignora cualquier precio que venga del cliente.
3. Valida la modalidad con el dominio y los ajustes:
   - **Recogida:** franja dentro de horario, con antelación suficiente y con capacidad libre (`slotLoad`).
   - **Reparto:** código postal en zona, pedido mínimo y hora de cierre.
4. Aplica el cupón y los sellos, y calcula envío, total e IVA desglosado.
5. Crea el pedido en `pending_payment` con `OrderRepository.create`, en una función SQL que bloquea la franja para evitar sobreventa.
6. Crea el PaymentIntent con `PaymentGateway.createIntent` y guarda su id en el pedido.
7. Devuelve `clientSecret`, código y total para el Payment Element.

Los tests de este caso de uso usan los adaptadores en memoria y un `Clock` fijo. Cubren, por ejemplo:
- Que el precio enviado por el cliente se ignore.
- Que una franja llena se rechace.
- Que un pedido de 11,90 € a domicilio se rechace.
- Que el envío gratis se aplique a partir de 25 € exactos.

## Sesión y autorización

- `@supabase/ssr` con cookies. `proxy.ts` refresca el token en cada petición.
- Los layouts de `(account)` y `(admin)` leen el usuario en el servidor y redirigen si no hay sesión o rol suficiente.
- El rol vive en `profiles.role` y se replica en el JWT (`app_metadata.role`) mediante un *custom access token hook* de Supabase, para que la RLS lo lea sin consultas extra.
- **Toda la seguridad real está en la RLS:** aunque se saltara la interfaz, un cliente solo puede leer sus pedidos y el staff solo puede cambiar estados.

## Pagos

- **Creación:** el PaymentIntent se crea en `PlaceOrder`, y el Payment Element se monta con su `clientSecret` y la Appearance API de MŌRI.
- **Confirmación:** al confirmar, Stripe redirige a `/pedido/[codigo]?payment_intent=…`, y la página muestra «procesando» hasta que llega el webhook.
- **Webhook:** se ejecuta en Node (`runtime = "nodejs"`) y lee el cuerpo sin procesar para verificar la firma. Llama a `ConfirmPayment`, que es idempotente: si el pedido ya está `received`, no hace nada.
- **`payment_intent.payment_failed`:** deja el pedido en `pending_payment` para reintentar.
- **Caducidad:** los pedidos sin pagar caducan a los 30 minutos (trabajo programado) y liberan su franja.

## Tiempo real

- **Panel:** el tablero se suscribe a `orders` filtrado por día, con políticas de Realtime que solo dejan pasar al staff.
- **Seguimiento:**
  - El cliente con sesión se suscribe a su pedido por `id`.
  - El invitado usa un canal *broadcast* por código, que alimenta un trigger tras cada cambio de estado, para no exponer la tabla.

## Rendimiento

- **Páginas de marca y carta:** Server Components estáticos. Solo son cliente las animaciones (GSAP y Lenis cargados con `dynamic` cuando el usuario no ha pedido reducir el movimiento) y el botón «Añadir».
- **Recursos:** `next/font` para Space Grotesk y DM Sans (autoalojadas, con `preload`). `next/image` con AVIF y WebP y `priority` en el hero.
- **Stripe.js:** se carga solo en `/checkout`.
- **Presupuesto de JS por ruta:** comprobado en CI.

## Variables de entorno

| Variable | Dónde | Uso |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Ambos | URL canónica |
| `NEXT_PUBLIC_SUPABASE_URL` | Ambos | Proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Ambos | Clave publicable |
| `SUPABASE_SECRET_KEY` | Servidor | Webhook, cron, eliminar cuenta |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Ambos | Payment Element (`pk_test_…`) |
| `STRIPE_SECRET_KEY` | Servidor | PaymentIntents y reembolsos (`sk_test_…`) |
| `STRIPE_WEBHOOK_SECRET` | Servidor | Firma del webhook (`whsec_…`) |
| `RESEND_API_KEY` | Servidor | Emails |
| `MAIL_FROM` | Servidor | Remitente |
| `CRON_SECRET` | Servidor | Protege el cron de la demo |

El repo incluye `.env.example` con estos nombres y sin valores.
