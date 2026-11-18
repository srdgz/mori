# MŌRI — Matcha Bar & Culture

[English](README.md) | **Español**

**Not just matcha. It's a mood.**

MŌRI es un matcha bar urbano ficticio en Malasaña, Madrid. Empezó como caso de estudio de diseño de marca y motion, y ha crecido hasta ser una tienda online completa: configurador de bebidas, cuentas, carrito, pago con Stripe, seguimiento del pedido en directo y un panel desde el que el equipo lleva el día.

**Web:** [mori-matcha-bar.vercel.app](https://mori-matcha-bar.vercel.app)

![Portada de MŌRI: titular «Good matcha. Good mood.» sobre un iced matcha latte](docs/screenshots/home-hero.webp)

## Pruébala

Todo funciona como en una tienda de verdad, pero no se cobra nada y no se prepara ninguna bebida.

| Qué                      | Cómo                                                                                                                             |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Pedir como cliente       | Elige una bebida en la carta, compra como invitado y paga con la tarjeta `4242 4242 4242 4242`, cualquier fecha futura y CVC     |
| Cuenta de cliente        | En la página de acceso, pulsa **Entrar en modo demo**                                                                            |
| Panel de tienda          | En la página de acceso, pulsa **Ver el panel de tienda (demo)**. El personal de demo mueve los pedidos de ejemplo, no los reales |
| Ver un pedido en directo | Abre el enlace de seguimiento de tu pedido en una ventana y el panel de tienda en otra                                           |

## Capturas

| Configurador de bebidas                                                                                        | Checkout                                                                                                                     |
| -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| ![Página de Classic Matcha con opciones de tamaño, leche y extras, y el precio](docs/screenshots/product.webp) | ![Checkout con franjas de recogida, datos de contacto, pago con Stripe y resumen del pedido](docs/screenshots/checkout.webp) |

| Seguimiento en directo                                                                                   | Tablero del panel                                                                                                                |
| -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| ![Seguimiento del pedido con los pasos recibido, en preparación y listo](docs/screenshots/tracking.webp) | ![Tablero de pedidos en directo con columnas de nuevos, en preparación, listos y completados](docs/screenshots/admin-board.webp) |

| Datos de ventas                                                                                            | Editor de productos                                                                                                                      |
| ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| ![Panel de datos con ventas de hoy, ticket medio y ventas por hora](docs/screenshots/admin-dashboard.webp) | ![Editor de producto con textos en español e inglés, precio, opciones y vista previa de la tarjeta](docs/screenshots/admin-product.webp) |

| Colección horizontal fija                                                                                                                          | Carta                                                                                                 |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| ![The Matcha Collection: tarjetas de bebidas que se desplazan en horizontal mientras la sección queda fija](docs/screenshots/home-collection.webp) | ![Carta con fotos de las bebidas, etiquetas del color del vaso y precios](docs/screenshots/menu.webp) |

![Tres móviles con la portada, la carta y la navegación](docs/screenshots/mobile.webp)

## Qué hace

### Para los clientes

- **Carta y páginas de bebida** con configurador: tamaño, temperatura, bebida base, dulzor y extras, con el precio actualizado al elegir. Lo que se ha agotado hoy aparece como agotado.
- **Carrito** que sobrevive a las recargas y se fusiona con el guardado al iniciar sesión.
- **Checkout** con franjas de recogida que se llenan (capacidad por franja, atómica en Postgres) o envío por código postal con pedido mínimo, coste fijo y envío gratis desde 25 €. Cupones e IVA del 10 % desglosado.
- **Stripe Payment Element** con la estética de la marca y confirmación por webhook. Los pedidos sin pagar liberan su franja a los 30 minutos.
- **Seguimiento en directo** con Neon Realtime y sondeo de respaldo, tanto con cuenta como para invitados con un enlace privado. Emails cuando el pedido está listo o en reparto.
- **Cuenta:** historial y «Repetir pedido», perfil, direcciones, favoritos, contraseña y borrado de cuenta. Acceso con email, Google o una cuenta demo en un clic.
- **Tarjeta MŌRI:** cada bebida pagada suma un sello. Con 8, el cliente elige qué bebida de su pedido le invitamos, con sus extras. Si se cancela el pedido, los sellos vuelven.
- **Reseñas:** los clientes valoran las bebidas que han recibido desde el detalle del pedido, y aparecen en la ficha como compra verificada.
- **App instalable y avisos push:** PWA con página sin conexión y avisos Web Push cuando el pedido está listo o va de camino.
- **Modo oscuro:** sigue al sistema por defecto o se elige en el perfil. La marca, la tienda y el panel tienen su versión oscura.

### Para la tienda

- **Tablero en directo** con una columna por paso y un botón para avanzar cada pedido. Aviso sonoro opcional para los pedidos nuevos.
- **Detalle del pedido** con su historial, ticket imprimible de 80 mm, cancelación y reembolsos con Stripe.
- **Editor de la carta** con subida de fotos a Vercel Blob, interruptores de «agotado hoy» por bebida y por ingrediente, y regeneración inmediata de la carta.
- **Cupones, horario, días de cierre, capacidad por franja, zonas de reparto, clientes, reseñas y panel de datos.**
- **Modo demo:** una cuenta de personal que lo ve todo pero solo mueve pedidos de ejemplo, que un trabajo programado mantiene en marcha.

## Diseño

Las marcas de matcha suelen ir por uno de dos caminos: solemne y ceremonial, o pastel y delicado. MŌRI evita los dos: una marca urbana y fresca que convierte el matcha en un pequeño ritual diario.

![Paleta de MŌRI: Forest, Matcha, Cream, Charcoal y Sage](docs/palette.svg)

- **Color:** un verde bosque profundo sostiene la marca, con un único acento matcha ácido para destacados, llamadas a la acción y datos. Los fondos crema y papel recogen el travertino de la fotografía.
- **Tipografía:** Space Grotesk para los titulares y DM Sans para el texto y la interfaz.
- **Logo:** un emblema (un brote de té saliendo de un cuenco) y el logotipo MŌRI, dibujados como símbolos vectoriales que toman el color del contexto.
- **Movimiento al servicio de la historia:** titulares que entran línea a línea, una colección horizontal fija, separadores en forma de ola y un logotipo en el pie que se llena al llegar al final. Todo respeta «reducir movimiento».
- **La tienda mantiene la marca:** el panel del carrito, el checkout, el seguimiento y el panel de tienda usan los mismos tokens, la misma tipografía y el mismo tono.

## Arquitectura

Clean architecture: las dependencias solo apuntan hacia dentro, y ESLint (`eslint-plugin-boundaries`) rompe el build si una capa importa otra que no debe.

```
src/
├─ core/
│  ├─ domain/          Reglas puras: dinero, carrito, opciones, franjas, reparto, cupones, estados del pedido, permisos
│  └─ application/     Casos de uso (PlaceOrder, AdvanceOrderStatus, RefundOrder, GetBoard…) y sus puertos
├─ infrastructure/     Adaptadores: Drizzle (Neon), Better Auth, Stripe, Neon Realtime, Vercel Blob, emails, memoria
├─ composition/        Monta los casos de uso con sus adaptadores (solo servidor)
├─ app/[locale]/       Rutas de Next.js, metadatos y Server Actions
├─ app/api/            Webhook de Stripe, seguimiento, consultas en directo, subidas y trabajos programados
├─ ui/                 Componentes de marca, tienda, cuenta, panel, movimiento y SEO
└─ i18n/               Rutas traducidas con next-intl
db/                    Migraciones, seed y el rol de permisos mínimos
e2e/                   Tests de Playwright y axe
```

Decisiones clave (la lista completa está en [`docs/00-decisiones.md`](docs/00-decisiones.md)):

- **Primero el servidor.** Las páginas de marca y la carta son Server Components estáticos que se regeneran cuando el panel cambia el catálogo. Solo la interacción y el movimiento van en el cliente.
- **Tres capas de permisos.** Las políticas de dominio se comprueban en cada caso de uso (con tests al 100 %). Las operaciones críticas (crear pedido, confirmar pago, cambiar de estado) son funciones SQL que validan por sí mismas las transiciones y la capacidad. La app está preparada para conectarse con un rol de Postgres que solo puede leer y escribir filas (`db/app-role.sql`).
- **El navegador nunca habla con la base de datos.** Las Server Actions validan la entrada con zod y llaman a los casos de uso. Un invitado solo llega a su pedido con el token de seguimiento.
- **Tiempo real sin dependencia.** Las consultas selladas de Neon Realtime avisan al tablero y al seguimiento. Si Realtime está apagado, las mismas pantallas sondean con `ETag` y respuestas `304`.
- **Trabajos programados en GitHub Actions** cada 15 minutos, porque el cron de Vercel Hobby solo se ejecuta una vez al día.

## Calidad

| Nivel             | Herramienta                     | Qué cubre                                                                                                           |
| ----------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Dominio           | Vitest                          | 100 % de cobertura obligatorio                                                                                      |
| Casos de uso      | Vitest + adaptadores en memoria | Cada caso de uso con cada rol: invitado, cliente, personal, personal de demo y admin                                |
| Contratos         | Vitest + PGlite                 | La misma batería contra los adaptadores en memoria y los de Drizzle, con las migraciones reales                     |
| Base de datos     | Vitest + Postgres en CI         | Funciones SQL, restricciones y dos pedidos compitiendo por el último hueco de una franja                            |
| Extremo a extremo | Playwright (escritorio y móvil) | Compra, cuentas, seguimiento en directo, panel de tienda, límites de la demo, checkout con teclado, páginas legales |
| Accesibilidad     | axe en Playwright               | WCAG 2.2 AA en todas las páginas públicas en los dos idiomas y en todo el panel                                     |
| Rendimiento       | Lighthouse CI                   | Rendimiento, accesibilidad, buenas prácticas, SEO y un presupuesto de JavaScript por ruta                           |

Seguridad: una Content Security Policy limitada a Stripe, Vercel Blob y Neon Realtime, HSTS, firma de los webhooks de Stripe, límites de frecuencia en acceso, registro, recuperación de contraseña y pedidos, y ningún mensaje que revele si un email está registrado.

### Rendimiento

Lighthouse en la web publicada, móvil, mediana de tres pasadas, noviembre de 2026:

| Página           | Rendimiento | Accesibilidad | Buenas prácticas | SEO | LCP   |
| ---------------- | ----------- | ------------- | ---------------- | --- | ----- |
| Portada          | 100         | 100           | 100              | 100 | 1,2 s |
| Historia         | 98          | 100           | 100              | 100 | 2,3 s |
| Carta            | 100         | 100           | 100              | 100 | 1,1 s |
| Página de bebida | 98          | 100           | 100              | 100 | 2,3 s |
| Cultura matcha   | 100         | 100           | 100              | 100 | 1,1 s |
| Dónde estamos    | 100         | 100           | 100              | 100 | 1,1 s |

## Stack

[Next.js 16](https://nextjs.org) (App Router, React 19) · TypeScript · [Tailwind CSS 4](https://tailwindcss.com) · [next-intl](https://next-intl.dev) · Postgres y Realtime de [Neon](https://neon.com) · [Drizzle ORM](https://orm.drizzle.team) · [Better Auth](https://www.better-auth.com) · [Stripe](https://stripe.com) · Vercel Blob · Web Push · [GSAP](https://gsap.com) · [Lenis](https://lenis.darkroom.engineering) · zod · Vitest · PGlite · Playwright · axe · Lighthouse CI · GitHub Actions · Vercel

## Ejecutarla en local

```bash
npm install
npm run db:local
```

En otra terminal, con `DATABASE_URL` apuntando a `postgres://postgres:postgres@127.0.0.1:5433/postgres`:

```bash
npm run db:migrate
npm run db:seed
npm run dev
```

`.env.example` recoge todas las variables. Sin claves de Stripe, el checkout explica que los pagos no están configurados; sin Realtime, el seguimiento sondea.

| Script               | Qué hace                                                                |
| -------------------- | ----------------------------------------------------------------------- |
| `npm run dev`        | Servidor de desarrollo en `localhost:3000`                              |
| `npm run db:local`   | Postgres local (PGlite) en el puerto 5433, sin Docker                   |
| `npm run db:migrate` | Aplica las migraciones                                                  |
| `npm run db:seed`    | Carta, ajustes, cupones y cuentas demo (se puede repetir sin miedo)     |
| `npm run lint`       | ESLint, incluidas las reglas de arquitectura                            |
| `npm run typecheck`  | Comprobación de tipos                                                   |
| `npm run test`       | Tests unitarios, de casos de uso, de contrato y de base de datos        |
| `npm run e2e`        | Tests extremo a extremo y de accesibilidad sobre un build de producción |
| `npm run lighthouse` | Lighthouse CI con los presupuestos de `lighthouserc.json`               |

Hace falta Node 22 o superior.

## Despliegue

Vercel construye cada push: `main` es producción y cada pull request tiene su vista previa con su propia rama de base de datos en Neon. El build aplica las migraciones y el seed antes de `next build`.

---

MŌRI es una marca ficticia creada para un portfolio. La dirección, el horario y los precios son inventados, y los pagos van en el modo de prueba de Stripe.
