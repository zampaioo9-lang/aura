# 2026-03-19 — Landing psicólogo + Estrategia de marketing

---

## 1. Landing page para psicoterapeutas

### URL
`https://www.aliax.io/psicologo`

### Archivos creados / modificados
- `frontend/src/pages/LandingPsicologo.tsx` — componente principal
- `frontend/psicologo.html` — HTML con SEO y fuentes
- `frontend/vite.config.ts` — agregado entry `psicologo`
- `frontend/src/App.tsx` — agregada ruta `/psicologo`

### Diseño
- **Tipografía:** DM Serif Display (títulos) + Inter (cuerpo) — disruptivo para el nicho
- **Acento:** Teal `#5BC8BE` / `#2E9B94` — inesperado para psicología, sofisticado
- **Fondo:** `#080414` (mismo dark que barbería y salón)

### Secciones
1. Hero — título "Más tiempo para la terapia. / Menos para administrar."
2. Pain points — WhatsApp, no-shows, agenda que consume
3. Soluciones — citas 24/7, recordatorios, agenda digital
4. Cómo funciona — 3 pasos
5. Features grid — 8 cards (presencial/online, privacidad, duración por sesión, etc.)
6. Badge strip — enfoques terapéuticos (CBT, Gestalt, EMDR, Sistémico, etc.)
7. Testimonial — Andrea M., psicoterapeuta CDMX
8. CTA final — "Tu práctica merece crecer sin caos"
9. Footer — links a barbería y salón

### SEO
- Meta description, keywords, canonical, og:tags, twitter:card
- Schema.org SoftwareApplication
- Indexación solicitada en Google Search Console el 2026-03-19

### Deploy
```bash
cd Downloads/aura && vercel --prod
```

---

## 2. Estrategia de marketing — etapa temprana

### Contexto
- 2 usuarios en trial
- Nicho inicial: barberías en México
- Presupuesto: ~$1,000 MXN
- Canales activos: TikTok y Facebook (1 video publicado, 6 likes, sin conversiones)

### Orden de nichos
```
Ahora        → Barberías (100% del esfuerzo)
4-6 semanas  → Estéticas (nicho similar, mismo tipo de dolor)
Después      → Psicólogos (nicho diferente, otro enfoque)
```

### Estrategia principal
1. Ventas directas 1 a 1 (DMs en Instagram/TikTok) — 10 por día
2. Contenido TikTok con gancho desde el dolor, no desde la solución
3. Grupos de Facebook de barberos
4. El $1,000 MXN: micro-influencers a cambio de mostrar la plataforma

### Formato de video recomendado
- Cara en cámara → gancho (2-3 seg) y cierre
- B-roll → el problema
- Screencast → la solución (Aliax funcionando)
- Exportar sin marca de agua con CapCut

### 4 videos guionizados (ver archivo: Videos y DMs para redes sociales.md)
- Video 1: El caos del WhatsApp
- Video 2: El cliente perdido
- Video 3: Antes y después
- Video 4: La historia de César ⭐ (publicar primero)

### Instagram
- Abrir como persona: César (no como marca Aliax)
- Sugerencia: @cesar.aliax o @cesar_fundador

### Publicación por red
| Red | ¿Publicar? | Nota |
|-----|-----------|------|
| TikTok | ✅ | Principal, sube tal cual |
| Instagram Reels | ✅ | Sin marca de agua de TikTok |
| YouTube Shorts | ✅ | Tarda más pero dura más |
| Facebook grupos | ✅ | En grupos de barberos, no en página |
| LinkedIn / Twitter | ❌ | No es el nicho |

### DMs listos (ver archivo: Videos y DMs para redes sociales.md)
- 5 mensajes para diferentes etapas de la conversación

### Alternativas de ingreso inmediato (crisis financiera)
1. Clases de natación particulares — $200-400 MXN/clase, grupos de mamás en Facebook
2. Redacción de contenido en Workana.com
3. Páginas web / automatizaciones con Claude para negocios locales — $3,000-8,000 MXN
4. Taller online de terapia de pareja — 8-10 parejas × $500-800 MXN
5. Amigos empresarios — ofrecer servicio específico, no empleo

---

## Archivos relacionados
- `Estrategias de posicionamiento/Etapa temprana — primeros usuarios.md`
- `Estrategias de posicionamiento/Estrategia de redes sociales y contenido.md`
- `Videos y DMs para redes sociales.md`
- `Manual de uso de funcionalidades/Como anunciar una nueva funcion a los usuarios.md`
