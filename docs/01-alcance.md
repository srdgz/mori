# 01 · Alcance y mapa del sitio

## Funcionalidades

### Tienda
- Carta con categorías, filtros (frío / caliente / vegano) y bebidas destacadas.
- Página de producto con configurador de opciones, precio en directo y bebidas relacionadas.
- Carrito en panel lateral y en página, con edición de opciones y cantidades.
- Checkout en un solo paso:
  1. Datos de contacto.
  2. Modalidad: recogida con franja o reparto con dirección.
  3. Cupón (y sellos, en la Fase 8).
  4. Resumen con IVA desglosado.
  5. Pago con Payment Element.
- Confirmación con código de recogida, hora estimada y enlace de seguimiento.
- Seguimiento en directo con línea de tiempo.
- Aviso de «Pedidos online en pausa» cuando la tienda los desactiva o está cerrada, con la próxima apertura.

### Cuenta de cliente
- Registro, inicio de sesión (email y contraseña, Google), recuperación de contraseña y confirmación de email.
- Resumen: último pedido, accesos rápidos y, en la Fase 8, la tarjeta de sellos.
- Pedidos: historial paginado, detalle, seguimiento y «Repetir pedido».
- Perfil: nombre, teléfono, idioma y comunicaciones.
- Direcciones guardadas.
- Favoritos.
- Seguridad: cambiar email y contraseña, y eliminar la cuenta.

### Panel de tienda
- Tablero de pedidos en directo por columnas, con aviso sonoro opcional.
- Detalle de pedido: líneas, opciones, cliente, modalidad, historial, ticket imprimible y reembolso.
- Productos: listado, alta y edición, foto, opciones, disponibilidad y orden.
- Cupones: alta, edición y usos.
- Ajustes: horario, cierres puntuales, capacidad por franja, tiempo de preparación, zonas y tarifas de reparto, y pausa de pedidos online.
- Panel de datos: ventas, ticket medio, ranking de bebidas, modalidad y ventas por hora.
- Clientes: listado con número de pedidos y gasto (solo admin).

### Transversal
- ES y EN en todo, incluidos el panel y los emails.
- Emails transaccionales con la marca.
- Páginas legales.
- Modo demo para quien revise el portfolio (ver D-13).
- SEO: metadatos, `hreflang`, sitemap, `robots` y datos estructurados de `Product`, `CafeOrCoffeeShop` y `BreadcrumbList`.

## Fuera de alcance
- Reparto real con repartidores o integración con plataformas externas.
- Facturación con datos fiscales del cliente: Stripe envía el recibo.
- Múltiples tiendas.
- App móvil nativa (la web es instalable como PWA en una fase opcional).

## Mapa del sitio

Español sin prefijo e inglés bajo `/en`, con rutas traducidas.

| Área | Español | Inglés | Acceso | Render |
| --- | --- | --- | --- | --- |
| Marca | `/` | `/en` | Público | Estático |
| | `/historia` | `/en/story` | Público | Estático |
| | `/cultura-matcha` | `/en/matcha-culture` | Público | Estático |
| | `/donde-estamos` | `/en/find-us` | Público | Estático |
| | `/contacto` | `/en/contact` | Público | Estático + Server Action |
| Tienda | `/carta` | `/en/menu` | Público | Estático, revalidado al cambiar el catálogo |
| | `/carta/[producto]` | `/en/menu/[product]` | Público | Estático, revalidado al cambiar el catálogo |
| | `/carrito` | `/en/cart` | Público | Cliente |
| | `/checkout` | `/en/checkout` | Público | Dinámico |
| | `/pedido/[codigo]` | `/en/order/[code]` | Dueño del pedido o enlace firmado | Dinámico + Realtime |
| Cuenta | `/cuenta/entrar` | `/en/account/sign-in` | Invitado | Dinámico |
| | `/cuenta/registro` | `/en/account/sign-up` | Invitado | Dinámico |
| | `/cuenta/recuperar` | `/en/account/forgot-password` | Invitado | Dinámico |
| | `/cuenta/nueva-contrasena` | `/en/account/reset-password` | Enlace del email | Dinámico |
| | `/cuenta` | `/en/account` | Cliente | Dinámico |
| | `/cuenta/pedidos` | `/en/account/orders` | Cliente | Dinámico |
| | `/cuenta/pedidos/[codigo]` | `/en/account/orders/[code]` | Cliente | Dinámico + Realtime |
| | `/cuenta/perfil` | `/en/account/profile` | Cliente | Dinámico |
| | `/cuenta/direcciones` | `/en/account/addresses` | Cliente | Dinámico |
| | `/cuenta/favoritos` | `/en/account/favourites` | Cliente | Dinámico |
| | `/cuenta/seguridad` | `/en/account/security` | Cliente | Dinámico |
| Panel | `/admin` | `/en/admin` | Staff | Dinámico |
| | `/admin/pedidos` | `/en/admin/orders` | Staff | Dinámico + Realtime |
| | `/admin/pedidos/[codigo]` | `/en/admin/orders/[code]` | Staff | Dinámico |
| | `/admin/productos` | `/en/admin/products` | Admin | Dinámico |
| | `/admin/productos/[id]` | `/en/admin/products/[id]` | Admin | Dinámico |
| | `/admin/cupones` | `/en/admin/coupons` | Admin | Dinámico |
| | `/admin/clientes` | `/en/admin/customers` | Admin | Dinámico |
| | `/admin/ajustes` | `/en/admin/settings` | Admin | Dinámico |
| Legal | `/aviso-legal` | `/en/legal-notice` | Público | Estático |
| | `/privacidad` | `/en/privacy` | Público | Estático |
| | `/cookies` | `/en/cookies` | Público | Estático |
| | `/condiciones-de-venta` | `/en/terms-of-sale` | Público | Estático |
| Técnico | `/auth/callback` | | | Route Handler |
| | `/api/stripe/webhook` | | | Route Handler |
| | `/api/cron/demo-orders` | | | Route Handler (Vercel Cron) |

El staff de demostración ve `/admin` y `/admin/pedidos`. Las secciones de admin aparecen en el menú, pero deshabilitadas y con una explicación.

## Navegación

- **Cabecera pública:** logo, enlaces de marca, «La carta», selector de idioma, cuenta (icono que abre «Entrar» o el menú de usuario) y carrito con contador.
- **Botón principal del hero:** pasa de «Descubre la carta» a **«Pide ahora»**.
- **Área de cliente:** navegación lateral en escritorio y pestañas desplazables en móvil.
- **Panel:** barra lateral propia y estética más funcional, con los mismos tokens de marca.
