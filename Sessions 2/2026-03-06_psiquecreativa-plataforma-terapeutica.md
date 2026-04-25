# PsiqueCreativa — Plataforma Terapéutica (app.psiquecreativa.com)

## Qué se construyó
Plataforma web completa separada del WordPress existente. El WordPress queda como landing y desde el botón login se entra a la app.

## Ubicación
`C:\Users\zampa\Downloads\psiquecreativa\`
- `backend/` — Node.js + Express + TypeScript
- `frontend/` — React + Vite + TypeScript + Tailwind

## Stack
- Frontend: React + Vite + TypeScript + Tailwind CSS
- Backend: Node.js + Express + TypeScript
- DB: PostgreSQL (Neon)
- Auth: JWT
- Pagos: Stripe (PayPal pendiente Fase 2)
- IA: Claude API (claude-sonnet-4-6)
- Archivos: Cloudinary (videos, PDFs, thumbnails)
- Deploy destino: Vercel

## Módulos implementados (MVP Fase 1)
1. **Auth**: registro/login con roles consultante/admin, JWT 7 días
2. **Catálogo**: programas publicados con precio, thumbnail, módulos
3. **Panel consultante**: mis programas, progreso por módulo, barra de progreso
4. **ProgramPlayer**: sidebar de módulos, reproductor video/PDF/texto, marcar completado
5. **Chatbot IA**: Claude con system prompt especializado en terapia de pareja, historial persistente por usuario
6. **Panel admin**: CRUD de programas, subida de archivos a Cloudinary, tabla de ventas, métricas básicas
7. **Pagos Stripe**: checkout session, webhook para confirmar, verificación de compra

## Schema DB (schema.sql)
users, programs, modules, purchases, module_progress, chat_messages

## Variables de entorno necesarias (.env.example)
Backend: DATABASE_URL, JWT_SECRET, CLOUDINARY_*, ANTHROPIC_API_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, FRONTEND_URL
Frontend: VITE_API_URL

## Pendiente (Fase 2)
- PayPal como segundo método de pago
- Subdominio app.psiquecreativa.com en Vercel
- Configurar variables de entorno en Vercel
- Crear las tablas en Neon con schema.sql
- Crear usuario admin manualmente en la DB
- Botón "Iniciar sesión" en WordPress que apunte a app.psiquecreativa.com/login
