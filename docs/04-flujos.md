# 04 · Flujos

## Comprar con recogida en tienda

1. En la carta o en la ficha de una bebida, el cliente pulsa **«Añadir»**. Las bebidas con opciones abren el configurador (hoja inferior en móvil, diálogo en escritorio) con las opciones por defecto preseleccionadas y el precio actualizándose en directo.
2. El contador del carrito sube con una pequeña animación y un aviso para lectores de pantalla («Vanilla Matcha añadido al carrito»).
3. **Carrito** (panel lateral): cantidades, editar opciones, eliminar y subtotal. Botón **«Tramitar pedido»**.
4. **Checkout:**
   - **Contacto:** se rellena solo con la cuenta. Un invitado introduce nombre, email y teléfono.
   - **Modalidad:** pestañas «Recoger en tienda» / «Envío a domicilio».
   - **Recoger:** selector de día (hoy o mañana) y rejilla de franjas. Las llenas o pasadas aparecen deshabilitadas con su motivo; «Lo antes posible» es la primera libre.
   - **Cupón**, y **sellos** si el cliente tiene suficientes (Fase 8).
   - **Resumen:** líneas, descuento, total e IVA incluido.
   - **Pagar:** Payment Element con tarjeta, Apple Pay, Google Pay y Link.
5. Al pulsar **«Pagar 9,70 €»** se llama a la Server Action `placeOrder`, que crea el pedido y el PaymentIntent, y luego `stripe.confirmPayment`.
6. **Confirmación:** código de recogida grande (`MR-4F7K`), hora, dirección de la tienda, botón «Añadir al calendario» y seguimiento en directo. El invitado ve «Crea tu cuenta con este email para guardar tus pedidos».
7. **Email** de confirmación con el código y el enlace de seguimiento.

**Errores contemplados:**
- La franja se llena mientras se paga: el servidor la rechaza antes de cobrar y propone la siguiente.
- La bebida se agota: aviso en el carrito y en el checkout.
- La tarjeta se rechaza: mensaje de Stripe en el formulario; el pedido sigue pendiente y se puede reintentar.
- El pago queda pendiente de autenticación (3-D Secure): Stripe lo resuelve en su propia ventana.
- Se cierra la pestaña tras pagar: el webhook confirma igualmente y el email llega.

## Comprar con reparto

Igual que la recogida, cambiando el paso de modalidad:
- **Dirección:** una de las guardadas o una nueva.
- **Código postal fuera de zona:** «Aún no llegamos a 28020. Puedes recogerlo en tienda» y se cambia a recogida.
- **Pedido mínimo no alcanzado:** se indica lo que falta («Te faltan 2,30 € para el pedido mínimo de 12 €»).
- **Envío gratis:** a partir de 25 €, con una barra de progreso hacia el envío gratis en el carrito.
- **Hora:** «Lo antes posible (30–45 min)» o una franja de 30 min programada.

## Seguimiento

- Línea de tiempo:
  - **Recogida:** Recibido → En preparación → Listo para recoger → Completado.
  - **Reparto:** Recibido → En preparación → En reparto → Entregado.
- El paso actual se anima: un vaso que se llena de matcha.
- La página consulta el estado cada 10 segundos mientras está visible, así que cada paso aparece con su hora sin recargar. Al llegar a «Listo», aviso visual y, si el usuario lo permite, una notificación del navegador.

## Registro e inicio de sesión

- **Registro:** nombre, email, contraseña (mínimo 8 caracteres, con indicador de fortaleza) y aceptación de la privacidad. Después llega un email de confirmación y, al confirmar, se entra con sesión iniciada.
- **Google:** un clic. El perfil se crea con el nombre de Google.
- **Recuperar contraseña:** email → enlace → `/cuenta/nueva-contrasena`.
- **Al iniciar sesión:**
  - El carrito local se fusiona con el de la cuenta, sumando cantidades de líneas idénticas.
  - Los pedidos hechos como invitado con el mismo email confirmado se vinculan a la cuenta.
- **Mensajes:** son genéricos («Email o contraseña incorrectos») para no revelar qué emails existen.

## Área de cliente

- **Resumen:** saludo según la hora, último pedido con su estado, la tarjeta de sellos (X de 8, Fase 8) y «Repetir último pedido».
- **Repetir pedido:** copia las líneas al carrito con las opciones originales. Si alguna ya no existe o no está disponible, avisa y la omite.
- **Eliminar cuenta:** confirmación escribiendo «ELIMINAR». Explica que los pedidos se conservan anonimizados por obligación contable.

## Panel de tienda

- **Tablero:**
  - Columnas Nuevos · En preparación · Listos / En reparto · Completados (hoy), con tarjetas que muestran código, hora, modalidad, líneas resumidas y tiempo transcurrido.
  - El tablero se refresca cada 5 segundos. Al entrar un pedido nuevo, la tarjeta aparece con una animación y suena un aviso (activable).
  - Se avanza de estado con un botón en la tarjeta o arrastrando entre columnas, con alternativa por teclado.
- **Detalle:** datos del cliente, líneas con opciones, notas, historial, imprimir ticket (vista de impresión de 80 mm), cancelar y reembolsar total o parcial.
- **Productos:** tabla con buscador. La disponibilidad se cambia con un interruptor directo («Agotado hoy»). La ficha de edición tiene vista previa de la tarjeta tal y como la verá el cliente.
- **Ajustes:**
  - Horario semanal, cierres puntuales y capacidad por franja.
  - Tiempo de preparación, zonas y tarifas de reparto.
  - Pausar pedidos online, que muestra un aviso en la web al instante.
- **Datos:**
  - Tarjetas de ventas de hoy, de la semana y ticket medio.
  - Gráfico de ventas por hora, ranking de bebidas y reparto frente a recogida.

## Estados del pedido

| Desde | Hacia | Quién |
| --- | --- | --- |
| `pending_payment` | `received` | Webhook de Stripe |
| `pending_payment` | `expired` | Trabajo programado (pasados 30 min) |
| `received` | `preparing`, `cancelled` | Staff |
| `preparing` | `ready` (recogida), `out_for_delivery` (reparto) | Staff |
| `ready`, `out_for_delivery` | `completed` | Staff |
| `received`…`completed` | `refunded` | Admin (reembolso total) |

Cancelar un pedido pagado lanza el reembolso automáticamente y devuelve los sellos canjeados.
