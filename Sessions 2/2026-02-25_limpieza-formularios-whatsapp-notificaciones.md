# Sesión 2026-02-25 — Limpieza de formularios, unificación WhatsApp y notificaciones

## Resumen
Sesión de limpieza de UX en los formularios de perfil profesional y cliente, más sistematización del número de WhatsApp para notificaciones.

---

## Cambios realizados

### 1. Eliminación de templates no usados
- Eliminados `BoldTemplate.tsx`, `ElegantTemplate.tsx`, `CreativeTemplate.tsx`
- `PublicProfile.tsx` simplificado: `const Template = MinimalistTemplate` (sin templateMap)
- `ProfileEditor.tsx`: eliminada sección "Template" (selector de 4 opciones)

### 2. Limpieza de ProfileEditor (Añadir Perfil)
- Eliminadas secciones **Disponibilidad** y **Servicios** (ya tienen paneles dedicados)
- Botón "Dashboard" ahora navega a `/dashboard?tab=profesional`
- Eliminado upload de video de presentación (`VideoUpload` + import + `videoUrl` del form state)
- Eliminado WhatsApp de "Redes Sociales" (solo queda Facebook, Instagram, LinkedIn)
- Simplificado el map: ya no tiene condición `key === 'whatsapp'`

### 3. Campos obligatorios con asterisco rojo
**ProfileEditor:**
- `Username *` — editado en `UsernameInput.tsx`
- `Nombre / Titulo *`
- `Profesion *`
- `Teléfono WhatsApp *` → luego renombrado (ver punto 4)

**AccountSettings:**
- `Nombre *`
- `Correo electrónico *`
- `WhatsApp *` (movido a Información personal, ver punto 5)

**Componente `PhoneInput`**: añadida prop `required?: boolean` que muestra `*` en el label.

### 4. Sistematización WhatsApp para notificaciones
**Problema**: el backend usaba `profile.phone || user.phone` para notificar al profesional por WhatsApp. El número de AccountSettings (`user.socialLinks.whatsapp`) no se usaba.

**Solución backend** (`bookingService.ts`):
- Prioridad: `user.socialLinks.whatsapp` → `profile.phone` → `user.phone`
- Se añadió `socialLinks: true` al `select` en las dos queries relevantes (nueva reserva y cancelación)
- Dos variables separadas para evitar confusión: `userSocialLinks` y `cancelSocialLinks`

**Cambio en ProfileEditor**:
- Campo renombrado de "Teléfono WhatsApp" → **"WhatsApp Business"** (opcional, para uso público)
- Quitado `required`

### 5. WhatsApp movido a "Información personal" en AccountSettings
- Campo `PhoneInput` con label "WhatsApp *" ahora está en la sección "Información personal" (después de Bio)
- Incluye hint: *"Este número recibe las notificaciones de citas por WhatsApp."*
- Incluye preview link (Abrir enlace)
- `SOCIAL_NETWORKS` en AccountSettings ahora solo tiene Facebook, Instagram, LinkedIn
- Tipo `SocialKey` actualizado: `'facebook' | 'instagram' | 'linkedin'`
- Import `MessageCircle` eliminado

---

## Archivos modificados
- `frontend/src/pages/ProfileEditor.tsx`
- `frontend/src/pages/AccountSettings.tsx`
- `frontend/src/pages/PublicProfile.tsx`
- `frontend/src/components/UsernameInput.tsx`
- `frontend/src/components/PhoneInput.tsx`
- `backend/src/services/bookingService.ts`
- Eliminados: `BoldTemplate.tsx`, `ElegantTemplate.tsx`, `CreativeTemplate.tsx`

---

## Despliegues
- Frontend: `npx vercel --prod` → `https://www.aliax.io`
- Backend: `npx vercel --prod` → `https://api.aliax.io`
