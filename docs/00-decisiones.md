# 00 · Decisiones

MŌRI pasa de web de marca a tienda online completa: pedidos para recoger en tienda o con reparto propio, pago con Stripe, cuentas de cliente y panel de tienda. Este documento recoge las decisiones de producto y técnicas. Todas quedaron aprobadas el 14/11/2026.

Documentos relacionados: [01 · Alcance y mapa](01-alcance.md) · [02 · Arquitectura](02-arquitectura.md) · [03 · Modelo de datos](03-modelo-datos.md) · [04 · Flujos](04-flujos.md) · [05 · Fases](05-fases.md)

## Ya decidido

| Tema | Decisión |
| --- | --- |
| Pago | Stripe **Payment Element** integrado en la web con la estética de MŌRI (modo de prueba) |
| Entrega | Recogida en tienda a una hora elegida, o **reparto propio** «Envío MŌRI» |
| Pedidos | **Panel de tienda** con base de datos (Supabase) |
| Cuentas | Registro, inicio de sesión, perfil, direcciones e historial de pedidos |
| Objetivo | Producto completo presentable como proyecto fullstack, sin perder el nivel de diseño actual |

## Producto

### D-01 · Pedido como invitado o con cuenta — Aprobada
Se puede comprar **sin cuenta**, solo con nombre, email y teléfono, como en la mayoría de tiendas actuales. La cuenta es opcional y ofrece historial, direcciones guardadas, repetir pedido y favoritos. Después de pagar como invitado se ofrece crear la cuenta con un clic, y el pedido queda vinculado a ella.
Un invitado sigue su pedido con un enlace firmado que recibe por email y que aparece en la página de confirmación.

### D-02 · Catálogo en base de datos — Aprobada
Bebidas, categorías y opciones pasan de `data/menu.ts` a Supabase para que la tienda las gestione desde el panel: precio, disponibilidad («agotado hoy»), destacados y orden.
Las fotos se suben a Supabase Storage desde el panel y se sirven optimizadas con `next/image`.
Las páginas de la carta se generan estáticas y se regeneran (`revalidateTag`) cuando el panel cambia el catálogo.

### D-03 · Personalización de bebidas — Aprobada
Grupos de opciones configurables por producto:

| Grupo | Tipo | Ejemplos |
| --- | --- | --- |
| Tamaño | Obligatorio, uno | Normal 350 ml · Grande 470 ml (+0,90 €) |
| Temperatura | Obligatorio, uno (solo bebidas que lo permiten) | Frío · Caliente |
| Bebida base | Obligatorio, uno | Leche · Avena · Almendra · Coco · Soja (+0,40 €) |
| Dulzor | Obligatorio, uno | Sin azúcar · Poco · Normal |
| Extras | Opcional, varios | Shot de matcha (+1,00 €) · Cold foam (+0,80 €) · Sirope de vainilla (+0,50 €) |

Cada línea del carrito guarda las opciones elegidas y su precio, y el servidor lo recalcula siempre.

### D-04 · Recogida en tienda — Aprobada
- Franjas de **15 minutos** dentro del horario, desde «lo antes posible» hasta el cierre menos 15 minutos.
- **Tiempo mínimo de preparación** de 15 minutos desde el pago.
- **Capacidad por franja:** 8 pedidos. Las franjas llenas aparecen deshabilitadas.
- Se puede programar para hoy o mañana.
- La hora siempre es la de Madrid y el servidor vuelve a validar la franja antes de cobrar.

### D-05 · Reparto propio «Envío MŌRI» — Aprobada
- **Zona por código postal:** 28004 (Malasaña), 28005, 28010, 28012, 28013, 28015.
- **Pedido mínimo:** 12 €.
- **Gastos de envío:** 2,50 €, gratis a partir de 25 €.
- **Tiempo estimado:** 30–45 min, o una franja de 30 minutos si se programa.
- El reparto cierra 30 minutos antes que la tienda.
- La dirección se comprueba contra la zona antes de mostrar el pago.

El reparto es simulado: el panel marca «En reparto» y «Entregado» a mano y el cliente lo ve en directo.

### D-06 · Estados del pedido — Aprobada
`pendiente de pago` → `recibido` → `en preparación` → `listo para recoger` / `en reparto` → `completado`

Estados laterales: `cancelado` (antes de prepararse) y `reembolsado` (total o parcial, desde el panel con la API de Stripe).
Cada cambio queda en un historial con fecha, que forma la línea de tiempo del seguimiento.

### D-07 · Seguimiento en directo — Aprobada
- Página de pedido con línea de tiempo animada, hora estimada y código de recogida corto (por ejemplo, `MR-4F7K`).
- Se actualiza en tiempo real con Supabase Realtime, sin recargar.

### D-08 · Panel de tienda — Aprobada
Roles `customer`, `staff` y `admin`.

- **Pedidos (staff):** tablero en directo por columnas (Nuevos · En preparación · Listos / En reparto · Completados), con aviso sonoro opcional al entrar un pedido, detalle, cambio de estado y ticket imprimible.
- **Productos (admin):** crear, editar, ordenar, subir foto, precio, opciones y disponibilidad.
- **Ajustes (admin):** horario, días cerrados, capacidad por franja, tiempo de preparación, zonas y tarifas de reparto, pausar pedidos online.
- **Panel de datos (admin):** ventas de hoy y de la semana, ticket medio, bebidas más vendidas, reparto frente a recogida y ventas por hora.
- **Cupones (admin):** código, porcentaje o importe, mínimo, caducidad y usos.
- **Reembolsos (admin).**

### D-09 · Cuenta de cliente — Aprobada
- **Acceso:**
  - Registro con email y contraseña, con confirmación por email.
  - Inicio de sesión con email y contraseña o con **Google**.
  - Recuperar contraseña.
- **Perfil:** nombre, teléfono, idioma preferido y consentimiento de comunicaciones.
- **Direcciones guardadas**, con una predeterminada.
- **Pedidos:** historial con estado, detalle y botón «Repetir pedido».
- **Favoritos.**
- **Tarjeta de sellos (D-10, Fase 8).**
- **Eliminar cuenta:** borra los datos personales y anonimiza los pedidos, que se conservan por obligación contable (RGPD).

### D-10 · Fidelización «Tarjeta MŌRI» — Aprobada
Cada bebida pagada suma un sello. Con 8 sellos la siguiente bebida es gratis, y se canjea en el checkout como un descuento.
Es una pieza muy visual para el portfolio (tarjeta con sellos animados) y típica de las cafeterías de especialidad.
**Prioridad baja:** el modelo de datos la contempla desde el principio (`loyalty_ledger`), pero la interfaz y el canje se construyen en la Fase 8, después del lanzamiento.

### D-11 · Cupones — Aprobada
- Un cupón por pedido, que el servidor valida y Stripe cobra ya descontado.
- Cupones de demostración: `BIENVENIDA10` (10 % en el primer pedido) y `MATCHAMIGO` (2 € desde 15 €).

### D-12 · Emails transaccionales — Aprobada
- **Mensajes:** confirmación de pedido, pedido listo para recoger, pedido en reparto y reembolso. Se diseñan con React Email en la estética de MŌRI y se envían con **Resend**.
- **Emails de autenticación de Supabase:** también por Resend como SMTP personalizado.
- **Limitación sin dominio propio:** Resend solo entrega al email de la cuenta, lo que basta para la demo. Con un dominio verificado llegan a cualquiera.

### D-13 · Modo demo para quien revise el portfolio — Aprobada
- **Panel de tienda:** la portada y el README ofrecen **«Ver el panel de tienda (demo)»**. Entra con una cuenta `staff` de demostración que ve pedidos reales de prueba, pero no puede cambiar ajustes ni productos. Las acciones de admin se muestran deshabilitadas con una explicación.
- **Pedidos de ejemplo:** un trabajo programado genera algunos cada día para que el tablero nunca esté vacío.
- **Pagos:** cualquiera puede pagar con la tarjeta de prueba `4242 4242 4242 4242`. Un aviso fijo en el checkout lo explica.
- **Por qué:** la compra como invitado ya permite probar la parte del cliente, pero el panel de tienda solo lo ve el personal. Sin una cuenta de demostración, la pieza más completa del proyecto quedaría oculta para quien revise el portfolio. Se mantiene en su versión ligera: una cuenta `staff` de solo tablero y pedidos de ejemplo.

### D-14 · Páginas legales — Aprobada
- **Páginas:** Aviso legal, Privacidad, Cookies, y Condiciones de venta con devoluciones, en ES y EN, adaptadas a una marca ficticia.
- **Cookies:** solo se usan cookies técnicas (sesión y carrito), así que no hace falta banner de consentimiento. Si más adelante se añade analítica, se incorporaría el banner.

### D-15 · Páginas de producto — Aprobada
- **Ruta:** cada bebida tiene su página (`/carta/classic-matcha`, `/en/menu/classic-matcha`).
- **Contenido:** foto grande, descripción, opciones, «Añadir al carrito», bebidas relacionadas y datos estructurados `Product` para buscadores.
- **Tecnología:** son páginas estáticas (`generateStaticParams`), regeneradas cuando cambia el catálogo.

### D-16 · Carrito — Aprobada
- **Interfaz:** panel lateral accesible, abierto desde un icono con contador en la cabecera, y página `/carrito` como alternativa.
- **Persistencia:** el carrito se guarda en el navegador. Al iniciar sesión se fusiona con el guardado en la cuenta, así que el mismo carrito está en el móvil y en el ordenador.
- **Avisos:** se avisa si una bebida se agota o su precio cambia antes de pagar.

## Técnicas

### D-17 · Next.js 16 con App Router en Vercel — Aprobada
Se migra de Astro a **Next.js 16** (React 19, App Router, TypeScript estricto).

| | Astro + islas de React | Next.js 16 |
| --- | --- | --- |
| Páginas de marca | Sin JS de framework (96–100) | React en todas las páginas: hay que cuidarlas para mantener ≥ 90 |
| Cuenta, checkout y panel | Islas sueltas, cada navegación recarga | Navegación de app, layouts persistentes, estado compartido |
| Servidor | Actions y endpoints | Server Components, Server Actions, Route Handlers, `proxy` |
| Valor para un portfolio fullstack | Menos habitual | El estándar más pedido |

**Rendimiento de las páginas de marca:** son Server Components con la mínima parte cliente posible (animaciones), así que se mantiene un objetivo de ≥ 90 en móvil y 100 en el resto.

**Coste de la migración:** la web actual son unas 2.500 líneas.
- Las plantillas pasan a JSX casi literalmente, porque Tailwind y el HTML se conservan.
- `ui.ts` y `motion.ts` pasan a hooks de cliente (`useGSAP`, Lenis para React).
- Las rutas traducidas pasan a `next-intl`, las imágenes a `next/image` y las fuentes a `next/font`.

Es la Fase 1 (ver [05 · Fases](05-fases.md)) y termina con la web idéntica a la actual.

### D-18 · Server Components por defecto, cliente solo donde hay interacción — Aprobada
- **Por defecto:** las páginas y la carga de datos son Server Components.
- **Componentes de cliente (`"use client"`):** carrito, configurador de bebida, checkout con Payment Element, formularios, panel en directo y animaciones.
- **Mutaciones:** **Server Actions** con validación **zod**. Los Route Handlers quedan solo para el webhook de Stripe y el trabajo programado de la demo.
- **Estado del carrito:** un store ligero de cliente (**Zustand**) persistido en `localStorage`.
- **Datos del servidor en cliente:** el panel en directo usa **TanStack Query** con Realtime de Supabase.

### D-19 · Clean architecture — Aprobada
Cuatro capas con dependencias solo hacia dentro. Detalle en [02 · Arquitectura](02-arquitectura.md).

1. **Dominio** (`src/core/domain`): entidades y reglas puras. Precios, opciones, franjas, zonas, cupones, sellos y máquina de estados del pedido. Sin dependencias.
2. **Aplicación** (`src/core/application`): casos de uso (`PlaceOrder`, `ConfirmPayment`, `GetPickupSlots`, `AdvanceOrderStatus`…) que dependen de **puertos** (interfaces): `OrderRepository`, `CatalogRepository`, `PaymentGateway`, `Mailer`, `Clock`…
3. **Infraestructura** (`src/infrastructure`): adaptadores de los puertos para Supabase, Stripe y Resend, más adaptadores en memoria para tests y demo.
4. **Presentación** (`src/app`, `src/ui`): páginas, componentes, Server Actions y Route Handlers. Solo llama a casos de uso, a través de un contenedor de composición (`src/composition`).

ESLint impide importar infraestructura desde dominio, aplicación o presentación, como en NEXO y FrescaGo.

### D-20 · Supabase — Aprobada
- **Auth:** email y contraseña, y Google.
- **Postgres con RLS en todas las tablas.**
- **Realtime:** pedidos para el panel y el seguimiento.
- **Storage:** fotos de producto.
- **Funciones SQL** para las operaciones que deben ser atómicas: reservar franja, crear pedido y sumar sellos.
- **Clave de servicio:** solo en el servidor de Astro (variables de entorno de Vercel), nunca en el navegador.

### D-21 · Stripe — Aprobada
- **PaymentIntents + Payment Element** con la Appearance API (colores, radios y tipografía de MŌRI). Incluye tarjeta, Apple Pay y Google Pay, y **Link**.
- **Importe:** siempre lo calcula el servidor a partir del catálogo; el navegador solo envía qué y cuánto.
- **Pedido:** se crea en `pendiente de pago` antes del PaymentIntent. El **webhook** `payment_intent.succeeded` lo confirma de forma idempotente, reserva la franja y envía el email.
- **Reembolsos:** desde el panel con la API de Stripe, reflejados por webhook.
- **Clientes:** cada cuenta tiene un Customer de Stripe para que Link y los métodos guardados funcionen.

### D-22 · Tests y calidad — Aprobada

| Nivel | Herramienta | Qué cubre |
| --- | --- | --- |
| Unitarios de dominio | Vitest | Precios, opciones, franjas, zonas, cupones, sellos, transiciones de estado. Objetivo: 100 % de ramas en `core/domain` |
| Casos de uso | Vitest + adaptadores en memoria | Cada caso de uso con sus caminos felices y de error, sin red ni base de datos |
| Contratos de adaptadores | Vitest | La misma batería de tests contra el adaptador en memoria y contra el de Supabase sobre PGlite |
| Base de datos | pgTAP sobre PGlite | RLS por rol (invitado, cliente, staff, admin) y funciones SQL atómicas. Sin Docker, como en NEXO |
| Componentes | Vitest + Testing Library | Configurador, carrito, formularios y estados vacíos y de error |
| Extremo a extremo | Playwright | Compra con recogida y con reparto pagando con la tarjeta de prueba de Stripe, registro, cuenta y panel en directo. Cuatro anchos de pantalla |
| Accesibilidad | axe en Playwright | Todas las pantallas en ES y EN |
| Rendimiento | Lighthouse CI | Marca ≥ 90 en móvil, resto de categorías 100 |

**Integración continua:** GitHub Actions con lint, typecheck, tests unitarios, tests de base de datos y E2E. Además, Vercel crea una vista previa por cada pull request.

### D-23 · Idiomas y moneda — Aprobada
- Todo en ES y EN, incluidos el panel y los emails, con las mismas rutas traducidas que ahora.
- Solo euros, con el IVA (10 %, hostelería) incluido y desglosado en el ticket.

### D-24 · Seguridad — Aprobada
- **Peticiones:** las Server Actions comprueban el origen (por defecto en Next.js). También se verifica la firma del webhook de Stripe y hay límites de frecuencia en registro, inicio de sesión y cupones.
- **Rutas protegidas:** `proxy.ts` refresca la sesión de Supabase. Cada layout de `/cuenta` y `/admin` comprueba usuario y rol en el servidor, sin fiarse solo del `proxy`.
- **Cabeceras:** cabeceras de seguridad en `vercel.json`.
- **Errores:** ningún mensaje filtra si un email está registrado.
- **Secretos:** solo en `.env` local (fuera de git) y en Vercel. El repo incluye un `.env.example` con los nombres.

### D-25 · Repositorio y ramas — Aprobada
- **Primer commit en `main`:** la web de marca actual en Astro, que puede publicarse ya en Vercel. Así el historial muestra la evolución: de web de marca a producto.
- **Ramas:** la migración a Next.js y la tienda se desarrollan en ramas por fase (`feat/nextjs-migration`, `feat/shop-foundations`, `feat/auth`…).
- **Integración:** cada fase se integra en `main` cuando está terminada y probada en su vista previa.
- **Commits:** en inglés y con Conventional Commits.

## Lo que necesito de ti, y cuándo

| Fase | Qué | Notas |
| --- | --- | --- |
| 0 | Crear el repo vacío en GitHub | Ya pendiente |
| 1 | Crear un proyecto en Supabase y pasarme **la URL y la clave publicable** | La clave de servicio la pegas tú en `.env` y en Vercel |
| 1 | Aplicar las migraciones (SQL Editor o `supabase db push`) | Te doy los archivos y los comandos |
| 2 | Crear un cliente OAuth de Google y configurar las URL de redirección en Supabase | Te doy los pasos |
| 2 | Cuenta en Resend y SMTP en Supabase | Opcional pero recomendable |
| 4 | Claves de prueba de Stripe en `.env` y en Vercel | No me las pegues en el chat |
| 4 | Instalar Stripe CLI para los webhooks en local | Instalación global: la haces tú |
