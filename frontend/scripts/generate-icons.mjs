/* Renders the app icons (PWA / home screen) from the MedLink logo into public/.
   Uses the Chrome or Edge already installed on the machine (no extra dependency).
     npm run build:icons
   Output:
     public/icons/icon-192.png, icon-512.png        rounded logo, transparent corners  ("any" purpose)
     public/icons/icon-maskable-512.png             full-bleed green, logo inside the safe zone ("maskable": Android crops it to any shape)
     public/apple-touch-icon.png                    180×180 full-bleed (iOS rounds the corners itself) */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, writeFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const pub = join(root, 'public');

const BRAND = '#13805C';
const mark = `<rect x="13" y="6.5" width="6" height="19" rx="3" fill="#fff"/><rect x="6.5" y="13" width="19" height="6" rx="3" fill="#86D6B3"/><rect x="13" y="13" width="6" height="6" fill="#fff"/>`;
// Rounded tile for "any"; square tile for maskable and Apple (the platform applies its own mask)
const svg = (rx) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="100%" height="100%"><rect width="32" height="32" rx="${rx}" fill="${BRAND}"/>${mark}</svg>`;

const ICONS = [
  { file: 'icons/icon-192.png', size: 192, rx: 7 },
  { file: 'icons/icon-512.png', size: 512, rx: 7 },
  { file: 'icons/icon-maskable-512.png', size: 512, rx: 0 },
  { file: 'apple-touch-icon.png', size: 180, rx: 0 },
];

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find(existsSync);
if (!CHROME) throw new Error('Chrome or Edge not found');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PORT = 9500 + Math.floor(Math.random() * 400);
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'ic-'))}`, '--hide-scrollbars', '--force-device-scale-factor=1', '--no-first-run', 'about:blank'], { stdio: 'ignore' });

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
  await send('Page.enable');
  await send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } }); // transparent corners
  for (const { file, size, rx } of ICONS) {
    await send('Emulation.setDeviceMetricsOverride', { width: size, height: size, deviceScaleFactor: 1, mobile: false });
    const html = `<!doctype html><html><body style="margin:0;background:transparent;width:${size}px;height:${size}px;overflow:hidden">${svg(rx)}</body></html>`;
    await send('Page.navigate', { url: `data:text/html;charset=utf-8,${encodeURIComponent(html)}` });
    await sleep(350);
    const shot = await send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
    const out = join(pub, file);
    mkdirSync(join(out, '..'), { recursive: true });
    writeFileSync(out, Buffer.from(shot.result.data, 'base64'));
    console.log(`${file}  ${size}×${size}  ${(statSync(out).size / 1024).toFixed(1)} KB`);
  }
} finally {
  try { ws.close(); } catch { /* already closed */ }
  chrome.kill();
}
