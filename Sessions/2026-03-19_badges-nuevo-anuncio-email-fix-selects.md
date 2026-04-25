# 2026-03-19 — Badges "Nuevo", anuncio email masivo y fix selects

## 1. Fix campos Moneda y Duración en formulario de Servicios

**Archivo:** `frontend/src/components/ServiceForm.tsx`

- Los `<select>` de Moneda y Duración no mostraban las opciones al desplegarse (texto invisible por dark mode del sistema).
- **Fix:** Se agregó `style={{ colorScheme: 'light' }}` a ambos `<select>` y `backgroundColor`/`color` explícito en cada `<option>`.
- **Además:** Se agregó el Sol Peruano: `{ value: 'PEN', label: 'S/ PEN' }` al array `CURRENCIES` y al enum de Zod.

---

## 2. Sistema de badge "Nuevo" en navegación

**Archivo:** `frontend/src/pages/Dashboard.tsx`

### Cómo funciona

Se agregó un array `NEW_FEATURES` a nivel de módulo (línea ~81):

```ts
const NEW_FEATURES: { id: string; tab: Tab }[] = [
  { id: 'clientes-tab-2026-03', tab: 'profesional' },
];
```

- **`id`**: identificador único (incluye fecha). Se guarda en `localStorage` bajo `aliax_seen_features` cuando el usuario lo ve.
- **`tab`**: pestaña donde aparece el badge (`'inicio'`, `'citas'`, `'explorar'`, `'profesional'`).

### Lógica dentro del componente Dashboard

```ts
const [seenFeatures, setSeenFeatures] = useState<string[]>(() => {
  try { return JSON.parse(localStorage.getItem('aliax_seen_features') || '[]'); }
  catch { return []; }
});
const markSeen = (tab: string) => { ... }; // guarda el id en localStorage
const hasNew = (tab: string) => NEW_FEATURES.some(f => f.tab === tab && !seenFeatures.includes(f.id));
```

### Dónde aparece el badge

1. **Pestaña exterior "Perfil Profesional"** (desktop y mobile) — badge verde "Nuevo" / "NEW"
2. **Sección "Clientes" dentro de TabProfesional** — badge verde "Nuevo" junto al título

El badge desaparece cuando el usuario hace clic en la sección "Clientes" y la expande (`markSeen` se llama en el `onClick` del acordeón).

### Para usar en el futuro

- Agregar feature: añadir `{ id: 'id-unico-YYYY-MM', tab: 'nombre-tab' }` al array
- Quitar feature: borrar la entrada del array
- Si el badge no aparece en pruebas: `localStorage.removeItem('aliax_seen_features')` en la consola del navegador

### Archivos modificados

- `frontend/src/pages/Dashboard.tsx` — NEW_FEATURES, seenFeatures state, hasNew, markSeen, badge en tabs desktop/mobile, props pasados a TabProfesional
- `frontend/src/pages/Dashboard.tsx` — TabProfesional recibe `hasNew` y `markSeen` como props opcionales, badge en sección Clientes

---

## 3. Envío masivo de anuncios desde el Admin Panel

### Backend

**`backend/src/services/emailService.ts`** — nuevo template `announcement`:
- Recibe: `userName`, `userEmail`, `subject`, `body`
- Renderiza el body con saltos de línea, botón al dashboard

**`backend/src/routes/admin.ts`** — nuevo endpoint:
```
POST /api/admin/send-announcement
Body: { subject: string, body: string, audience: 'all' | 'pro' | 'trial' }
Response: { ok: true, sent: number, failed: number, total: number }
```
- Filtra usuarios por audiencia
- Envía un correo a cada usuario usando el template `announcement`

### Frontend

**`frontend/src/pages/AdminPanel.tsx`** — nueva sección "Enviar anuncio a usuarios":
- Selector de audiencia: Todos / Solo PRO / Solo trial
- Campo de asunto
- Textarea del mensaje
- Botón con confirmación antes de enviar
- Muestra resultado: "✓ Enviado a N usuarios" o error

**Estados agregados:**
```ts
const [annSubject, setAnnSubject] = useState('');
const [annBody, setAnnBody] = useState('');
const [annAudience, setAnnAudience] = useState<'all' | 'pro' | 'trial'>('all');
const [sendingAnn, setSendingAnn] = useState(false);
const [annResult, setAnnResult] = useState<{...} | null>(null);
```

---

## Deploy

```bash
cd Downloads/aura && vercel --prod
cd Downloads/aura/backend && vercel --prod
```
