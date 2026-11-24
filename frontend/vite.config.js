import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';

const root = resolve(import.meta.dirname);
const partialsDir = join(root, 'src/partials');
const partial = (name) => readFileSync(join(partialsDir, `${name}.html`), 'utf8');

/* Every .html page in the project root (and its sub-folders) is a build entry. */
function collectPages(dir, out = {}) {
  for (const name of readdirSync(dir)) {
    if (['node_modules', 'dist', 'public', 'src', 'mock', 'scripts'].includes(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) collectPages(full, out);
    else if (name.endsWith('.html')) out[relative(root, full).replace(/\\/g, '/').replace(/\.html$/, '')] = full;
  }
  return out;
}

/* <!-- @include header --> → contents of src/partials/header.html */
function htmlPartials() {
  return {
    name: 'medlink-html-partials',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        return html.replace(/<!--\s*@include\s+([\w-]+)\s*-->/g, (_, name) => partial(name));
      },
    },
    handleHotUpdate({ file, server }) {
      if (file.startsWith(partialsDir)) server.ws.send({ type: 'full-reload' });
    },
  };
}

/* Link previews (WhatsApp, Facebook, LinkedIn, X, Slack…): Open Graph + Twitter tags on every page, built from the
   page's own <title> and description. Cards come from public/og (regenerate with `npm run build:og`).
   Set VITE_SITE_URL if the site is served from another domain. */
const SITE_URL = (process.env.VITE_SITE_URL || 'https://medlink-dz.vercel.app').replace(/\/$/, '');
const DEFAULT_DESCRIPTION = "Trouvez ou offrez gratuitement des médicaments non utilisés près de chez vous, dans les 69 wilayas d'Algérie.";
const OG_IMAGES = { '/search': 'search', '/annonce': 'annonce', '/faq': 'faq' }; // every other page uses "default"
const OG_ALT = { default: 'MedLink DZ : un médicament inutilisé ici, un traitement ailleurs', search: 'MedLink DZ : trouvez un médicament près de chez vous', annonce: 'MedLink DZ : une annonce solidaire', faq: 'MedLink DZ : questions fréquentes' };
const escAttr = (v) => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function socialMeta() {
  return {
    name: 'medlink-social-meta',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const path = ((ctx.path || '/').replace(/\/index\.html$/, '/').replace(/\.html$/, '')).replace(/(.)\/$/, '$1') || '/';
        const title = (html.match(/<title>([^<]*)<\/title>/)?.[1] || 'MedLink DZ').trim();
        const existing = html.match(/<meta name="description" content="([^"]*)"/)?.[1];
        const description = existing || DEFAULT_DESCRIPTION;
        const card = OG_IMAGES[path] || 'default';
        const image = `${SITE_URL}/og/${card}.jpg`;
        const tags = [
          existing ? '' : `<meta name="description" content="${escAttr(description)}" />`,
          `<meta property="og:type" content="website" />`,
          `<meta property="og:site_name" content="MedLink DZ" />`,
          `<meta property="og:locale" content="fr_FR" />`,
          `<meta property="og:title" content="${title}" />`,
          `<meta property="og:description" content="${description}" />`,
          `<meta property="og:url" content="${SITE_URL}${path === '/' ? '/' : path}" />`,
          `<meta property="og:image" content="${image}" />`,
          `<meta property="og:image:type" content="image/jpeg" />`,
          `<meta property="og:image:width" content="1200" />`,
          `<meta property="og:image:height" content="630" />`,
          `<meta property="og:image:alt" content="${escAttr(OG_ALT[card])}" />`,
          `<meta name="twitter:card" content="summary_large_image" />`,
          `<meta name="twitter:title" content="${title}" />`,
          `<meta name="twitter:description" content="${description}" />`,
          `<meta name="twitter:image" content="${image}" />`,
          `<meta name="twitter:image:alt" content="${escAttr(OG_ALT[card])}" />`,
        ].filter(Boolean).join('\n  ');
        return html.replace('</head>', `  ${tags}\n</head>`);
      },
    },
  };
}

/* Demo / portfolio mode only: label every page as a demo, before first paint (no layout jump).
   - "Projet de démonstration" bar at the top of the fixed header (or of the page when there is no header)
   - a line in the footer
   - noindex, so search engines never send a real patient to fictional listings */
function demoLabel() {
  const footerNote = `<p class="text-white/45" data-demo-footer>Projet de démonstration réalisé pour un portfolio : annonces, comptes et numéros sont fictifs. Pour toute question de santé, adressez-vous à un médecin ou à un pharmacien.</p>`;
  return {
    name: 'medlink-demo-label',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const strip = partial('demo-strip');
        html = html
          .replace('<html lang="fr">', '<html lang="fr" class="demo-on">')
          .replace(/<meta name="robots"[^>]*>\s*/g, '')
          .replace('</title>', `</title>
  <meta name="robots" content="noindex, nofollow" />
  <script>try{if(sessionStorage.getItem('medlink_demo_strip')==='off')document.documentElement.classList.add('demo-strip-off')}catch(e){}</script>`);
        html = html.includes('data-site-header>')
          ? html.replace(/(<header[^>]*data-site-header>)/, `$1\n${strip}`)
          : html.replace(/(<body[^>]*>)/, `$1\n${strip}`);
        return html.replace('<!-- 3. Bottom bar -->', `<div class="border-t border-white/10 py-5 text-[13px] leading-relaxed">${footerNote}</div>\n    <!-- 3. Bottom bar -->`);
      },
    },
  };
}

/* Clean URLs, same rules as vercel.json:
   /login → /login.html, /profil → /profil/index.html, /annonce/42 → /annonce.html */
function cleanUrls() {
  const rewrite = (req, _res, next) => {
    const [path, query = ''] = req.url.split('?');
    const q = query ? `?${query}` : '';
    if (/^\/annonce\/[^/]+\/?$/.test(path)) req.url = `/annonce.html${q}`;
    else if (path !== '/' && !/\.[a-z0-9]+$/i.test(path) && !path.startsWith('/@') && !path.startsWith('/node_modules')) {
      const clean = path.replace(/\/$/, '');
      if (existsSync(join(root, `${clean}.html`))) req.url = `${clean}.html${q}`;
      else if (existsSync(join(root, clean, 'index.html'))) req.url = `${clean}/index.html${q}`;
    }
    next();
  };
  return {
    name: 'medlink-clean-urls',
    configureServer(server) { server.middlewares.use(rewrite); },
    configurePreviewServer(server) { server.middlewares.use(rewrite); },
  };
}

export default defineConfig(({ mode }) => ({
  // Demo / portfolio mode (`npm run dev:mock`, `npm run build:demo`): fictional API in the browser + demo labels.
  plugins: [tailwindcss(), htmlPartials(), socialMeta(), ...(mode === 'mock' ? [demoLabel()] : []), cleanUrls()],
  build: {
    rollupOptions: { input: collectPages(root) },
  },
}));
