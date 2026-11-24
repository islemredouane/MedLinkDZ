import '../core/layout.js';
import { requireAuth } from '../core/auth.js';
import { annonceApi, errorMessage } from '../core/api.js';
import { $, $$, esc, setHTML, fmtShort } from '../core/dom.js';
import { statusInfo, emptyStateHTML } from '../components/annonce-card.js';
import { confirmDialog } from '../components/confirm.js';
import { toast } from '../core/toast.js';

await requireAuth();

const listEl = $('[data-list]');
let items = [];
// ?statut=publiee|en_attente|rejetee opens the list pre-filtered (used by the member home counts)
const requested = new URLSearchParams(location.search).get('statut');
let filter = ['publiee', 'en_attente', 'rejetee'].includes(requested) ? requested : 'all';

const normalize = (a) => ({
  id: a.id,
  name: a.marque || a.dci || a.medicamentNom || a.titre || 'Médicament',
  type: String(a.type).toUpperCase() === 'DON' || String(a.type).toLowerCase() === 'offre' ? 'offre' : 'demande',
  status: statusInfo(a.statut || a.status),
  date: a.created_at || a.createdAt || a.date,
  quantity: a.quantite,
  rx: a.ordonnance_id ? ({ EN_ATTENTE: 'Ordonnance en attente', VALIDEE: 'Ordonnance validée', REJETEE: 'Ordonnance refusée' }[a.ordonnance_statut] || 'Ordonnance jointe') : null,
});

function render() {
  $$('[data-filter]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === filter)));
  ['all', 'publiee', 'en_attente', 'rejetee'].forEach((k) => {
    $(`[data-n="${k}"]`).textContent = k === 'all' ? items.length : items.filter((a) => a.status.key === k).length;
  });

  const list = filter === 'all' ? items : items.filter((a) => a.status.key === filter);
  if (!items.length) {
    listEl.className = 'mt-5';
    setHTML(listEl, emptyStateHTML({ icon: 'package-open', title: 'Aucune annonce publiée', text: 'Vos annonces apparaîtront ici avec leur statut de modération.', action: { href: '/publier', label: 'Publier une annonce' } }));
    return;
  }
  listEl.className = 'card mt-5 overflow-hidden';
  if (!list.length) {
    setHTML(listEl, '<p class="px-6 py-12 text-center text-sm text-muted">Aucune annonce avec ce statut.</p>');
    return;
  }
  setHTML(listEl, `<ul class="divide-y divide-line">${list.map((a) => `
    <li class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 px-4 py-4 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] sm:items-center sm:gap-x-4 sm:px-6" data-row="${esc(a.id)}">
      <span class="grid size-10 shrink-0 place-items-center rounded-xl ${a.type === 'offre' ? 'bg-brand-soft text-brand' : 'bg-signal-soft text-signal'}">
        <i data-lucide="${a.type === 'offre' ? 'hand-heart' : 'search'}" class="size-[18px]"></i>
      </span>
      <div class="min-w-0">
        <p class="line-clamp-2 font-medium leading-snug text-text sm:truncate">${esc(a.name)}</p>
        <p class="mt-1 truncate whitespace-nowrap font-mono text-[11px] text-muted">${a.type === 'offre' ? 'Offre' : 'Demande'}${a.quantity ? ` · ${esc(a.quantity)} u.` : ''} · ${esc(fmtShort(a.date))}${a.rx ? ` · ${esc(a.rx)}` : ''}<span class="hidden sm:inline"> ${esc(new Date(a.date).getFullYear() || '')}</span></p>
        <span class="tag ${a.status.cls} mt-2.5 sm:hidden">${esc(a.status.label)}</span>
      </div>
      <span class="tag ${a.status.cls} hidden sm:inline-flex">${esc(a.status.label)}</span>
      <div class="-mr-1.5 -mt-1 flex gap-0.5 sm:m-0 sm:gap-1">
        ${a.status.key === 'publiee' ? `<a href="/annonce/${esc(a.id)}" class="grid size-9 place-items-center rounded-full text-muted hover:bg-paper-2 hover:text-text" aria-label="Voir l'annonce" title="Voir l'annonce"><i data-lucide="eye" class="size-4"></i></a>` : ''}
        <button type="button" class="grid size-9 place-items-center rounded-full text-muted hover:bg-danger-soft hover:text-danger" aria-label="Supprimer ${esc(a.name)}" title="Supprimer" data-delete="${esc(a.id)}"><i data-lucide="trash-2" class="size-4"></i></button>
      </div>
    </li>`).join('')}</ul>`);
}

$('[data-filters]').addEventListener('click', (e) => {
  const b = e.target.closest('[data-filter]');
  if (b) { filter = b.dataset.filter; render(); }
});

listEl.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-delete]');
  if (!btn) return;
  const item = items.find((a) => String(a.id) === btn.dataset.delete);
  const ok = await confirmDialog({ title: 'Supprimer cette annonce ?', message: `« ${item?.name} » sera définitivement supprimée.`, confirmLabel: 'Supprimer', danger: true });
  if (!ok) return;
  btn.disabled = true;
  try {
    await annonceApi.remove(btn.dataset.delete);
    items = items.filter((a) => String(a.id) !== btn.dataset.delete);
    render();
    toast('Annonce supprimée', 'success');
  } catch (err) {
    btn.disabled = false;
    toast(errorMessage(err, 'Impossible de supprimer cette annonce.'), 'error');
  }
});

annonceApi.myAnnonces()
  .then((data) => { items = (Array.isArray(data) ? data : data?.annonces || []).map(normalize); render(); })
  .catch(() => setHTML(listEl, emptyStateHTML({ icon: 'triangle-alert', title: 'Impossible de charger vos annonces', text: 'Vérifiez votre connexion puis réessayez.' })));
