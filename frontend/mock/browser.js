/* Browser runtime of the demo API (portfolio build and `npm run dev:mock`).
   - Data lives in this visitor's localStorage only: nothing is ever sent to a server.
   - It survives page changes (multi-page site) and resets itself after 24 h or from the demo menu.
   - Uploaded photos are shrunk before being stored, so they fit in the browser's storage. */
import { createMockApi } from './api.js';

const KEY = 'medlink_demo_state';
const MAX_AGE = 24 * 3600e3;
let memory = null; // fallback when storage is blocked or full

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    const state = raw ? JSON.parse(raw) : memory;
    return state && Date.now() - state.createdAt < MAX_AGE ? state : null;
  } catch {
    return memory;
  }
}

function save(state) {
  memory = state;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage full: drop the oldest uploaded photos and try again, else keep this page's data in memory
    const keys = Object.keys(state.uploads || {});
    if (keys.length) {
      delete state.uploads[keys[0]];
      save(state);
    }
  }
}

/* Photos → JPEG data URL, longest side ≤ 900px (≈100 KB). Non-images are not kept. */
async function prepareImage(file) {
  if (!/^image\//.test(file.type)) return null;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 900 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    return canvas.toDataURL('image/jpeg', 0.82);
  } catch {
    return null;
  }
}

const api = createMockApi({ load, save, prepareImage });

/** Drop-in replacement for fetch(), for /api/* URLs only. */
export function demoFetch(input, init = {}) {
  const request = input instanceof Request ? input : new Request(input, init);
  return api.handle(request);
}

export function resetDemo() {
  api.reset();
}
