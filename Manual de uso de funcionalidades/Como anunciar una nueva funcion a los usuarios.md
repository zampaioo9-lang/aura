# Cómo anunciar una nueva función a los usuarios

Hay dos mecanismos disponibles para comunicar novedades:

---

## 1. Badge "Nuevo" en la navegación

Muestra un badge verde en la pestaña y en la sección específica donde está la nueva función.

### Archivo a editar
`frontend/src/pages/Dashboard.tsx` — línea ~81

### Pasos

**Agregar el badge:**

Busca el array `NEW_FEATURES` y agrega una línea:

```ts
const NEW_FEATURES: { id: string; tab: Tab }[] = [
  { id: 'nombre-descriptivo-YYYY-MM', tab: 'profesional' },
];
```

- **`id`**: cualquier texto único, incluye la fecha para recordar cuándo lo creaste
- **`tab`**: dónde aparece el badge. Opciones: `'inicio'` · `'citas'` · `'explorar'` · `'profesional'`

**Quitar el badge** (cuando ya no sea relevante, ~2-3 semanas después):

Simplemente borra esa línea del array.

### Comportamiento
- El badge aparece en la pestaña exterior y dentro de la sección específica (actualmente configurado para "Clientes" dentro de "Perfil Profesional")
- Desaparece automáticamente para cada usuario cuando hace clic en la sección
- Se guarda en `localStorage` del navegador bajo la clave `aliax_seen_features`

### Pruebas / debug
Si el badge no aparece al probar, ejecutar en la consola del navegador (F12):
```js
localStorage.removeItem('aliax_seen_features')
```
Luego recargar la página.

### Deploy
```bash
cd Downloads/aura && vercel --prod
```

---

## 2. Correo masivo desde el Admin Panel

Envía un email personalizado a todos los usuarios o a un segmento específico.

### Dónde está
`https://www.aliax.io/admin` → sección **"Enviar anuncio a usuarios"**

### Pasos
1. Elegir **audiencia**: Todos / Solo PRO / Solo trial
2. Escribir el **asunto** del correo
3. Escribir el **mensaje** (soporta saltos de línea)
4. Clic en **"Enviar anuncio"** → confirmar
5. Se mostrará cuántos correos se enviaron exitosamente

### Notas
- El correo llega con el diseño visual de Aliax (logo, botón al dashboard)
- Se saluda al usuario por su nombre
- No hay límite de envíos, pero úsalo con moderación para no saturar a los usuarios

---

## Recomendación de uso combinado

Para anuncios importantes, usar **ambos mecanismos**:

1. Badge en la navegación → para usuarios que entran al app
2. Correo masivo → para usuarios que no han entrado en días
