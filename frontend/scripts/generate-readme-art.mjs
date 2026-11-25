/* Renders the README images into ../.github/assets/ :
     banner.webp   1760×632   title banner
     stats.webp    1760×399   "en un coup d'œil" strip, numbers counted from the code (pages, endpoints, tables, roles)
     preview.webp  1760×1018  browser + phone mockup, from real screenshots of the demo build
   Needs a demo build first, and Chrome or Edge (already installed on most machines) plus an internet connection for the fonts:
     npm run build:demo && npm run build:readme
   Templates and styles: scripts/readme/ */
import { spawn } from 'node:child_process';
import http from 'node:http';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const dist = join(root, 'dist');
const tplDir = join(root, 'scripts/readme');
const outDir = resolve(root, '..', '.github/assets');

/* ---------- Facts, counted from the code so the numbers can't drift ---------- */
const countIn = (file, re) => (readFileSync(file, 'utf8').match(re) || []).length;
function pagesCount(dir = root) {
  let n = 0;
  for (const name of readdirSync(dir)) {
    if (['node_modules', 'dist', 'public', 'src', 'mock', 'scripts'].includes(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) n += pagesCount(full);
    else if (name.endsWith('.html')) n += 1;
  }
  return n;
}
const routesDir = resolve(root, '../backend/src/routes');
const routeFiles = readdirSync(routesDir).filter((f) => f.endsWith('.js'));
const schema = readFileSync(resolve(root, '../backend/database/schema.sql'), 'utf8');
const DATA = {
  wilayas: countIn(join(root, 'src/js/data/wilayas.js'), /\bid:\s*'/g),
  pages: pagesCount(),
  endpoints: routeFiles.reduce((n, f) => n + countIn(join(routesDir, f), /^router\.(?:get|post|put|patch|delete)\(/gm), 0),
  groups: routeFiles.length,
  tables: countIn(resolve(root, '../backend/database/schema.sql'), /^CREATE TABLE/gm),
  roles: (schema.match(/CREATE TYPE RoleEnum AS ENUM \(([^)]*)\)/)?.[1] || '').split(',').filter(Boolean).length,
};
console.log('facts:', JSON.stringify(DATA));

/* ---------- Static server for the demo build (clean URLs like Vercel) ---------- */
if (!existsSync(join(dist, 'index.html')) || !readFileSync(join(dist, 'index.html'), 'utf8').includes('data-demo-strip')) {
  throw new Error('Run `npm run build:demo` first: the previews are taken from the demo build.');
}
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.avif': 'image/avif' };
const SITE_PORT = 5300 + Math.floor(Math.random() * 300);
const BASE = `http://localhost:${SITE_PORT}`;
const site = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, BASE).pathname);
  if (/^\/annonce\/[^/]+$/.test(p)) p = '/annonce.html';
  const file = [p, `${p}.html`, join(p, 'index.html')].map((t) => join(dist, t)).find((f) => existsSync(f) && statSync(f).isFile());
  if (!file) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((r) => site.listen(SITE_PORT, r));

/* ---------- Chrome ---------- */
const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find(existsSync);
if (!CHROME) throw new Error('Chrome or Edge not found');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PORT = 9600 + Math.floor(Math.random() * 300);
const work = mkdtempSync(join(tmpdir(), 'readme-art-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${join(work, 'profile')}`, '--hide-scrollbars', '--allow-file-access-from-files', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
let ws; let id = 0; const pending = new Map();
for (let i = 0; i < 50 && !ws; i++) {
  try {
    const page = (await fetch(`http://127.0.0.1:${PORT}/json`).then((r) => r.json())).find((t) => t.type === 'page');
    if (page) { ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r)); }
  } catch { /* browser still starting */ }
  if (!ws) await sleep(300);
}
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.result?.value;

/* Screenshot of a page of the demo build, as a visitor, without the demo bar or the floating scrollbar */
async function snap(url, { width, height, dpr, mobile }, file) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: dpr, mobile });
  for (let pass = 0; pass < 2; pass++) { await send('Page.navigate', { url: BASE + url }); await sleep(pass ? 7000 : 4000); } // 2nd pass: fonts and assets are cached
  await evaluate(`(() => { document.documentElement.classList.add('demo-strip-off'); const s = document.createElement('style'); s.textContent = '[data-demo-strip]{display:none!important}.float-scrollbar{display:none!important}'; document.head.append(s); window.scrollTo(0, 0); })()`);
  await sleep(900);
  const shot = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  writeFileSync(join(work, file), Buffer.from(shot.result.data, 'base64'));
  console.log(`captured ${file}  ${width}×${height} @${dpr}x`);
}

try {
  await send('Page.enable');
  await send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } }); // transparent corners
  await snap('/', { width: 1440, height: 900, dpr: 1.25, mobile: false }, 'desktop.png');
  await snap('/', { width: 390, height: 857, dpr: 2, mobile: true }, 'mobile.png'); // 857 = phone screen height under the status bar at this scale
  site.close();

  // Working copy of the templates next to the screenshots and the data
  for (const f of readdirSync(tplDir)) copyFileSync(join(tplDir, f), join(work, f));
  writeFileSync(join(work, 'data.js'), `const DATA = ${JSON.stringify(DATA)};`);
  mkdirSync(outDir, { recursive: true });

  const ART = [
    { name: 'banner', width: 1760, height: 632 },
    { name: 'stats', width: 1760, height: 399 },
    { name: 'preview', width: 1760, height: 1018 },
  ];
  for (const { name, width, height } of ART) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    let ready = false; let missing = [];
    for (let attempt = 0; attempt < 3 && !ready; attempt++) {
      await send('Page.navigate', { url: pathToFileURL(join(work, `${name}.html`)).href });
      // The fonts come from Google: give the page up to 30 s to finish loading before looking at them
      for (let i = 0; i < 60 && (await evaluate('document.readyState')) !== 'complete'; i++) await sleep(500);
      await sleep(500);
      const reply = (await send('Runtime.evaluate', { expression: 'window.__ready', awaitPromise: true, returnByValue: true })).result;
      const state = reply?.result?.value;
      ready = state?.ok === true; missing = state?.missing || [reply?.exceptionDetails?.exception?.description?.split('\n')[0] || 'page not ready'];
      if (!ready) { console.log(`  ${name}: not ready yet, ${missing.join(', ')}`); await sleep(2000); }
    }
    if (!ready) throw new Error(`${name}: fonts did not load (check your internet connection), nothing saved`);
    await sleep(500);
    const shot = await send('Page.captureScreenshot', { format: 'webp', quality: 90, fromSurface: true });
    const out = join(outDir, `${name}.webp`);
    writeFileSync(out, Buffer.from(shot.result.data, 'base64'));
    console.log(`.github/assets/${name}.webp  ${width}×${height}  ${(statSync(out).size / 1024).toFixed(0)} KB`);
  }
} finally {
  try { ws.close(); } catch { /* already closed */ }
  chrome.kill();
  site.close();
}
