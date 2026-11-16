# 02 · Arquitectura

## Visión general

```
Navegador ──▶ Next.js 16 en Vercel
               ├─ Server Components (páginas, lectura de datos)
               ├─ Server Actions (mutaciones validadas con zod)
               ├─ Route Handlers (Stripe, Better Auth, subida a Blob, Realtime y sondeo, trabajos programados)
               └─ proxy.ts (idioma y redirección temprana si no hay cookie de sesión)
                     │
                     ▼
               Casos de uso (src/core/application) ── políticas de acceso del dominio
                     │ puertos
     ┌───────────┬───┴────────┬───────────┬───────────┬─────────────┐
     ▼           ▼            ▼           ▼           ▼             ▼
  Postgres    Better Auth   Stripe      Resend     Vercel Blob   Reloj / IDs
  en Neon     (sesiones,    (PaymentIntents, (emails)  (fotos de
  (Drizzle)   Google)       webhooks,               producto)
                            reembolsos)

GitHub Actions (cada 15 min) ──▶ /api/cron/* (caducidad y pedidos de la demo)
```

## Capas

| Capa | Carpeta | Puede depender de | Contiene |
| --- | --- | --- | --- |
| Dominio | `src/core/domain` | Nada | Entidades, objetos de valor (`Money`, `Slot`, `PostalCode`), reglas, políticas de acceso y errores de dominio |
| Aplicación | `src/core/application` | Dominio | Casos de uso y puertos (interfaces) |
| Infraestructura | `src/infrastructure` | Dominio, aplicación | Adaptadores: Drizzle, Better Auth, Stripe, Resend, Vercel Blob, memoria |
| Composición | `src/composition` | Todas | Construye los casos de uso con sus adaptadores y el `Actor` de la sesión (servidor) |
| Presentación | `src/app`, `src/ui` | Aplicación (tipos), composición | Páginas, layouts, componentes, Server Actions, hooks de cliente |

Reglas, comprobadas con `eslint-plugin-boundaries` en CI:
- El dominio no importa nada de fuera de sí mismo, ni siquiera de `zod` o de Next.
- La presentación nunca importa `src/infrastructure`: pide los casos de uso a `src/composition`.
- El código de cliente (`"use client"`) nunca importa `src/composition` ni nada con secretos. Las mutaciones van por Server Actions.
- `server-only` protege los módulos de servidor.
- Solo `src/infrastructure/db` importa Drizzle, y solo `src/infrastructure/auth` importa Better Auth.

## Estructura de carpetas

```
src/
├─ app/
│  ├─ [locale]/
│  │  ├─ (brand)/            Páginas de marca y legales
│  │  ├─ (shop)/             Carta, producto, carrito, checkout, pedido
│  │  ├─ (account)/          Área de cliente (layout protegido)
│  │  └─ (admin)/            Panel (layout protegido por rol)
│  └─ api/
│     ├─ auth/[...all]/      Better Auth (sesión, Google, verificación)
│     ├─ stripe/webhook/
│     ├─ uploads/            Permiso de subida a Vercel Blob (solo admin)
│     ├─ orders/[code]/      Estado del pedido para el seguimiento (sondeo)
│     ├─ admin/board/        Tablero del día para el panel (sondeo)
│     ├─ live/[query]/       Sella consultas de Neon Realtime (pedido, tablero)
│     └─ cron/               expire-orders, demo-orders
├─ core/
│  ├─ domain/
│  │  ├─ access/             Actor, roles y políticas (quién puede hacer qué)
│  │  ├─ catalog/            Product, OptionGroup, Option, precio configurado
│  │  ├─ cart/               CartLine, Cart, totales
│  │  ├─ fulfilment/         Horario, franjas, capacidad, zonas, envío
│  │  ├─ ordering/           Order, OrderStatus (máquina de estados), código de recogida
│  │  ├─ promotions/         Coupon, LoyaltyCard
│  │  └─ shared/             Money, Locale, errores de dominio
│  └─ application/
│     ├─ ports/              CatalogRepository, OrderRepository, SettingsRepository,
│     │                      CustomerRepository, PaymentGateway, Mailer, FileStorage,
│     │                      RateLimiter, Clock, IdGenerator
│     ├─ catalog/            GetMenu, GetProduct, UpsertProduct, SetAvailability
│     ├─ checkout/           QuoteCart, GetPickupSlots, CheckDeliveryZone, ApplyCoupon,
│     │                      PlaceOrder, ConfirmPayment
│     ├─ orders/             GetOrder, ListCustomerOrders, AdvanceOrderStatus,
│     │                      CancelOrder, RefundOrder, Reorder, ExpireUnpaidOrders
│     ├─ account/            UpdateProfile, Manage addresses, ToggleFavourite, DeleteAccount
│     └─ admin/              GetBoard, GetDashboardStats, UpdateSettings, ManageCoupons
├─ infrastructure/
│  ├─ db/                    Cliente de Neon, esquema de Drizzle y repositorios
│  ├─ auth/                  Configuración de Better Auth y lectura de la sesión
│  ├─ stripe/                StripePaymentGateway, verificación del webhook
│  ├─ mail/                  ResendMailer, buzón para E2E, consola y plantillas HTML
│  ├─ blob/                  VercelBlobStorage
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
db/
├─ migrations/               SQL versionado (generado por drizzle-kit y funciones a mano)
├─ migrate.ts / seed.ts      Scripts que aplican las migraciones y cargan los datos iniciales
src/infrastructure/db/       Esquema, repositorios, seed y sus tests (contratos, funciones SQL, concurrencia)
e2e/                         Playwright
.github/workflows/           ci.yml y scheduled.yml (trabajos programados)
```

## Puertos principales

```ts
type Actor =
  | { kind: "guest" }
  | { kind: "customer"; id: UserId }
  | { kind: "staff"; id: UserId; demo: boolean }
  | { kind: "admin"; id: UserId };

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
  forCustomer(customerId: UserId, page: Page): Promise<Paginated<OrderSummary>>;
  board(day: LocalDate): Promise<{ orders: OrderSummary[]; version: string }>;
  transition(id: OrderId, to: OrderStatus, by: UserId | null): Promise<Order>;
  slotLoad(day: LocalDate): Promise<Map<SlotStart, number>>;
}

interface PaymentGateway {
  createIntent(input: { orderId: OrderId; amount: Money; customer?: StripeCustomerRef; email: string }): Promise<{ id: string; clientSecret: string }>;
  refund(paymentIntentId: string, amount?: Money): Promise<void>;
  parseWebhook(rawBody: string, signature: string): PaymentEvent;
}

interface FileStorage {
  uploadPermission(input: { pathname: string; contentTypes: string[]; maxBytes: number }): Promise<UploadPermission>;
  remove(url: string): Promise<void>;
}

interface Mailer {
  send(message: TransactionalEmail): Promise<void>;
}

interface Clock {
  now(): Date;
}
```

## Caso de uso de ejemplo: `PlaceOrder`

1. Recibe el `Actor` y las líneas `{productId, optionIds, quantity}`, modalidad, contacto, cupón y sellos a canjear.
2. Comprueba la política: los pedidos online no están en pausa, y solo un cliente con sesión puede canjear sellos.
3. Carga los productos con `CatalogRepository.byIds` y **recalcula el precio** con el dominio; ignora cualquier precio que venga del cliente.
4. Valida la modalidad con el dominio y los ajustes:
   - **Recogida:** franja dentro de horario, con antelación suficiente y con capacidad libre (`slotLoad`).
   - **Reparto:** código postal en zona, pedido mínimo y hora de cierre.
5. Aplica el cupón y los sellos, y calcula envío, total e IVA desglosado.
6. Crea el pedido en `pending_payment` con `OrderRepository.create`, que llama a la función SQL `create_order`. Esa función bloquea la franja para evitar sobreventa.
7. Crea el PaymentIntent con `PaymentGateway.createIntent` y guarda su id en el pedido.
8. Devuelve `clientSecret`, código y total para el Payment Element.

Los tests de este caso de uso usan los adaptadores en memoria y un `Clock` fijo. Cubren, por ejemplo:
- Que el precio enviado por el cliente se ignore.
- Que una franja llena se rechace.
- Que un pedido de 11,90 € a domicilio se rechace.
- Que el envío gratis se aplique a partir de 25 € exactos.
- Que un invitado no pueda canjear sellos.

## Sesión y autorización

- **Better Auth** guarda la sesión en la tabla `sessions` y la identifica con una cookie `httpOnly`, `secure` y `sameSite=lax`. El plugin `nextCookies` permite iniciar y cerrar sesión desde Server Actions.
- **`proxy.ts`** solo comprueba si existe la cookie, sin consultar la base de datos, para redirigir pronto a `/cuenta/entrar`. No decide nada de seguridad.
- **Composición:** `container.ts` lee la sesión en el servidor (`auth.api.getSession`) y la convierte en un `Actor`. Los layouts de `(account)` y `(admin)` redirigen si el `Actor` no tiene el rol necesario.
- **Políticas de dominio:** cada caso de uso llama a `authorize(actor, action, resource)` antes de actuar. Así se cubren casos como:
  - Un cliente solo ve sus pedidos.
  - El staff cambia estados, pero no productos ni ajustes.
  - La cuenta compartida de staff de demo no puede cambiar su email ni su contraseña.
  - Un invitado necesita el `tracking_token` del enlace para ver su pedido.
- **Consultas:** los repositorios filtran siempre por el usuario de la sesión, nunca por un id que llegue del navegador.
- **Rol:** campo `role` del usuario, declarado en Better Auth como no editable por el cliente. Solo lo cambia el seed o un admin.

## Pagos

- **Creación:** el PaymentIntent se crea en `PlaceOrder`, y el Payment Element se monta con su `clientSecret` y la Appearance API de MŌRI.
- **Confirmación:** al confirmar, Stripe redirige a `/pedido/[codigo]?payment_intent=…`, y la página muestra «procesando» hasta que llega el webhook.
- **Webhook:** se ejecuta en Node (`runtime = "nodejs"`) y lee el cuerpo sin procesar para verificar la firma. Llama a `ConfirmPayment`, que es idempotente: si el pedido ya está `received`, no hace nada.
- **`payment_intent.payment_failed`:** deja el pedido en `pending_payment` para reintentar.
- **Caducidad:** un pedido sin pagar deja de ocupar su franja a los 30 minutos, porque `slotLoad` lo ignora. El trabajo programado lo pasa después a `expired`.

## Actualización en directo (Neon Realtime con sondeo de respaldo)

Un puerto de presentación, `LiveQuery`, tiene dos adaptadores con la misma interfaz. La pantalla no sabe cuál está usando.

### Neon Realtime (principal)

1. La página pide `POST /api/live/[query]` (por ejemplo `order` o `board`).
2. El Route Handler obtiene el `Actor`, comprueba la política con el mismo caso de uso que la lectura normal y construye un `SELECT` con Drizzle, filtrado por el pedido o por el día recibido como parámetro (Realtime no admite `now()`).
3. Lo sella con `NEON_REALTIME_SECRET` (`@neon/realtime` y su adaptador de Drizzle) y devuelve el sellado y la URL de Realtime.
4. El navegador se suscribe con `@neon/realtime/client`: recibe las filas actuales y después cada cambio, que actualiza la caché de TanStack Query.
5. El sellado caduca a los 60 segundos y el cliente lo renueva con el mismo endpoint, que vuelve a comprobar la sesión.

Notas:
- **Orígenes:** solo se aceptan los de la web, configurados en `allowedOrigins` de Neon.
- **Seguridad:** el secreto nunca llega al navegador, y el cliente no puede cambiar la consulta ni sus parámetros.
- **Base de datos:** las tablas no usan RLS, que Realtime no admite. Activarlo pone `wal_level` en `logical` para todo el proyecto.
- **Consumo:** las suscripciones abiertas no mantienen despierta la base de datos; solo la despierta empezar una consulta en directo.

### Sondeo (respaldo)

Se usa cuando no hay `NEON_REALTIME_URL` (CI, PGlite en local, una vista previa sin Realtime) o cuando la suscripción no conecta.

| Pantalla | Endpoint | Intervalo | Se para |
| --- | --- | --- | --- |
| Tablero del panel | `GET /api/admin/board?day=…` | 5 s | Con la pestaña en segundo plano |
| Seguimiento con sesión | `GET /api/orders/[code]` | 10 s | Al llegar a `completed`, `cancelled`, `refunded` o `expired` |
| Seguimiento de invitado | `GET /api/orders/[code]?t=<tracking_token>` | 10 s | Igual |

- **Sin cambios, sin datos:** cada respuesta lleva un `ETag` calculado con el `updated_at` más reciente. Si nada ha cambiado, el servidor contesta `304` sin cuerpo.

### Común

- **Panel:** el aviso sonoro y la animación de tarjeta nueva se disparan al comparar los datos nuevos con los anteriores, vengan de Realtime o del sondeo.
- **Tests:** los E2E se ejecutan con el sondeo, porque CI usa un Postgres sin Realtime. Un test comprueba además que el endpoint de sellado rechaza a quien no puede ver el pedido.

## Base de datos y despliegue

- **Driver:** `pg` con un pool por función (`attachDatabasePool` de Vercel). En tests, PGlite con las mismas migraciones, y `npm run db:local` levanta un servidor PGlite para la build y los E2E en local sin Neon.
- **Migraciones:** `drizzle-kit generate` crea el SQL a partir del esquema, y las funciones y triggers se escriben como migraciones SQL a mano. `npm run db:migrate` las aplica con la conexión directa (`DATABASE_URL_UNPOOLED`).
- **En Vercel:** el comando de build ejecuta `db:migrate` y `db:seed` antes de `next build` (`npm run vercel-build`). Con la integración de Neon, cada vista previa recibe su propia rama de base de datos, así que la migración de una pull request nunca toca producción. Las ramas de vistas previas antiguas se borran para no superar el límite del plan gratuito.
- **Seed:** `npm run db:seed` carga el catálogo, los ajustes, las zonas y los cupones (las cuentas de demo llegan en la Fase 3). Solo inserta lo que falta, así que se puede ejecutar en cada build sin pisar los cambios hechos desde el panel.

## Rendimiento

- **Páginas de marca y carta:** Server Components estáticos. Solo son cliente las animaciones (GSAP y Lenis cargados cuando el navegador está libre y el usuario no ha pedido reducir el movimiento) y el botón «Añadir».
- **Sin consultas en las páginas estáticas:** la carta se genera al compilar y se regenera con `revalidateTag` cuando el panel cambia el catálogo. Por eso la pausa de Neon tras un rato sin uso no afecta a la web pública.
- **Recursos:** `next/font` para Space Grotesk y DM Sans (autoalojadas, con `preload`). `next/image` con AVIF y WebP y `priority` en el hero.
- **Stripe.js:** se carga solo en `/checkout`.
- **Presupuesto de JS por ruta:** comprobado en CI.

## Variables de entorno

| Variable | Dónde | Uso |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Ambos | URL canónica |
| `DATABASE_URL` | Servidor | Conexión a Neon con pooling (la crea la integración de Vercel) |
| `DATABASE_URL_UNPOOLED` | Servidor | Conexión directa para las migraciones |
| `BETTER_AUTH_SECRET` | Servidor | Firma de las sesiones |
| `BETTER_AUTH_URL` | Servidor | URL base de la autenticación |
| `GOOGLE_CLIENT_ID` | Servidor | Inicio de sesión con Google |
| `GOOGLE_CLIENT_SECRET` | Servidor | Inicio de sesión con Google |
| `BLOB_READ_WRITE_TOKEN` | Servidor | Vercel Blob (lo crea Vercel) |
| `NEON_REALTIME_URL` | Servidor | URL de Realtime de la rama; se pasa a la página desde el servidor |
| `NEON_REALTIME_SECRET` | Servidor | Sella las consultas en directo. Sin estas dos variables se usa el sondeo |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Ambos | Payment Element (`pk_test_…`) |
| `STRIPE_SECRET_KEY` | Servidor | PaymentIntents y reembolsos (`sk_test_…`) |
| `STRIPE_WEBHOOK_SECRET` | Servidor | Firma del webhook (`whsec_…`) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` | Servidor | Envío por SMTP (Gmail con contraseña de aplicación). Tiene prioridad sobre Resend |
| `RESEND_API_KEY` | Servidor | Alternativa a SMTP, útil con dominio propio |
| `MAIL_FROM` | Servidor | Remitente |
| `CRON_SECRET` | Servidor y GitHub | Protege `/api/cron/*` |

El repo incluye `.env.example` con estos nombres y sin valores.
