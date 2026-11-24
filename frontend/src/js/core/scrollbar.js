/* Floating page scrollbar (ported from the Insight site).
   Desktop browsers reserve a strip for the native scrollbar; we hide it and draw a thin
   line that floats over the page instead: no track, no reserved width. Always visible, draggable,
   click-to-jump on the edge. Mouse/trackpad only: touch screens keep their own overlay indicator. */

const MIN_THUMB = 40;
const fine = matchMedia('(hover: hover) and (pointer: fine)');
const root = document.documentElement;

/* Same thumb height on every page: the home page's.
   The home page is one screen of hero + a fixed amount of content below it
   (measured: 3837px at every desktop size). The home page re-measures that and saves it,
   so the value follows content changes; other pages reuse it. */
const BELOW_HERO_KEY = 'medlink_home_below_hero';
const DEFAULT_BELOW_HERO = 3837;
const isHome = location.pathname === '/' || location.pathname === '/index.html';
const readBelowHero = () => {
  try { return Number(localStorage.getItem(BELOW_HERO_KEY)) || DEFAULT_BELOW_HERO; } catch { return DEFAULT_BELOW_HERO; }
};
let belowHero = readBelowHero();
let measureTimer;
// Only measure once the home page has loaded and stopped changing size (cards, fonts, images),
// otherwise a half-loaded page would save a too-short length.
function measureHome() {
  if (!isHome || !fine.matches) return;
  clearTimeout(measureTimer);
  measureTimer = setTimeout(() => {
    if (document.readyState !== 'complete') return measureHome();
    const value = root.scrollHeight - innerHeight;
    if (value > 1000 && value !== belowHero) {
      belowHero = value;
      try { localStorage.setItem(BELOW_HERO_KEY, String(value)); } catch { /* storage blocked */ }
      queue();
    }
  }, 900);
}
const homeThumb = () => Math.max(MIN_THUMB, Math.round((innerHeight * innerHeight) / (innerHeight + belowHero)));

const bar = document.createElement('div');
bar.className = 'float-scrollbar';
bar.setAttribute('aria-hidden', 'true');
bar.innerHTML = '<div class="float-scrollbar-thumb"></div>';
const thumb = bar.firstElementChild;
document.body.append(bar);

let thumbH = 0;
let queued = false;

const maxScroll = () => root.scrollHeight - innerHeight;
const travel = () => innerHeight - thumbH;

function render() {
  queued = false;
  const max = maxScroll();
  const active = fine.matches && max > 1;
  root.classList.toggle('has-float-scrollbar', fine.matches);
  bar.hidden = !active;
  if (!active) return;
  measureHome();
  // Never taller than half the screen, so very short pages still show a usable track.
  // Large screens: a short, discreet thumb (≈7% of the window, ~64px on a laptop), since the always-on green bar reads strongly.
  const cap = innerWidth >= 1024 ? Math.max(48, Math.round(innerHeight * 0.07)) : Math.round(innerHeight / 2);
  thumbH = Math.max(Math.min(MIN_THUMB, cap), Math.min(homeThumb(), cap));
  thumb.style.height = `${thumbH}px`;
  thumb.style.transform = `translateY(${(scrollY / max) * travel()}px)`;
}
const queue = () => { if (!queued) { queued = true; requestAnimationFrame(render); } };

// Always visible, in a single style (no idle fade, no hover/drag variant).
addEventListener('scroll', queue, { passive: true });
addEventListener('resize', queue);
fine.addEventListener('change', queue);
new ResizeObserver(queue).observe(document.body); // content loading, accordions…
render();

// Drag the thumb
let startY = 0;
let startScroll = 0;
thumb.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  e.stopPropagation();
  startY = e.clientY;
  startScroll = scrollY;
  thumb.setPointerCapture(e.pointerId);
});
thumb.addEventListener('pointermove', (e) => {
  if (!thumb.hasPointerCapture(e.pointerId)) return;
  const t = travel();
  if (t > 0) scrollTo({ top: startScroll + ((e.clientY - startY) / t) * maxScroll(), behavior: 'instant' });
});
const stop = (e) => {
  if (thumb.hasPointerCapture(e.pointerId)) thumb.releasePointerCapture(e.pointerId);
};
thumb.addEventListener('pointerup', stop);
thumb.addEventListener('pointercancel', stop);

// Click on the edge: jump there, centring the thumb on the pointer
bar.addEventListener('pointerdown', (e) => {
  if (e.target !== bar) return;
  const t = travel();
  if (t > 0) scrollTo({ top: ((e.clientY - thumbH / 2) / t) * maxScroll(), behavior: 'instant' });
});
