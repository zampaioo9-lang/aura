# Manual Técnico — Aliax

Documentación completa de la plataforma Aliax. Un archivo por módulo.

---

## Índice

| # | Archivo | Contenido |
|---|---------|-----------|
| 00 | [Visión General](00-overview.md) | Qué es Aliax, modelo de negocio, stack técnico, estructura de planes |
| 01 | [Autenticación](01-autenticacion.md) | Login, registro, JWT, AuthContext, middleware de auth, bloqueo de cuenta |
| 02 | [Dashboard](02-dashboard.md) | Layout, tabs, sidebar, temas de color, módulos protegidos por plan |
| 03 | [Perfil Profesional](03-perfil.md) | ProfileCreate, ProfileEditor, perfil público, templates, PROFESSIONS |
| 04 | [Agenda y Servicios](04-agenda-servicios.md) | Disponibilidad semanal, servicios, BookingSettings, bloqueos de fecha |
| 05 | [Sistema de Reservas](05-reservas.md) | Flujo de reserva, estados, cálculo de slots, endpoints |
| 06 | [Pacientes e Historia Clínica](06-pacientes.md) | Módulo pacientes, HC individual (9 pasos), HC pareja (9 pasos), notas de sesión |
| 07 | [Mi Cuenta](07-cuenta.md) | AccountSettings, secciones, listas hardcodeadas, endpoints |
| 08 | [Panel de Administración](08-admin-panel.md) | AdminPanel, tablero de stats, tabla de usuarios, newsletter, anuncios |
| 09 | [Control de Módulos Admin](09-admin-control-modulos.md) | featureOverrides, blocked, useFeature hook, cómo agregar nuevos módulos |
| 10 | [Planes y Pagos](10-planes-pagos.md) | Free/Pro/Lifetime, Stripe, PayPal, cupones, lógica isPro |
| 11 | [Sistema de Emails](11-emails.md) | Resend, 7 templates, newsletters, audiencias, variables de entorno |
| 12 | [Directorio y Páginas Públicas](12-directorio-publico.md) | Landing, Explorar, directorio SEO, perfil público, BookingPage |
| 13 | [Infraestructura y Deploy](13-infraestructura-deploy.md) | Vercel, Cloudinary, DB, comandos Prisma, variables de entorno, estructura de carpetas |
| 14 | [Componentes UI Compartidos](14-componentes-ui.md) | CountrySelect, PhoneInput, ProGate, temas de color, WizardAccentContext, MinimalistTemplate |
| 15 | [Analytics](15-analytics.md) | Endpoint, datos por plan (Free vs Pro), byStatus, byService, perDay, UI en Dashboard |

---

## Guía de Búsqueda Rápida

**¿Cómo funciona el login?** → `01-autenticacion.md`

**¿Cómo dar acceso Pro a un usuario específico?** → `09-admin-control-modulos.md`

**¿Cómo agregar un nuevo servicio?** → `04-agenda-servicios.md`

**¿Cómo se calcula la disponibilidad de citas?** → `05-reservas.md`

**¿Cómo funciona el wizard de Historia Clínica?** → `06-pacientes.md`

**¿Cómo hacer deploy a producción?** → `13-infraestructura-deploy.md`

**¿Qué emails se envían automáticamente?** → `11-emails.md`

**¿Cómo funciona Stripe/PayPal?** → `10-planes-pagos.md`

**¿Qué hace el campo `isPro`?** → `01-autenticacion.md` (AuthContext) y `10-planes-pagos.md`
