# Configuración de cuenta de correo para newsletter

## La realidad del stack de email

- **Resend** → envía los newsletters y emails transaccionales ✅
- **Zoho / Google Workspace / ImprovMX** → necesitas uno para tener el buzón hola@aliax.io donde recibes respuestas ✅

Los dos se complementan, no se reemplazan.

## Orden recomendado

1. Crear hola@aliax.io (buzón para recibir) — opciones:
   - ImprovMX (gratis, redirige a tu Gmail) ← recomendado
   - Google Workspace ($6 USD/mes)
2. Agregar formulario de captura de email en /unete (guardar emails en DB)
3. Enviar newsletters desde Resend usando hola@aliax.io como remitente

## Notas adicionales

- Zoho eliminó el plan gratuito para dominios personalizados
- ImprovMX es la opción más rápida: 5 minutos, solo agregas registros MX en Porkbun
- Para responder desde hola@aliax.io con Gmail: configurar "Enviar como" en ajustes de Gmail
