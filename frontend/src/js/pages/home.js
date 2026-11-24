import '../core/layout.js';
import { observeReveal } from '../core/layout.js';
import { annonceApi, catalogApi, adminApi } from '../core/api.js';
import { getUser, isAdmin, userWilayaId } from '../core/auth.js';
import { $, esc, setHTML, timeAgo, noticeHTML } from '../core/dom.js';
import { wilayaSelect } from '../components/wilaya-select.js';
import { mapAnnonce, annonceCardHTML, cardSkeletonHTML, emptyStateHTML, wilayaCode, statusInfo } from '../components/annonce-card.js';
import { WILAYAS } from '../data/wilayas.js';

/* The home page has two versions:
   - visitors: the full pitch (hero, live board, how it works, rules, sign-up CTA)
   - signed-in members: task-first (search + publish, my annonces, near me, recent)
   index.html decides before first paint from the stored token; we confirm with the API here. */

// One request for the annonce list, shared by both versions.
const annoncesPromise = annonceApi.list()
  .then((res) => (Array.isArray(res?.annonces) ? res.annonces : []))
  .catch(() => null); // null = failed to load

/** Search form → /search?q=…&wilaya=… */
function wireSearch(form, wilayaRoot, initialWilaya = '') {
  const wilaya = wilayaSelect(wilayaRoot, { tone: 'bare', placeholder: 'Toutes les wilayas', allowClear: true, value: initialWilaya });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    const q = form.q.value.trim();
    if (q) params.set('q', q);
    if (wilaya.value) params.set('wilaya', wilaya.value);
    location.href = `/search${params.size ? `?${params}` : ''}`;
  });
}

const loadFailedHTML = () => emptyStateHTML({ icon: 'triangle-alert', title: 'Impossible de charger les annonces', text: 'Vérifiez votre connexion puis réessayez dans un instant.' });

/* =====================================================================
   VISITOR HOME
   ===================================================================== */

// Shown only when there is nothing published yet, and labelled as examples.
const EXAMPLES = [
  { type: 'offre', name: 'Doliprane 1000 mg', wilayaId: 16, wilaya: 'Alger' },
  { type: 'demande', name: 'Insuline NovoMix 30', wilayaId: 6, wilaya: 'Béjaïa' },
  { type: 'offre', name: 'Ventoline 100 µg', wilayaId: 31, wilaya: 'Oran' },
  { type: 'demande', name: 'Levothyrox 50 µg', wilayaId: 25, wilaya: 'Constantine' },
  { type: 'offre', name: 'Amoxicilline 500 mg', wilayaId: 19, wilaya: 'Sétif' },
  { type: 'offre', name: 'Sérum physiologique', wilayaId: 15, wilaya: 'Tizi Ouzou' },
  { type: 'demande', name: 'Glucophage 850 mg', wilayaId: 9, wilaya: 'Blida' },
];

function boardRow(a, live) {
  const dot = a.type === 'offre' ? 'bg-mint' : 'bg-[#FF9B85]';
  const inner = `
    <span class="size-2 shrink-0 rounded-full ${dot}"></span>
    <span class="min-w-0 flex-1">
      <span class="block truncate font-medium text-white">${esc(a.name)}</span>
      <span class="mt-0.5 block truncate font-mono text-[11px] uppercase tracking-[0.12em] text-white/40">${a.type === 'offre' ? 'Offre' : 'Demande'} · ${wilayaCode(a.wilayaId)} ${esc(a.wilaya)}</span>
    </span>
    <span class="shrink-0 font-mono text-[11px] text-white/40">${live && a.date ? timeAgo(a.date) : ''}</span>`;
  return live
    ? `<li><a href="/annonce/${esc(a.id)}" class="flex items-center gap-4 px-5 py-4 transition hover:bg-white/[.04]">${inner}</a></li>`
    : `<li class="flex items-center gap-4 px-5 py-4">${inner}</li>`;
}

function paintBoard(items, live) {
  const rows = items.map((a) => boardRow(a, live)).join('');
  setHTML($('[data-board]'), rows + rows); // twice, so the vertical ticker loops seamlessly
  if (!live) $('[data-board-title]').textContent = "Exemples d'annonces";
}

function countUp(el, target) {
  const start = performance.now();
  const step = (t) => {
    const p = Math.min(1, (t - start) / 1400);
    el.textContent = Math.round((1 - (1 - p) ** 3) * target).toLocaleString('fr-FR');
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

async function visitorHome() {
  wireSearch($('[data-hero-search]'), $('[data-hero-wilaya]'));

  const recent = $('[data-recent]');
  recent.innerHTML = Array.from({ length: 6 }, cardSkeletonHTML).join('');
  const raw = await annoncesPromise;
  if (raw === null) {
    paintBoard(EXAMPLES, false);
    setHTML(recent, loadFailedHTML());
  } else {
    const list = raw.map(mapAnnonce);
    paintBoard(list.length >= 3 ? list.slice(0, 12) : EXAMPLES, list.length >= 3);
    setHTML(recent, list.length
      ? list.slice(0, 6).map((a) => annonceCardHTML(a)).join('')
      : emptyStateHTML({ icon: 'package-open', title: 'Aucune annonce publiée pour le moment', text: 'Les annonces validées apparaîtront ici dès qu’elles seront disponibles.', action: { href: '/publier', label: 'Publier la première' } }));
    observeReveal(recent);
  }

  catalogApi.summary()
    .then((res) => {
      const s = res?.stats || res || {};
      document.querySelectorAll('[data-stat]').forEach((el) => {
        const v = Number(s[el.dataset.stat]);
        if (!Number.isFinite(v)) return;
        const io = new IntersectionObserver(([entry]) => {
          if (entry.isIntersecting) { countUp(el, v); io.disconnect(); }
        });
        io.observe(el);
      });
    })
    .catch(() => { /* keep the static placeholders */ });
}

/* =====================================================================
   MEMBER HOME
   ===================================================================== */

const typeOf = (raw) => (String(raw).toUpperCase() === 'DON' || String(raw).toLowerCase() === 'offre' ? 'offre' : 'demande');

function paintNotices(user, pendingCount) {
  const blocks = [];
  if (isAdmin(user) && pendingCount > 0) {
    blocks.push(`<a href="/admin" class="group flex items-center gap-4 rounded-2xl bg-ink p-4 text-white transition hover:bg-ink-3 sm:p-5">
      <span class="grid size-10 shrink-0 place-items-center rounded-xl bg-amber/20 text-[#F4C46B]"><i data-lucide="shield-check" class="size-5"></i></span>
      <span class="min-w-0 flex-1"><span class="block font-medium">${pendingCount} annonce${pendingCount > 1 ? 's' : ''} en attente de modération</span>
      <span class="block text-sm text-white/55">Ouvrir la console admin pour les valider ou les refuser.</span></span>
      <i data-lucide="arrow-right" class="size-5 text-white/50 transition-[translate] duration-300 ease-out-soft group-hover:translate-x-1"></i></a>`);
  }
  if (!user.is_verified) {
    blocks.push(noticeHTML('info', 'Adresse email non vérifiée', 'Vérifiez votre email pour sécuriser votre compte.', { href: '/resend-verification', label: "Renvoyer l'email de vérification" }));
  }
  if (!user.phone) {
    blocks.push(noticeHTML('info', 'Ajoutez votre numéro de téléphone', 'Sans numéro, les membres intéressés ne peuvent pas vous contacter.', { href: '/profil/modifier', label: 'Compléter mon profil' }));
  }
  setHTML($('[data-member-notices]'), blocks.join(''));
}

async function paintMyAnnonces() {
  const latest = $('[data-member-latest]');
  try {
    const data = await annonceApi.myAnnonces();
    const list = (Array.isArray(data) ? data : data?.annonces || [])
      .slice().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    const count = (k) => list.filter((a) => statusInfo(a.statut || a.status).key === k).length;
    ['publiee', 'en_attente', 'rejetee'].forEach((k) => { $(`[data-member-count="${k}"]`).textContent = count(k); });

    if (!list.length) {
      latest.innerHTML = 'Vous n\'avez pas encore publié d\'annonce. <a href="/publier" class="font-medium text-brand underline underline-offset-4">Publier la première</a>';
      return;
    }
    const a = list[0];
    const s = statusInfo(a.statut || a.status);
    const name = a.marque || a.dci || a.titre || 'Votre annonce';
    setHTML(latest, `<span class="inline-flex flex-wrap items-center gap-x-2 gap-y-1">Dernière annonce&nbsp;: <span class="font-medium text-text">${esc(name)}</span>
      <span class="tag ${s.cls}">${esc(s.label)}</span><span class="font-mono text-xs text-muted">${esc(timeAgo(a.created_at))}</span></span>`);
  } catch {
    latest.textContent = 'Impossible de charger vos annonces pour le moment.';
  }
}

async function paintFeeds(user) {
  const nearbyEl = $('[data-member-nearby]');
  const allEl = $('[data-member-latest-all]');
  nearbyEl.innerHTML = Array.from({ length: 3 }, cardSkeletonHTML).join('');
  allEl.innerHTML = Array.from({ length: 3 }, cardSkeletonHTML).join('');

  const wilayaId = userWilayaId(user);
  const wilayaName = WILAYAS.find((w) => w.id === wilayaId)?.name;
  if (wilayaName) {
    $('[data-member-wilaya-name]').textContent = wilayaName;
    const link = $('[data-member-nearby-link]');
    link.href = `/search?wilaya=${encodeURIComponent(wilayaId)}`;
    link.firstChild.textContent = `Tout voir à ${wilayaName} `;
  }

  const raw = await annoncesPromise;
  if (raw === null) { setHTML(nearbyEl, loadFailedHTML()); setHTML(allEl, ''); return; }

  // The member's own annonces are already summarised above, so feeds show other people's.
  const others = raw.filter((a) => String(a.user_id ?? '') !== String(user.id)).map(mapAnnonce);
  const nearby = wilayaId ? others.filter((a) => String(a.wilayaId) === wilayaId).slice(0, 3) : [];

  if (!wilayaId) {
    setHTML(nearbyEl, emptyStateHTML({ icon: 'map-pin', title: 'Indiquez votre wilaya', text: 'Nous vous montrerons en priorité les annonces proches de chez vous.', action: { href: '/profil/modifier', label: 'Choisir ma wilaya' } }));
  } else if (!nearby.length) {
    setHTML(nearbyEl, emptyStateHTML({ icon: 'map-pin', title: `Rien de nouveau à ${wilayaName || 'votre wilaya'} pour l'instant`, text: 'Publiez une demande : les membres de votre wilaya pourront vous répondre.', action: { href: '/publier?type=demande', label: 'Publier une demande' } }));
  } else {
    setHTML(nearbyEl, nearby.map((a) => annonceCardHTML(a)).join(''));
    observeReveal(nearbyEl);
  }

  const shown = new Set(nearby.map((a) => a.id));
  const rest = others.filter((a) => !shown.has(a.id)).slice(0, 6);
  setHTML(allEl, rest.length
    ? rest.map((a) => annonceCardHTML(a)).join('')
    : emptyStateHTML({ icon: 'package-open', title: 'Aucune autre annonce pour le moment' }));
  observeReveal(allEl);
}

async function memberHome(user) {
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  $('[data-today]').textContent = today.charAt(0).toUpperCase() + today.slice(1);
  $('[data-first-name]').textContent = `${user.prenom || ''},`.replace(/^,$/, '!');
  wireSearch($('[data-member-search]'), $('[data-member-wilaya]'), userWilayaId(user));

  paintNotices(user, 0);
  if (isAdmin(user)) {
    adminApi.pending()
      .then((d) => paintNotices(user, Array.isArray(d?.annonces) ? d.annonces.length : 0))
      .catch(() => { /* banner is optional */ });
  }
  paintMyAnnonces();
  paintFeeds(user);
}

/* ---- Pick the version ---- */
const hadToken = document.documentElement.classList.contains('has-token');
const user = hadToken ? await getUser() : null;
if (user) {
  memberHome(user);
} else {
  // No token, or an expired one: show the visitor home.
  document.documentElement.classList.remove('has-token');
  visitorHome();
}
