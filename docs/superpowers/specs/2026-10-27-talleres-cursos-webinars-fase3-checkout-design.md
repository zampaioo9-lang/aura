# Fase 3: Checkout de invitado + pago — Design Spec

**Fecha:** 2026-10-27
**Depende de:** Fase 1 (Offering/Module CRUD, PR #4) y Fase 2 (Question/ScoringRule CRUD + gates de publish/delete, PR #5 y #6), ambas mergeadas y desplegadas en produccion.
**Sigue a:** `docs/superpowers/plans/2026-10-26-talleres-cursos-webinars-fase2-cuestionarios.md`, seccion "Que sigue despues de esta Fase 2".

## Resumen

Un visitante sin cuenta en Aliax puede ver un Offering publicado en una pagina publica, pagarlo con Stripe o PayPal (en USD, o en MXN si el profesional configuro `priceMXN`), y recibir por correo un link con un `accessToken` unico. Ese token es, por ahora, su unica credencial: no existe ni se construye en esta fase ninguna cuenta de comprador ni la pagina que usa ese token para ver el contenido (eso es Fase 4).

El dinero del pago entra a las cuentas de Stripe/PayPal que ya usa Aliax para cobrar las suscripciones Pro/Clinico. El pago al profesional (su parte, menos cualquier comision) se maneja fuera de este sistema por ahora — no hay Stripe Connect ni modulo de payouts en esta fase.

## Decisiones de alcance (ya acordadas)

1. **Dos proveedores desde el inicio:** Stripe y PayPal, ambos en modo de pago unico (no suscripcion).
2. **100% invitado:** el comprador nunca inicia sesion ni crea cuenta. Compra con nombre + correo (+ telefono opcional), y el `accessToken` por correo es su unico vinculo con la compra.
3. **`Purchase` se crea solo cuando el pago esta confirmado.** El webhook de cada proveedor es la unica fuente de verdad. Nunca existe un `Purchase` con `paidAt = null` en la base de datos.
4. **USD y MXN:** si el Offering tiene `priceMXN`, el comprador puede elegir pagar en esa moneda; si no, solo USD.
5. **Cupo (`capacity`) se hace valer:** si un Offering `LIVE_WORKSHOP` tiene `capacity` definido, el checkout se bloquea una vez alcanzado.
6. **El dinero va a las cuentas de Aliax.** Sin Stripe Connect en esta fase.
7. **Incluye una pagina publica minima** (ver Offering + botones de pago). No incluye listar las ofertas de un profesional dentro de su perfil publico (eso es descubrimiento, no checkout, y queda para otra fase) ni la pagina de acceso al contenido comprado (Fase 4).

## Cambios al modelo de datos

El modelo `Purchase` ya existe desde Fase 1, pero le faltan dos campos que esta fase necesita:

```prisma
model Purchase {
  id          String    @id @default(uuid())
  offeringId  String
  buyerName   String
  buyerEmail  String
  buyerPhone  String?
  accessToken String    @unique
  paidAt      DateTime?
  amountPaid  Decimal?
  currency    String    // NUEVO: 'USD' | 'MXN'. amountPaid no tiene sentido sin saber en que moneda.
  providerRef String    @unique // NUEVO: Stripe Checkout Session id, o PayPal Order id.
  createdAt   DateTime  @default(now())

  offering Offering @relation(fields: [offeringId], references: [id], onDelete: Cascade)
  answers  Answer[]

  @@index([offeringId])
  @@index([accessToken])
}
```

`providerRef` es la clave de idempotencia: antes de crear un `Purchase`, el webhook verifica si ya existe uno con ese `providerRef` (los webhooks de Stripe reintentan automaticamente si no reciben 200 a tiempo, y PayPal tiene su propio reintento). Si ya existe, el webhook responde 200 sin crear un duplicado.

## Backend

### Archivos nuevos

- **`backend/src/routes/purchases.ts`** — rutas nuevas, sin middleware de auth (son para invitados):
  - `POST /api/purchases/checkout` — body: `{ offeringId, buyerName, buyerEmail, buyerPhone?, currency: 'USD' | 'MXN', provider: 'stripe' | 'paypal' }`. Valida (en este orden, cada una con su propio mensaje de error):
    1. El Offering existe y esta `PUBLISHED` (si no, 404 — mismo criterio que ya usa `GET /api/offerings/:id` para decidir que es "publico").
    2. Si `currency === 'MXN'`, el Offering tiene `priceMXN` (si no, 400).
    3. Si `type === 'LIVE_WORKSHOP'` y `scheduledAt` ya paso, 400 ("este taller ya se llevo a cabo").
    4. Si `capacity` esta definido, cuenta `Purchase` existentes para ese `offeringId`; si ya se alcanzo, 400 ("cupo lleno").
    5. Crea la sesion de Stripe o la orden de PayPal (segun `provider`) con metadata/custom fields que cargan `offeringId`, `buyerName`, `buyerEmail`, `buyerPhone`, `currency` — el webhook necesita todo esto para crear el `Purchase` sin tener que volver a pedirle nada al comprador.
    6. Devuelve `{ redirectUrl }`.
  - `POST /api/purchases/stripe/webhook` — raw body (requiere la misma linea en `index.ts` que ya existe para `/api/subscriptions/stripe/webhook`, agregada para esta nueva ruta). En `checkout.session.completed`, si `session.metadata.offeringId` existe (asi se distingue de los webhooks de suscripcion, que no tienen ese campo), llama a `purchaseService.createPurchaseAndNotify(...)`.
  - `POST /api/purchases/paypal/webhook` — respaldo servidor-a-servidor, mismo patron que `subscriptions.ts` ya usa (`verifyPayPalWebhookSignature`). En el evento `CHECKOUT.ORDER.APPROVED` o `PAYMENT.CAPTURE.COMPLETED` (el que resulte mas confiable al implementar — se decide en el plan), llama a `capturePayPalOrder` si no se ha capturado todavia, y luego a `createPurchaseAndNotify(...)`.
  - `POST /api/purchases/paypal/capture` — sin auth. El comprador vuelve aqui desde la pagina de aprobacion de PayPal (`return_url`); el frontend llama esta ruta con el `orderId` de la URL. Llama a `capturePayPalOrder` y luego a `createPurchaseAndNotify(...)`. Esta ruta y el webhook de respaldo deben ser ambos idempotentes via `providerRef` — no importa cual de los dos llegue primero.

- **`backend/src/services/purchaseService.ts`** — un unico punto de creacion:
  ```
  async function createPurchaseAndNotify(params: {
    offeringId: string;
    buyerName: string;
    buyerEmail: string;
    buyerPhone?: string;
    amountPaid: number;
    currency: 'USD' | 'MXN';
    providerRef: string;
  }): Promise<Purchase>
  ```
  - Si ya existe un `Purchase` con ese `providerRef`, lo devuelve sin crear nada mas (idempotencia).
  - Si no, genera `accessToken = crypto.randomUUID()` (mismo patron que `upload.ts`), crea el `Purchase` con `paidAt = new Date()`, envia el correo de confirmacion al comprador (nueva plantilla en `emailTemplates`, con el link `${FRONTEND_URL}/mi-compra/${accessToken}` — la ruta en si la construye Fase 4, pero el link ya se puede generar y enviar desde ahora) y notifica al admin (mismo patron que `emailTemplates.adminNewPayment`, nueva plantilla equivalente para ventas de Offering).

- **Stripe:** nueva funcion en `stripeService.ts` (o un archivo separado si crece mucho — se decide en el plan) para crear una Checkout Session en modo `payment` para un Offering, separada de `createCheckoutSession` (que es especifica de planes/suscripciones y no se toca). Metadata: `{ offeringId, buyerName, buyerEmail, buyerPhone, currency }`. `success_url`/`cancel_url` apuntan a las paginas nuevas del frontend (ver abajo), no a `/payment/success` (esa es especifica de planes y esta detras de `ProtectedRoute`).

- **PayPal:** se reutiliza `createPayPalOrder`/`capturePayPalOrder` tal cual ya existen (son genericos), pasando la descripcion del Offering en vez de "Aliax Pro Lifetime", y el `custom_id` codifica los datos del comprador (PayPal no soporta metadata libre como Stripe; se decide en el plan si `custom_id` lleva un JSON compacto o si se guarda temporalmente en una tabla/cache por `orderId` — es un detalle de implementacion, no de diseno).

### `index.ts`

Agregar la linea de `express.raw` para la nueva ruta de webhook de Stripe, igual que ya existe para la de suscripciones:
```
app.use('/api/purchases/stripe/webhook', express.raw({ type: 'application/json' }));
```

## Frontend

- **Pagina publica nueva**, ruta `/oferta/:offeringId` (fuera de `ProtectedRoute`, mismo nivel que `/:slug`): usa `GET /api/offerings/:id` (ya existe y ya es publica para Offerings `PUBLISHED`). Muestra titulo, descripcion, precio (selector USD/MXN si `priceMXN` existe), y dos botones ("Pagar con tarjeta" / "Pagar con PayPal"). Un formulario minimo pide nombre, correo, telefono opcional antes de habilitar los botones de pago.
- Al elegir un metodo de pago, llama a `POST /api/purchases/checkout` y redirige a la `redirectUrl` que devuelve (la pagina hospedada de Stripe o de PayPal).
- **Paginas de retorno**, nuevas y simples (no reusan `PaymentSuccess.tsx`, que esta detras de login): una pagina de exito ("Pago recibido, revisa tu correo") y una de cancelacion ("Pago cancelado, puedes intentar de nuevo"). Para el flujo de PayPal, la pagina de exito es la que dispara la llamada a `POST /api/purchases/paypal/capture` con el `orderId` de la URL antes de mostrar el mensaje.

## Casos especiales y limites conocidos

- **Condicion de carrera en `capacity`:** el chequeo de cupo en `POST /checkout` y la creacion del `Purchase` en el webhook son pasos separados y no transaccionales (misma clase de limite ya aceptada en los gates de Fase 2). Dos compradores casi simultaneos podrian ambos pasar el chequeo cuando solo queda 1 lugar. Dado que el pago ya se capturo para ambos en ese escenario, no hay reembolso automatico — el profesional tendria que resolverlo manualmente (contactar a uno de los dos). Aceptable para el volumen esperado en esta etapa; se documenta como limite conocido, no se bloquea el diseno por esto.
- **Mismo correo compra el mismo Offering dos veces:** permitido sin restriccion (ej. alguien lo compra de regalo para otra persona usando su propio correo). No hay unicidad `(offeringId, buyerEmail)`.
- **Webhook duplicado/reintento:** resuelto por la unicidad de `providerRef` (ver arriba).
- **Taller en vivo cuya fecha ya paso:** bloqueado en `POST /checkout` (ver validaciones arriba). Si un Offering pasa a fecha pasada estando `PUBLISHED`, nadie puede comprarlo mas, pero el Offering no se despublica automaticamente (fuera de alcance; el profesional lo archiva manualmente si quiere).

## Fuera de alcance (explicito)

- Listar los Offerings de un profesional dentro de su perfil publico (descubrimiento, no checkout).
- Stripe Connect / payouts automaticos al profesional.
- La pagina de acceso al contenido comprado, responder el cuestionario, calcular el puntaje con `ScoringRule`, generar el PDF de resultado — todo eso es Fase 4.
- Reembolsos (ni API ni flujo manual documentado aqui).

## Verificacion

Este backend no tiene suite de tests (igual que Fases 1 y 2). La verificacion sera empirica contra el dev server local + datos de prueba desechables, usando las claves de prueba (test mode) de Stripe y PayPal sandbox — nunca contra las cuentas de produccion. Casos minimos a verificar antes de mergear:
- Checkout exitoso con Stripe (USD y MXN si aplica) crea un `Purchase` con todos los campos correctos y envia el correo.
- Checkout exitoso con PayPal (via `/capture` y via el webhook de respaldo, idealmente simulando que el webhook llega primero y luego el capture, y viceversa) no crea `Purchase` duplicados.
- Intentar comprar un Offering no publicado, o uno con cupo lleno, o un `LIVE_WORKSHOP` con fecha pasada, cada uno devuelve 400/404 sin crear ninguna sesion de pago.
- Un webhook de Stripe reenviado dos veces (mismo `providerRef`) no duplica el `Purchase`.
