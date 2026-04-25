# Diseño: Nuevo modelo de negocio Aliax — Freemium + Directorio

**Fecha:** 2026-04-24  
**Estado:** Aprobado

---

## Contexto y motivación

Aliax lleva 3 meses en producción con 0 usuarios pagando. El modelo actual (trial 14 días → $19/mes) tiene dos problemas:

1. **Barrera de entrada alta**: los profesionales no quieren pagar antes de ver valor real
2. **Adquisición manual**: DMs por Instagram/WhatsApp no escalan

El nuevo modelo resuelve ambos: elimina la barrera de entrada con un plan gratuito genuinamente útil, y construye un directorio público que genera adquisición orgánica vía SEO.

---

## Estructura de planes

### Plan Gratuito (permanente)

| Feature | Límite |
|---|---|
| Perfiles | 1 |
| Servicios | Ilimitados |
| Reservas | Ilimitadas |
| Notificaciones | Email únicamente |
| Fotos por servicio | Máximo 3 |
| Templates | 2 de 4 (Minimalist + Bold) |
| Analytics | Últimas 10 reservas |
| Directorio | Listado básico, sin badge |

### Plan Pro (~$9 USD/mes)

Todo lo del plan gratuito, más:

| Feature | Detalle |
|---|---|
| Notificaciones WhatsApp | Al profesional (nueva reserva) y al cliente (confirmación + recordatorio 24h) |
| Fotos por servicio | Ilimitadas |
| Templates | Los 4 disponibles |
| Analytics | Historial completo, tendencias, servicios más reservados |
| Directorio | Posición destacada + badge "Pro" |
| Perfiles | Hasta 3 |

---

## Directorio público — aliax.io/explorar

### Objetivo
Generar tráfico orgánico de clientes buscando profesionales, sin depender de adquisición manual.

### Funcionamiento
- Página de búsqueda pública con filtros: tipo de profesional + ciudad
- Resultados ordenados: Pro primero (con badge), Free después
- Cada profesional tiene su página pública ya existente (`/book/:slug`)

### Páginas SEO estáticas
Se generan páginas indexables por Google para cada combinación relevante:

```
/explorar/psicologo/cdmx
/explorar/psicologo/monterrey
/explorar/barbero/guadalajara
/explorar/coach/bogota
... etc.
```

Estas páginas contienen los perfiles de profesionales de esa categoría y ciudad, con meta tags optimizados. Google las indexa y trae tráfico sin costo de adquisición.

### Impacto en adopción
Los clientes encuentran profesionales vía Google → reservan → el profesional ve reservas llegando solas → entiende el valor de Aliax → eventual upgrade a Pro.

---

## Los 4 forzadores de upgrade

Mecanismos por los que un usuario free sentirá la necesidad de pagar sin que se lo pidamos:

1. **No-shows por email**: El cliente recibe confirmación por email, no responde, no aparece. El profesional descubre que WhatsApp habría funcionado. → Upgrade para WhatsApp.

2. **Portfolio lleno**: Barberos, estilistas, tatuadores suben 3 fotos y quieren más. El sistema les indica que pueden subir más con Pro. → Upgrade para portfolio ilimitado.

3. **Analytics limitados**: El profesional quiere saber cuál servicio le genera más ingresos o en qué días tiene más reservas. Los analytics básicos muestran solo las últimas 10. → Upgrade para historial completo.

4. **Directorio**: El profesional busca su nombre en el directorio y ve que los Pro salen primero con badge. Su competencia tiene Pro. → Upgrade para mejor posición.

---

## Estrategia WhatsApp

WhatsApp es el feature premium central. El proveedor actual (Meta Cloud API directo) tiene el nombre "Aliax" en `PENDING_REVIEW` desde febrero 2026.

**Plan de resolución (en orden):**

1. **Verificar estado actual** con Meta — han pasado 2+ meses, puede estar aprobado
2. **Migrar a WATI o 360dialog** — Business Solution Providers (BSPs) oficiales de Meta:
   - WATI: ~$49/mes, ilimitado, aprobación gestionada por ellos
   - 360dialog: ~$5/mes + por mensaje, directo a Meta API
   - Ventaja: ellos manejan la aprobación del negocio con Meta, no dependemos de que Meta apruebe "Aliax" directamente

**Decisión**: probar Meta primero (costo 0 adicional, ya integrado). Si sigue bloqueado, migrar a WATI.

---

## Migración de usuarios actuales

- Usuarios que probaron con trial: pasan a plan gratuito automáticamente
- No hay usuarios pagando, por lo que no hay impacto en facturación existente
- Los límites del plan gratuito se aplican a cuentas nuevas y existentes

---

## Cambios técnicos necesarios

### Backend
1. Actualizar lógica de `plan` en middleware de autenticación:
   - Plan `FREE` (nuevo) vs `PRO` (antes era la única opción pagada)
   - Todos los usuarios existentes migran a `FREE` si no tienen suscripción activa
2. Agregar guards por feature:
   - Fotos: máximo 3 por servicio en FREE
   - Templates: solo Minimalist y Bold en FREE
   - Analytics: últimas 10 reservas en FREE
   - WhatsApp: solo ejecutar si `plan === 'PRO'`
3. Analytics completos: nuevo endpoint con historial + tendencias

### Frontend
4. Actualizar página `/pricing` con nueva estructura free/pro
5. Banners de upgrade contextual (cuando el usuario intenta subir la 4ta foto, etc.)
6. Página `/explorar` — directorio con búsqueda y filtros
7. Páginas SEO estáticas por profesión + ciudad
8. Badge "Pro" en cards del directorio

---

## Fases de implementación sugeridas

**Fase 1 — Freemium (1-2 días)**
Cambios al sistema de planes, guards de features, nueva página de pricing.

**Fase 2 — WhatsApp (1-2 días)**
Resolver proveedor, activar notificaciones para usuarios Pro.

**Fase 3 — Directorio (2-3 días)**
Página /explorar, búsqueda, filtros, páginas SEO estáticas.

**Fase 4 — Analytics Pro (1 día)**
Historial completo, tendencias, servicios más reservados.

---

## Métricas de éxito

| Métrica | Objetivo 30 días |
|---|---|
| Registros nuevos (free) | 30+ |
| Activación (perfil completo + al menos 1 servicio) | 50% de registros |
| Upgrade a Pro | 3-5 usuarios |
| Tráfico orgánico al directorio | Primeras indexaciones en Google |
