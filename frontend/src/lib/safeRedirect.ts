// Solo se aceptan rutas internas del sitio (empiezan con una sola "/").
// Evita redirigir a dominios externos con un parámetro ?redirect= manipulado.
export function safeRedirect(raw: string | null | undefined, fallback = '/dashboard'): string {
  if (!raw) return fallback;
  if (!raw.startsWith('/')) return fallback;
  if (raw.startsWith('//') || raw.includes('\\')) return fallback;
  return raw;
}

// Devuelve "?redirect=/ruta" si el valor es válido, o "" si no hay nada que conservar.
export function redirectQuery(raw: string | null | undefined): string {
  const safe = safeRedirect(raw, '');
  return safe ? `?redirect=${encodeURIComponent(safe)}` : '';
}
