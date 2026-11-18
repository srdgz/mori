# 00 · Decisiones

MŌRI pasa de web de marca a tienda online completa: pedidos para recoger en tienda o con reparto propio, pago con Stripe, cuentas de cliente y panel de tienda. Este documento recoge las decisiones de producto y técnicas. Todas quedaron aprobadas el 14/11/2026.

Documentos relacionados: [01 · Alcance y mapa](01-alcance.md) · [02 · Arquitectura](02-arquitectura.md) · [03 · Modelo de datos](03-modelo-datos.md) · [04 · Flujos](04-flujos.md) · [05 · Fases](05-fases.md)

## Revisión del 16/11/2026: sin Supabase

La cuenta de Supabase ya tiene ocupados los dos proyectos activos del plan gratuito, y no se quieren pausar ni borrar. Por eso Supabase se sustituye por piezas independientes:

| Necesidad | Antes | Ahora |
| --- | --- | --- |
| Base de datos | Postgres de Supabase | **Neon** (Postgres gestionado), conectado a Vercel con su integración |
| Acceso a datos | supabase-js | **Drizzle ORM** con migraciones versionadas |
| Cuentas | Supabase Auth | **Better Auth**, con sus tablas en la misma base de datos |
| Permisos | RLS | **Políticas en la capa de aplicación**, más funciones SQL para las operaciones críticas |
| Tiempo real | Supabase Realtime | **Neon Realtime** con consultas selladas, y **sondeo** de respaldo con TanStack Query |
| Fotos de producto | Supabase Storage | **Vercel Blob** |
| Trabajos programados | Vercel Cron | **GitHub Actions** programado (ver D-26) |

El dominio, los casos de uso y los puertos no cambian: solo cambian los adaptadores de `src/infrastructure`. Es justo lo que la clean architecture debe permitir, y el README lo contará así.

Decisiones afectadas, aprobadas el 16/11/2026: D-02, D-07, D-12, D-18, D-19, D-20, D-22, D-24 y la nueva D-26. El resto sigue como se aprobó.

## Ya decidido

| Tema | Decisión |
| --- | --- |
| Pago | Stripe **Payment Element** integrado en la web con la estética de MŌRI (modo de prueba) |
| Entrega | Recogida en tienda a una hora elegida, o **reparto propio** «Envío MŌRI» |
| Pedidos | **Panel de tienda** con base de datos (Postgres en Neon) |
| Cuentas | Registro, inicio de sesión, perfil, direcciones e historial de pedidos |
| Objetivo | Producto completo presentable como proyecto fullstack, sin perder el nivel de diseño actual |

## Producto

### D-01 · Pedido como invitado o con cuenta — Aprobada
Se puede comprar **sin cuenta**, solo con nombre, email y teléfono, como en la mayoría de tiendas actuales. La cuenta es opcional y ofrece historial, direcciones guardadas, repetir pedido y favoritos. Después de pagar como invitado se ofrece crear la cuenta con un clic.
- **Vincular un pedido de invitado (revisado el 17/11/2026):** como el registro no verifica el email, los pedidos no se vinculan por coincidir el email. Solo se vincula un pedido cuando quien tiene la sesión iniciada abre su enlace con el `tracking_token` y pulsa «Guardar en mi cuenta»: el enlace demuestra que el pedido es suyo. «Crea tu cuenta» en la página del pedido lleva al registro y, al entrar, vuelve al pedido para guardarlo.
Un invitado sigue su pedido con un enlace firmado que recibe por email y que aparece en la página de confirmación.

### D-02 · Catálogo en base de datos — Aprobada (revisada el 16/11/2026)
Bebidas, categorías y opciones pasan del adaptador en memoria a Postgres para que la tienda las gestione desde el panel: precio, disponibilidad («agotado hoy»), destacados y orden.
Las fotos actuales siguen en el repositorio. Las que se suben desde el panel van a **Vercel Blob**, y todas se sirven optimizadas con `next/image`.
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

### D-07 · Seguimiento en directo — Aprobada (revisada el 16/11/2026)
- Página de pedido con línea de tiempo animada, hora estimada y código de recogida corto (por ejemplo, `MR-4F7K`).
- Se actualiza sola, sin recargar, con **Neon Realtime** y **sondeo de respaldo**:
  - **Neon Realtime:** el servidor comprueba quién pide el pedido y sella una consulta `SELECT` solo para ese pedido. El navegador se suscribe a ella y recibe cada cambio al instante, sin poder leer ni modificar la consulta.
  - **Sondeo:** si Realtime no está configurado (CI, PGlite en local, una vista previa sin Realtime) o la suscripción falla, la página consulta el estado cada 10 segundos mientras está visible.
  - En los dos casos se deja de escuchar cuando el pedido termina.
  - **Implementación (17/11/2026):** la consulta sellada son los eventos del pedido (`order_events`), porque cada cambio de estado inserta uno. Al recibir un cambio, o si el sondeo ve otro `ETag`, la página se vuelve a renderizar en el servidor (`router.refresh()`), así que la línea de tiempo siempre sale del mismo componente de servidor. Mientras la suscripción está en directo no se sondea.
- **Por qué los dos:** Neon Realtime está en beta. Con el sondeo detrás, la tienda sigue funcionando aunque la beta falle o cambie, y la interfaz no nota la diferencia.

### D-08 · Panel de tienda — Aprobada
Roles `customer`, `staff` y `admin`.

- **Pedidos (staff):** tablero en directo por columnas (Nuevos · En preparación · Listos / En reparto · Completados), con aviso sonoro opcional al entrar un pedido, detalle, cambio de estado y ticket imprimible.
- **Productos (admin):** crear, editar, ordenar, subir foto, precio, opciones y disponibilidad.
- **Ajustes (admin):** horario, días cerrados, capacidad por franja, tiempo de preparación, zonas y tarifas de reparto, pausar pedidos online.
- **Panel de datos (admin):** ventas de hoy y de la semana, ticket medio, bebidas más vendidas, reparto frente a recogida y ventas por hora.
- **Cupones (admin):** código, porcentaje o importe, mínimo, caducidad y usos.
- **Reembolsos (admin).**
- **Implementación (18/11/2026):**
  - Cancelar (staff, solo pedidos «recibidos») y reembolsar (admin) devuelven en Stripe lo que queda por devolver. Los reembolsos son totales; los parciales quedan fuera.
  - El tablero se mueve con botones (y teclado) en cada tarjeta, sin arrastrar.
  - Cambiar productos o ajustes regenera la carta y las páginas estáticas al momento (`revalidatePath`).
  - Las fotos nuevas se suben a Vercel Blob desde el navegador con un permiso que solo pide el admin (`/api/uploads`).

### D-09 · Cuenta de cliente — Aprobada (revisada el 16/11/2026)
- **Acceso:**
  - Registro con email y contraseña: la cuenta se crea al momento, la pantalla confirma que se ha creado y ofrece iniciar sesión. No se envía ningún email de confirmación. Así quien revise el portfolio no depende de recibir un email, igual que un invitado puede comprar dando cualquier email. Si el email ya tiene cuenta, el registro lo dice en pantalla y ofrece entrar, recuperar la contraseña o usar Google.
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

**Implementación (Fase 8):**
- **Sellos:** `confirm_payment` suma uno por bebida pagada y resta los canjeados. Cancelar o reembolsar un pedido deshace su saldo neto (`advance_order_status`), así que nunca se pierden ni se regalan sellos.
- **Canje:** con 8 sellos, el cliente elige en el checkout qué bebida de su pedido le invitamos y se descuenta una unidad con sus extras. El cupón se aplica después, sobre lo que queda.
- **Tarjeta:** en «Tu cuenta», con el emblema de MŌRI en cada sello (atenuado si falta) y una animación de estampado en el último. Solo la tienen los clientes; los invitados ven «Entra para sumar sellos».
- **Demo:** la cuenta demo empieza con 5 sellos.

### D-11 · Cupones — Aprobada
- Un cupón por pedido, que el servidor valida y Stripe cobra ya descontado.
- Cupones de demostración: `BIENVENIDA10` (10 % en el primer pedido) y `MATCHAMIGO` (2 € desde 15 €).

### D-12 · Emails transaccionales — Aprobada (revisada el 16/11/2026)
- **Mensajes:** confirmación de pedido, pedido listo para recoger, pedido en reparto y reembolso. Se escriben como plantillas HTML propias en la estética de MŌRI, sin dependencias extra, y se envían por **SMTP con una cuenta de Gmail** (contraseña de aplicación), que llega a cualquier dirección sin necesidad de dominio propio. Resend queda como alternativa si algún día hay dominio. En los E2E se guardan en un archivo y, sin configuración, en local salen por consola.
- **Emails de autenticación** (recuperar contraseña y aviso de contraseña cambiada; no hay email de confirmación de cuenta): Better Auth los pide a través del mismo puerto `Mailer`, así que comparten diseño, idiomas y proveedor con el resto.
- **Limitación sin dominio propio:** Resend solo entrega al email de la cuenta, lo que basta para la demo. Con un dominio verificado llegan a cualquiera.

### D-13 · Modo demo para quien revise el portfolio — Aprobada
- **Cliente de demostración (desde la Fase 3):** la pantalla de entrar ofrece el botón **«Entrar en modo demo»**, que entra con un clic en la cuenta `cliente@demo.mori` sin escribir nada. Tiene dirección y favoritos de ejemplo y puede usar todo el área de cliente, pero no cambiar su contraseña ni eliminarse. Se crea con el seed.
- **Panel de tienda:** la portada y el README ofrecen **«Ver el panel de tienda (demo)»**. Entra con una cuenta `staff` de demostración que ve pedidos reales de prueba, pero no puede cambiar ajustes ni productos. Las acciones de admin se muestran deshabilitadas con una explicación. El staff de demo ve todos los pedidos, pero solo puede mover los de ejemplo (`is_demo`): los reales son de solo lectura. Los pedidos de ejemplo nunca pasan por Stripe.
- **Pedidos de ejemplo:** un trabajo programado genera algunos cada día para que el tablero nunca esté vacío.
- **Pagos:** cualquiera puede pagar con la tarjeta de prueba `4242 4242 4242 4242`. Un aviso fijo en el checkout lo explica.
- **Por qué:** la compra como invitado ya permite probar la parte del cliente, pero el panel de tienda solo lo ve el personal. Sin una cuenta de demostración, la pieza más completa del proyecto quedaría oculta para quien revise el portfolio. Se mantiene en su versión ligera: una cuenta `staff` de solo tablero y pedidos de ejemplo.

### D-14 · Páginas legales — Aprobada
- **Páginas:** Aviso legal, Privacidad, Cookies, y Condiciones de venta con devoluciones, en ES y EN, adaptadas a una marca ficticia.
- **Cookies:** solo se usan cookies técnicas (sesión y carrito), así que no hace falta banner de consentimiento. Si más adelante se añade analítica, se incorporaría el banner.
- **Implementación (Fase 7):**
  - Una plantilla común con índice lateral y un aviso fijo: MŌRI es una marca ficticia de un proyecto de portfolio, sin local ni cobros reales.
  - No hay datos reales: ni NIF, ni razón social, ni dirección. El responsable es «Proyecto de portfolio de srdgz» y el contacto va por la página de contacto.
  - Enlaces en el pie y en la casilla de privacidad del registro.
  - Los datos estructurados de negocio local (`CafeOrCoffeeShop`) se retiran para no presentar a Google una dirección inventada como real. Se quedan `Product`, `BreadcrumbList` y `WebSite`.

### D-15 · Páginas de producto — Aprobada
- **Ruta:** cada bebida tiene su página (`/carta/classic-matcha`, `/en/menu/classic-matcha`).
- **Contenido:** foto grande, descripción, opciones, «Añadir al carrito», bebidas relacionadas y datos estructurados `Product` para buscadores.
- **Tecnología:** son páginas estáticas (`generateStaticParams`), regeneradas cuando cambia el catálogo.

### D-16 · Carrito — Aprobada
- **Interfaz:** panel lateral accesible, abierto desde un icono con contador en la cabecera, y página `/carrito` como alternativa.
- **Persistencia:** el carrito se guarda en el navegador. Al iniciar sesión se fusiona con el guardado en la cuenta, así que el mismo carrito está en el móvil y en el ordenador.
- **Avisos:** se avisa si una bebida se agota o su precio cambia antes de pagar.
- **Invitado:** quien llega a «Entrar» desde el checkout ve también «Continuar como invitado».

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

### D-18 · Server Components por defecto, cliente solo donde hay interacción — Aprobada (revisada el 16/11/2026)
- **Por defecto:** las páginas y la carga de datos son Server Components.
- **Componentes de cliente (`"use client"`):** carrito, configurador de bebida, checkout con Payment Element, formularios, panel en directo y animaciones.
- **Mutaciones:** **Server Actions** con validación **zod**.
- **Route Handlers:** solo para lo que no puede ser una Server Action: el webhook de Stripe, Better Auth, el permiso de subida a Vercel Blob, las lecturas que sondea el cliente y los trabajos programados.
- **Estado del carrito:** un store propio de cliente con `useSyncExternalStore`, persistido en `localStorage`. Cubre lo mismo que Zustand sin añadir una dependencia.
- **Datos del servidor en cliente:** el tablero usará **TanStack Query** (fase 6). El seguimiento no lo necesita: un hook propio vigila el pedido y pide al servidor que vuelva a renderizar la página (ver D-07).
  - Con Neon Realtime, cada cambio recibido actualiza la caché de la consulta.
  - Sin Realtime, la misma consulta usa `refetchInterval`. El sondeo se para con la pestaña en segundo plano, y las respuestas llevan `ETag` para que una consulta sin cambios no devuelva datos.

### D-19 · Clean architecture — Aprobada (revisada el 16/11/2026)
Cuatro capas con dependencias solo hacia dentro. Detalle en [02 · Arquitectura](02-arquitectura.md).

1. **Dominio** (`src/core/domain`): entidades y reglas puras. Precios, opciones, franjas, zonas, cupones, sellos, máquina de estados del pedido y **políticas de acceso** (qué puede hacer cada rol). Sin dependencias.
2. **Aplicación** (`src/core/application`): casos de uso (`PlaceOrder`, `ConfirmPayment`, `GetPickupSlots`, `AdvanceOrderStatus`…) que dependen de **puertos** (interfaces): `OrderRepository`, `CatalogRepository`, `PaymentGateway`, `Mailer`, `FileStorage`, `Clock`… Cada caso de uso recibe quién lo pide (`Actor`) y comprueba la política antes de actuar.
3. **Infraestructura** (`src/infrastructure`): adaptadores de los puertos para Postgres (Drizzle), Better Auth, Stripe, Resend y Vercel Blob, más adaptadores en memoria para tests y demo.
4. **Presentación** (`src/app`, `src/ui`): páginas, componentes, Server Actions y Route Handlers. Solo llama a casos de uso, a través de un contenedor de composición (`src/composition`).

ESLint impide importar infraestructura desde dominio, aplicación o presentación, como en NEXO y FrescaGo.

### D-20 · Base de datos, cuentas y archivos — Aprobada (revisada el 16/11/2026)
Sustituye a la antigua «D-20 · Supabase».

- **Postgres en Neon:**
  - Se añade desde el Marketplace de Vercel, que crea el proyecto y guarda las variables de conexión en Vercel.
  - Cada vista previa de una pull request tiene su propia rama de base de datos, con las migraciones aplicadas, así que los cambios de esquema se prueban sin tocar producción.
  - El plan gratuito da 1 GB por proyecto y suspende la base de datos tras unos minutos sin uso. Solo nota esa pausa la primera consulta después de un rato, porque las páginas de marca y la carta son estáticas.
- **Drizzle ORM:**
  - El esquema se define en TypeScript y `drizzle-kit` genera migraciones SQL versionadas en el repositorio.
  - Las funciones y triggers van en migraciones SQL escritas a mano.
  - Se usa `pg` con un pool de conexiones, el driver que Neon recomienda para Vercel con Fluid compute. Funciona igual con el Postgres de CI y con PGlite en local.
- **Better Auth:**
  - Email y contraseña con confirmación, Google y recuperación de contraseña.
  - Sesiones en cookie `httpOnly` guardadas en la base de datos, y límites de frecuencia integrados.
  - El rol (`customer`, `staff`, `admin`) es un campo del usuario que el cliente no puede escribir.
- **Permisos:** como el navegador nunca habla con la base de datos, no hace falta RLS.
  - **Primera capa:** las políticas de dominio, comprobadas en cada caso de uso y cubiertas al 100 % por tests.
  - **Segunda capa:** las operaciones críticas (crear pedido, confirmar pago, cambiar estado) son funciones SQL que validan por sí mismas la transición y la capacidad.
  - **Tercera capa (Fase 7, opcional):** la app puede conectarse con el rol `mori_app` (`DATABASE_APP_URL`), que solo puede leer y escribir filas y ejecutar las funciones. No puede cambiar el esquema ni borrar tablas. Las migraciones y el seed siguen usando el rol dueño (`DATABASE_URL_UNPOOLED`). El SQL está en `db/app-role.sql`.
- **Funciones SQL** para las operaciones que deben ser atómicas: reservar franja, crear pedido, confirmar pago y sumar sellos. Cada llamada es una sola sentencia, así que es atómica sin transacciones abiertas desde la app.
- **Vercel Blob:** fotos subidas desde el panel. El navegador sube directo a Blob con un permiso de un solo uso que firma el servidor tras comprobar que el usuario es admin.
- **Secretos:** solo en el servidor (variables de entorno de Vercel), nunca en el navegador.

### D-21 · Stripe — Aprobada
- **PaymentIntents + Payment Element** con la Appearance API (colores, radios y tipografía de MŌRI). Incluye tarjeta, Apple Pay y Google Pay, y **Link**.
- **Importe:** siempre lo calcula el servidor a partir del catálogo; el navegador solo envía qué y cuánto.
- **Pedido:** se crea en `pendiente de pago` antes del PaymentIntent. El **webhook** `payment_intent.succeeded` lo confirma de forma idempotente, reserva la franja y envía el email.
- **Reembolsos:** desde el panel con la API de Stripe, reflejados por webhook.
- **Clientes:** cada cuenta tiene un Customer de Stripe para que Link y los métodos guardados funcionen.

### D-22 · Tests y calidad — Aprobada (revisada el 16/11/2026)

| Nivel | Herramienta | Qué cubre |
| --- | --- | --- |
| Unitarios de dominio | Vitest | Precios, opciones, franjas, zonas, cupones, sellos, transiciones de estado y políticas de acceso por rol. Objetivo: 100 % de ramas en `core/domain` |
| Casos de uso | Vitest + adaptadores en memoria | Cada caso de uso con sus caminos felices y de error, y con cada rol (invitado, cliente, staff, staff de demo, admin), sin red ni base de datos |
| Contratos de adaptadores | Vitest | La misma batería de tests contra el adaptador en memoria y contra el de Drizzle sobre PGlite, con las migraciones reales aplicadas |
| Base de datos | Vitest sobre PGlite y Postgres | Funciones SQL atómicas y restricciones. La prueba de dos pedidos a la vez en la misma franja necesita dos conexiones reales, así que en CI se ejecuta contra un Postgres de GitHub Actions. Sin Docker en local |
| Componentes | Vitest + Testing Library | Configurador, carrito, formularios y estados vacíos y de error |
| Extremo a extremo | Playwright | Compra con recogida y con reparto pagando con la tarjeta de prueba de Stripe, registro, cuenta y panel en directo. Cuatro anchos de pantalla |
| Accesibilidad | axe en Playwright | Todas las pantallas en ES y EN |
| Rendimiento | Lighthouse CI | Marca ≥ 90 en móvil en producción, resto de categorías 100 y JS por ruta ≤ 270 KB comprimido. En CI se mide `next start` (HTTP/1.1 y gzip), que da unos 6 puntos menos que Vercel (HTTP/2 y Brotli), así que el umbral de CI es 85 |

**Integración continua:** GitHub Actions con lint, typecheck, tests unitarios, tests de base de datos y E2E. Además, Vercel crea una vista previa por cada pull request.

### D-23 · Idiomas y moneda — Aprobada
- Todo en ES y EN, incluidos el panel y los emails, con las mismas rutas traducidas que ahora.
- Solo euros, con el IVA (10 %, hostelería) incluido y desglosado en el ticket.

### D-24 · Seguridad — Aprobada (revisada el 16/11/2026)
- **Peticiones:** las Server Actions comprueban el origen (por defecto en Next.js). También se verifica la firma del webhook de Stripe y hay límites de frecuencia propios, guardados en la base de datos, en registro, inicio de sesión, recuperación de contraseña y creación de pedidos (10 cada 10 minutos por visitante, para que nadie pueda llenar las franjas con pedidos sin pagar). Los de Better Auth solo cubren las peticiones HTTP a `/api/auth`, y nuestros formularios usan Server Actions.
- **Rutas protegidas:** `proxy.ts` solo mira si existe la cookie de sesión y redirige pronto a quien no la tiene. Cada layout de `/cuenta` y `/admin` valida la sesión y el rol en el servidor, y cada caso de uso vuelve a comprobar la política, así que saltarse la interfaz no da acceso a nada.
- **Datos de otros:** las consultas de cliente siempre filtran por el usuario de la sesión, nunca por un id que venga del navegador. El seguimiento de un invitado exige el `tracking_token` del enlace.
- **Cabeceras:** en `next.config.ts`. CSP con `default-src 'self'` y solo los orígenes de Stripe, Link, Vercel Blob y Neon Realtime, `frame-ancestors 'none'`, HSTS, `nosniff`, `Referrer-Policy` y `Permissions-Policy`. Los scripts en línea de Next.js obligan a `'unsafe-inline'` en `script-src`: un nonce haría dinámicas todas las páginas estáticas.
- **Errores:** ningún mensaje filtra si un email está registrado.
- **Secretos:** solo en `.env` local (fuera de git) y en Vercel. El repo incluye un `.env.example` con los nombres.

### D-25 · Repositorio y ramas — Aprobada
- **Primer commit en `main`:** la web de marca actual en Astro, que puede publicarse ya en Vercel. Así el historial muestra la evolución: de web de marca a producto.
- **Ramas:** la migración a Next.js y la tienda se desarrollan en ramas por fase (`feat/nextjs-migration`, `feat/shop-foundations`, `feat/auth`…).
- **Integración:** cada fase se integra en `main` cuando está terminada y probada en su vista previa.
- **Commits:** en inglés y con Conventional Commits.

### D-26 · Trabajos programados con GitHub Actions — Aprobada (16/11/2026)
- **Trabajos:**
  - Caducar los pedidos sin pagar.
  - Crear y avanzar los pedidos de ejemplo de la demo.
- **Problema:** en el plan gratuito de Vercel, los cron solo se ejecutan una vez al día.
- **Solución:** un workflow programado de GitHub Actions llama cada 15 minutos a los Route Handlers `/api/cron/*`, que exigen `CRON_SECRET`.
- **Disponibilidad de franjas:** la capacidad ya ignora los pedidos sin pagar de más de 30 minutos. Así la franja queda libre a tiempo aunque el trabajo se retrase, y el trabajo solo pone el estado `expired` por orden.

### D-27 · Reseñas de bebidas — Aprobada (18/11/2026)
- **Quién:** solo clientes con un pedido completado que incluya la bebida, desde el detalle de ese pedido. Una reseña por cliente y bebida, que se puede editar.
- **Contenido:** de 1 a 5 estrellas y un texto opcional de hasta 280 caracteres. En la ficha aparece el nombre y la inicial del apellido, con la etiqueta «Compra verificada».
- **Moderación:** se publican al momento. El personal y los admins las ocultan desde «Reseñas» en el panel. La cuenta demo no puede publicar y el personal de demo no puede ocultar, para que nadie use las cuentas compartidas para escribir en público.
- **SEO:** la ficha añade `aggregateRating` a sus datos estructurados cuando hay reseñas visibles.

### D-28 · Web instalable y avisos push — Aprobada (18/11/2026)
- **PWA:** manifest con iconos generados del emblema, service worker propio (`public/sw.js`) con una página sin conexión, y un botón «Instalar la app» en el pie cuando el navegador lo ofrece.
- **Push:** en el seguimiento, «Avísame cuando esté listo» suscribe el navegador con Web Push (VAPID) a ese pedido. Al pasar a «listo» o «en reparto», el servidor envía el aviso en el idioma del pedido y olvida las suscripciones caducadas. En iPhone solo funciona con la web instalada.
- **Sin claves VAPID:** el botón vuelve al aviso del navegador mientras la página está abierta, como antes.

### D-29 · Modo oscuro — Aprobada (18/11/2026)
- **Tokens:** los colores de marca se redefinen en oscuro (bosque casi negro, crema para el texto y matcha para el acento). Las secciones de marca oscuras (`.on-dark`) y la foto de portada (`.keep-light`) mantienen sus colores originales.
- **Preferencia:** por defecto sigue al sistema. En «Perfil → Apariencia» se elige Sistema, Claro u Oscuro; se guarda en la cuenta y en una cookie, y un script en `<head>` la aplica antes de pintar para que no parpadee.
- **Stripe:** el Payment Element usa su tema `night` con los colores de MŌRI cuando la web está en oscuro.
- **Accesibilidad:** axe revisa las páginas públicas, la cuenta y el checkout también en oscuro.

## Lo que necesito de ti, y cuándo

| Fase | Qué | Notas |
| --- | --- | --- |
| 0 | Crear el repo vacío en GitHub | Hecho |
| 2 | En Vercel, proyecto `mori-matcha` → Storage → añadir **Neon**, con ramas para las vistas previas | Te doy los pasos. Vercel guarda solo las variables de conexión |
| 2 | Copiar `DATABASE_URL` a tu `.env` local, o `vercel env pull` | Instalar Vercel CLI es global: lo haces tú. No me pases la cadena por el chat |
| 3 | Crear un cliente OAuth de Google con la URL de redirección `…/api/auth/callback/google` | Te doy los pasos |
| 3 | Cuenta en Resend y su clave en `.env` y en Vercel | Sin dominio propio solo entrega a tu email, que basta para la demo |
| 4 | Claves de prueba de Stripe en `.env` y en Vercel | No me las pegues en el chat |
| 4 | Instalar Stripe CLI para los webhooks en local | Instalación global: la haces tú |
| 5 | En Neon, activar **Realtime** en la rama principal y añadir los orígenes de la web (`allowedOrigins`) | Copiar `NEON_REALTIME_URL` y `NEON_REALTIME_SECRET` a `.env.local` y a Vercel. Sin ellas la web usa solo el sondeo |
| 6 | En Vercel, Storage → añadir **Blob** | Vercel guarda `BLOB_READ_WRITE_TOKEN` |
| 6 | Secretos `CRON_SECRET` y `SITE_URL` en GitHub (Settings → Secrets) | Para el workflow programado |
| 8 | Claves VAPID para Web Push: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT` en Vercel | Las generas tú con `npx web-push generate-vapid-keys`. Sin ellas no hay avisos push |
