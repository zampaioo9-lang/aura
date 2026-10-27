# Fase 3: Checkout de invitado + pago — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un visitante sin cuenta puede ver un Offering publicado, pagarlo con Stripe o PayPal (USD o MXN), y recibir por correo un link con un `accessToken` que sera su acceso al contenido en Fase 4.

**Architecture:** Nuevo archivo `backend/src/routes/purchases.ts` (rutas de checkout de invitado, sin auth) + `backend/src/services/purchaseService.ts` (unico punto de creacion de `Purchase`, idempotente via `providerRef`). Se reutilizan los webhooks de Stripe/PayPal **que ya existen** (`/api/subscriptions/stripe/webhook` y `/api/subscriptions/paypal/webhook`) en lugar de crear webhooks nuevos — ver la nota de "Desviacion del spec" abajo. Dos piezas de pago (Stripe Checkout Session dinamica, PayPal Order genericos) ya tienen primos cercanos en `stripeService.ts`/`paypalService.ts` que se generalizan en vez de duplicarse.

**Tech Stack:** Express + Prisma + Zod + Stripe SDK + fetch nativo a la API REST de PayPal (mismos que ya usa el proyecto). Frontend: React + react-router-dom + axios (`src/api/client.ts`), Tailwind.

---

## Desviacion deliberada del spec (leer antes de empezar)

El spec (`docs/superpowers/specs/2026-10-27-talleres-cursos-webinars-fase3-checkout-design.md`) describe webhooks **nuevos**: `POST /api/purchases/stripe/webhook` y `POST /api/purchases/paypal/webhook`. Este plan los reemplaza por **reutilizar los webhooks que ya existen** en `subscriptions.ts`, por una razon operativa importante:

- Un webhook nuevo requeriria que Cesar configure manualmente un endpoint nuevo en el Dashboard de Stripe (con su propio signing secret) y/o un webhook nuevo en PayPal (con su propio `PAYPAL_WEBHOOK_ID`) **antes de poder desplegar esto a produccion**.
- El webhook de Stripe que ya existe escucha `checkout.session.completed` — el mismo evento que necesitamos. El webhook de PayPal que ya existe escucha `PAYMENT.CAPTURE.COMPLETED` — tambien el mismo evento que necesitamos.
- Por lo tanto, **no se necesita ninguna configuracion nueva en los dashboards de Stripe/PayPal, ni ninguna variable de entorno nueva.** Solo se agrega una rama nueva dentro de las funciones que ya procesan esos eventos, distinguiendo "esto es una compra de Offering" de "esto es un pago de plan/suscripcion" por la forma de los datos (ver Tarea 5 y 6).

Esto es un cambio de *donde vive el codigo*, no de *que hace*: el comportamiento descrito en el resto del spec (Purchase solo se crea con el pago confirmado, idempotencia via `providerRef`, etc.) se mantiene igual.

---

## Task 0: Preparar el worktree

**Files:** ninguno (solo comandos).

- [ ] **Step 1: Verificar que `.worktrees/` este en `.gitignore`**

```bash
cd "C:\Users\zampa\Mis Proyectos\Aliax"
git check-ignore -q .worktrees && echo "IGNORED" || echo "NOT IGNORED"
```
Expected: `IGNORED` (ya se verifico en Fase 1/2, debe seguir igual).

- [ ] **Step 2: Crear el worktree y la rama**

```bash
git worktree add .worktrees/talleres-fase3-checkout -b feature/talleres-fase3-checkout master
```

- [ ] **Step 3: Copiar los `.env` (no estan versionados, hay que copiarlos a mano en cada worktree nuevo)**

```bash
cp "C:\Users\zampa\Mis Proyectos\Aliax\backend\.env" "C:\Users\zampa\Mis Proyectos\Aliax\.worktrees\talleres-fase3-checkout\backend\.env"
cp "C:\Users\zampa\Mis Proyectos\Aliax\frontend\.env" "C:\Users\zampa\Mis Proyectos\Aliax\.worktrees\talleres-fase3-checkout\frontend\.env" 2>/dev/null || true
```

- [ ] **Step 4: Instalar dependencias**

```bash
cd "C:\Users\zampa\Mis Proyectos\Aliax\.worktrees\talleres-fase3-checkout\backend" && npm install
cd "C:\Users\zampa\Mis Proyectos\Aliax\.worktrees\talleres-fase3-checkout\frontend" && npm install
```

- [ ] **Step 5: Verificar que compila limpio antes de tocar nada**

```bash
cd "C:\Users\zampa\Mis Proyectos\Aliax\.worktrees\talleres-fase3-checkout\backend" && npx tsc --noEmit
```
Expected: sin output (sin errores).

Todos los paths de las tareas siguientes son relativos a `C:\Users\zampa\Mis Proyectos\Aliax\.worktrees\talleres-fase3-checkout\`.

---

## Task 1: Migracion de schema — campos de `Purchase` + modelo `PendingOfferingCheckout`

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/<timestamp>_add_purchase_currency_ref_and_pending_checkout/migration.sql`

- [ ] **Step 1: Editar el modelo `Purchase` y agregar `PendingOfferingCheckout`**

En `backend/prisma/schema.prisma`, buscar el modelo `Purchase` (linea ~669) y reemplazarlo por:

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
  currency    String
  providerRef String    @unique
  createdAt   DateTime  @default(now())

  offering Offering @relation(fields: [offeringId], references: [id], onDelete: Cascade)
  answers  Answer[]

  @@index([offeringId])
  @@index([accessToken])
}

// Guarda los datos del comprador entre el momento en que se crea una orden de PayPal
// (antes de que el comprador pague) y el momento en que se confirma el pago. PayPal no
// soporta metadata libre como Stripe -- el custom_id de una orden tiene un limite de 127
// caracteres, insuficiente para nombre+correo+telefono -- asi que se guarda aqui y se
// referencia por id en el custom_id. Se borra en cuanto se lee (ver purchaseService.ts).
// Stripe no necesita esto: su metadata permite pasar los datos del comprador directo.
model PendingOfferingCheckout {
  id         String   @id @default(uuid())
  offeringId String
  buyerName  String
  buyerEmail String
  buyerPhone String?
  currency   String
  createdAt  DateTime @default(now())
}
```

- [ ] **Step 2: Generar el SQL de la migracion SIN usar `migrate dev` (Neon no soporta su shadow database)**

Este proyecto ya tuvo este problema en Fase 1/2. La forma segura de generar el SQL sin un shadow database es diffear la base de datos real contra el schema nuevo con `--from-url`:

```bash
cd "C:\Users\zampa\Mis Proyectos\Aliax\.worktrees\talleres-fase3-checkout\backend"
npx prisma migrate diff --from-url "$(grep DATABASE_URL .env | cut -d '=' -f2- | tr -d '"')" --to-schema-datamodel prisma/schema.prisma --script > /tmp/fase3-migration.sql
cat /tmp/fase3-migration.sql
```
Expected: SQL con dos `ALTER TABLE "Purchase" ADD COLUMN ...` (currency, providerRef) y un `CREATE TABLE "PendingOfferingCheckout" (...)`. Revisar que NO incluya nada sobre otras tablas (si aparece algo mas, el schema tiene un cambio sin querer en otro lado -- parar y revisar antes de continuar).

- [ ] **Step 3: Crear la carpeta de migracion con ese SQL**

```bash
TIMESTAMP=$(date +%Y%m%d%H%M%S)
mkdir -p "prisma/migrations/${TIMESTAMP}_add_purchase_currency_ref_and_pending_checkout"
cp /tmp/fase3-migration.sql "prisma/migrations/${TIMESTAMP}_add_purchase_currency_ref_and_pending_checkout/migration.sql"
```

- [ ] **Step 4: Aplicar la migracion (esto SI funciona sin shadow database)**

```bash
npx prisma migrate deploy
```
Expected: `1 migration found... Applied`. Si falla porque `providerRef`/`currency` no pueden ser `NOT NULL` sobre filas existentes de `Purchase` -- no deberia pasar, hoy la tabla `Purchase` esta vacia (ninguna ruta la usa todavia), pero si llegara a fallar por eso, confirmar `SELECT count(*) FROM "Purchase";` es 0 antes de reintentar.

- [ ] **Step 5: Regenerar el cliente de Prisma**

```bash
npx prisma generate
```

- [ ] **Step 6: Verificar que compila**

```bash
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add Purchase.currency/providerRef and PendingOfferingCheckout model

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 2: Validacion Zod para el checkout

**Files:**
- Modify: `backend/src/utils/validation.ts`

- [ ] **Step 1: Agregar `checkoutSchema` al final del archivo**

```typescript
export const checkoutSchema = z.object({
  offeringId: z.string().uuid('offeringId invalido'),
  buyerName: z.string().min(2, 'Minimo 2 caracteres').max(100, 'Maximo 100 caracteres'),
  buyerEmail: z.string().email('Correo invalido').max(150, 'Maximo 150 caracteres'),
  buyerPhone: z.string().max(30, 'Maximo 30 caracteres').optional().or(z.literal('')),
  currency: z.enum(['USD', 'MXN'], { errorMap: () => ({ message: 'currency debe ser USD o MXN' }) }),
  provider: z.enum(['stripe', 'paypal'], { errorMap: () => ({ message: 'provider debe ser stripe o paypal' }) }),
});
```

- [ ] **Step 2: Verificar que compila**

```bash
cd "C:\Users\zampa\Mis Proyectos\Aliax\.worktrees\talleres-fase3-checkout\backend" && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/utils/validation.ts
git commit -m "feat: add checkoutSchema for guest Offering checkout

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 3: Plantillas de correo (comprador + admin)

**Files:**
- Modify: `backend/src/services/emailService.ts`

- [ ] **Step 1: Agregar dos plantillas nuevas dentro del objeto `emailTemplates`**

Buscar el cierre de `adminNewPayment` (termina en `}),` alrededor de la linea 424) y agregar estas dos entradas inmediatamente despues, usando los mismos helpers (`baseTemplate`, `badge`, `heading`, `subtext`, `detailTable`, `detailRow`, `ctaButton`) que ya usa `adminNewPayment`:

```typescript
  // Comprador: confirmacion de compra de un Offering (taller/curso), con el link de acceso
  offeringPurchaseConfirmation: (data: {
    buyerName: string;
    buyerEmail: string;
    offeringTitle: string;
    accessUrl: string;
  }) => ({
    to: data.buyerEmail,
    subject: `Tu compra de "${data.offeringTitle}" está confirmada`,
    html: baseTemplate('Compra confirmada', `
      ${badge('Pago confirmado', '#16a34a')}
      ${heading(`Gracias, ${data.buyerName}`)}
      ${subtext(`Tu compra de "${data.offeringTitle}" quedó registrada. Guarda este correo: el siguiente enlace es tu única forma de acceder al contenido.`)}
      ${ctaButton('Ver mi compra', data.accessUrl)}
    `),
  }),

  // Admin: aviso de una venta nueva de Offering (taller/curso/webinar)
  adminNewOfferingSale: (data: {
    buyerName: string;
    buyerEmail: string;
    offeringTitle: string;
    provider: 'Stripe' | 'PayPal';
    amountPaid: number;
    currency: string;
  }) => ({
    to: env.ADMIN_EMAIL,
    subject: `💰 Venta de taller/curso (${data.provider}): ${data.offeringTitle}`,
    html: baseTemplate('Venta confirmada', `
      ${badge(`${data.provider} · ${data.currency} ${data.amountPaid.toFixed(2)}`, '#16a34a')}
      ${heading('Se vendió un taller/curso')}
      ${detailTable(
        detailRow('Oferta', data.offeringTitle) +
        detailRow('Comprador', data.buyerName) +
        detailRow('Correo', data.buyerEmail) +
        detailRow('Monto', `${data.currency} ${data.amountPaid.toFixed(2)}`) +
        detailRow('Método de pago', data.provider)
      )}
      ${ctaButton('Ver en el Admin', 'https://www.aliax.io/admin')}
    `),
  }),
```

- [ ] **Step 2: Verificar que compila**

```bash
cd "C:\Users\zampa\Mis Proyectos\Aliax\.worktrees\talleres-fase3-checkout\backend" && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/services/emailService.ts
git commit -m "feat: add buyer confirmation and admin sale email templates for Offerings

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 4: `purchaseService.ts` — unico punto de creacion de `Purchase`

**Files:**
- Create: `backend/src/services/purchaseService.ts`

- [ ] **Step 1: Crear el archivo completo**

```typescript
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { sendEmail, emailTemplates } from './emailService';
import { env } from '../config/env';

const prisma = new PrismaClient();

export const PENDING_CHECKOUT_PREFIX = 'offering_checkout:';

interface CreatePurchaseParams {
  offeringId: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string | null;
  amountPaid: number;
  currency: string;
  providerRef: string;
  provider: 'Stripe' | 'PayPal';
}

// Unico punto donde se crea un Purchase. Idempotente por providerRef: si un webhook se
// reintenta (Stripe reintenta si no recibe 200 a tiempo; PayPal tiene su propio reintento),
// o si el capture del comprador y el webhook de respaldo llegan los dos, esta funcion nunca
// crea un segundo Purchase para el mismo pago.
export async function createPurchaseAndNotify(params: CreatePurchaseParams): Promise<void> {
  const existing = await prisma.purchase.findUnique({ where: { providerRef: params.providerRef } });
  if (existing) return;

  const offering = await prisma.offering.findUnique({ where: { id: params.offeringId } });
  if (!offering) return; // no deberia pasar (el checkout ya valido que existiera), pero no hay nada que hacer si el Offering se borro entre el checkout y el pago.

  const accessToken = crypto.randomUUID();

  await prisma.purchase.create({
    data: {
      offeringId: params.offeringId,
      buyerName: params.buyerName,
      buyerEmail: params.buyerEmail,
      buyerPhone: params.buyerPhone,
      accessToken,
      paidAt: new Date(),
      amountPaid: params.amountPaid,
      currency: params.currency,
      providerRef: params.providerRef,
    },
  });

  const accessUrl = `${env.FRONTEND_URL}/mi-compra/${accessToken}`;

  const buyerTpl = emailTemplates.offeringPurchaseConfirmation({
    buyerName: params.buyerName,
    buyerEmail: params.buyerEmail,
    offeringTitle: offering.title,
    accessUrl,
  });
  sendEmail(buyerTpl.to, buyerTpl.subject, buyerTpl.html).catch(() => {});

  const adminTpl = emailTemplates.adminNewOfferingSale({
    buyerName: params.buyerName,
    buyerEmail: params.buyerEmail,
    offeringTitle: offering.title,
    provider: params.provider,
    amountPaid: params.amountPaid,
    currency: params.currency,
  });
  sendEmail(adminTpl.to, adminTpl.subject, adminTpl.html).catch(() => {});
}

// Usado solo por el flujo de PayPal (ver Tarea 6): resuelve un custom_id con el prefijo
// "offering_checkout:" al registro de PendingOfferingCheckout que guarda los datos del
// comprador, y lo borra (se consume una sola vez). Devuelve null si el custom_id no tiene
// el prefijo esperado (es una orden/suscripcion de plan, no de Offering), o si el registro
// ya no existe (ya fue consumido por el otro camino -- capture del comprador vs. webhook de
// respaldo, lo que llegue primero gana, y el otro simplemente no encuentra nada que hacer).
export async function resolvePendingOfferingCheckout(customId: string | undefined | null) {
  if (!customId || !customId.startsWith(PENDING_CHECKOUT_PREFIX)) return null;

  const id = customId.slice(PENDING_CHECKOUT_PREFIX.length);
  const pending = await prisma.pendingOfferingCheckout.findUnique({ where: { id } });
  if (!pending) return null;

  await prisma.pendingOfferingCheckout.delete({ where: { id } }).catch(() => {});
  return pending;
}
```

- [ ] **Step 2: Verificar que compila**

```bash
cd "C:\Users\zampa\Mis Proyectos\Aliax\.worktrees\talleres-fase3-checkout\backend" && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/services/purchaseService.ts
git commit -m "feat: add purchaseService with idempotent Purchase creation

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 5: Stripe — Checkout Session dinamica para un Offering + rama en el webhook

**Files:**
- Modify: `backend/src/services/stripeService.ts`

- [ ] **Step 1: Agregar la funcion de creacion de sesion, al final del archivo (antes de `handleWebhookEvent` o despues, da igual -- se agrega como funcion nueva exportada)**

```typescript
export async function createOfferingCheckoutSession(params: {
  offeringId: string;
  offeringTitle: string;
  priceAmount: number; // ya resuelto por el caller segun currency (priceUSD o priceMXN)
  currency: 'USD' | 'MXN';
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
}): Promise<string> {
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: params.buyerEmail,
    line_items: [{
      price_data: {
        currency: params.currency.toLowerCase(),
        product_data: { name: params.offeringTitle },
        unit_amount: Math.round(params.priceAmount * 100),
      },
      quantity: 1,
    }],
    success_url: `${env.FRONTEND_URL}/oferta/${params.offeringId}/exito`,
    cancel_url: `${env.FRONTEND_URL}/oferta/${params.offeringId}/cancelado`,
    metadata: {
      offeringId: params.offeringId,
      buyerName: params.buyerName,
      buyerEmail: params.buyerEmail,
      buyerPhone: params.buyerPhone,
      currency: params.currency,
    },
  });

  return session.url!;
}
```

- [ ] **Step 2: Agregar la rama de Offering dentro de `handleWebhookEvent`**

Dentro de `handleWebhookEvent`, buscar el bloque `if (event.type === 'checkout.session.completed') {` (linea ~86). Justo despues de la linea `const session = event.data.object as Stripe.Checkout.Session;`, agregar esta rama ANTES de la logica existente de `userId`/`interval` (que sigue intacta despues, sin cambios):

```typescript
    const session = event.data.object as Stripe.Checkout.Session;

    // Compra de un Offering (taller/curso/webinar) -- distinto de un pago de plan/suscripcion,
    // que no trae offeringId en su metadata.
    if (session.metadata?.offeringId) {
      const { createPurchaseAndNotify } = await import('./purchaseService');
      await createPurchaseAndNotify({
        offeringId: session.metadata.offeringId,
        buyerName: session.metadata.buyerName ?? '',
        buyerEmail: session.metadata.buyerEmail ?? '',
        buyerPhone: session.metadata.buyerPhone || null,
        amountPaid: (session.amount_total ?? 0) / 100,
        currency: session.metadata.currency ?? 'USD',
        providerRef: session.id,
        provider: 'Stripe',
      });
      return;
    }

    const userId = session.metadata?.userId;
```

Nota: el `import` dinamico evita un ciclo de imports (`purchaseService.ts` no necesita importar nada de `stripeService.ts`, asi que en la practica no habria ciclo, pero el import dinamico aqui es consistente con mantener `stripeService.ts` enfocado solo en Stripe; si al implementar `tsc` no se queja y prefieres un `import` normal arriba del archivo, es equivalente -- usa el que compile mas simple).

- [ ] **Step 3: Verificar que compila**

```bash
cd "C:\Users\zampa\Mis Proyectos\Aliax\.worktrees\talleres-fase3-checkout\backend" && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/services/stripeService.ts
git commit -m "feat: add Stripe one-time checkout for Offerings, branch webhook on metadata

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 6: PayPal — orden generica con descripcion + captura con monto + rama en el webhook

**Files:**
- Modify: `backend/src/services/paypalService.ts`
- Modify: `backend/src/routes/subscriptions.ts`

- [ ] **Step 1: Generalizar `createPayPalOrder` para aceptar una descripcion**

En `paypalService.ts`, reemplazar la firma y el cuerpo de `createPayPalOrder`:

```typescript
export async function createPayPalOrder(
  amount: string,
  returnUrl: string,
  cancelUrl: string,
  currency: 'USD' | 'MXN' = 'USD',
  customId?: string,
  description: string = 'Aliax Pro Lifetime',
): Promise<{ orderId: string; approvalUrl: string }> {
  const token = await getAccessToken();
  const res = await fetch(`${env.PAYPAL_BASE_URL}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      application_context: {
        return_url: returnUrl,
        cancel_url: cancelUrl,
        user_action: 'PAY_NOW',
      },
      purchase_units: [
        {
          amount: {
            currency_code: currency,
            value: amount,
          },
          description,
          custom_id: customId,
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`PayPal create order failed: ${res.status}`);
  }

  const data = await res.json() as { id: string; links: Array<{ rel: string; href: string }> };
  const approvalLink = data.links.find(l => l.rel === 'payer-action') ?? data.links.find(l => l.rel === 'approve');
  return { orderId: data.id, approvalUrl: approvalLink?.href ?? '' };
}
```

Esto es compatible con el unico caller que ya existe (`subscriptions.ts`, ruta `/paypal/order/create`, que pasa `userId` como quinto argumento posicional) -- sigue funcionando igual, solo que ahora ese argumento se llama `customId` en vez de `userId` (mismo valor, mismo lugar). No hace falta tocar esa ruta.

- [ ] **Step 2: Extender `capturePayPalOrder` para devolver el monto y el `custom_id`**

Reemplazar el cuerpo de `capturePayPalOrder`:

```typescript
export async function capturePayPalOrder(orderId: string): Promise<{
  status: string;
  amount?: string;
  currency?: string;
  customId?: string;
}> {
  const token = await getAccessToken();
  const res = await fetch(`${env.PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`PayPal capture order failed: ${res.status}`);
  }

  const data = await res.json() as {
    status: string;
    purchase_units?: Array<{
      custom_id?: string;
      payments?: { captures?: Array<{ amount?: { value?: string; currency_code?: string } }> };
    }>;
  };

  const unit = data.purchase_units?.[0];
  const capture = unit?.payments?.captures?.[0];

  return {
    status: data.status,
    amount: capture?.amount?.value,
    currency: capture?.amount?.currency_code,
    customId: unit?.custom_id,
  };
}
```

Esto es compatible con el unico caller existente (`subscriptions.ts`, ruta `/paypal/order/capture`), que solo lee `result.status` -- sigue funcionando igual.

- [ ] **Step 3: Verificar que compila**

```bash
cd "C:\Users\zampa\Mis Proyectos\Aliax\.worktrees\talleres-fase3-checkout\backend" && npx tsc --noEmit
```

- [ ] **Step 4: Agregar la rama de Offering en el webhook de PayPal que ya existe**

En `backend/src/routes/subscriptions.ts`, dentro de la ruta `router.post('/paypal/webhook', ...)` (linea ~179), hay este bloque exacto:

```typescript
    const { event_type, resource } = req.body as { event_type: string; resource: any };
    const userId: string | undefined = resource?.custom_id;

    if (event_type === 'PAYMENT.CAPTURE.COMPLETED' && userId) {
```

Reemplazarlo por este (agrega la rama de Offering entre las dos lineas que ya existian, sin duplicar ninguna declaracion):

```typescript
    const { event_type, resource } = req.body as { event_type: string; resource: any };

    if (event_type === 'PAYMENT.CAPTURE.COMPLETED') {
      const { resolvePendingOfferingCheckout, createPurchaseAndNotify, PENDING_CHECKOUT_PREFIX } = await import('../services/purchaseService');

      // Compra de un Offering (taller/curso/webinar): el custom_id tiene un prefijo
      // reservado que ningun flujo de plan/suscripcion usa. Se detecta por el PREFIJO,
      // no por si resolvePendingOfferingCheckout encontro algo -- si el capture del
      // comprador (Tarea 8) ya lo consumio, aqui no hay nada que resolver, pero el
      // custom_id SIGUE siendo de un Offering, nunca un userId real: hay que responder
      // 200 y salir, nunca caer al codigo de abajo (que lo trataria como userId y fallaria
      // con un 500 al no encontrar ningun User con ese id).
      if (resource?.custom_id?.startsWith(PENDING_CHECKOUT_PREFIX)) {
        const pending = await resolvePendingOfferingCheckout(resource?.custom_id);
        if (pending) {
          await createPurchaseAndNotify({
            offeringId: pending.offeringId,
            buyerName: pending.buyerName,
            buyerEmail: pending.buyerEmail,
            buyerPhone: pending.buyerPhone,
            amountPaid: Number(resource?.amount?.value ?? 0),
            currency: resource?.amount?.currency_code ?? pending.currency,
            providerRef: resource?.id ?? resource?.custom_id,
            provider: 'PayPal',
          });
        }
        res.json({ received: true });
        return;
      }
    }

    const userId: string | undefined = resource?.custom_id;

    if (event_type === 'PAYMENT.CAPTURE.COMPLETED' && userId) {
```

- [ ] **Step 5: Verificar que compila**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add src/services/paypalService.ts src/routes/subscriptions.ts
git commit -m "feat: generalize PayPal order/capture, branch webhook for Offering purchases

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 7: `purchases.ts` — `POST /checkout` (validaciones + arranca el pago)

**Files:**
- Create: `backend/src/routes/purchases.ts`

- [ ] **Step 1: Crear el archivo con la ruta de checkout**

```typescript
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { checkoutSchema } from '../utils/validation';
import { createOfferingCheckoutSession } from '../services/stripeService';
import { createPayPalOrder } from '../services/paypalService';
import { PENDING_CHECKOUT_PREFIX } from '../services/purchaseService';
import { env } from '../config/env';

const router = Router();
const prisma = new PrismaClient();

// POST /api/purchases/checkout -- sin auth, es para invitados.
router.post('/checkout', async (req, res, next) => {
  try {
    const data = checkoutSchema.parse(req.body);

    const offering = await prisma.offering.findUnique({ where: { id: data.offeringId } });
    if (!offering || offering.status !== 'PUBLISHED') {
      throw new AppError(404, 'Oferta no encontrada');
    }

    if (data.currency === 'MXN' && !offering.priceMXN) {
      throw new AppError(400, 'Esta oferta no tiene precio en MXN');
    }

    if (offering.type === 'LIVE_WORKSHOP' && offering.scheduledAt && offering.scheduledAt < new Date()) {
      throw new AppError(400, 'Este taller ya se llevo a cabo');
    }

    if (offering.capacity) {
      const purchaseCount = await prisma.purchase.count({ where: { offeringId: offering.id } });
      if (purchaseCount >= offering.capacity) {
        throw new AppError(400, 'Este taller ya alcanzo su cupo maximo');
      }
    }

    // .toNumber() explicito -- son instancias de Decimal (decimal.js), no numbers nativos.
    const priceDecimal = data.currency === 'MXN' ? offering.priceMXN! : offering.priceUSD;
    const priceAmount = priceDecimal.toNumber();
    const buyerPhone = data.buyerPhone || '';

    if (data.provider === 'stripe') {
      const redirectUrl = await createOfferingCheckoutSession({
        offeringId: offering.id,
        offeringTitle: offering.title,
        priceAmount,
        currency: data.currency,
        buyerName: data.buyerName,
        buyerEmail: data.buyerEmail,
        buyerPhone,
      });
      res.json({ redirectUrl });
      return;
    }

    // provider === 'paypal': PayPal no soporta metadata libre (limite de 127 caracteres
    // en custom_id), asi que los datos del comprador se guardan en PendingOfferingCheckout
    // y solo se pasa su id (con un prefijo reservado) como custom_id.
    const pending = await prisma.pendingOfferingCheckout.create({
      data: {
        offeringId: offering.id,
        buyerName: data.buyerName,
        buyerEmail: data.buyerEmail,
        buyerPhone: buyerPhone || null,
        currency: data.currency,
      },
    });

    const { approvalUrl } = await createPayPalOrder(
      priceAmount.toFixed(2),
      `${env.FRONTEND_URL}/oferta/${offering.id}/paypal-retorno`,
      `${env.FRONTEND_URL}/oferta/${offering.id}/cancelado`,
      data.currency,
      `${PENDING_CHECKOUT_PREFIX}${pending.id}`,
      offering.title,
    );
    res.json({ redirectUrl: approvalUrl });
  } catch (err) {
    next(err);
  }
});

export default router;
```

- [ ] **Step 2: Verificar que compila**

```bash
cd "C:\Users\zampa\Mis Proyectos\Aliax\.worktrees\talleres-fase3-checkout\backend" && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/routes/purchases.ts
git commit -m "feat: add POST /api/purchases/checkout for guest Offering checkout

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 8: `purchases.ts` — `POST /paypal/capture` (regreso del comprador desde PayPal)

**Files:**
- Modify: `backend/src/routes/purchases.ts`

- [ ] **Step 1: Agregar la ruta de captura, antes de `export default router;`**

```typescript
// POST /api/purchases/paypal/capture -- sin auth. El comprador vuelve aqui desde la pagina
// de aprobacion de PayPal; el frontend llama esto con el orderId de la URL. El webhook de
// /api/subscriptions/paypal/webhook (Tarea 6) es el respaldo servidor-a-servidor si el
// comprador cierra la pestana antes de que esta llamada termine -- ambos caminos son
// idempotentes (ver purchaseService.createPurchaseAndNotify).
router.post('/paypal/capture', async (req, res, next) => {
  try {
    const { orderId } = req.body as { orderId?: string };
    if (!orderId) throw new AppError(400, 'orderId is required');

    const { capturePayPalOrder } = await import('../services/paypalService');
    const result = await capturePayPalOrder(orderId);
    if (result.status !== 'COMPLETED') {
      throw new AppError(400, `El pago de PayPal no se completo (status: ${result.status})`);
    }

    const { resolvePendingOfferingCheckout, createPurchaseAndNotify } = await import('../services/purchaseService');
    const pending = await resolvePendingOfferingCheckout(result.customId);
    if (!pending) {
      // El webhook de respaldo (Tarea 6) ya lo proceso primero. No es un error.
      res.json({ success: true });
      return;
    }

    await createPurchaseAndNotify({
      offeringId: pending.offeringId,
      buyerName: pending.buyerName,
      buyerEmail: pending.buyerEmail,
      buyerPhone: pending.buyerPhone,
      amountPaid: Number(result.amount ?? 0),
      currency: result.currency ?? pending.currency,
      providerRef: orderId,
      provider: 'PayPal',
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 2: Verificar que compila**

```bash
cd "C:\Users\zampa\Mis Proyectos\Aliax\.worktrees\talleres-fase3-checkout\backend" && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/routes/purchases.ts
git commit -m "feat: add POST /api/purchases/paypal/capture for guest checkout return

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 9: Montar el router nuevo

**Files:**
- Modify: `backend/src/index.ts`
- Modify: `backend/api/index.ts`

- [ ] **Step 1: `backend/src/index.ts`**

Buscar la linea `import offeringRoutes from './routes/offerings';` y agregar justo despues:
```typescript
import purchaseRoutes from './routes/purchases';
```

Buscar la linea `app.use('/api/offerings', offeringRoutes);` y agregar justo despues:
```typescript
app.use('/api/purchases', purchaseRoutes);
```

- [ ] **Step 2: `backend/api/index.ts`**

Buscar la linea `const offeringRoutes = require('../src/routes/offerings').default;` y agregar justo despues:
```typescript
  const purchaseRoutes = require('../src/routes/purchases').default;
```

Buscar la linea `app.use('/api/offerings', offeringRoutes);` (dentro del mismo archivo) y agregar justo despues:
```typescript
  app.use('/api/purchases', purchaseRoutes);
```

- [ ] **Step 3: Verificar que compila**

```bash
cd "C:\Users\zampa\Mis Proyectos\Aliax\.worktrees\talleres-fase3-checkout\backend" && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/index.ts api/index.ts
git commit -m "feat: mount purchases router

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 10: Frontend — pagina publica de un Offering

**Files:**
- Create: `frontend/src/pages/OfferingPublic.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Crear la pagina**

```tsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/client';

interface Offering {
  id: string;
  title: string;
  description: string | null;
  type: 'LIVE_WORKSHOP' | 'RECORDED_COURSE';
  priceUSD: string;
  priceMXN: string | null;
  profile: { title: string; slug: string; avatar: string | null };
}

export default function OfferingPublic() {
  const { offeringId } = useParams();
  const [offering, setOffering] = useState<Offering | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'MXN'>('USD');
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    api.get(`/offerings/${offeringId}`)
      .then(res => setOffering(res.data))
      .catch(() => setError('Oferta no encontrada'))
      .finally(() => setLoading(false));
  }, [offeringId]);

  const startCheckout = async (provider: 'stripe' | 'paypal') => {
    if (!buyerName.trim() || !buyerEmail.trim()) {
      setFormError('Nombre y correo son obligatorios');
      return;
    }
    setFormError('');
    setSubmitting(true);
    try {
      const res = await api.post('/purchases/checkout', {
        offeringId,
        buyerName,
        buyerEmail,
        buyerPhone: buyerPhone || undefined,
        currency,
        provider,
      });
      window.location.href = res.data.redirectUrl;
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'No se pudo iniciar el pago');
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Cargando...</div>;
  if (error || !offering) return <div className="min-h-screen flex items-center justify-center text-slate-500">{error || 'Oferta no encontrada'}</div>;

  const price = currency === 'MXN' ? offering.priceMXN : offering.priceUSD;

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-sm p-8">
        <p className="text-sm text-teal-600 font-medium mb-1">{offering.profile.title}</p>
        <h1 className="text-2xl font-semibold text-slate-900 mb-3">{offering.title}</h1>
        {offering.description && <p className="text-slate-600 mb-6">{offering.description}</p>}

        <div className="flex items-baseline gap-2 mb-6">
          <span className="text-3xl font-bold text-slate-900">${price}</span>
          <span className="text-slate-500">{currency}</span>
          {offering.priceMXN && (
            <div className="ml-auto flex gap-1">
              <button onClick={() => setCurrency('USD')} className={`px-3 py-1 rounded-full text-sm ${currency === 'USD' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'}`}>USD</button>
              <button onClick={() => setCurrency('MXN')} className={`px-3 py-1 rounded-full text-sm ${currency === 'MXN' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'}`}>MXN</button>
            </div>
          )}
        </div>

        <div className="space-y-3 mb-4">
          <input value={buyerName} onChange={e => setBuyerName(e.target.value)} placeholder="Tu nombre"
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg" />
          <input value={buyerEmail} onChange={e => setBuyerEmail(e.target.value)} placeholder="Tu correo" type="email"
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg" />
          <input value={buyerPhone} onChange={e => setBuyerPhone(e.target.value)} placeholder="Telefono (opcional)"
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg" />
        </div>

        {formError && <p className="text-red-600 text-sm mb-3">{formError}</p>}

        <div className="flex flex-col gap-2">
          <button disabled={submitting} onClick={() => startCheckout('stripe')}
            className="w-full py-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors">
            Pagar con tarjeta
          </button>
          <button disabled={submitting} onClick={() => startCheckout('paypal')}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-medium rounded-lg transition-colors">
            Pagar con PayPal
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Registrar la ruta en `App.tsx`**

Agregar el lazy import junto a los demas:
```typescript
const OfferingPublic = lazy(() => import('./pages/OfferingPublic'));
```
Buscar la linea `<Route path="/review/:token" element={<ReviewPage />} />` (es la ultima ruta antes del catch-all `<Route path="/:slug" ...>`) y agregar justo despues, **antes** de esa linea del catch-all (react-router-dom prueba las rutas en el orden en que aparecen):
```tsx
<Route path="/oferta/:offeringId" element={<OfferingPublic />} />
```

- [ ] **Step 3: Verificar que compila**

```bash
cd "C:\Users\zampa\Mis Proyectos\Aliax\.worktrees\talleres-fase3-checkout\frontend" && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/OfferingPublic.tsx src/App.tsx
git commit -m "feat: add public Offering page with guest checkout

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 11: Frontend — paginas de exito/cancelado + retorno de PayPal

**Files:**
- Create: `frontend/src/pages/OfferingCheckoutSuccess.tsx`
- Create: `frontend/src/pages/OfferingCheckoutCancel.tsx`
- Create: `frontend/src/pages/OfferingPayPalReturn.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Pagina de exito (destino de Stripe tras pagar)**

```tsx
export default function OfferingCheckoutSuccess() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md text-center bg-white rounded-2xl shadow-sm p-10">
        <div className="text-5xl mb-4">&#10003;</div>
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">Pago recibido</h1>
        <p className="text-slate-500">Revisa tu correo: ahi te enviamos el enlace para acceder a tu compra.</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Pagina de cancelado**

```tsx
import { useNavigate, useParams } from 'react-router-dom';

export default function OfferingCheckoutCancel() {
  const navigate = useNavigate();
  const { offeringId } = useParams();
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md text-center bg-white rounded-2xl shadow-sm p-10">
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">Pago cancelado</h1>
        <p className="text-slate-500 mb-6">No se realizo ningun cargo. Puedes intentarlo de nuevo cuando quieras.</p>
        <button onClick={() => navigate(`/oferta/${offeringId}`)}
          className="px-6 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-medium rounded-lg transition-colors">
          Volver a la oferta
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Pagina de retorno de PayPal (lee `orderId`/`token` de la URL y dispara la captura)**

```tsx
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/client';

export default function OfferingPayPalReturn() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    const orderId = searchParams.get('token'); // PayPal devuelve el orderId en el parametro "token"
    if (!orderId) {
      setStatus('error');
      return;
    }
    api.post('/purchases/paypal/capture', { orderId })
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md text-center bg-white rounded-2xl shadow-sm p-10">
        {status === 'loading' && <p className="text-slate-500">Confirmando tu pago...</p>}
        {status === 'success' && (
          <>
            <div className="text-5xl mb-4">&#10003;</div>
            <h1 className="text-2xl font-semibold text-slate-900 mb-2">Pago recibido</h1>
            <p className="text-slate-500">Revisa tu correo: ahi te enviamos el enlace para acceder a tu compra.</p>
          </>
        )}
        {status === 'error' && <p className="text-red-600">No pudimos confirmar tu pago. Si el cargo se realizo, contactanos con tu comprobante.</p>}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Registrar las tres rutas en `App.tsx`**

```typescript
const OfferingCheckoutSuccess = lazy(() => import('./pages/OfferingCheckoutSuccess'));
const OfferingCheckoutCancel = lazy(() => import('./pages/OfferingCheckoutCancel'));
const OfferingPayPalReturn = lazy(() => import('./pages/OfferingPayPalReturn'));
```
Agregarlas junto a la ruta `/oferta/:offeringId` ya agregada en la Tarea 10 (es decir, inmediatamente despues de `<Route path="/review/:token" .../>` y antes del catch-all `<Route path="/:slug" .../>`):
```tsx
<Route path="/oferta/:offeringId/exito" element={<OfferingCheckoutSuccess />} />
<Route path="/oferta/:offeringId/cancelado" element={<OfferingCheckoutCancel />} />
<Route path="/oferta/:offeringId/paypal-retorno" element={<OfferingPayPalReturn />} />
```

- [ ] **Step 5: Verificar que compila**

```bash
cd "C:\Users\zampa\Mis Proyectos\Aliax\.worktrees\talleres-fase3-checkout\frontend" && npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add src/pages/OfferingCheckoutSuccess.tsx src/pages/OfferingCheckoutCancel.tsx src/pages/OfferingPayPalReturn.tsx src/App.tsx
git commit -m "feat: add Offering checkout success/cancel/paypal-return pages

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 12: Verificacion empirica

No hay suite de tests en este backend (igual que Fases 1 y 2). La verificacion es contra el dev server local + datos de prueba desechables, usando las claves de TEST/sandbox que ya estan en `.env` (nunca las de produccion).

- [ ] **Step 1: Confirmar que las claves en `.env` son de test/sandbox, no de produccion**

```bash
cd "C:\Users\zampa\Mis Proyectos\Aliax\.worktrees\talleres-fase3-checkout\backend"
grep "STRIPE_SECRET_KEY\|PAYPAL_BASE_URL" .env
```
Expected: `STRIPE_SECRET_KEY` empieza con `sk_test_`, y `PAYPAL_BASE_URL` apunta a `api-m.sandbox.paypal.com`. **Si alguna de las dos apunta a produccion, parar aqui y avisar antes de continuar** -- no se debe probar este flujo con dinero real.

- [ ] **Step 2: Levantar el dev server en un puerto libre**

```bash
PORT=4521 npm run dev > /tmp/fase3-dev.log 2>&1 &
disown
sleep 5
curl -s -o /dev/null -w "health: %{http_code}\n" http://localhost:4521/api/health
```
Expected: `health: 200`. Si el puerto esta ocupado, revisar `netstat -ano | grep 4521` y elegir otro puerto libre (este proyecto ha tenido procesos Node huerfanos de sesiones anteriores ocupando puertos).

- [ ] **Step 3: Crear datos de prueba desechables (profesional Pro + Offering publicado) directo via Prisma**

Guardar como `backend/setup-fase3-test-data.tmp.ts` y correr con `npx tsx setup-fase3-test-data.tmp.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const suffix = Date.now().toString(36);
  const user = await prisma.user.create({
    data: { email: `test-fase3-${suffix}@example.com`, password: 'x', name: 'Test Fase 3', plan: 'PRO' },
  });
  const profile = await prisma.profile.create({
    data: { userId: user.id, slug: `test-fase3-${suffix}`, title: 'Test Fase 3 Profile', profession: 'Psicologo' },
  });
  const offering = await prisma.offering.create({
    data: {
      profileId: profile.id,
      type: 'RECORDED_COURSE',
      title: 'Curso de prueba Fase 3',
      priceUSD: 10,
      priceMXN: 180,
      status: 'PUBLISHED',
    },
  });
  console.log(JSON.stringify({ userId: user.id, profileId: profile.id, offeringId: offering.id }));
}

main().catch((e) => { console.error(e); process.exit(1); });
```

Guardar el `offeringId` impreso para usarlo en los Steps siguientes. Para el caso de cupo lleno (Step 4) y el de taller con fecha pasada, crear un SEGUNDO y TERCER `Offering` de prueba con el mismo patron, variando `type: 'LIVE_WORKSHOP'`, `capacity: 1` + una fila en `Purchase` ya existente para el primero, y `scheduledAt` en el pasado para el segundo.

- [ ] **Step 4: Probar las validaciones de `POST /api/purchases/checkout` que NO requieren completar un pago real**

```bash
OFFERING_ID="<el id del Step 3>"
# currency MXN sin priceMXN -- probar con un Offering sin priceMXN, o saltar si el de prueba ya tiene priceMXN
# Offering no publicado:
curl -s -X POST http://localhost:4521/api/purchases/checkout -H "Content-Type: application/json" \
  -d '{"offeringId":"id-inexistente","buyerName":"Test","buyerEmail":"test@example.com","currency":"USD","provider":"stripe"}'
```
Expected: `404` con `{"error":"Oferta no encontrada"}`.

Repetir variando el body para cubrir: `capacity` lleno (crear el Offering de prueba con `capacity: 1` y una fila en `Purchase` ya existente para ese id antes de probar), y un `LIVE_WORKSHOP` con `scheduledAt` en el pasado -- ambos deben devolver 400 con un mensaje claro, sin haber llamado a Stripe/PayPal (confirmar revisando los logs del dev server, que no deben mostrar ninguna llamada saliente).

- [ ] **Step 5: Probar el flujo completo de Stripe usando el helper de firma de prueba del SDK**

Stripe Checkout Session no se puede completar sin visitar su pagina hospedada (requiere tarjeta de prueba). En vez de automatizar un navegador, se simula el webhook con la firma correcta usando el helper que el propio SDK de Stripe expone para pruebas (`stripe.webhooks.generateTestHeaderString`):

```javascript
// Guardar como backend/verify-stripe-webhook.tmp.js y correr con: node verify-stripe-webhook.tmp.js
require('dotenv').config();
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const payload = JSON.stringify({
  id: 'evt_test_fase3',
  object: 'event',
  type: 'checkout.session.completed',
  data: {
    object: {
      id: 'cs_test_fase3_' + Date.now(),
      object: 'checkout.session',
      amount_total: 1000,
      metadata: {
        offeringId: process.env.TEST_OFFERING_ID,
        buyerName: 'Comprador Prueba',
        buyerEmail: 'comprador-prueba@example.com',
        buyerPhone: '',
        currency: 'USD',
      },
    },
  },
});

const header = stripe.webhooks.generateTestHeaderString({
  payload,
  secret: process.env.STRIPE_WEBHOOK_SECRET,
});

fetch('http://localhost:4521/api/subscriptions/stripe/webhook', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'stripe-signature': header },
  body: payload,
}).then(async r => console.log(r.status, await r.text()));
```

Correr dos veces con el MISMO `id` de sesion (mismo `providerRef`) y confirmar que la segunda vez no crea un segundo `Purchase` (verificar con `prisma.purchase.count()` para ese `offeringId` -- debe ser 1, no 2).

- [ ] **Step 6: Probar el flujo de PayPal hasta donde se puede sin un navegador**

Llamar a `POST /api/purchases/checkout` con `provider: paypal` y confirmar que devuelve un `redirectUrl` de `sandbox.paypal.com`, y que se creo una fila en `PendingOfferingCheckout`. Completar el resto del flujo (aprobar el pago como comprador de sandbox) requiere un navegador -- hacerlo manualmente (o con Claude in Chrome si esta disponible) usando una cuenta de comprador de PayPal Sandbox antes de abrir el PR, para confirmar que `/paypal-retorno` efectivamente crea el `Purchase` con los datos correctos. Documentar en la descripcion del PR si este paso se hizo manualmente o quedo pendiente.

- [ ] **Step 7: Limpiar todos los datos de prueba**

```bash
# Borrar el/los Purchase, PendingOfferingCheckout, Offering, Profile, User creados en este Task
```
Confirmar con una consulta que no quedo nada residual antes de seguir.

- [ ] **Step 8: Detener el dev server y borrar los scripts temporales**

```bash
rm -f backend/verify-stripe-webhook.tmp.js
# detener el proceso de PORT=4521 (buscar su PID con netstat y Stop-Process)
```

---

## Task 13: Revision final y cierre de rama

- [ ] **Step 1: Dispatch del agente `superpowers:code-reviewer`** sobre el diff completo de la rama contra `master`, con especial atencion a: idempotencia de `providerRef` en los dos caminos de PayPal (capture vs. webhook, cual sea que llegue primero), que `resolvePendingOfferingCheckout` nunca pueda ser explotado para resolver un custom_id ajeno (el prefijo + lookup por id unico ya lo evita, pero confirmar), y que ninguna de las rutas nuevas filtre datos de un Offering no publicado.
- [ ] **Step 2: Corregir lo que el reviewer encuentre, re-verificar empiricamente lo que haya cambiado.**
- [ ] **Step 3: Usar `superpowers:finishing-a-development-branch`** para presentar las 4 opciones de cierre (mergear local / PR / dejar como esta / descartar).

---

## Que sigue despues de esta Fase 3

Fase 4: pagina de acceso del comprador (via `accessToken`, sin login), visor de modulos, responder cuestionario, calcular el puntaje con `ScoringRule`, generar el PDF de resultado.
