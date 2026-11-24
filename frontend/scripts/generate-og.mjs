/* Renders the social cards (Open Graph / Twitter, 1200×630) into public/og/*.jpg.
   Uses the Chrome or Edge already installed on the machine (no extra dependency).
     node scripts/generate-og.mjs            → all cards
     node scripts/generate-og.mjs search     → one card
   Template: scripts/og/template.html · Cards are listed below. */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, writeFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const outDir = join(root, 'public/og');
const template = pathToFileURL(join(root, 'scripts/og/template.html')).href;

const CARDS = {
  default: {
    stats: ['69 wilayas', '100 % gratuit', 'Annonces modérées'],
    sub: 'Offrez ou trouvez un médicament non utilisé, près de chez vous, partout en Algérie.',
  },
  search: {
    kicker: 'Recherche · 69 wilayas',
    title: 'Trouvez un médicament, <em>près de chez vous.</em>',
    sub: 'Offres et demandes publiées par les membres, filtrées par wilaya.',
    stats: ['Offres', 'Demandes', 'Par wilaya'],
  },
  annonce: {
    kicker: 'Annonce solidaire',
    title: 'Un médicament à donner, <em>une personne à aider.</em>',
    sub: "Consultez l'annonce sur MedLink DZ : gratuit, modéré, sans vente.",
    stats: ['Gratuit', 'Modéré', 'Contact protégé'],
  },
  faq: {
    kicker: 'Questions fréquentes',
    title: 'Tout comprendre, <em>en quelques minutes.</em>',
    sub: 'Ordonnances, dates de péremption, modération : les réponses sont ici.',
    stats: ['Ordonnances privées', 'Péremption vérifiée'],
  },
};

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find(existsSync);
if (!CHROME) throw new Error('Chrome or Edge not found');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PORT = 9400 + Math.floor(Math.random() * 400);
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'og-'))}`,
  '--allow-file-access-from-files', '--hide-scrollbars', '--force-device-scale-factor=1', '--no-first-run', 'about:blank'], { stdio: 'ignore' });

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

try {
  mkdirSync(outDir, { recursive: true });
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1200, height: 630, deviceScaleFactor: 1, mobile: false });
  const only = process.argv[2];
  for (const [name, data] of Object.entries(CARDS)) {
    if (only && only !== name) continue;
    await send('Page.navigate', { url: `${template}#${encodeURIComponent(JSON.stringify(data))}` });
    await sleep(600);
    await send('Runtime.evaluate', { expression: 'location.reload()' }); // re-run the script with the hash set
    await sleep(900);
    let ready = false;
    for (let attempt = 0; attempt < 3 && !ready; attempt++) {
      const r = await send('Runtime.evaluate', { expression: 'window.__ready', awaitPromise: true, returnByValue: true });
      const state = r.result?.result?.value;
      ready = state?.ok === true;
      if (!ready) console.log(`  waiting for fonts… missing: ${(state?.missing || ['?']).join(', ')}`);
      if (!ready) { await send('Runtime.evaluate', { expression: 'location.reload()' }); await sleep(2500); }
    }
    if (!ready) throw new Error(`og/${name}: fonts did not load (check your internet connection) — nothing saved`);
    await sleep(400);
    const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 88 });
    const file = join(outDir, `${name}.jpg`);
    writeFileSync(file, Buffer.from(shot.result.data, 'base64'));
    console.log(`og/${name}.jpg  ${(statSync(file).size / 1024).toFixed(0)} KB`);
  }
} finally {
  try { ws.close(); } catch { /* already closed */ }
  chrome.kill();
}
