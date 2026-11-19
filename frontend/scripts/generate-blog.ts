import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Unlike frontend/src/api/client.ts (which defaults to a relative '/api' -- safe in a
// browser, where it resolves against whatever host served the page), this script runs
// in Node at build time with no "current host" to resolve against, so a relative
// fallback makes no sense here. It falls back to the real production API so a plain
// `npm run build` works out of the box on Vercel (where VITE_API_URL is configured as
// a project env var) -- but that means a local/CI build that forgets to set
// VITE_API_URL will silently read real production articles. Warn loudly so that's
// never silent, even though we keep the fallback (removing it risks breaking the
// actual Vercel build if its env var setup doesn't match what we assume here).
if (!process.env.VITE_API_URL) {
  console.warn('[Revista] VITE_API_URL no esta configurada -- usando la API de produccion por defecto.');
}
const API_URL = process.env.VITE_API_URL || 'https://api.aliax.io/api';
const SITE_URL = 'https://www.aliax.io';
const PUBLIC_DIR = join(__dirname, '..', 'public');

interface Category {
  id: string; name: string; slug: string; audience: 'PACIENTES' | 'TERAPEUTAS';
}
interface ArticleBlock {
  type: 'TEXT' | 'IMAGE' | 'BUTTON' | 'SUBTITLE' | 'BULLET_LIST';
  text: string | null; imageUrl: string | null; imageAlt: string | null;
  buttonLabel: string | null; buttonUrl: string | null;
}
interface Article {
  id: string; slug: string; title: string; excerpt: string; metaDescription: string | null;
  author: string | null; authorProfileSlug?: string | null; authorAvatar?: string | null; coverImage: string | null; featured: boolean; publishedAt: string | null;
  category: Category; blocks: ArticleBlock[];
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// 200 words/min is the commonly cited average adult silent-reading speed -- there's no
// per-article field for this, it's always derived from the TEXT blocks at build time so
// it can never drift out of sync with the actual content.
function calculateReadingTime(blocks: ArticleBlock[]): number {
  const words = blocks
    .filter((b) => ['TEXT', 'SUBTITLE', 'BULLET_LIST'].includes(b.type) && b.text)
    .reduce((sum, b) => sum + (b.text as string).trim().split(/\s+/).filter(Boolean).length, 0);
  return Math.max(1, Math.ceil(words / 200));
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';
}

// Articles arrive already ordered publishedAt desc (API orderBy), so the first match in
// each of these is always the most recent one -- no extra sort needed here.
// Defensa en profundidad: solo http(s) en href/src (bloquea javascript:, data:, etc.).
export function safeHttpUrl(u?: string | null): string {
  return u && /^https?:\/\//i.test(u) ? u : '#';
}
export function safeImgSrc(u?: string | null): string {
  return u && /^https?:\/\//i.test(u) ? u : '';
}

function selectFeatured(articles: Article[]): Article | null {
  if (articles.length === 0) return null;
  const featured = articles.filter((a) => a.featured);
  return featured.length > 0 ? featured[0] : articles[0];
}

function relatedArticles(all: Article[], current: Article): Article[] {
  return all
    .filter((a) => a.id !== current.id && a.category.audience === current.category.audience)
    .slice(0, 3);
}

function collectCategories(articles: Article[]): Category[] {
  const seen = new Map<string, Category>();
  for (const a of articles) {
    if (!seen.has(a.category.id)) seen.set(a.category.id, a.category);
  }
  return Array.from(seen.values());
}

function pageShell(title: string, description: string, canonical: string, ogImage: string, body: string): string {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="article">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:image" content="${escapeHtml(ogImage)}">
<meta property="og:url" content="${canonical}">
<meta property="og:site_name" content="Revista Aliax">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:image" content="${escapeHtml(ogImage)}">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;700&family=Urbanist:wght@300;400;500;600;700;800&display=swap">
<style>
body{margin:0;background:#f4f4f2;font-family:'Urbanist',sans-serif;color:#3f3f46}
a{color:#0d9488;text-decoration:none}
h1,h2,h4,h5{font-family:'DM Sans',sans-serif;font-weight:700;color:#080414;letter-spacing:-0.02em}
h3{font-family:'DM Sans',sans-serif;font-weight:500;color:#080414;letter-spacing:-0.015em}
.ra-grid3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px}
.ra-hero-grid{display:grid;grid-template-columns:1fr 1fr}
.ra-pill{padding:8px 18px;border-radius:999px;border:1px solid transparent;background:rgba(139,92,246,0.12);color:rgba(8,4,20,0.65);font-size:13px;font-weight:600;cursor:pointer;font-family:'Urbanist',sans-serif}
.ra-pill-active{background:#2dd4bf;border-color:#2dd4bf;color:#04201c}
.ra-cat{padding:5px 13px;border-radius:999px;border:0;background:rgba(8,4,20,0.06);color:#45454f;font-size:12px;font-weight:600;cursor:pointer;font-family:'Urbanist',sans-serif}
.ra-cat-active{background:#080414;color:#fff}
.ra-bullets li{font-family:'DM Sans',sans-serif;font-weight:400;font-size:17px;line-height:1.75;color:#3f3f46;margin-bottom:8px}
.ra-bullets li::marker{color:#0d9488}
.ra-share{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:20px 0}
.ra-share-label{font-size:13px;font-weight:700;color:#080414;margin-right:2px}
.ra-share-btn{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;padding:0;border-radius:50%;border:0;background:#fff;box-shadow:0 2px 8px rgba(8,4,20,0.12);cursor:pointer;text-decoration:none}
.ra-share-btn:hover{background:#2dd4bf}
.ra-share-side{display:none}
@media (max-width:600px){
  .ra-share-inline,.ra-share-top{gap:8px}
  .ra-share-inline .ra-share-label,.ra-share-top .ra-share-label{flex-basis:100%;margin:0 0 2px}
  .ra-share-inline.ra-center .ra-share-label{text-align:center}
  .ra-share-inline .ra-share-btn,.ra-share-top .ra-share-btn{width:min(40px,calc((100% - 48px)/7));height:auto;aspect-ratio:1}
}
@media (min-width:1000px){
  .ra-share-top{display:none}
  .ra-share-side{display:flex;flex-direction:column;position:fixed;top:200px;left:calc(50% + 340px + 24px);margin:0;gap:10px}
}
.ra-card{transition:transform 0.2s ease,box-shadow 0.2s ease}
.ra-card:hover{transform:translateY(-6px);box-shadow:0 16px 40px rgba(8,4,20,0.16)}
@media (max-width:860px){.ra-grid3{grid-template-columns:1fr}.ra-hero-grid{grid-template-columns:1fr}}
</style>
</head>
<body>
${body}
</body>
</html>`;
}

function renderNav(): string {
  return `<div style="display:flex;align-items:center;justify-content:space-between;padding:24px 64px;border-bottom:1px solid rgba(8,4,20,0.08);background:#ffffff">
  <a href="/" style="display:flex;align-items:center;gap:12px">
    <div style="width:40px;height:40px;border-radius:50%;border:1.5px solid rgba(45,212,191,0.5);display:flex;align-items:center;justify-content:center;font-family:'Bebas Neue',sans-serif;font-size:18px;color:#0d9488">A</div>
    <div>
      <div style="font-family:'Bebas Neue',sans-serif;font-size:18px;color:#080414;line-height:1">ALIAX</div>
      <div style="font-size:10px;letter-spacing:0.15em;color:rgba(8,4,20,0.45);text-transform:uppercase">Salud Mental</div>
    </div>
  </a>
</div>`;
}

function renderByline(a: Article): string {
  const name = a.author || 'Aliax';
  const minutes = calculateReadingTime(a.blocks);
  // Si el autor es un terapeuta con perfil publicado, la firma enlaza a su perfil.
  const nameHtml = a.authorProfileSlug
    ? `<a href="https://www.aliax.io/${escapeHtml(a.authorProfileSlug)}" style="color:#0d9488;text-decoration:none">${escapeHtml(name)}</a>`
    : escapeHtml(name);
  return `<div style="display:flex;align-items:center;gap:8px;font-size:12px;color:#5b5b66">
  ${safeImgSrc(a.authorAvatar)
    ? `<img src="${escapeHtml(safeImgSrc(a.authorAvatar))}" alt="${escapeHtml(name)}" width="28" height="28" style="width:28px;height:28px;border-radius:50%;object-fit:cover;flex-shrink:0;display:block">`
    : `<span style="width:28px;height:28px;border-radius:50%;background:#2dd4bf;color:#04201c;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">${escapeHtml(initials(name))}</span>`}
  <span>${nameHtml} · ${formatDate(a.publishedAt)} · ${minutes} min de lectura</span>
</div>`;
}

// Iconos en negro (SVG inline, sin librerias). Cada boton es un circulo blanco con sombra suave.
const SHARE_ICONS = {
  whatsapp: '<svg viewBox="0 0 24 24" width="20" height="20" fill="#080414" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>',
  facebook: '<svg viewBox="0 0 24 24" width="20" height="20" fill="#080414" aria-hidden="true"><path d="M14 8h3V4h-3a4 4 0 0 0-4 4v2H7v4h3v7h4v-7h3l1-4h-4V8z"/></svg>',
  x: '<svg viewBox="0 0 24 24" width="18" height="18" fill="#080414" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
  linkedin: '<svg viewBox="0 0 24 24" width="19" height="19" fill="#080414" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>',
  mail: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#080414" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><polyline points="3 7 12 13 21 7"/></svg>',
  link: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#080414" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
  more: '<svg viewBox="0 0 24 24" width="20" height="20" fill="#080414" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
};

// Botones para compartir: enlaces directos a cada red (sin librerias ni rastreadores).
// Instagram no tiene direccion de compartir para sitios web, por eso el boton "Mas opciones"
// usa el menu nativo del celular (navigator.share), que si lista Instagram y demas apps.
// variant: 'inline' (horizontal), 'top' (horizontal, se oculta en pantallas anchas) o
// 'side' (vertical flotante a la derecha del articulo, solo en pantallas anchas).
function renderShareBar(url: string, title: string, text: string, label: string, variant: 'inline' | 'top' | 'side' = 'inline', center = false): string {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(text);
  const tu = encodeURIComponent(`${text} ${url}`);
  const mailSubject = encodeURIComponent(title);
  const mailBody = encodeURIComponent(`${text}\n\n${url}`);
  const btn = (aria: string, icon: string, attrs: string) =>
    `<a class="ra-share-btn" aria-label="${aria}" title="${aria}" ${attrs}>${icon}</a>`;
  const ext = 'target="_blank" rel="noopener noreferrer"';
  const labelHtml = label ? `<span class="ra-share-label">${escapeHtml(label)}</span>` : '';
  return `<div class="ra-share ra-share-${variant}${center ? ' ra-center' : ''}" style="${center ? 'justify-content:center;' : ''}">
  ${labelHtml}
  <button type="button" class="ra-share-btn" data-share-native aria-label="Más opciones" title="Más opciones" data-title="${escapeHtml(title)}" data-text="${escapeHtml(text)}" data-url="${escapeHtml(url)}" style="display:none">${SHARE_ICONS.more}</button>
  ${btn('Compartir por WhatsApp', SHARE_ICONS.whatsapp, `href="https://wa.me/?text=${tu}" ${ext}`)}
  ${btn('Compartir en Facebook', SHARE_ICONS.facebook, `href="https://www.facebook.com/sharer/sharer.php?u=${u}" ${ext}`)}
  ${btn('Compartir en X', SHARE_ICONS.x, `href="https://twitter.com/intent/tweet?text=${t}&url=${u}" ${ext}`)}
  ${btn('Compartir en LinkedIn', SHARE_ICONS.linkedin, `href="https://www.linkedin.com/sharing/share-offsite/?url=${u}" ${ext}`)}
  ${btn('Compartir por correo', SHARE_ICONS.mail, `href="mailto:?subject=${mailSubject}&body=${mailBody}"`)}
  <button type="button" class="ra-share-btn" data-share-copy data-url="${escapeHtml(url)}" aria-label="Copiar enlace" title="Copiar enlace">${SHARE_ICONS.link}</button>
</div>`;
}

function renderShareScript(): string {
  return `<script>
(function(){
  document.querySelectorAll('[data-share-native]').forEach(function(b){
    if (!navigator.share || !(window.matchMedia && window.matchMedia('(pointer: coarse)').matches)) return;
    b.style.display = 'inline-flex';
    b.addEventListener('click', function(){
      navigator.share({ title: b.getAttribute('data-title'), text: b.getAttribute('data-text'), url: b.getAttribute('data-url') }).catch(function(){});
    });
  });
  document.querySelectorAll('[data-share-copy]').forEach(function(b){
    b.addEventListener('click', function(){
      var url = b.getAttribute('data-url');
      var original = b.getAttribute('title');
      function done(){ b.setAttribute('title', '¡Enlace copiado!'); b.style.background = '#2dd4bf'; setTimeout(function(){ b.setAttribute('title', original); b.style.background = ''; }, 2000); }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done).catch(function(){});
      } else {
        var i = document.createElement('input');
        i.value = url; document.body.appendChild(i); i.select();
        try { document.execCommand('copy'); done(); } catch (e) {}
        document.body.removeChild(i);
      }
    });
  });
})();
</script>`;
}

function renderSubscribeBand(): string {
  return `<div id="suscribirse" style="background:#fff;border-radius:20px;padding:40px;text-align:center;margin:56px 0 0;box-shadow:0 10px 30px rgba(8,4,20,0.10)">
  <h3 style="font-size:22px;margin:0 0 8px">Suscríbete a Revista Aliax</h3>
  <p style="font-size:14px;color:#4b4b55;margin:0 0 20px;font-family:'DM Sans',sans-serif;font-weight:400">Recibe los artículos nuevos directo en tu correo.</p>
  <form id="ra-subscribe-form" style="display:flex;flex-direction:column;gap:12px;max-width:380px;margin:0 auto">
    <input id="ra-subscribe-fullname" type="text" required placeholder="Tu nombre completo" style="padding:12px 16px;border-radius:12px;border:1px solid rgba(8,4,20,0.15);font-size:14px;font-family:'DM Sans',sans-serif">
    <input id="ra-subscribe-email" type="email" required placeholder="tu@correo.com" style="padding:12px 16px;border-radius:12px;border:1px solid rgba(8,4,20,0.15);font-size:14px;font-family:'DM Sans',sans-serif">
    <div style="display:flex;gap:16px;justify-content:center;font-size:13px;color:#3f3f46;font-family:'DM Sans',sans-serif">
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="radio" name="ra-audience" value="TERAPEUTAS" checked> Soy terapeuta</label>
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="radio" name="ra-audience" value="PACIENTES"> Busco ayuda psicológica</label>
    </div>
    <label style="display:flex;align-items:flex-start;gap:8px;font-size:12px;color:#5b5b66;text-align:left;font-family:'DM Sans',sans-serif">
      <input id="ra-subscribe-consent" type="checkbox" required style="margin-top:2px">
      <span>Acepto recibir correos de Revista Aliax y el <a href="/privacidad">Aviso de Privacidad</a>.</span>
    </label>
    <button type="submit" style="padding:12px 28px;border-radius:14px;background:linear-gradient(135deg,#2dd4bf,#0d9488);color:#04201c;font-size:14px;font-weight:700;border:none;cursor:pointer">Suscribirme</button>
    <p id="ra-subscribe-msg" style="font-size:13px;margin:0;min-height:18px"></p>
  </form>
</div>
<script>
(function(){
  var params = new URLSearchParams(location.search);
  var state = params.get('newsletter');
  var msgEl = document.getElementById('ra-subscribe-msg');
  if (state === 'confirmado' && msgEl) { msgEl.style.color = '#0d9488'; msgEl.textContent = '¡Listo! Ya estás suscrito.'; }
  if (state === 'baja' && msgEl) { msgEl.style.color = '#5b5b66'; msgEl.textContent = 'Te diste de baja correctamente.'; }
  if (state === 'invalido' && msgEl) { msgEl.style.color = '#dc2626'; msgEl.textContent = 'Ese enlace ya no es válido.'; }
  // Limpia el parametro de la URL para que un reload o un link compartido no repita el mensaje.
  if (state) { history.replaceState(null, '', location.pathname); }

  // Origen del suscriptor: utm_source / utm_campaign del enlace; si no hay, el sitio desde donde llego.
  // Se guarda en el navegador para que no se pierda al pasar de /revista a un articulo.
  var ORIGIN_KEY = 'ra_origin';
  function cleanTag(v){ return String(v || '').toLowerCase().replace(/\\s+/g, '-').replace(/[^a-z0-9._:-]/g, '').slice(0, 40); }
  function readOrigin(){ try { return JSON.parse(localStorage.getItem(ORIGIN_KEY) || 'null'); } catch (e) { return null; } }
  function saveOrigin(o){ try { localStorage.setItem(ORIGIN_KEY, JSON.stringify(o)); } catch (e) {} }
  var utmSource = cleanTag(params.get('utm_source'));
  if (utmSource) {
    saveOrigin({ source: utmSource, campaign: cleanTag(params.get('utm_campaign')) });
  } else if (!readOrigin() && document.referrer) {
    var refHost = '';
    try { refHost = new URL(document.referrer).hostname.replace(/^www\\./, ''); } catch (e) {}
    if (refHost && refHost.indexOf('aliax.io') === -1) {
      var known = [['instagram', 'instagram'], ['facebook', 'facebook'], ['fb.com', 'facebook'], ['tiktok', 'tiktok'], ['google', 'google'], ['linkedin', 'linkedin'], ['t.co', 'x'], ['twitter', 'x']];
      var mapped = cleanTag(refHost);
      for (var i = 0; i < known.length; i++) { if (refHost.indexOf(known[i][0]) !== -1) { mapped = known[i][1]; break; } }
      saveOrigin({ source: mapped, campaign: '' });
    }
  }

  var form = document.getElementById('ra-subscribe-form');
  if (!form) return;
  form.addEventListener('submit', function(e){
    e.preventDefault();
    var fullName = document.getElementById('ra-subscribe-fullname').value;
    var email = document.getElementById('ra-subscribe-email').value;
    var audience = document.querySelector('input[name="ra-audience"]:checked').value;
    var btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Enviando...';
    fetch('${API_URL}/newsletter/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName: fullName, email: email, audience: audience, source: (readOrigin() || {}).source || 'directo', campaign: (readOrigin() || {}).campaign || '', landingPage: location.pathname })
    }).then(function(r){ return r.json(); }).then(function(data){
      btn.disabled = false;
      btn.textContent = 'Suscribirme';
      if (data.ok) {
        msgEl.style.color = '#0d9488';
        msgEl.textContent = 'Revisa tu correo para confirmar tu suscripción.';
        form.reset();
      } else {
        msgEl.style.color = '#dc2626';
        msgEl.textContent = data.error || 'Algo salió mal, intenta de nuevo.';
      }
    }).catch(function(){
      btn.disabled = false;
      btn.textContent = 'Suscribirme';
      msgEl.style.color = '#dc2626';
      msgEl.textContent = 'Algo salió mal, intenta de nuevo.';
    });
  });
})();
</script>`;
}

function renderPatientCTA(): string {
  return `<div style="background:linear-gradient(135deg,rgba(45,212,191,0.08),rgba(13,148,136,0.04));border-radius:20px;padding:32px;text-align:center;margin:40px 0">
  <h3 style="font-size:20px;margin:0 0 8px">¿Quieres hablar con un profesional?</h3>
  <p style="font-size:16px;font-weight:500;color:#3f3f46;margin:0 0 20px">Explora psicologos verificados en Aliax y agenda tu primera sesion.</p>
  <a href="/explorar" style="display:inline-block;padding:12px 28px;border-radius:14px;background:linear-gradient(135deg,#2dd4bf,#0d9488);color:#04201c;font-size:14px;font-weight:700;box-shadow:0 6px 18px rgba(13,148,136,0.3)">Explorar terapeutas</a>
</div>`;
}

function renderBlock(block: ArticleBlock): string {
  if (block.type === 'TEXT') {
    return `<p style="margin:0 0 24px;font-family:'DM Sans',sans-serif;font-weight:400;font-size:17px;line-height:1.75;color:#3f3f46">${escapeHtml(block.text ?? '')}</p>`;
  }
  if (block.type === 'IMAGE') {
    if (!safeImgSrc(block.imageUrl)) return '';
    return `<img src="${escapeHtml(safeImgSrc(block.imageUrl))}" alt="${escapeHtml(block.imageAlt ?? '')}" style="width:100%;border-radius:20px;margin:24px 0">`;
  }
  if (block.type === 'BUTTON') {
    return `<div style="text-align:center;margin:32px 0"><a href="${escapeHtml(safeHttpUrl(block.buttonUrl))}" style="display:inline-block;padding:12px 28px;border-radius:14px;background:linear-gradient(135deg,#2dd4bf,#0d9488);color:#04201c;font-size:14px;font-weight:700">${escapeHtml(block.buttonLabel ?? '')}</a></div>`;
  }
  if (block.type === 'SUBTITLE') {
    return `<h3 style="font-size:26px;margin:40px 0 16px">${escapeHtml(block.text ?? '')}</h3>`;
  }
  if (block.type === 'BULLET_LIST') {
    const items = (block.text ?? '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => `<li>${escapeHtml(line)}</li>`)
      .join('\n');
    if (!items) return '';
    return `<ul class="ra-bullets" style="margin:0 0 24px;padding-left:20px">${items}</ul>`;
  }
  throw new Error(`[Revista] Tipo de bloque desconocido: ${(block as ArticleBlock).type}`);
}

function renderArticleCard(a: Article): string {
  return `<div data-audience="${a.category.audience}" data-category="${a.category.slug}" class="ra-card" style="border-radius:20px;overflow:hidden;background:#fff;box-shadow:0 10px 30px rgba(8,4,20,0.10)">
  <a href="/revista/${a.slug}">
    ${safeImgSrc(a.coverImage) ? `<img src="${escapeHtml(safeImgSrc(a.coverImage))}" alt="" style="width:100%;height:160px;object-fit:cover;display:block">` : `<div style="height:160px;background:linear-gradient(135deg,rgba(45,212,191,0.25),rgba(13,148,136,0.12))"></div>`}
  </a>
  <div style="padding:22px">
    <span style="display:inline-block;padding:4px 10px;border-radius:999px;background:#2dd4bf;color:#04201c;font-size:10px;font-weight:700;text-transform:uppercase">${escapeHtml(a.category.name)}</span>
    <h4 style="font-size:16px;color:#080414;margin:10px 0 8px"><a href="/revista/${a.slug}" style="color:#080414">${escapeHtml(a.title)}</a></h4>
    <p style="font-family:'DM Sans',sans-serif;font-weight:400;font-size:14px;line-height:1.55;color:#45454f;margin:0 0 12px">${escapeHtml(a.excerpt)}</p>
    ${renderByline(a)}
    <a href="/revista/${a.slug}" style="color:#0d9488;font-size:13px;font-weight:700;margin-top:14px;display:inline-block">Leer artículo completo →</a>
  </div>
</div>`;
}

function renderRelatedCard(a: Article): string {
  return `<a href="/revista/${a.slug}" class="ra-card" style="display:block;border-radius:16px;overflow:hidden;background:#fff;box-shadow:0 4px 14px rgba(8,4,20,0.06)">
  ${safeImgSrc(a.coverImage) ? `<img src="${escapeHtml(safeImgSrc(a.coverImage))}" alt="" style="width:100%;height:120px;object-fit:cover;display:block">` : `<div style="height:120px;background:linear-gradient(135deg,rgba(45,212,191,0.25),rgba(13,148,136,0.12))"></div>`}
  <div style="padding:16px">
    <h5 style="font-size:14px;color:#080414;margin:0">${escapeHtml(a.title)}</h5>
  </div>
</a>`;
}

function renderRelatedSection(related: Article[]): string {
  if (related.length === 0) return '';
  return `<div style="margin-top:56px">
  <h4 style="font-size:20px;margin-bottom:20px">Tambien te puede interesar</h4>
  <div class="ra-grid3">${related.map(renderRelatedCard).join('\n')}</div>
</div>`;
}

// Plain client-side filtering: every card and the hero carry data-audience/data-category
// attributes, and this script just toggles their display. No build step, no client
// framework -- consistent with the rest of this page being plain static HTML.
function renderPillsScript(): string {
  return `<script>
(function(){
  var audienceBtns = document.querySelectorAll('[data-filter-audience]');
  var categoryRow = document.getElementById('ra-category-row');
  var categoryBtns = categoryRow ? categoryRow.querySelectorAll('[data-filter-category]') : [];
  var items = document.querySelectorAll('[data-audience]');
  var activeAudience = 'ALL';
  var activeCategory = 'ALL';

  function applyFilter(){
    items.forEach(function(el){
      var matchAudience = activeAudience === 'ALL' || el.getAttribute('data-audience') === activeAudience;
      var matchCategory = activeCategory === 'ALL' || el.getAttribute('data-category') === activeCategory;
      el.style.display = (matchAudience && matchCategory) ? '' : 'none';
    });
  }

  function updateCategoryRow(){
    if (!categoryRow) return;
    if (activeAudience === 'ALL') {
      categoryRow.style.display = 'none';
    } else {
      categoryRow.style.display = 'flex';
      categoryBtns.forEach(function(b){
        b.style.display = (b.getAttribute('data-category-audience') === activeAudience) ? '' : 'none';
      });
    }
  }

  audienceBtns.forEach(function(btn){
    btn.addEventListener('click', function(){
      activeAudience = btn.getAttribute('data-filter-audience');
      activeCategory = 'ALL';
      audienceBtns.forEach(function(b){ b.classList.toggle('ra-pill-active', b === btn); });
      categoryBtns.forEach(function(b){ b.classList.remove('ra-cat-active'); });
      updateCategoryRow();
      applyFilter();
    });
  });

  categoryBtns.forEach(function(btn){
    btn.addEventListener('click', function(){
      activeCategory = btn.getAttribute('data-filter-category');
      categoryBtns.forEach(function(b){ b.classList.toggle('ra-cat-active', b === btn); });
      applyFilter();
    });
  });
})();
</script>`;
}

function generateListingPage(articles: Article[]): string {
  const hero = selectFeatured(articles);
  const rest = hero ? articles.filter((a) => a.id !== hero.id) : articles;
  const categories = collectCategories(articles);

  const heroHtml = hero ? `<div id="ra-hero" class="ra-hero-grid ra-card" data-audience="${hero.category.audience}" data-category="${hero.category.slug}" style="border-radius:20px;overflow:hidden;background:#fff;box-shadow:0 10px 30px rgba(8,4,20,0.10);margin-bottom:56px">
  <a href="/revista/${hero.slug}">
    ${safeImgSrc(hero.coverImage) ? `<img src="${escapeHtml(safeImgSrc(hero.coverImage))}" alt="" style="width:100%;height:100%;object-fit:cover;display:block">` : `<div style="min-height:320px;background:linear-gradient(135deg,rgba(45,212,191,0.25),rgba(13,148,136,0.12))"></div>`}
  </a>
  <div style="padding:40px;display:flex;flex-direction:column;justify-content:center">
    <span style="display:inline-block;padding:4px 10px;border-radius:999px;background:#2dd4bf;color:#04201c;font-size:10px;font-weight:700;text-transform:uppercase;width:fit-content">${escapeHtml(hero.category.name)}</span>
    <h2 style="font-size:28px;margin:14px 0 10px"><a href="/revista/${hero.slug}" style="color:#080414">${escapeHtml(hero.title)}</a></h2>
    <p style="font-family:'DM Sans',sans-serif;font-weight:400;font-size:15px;line-height:1.6;color:#45454f;margin:0 0 20px">${escapeHtml(hero.excerpt)}</p>
    ${renderByline(hero)}
    <a href="/revista/${hero.slug}" style="color:#0d9488;font-size:13px;font-weight:700;margin-top:16px;display:inline-block">Leer artículo completo →</a>
  </div>
</div>` : '';

  const pills = `<div style="display:flex;gap:10px;justify-content:center;margin-bottom:16px;flex-wrap:wrap">
  <button class="ra-pill ra-pill-active" data-filter-audience="ALL">Todos</button>
  <button class="ra-pill" data-filter-audience="PACIENTES">Para pacientes</button>
  <button class="ra-pill" data-filter-audience="TERAPEUTAS">Para terapeutas</button>
</div>
<div id="ra-category-row" style="display:none;gap:8px;justify-content:center;margin-bottom:40px;flex-wrap:wrap">
  ${categories.map((c) => `<button class="ra-cat" data-filter-category="${c.slug}" data-category-audience="${c.audience}">${escapeHtml(c.name)}</button>`).join('\n')}
</div>`;

  const cards = rest.map(renderArticleCard).join('\n');
  const body = `${renderNav()}
<div style="max-width:1200px;margin:0 auto;padding:64px 24px">
  <h1 style="font-size:48px;text-align:center;margin:0 0 2px">Revista Aliax</h1>
  <p style="text-align:center;font-size:26px;font-weight:700;letter-spacing:0.01em;margin:0 0 32px"><span style="display:inline-block;color:#0d9488;background:linear-gradient(90deg,#0d9488,#7c3aed);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent">Ideas y recursos para cuidar tu bienestar</span></p>
  ${pills}
  ${heroHtml}
  <h3 style="font-size:24px;margin-bottom:24px">Ultimos articulos</h3>
  <div class="ra-grid3">${cards}</div>
  ${renderShareBar(`${SITE_URL}/revista#suscribirse`, 'Revista Aliax', 'Revista Aliax: artículos para terapeutas y pacientes. Suscríbete y recibe uno nuevo cada quincena.', 'Comparte la Revista', 'inline', true)}
  ${renderSubscribeBand()}
</div>
${renderPillsScript()}
${renderShareScript()}`;
  return pageShell(
    'Revista Aliax — Ideas y recursos para tu bienestar',
    'Articulos escritos por psicologos de Aliax, para pacientes y terapeutas.',
    `${SITE_URL}/revista`,
    `${SITE_URL}/og-revista-3.png`,
    body
  );
}

function generateArticlePage(a: Article, allArticles: Article[]): string {
  const renderedBlocks = a.blocks.map(renderBlock);
  // El bloque invita a buscar psicologo: solo tiene sentido en articulos para pacientes
  if (a.category.audience === 'PACIENTES') {
    renderedBlocks.splice(Math.floor(a.blocks.length / 2), 0, renderPatientCTA());
  }
  const blocksHtml = renderedBlocks.join('\n');
  const related = relatedArticles(allArticles, a);

  const body = `${renderNav()}
<div style="max-width:680px;margin:0 auto;padding:64px 24px">
  <a href="/revista" style="font-size:13px;color:#0d9488">← Revista Aliax</a>
  <span style="display:inline-block;margin-left:12px;padding:5px 12px;border-radius:999px;background:#2dd4bf;color:#04201c;font-size:11px;font-weight:700;text-transform:uppercase">${escapeHtml(a.category.name)}</span>
  <h1 style="font-size:40px;line-height:1.1;margin:18px 0 16px">${escapeHtml(a.title)}</h1>
  ${renderByline(a)}
  ${renderShareBar(`${SITE_URL}/revista/${a.slug}`, a.title, a.title, 'Compartir:', 'top')}
  ${renderShareBar(`${SITE_URL}/revista/${a.slug}`, a.title, a.title, '', 'side')}
  ${safeImgSrc(a.coverImage) ? `<img src="${escapeHtml(safeImgSrc(a.coverImage))}" alt="" style="width:100%;border-radius:24px;margin:24px 0 32px">` : ''}
  ${blocksHtml}
  ${renderShareBar(`${SITE_URL}/revista/${a.slug}`, a.title, a.title, '¿Te sirvió? Compártelo:')}
  ${renderRelatedSection(related)}
  ${renderSubscribeBand()}
</div>
${renderShareScript()}`;
  return pageShell(
    `${a.title} — Revista Aliax`,
    a.metaDescription || a.excerpt,
    `${SITE_URL}/revista/${a.slug}`,
    safeImgSrc(a.coverImage) || `${SITE_URL}/og-image.png`,
    body
  );
}

function generateSitemap(articles: Article[]): string {
  // This list is hand-maintained, separate from frontend/src/App.tsx's <Route> list --
  // if a route is added/renamed/removed in App.tsx, it MUST be updated here too, or the
  // sitemap silently drifts (exact failure mode already hit once on a WordPress->React
  // migration for a different Aliax-family project: a hardcoded route list went stale
  // and nobody noticed for weeks). Verified against App.tsx on 2026-10-29: real path is
  // /pricing, not /precios -- this list previously had the wrong one.
  const staticRoutes = ['', '/explorar', '/pricing', '/revista', '/para-psicologos', '/busco-terapia'];
  const articleRoutes = articles.map((a) => `/revista/${a.slug}`);
  const urls = [...staticRoutes, ...articleRoutes]
    .map((path) => `  <url><loc>${SITE_URL}${path}</loc></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

async function main() {
  const res = await fetch(`${API_URL}/articles/public`);
  if (!res.ok) throw new Error(`No se pudo obtener /articles/public: ${res.status}`);
  const articles = ((await res.json()) as Article[]).filter((a) => a.category);

  const revistaDir = join(PUBLIC_DIR, 'revista');
  if (!existsSync(revistaDir)) mkdirSync(revistaDir, { recursive: true });

  writeFileSync(join(revistaDir, 'index.html'), generateListingPage(articles));
  for (const article of articles) {
    writeFileSync(join(revistaDir, `${article.slug}.html`), generateArticlePage(article, articles));
  }
  writeFileSync(join(PUBLIC_DIR, 'sitemap.xml'), generateSitemap(articles));
  writeFileSync(join(PUBLIC_DIR, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);

  console.log(`[Revista] Generados: ${articles.length} articulos, index, sitemap.xml, robots.txt`);
}

main().catch((err) => { console.error(err); process.exit(1); });
