# 05 · Fases

Cada fase se hace en su propia rama, termina con tests en verde y la web revisada en el navegador. Se integra en `main` cuando la apruebas. Antes de cada fase con interfaz nueva se muestra un boceto para validarlo.

## Fase 0 · Publicar la web de marca
- Primer commit con la web actual en Astro, subida a `main` y desplegada en Vercel.
- **Criterio de hecho:** la web está en `mori-matcha.vercel.app` con las puntuaciones de Lighthouse del README.

## Fase 1 · Migración a Next.js 16 (`feat/nextjs-migration`)
- **Proyecto:** Next.js 16, React 19, TypeScript estricto, Tailwind 4 con los mismos tokens, `next-intl` con las rutas traducidas actuales, `next/font` y `next/image`.
- **Componentes:** los de marca se migran a Server Components, y GSAP y Lenis a hooks de cliente (`useGSAP`).
- **Herramientas:** ESLint con límites de capas, Prettier, Vitest, Playwright, axe, husky y commitlint, y CI en GitHub Actions.
- **Estructura:** carpetas de la clean architecture creadas y el primer dominio (`Money`, horario y «abierto ahora») con tests.
- **Criterio de hecho:**
  - Las seis páginas en ES y EN son visualmente idénticas a la versión en Astro (capturas comparadas).
  - Las animaciones funcionan igual.
  - Lighthouse móvil da ≥ 90 en rendimiento y 100 en el resto.
  - E2E de navegación y axe en verde.

## Fase 2 · Base de la tienda (`feat/shop-foundations`)
- **Supabase:** proyecto conectado, migraciones del modelo completo, RLS, funciones y `seed.sql`.
- **Tests de base de datos:** pgTAP sobre PGlite en CI.
- **Dominio y casos de uso del catálogo y de los precios**, con adaptadores de Supabase y en memoria y tests de contrato.
- **La carta lee de la base de datos**, con páginas de producto (`/carta/[producto]`) y configurador de opciones.
- **Criterio de hecho:**
  - La carta y las fichas se generan estáticas desde Supabase.
  - El configurador calcula bien todos los precios (tests).
  - Los tests de RLS pasan.

## Fase 3 · Cuentas (`feat/auth`)
- **Acceso:** registro, inicio de sesión con email y Google, confirmación y recuperación, `proxy.ts` con la sesión y layouts protegidos.
- **Área de cliente:** perfil, direcciones, favoritos, seguridad y eliminar cuenta.
- **Emails de autenticación** con la marca, vía SMTP de Resend.
- **Criterio de hecho:**
  - E2E de registro, inicio de sesión, edición de perfil y direcciones.
  - Un usuario no accede a datos de otro (tests de RLS y E2E).

## Fase 4 · Carrito y checkout (`feat/checkout`)
- **Carrito:** panel lateral y página, persistencia y fusión al iniciar sesión.
- **Checkout:** recogida con franjas y capacidad, reparto con zona, mínimo y envío, cupones e IVA desglosado.
- **Pago:** Payment Element con Appearance de MŌRI, `PlaceOrder`, webhook, `ConfirmPayment` y caducidad de los pedidos sin pagar.
- **Confirmación:** página de confirmación y email.
- **Criterio de hecho:**
  - E2E paga con `4242 4242 4242 4242` en las dos modalidades.
  - Los tests de casos de uso cubren franja llena, fuera de zona, mínimo no alcanzado, cupón caducado y precio manipulado.
  - El webhook es idempotente (test).

## Fase 5 · Pedidos del cliente (`feat/orders`)
- Seguimiento en directo con Realtime, para usuarios con sesión y para invitados con enlace.
- Historial, detalle y «Repetir pedido».
- Emails «listo para recoger» y «en reparto».
- **Criterio de hecho:** E2E en el que el staff avanza un pedido y el cliente lo ve cambiar sin recargar.

## Fase 6 · Panel de tienda (`feat/admin`)
- Tablero en directo con aviso sonoro, detalle, ticket imprimible, cancelación y reembolso.
- Productos con subida de foto y regeneración de la carta.
- Cupones, ajustes, clientes y panel de datos con gráficos.
- Modo demo con la cuenta `staff` restringida y el cron de pedidos de ejemplo.
- **Criterio de hecho:**
  - E2E de flujo completo: cliente paga → staff prepara → listo → completado.
  - Un cambio de disponibilidad se refleja en la carta.
  - El staff de demo no puede editar productos ni ajustes.

## Fase 7 · Pulido y lanzamiento (`feat/launch`)
- **Contenido:** páginas legales, metadatos, sitemap, datos estructurados de producto, página 404 y páginas de error.
- **Calidad:**
  - Revisión completa de accesibilidad (teclado, lector de pantalla, axe) y de rendimiento (presupuestos de JS por ruta, Lighthouse CI).
  - Cabeceras de seguridad y límites de frecuencia.
- **README** reescrito como caso de estudio fullstack: arquitectura, decisiones, tests, capturas del panel y del checkout, y cuentas de demo.
- **Despliegue final en Vercel** con todas las variables de entorno.
- **Criterio de hecho:** todo el CI en verde, Lighthouse dentro de presupuesto y la demo navegable por alguien que no conoce el proyecto.

## Fase 8 · Fidelización y extras
- **Tarjeta MŌRI (D-10):** sellos por bebida pagada, tarjeta animada en la cuenta y canje en el checkout. El modelo de datos ya la contempla desde la Fase 2.
- **Opcionales:** web instalable como app (PWA) y notificaciones push de «Tu pedido está listo».
- Reseñas de bebidas por clientes que las han comprado.
- Modo oscuro.
