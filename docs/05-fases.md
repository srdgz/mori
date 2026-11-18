# 05 · Fases

Cada fase se hace en su propia rama, termina con tests en verde y la web revisada en el navegador. Se integra en `main` cuando la apruebas. Antes de cada fase con interfaz nueva se muestra un boceto para validarlo.

## Fase 0 · Publicar la web de marca
- Primer commit con la web actual en Astro, subida a `main` y desplegada en Vercel.
- **Criterio de hecho:** la web está en `mori-matcha-bar.vercel.app` con las puntuaciones de Lighthouse del README.

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
- **Neon en Vercel:** integración añadida desde el Marketplace, con una rama de base de datos por vista previa.
- **Drizzle:** esquema del modelo completo, migraciones generadas, funciones SQL escritas a mano, seed y `db:migrate` + `db:seed` dentro del build de Vercel.
- **Tests de base de datos:**
  - Vitest sobre PGlite en local y en CI.
  - Prueba de concurrencia de franjas contra el servicio Postgres de GitHub Actions.
- **Dominio y casos de uso del catálogo y de los precios**, con adaptadores de Drizzle y en memoria y tests de contrato.
- **Políticas de acceso** del dominio (`Actor`, roles y `authorize`) con sus tests, aunque las cuentas lleguen en la Fase 3.
- **La carta lee de la base de datos**, con páginas de producto (`/carta/[producto]`) y configurador de opciones.
- **Criterio de hecho:**
  - La carta y las fichas se generan estáticas desde Postgres, en producción y en la vista previa con su propia rama.
  - El configurador calcula bien todos los precios (tests).
  - Los tests de contratos, funciones y políticas pasan.

## Fase 3 · Cuentas (`feat/auth`)
- **Acceso con Better Auth:**
  - Registro e inicio de sesión con email o con Google.
  - Confirmación de email y recuperación de contraseña.
  - `proxy.ts` con la redirección temprana y layouts protegidos.
- **Área de cliente:** perfil, direcciones, favoritos, seguridad y eliminar cuenta.
- **Emails de cuenta** con la marca (recuperar contraseña y aviso de cambio), a través del `Mailer` de Resend. El registro no pide confirmar el email.
- **Criterio de hecho:**
  - E2E de registro, inicio de sesión, edición de perfil y direcciones.
  - Un usuario no accede a datos de otro: tests de casos de uso por rol y E2E que lo intenta cambiando la URL.

## Fase 4 · Carrito y checkout (`feat/checkout`) — Hecha
- **Carrito:** panel lateral y página, persistencia y fusión al iniciar sesión.
- **Checkout:** recogida con franjas y capacidad, reparto con zona, mínimo y envío, cupones e IVA desglosado.
- **Pago:** Payment Element con Appearance de MŌRI, `PlaceOrder`, webhook y `ConfirmPayment`. Los pedidos sin pagar dejan libre su franja a los 30 minutos.
- **Confirmación:** página de confirmación y email.
- **Criterio de hecho:**
  - Pago con `4242 4242 4242 4242` probado a mano en local. La E2E de CI cubre carrito, precios, cupones, reparto y accesibilidad sin claves de Stripe.
  - Los tests de casos de uso cubren franja llena, fuera de zona, mínimo no alcanzado, cupón caducado y precio manipulado.
  - El webhook es idempotente (test).

## Fase 5 · Pedidos del cliente (`feat/orders`) — Hecha (Realtime pendiente de activar en Neon)
- Seguimiento en directo con Neon Realtime y sondeo de respaldo (`ETag`), para usuarios con sesión y para invitados con enlace.
- Activar Realtime en la rama principal de Neon y añadir los orígenes de la web.
- Historial, detalle y «Repetir pedido».
- Emails «listo para recoger» y «en reparto».
- «Guardar en mi cuenta» para pedidos de invitado abiertos con su enlace.
- **Criterio de hecho:** E2E en el que el staff avanza un pedido y el cliente lo ve cambiar sin recargar. Hasta el panel de la fase 6, el test avanza el pedido con la misma función `advance_order_status` que usará el panel.

## Fase 6 · Panel de tienda (`feat/admin`) — Hecha
- Tablero en directo con aviso sonoro, detalle, ticket imprimible, cancelación y reembolso.
- Productos con subida de foto a Vercel Blob y regeneración de la carta.
- Cupones, ajustes, clientes y panel de datos con gráficos.
- Modo demo con la cuenta `staff` restringida.
- Workflow programado de GitHub Actions que caduca pedidos sin pagar y genera los pedidos de ejemplo.
- **Criterio de hecho:**
  - E2E de flujo completo: cliente paga → staff prepara → listo → completado, con el cliente viéndolo sin recargar. El pago se simula en la base de datos, porque CI no tiene claves de Stripe.
  - Un cambio de disponibilidad se refleja en la carta.
  - El staff de demo no puede editar productos ni ajustes.

## Fase 7 · Pulido y lanzamiento (`feat/launch`)
- **Contenido:** páginas legales, metadatos, sitemap, datos estructurados de producto, página 404 y páginas de error.
- **Calidad:**
  - Revisión completa de accesibilidad (teclado, lector de pantalla, axe) y de rendimiento (presupuestos de JS por ruta, Lighthouse CI).
  - Cabeceras de seguridad y límites de frecuencia.
  - Valorar un rol de Postgres con permisos mínimos para la app (D-20).
- **README** reescrito como caso de estudio fullstack: arquitectura, decisiones, tests, capturas del panel y del checkout, y cuentas de demo.
- **Despliegue final en Vercel** con todas las variables de entorno.
- **Criterio de hecho:** todo el CI en verde, Lighthouse dentro de presupuesto y la demo navegable por alguien que no conoce el proyecto.

## Fase 8 · Fidelización y extras
- **Tarjeta MŌRI (D-10):** sellos por bebida pagada, tarjeta animada en la cuenta y canje en el checkout. El modelo de datos ya la contempla desde la Fase 2.
- **Opcionales:** web instalable como app (PWA) y notificaciones push de «Tu pedido está listo».
- Reseñas de bebidas por clientes que las han comprado.
- Modo oscuro.
