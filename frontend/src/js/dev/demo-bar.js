/* Demo-mode switcher (only loaded when VITE_MOCK=1): switch account, reset data, jump to any page. */
import { tokenStore, resetDemoData } from '../core/api.js';
import { icon } from '../core/icons.js';

const ACCOUNTS = [
  { token: 'mock-1', label: 'Admin', who: 'Amina Benali' },
  { token: 'mock-2', label: 'Membre', who: 'Karim Haddad' },
  { token: null, label: 'Visiteur', who: 'Non connecté' },
];
const PAGES = [
  ['Accueil', '/'], ['Recherche', '/search'], ['Annonce (photo)', '/annonce/1'], ['Annonce (sans photo)', '/annonce/2'],
  ['Publier', '/publier'], ['Mon profil', '/profil'], ['Mes annonces', '/profil/annonces'], ['Modifier le profil', '/profil/modifier'],
  ['Admin · modération', '/admin'], ['Admin · statistiques', '/admin/stats'],
  ['Connexion', '/login'], ['Inscription', '/register'], ['Mot de passe oublié', '/forgot-password'], ['Nouveau mot de passe', '/reset-password?token=demo'],
  ['Email vérifié', '/verify-email?token=demo'], ['Lien expiré', '/verify-email?token=x'], ['Renvoyer la vérification', '/resend-verification'],
  ['FAQ', '/faq'], ['Conditions', '/conditions'], ['Confidentialité', '/confidentialite'], ['Page 404', '/404'],
];

const current = tokenStore.get();
const active = ACCOUNTS.find((a) => a.token === current) || ACCOUNTS[2];

const root = document.createElement('div');
// Phones: bottom-right, just above the dock. Desktop: bottom-left. Panel opens upward.
root.className = 'fixed bottom-[96px] right-3 z-[55] flex flex-col items-end md:bottom-5 md:left-4 md:right-auto md:items-start';
root.innerHTML = `
  <div class="mb-2 w-[min(300px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-line bg-surface text-sm text-text shadow-lift" data-demo-panel hidden>
    <div class="border-b border-line bg-paper px-4 py-3">
      <p class="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Mode démo · données fictives</p>
      <p class="mt-0.5 text-xs text-body">Rien n'est envoyé à un serveur.</p>
    </div>
    <div class="p-2">
      <p class="px-2 pb-1 pt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Voir le site en tant que</p>
      ${ACCOUNTS.map((a) => `<button type="button" data-as="${a.token ?? ''}" class="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left hover:bg-paper ${a === active ? 'bg-brand-soft/60' : ''}">
        <span><span class="font-medium">${a.label}</span> <span class="text-muted">· ${a.who}</span></span>${a === active ? icon('check', 'size-4 text-brand') : ''}</button>`).join('')}
    </div>
    <div class="max-h-[38vh] overflow-y-auto border-t border-line p-2">
      <p class="px-2 pb-1 pt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Toutes les pages</p>
      <div class="grid grid-cols-2 gap-0.5">
        ${PAGES.map(([l, h]) => `<a href="${h}" class="truncate rounded-lg px-2.5 py-1.5 text-[13px] text-body hover:bg-paper hover:text-text">${l}</a>`).join('')}
      </div>
    </div>
    <div class="border-t border-line p-2">
      <button type="button" data-demo-reset class="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px] text-body hover:bg-paper">${icon('rotate-ccw', 'size-4')}Réinitialiser les données de démo</button>
    </div>
  </div>
  <button type="button" data-demo-toggle aria-expanded="false" class="flex h-8 items-center gap-2 rounded-full bg-amber px-3 md:h-9 md:px-3.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-white shadow-lift hover:brightness-110">
    <span class="size-1.5 rounded-full bg-white animate-pulse-dot"></span>Démo · ${active.label}
  </button>`;
// Auth pages already carry the demo accounts card and the bar's dialog: the floating pill would only cover form fields.
if (document.querySelector('main.grid')) root.hidden = true;
document.body.append(root);

const panel = root.querySelector('[data-demo-panel]');
const toggle = root.querySelector('[data-demo-toggle]');
toggle.addEventListener('click', (e) => {
  e.stopPropagation();
  panel.hidden = !panel.hidden;
  toggle.setAttribute('aria-expanded', String(!panel.hidden));
});
document.addEventListener('click', (e) => { if (!root.contains(e.target)) panel.hidden = true; });

root.querySelectorAll('[data-as]').forEach((b) => b.addEventListener('click', () => {
  if (b.dataset.as) tokenStore.set(b.dataset.as); else tokenStore.clear();
  location.reload();
}));
root.querySelector('[data-demo-reset]').addEventListener('click', async () => {
  resetDemoData();
  location.reload();
});

/* ---------- "Projet de démonstration" bar (markup injected at build time) ---------- */
const STRIP_KEY = 'medlink_demo_strip';
document.querySelector('[data-demo-strip-close]')?.addEventListener('click', () => {
  document.documentElement.classList.add('demo-strip-off');
  try { sessionStorage.setItem(STRIP_KEY, 'off'); } catch { /* storage blocked */ }
});

/* "En savoir plus": what this demo is, and one-click views */
function openAbout() {
  const dlg = document.createElement('dialog');
  dlg.className = 'm-auto w-[min(520px,calc(100vw-32px))] rounded-3xl border border-line bg-surface p-0 text-body shadow-lift backdrop:bg-ink/50 backdrop:backdrop-blur-sm';
  dlg.setAttribute('aria-labelledby', 'demo-about-title');
  const views = ACCOUNTS.map((a) => `
    <button type="button" data-view="${a.token ?? ''}" class="group flex flex-col items-start rounded-2xl border border-line p-3.5 text-left transition hover:border-brand/50 hover:bg-brand-soft/40 ${a === active ? 'border-brand/60 bg-brand-soft/50' : ''}">
      <span class="font-medium text-text">${a.label}</span>
      <span class="mt-0.5 text-xs text-muted">${{ Admin: 'Modération, statistiques', Membre: 'Publier, suivre ses annonces', Visiteur: 'Découvrir et rechercher' }[a.label]}</span>
    </button>`).join('');
  dlg.innerHTML = `
    <div class="p-6 sm:p-8">
      <div class="flex items-start justify-between gap-4">
        <span class="tag tag-pending">Démo · portfolio</span>
        <button type="button" class="-mr-2 -mt-2 grid size-9 place-items-center rounded-full text-muted hover:bg-paper-2 hover:text-text" aria-label="Fermer" data-close>${icon('x', 'size-4')}</button>
      </div>
      <h2 id="demo-about-title" class="mt-5 text-2xl font-semibold leading-tight">Un projet de démonstration</h2>
      <p class="mt-3 text-[15px] leading-relaxed">MedLink DZ est un projet full-stack réalisé pour un portfolio. Cette version en ligne fonctionne entièrement dans votre navigateur, avec des données fictives.</p>
      <ul class="mt-5 space-y-2.5 text-sm">
        <li class="flex gap-3">${icon('circle-check', 'mt-0.5 size-4 shrink-0 text-brand')}<span>Annonces, comptes et numéros de téléphone sont <strong class="text-text">fictifs</strong>.</span></li>
        <li class="flex gap-3">${icon('lock', 'mt-0.5 size-4 shrink-0 text-brand')}<span>Rien n'est envoyé à un serveur : ce que vous publiez reste sur cet appareil et se réinitialise automatiquement.</span></li>
        <li class="flex gap-3">${icon('circle-alert', 'mt-0.5 size-4 shrink-0 text-amber')}<span>Ce n'est pas un service réel. Pour un médicament ou une question de santé, adressez-vous à un médecin ou à un pharmacien.</span></li>
      </ul>
      <p class="mt-7 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Explorer le site en tant que</p>
      <div class="mt-3 grid gap-2 sm:grid-cols-3">${views}</div>
      <p class="mt-4 text-xs text-muted">Le bouton « Démo » en bas de l'écran permet de changer de vue à tout moment.</p>
    </div>`;
  document.body.append(dlg);
  dlg.addEventListener('close', () => dlg.remove());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  dlg.querySelector('[data-close]').addEventListener('click', () => dlg.close());
  dlg.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.view) tokenStore.set(b.dataset.view); else tokenStore.clear();
    location.href = b.dataset.view === 'mock-1' ? '/admin' : '/';
  }));
  dlg.showModal();
}
document.querySelector('[data-demo-about]')?.addEventListener('click', openAbout);
