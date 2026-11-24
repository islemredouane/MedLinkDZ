/* Runs on every page: icons, header state, user menu, scroll reveal, footer year. */
import { renderIcons } from './icons.js';
import './scrollbar.js';
import { getUser, logout, isAdmin, initials } from './auth.js';
import { assetUrl, catalogApi } from './api.js';
import { $, $$, esc } from './dom.js';
import { toast } from './toast.js';

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

/* ---------- Installable app (PWA) ---------- */
// Offline support and installability. Production builds only: a worker in the dev server would cache stale modules.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => { /* private mode, blocked storage */ }); });
}

// "Installer l'app" button (footer). Chrome, Edge and Android offer a real install prompt once the browser decides the app is
// installable; iPhone and iPad have no such prompt, so the button explains the Share-sheet steps instead.
{
  const buttons = $$('[data-install]');
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let promptEvent = null;
  const show = (on) => buttons.forEach((b) => { b.hidden = !on; });
  if (buttons.length && !standalone) {
    if (isIOS) show(true);
    addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); promptEvent = e; show(true); });
    addEventListener('appinstalled', () => { promptEvent = null; show(false); });
    buttons.forEach((b) => b.addEventListener('click', async () => {
      if (promptEvent) {
        // The event works once. Whatever the outcome (installed, dismissed, refused) the button hides;
        // Chrome fires a new event later if it offers the prompt again, which brings the button back.
        const event = promptEvent;
        promptEvent = null;
        show(false);
        try { await event.prompt(); await event.userChoice; } catch { /* refused or dismissed */ }
      } else if (isIOS) {
        toast('Touchez le bouton Partager de Safari, puis « Sur l’écran d’accueil ».', 'info', 9000);
      }
    }));
  }
}

// Demo mode only (npm run dev:mock); removed from production builds.
if (import.meta.env.VITE_MOCK === '1') import('../dev/demo-bar.js');
