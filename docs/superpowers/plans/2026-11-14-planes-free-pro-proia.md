# Planes Free / Pro / Pro IA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el esquema Free / Pro $210 / Clínico $900 por Free / Pro $210 (con tienda sin comisión y Comunidad) / Pro IA $660 (Pro + transcripción y notas con IA, con tope mensual silencioso).

**Architecture:** El valor interno `'CLINICO'` en `User.plan`, en los metadatos de Stripe y en `resolveTier` de PayPal NO se renombra: evita migrar datos y suscripciones vivas. Solo cambia el nombre visible ("Pro IA"), el precio (nuevos objetos de precio en Stripe y PayPal, los viejos quedan huérfanos), el copy de Pricing y se agrega un tope mensual de transcripciones contando `AudioTranscriptionJob` (sin migración de esquema).

**Tech Stack:** Express + Prisma + Stripe + PayPal (backend, Vercel), React + Vite + TS (frontend, Vercel). Backend sin test runner: se verifica con `npx tsc --noEmit` (backend) y `npx tsc -b` (frontend, NUNCA `--noEmit` a secas) más un script `tsx` para la lógica pura.

---

## Decisiones ya tomadas (2026-11-14, César)

- Free: directorio, agenda, pacientes y recordatorios por correo ilimitados. Sin otros módulos. Sin tarifa por paciente.
- Pro $210 MXN / $14 USD: todo lo de Free + historia clínica, analytics, templates premium, tienda de cursos SIN comisión, "Comunidad" (reunión mensual en vivo para terapeutas).
- Pro IA: Pro + notas con IA + transcripción de audio. Nombre "Pro IA". $660 MXN. Tope silencioso ~60 transcripciones al mes.
- El plan Clínico deja de existir como oferta; internamente sigue el valor `CLINICO`.

## Pendientes que NO bloquean pero hay que confirmar con César

1. ~~Precio USD de Pro IA~~ **CONFIRMADO por César (2026-11-15): $44 USD** (660 MXN / 17.33 = ~38 USD, +15% por comisión internacional). Además César pidió que el plan Pro lleve el texto **"precio de lanzamiento"** (ver Task 4).
2. **Artículos de terapeutas en la Revista:** NO existen (el router `articles.ts` es solo del admin). Este plan NO los anuncia como incluidos en Pro. Es un plan aparte.
3. **Comunidad:** en esta fase es solo copy más sesiones que César agenda a mano con el módulo de webinars. No se construye software.

## Hallazgos del código (verificados el 2026-11-14)

- `backend/src/lib/planUtils.ts`: `isProUser` ya incluye `CLINICO`, por lo que tienda de cursos (`routes/offerings.ts:65`), historia clínica (`middleware/requirePro.ts`) y analytics ya funcionan en Pro IA. No hay que tocarlos.
- Free ya recibe recordatorio 24h por correo sin tope (`routes/cron.ts`, `emailEnabled` por defecto `true`). Solo "recordatorio 1h" y "feedback" están tras `ProGate` en `SchedulingConfig.tsx`. No se cambia nada: ya cumple "correo ilimitado".
- El módulo Pacientes ya lista pacientes a Free; `isPro` solo gatea historia clínica en `Pacientes.tsx:220,252`. No se cambia.
- `routes/audio-notes.ts` solo limita durante el trial (`trialAudioSecondsUsed`). No hay tope mensual para pagados.
- Precios Stripe/PayPal: scripts existentes `backend/scripts/create-stripe-clinico-prices.ts` (hoy $60 USD y $900 MXN) y `create-paypal-plans.ts`.

## File Structure

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `backend/src/lib/planUtils.ts` | Modificar | Constante `AUDIO_MONTHLY_SESSION_CAP` y helper puro `monthlyAudioCapReached` |
| `backend/src/routes/audio-notes.ts` | Modificar | Aplicar el tope mensual en `verifyAudioNotesAccess` |
| `backend/scripts/create-stripe-clinico-prices.ts` | Modificar | Montos nuevos y nombre del producto |
| `backend/scripts/create-paypal-plans.ts` | Modificar | Montos nuevos del plan Clínico |
| `frontend/src/lib/planNames.ts` | Crear | Fuente única del nombre visible de cada plan |
| `frontend/src/pages/Pricing.tsx` | Modificar | Copy y precios de los 3 planes |
| `frontend/src/pages/Dashboard.tsx` | Modificar | Etiqueta del plan (línea ~907) |
| `frontend/src/pages/AdminPanel.tsx` | Modificar | Etiquetas visibles "Clínico" (líneas ~1499, ~1698) |
| `frontend/src/pages/Explorar.tsx` | Modificar | Texto de la insignia (línea ~670) |

---

### Task 1: Tope mensual de transcripciones (backend)

**Files:**
- Modify: `backend/src/lib/planUtils.ts`
- Modify: `backend/src/routes/audio-notes.ts`
- Test (script): `backend/scripts/check-audio-cap-tmp.ts` (se borra al terminar)

- [ ] **Step 1: Agregar la constante y el helper puro**

Al final de `backend/src/lib/planUtils.ts` agregar:

```ts
// Tope silencioso de transcripciones por mes para el plan de pago (Pro IA).
// Anti-abuso, no se anuncia como número en Pricing ("uso generoso").
export const AUDIO_MONTHLY_SESSION_CAP = 60;

export function monthlyAudioCapReached(jobsThisMonth: number): boolean {
  return jobsThisMonth >= AUDIO_MONTHLY_SESSION_CAP;
}

export function startOfCurrentMonth(now: Date = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}
```

- [ ] **Step 2: Script de verificación**

Crear `backend/scripts/check-audio-cap-tmp.ts`:

```ts
import { monthlyAudioCapReached, AUDIO_MONTHLY_SESSION_CAP, startOfCurrentMonth } from '../src/lib/planUtils';

const checks: Array<[string, boolean]> = [
  ['0 trabajos no alcanza el tope', monthlyAudioCapReached(0) === false],
  [`${AUDIO_MONTHLY_SESSION_CAP - 1} no alcanza el tope`, monthlyAudioCapReached(AUDIO_MONTHLY_SESSION_CAP - 1) === false],
  [`${AUDIO_MONTHLY_SESSION_CAP} alcanza el tope`, monthlyAudioCapReached(AUDIO_MONTHLY_SESSION_CAP) === true],
  ['inicio de mes es día 1 a las 00:00', startOfCurrentMonth(new Date(2026, 10, 14, 15, 30)).getTime() === new Date(2026, 10, 1).getTime()],
];
let failed = 0;
for (const [name, ok] of checks) { console.log(ok ? 'PASS' : 'FAIL', name); if (!ok) failed++; }
process.exit(failed ? 1 : 0);
```

- [ ] **Step 3: Correrlo**

Run (desde `backend/`): `npx tsx scripts/check-audio-cap-tmp.ts`
Expected: 4 líneas `PASS` y código de salida 0.

- [ ] **Step 4: Aplicar el tope en la ruta**

En `backend/src/routes/audio-notes.ts` cambiar el import:

```ts
import { isClinicoUser, isInClinicoTrial, CLINICO_TRIAL_AUDIO_SECONDS, monthlyAudioCapReached, startOfCurrentMonth } from '../lib/planUtils';
```

y dentro de `verifyAudioNotesAccess`, después del bloque del trial, antes del cierre de la función, agregar:

```ts
  // Tope mensual solo para quien paga (el trial ya tiene su propio límite en segundos).
  if (!isInClinicoTrial(user) && !user.isAdmin) {
    const jobsThisMonth = await prisma.audioTranscriptionJob.count({
      where: {
        userId,
        status: { in: ['processing', 'completed'] },
        createdAt: { gte: startOfCurrentMonth() },
      },
    });
    if (monthlyAudioCapReached(jobsThisMonth)) {
      throw new AppError(
        429,
        'Alcanzaste el límite de transcripciones de este mes. Se reinicia el día 1. Escríbenos si necesitas más.',
      );
    }
  }
```

Verificar antes que `AudioTranscriptionJob` tenga `createdAt` y `status` (`grep -n "model AudioTranscriptionJob" -A12 backend/prisma/schema.prisma`). Si `createdAt` no existe, parar y avisar: se necesitaría migración.

- [ ] **Step 5: Typecheck**

Run (desde `backend/`): `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 6: Borrar el script temporal y commit**

```bash
rm backend/scripts/check-audio-cap-tmp.ts
git add backend/src/lib/planUtils.ts backend/src/routes/audio-notes.ts
git commit -m "feat: tope mensual silencioso de transcripciones para plan de pago"
```

---

### Task 2: Nuevos precios de Pro IA en Stripe y PayPal

**Files:**
- Modify: `backend/scripts/create-stripe-clinico-prices.ts`
- Modify: `backend/scripts/create-paypal-plans.ts`

**Antes:** confirmar con César el precio USD (este plan asume $44 USD). **Regla de la casa:** nunca crear nada en LIVE sin confirmación explícita de César en ese momento, y verificar el resultado con `prices.retrieve` / `plans.get`, no asumir.

- [ ] **Step 1: Stripe, cambiar nombre y montos**

En `create-stripe-clinico-prices.ts`:
- `name: 'Aliax Clínico'` → `name: 'Aliax Pro IA'`
- USD: `unit_amount: 6000, // $60.00 USD` → `unit_amount: 4400, // $44.00 USD`; `nickname` → `'Aliax Pro IA Mensual USD'`
- MXN: `unit_amount: 90000, // $900.00 MXN` → `unit_amount: 66000, // $660.00 MXN`; `nickname` → `'Aliax Pro IA Mensual MXN'`

(Se mantienen los nombres de las variables de entorno `STRIPE_PRICE_CLINICO_*` a propósito, no se renombran.)

- [ ] **Step 2: PayPal, mismos montos**

En `create-paypal-plans.ts` localizar las llamadas a `createPlan(...)` del plan Clínico (cerca de las líneas que imprimen `PAYPAL_PLAN_CLINICO_MONTHLY`) y cambiar los montos a `'44.00'` (USD) y `'660.00'` (MXN) y el nombre a "Aliax Pro IA".

- [ ] **Step 3: Typecheck**

Run (desde `backend/`): `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 4: PEDIR CONFIRMACIÓN y ejecutar**

Preguntar a César: "Voy a crear los precios reales de Pro IA en Stripe y PayPal LIVE, ¿confirmas?". Solo con un sí explícito:

Run (desde `backend/`): `npx tsx scripts/create-stripe-clinico-prices.ts` y luego el script de PayPal.
Expected: imprimen 4 IDs nuevos (`STRIPE_PRICE_CLINICO_MONTHLY`, `STRIPE_PRICE_CLINICO_MONTHLY_MXN`, `PAYPAL_PLAN_CLINICO_MONTHLY`, `PAYPAL_PLAN_CLINICO_MONTHLY_MXN`).

- [ ] **Step 5: Verificar los montos reales**

Con un script `tsx` desechable llamar `stripe.prices.retrieve(<id>)` para los 2 IDs de Stripe y comprobar `unit_amount` 4400 y 66000. Para PayPal, `GET /v1/billing/plans/<id>` y comprobar `fixed_price.value`.

- [ ] **Step 6: Variables de entorno**

Reemplazar los 4 valores en `backend/.env` local y en el proyecto Vercel del BACKEND (`npx vercel env`, producción), recordando que backend y frontend son proyectos Vercel distintos. Los suscriptores actuales de Clínico a $900 conservan su precio viejo (Stripe no cambia suscripciones vivas al crear precios nuevos), eso es lo deseado.

- [ ] **Step 7: Commit**

```bash
git add backend/scripts/create-stripe-clinico-prices.ts backend/scripts/create-paypal-plans.ts
git commit -m "feat: precios de Pro IA ($660 MXN / $44 USD) en scripts de Stripe y PayPal"
```

---

### Task 3: Nombre visible "Pro IA" (frontend)

**Files:**
- Create: `frontend/src/lib/planNames.ts`
- Modify: `frontend/src/pages/Dashboard.tsx` (~línea 907)
- Modify: `frontend/src/pages/AdminPanel.tsx` (~líneas 1499 y 1698)
- Modify: `frontend/src/pages/Explorar.tsx` (~línea 670)

- [ ] **Step 1: Fuente única**

Crear `frontend/src/lib/planNames.ts`:

```ts
// El valor interno 'CLINICO' se conserva en base de datos, Stripe y PayPal.
// Solo el nombre que ve la persona cambió a "Pro IA".
export const PLAN_LABEL = {
  FREE: 'Free',
  PRO: 'Pro',
  CLINICO: 'Pro IA',
} as const;
```

- [ ] **Step 2: Dashboard**

En `Dashboard.tsx` agregar `import { PLAN_LABEL } from '../lib/planNames';` y cambiar `{isClinico ? 'Clínico' : isPro ? 'Pro' : 'Free'}` por `{isClinico ? PLAN_LABEL.CLINICO : isPro ? PLAN_LABEL.PRO : PLAN_LABEL.FREE}`.

- [ ] **Step 3: AdminPanel**

Cambiar el texto de `<option value="CLINICO">Clínico</option>` por `<option value="CLINICO">Pro IA</option>`. Revisar con `grep -n "Clínico\|Clinico" frontend/src/pages/AdminPanel.tsx` cada texto visible (línea ~1698 y similares) y cambiar solo texto que ve el usuario, NUNCA el literal `'CLINICO'` usado como valor.

- [ ] **Step 4: Explorar**

Revisar el texto de la insignia en `Explorar.tsx` ~línea 670 (`profile.isClinico && (...)`) y cambiar a "Pro IA" si dice "Clínico". No tocar el campo `isClinico` (contrato con el backend en `profiles.ts:281`).

- [ ] **Step 5: Búsqueda de textos sueltos**

Run: `grep -rn "Clínico\|Clinico" frontend/src --include=*.tsx --include=*.ts | grep -v "isClinico\|useClinicoFeature\|'CLINICO'\|CLINICO_"`
Cualquier texto visible restante (correos del backend incluidos: `grep -rn "Clínico" backend/src`) se cambia a "Pro IA". Anotar el resultado.

- [ ] **Step 6: Typecheck**

Run (desde `frontend/`): `npx tsc -b`
Expected: sin errores.

- [ ] **Step 7: Commit**

```bash
git add frontend/src
git commit -m "feat: renombrar plan Clinico a Pro IA en la interfaz"
```

---

### Task 4: Página de precios (Pricing.tsx)

**Files:**
- Modify: `frontend/src/pages/Pricing.tsx:10-38` (constantes) y las tarjetas de los 3 planes

- [ ] **Step 1: Reemplazar listas y precios**

Sustituir las constantes por:

```ts
const FREE_FEATURES = [
  'Listado en el directorio de Aliax',
  'Agenda y reservas ilimitadas',
  'Pacientes ilimitados',
  'Recordatorios de cita por correo, sin límite',
  'Notas de sesión manuales',
];

const PRO_FEATURES = [
  'Todo lo del plan gratuito',
  'Historia Clínica Individual y de Pareja',
  'Analytics completos',
  'Todos los templates y colores premium',
  'Vende tus cursos y talleres en la tienda de Aliax, sin comisión',
  'Comunidad: reunión mensual en vivo con otros terapeutas (reflexión y casos clínicos)',
  'Configuración avanzada de disponibilidad',
];

const CLINICO_FEATURES = [
  'Todo lo del plan Pro',
  'Notas de sesión generadas con IA (Libre, SOAP, Diamante TBCS, Centrada en Soluciones)',
  'Transcripción de audio de sesión a nota automática',
  'Separación de hablantes, consentimiento del paciente, el audio nunca se almacena',
  'Uso generoso para tu consulta de tiempo completo',
];

const PRICES = {
  PRO:     { MX: { amount: '$210 MXN', currency: 'MXN' as const }, INTL: { amount: '$14 USD',  currency: 'USD' as const } },
  CLINICO: { MX: { amount: '$660 MXN', currency: 'MXN' as const }, INTL: { amount: '$44 USD',  currency: 'USD' as const } },
};
```

No usar el guion largo en ningún texto (regla absoluta de César). NO listar "publicar artículos": no existe todavía.

- [ ] **Step 2: Nombre y mensaje de la tarjeta del tercer plan**

En el JSX de la tarjeta de `CLINICO_FEATURES` (~líneas 185-240) cambiar el título visible de "Clínico" a "Pro IA" usando `PLAN_LABEL.CLINICO` (import desde `../lib/planNames`), agregar bajo el precio la frase "Pro + Notas con IA", y cambiar los textos de botones `Pagar con tarjeta — ${clinicoPrice.amount}/mes` para que no usen el guion largo: `Pagar con tarjeta: ${clinicoPrice.amount}/mes` (mismo cambio para las otras dos ocurrencias con guion largo en la página).

- [ ] **Step 2b: Etiqueta "Precio de lanzamiento" en la tarjeta Pro**

En la tarjeta del plan Pro agregar, junto al precio (`$210 MXN` / `$14 USD`), una etiqueta visible con el texto exacto `Precio de lanzamiento` (estilo de insignia pequeña con el acento teal existente, sin borde, usar sombra sutil según la regla de bordes vs sombras, legible en modo claro y oscuro, escritorio y móvil). Solo en Pro, no en Free ni en Pro IA. Sin guion largo.

- [ ] **Step 3: Typecheck**

Run (desde `frontend/`): `npx tsc -b`
Expected: sin errores.

- [ ] **Step 4: Verificación visual**

Levantar `npm run dev` en `frontend/` y revisar `/pricing` en modo oscuro y claro, escritorio y móvil, selector México e Internacional (precios $660 MXN y $44 USD, tres tarjetas simétricas). Si Claude in Chrome no está disponible, usar Chrome headless.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Pricing.tsx
git commit -m "feat: pagina de precios con Free, Pro (tienda y comunidad) y Pro IA"
```

---

### Task 4b: Beneficio "Comunidad" en las páginas para terapeutas psicólogos

**Files:**
- Modify: `frontend/src/components/landing/ThirdScreen.tsx` (lista `FEATURES`, líneas ~12-23; esta pantalla solo la usa `pages/ParaPsicologos.tsx`)
- Revisar: `frontend/src/pages/ParaPsicologos.tsx`, `frontend/src/pages/Unete.tsx`, `frontend/src/pages/Landing.tsx` (buscar con `grep -n "Historia Cl\|Analytics" ` cualquier otra lista de beneficios para terapeutas)

- [ ] **Step 1: Agregar el beneficio a la lista**

En `ThirdScreen.tsx` importar el icono `UsersRound` (o `MessagesSquare`) de `lucide-react` y agregar a `FEATURES`:

```ts
{ icon: UsersRound, title: 'Comunidad de terapeutas', desc: 'Reunión mensual en vivo para reflexionar y revisar casos con colegas.', color: '#2dd4bf' },
```

Texto sin guion largo (regla absoluta).

- [ ] **Step 2: Cuidar la simetría de la cuadrícula**

Hoy `FEATURES` tiene 10 elementos. Con 11 puede quedar una tarjeta huérfana según las columnas. Antes de tocar nada, listar cuántas columnas tiene la cuadrícula en escritorio y móvil (revisar el contenedor que hace `FEATURES.map`). **DECIDIDO por César (2026-11-15):** fusionar "Notas con IA" y "Diferentes notas clínicas" en UNA sola tarjeta para volver a 10, y que se entiendan las dos ideas (IA y formatos a elegir). Texto sugerido: título `Notas con IA, en el formato que prefieras`, desc `SOAP, Libre, Diamante TBCS y más, generadas por IA. Elige el que se adapte a tu estilo.` Quitar la tarjeta "Diferentes notas clínicas". Usar `auto-fit` y no `auto-fill` si hay que ajustar el grid.

- [ ] **Step 3: Revisar el texto de Recordatorios**

La tarjeta "Recordatorios automáticos" dice "WhatsApp y correo antes de cada sesión", pero César confirmó (2026-11-14) que hoy NO hay recordatorios por WhatsApp ni SMS. Verificar con `grep -n "sendWhatsApp\|whatsappService" backend/src/routes/cron.ts` si de verdad se envía algo por WhatsApp en producción. **DECIDIDO por César (2026-11-15):** quitar WhatsApp del copy y dejar solo correo electrónico, sin importar lo que muestre el grep. Cambiar el texto a `Recordatorios por correo electrónico antes de cada sesión` (título "Recordatorios automáticos"). Hacer el mismo cambio en cualquier otra página que mencione recordatorios por WhatsApp: `grep -rni "whatsapp" frontend/src --include=*.tsx | grep -i "record"`. No tocar el código del backend, solo el copy visible. Informar a César si el grep muestra que el backend sí envía WhatsApp.

- [ ] **Step 4: Otras páginas**

En `Pricing.tsx` la Comunidad ya queda en la lista de Pro (Task 4). Revisar `Unete.tsx` y `Landing.tsx`: si tienen una lista de beneficios para terapeutas, agregar la misma línea; si no la tienen, no inventar una sección nueva. No tocar `BuscoTerapia.tsx` ni `PsicologosDirectory.tsx` (son para pacientes).

- [ ] **Step 5: Typecheck y verificación visual**

Run (desde `frontend/`): `npx tsc -b`
Expected: sin errores. Luego revisar `/para-psicologos` en escritorio y móvil, modo oscuro y claro, comprobando que las tarjetas queden simétricas y sin tarjeta huérfana.

- [ ] **Step 6: Commit**

```bash
git add frontend/src
git commit -m "feat: beneficio Comunidad de terapeutas en paginas para psicologos"
```

---

### Task 5: Cuentas existentes, trial y comunicación (sin código nuevo)

- [ ] **Step 1: Verificar cuentas con plan fijo.** César A. = CLINICO, Aliax Demo = PRO, Ana Luisa = FREE (decisión guardada). No se tocan.
- [ ] **Step 2: Trial de 5 días.** El trial sigue otorgando acceso a IA con sus límites propios (2 h de audio, 10 notas). Su texto en pantalla debe decir "Pro IA". Hacer `grep -rn "prueba\|trial" frontend/src --include=*.tsx -i` y revisar los mensajes visibles.
- [ ] **Step 3: Usuarios Pro actuales (4) y cualquier Clínico pagado.** Conservan su precio. Anotar en memoria si hay alguno que pague $900 para decidir con César si se migra a $660 (bajar precio a quien ya paga lo decide él, no se hace solo).
- [ ] **Step 4: Primera reunión de Comunidad (decidido por César 2026-11-15).** NO se usa el módulo de Webinars. César crea la reunión en Zoom o Meet e invita a mano (correo o WhatsApp) a TODOS los usuarios de Aliax, porque hoy nadie paga ningún plan. La primera reunión es para presentarles la propuesta de la comunidad. Desde la segunda, la invitación es solo para quienes tengan plan Pro o Pro IA (camino 2). Construir "ofertas solo para miembros Pro" queda fuera de alcance hasta que la comunidad crezca. Decidir fecha antes de anunciar la Comunidad en redes.

---

### Task 6: Despliegue y smoke test

**Regla del proyecto:** backend y frontend son proyectos Vercel distintos; `git push` solo genera Preview; producción requiere `npx vercel --prod` en cada uno. **Confirmar con César cada despliegue por separado antes de ejecutarlo.**

- [ ] **Step 1:** Con confirmación, desplegar backend (`backend/`, `npx vercel --prod`), confirmar `Aliased`.
- [ ] **Step 2:** Con confirmación, desplegar frontend (`frontend/`, `npx vercel --prod`), confirmar `Aliased`.
- [ ] **Step 3: Smoke test funcional (no solo el hash del bundle):** abrir `www.aliax.io/pricing` y ver $660 MXN / $44 USD; iniciar sesión con una cuenta real y cargar el Dashboard (etiqueta de plan); crear una sesión de Stripe Checkout para Pro IA por API y expirarla de inmediato comprobando `amount_total` (66000 en MXN, 4400 en USD) SIN pagar. Nunca procesar un pago real sin autorización explícita en el momento.
- [ ] **Step 4:** Guardar en memoria (`project_aliax_monetizacion_contenido.md`) qué quedó desplegado y qué sigue pendiente (artículos de terapeutas, payout, primera sesión de Comunidad).

---

## Self-Review

- **Cobertura:** Free ilimitado (ya cumple, hallazgos), Pro con tienda sin comisión (ya cumple por `isProUser`, copy en Task 4), Comunidad en Pro (Task 4 copy + Task 5 sesión manual), Pro IA a $660 con tope (Tasks 1, 2, 4), nombre Pro IA (Task 3), plan Clínico olvidado (se reemplaza nombre y precio, valor interno intacto). Artículos: fuera de alcance, declarado arriba.
- **Placeholders:** el único dato abierto es el precio USD ($44, marcado para confirmar). Los números de línea del frontend (907, 1499, 1698, 670) son aproximados, cada step pide verificar con grep.
- **Consistencia:** `monthlyAudioCapReached`, `AUDIO_MONTHLY_SESSION_CAP`, `startOfCurrentMonth` definidos en Task 1 y usados con esos nombres; `PLAN_LABEL` definido en Task 3 y usado en Tasks 3 y 4.
