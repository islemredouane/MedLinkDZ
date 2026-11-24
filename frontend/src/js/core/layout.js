/* Runs on every page: icons, header state, user menu, scroll reveal, footer year. */
import { renderIcons } from './icons.js';
import './scrollbar.js';
import { getUser, logout, isAdmin, initials } from './auth.js';
import { assetUrl, catalogApi } from './api.js';
import { $, $$, esc } from './dom.js';

function markActiveNav() {
  const path = location.pathname.replace(/\.html$/, '').replace(/\/index$/, '').replace(/\/$/, '') || '/';
  $$('[data-nav]').forEach((a) => {
    const target = a.dataset.nav;
    const active = target === '/' ? path === '/' : path === target || (!['/profil', '/admin'].includes(target) && path.startsWith(`${target}/`));
    if (active) a.setAttribute('aria-current', 'page');
  });
}

function watchScroll() {
  const header = $('[data-site-header]');
  if (!header) return;
  const update = () => { header.dataset.scrolled = String(window.scrollY > 12); };
  update();
  window.addEventListener('scroll', update, { passive: true });
}

function initUserMenu() {
  const trigger = $('[data-user-trigger]');
  const menu = $('[data-user-menu]');
  if (!trigger || !menu) return;
  const close = () => { menu.hidden = true; trigger.setAttribute('aria-expanded', 'false'); };
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = menu.hidden;
    menu.hidden = !open;
    trigger.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', (e) => { if (!menu.contains(e.target)) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  $('[data-logout]')?.addEventListener('click', logout);
}

async function hydrateAuth() {
  const user = await getUser();
  $$('[data-auth="guest"]').forEach((el) => { el.hidden = !!user; });
  $$('[data-auth="user"]').forEach((el) => { el.hidden = !user; });
  document.documentElement.classList.add('auth-ready');
  if (!user) return;

  const avatar = assetUrl(user.avatar_url || user.avatar);
  const slot = $('[data-user-avatar]');
  if (slot) slot.innerHTML = avatar ? `<img src="${esc(avatar)}" alt="" class="size-full object-cover">` : esc(initials(user));
  const name = $('[data-user-name]');
  if (name) name.textContent = user.prenom || 'Profil';
  const full = $('[data-user-fullname]');
  if (full) full.textContent = `${user.prenom || ''} ${user.nom || ''}`.trim();
  const email = $('[data-user-email]');
  if (email) email.textContent = user.email || '';
  $$('[data-admin-only]').forEach((el) => { el.hidden = !isAdmin(user); });
}

/** Fade-in elements with .reveal when they enter the viewport. */
export function observeReveal(root = document) {
  const els = $$('.reveal:not(.is-visible)', root);
  if (!('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('is-visible')); return; }
  const io = new IntersectionObserver((entries) => {
    // Elements entering together cascade in (70ms apart, capped so long grids don't drag).
    let i = 0;
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.style.setProperty('--reveal-delay', `${Math.min(i++, 5) * 70}ms`);
      e.target.classList.add('is-visible');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  els.forEach((el) => io.observe(el));
}

renderIcons();
markActiveNav();
watchScroll();
initUserMenu();
observeReveal();
hydrateAuth();
$$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

/* ---- Footer ---- */
// Copy email (with a fallback when the clipboard API is blocked)
$$('[data-copy-email]').forEach((btn) => {
  const label = btn.querySelector('[data-copy-label]');
  const idle = label.textContent;
  btn.addEventListener('click', async () => {
    const email = btn.dataset.copyEmail;
    try {
      await navigator.clipboard.writeText(email);
      label.textContent = 'Copié !';
    } catch {
      const t = Object.assign(document.createElement('textarea'), { value: email });
      t.setAttribute('readonly', '');
      t.style.cssText = 'position:fixed;opacity:0';
      document.body.append(t);
      t.select();
      label.textContent = document.execCommand('copy') ? 'Copié !' : email;
      t.remove();
    }
    setTimeout(() => { label.textContent = idle; }, 1800);
  });
});
// Smooth back to top
$$('[data-to-top]').forEach((a) => a.addEventListener('click', (e) => {
  e.preventDefault();
  scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}));
// Live count of published annonces
const live = $('[data-footer-live]');
if (live) {
  catalogApi.summary()
    .then((res) => {
      const n = Number((res?.stats || res || {}).activeAnnonces);
      if (!Number.isFinite(n) || n <= 0) return;
      $('[data-footer-live-text]', live).textContent = `${n.toLocaleString('fr-FR')} annonce${n > 1 ? 's' : ''} en ligne`;
      live.hidden = false;
    })
    .catch(() => { /* pill stays hidden */ });
}

// Demo mode only (npm run dev:mock); removed from production builds.
if (import.meta.env.VITE_MOCK === '1') import('../dev/demo-bar.js');
