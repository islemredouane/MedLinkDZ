import '../core/layout.js';
import { observeReveal } from '../core/layout.js';
import { annonceApi } from '../core/api.js';
import { $, $$, setHTML } from '../core/dom.js';
import { wilayaSelect } from '../components/wilaya-select.js';
import { mapAnnonce, annonceCardHTML, cardSkeletonHTML, emptyStateHTML } from '../components/annonce-card.js';

const params = new URLSearchParams(location.search);
const state = { q: params.get('q') || '', wilaya: params.get('wilaya') || '', type: params.get('type') || 'all' };
let all = [];
let loaded = false;
let firstPaint = true;

const qInput = $('[data-q]');
const clearBtn = $('[data-clear]');
const results = $('[data-results]');
qInput.value = state.q;

const wilaya = wilayaSelect($('[data-wilaya]'), {
  value: state.wilaya, placeholder: 'Toutes les wilayas', allowClear: true, pill: true,
  onChange: (v) => { state.wilaya = v; render(); },
});

const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function syncUrl() {
  const p = new URLSearchParams();
  if (state.q) p.set('q', state.q);
  if (state.wilaya) p.set('wilaya', state.wilaya);
  if (state.type !== 'all') p.set('type', state.type);
  history.replaceState(null, '', `${location.pathname}${p.size ? `?${p}` : ''}`);
}

function render() {
  clearBtn.hidden = !state.q;
  $$('[data-type]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.type === state.type)));
  $('[data-reset]').hidden = !(state.q || state.wilaya || state.type !== 'all');
  const active = (state.wilaya ? 1 : 0) + (state.type !== 'all' ? 1 : 0);
  const badge = $('[data-filter-count]');
  badge.hidden = !active;
  badge.textContent = active;
  syncUrl();
  if (!loaded) return;

  const q = norm(state.q.trim());
  const list = all.filter((a) =>
    (!q || norm(a.name).includes(q) || norm(a.category).includes(q))
    && (state.type === 'all' || a.type === state.type)
    && (!state.wilaya || String(a.wilayaId) === String(state.wilaya)));

  $('[data-count]').textContent = list.length;
  $('[data-count-label]').textContent = list.length > 1 ? 'résultats' : 'résultat';

  if (!all.length) {
    setHTML(results, emptyStateHTML({ icon: 'package-open', title: 'Aucune annonce publiée pour le moment', text: 'Dès qu’une annonce sera validée, elle apparaîtra ici.', action: { href: '/publier', label: 'Publier une annonce' } }));
  } else if (!list.length) {
    setHTML(results, emptyStateHTML({ icon: 'search', title: 'Aucun résultat', text: 'Essayez un autre nom, une autre wilaya, ou retirez un filtre.' }));
  } else {
    // First load: cards cascade in. Later (typing, filters): no per-card replay, just a soft cross-fade.
    setHTML(results, list.map((a) => annonceCardHTML(a, { reveal: firstPaint })).join(''));
    if (firstPaint) observeReveal(results);
    else if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      results.animate([{ opacity: 0.35 }, { opacity: 1 }], { duration: 220, easing: 'cubic-bezier(.2,.7,.2,1)' });
    }
    firstPaint = false;
  }
}

/* Phones: wilaya + type live behind the "Filtres" button so the pinned bar stays one line tall. */
const filterToggle = $('[data-filter-toggle]');
const filterPanel = $('[data-filter-panel]');
filterToggle.addEventListener('click', () => {
  const open = filterToggle.getAttribute('aria-expanded') !== 'true';
  filterToggle.setAttribute('aria-expanded', String(open));
  filterPanel.classList.toggle('max-md:hidden', !open);
});

let t;
qInput.addEventListener('input', () => {
  clearTimeout(t);
  t = setTimeout(() => { state.q = qInput.value; render(); }, 120);
});
clearBtn.addEventListener('click', () => { qInput.value = ''; state.q = ''; render(); qInput.focus(); });
$('[data-types]').addEventListener('click', (e) => {
  const b = e.target.closest('[data-type]');
  if (b) { state.type = b.dataset.type; render(); }
});
$('[data-reset]').addEventListener('click', () => {
  Object.assign(state, { q: '', wilaya: '', type: 'all' });
  qInput.value = '';
  wilaya.value = '';
  render();
});

results.innerHTML = Array.from({ length: 6 }, cardSkeletonHTML).join('');
render();

annonceApi.list()
  .then((res) => {
    all = Array.isArray(res?.annonces) ? res.annonces.map(mapAnnonce) : [];
    loaded = true;
    $('[data-total]').textContent = `${all.length} annonce${all.length > 1 ? 's' : ''} en ligne · 69 wilayas`;
    render();
  })
  .catch(() => {
    $('[data-total]').textContent = 'Hors ligne';
    setHTML(results, emptyStateHTML({ icon: 'triangle-alert', title: 'Impossible de charger les annonces', text: 'Vérifiez votre connexion puis réessayez dans un instant.' }));
  });
