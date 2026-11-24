import '../core/layout.js';
import { requireAuth } from '../core/auth.js';
import { adminApi, ordonnanceApi, errorMessage } from '../core/api.js';
import { $, esc, setHTML, showNotice, fmtDate } from '../core/dom.js';
import { emptyStateHTML } from '../components/annonce-card.js';
import { toast } from '../core/toast.js';

await requireAuth({ admin: true });

const listEl = $('[data-list]');
let items = [];

const todayISO = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const fmtExpiry = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', { month: '2-digit', year: 'numeric' });

function detailsLine(a, type) {
  const parts = [];
  if (a.categorie_nom) parts.push(esc(a.categorie_nom));
  if (a.quantite) parts.push(`${esc(a.quantite)} u.`);
  if (type === 'offre' && a.date_peremption) {
    const expired = a.date_peremption < todayISO();
    parts.push(`<span class="${expired ? 'font-semibold text-danger' : ''}">Exp. ${esc(fmtExpiry(a.date_peremption))}${expired ? ' · périmé' : ''}</span>`);
  }
  return parts.length ? `<p class="mt-0.5 font-mono text-[11px] text-muted">${parts.join(' · ')}</p>` : '';
}

// Requests: attached prescription (viewable) + the "this medicine needs a prescription" switch
function prescriptionBlock(a) {
  const attached = a.ordonnance_id
    ? `<span class="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand"><i data-lucide="file-text" class="size-3.5"></i>Ordonnance jointe</span>
       <button type="button" class="text-xs font-semibold text-text underline underline-offset-4 hover:text-brand" data-view-rx="${esc(a.ordonnance_id)}">Voir</button>`
    : `<span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${a.prescription_required ? 'bg-danger-soft text-danger' : 'bg-paper-2 text-body'}"><i data-lucide="file-warning" class="size-3.5"></i>Sans ordonnance</span>`;
  return `<div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
    ${attached}
    <label class="inline-flex cursor-pointer items-center gap-1.5 text-xs text-body" title="S'applique à toutes les futures demandes de ce médicament">
      <input type="checkbox" class="size-3.5 accent-brand" data-rx-flag="${esc(a.medicament_id)}" ${a.prescription_required ? 'checked' : ''}>Exige une ordonnance
    </label>
  </div>`;
}

function render() {
  $('[data-count]').textContent = `${items.length} en attente`;
  if (!items.length) {
    listEl.className = 'mt-4';
    setHTML(listEl, emptyStateHTML({ icon: 'circle-check', title: 'Tout est à jour', text: 'Aucune annonce à modérer pour le moment.' }));
    return;
  }
  listEl.className = 'card mt-4 overflow-hidden';
  setHTML(listEl, `
    <div class="hidden grid-cols-[1.8fr_.7fr_1fr_.8fr_auto] gap-4 border-b border-line bg-paper px-6 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted md:grid">
      <span>Médicament</span><span>Type</span><span>Auteur</span><span>Date</span><span class="w-[212px] text-right">Décision</span>
    </div>
    <ul class="divide-y divide-line">${items.map((a) => {
      const type = String(a.type || '').toUpperCase() === 'DEMANDE' ? 'demande' : 'offre';
      return `<li class="grid gap-3 px-5 py-5 md:grid-cols-[1.8fr_.7fr_1fr_.8fr_auto] md:items-start md:gap-4 md:px-6" data-row="${esc(a.id)}">
        <div class="min-w-0">
          <p class="truncate font-semibold text-text">${esc(a.marque || a.dci || '—')}</p>
          ${detailsLine(a, type)}
          ${a.description ? `<p class="mt-1 line-clamp-2 text-sm text-muted">${esc(a.description)}</p>` : ''}
          ${type === 'demande' ? prescriptionBlock(a) : ''}
        </div>
        <span><span class="tag tag-${type}">${type === 'offre' ? 'Offre' : 'Demande'}</span></span>
        <span class="text-sm text-text">${a.user_prenom || a.user_nom ? esc(`${a.user_prenom || ''} ${a.user_nom || ''}`.trim()) : '—'}</span>
        <span class="font-mono text-xs text-muted">${a.created_at ? esc(fmtDate(a.created_at)) : '—'}</span>
        <div class="flex gap-2 md:justify-end">
          <button type="button" class="btn btn-sm btn-primary flex-1 md:flex-none" data-act="approve" data-id="${esc(a.id)}"><i data-lucide="check"></i>Approuver</button>
          <button type="button" class="btn btn-sm btn-danger flex-1 md:flex-none" data-act="reject" data-id="${esc(a.id)}"><i data-lucide="x"></i>Rejeter</button>
        </div>
      </li>`;
    }).join('')}</ul>`);
}

listEl.addEventListener('click', async (e) => {
  // View a prescription: fetched with the admin token, opened as a temporary local URL
  const view = e.target.closest('[data-view-rx]');
  if (view) {
    const tab = window.open('', '_blank'); // opened synchronously so popup blockers allow it
    try {
      const blob = await ordonnanceApi.fileBlob(view.dataset.viewRx);
      const url = URL.createObjectURL(blob);
      if (tab) tab.location.href = url; else window.location.assign(url);
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      tab?.close();
      toast(errorMessage(err, "Impossible d'ouvrir l'ordonnance."), 'error');
    }
    return;
  }

  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const { id, act } = btn.dataset;
  const row = btn.closest('[data-row]');
  row.querySelectorAll('button, input').forEach((b) => { b.disabled = true; });
  showNotice($('[data-feedback]'), '');
  try {
    // The backend also validates / rejects the attached prescription with the annonce
    await adminApi.moderateAnnonce(id, act === 'approve' ? 'PUBLIEE' : 'REJETEE');
    items = items.filter((i) => String(i.id) !== id);
    render();
    toast(act === 'approve' ? 'Annonce publiée' : 'Annonce rejetée', act === 'approve' ? 'success' : 'info');
  } catch (err) {
    row.querySelectorAll('button, input').forEach((b) => { b.disabled = false; });
    showNotice($('[data-feedback]'), 'error', act === 'approve' ? "Erreur lors de l'approbation" : 'Erreur lors du rejet', errorMessage(err, ''));
  }
});

// "Exige une ordonnance": marks the medicine (applies to every future request for it)
listEl.addEventListener('change', async (e) => {
  const box = e.target.closest('[data-rx-flag]');
  if (!box) return;
  const medId = box.dataset.rxFlag;
  const required = box.checked;
  box.disabled = true;
  try {
    await adminApi.setPrescriptionRequired(medId, required);
    items.forEach((i) => { if (String(i.medicament_id) === medId) i.prescription_required = required; });
    render();
    toast(required ? 'Ce médicament exige désormais une ordonnance.' : "Ce médicament n'exige plus d'ordonnance.", 'success');
  } catch (err) {
    box.checked = !required;
    box.disabled = false;
    toast(errorMessage(err, 'Modification impossible.'), 'error');
  }
});

adminApi.pending()
  .then((data) => { items = Array.isArray(data?.annonces) ? data.annonces : []; render(); })
  .catch(() => {
    listEl.className = 'mt-4';
    setHTML(listEl, emptyStateHTML({ icon: 'triangle-alert', title: 'Erreur au chargement des annonces', text: 'Vérifiez votre connexion puis réessayez.' }));
  });
