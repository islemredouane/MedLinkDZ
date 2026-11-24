/* Demo / portfolio mode only (loaded when VITE_MOCK=1): behaviour of the "Projet de démonstration" bar
   (markup injected at build time by vite.config.js): close it for the session, and open the "En savoir plus" dialog
   with one-click Admin / Membre / Visiteur views and a reset of the demo data. */
import { tokenStore, resetDemoData } from '../core/api.js';
import { icon } from '../core/icons.js';

const ACCOUNTS = [
  { token: 'mock-1', label: 'Admin', hint: 'Modération, statistiques' },
  { token: 'mock-2', label: 'Membre', hint: 'Publier, suivre ses annonces' },
  { token: null, label: 'Visiteur', hint: 'Découvrir et rechercher' },
];
const active = ACCOUNTS.find((a) => a.token === tokenStore.get()) || ACCOUNTS[2];

const REPO_URL = 'https://github.com/islemredouane/MedLinkDZ';
const STRIP_KEY = 'medlink_demo_strip';
document.querySelector('[data-demo-strip-close]')?.addEventListener('click', () => {
  document.documentElement.classList.add('demo-strip-off');
  try { sessionStorage.setItem(STRIP_KEY, 'off'); } catch { /* storage blocked */ }
});

/* "En savoir plus": what this demo is, one-click views, reset */
function openAbout() {
  const dlg = document.createElement('dialog');
  dlg.className = 'm-auto w-[min(520px,calc(100vw-32px))] rounded-3xl border border-line bg-surface p-0 text-body shadow-lift backdrop:bg-ink/50 backdrop:backdrop-blur-sm';
  dlg.setAttribute('aria-labelledby', 'demo-about-title');
  const views = ACCOUNTS.map((a) => `
    <button type="button" data-view="${a.token ?? ''}" class="group flex flex-col items-start rounded-2xl border border-line p-3.5 text-left transition hover:border-brand/50 hover:bg-brand-soft/40 ${a === active ? 'border-brand/60 bg-brand-soft/50' : ''}">
      <span class="font-medium text-text">${a.label}</span>
      <span class="mt-0.5 text-xs text-muted">${a.hint}</span>
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
      <a href="${REPO_URL}" target="_blank" rel="noopener noreferrer" class="group mt-5 flex items-center gap-3.5 rounded-2xl border border-line bg-paper p-3.5 transition hover:border-brand/50 hover:bg-brand-soft/40">
        <span class="grid size-10 shrink-0 place-items-center rounded-xl bg-ink text-white">${icon('github', 'size-5')}</span>
        <span class="min-w-0 flex-1"><span class="block text-sm font-medium text-text">Le projet vous plaît ?</span><span class="block text-xs text-muted">Une étoile sur GitHub fait toujours plaisir.</span></span>
        <span class="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 py-1.5 text-[13px] font-medium text-text transition group-hover:border-text">Étoile ${icon('star', 'size-3.5 fill-[#F5B301] text-[#F5B301]')}</span>
      </a>
      <div class="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
        <p class="text-xs text-muted">Rouvrez cette fenêtre à tout moment avec « En savoir plus ».</p>
        <button type="button" data-demo-reset class="btn btn-ghost btn-sm shrink-0">${icon('rotate-ccw', 'size-4')}Réinitialiser</button>
      </div>
    </div>`;
  document.body.append(dlg);
  dlg.addEventListener('close', () => dlg.remove());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  dlg.querySelector('[data-close]').addEventListener('click', () => dlg.close());
  dlg.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.view) tokenStore.set(b.dataset.view); else tokenStore.clear();
    location.href = b.dataset.view === 'mock-1' ? '/admin' : '/';
  }));
  dlg.querySelector('[data-demo-reset]').addEventListener('click', () => {
    resetDemoData();
    location.reload();
  });
  dlg.showModal();
}
document.querySelector('[data-demo-about]')?.addEventListener('click', openAbout);
