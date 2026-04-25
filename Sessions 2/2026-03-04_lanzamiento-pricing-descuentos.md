# 2026-03-04 — Lanzamiento, Pricing y Descuentos

## Cambios en Pricing (/pricing)

### Features actualizadas
- Añadido: "Enlace personalizado para compartir con tus clientes" — en ambas tarjetas
- "Notificaciones WhatsApp" → badge amarillo "próximamente" en ambas tarjetas
- "Múltiples plantillas" → "4 templates de distintos colores"
- "Soporte prioritario" → solo aparece en tarjeta Mensual (removido de Lifetime)
- Commit: `b856e66`

### Notas técnicas
- FEATURES ahora es array de objetos con `{ label, soon?, monthlyOnly? }`
- FeatureList acepta prop `isLifetime` para filtrar features exclusivas de mensual
- Deploy: `cd aura && vercel --prod` (desde raíz, no desde /frontend)

## Descuento especial lanzamiento — 20 contactos

### Estrategia
- Precio especial: $15/mes en lugar de $19 por 12 meses
- Dirigido a 20 contactos iniciales (colegas psicoterapeutas, amigos, consultantes)

### Configurado en Stripe
- **Cupón creado**: $4 off, duración repetida 12 meses, máx 20 canjes
- **Código**: ESPECIAL15 (o el ID asignado)
- **Payment Link**: Aliax Pro Mensual $19/mes + "Permitir códigos de promoción" activado
- Al mes 13, Stripe automáticamente cobra $19 sin intervención manual

### Mensaje para contactos
```
Hola [nombre], te comparto acceso especial a Aliax Pro con precio de lanzamiento:

👉 [link de Stripe]

Al momento de pagar ingresa el código ESPECIAL15 y el precio baja de $19 a $15/mes durante un año.

Cualquier duda con gusto te ayudo 😊
```

## Plan estratégico de lanzamiento

### Mensajes de WhatsApp por segmento
1. **Colegas psicoterapeutas**: Presentar Aliax como solución a coordinación de citas
2. **Amigos otras profesiones**: Pedir que compartan / si ellos lo necesitan
3. **Consultantes propios**: Mandar link directo del perfil para agendar

### Canales planificados
- WhatsApp personal (red directa, uno a uno)
- Instagram/TikTok (contenido orgánico, problema → solución)
- Grupos de Facebook/WhatsApp de profesionales
- LinkedIn (historia de construcción del producto)
- Product Hunt (semana 2)
- Meta Ads ($5-10/día, video demo como creatividad)
- SEO/Blog (largo plazo)

### Métricas objetivo
- Semana 1: 30 conversaciones abiertas
- Semana 2: 5-10 primeros clientes de pago
- Semana 3-4: 20-30 clientes

## URLs clave
- Frontend producción: https://www.aliax.io
- Backend producción: https://api.aliax.io
- Deploy frontend: `cd aura && vercel --prod`
- Deploy backend: `cd aura/backend && vercel --prod`
