import { renderIcons } from './icons.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Escape a value for safe interpolation into HTML templates. */
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Set innerHTML and render any icons inside it. */
export function setHTML(el, html) {
  el.innerHTML = html;
  renderIcons(el);
  return el;
}

const fmt = (d, opts) => {
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('fr-FR', opts);
};
export const fmtShort = (d) => fmt(d, { day: '2-digit', month: 'short' });
export const fmtLong = (d) => fmt(d, { day: '2-digit', month: 'long', year: 'numeric' });
export const fmtMonthYear = (d) => fmt(d, { month: 'long', year: 'numeric' });
export const fmtDate = (d) => fmt(d, { day: '2-digit', month: 'short', year: 'numeric' });

/** "il y a 3 j" style relative time, falls back to a short date after a week. */
export function timeAgo(d) {
  const t = new Date(d).getTime();
  if (Number.isNaN(t)) return '—';
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  if (s < 604800) return `il y a ${Math.floor(s / 86400)} j`;
  return fmtShort(d);
}

/** Toggle a button's loading state (spinner + disabled). */
export function setLoading(btn, loading) {
  if (!btn) return;
  btn.disabled = loading;
  btn.classList.toggle('is-loading', loading);
  if (loading) {
    btn.dataset.label ??= btn.innerHTML;
    btn.insertAdjacentHTML('afterbegin', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="size-[18px]" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56" stroke-linecap="round"/></svg>');
  } else if (btn.dataset.label) {
    btn.innerHTML = btn.dataset.label;
    delete btn.dataset.label;
  }
}

/** Notice block (info | success | error) as HTML. */
export function noticeHTML(variant, title, message, action) {
  const ico = { error: 'circle-alert', success: 'circle-check', info: 'info' }[variant] || 'info';
  return `<div class="notice notice-${variant}" role="${variant === 'error' ? 'alert' : 'status'}">
    <i data-lucide="${ico}"></i>
    <div class="min-w-0">${title ? `<strong>${esc(title)}</strong>` : ''}${message ? `<span class="notice-msg">${esc(message)}</span>` : ''}
    ${action ? `<a href="${esc(action.href)}">${esc(action.label)}<i data-lucide="arrow-right" class="size-3.5"></i></a>` : ''}</div>
  </div>`;
}

/** Render a notice into a container ("" clears it). */
export function showNotice(el, variant, title, message, action) {
  if (!el) return;
  if (!variant) { el.innerHTML = ''; return; }
  setHTML(el, noticeHTML(variant, title, message, action));
}

/** Only allow same-site relative redirects. */
export function safeNext(value, fallback = '/') {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : fallback;
}
