# Sesión: 2026-04-24 — Nuevo modelo de negocio Aliax

## Contexto

Después de 3 meses desde el lanzamiento, 0 usuarios pagando y 3 que probaron pero no se quedaron, se decidió replantear el modelo de negocio de Aliax.

### Por qué se fueron los 3 usuarios de prueba
- **Barbero**: quería subir muchas imágenes de cortes a su perfil (portfolio)
- **2 psicólogas**: dijeron estar cómodas con su forma actual de llevar sus procesos (no sentían dolor suficiente)

### Problema principal identificado
- No es el precio — es la **adquisición** y la **propuesta de valor**
- DMs por Instagram y WhatsApp no escalan
- Las landing pages por nicho requieren demasiado trabajo por nicho
- El email como única notificación no genera urgencia para pagar

---

## Nuevo modelo: Freemium + Directorio público

### Plan Gratuito (siempre gratis)
- 1 perfil público
- Servicios ilimitados
- Reservas ilimitadas
- Notificaciones por **email** (profesional y cliente)
- Hasta **3 fotos** por servicio
- 2 de los 4 templates
- Listado básico en directorio público de Aliax

### Plan Pro (~$9 USD/mes)
- Todo lo gratuito +
- Notificaciones por **WhatsApp** (cliente + profesional)
- **Portfolio de fotos ilimitado** (resuelve al barbero)
- Los 4 templates
- Analytics completos (tendencias, servicios más reservados)
- **Posición destacada** en el directorio con badge Pro
- Recordatorio automático 24h por WhatsApp
- Hasta 3 perfiles

---

## Directorio público — aliax.io/explorar

- Página pública de búsqueda por tipo de profesional + ciudad
- Páginas SEO estáticas generadas: "psicólogo en Monterrey", "barbero en CDMX", etc.
- Google indexa y trae tráfico orgánico sin costo
- Profesionales Pro: primeros resultados + badge
- Profesionales Free: aparecen más abajo sin badge
- **Invierte la adquisición**: los clientes encuentran profesionales en Google, los profesionales ven valor en Aliax solos

---

## Los 4 "forzadores" de upgrade

| Situación | Dolor | Solución en Pro |
|---|---|---|
| Clientes ignoran email de confirmación | No-shows frecuentes | WhatsApp |
| Barbero/estilista con 3 fotos llenas | No puede mostrar su trabajo | Portfolio ilimitado |
| Quiere saber qué servicio le deja más | No ve tendencias | Analytics completos |
| Quiere aparecer primero en el directorio | La competencia sale antes | Badge y posición Pro |

---

## WhatsApp — estrategia para resolver el problema histórico

El nombre "Aliax" quedó en `PENDING_REVIEW` en Meta Cloud API desde febrero 2026.

**Opciones a probar (en orden):**
1. Re-verificar con Meta — han pasado 2+ meses, puede estar aprobado ya
2. Cambiar a **WATI** o **360dialog** — BSPs oficiales de Meta que manejan la aprobación por ti; costo fijo mensual, más predecible

---

## Modelos analizados y descartados (por ahora)

### Modelo 2 — Comisión por reserva (Airbnb)
- Free to use, 5-8% por cada reserva cobrada en plataforma
- Requiere integrar cobro cliente→plataforma→profesional
- Más escalable a largo plazo, pero complejidad alta
- **Decisión**: guardar para cuando haya 50-100 usuarios activos

### Modelo 3 — Directorio + leads marketplace
- Profesionales pagan por aparecer primero o recibir leads
- **Decisión**: incorporar el directorio al Modelo 1, pero sin cobrar por leads en esta fase

---

## Estado al finalizar la sesión

- Diseño del nuevo modelo aprobado conceptualmente
- Pendiente: aprobación final del diseño antes de escribir plan de implementación
- Pendiente: decidir si WhatsApp va con Meta directamente o con WATI/360dialog
