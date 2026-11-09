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
  author: string | null; coverImage: string | null; featured: boolean; publishedAt: string | null;
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
.ra-bullets li{font-family:'DM Sans',sans-serif;font-weight:400;font-size:17px;line-height:1.75;color:#3f3f46;margin-bottom:8px}
.ra-bullets li::marker{color:#0d9488}
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
  return `<div style="display:flex;align-items:center;gap:8px;font-size:12px;color:#5b5b66">
  <span style="width:28px;height:28px;border-radius:50%;background:#2dd4bf;color:#04201c;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">${escapeHtml(initials(name))}</span>
  <span>${escapeHtml(name)} · ${formatDate(a.publishedAt)} · ${minutes} min de lectura</span>
</div>`;
}

function renderSubscribeBand(): string {
  return `<div style="background:#fff;border-radius:20px;padding:40px;text-align:center;margin:56px 0 0;box-shadow:0 10px 30px rgba(8,4,20,0.10)">
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
      body: JSON.stringify({ fullName: fullName, email: email, audience: audience })
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

function renderTherapistCTA(): string {
  return `<div style="background:linear-gradient(135deg,rgba(45,212,191,0.08),rgba(13,148,136,0.04));border-radius:20px;padding:32px;text-align:center;margin:40px 0">
  <h3 style="font-size:20px;margin:0 0 8px">¿Quieres hablar con alguien?</h3>
  <p style="font-size:14px;color:#4b4b55;margin:0 0 20px">Explora psicologos verificados en Aliax y agenda tu primera sesion.</p>
  <a href="/explorar" style="display:inline-block;padding:12px 28px;border-radius:14px;background:linear-gradient(135deg,#2dd4bf,#0d9488);color:#04201c;font-size:14px;font-weight:700">Explorar terapeutas</a>
</div>`;
}

function renderBlock(block: ArticleBlock): string {
  if (block.type === 'TEXT') {
    return `<p style="margin:0 0 24px;font-family:'DM Sans',sans-serif;font-weight:400;font-size:17px;line-height:1.75;color:#3f3f46">${escapeHtml(block.text ?? '')}</p>`;
  }
  if (block.type === 'IMAGE') {
    if (!block.imageUrl) return '';
    return `<img src="${escapeHtml(block.imageUrl)}" alt="${escapeHtml(block.imageAlt ?? '')}" style="width:100%;border-radius:20px;margin:24px 0">`;
  }
  if (block.type === 'BUTTON') {
    return `<div style="text-align:center;margin:32px 0"><a href="${escapeHtml(block.buttonUrl ?? '')}" style="display:inline-block;padding:12px 28px;border-radius:14px;background:linear-gradient(135deg,#2dd4bf,#0d9488);color:#04201c;font-size:14px;font-weight:700">${escapeHtml(block.buttonLabel ?? '')}</a></div>`;
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
    ${a.coverImage ? `<img src="${escapeHtml(a.coverImage)}" alt="" style="width:100%;height:160px;object-fit:cover;display:block">` : `<div style="height:160px;background:linear-gradient(135deg,rgba(45,212,191,0.25),rgba(13,148,136,0.12))"></div>`}
  </a>
  <div style="padding:22px">
    <span style="display:inline-block;padding:4px 10px;border-radius:999px;background:#2dd4bf;color:#04201c;font-size:10px;font-weight:700;text-transform:uppercase">${escapeHtml(a.category.name)}</span>
    <h4 style="font-size:16px;color:#080414;margin:10px 0 8px"><a href="/revista/${a.slug}" style="color:#080414">${escapeHtml(a.title)}</a></h4>
    <p style="font-family:'DM Sans',sans-serif;font-weight:400;font-size:14px;line-height:1.55;color:#45454f;margin:0 0 12px">${escapeHtml(a.excerpt)}</p>
    ${renderByline(a)}
  </div>
</div>`;
}

function renderRelatedCard(a: Article): string {
  return `<a href="/revista/${a.slug}" class="ra-card" style="display:block;border-radius:16px;overflow:hidden;background:#fff;box-shadow:0 4px 14px rgba(8,4,20,0.06)">
  ${a.coverImage ? `<img src="${escapeHtml(a.coverImage)}" alt="" style="width:100%;height:120px;object-fit:cover;display:block">` : `<div style="height:120px;background:linear-gradient(135deg,rgba(45,212,191,0.25),rgba(13,148,136,0.12))"></div>`}
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
      categoryBtns.forEach(function(b){ b.classList.remove('ra-pill-active'); });
      updateCategoryRow();
      applyFilter();
    });
  });

  categoryBtns.forEach(function(btn){
    btn.addEventListener('click', function(){
      activeCategory = btn.getAttribute('data-filter-category');
      categoryBtns.forEach(function(b){ b.classList.toggle('ra-pill-active', b === btn); });
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
    ${hero.coverImage ? `<img src="${escapeHtml(hero.coverImage)}" alt="" style="width:100%;height:100%;object-fit:cover;display:block">` : `<div style="min-height:320px;background:linear-gradient(135deg,rgba(45,212,191,0.25),rgba(13,148,136,0.12))"></div>`}
  </a>
  <div style="padding:40px;display:flex;flex-direction:column;justify-content:center">
    <span style="display:inline-block;padding:4px 10px;border-radius:999px;background:#2dd4bf;color:#04201c;font-size:10px;font-weight:700;text-transform:uppercase;width:fit-content">${escapeHtml(hero.category.name)}</span>
    <h2 style="font-size:28px;margin:14px 0 10px"><a href="/revista/${hero.slug}" style="color:#080414">${escapeHtml(hero.title)}</a></h2>
    <p style="font-family:'DM Sans',sans-serif;font-weight:400;font-size:15px;line-height:1.6;color:#45454f;margin:0 0 20px">${escapeHtml(hero.excerpt)}</p>
    ${renderByline(hero)}
    <a href="/revista/${hero.slug}" style="color:#0d9488;font-size:13px;font-weight:700;margin-top:16px;display:inline-block">Leer articulo completo →</a>
  </div>
</div>` : '';

  const pills = `<div style="display:flex;gap:10px;justify-content:center;margin-bottom:16px;flex-wrap:wrap">
  <button class="ra-pill ra-pill-active" data-filter-audience="ALL">Todos</button>
  <button class="ra-pill" data-filter-audience="PACIENTES">Para pacientes</button>
  <button class="ra-pill" data-filter-audience="TERAPEUTAS">Para terapeutas</button>
</div>
<div id="ra-category-row" style="display:none;gap:10px;justify-content:center;margin-bottom:40px;flex-wrap:wrap">
  ${categories.map((c) => `<button class="ra-pill" data-filter-category="${c.slug}" data-category-audience="${c.audience}">${escapeHtml(c.name)}</button>`).join('\n')}
</div>`;

  const cards = rest.map(renderArticleCard).join('\n');
  const body = `${renderNav()}
<div style="max-width:1200px;margin:0 auto;padding:64px 24px">
  <h1 style="font-size:48px;text-align:center;margin-bottom:8px">Revista Aliax</h1>
  <p style="text-align:center;font-size:19px;color:#55555f;margin-bottom:32px">Ideas y recursos para cuidar tu bienestar</p>
  ${pills}
  ${heroHtml}
  <h3 style="font-size:24px;margin-bottom:24px">Ultimos articulos</h3>
  <div class="ra-grid3">${cards}</div>
  ${renderSubscribeBand()}
</div>
${renderPillsScript()}`;
  return pageShell(
    'Revista Aliax — Ideas y recursos para tu bienestar',
    'Articulos escritos por psicologos de Aliax, para pacientes y terapeutas.',
    `${SITE_URL}/revista`,
    `${SITE_URL}/og-image.png`,
    body
  );
}

function generateArticlePage(a: Article, allArticles: Article[]): string {
  const renderedBlocks = a.blocks.map(renderBlock);
  renderedBlocks.splice(Math.floor(a.blocks.length / 2), 0, renderTherapistCTA());
  const blocksHtml = renderedBlocks.join('\n');
  const related = relatedArticles(allArticles, a);

  const body = `${renderNav()}
<div style="max-width:680px;margin:0 auto;padding:64px 24px">
  <a href="/revista" style="font-size:13px;color:#0d9488">← Revista Aliax</a>
  <span style="display:inline-block;margin-left:12px;padding:5px 12px;border-radius:999px;background:#2dd4bf;color:#04201c;font-size:11px;font-weight:700;text-transform:uppercase">${escapeHtml(a.category.name)}</span>
  <h1 style="font-size:40px;line-height:1.1;margin:18px 0 16px">${escapeHtml(a.title)}</h1>
  ${renderByline(a)}
  ${a.coverImage ? `<img src="${escapeHtml(a.coverImage)}" alt="" style="width:100%;border-radius:24px;margin:24px 0 32px">` : ''}
  ${blocksHtml}
  ${renderRelatedSection(related)}
  ${renderSubscribeBand()}
</div>`;
  return pageShell(
    `${a.title} — Revista Aliax`,
    a.metaDescription || a.excerpt,
    `${SITE_URL}/revista/${a.slug}`,
    a.coverImage || `${SITE_URL}/og-image.png`,
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
  const staticRoutes = ['', '/explorar', '/pricing', '/revista'];
  const articleRoutes = articles.map((a) => `/revista/${a.slug}`);
  const urls = [...staticRoutes, ...articleRoutes]
    .map((path) => `  <url><loc>${SITE_URL}${path}</loc></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

async function main() {
  const res = await fetch(`${API_URL}/articles/public`);
  if (!res.ok) throw new Error(`No se pudo obtener /articles/public: ${res.status}`);
  const articles = (await res.json()) as Article[];

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
