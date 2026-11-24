import { icon } from './icons.js';
import { esc } from './dom.js';

let viewport;

function ensureViewport() {
  if (viewport) return viewport;
  viewport = document.createElement('div');
  // Above the mobile dock; bottom-right on desktop
  viewport.className = 'pointer-events-none fixed inset-x-4 bottom-24 z-[60] flex flex-col items-center gap-2.5 md:bottom-6 md:left-auto md:right-6 md:items-end';
  viewport.setAttribute('aria-live', 'polite');
  document.body.append(viewport);
  return viewport;
}

const TONES = {
  success: { icon: 'circle-check', label: 'Succès', chip: 'bg-brand-soft text-brand', color: 'var(--color-brand)' },
  error: { icon: 'circle-alert', label: 'Erreur', chip: 'bg-danger-soft text-danger', color: 'var(--color-danger)' },
  info: { icon: 'info', label: 'Information', chip: 'bg-paper-2 text-body', color: 'var(--color-ink-3)' },
};

/** Toast message. type: success | error | info. A countdown bar shows the remaining time; hovering pauses it. */
export function toast(message, type = 'info', duration = 4500) {
  const tone = TONES[type] || TONES.info;
  const el = document.createElement('div');
  el.className = 'toast';
  el.style.setProperty('--toast-tone', tone.color);
  el.style.setProperty('--toast-dur', `${duration}ms`);
  el.setAttribute('role', type === 'error' ? 'alert' : 'status');
  el.innerHTML = `
    <span class="grid size-9 shrink-0 place-items-center rounded-xl ${tone.chip}">${icon(tone.icon, 'size-[18px]')}</span>
    <div class="min-w-0 flex-1">
      <p class="font-mono text-[10.5px] uppercase tracking-[0.14em]" style="color:var(--toast-tone)">${tone.label}</p>
      <p class="mt-0.5 text-sm font-medium leading-snug text-text">${esc(message)}</p>
    </div>
    <button type="button" class="grid size-8 shrink-0 place-items-center rounded-full text-muted transition hover:bg-paper-2 hover:text-text" aria-label="Fermer">${icon('x', 'size-4')}</button>
    ${duration > 0 ? '<span class="toast-bar" aria-hidden="true"></span>' : ''}`;

  let timer;
  let started = 0;
  let left = duration;
  const bar = () => el.querySelector('.toast-bar');
  const remove = () => {
    if (!el.isConnected || el.dataset.leaving) return;
    el.dataset.leaving = '1';
    clearTimeout(timer);
    const out = el.animate([{ opacity: 1, translate: '0 0', scale: 1 }, { opacity: 0, translate: '0 10px', scale: 0.97 }], { duration: 220, easing: 'cubic-bezier(.2,.7,.2,1)' });
    out.onfinish = () => el.remove();
  };
  const run = () => { started = Date.now(); timer = setTimeout(remove, left); if (bar()) bar().style.animationPlayState = 'running'; };
  const pause = () => { clearTimeout(timer); left -= Date.now() - started; if (bar()) bar().style.animationPlayState = 'paused'; };

  el.querySelector('button').addEventListener('click', remove);
  if (duration > 0) {
    el.addEventListener('mouseenter', pause);
    el.addEventListener('mouseleave', run);
  }
  ensureViewport().append(el);
  if (duration > 0) run();
}
