# 2026-03-10 — Mejoras UI, Responsive, Admin y Directorio

## Cambios realizados

### Nav móvil — Landing y /unete
- Breakpoints cambiados de `sm:` a `md:` para que en celular (< 768px) solo aparezcan iconos
- "Precios" → icono `Tag`
- "Para profesionales" → icono `Briefcase` (antes oculto en móvil, ahora visible como icono)
- "Iniciar sesión" → icono `LogIn`
- "Crear cuenta" / "Registro" → icono `UserPlus`, pintado del mismo color que los demás (`text-white/50` en móvil)
- Aplicado en `Landing.tsx` y `Unete.tsx`

### /unete — Hero
- `<br className="hidden sm:block" />` → `<br />` para que "Sin publicidad pagada." siempre esté en línea separada

### Login y Register
- Fondo oscuro igual que la landing (`grain-overlay bg-aura-950`)
- Ambient background con blobs dorados/morados
- Logo animado (AuraLogo)
- Card de formulario: `bg-white/[0.03] border border-white/10`
- Textos blancos visibles
- Inputs blancos (como pedido)
- Botón cambiado de indigo a `bg-amber-glow`
- Badge "14 días gratis" en dorado
- Error en rojo oscuro translúcido
- `PhoneInput` con `isDark` prop en Register para que etiqueta sea visible

### Admin Panel — Eliminar usuario
- Nuevo endpoint `DELETE /api/admin/users/:id` en backend
- Elimina bookings del usuario antes de eliminar el usuario (FK constraint)
- Protecciones: no eliminar admins, no auto-eliminación
- Frontend: botón "Eliminar usuario" en el panel expandido de cada usuario
- Confirmación inline antes de ejecutar
- El usuario desaparece de la tabla sin recargar

### WhatsApp Widget
- Subido de `bottom: 24` a `bottom: 88` para no tapar el botón Pro

### Bio en perfil público
- Backend: `user: { select: { name, bio, socialLinks } }` — ahora incluye `user.bio`
- Template: muestra `profile.bio || profile.user?.bio`
- Bio movida justo debajo de la Profesión (antes estaba más abajo)

### AccountSettings — Editar perfil
- Añadido campo **Profesión** a la sección "Perfil Profesional" (antes solo existía en ProfileEditor)
- Al guardar, también sincroniza `profile.title` con `user.name`

### Perfil público — Nombre correcto
- Template ahora usa `profile.user?.name || profile.title` para el nombre
- Corrige el caso donde `profile.title` quedó desincronizado con el nombre real del usuario
- Confirmado con API: `fisio-sabina` tenía title="Sabina" pero user.name="John"

### Directorio — Categorías
- "Belleza y Estética" renombrada a **"Estética"**
- Añadidos: Peluquero/a, Pedicurista, Estética/Salón de Belleza, "Estilista y Barbero"
- "Tecnología y Digital" renombrada a **"Tecnología"**
- Expandida a ~45 profesiones: desarrollo, diseño, contenido, marketing, consultoría, soporte, datos/IA
- Añadidos los strings exactos de usuarios reales: "Consultor de TI", "Consultor"
- Etiquetas de categoría pintadas en color morado (acento del tema)

## Archivos modificados
### Frontend
- `src/pages/Landing.tsx`
- `src/pages/Unete.tsx`
- `src/pages/Login.tsx` (reescrito)
- `src/pages/Register.tsx` (reescrito)
- `src/pages/AdminPanel.tsx`
- `src/pages/AccountSettings.tsx`
- `src/pages/Dashboard.tsx`
- `src/components/WhatsAppWidget.tsx`
- `src/components/templates/MinimalistTemplate.tsx`
- `src/lib/professions.ts`

### Backend
- `src/routes/admin.ts` — endpoint DELETE /admin/users/:id
- `src/routes/profiles.ts` — incluye user.bio en respuesta pública

## Deploy
- Frontend: `cd Downloads/aura && vercel --prod`
- Backend: `cd Downloads/aura/backend && vercel --prod`
- Ambos en producción al cierre de sesión
