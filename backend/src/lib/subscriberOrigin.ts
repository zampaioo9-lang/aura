// Origen de un suscriptor de la Revista (de que red o enlace llego). Los datos llegan de un formulario publico,
// asi que se limpian antes de guardarlos: solo letras, numeros y unos pocos signos, con largo maximo.

const TAG_ALLOWED = /[^a-z0-9._:-]/g;
const PATH_ALLOWED = /[^a-zA-Z0-9\-_/.]/g;

/** Etiqueta corta en minusculas (por ejemplo "instagram" o "carrusel-burnout"). Devuelve null si queda vacia. */
export function cleanOriginTag(value: unknown, max = 40): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim().toLowerCase().replace(/\s+/g, '-').replace(TAG_ALLOWED, '').slice(0, max);
  return cleaned || null;
}

/** Ruta de la pagina donde se lleno el formulario, sin parametros ni dominio. Devuelve null si queda vacia. */
export function cleanLandingPath(value: unknown, max = 120): string | null {
  if (typeof value !== 'string') return null;
  const path = value.trim().split(/[?#]/)[0].replace(PATH_ALLOWED, '').slice(0, max);
  return path.startsWith('/') ? path : null;
}

export interface SubscriberOrigin {
  source: string | null;
  campaign: string | null;
  landingPage: string | null;
}

export function cleanSubscriberOrigin(input: { source?: unknown; campaign?: unknown; landingPage?: unknown }): SubscriberOrigin {
  return {
    source: cleanOriginTag(input.source, 40),
    campaign: cleanOriginTag(input.campaign, 60),
    landingPage: cleanLandingPath(input.landingPage),
  };
}
