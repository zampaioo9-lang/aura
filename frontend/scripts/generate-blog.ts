import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const API_URL = process.env.VITE_API_URL || 'https://api.aliax.io/api';
const SITE_URL = 'https://www.aliax.io';
const PUBLIC_DIR = join(__dirname, '..', 'public');

interface Category {
  id: string; name: string; slug: string; audience: 'PACIENTES' | 'TERAPEUTAS';
}
interface ArticleBlock {
  type: 'TEXT' | 'IMAGE' | 'BUTTON';
  text: string | null; imageUrl: string | null; imageAlt: string | null;
  buttonLabel: string | null; buttonUrl: string | null;
}
interface Article {
  id: string; slug: string; title: string; excerpt: string;
  coverImage: string | null; featured: boolean; publishedAt: string | null;
  category: Category; blocks: ArticleBlock[];
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
<meta property="og:image" content="${ogImage}">
<meta property="og:url" content="${canonical}">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Urbanist:wght@300;400;500;600;700;800&display=swap">
<style>
body{margin:0;background:#080414;font-family:'Urbanist',sans-serif;color:rgb(205,192,224)}
a{color:#2dd4bf;text-decoration:none}
h1,h2,h3{font-family:'Bebas Neue',sans-serif;color:#fff}
.ra-grid3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px}
@media (max-width:860px){.ra-grid3{grid-template-columns:1fr}}
</style>
</head>
<body>
${body}
</body>
</html>`;
}

function renderNav(): string {
  return `<div style="display:flex;align-items:center;justify-content:space-between;padding:24px 64px;border-bottom:1px solid rgba(255,255,255,0.06)">
  <a href="/" style="display:flex;align-items:center;gap:12px">
    <div style="width:40px;height:40px;border-radius:50%;border:1.5px solid rgba(45,212,191,0.5);display:flex;align-items:center;justify-content:center;font-family:'Bebas Neue',sans-serif;font-size:18px;color:#2dd4bf">A</div>
    <div>
      <div style="font-family:'Bebas Neue',sans-serif;font-size:18px;color:#fff;line-height:1">ALIAX</div>
      <div style="font-size:10px;letter-spacing:0.15em;color:rgba(255,255,255,0.45);text-transform:uppercase">Salud Mental</div>
    </div>
  </a>
</div>`;
}

function renderBlock(block: ArticleBlock): string {
  if (block.type === 'TEXT') {
    return `<p style="margin:0 0 24px;font-size:17px;line-height:1.75;color:rgba(255,255,255,0.75)">${escapeHtml(block.text ?? '')}</p>`;
  }
  if (block.type === 'IMAGE') {
    return `<img src="${block.imageUrl}" alt="${escapeHtml(block.imageAlt ?? '')}" style="width:100%;border-radius:20px;margin:24px 0">`;
  }
  return `<div style="text-align:center;margin:32px 0"><a href="${block.buttonUrl}" style="display:inline-block;padding:12px 28px;border-radius:14px;background:linear-gradient(135deg,#2dd4bf,#0d9488);color:#04201c;font-size:14px;font-weight:700">${escapeHtml(block.buttonLabel ?? '')}</a></div>`;
}

function renderArticleCard(a: Article): string {
  return `<div style="border-radius:20px;overflow:hidden;background:#0e0920;box-shadow:0 10px 30px rgba(0,0,0,0.25)">
  <a href="/revista/${a.slug}">
    ${a.coverImage ? `<img src="${a.coverImage}" alt="" style="width:100%;height:160px;object-fit:cover;display:block">` : `<div style="height:160px;background:linear-gradient(135deg,#160d30,#1e1240)"></div>`}
  </a>
  <div style="padding:22px">
    <span style="display:inline-block;padding:4px 10px;border-radius:999px;background:rgba(45,212,191,0.12);color:#2dd4bf;font-size:10px;font-weight:700;text-transform:uppercase">${escapeHtml(a.category.name)}</span>
    <h4 style="font-size:16px;color:#fff;margin:10px 0 8px"><a href="/revista/${a.slug}" style="color:#fff">${escapeHtml(a.title)}</a></h4>
    <p style="font-size:13px;line-height:1.55;color:rgba(255,255,255,0.55)">${escapeHtml(a.excerpt)}</p>
  </div>
</div>`;
}

function generateListingPage(articles: Article[]): string {
  const cards = articles.map(renderArticleCard).join('\n');
  const body = `${renderNav()}
<div style="max-width:1200px;margin:0 auto;padding:64px 24px">
  <h1 style="font-size:48px;text-align:center;margin-bottom:40px">Revista Aliax</h1>
  <div class="ra-grid3">${cards}</div>
</div>`;
  return pageShell(
    'Revista Aliax — Ideas y recursos para tu bienestar',
    'Articulos escritos por psicologos de Aliax, para pacientes y terapeutas.',
    `${SITE_URL}/revista`,
    `${SITE_URL}/og-image.png`,
    body
  );
}

function generateArticlePage(a: Article): string {
  const blocksHtml = a.blocks.map(renderBlock).join('\n');
  const body = `${renderNav()}
<div style="max-width:680px;margin:0 auto;padding:64px 24px">
  <span style="display:inline-block;padding:5px 12px;border-radius:999px;background:rgba(45,212,191,0.12);color:#2dd4bf;font-size:11px;font-weight:700;text-transform:uppercase;margin-bottom:18px">${escapeHtml(a.category.name)}</span>
  <h1 style="font-size:40px;line-height:1.1;margin:0 0 24px">${escapeHtml(a.title)}</h1>
  ${a.coverImage ? `<img src="${a.coverImage}" alt="" style="width:100%;border-radius:24px;margin-bottom:32px">` : ''}
  ${blocksHtml}
</div>`;
  return pageShell(
    `${a.title} — Revista Aliax`,
    a.excerpt,
    `${SITE_URL}/revista/${a.slug}`,
    a.coverImage || `${SITE_URL}/og-image.png`,
    body
  );
}

function generateSitemap(articles: Article[]): string {
  const staticRoutes = ['', '/explorar', '/precios', '/revista'];
  const articleRoutes = articles.map(a => `/revista/${a.slug}`);
  const urls = [...staticRoutes, ...articleRoutes]
    .map(path => `  <url><loc>${SITE_URL}${path}</loc></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

async function main() {
  const res = await fetch(`${API_URL}/articles/public`);
  if (!res.ok) throw new Error(`No se pudo obtener /articles/public: ${res.status}`);
  const articles: Article[] = await res.json();

  const revistaDir = join(PUBLIC_DIR, 'revista');
  if (!existsSync(revistaDir)) mkdirSync(revistaDir, { recursive: true });

  writeFileSync(join(revistaDir, 'index.html'), generateListingPage(articles));
  for (const article of articles) {
    writeFileSync(join(revistaDir, `${article.slug}.html`), generateArticlePage(article));
  }
  writeFileSync(join(PUBLIC_DIR, 'sitemap.xml'), generateSitemap(articles));
  writeFileSync(join(PUBLIC_DIR, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);

  console.log(`[Revista] Generados: ${articles.length} articulos, index, sitemap.xml, robots.txt`);
}

main().catch((err) => { console.error(err); process.exit(1); });
