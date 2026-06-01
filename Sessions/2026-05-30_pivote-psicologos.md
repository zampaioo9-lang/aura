# Pivote estratégico Aliax — Directorio de Psicólogos
**Fecha:** 2026-05-30

---

## Decisión

Pivote de directorio generalista → **directorio especializado en psicólogos y salud mental**, con expansión futura a otros profesionales de cita (estilistas, podólogos, masajistas, etc.).

---

## Por qué psicólogos primero

- Psychology Today cobra $29.95 USD/mes por perfil — los psicólogos ya están acostumbrados a pagar
- Doctoralia México cobra ~$15,000 MXN/año — Aliax gratis tiene ventaja real de entrada
- Nadie resuelve bien en LATAM la búsqueda por enfoque terapéutico
- El usuario tiene background en el sector (PsiqueCreativa) — ventaja que ningún competidor técnico tiene
- La búsqueda "psicólogo [enfoque] [ciudad]" en Google no está bien cubierta

---

## Modelo de negocio confirmado

| Plan | Qué incluye |
|------|-------------|
| **Free** | Aparecer en directorio, perfil completo, ser encontrado por ciudad/enfoque/país |
| **Pro** | Posición prioritaria, agenda integrada, badge verificado, analytics, reseñas, video |

**NO se procesan pagos de sesiones.** El psicólogo cobra directo al paciente. Aliax monetiza solo con suscripción Pro. Razón: complejidad legal (CNBV, CFDI) innecesaria en esta etapa. Revisitar con Stripe Connect cuando haya +300 psicólogos activos.

---

## Diferenciador clave

El paciente busca en su idioma ("estoy pasando por ansiedad"), Aliax mapea internamente a enfoques terapéuticos. Ninguna plataforma latinoamericana hace esto bien hoy.

---

## Campos nuevos en el perfil de psicólogo

Agregar al modelo `Profile` en Prisma (`prisma db push`, no migrate dev):

```prisma
therapeuticApproaches  String[]  @default([])  // TCC, Sistémico, EMDR, Gestalt...
problematics           String[]  @default([])  // Ansiedad, Duelo, Pareja...
populations            String[]  @default([])  // Adultos, Parejas, Adolescentes...
modality               String?                 // presencial | online | hibrida
pricePerSession        Decimal?
sessionCurrency        String?   @default("MXN")
sessionDurationMinutes Int?      @default(50)
cedula                 String?                 // cédula profesional — clave México
university             String?
degree                 String?                 // licenciatura | maestria | doctorado
languages              String[]  @default([])
acceptsInvoice         Boolean?  @default(false)
workingStyle           String?                 // "mi forma de trabajar" — texto libre
```

---

## Flujo del paciente

```
Google "psicólogo TCC Monterrey"
  → URL indexable Aliax (/mx/monterrey/psicologos/tcc)
  → Página de resultados con filtros
  → Perfil del psicólogo
  → Contacto: WhatsApp directo / Formulario / Agenda (Pro)
```

**Filtros en Explorar:**
- "¿Qué estás viviendo?" → mapea a problemáticas
- Ciudad / País
- Enfoque terapéutico
- Modalidad (presencial / online / híbrida)
- Precio máximo
- Población (adultos, parejas, niños...)

---

## Plan técnico — orden de implementación

| Paso | Qué | Estimado | Estado |
|------|-----|---------|--------|
| 1 | Schema Prisma + `db push` | 1–2h | ✅ Listo — 2026-05-30 |
| 2 | `profileSchema.ts` + `ProfileEditor.tsx` — nuevos campos | 3–4h | ✅ Listo — 2026-05-30 |
| 3 | Backend: nuevos filtros en `/profiles/directory` con `hasSome` | 2h | ✅ Listo — 2026-05-31 |
| 4 | `Explorar.tsx` — nuevos filtros UI | 3–4h | ✅ Listo — 2026-05-31 |
| 5 | `PublicProfile.tsx` — mostrar nuevos datos | 2h | ✅ Listo — 2026-05-31 |
| 6 | Páginas SEO por ciudad+enfoque (react-helmet) | 4–6h | ✅ Listo — 2026-05-31 |

**Total estimado: 2–3 días**

---

## Estrategias de adquisición de psicólogos

1. **Grupos de Facebook/WhatsApp** de psicólogos — canal más rápido, costo $0
2. **Google Maps scraping → cold email** (Outscraper + Hunter.io)
3. **DMs en LinkedIn**
4. **Apollo.io / Snov.io** cuando haya presupuesto (~$50–100 USD/mes)

---

## Lo que NO hacer a corto plazo

- ❌ Comunidad / red social — necesita masa crítica primero. Sustituir con grupos de WhatsApp propios de Aliax.
- ❌ Procesar pagos de sesiones — complejidad legal innecesaria ahora.
- ❌ Fontaneros / servicios de urgencia — modelo incompatible con cita previa.
- ❌ Expandir a otras profesiones antes de tener 300+ psicólogos activos.
