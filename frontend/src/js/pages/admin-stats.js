import '../core/layout.js';
import { requireAuth } from '../core/auth.js';
import { adminApi, errorMessage } from '../core/api.js';
import { $, esc, setHTML, fmtDate } from '../core/dom.js';
import { emptyStateHTML } from '../components/annonce-card.js';
import { confirmDialog } from '../components/confirm.js';
import { toast } from '../core/toast.js';

const me = await requireAuth({ admin: true });

const KPIS = [
  { key: 'totalUsers', label: 'Utilisateurs', icon: 'users' },
  { key: 'totalAnnonces', label: 'Annonces', icon: 'file-text' },
  { key: 'publishedAnnonces', label: 'Publiées', icon: 'circle-check', tone: 'text-brand' },
  { key: 'pendingAnnonces', label: 'En attente', icon: 'hourglass', tone: 'text-amber' },
];
const ROLES = { ADMIN: 'Admin', USER: 'Membre', PHARMACY: 'Pharmacie' };

let stats = {};
let users = [];
let query = '';
const usersEl = $('[data-users]');
const val = (k) => stats?.[k] ?? stats?.counts?.[k] ?? 0;
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function paintKpis() {
  setHTML($('[data-kpis]'), KPIS.map((k) => `<div class="bg-surface p-6">
    <p class="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted"><i data-lucide="${k.icon}" class="size-4"></i>${k.label}</p>
    <p class="mt-3 font-display text-4xl font-semibold ${k.tone || 'text-text'}">${Number(val(k.key)).toLocaleString('fr-FR')}</p>
  </div>`).join(''));
}

function paintUsers() {
  const q = norm(query.trim());
  const list = users.filter((u) => !q || norm(`${u.prenom} ${u.nom} ${u.email} ${u.phone}`).includes(q));
  if (!users.length) { setHTML(usersEl, emptyStateHTML({ icon: 'users', title: 'Aucun utilisateur trouvé' })); return; }
  if (!list.length) { setHTML(usersEl, '<p class="px-6 py-12 text-center text-sm text-muted">Aucun utilisateur ne correspond.</p>'); return; }

  const name = (u) => esc(`${u.prenom || ''} ${u.nom || ''}`.trim() || '—');
  const roleTag = (u) => `<span class="tag ${u.role === 'ADMIN' ? 'tag-ink' : 'tag-neutral'}">${esc(ROLES[u.role] || ROLES.USER)}</span>`;
  const statusTag = (u) => (u.is_suspended ? '<span class="tag tag-danger">Suspendu</span>' : u.is_verified ? '<span class="tag tag-offre">Vérifié</span>' : '<span class="tag tag-pending">Non vérifié</span>');
  const isSelf = (u) => String(u.id) === String(me.id);
  const you = '<span class="font-mono text-[10px] font-normal text-muted">(vous)</span>';
  const suspendBtn = (u, cls = '') => `<button type="button" class="btn btn-sm btn-ghost ${cls}" data-suspend="${esc(u.id)}" data-to="${!u.is_suspended}">
      <i data-lucide="${u.is_suspended ? 'refresh-cw' : 'ban'}"></i>${u.is_suspended ? 'Réactiver' : 'Suspendre'}</button>`;
  const deleteBtn = (u) => `<button type="button" class="grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-danger-soft hover:text-danger" aria-label="Supprimer le compte de ${name(u)}" title="Supprimer le compte" data-del="${esc(u.id)}"><i data-lucide="trash-2" class="size-4"></i></button>`;

  // Phones: one compact card per user. Tablet and up: a table.
  const cards = `<ul class="divide-y divide-line md:hidden">${list.map((u) => `
    <li class="px-4 py-4 ${u.is_suspended ? 'bg-danger-soft/40' : ''}">
      <div class="flex items-start gap-3">
        <span class="grid size-10 shrink-0 place-items-center rounded-full bg-paper-2 font-mono text-xs font-semibold text-text">${esc(((u.prenom || '')[0] || '') + ((u.nom || '')[0] || '')).toUpperCase() || '·'}</span>
        <div class="min-w-0 flex-1">
          <p class="truncate font-medium text-text">${name(u)} ${isSelf(u) ? you : ''}</p>
          <p class="truncate text-xs text-muted">${esc(u.email)}</p>
          <div class="mt-2.5 flex flex-wrap gap-1.5">${roleTag(u)}${statusTag(u)}</div>
          <p class="mt-2.5 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[11px] text-muted"><span class="whitespace-nowrap">${esc(u.phone || '—')}</span><span class="whitespace-nowrap">${esc(u.annonce_count ?? 0)} annonce${(u.annonce_count ?? 0) > 1 ? 's' : ''}</span><span class="whitespace-nowrap">Inscrit ${esc(fmtDate(u.created_at))}</span></p>
        </div>
      </div>
      ${isSelf(u) ? '' : `<div class="mt-3 flex items-center justify-end gap-1 border-t border-dashed border-line pt-3">${suspendBtn(u)}${deleteBtn(u)}</div>`}
    </li>`).join('')}</ul>`;

  const table = `<div class="hidden overflow-x-auto md:block"><table class="w-full min-w-[760px] text-left text-sm">
    <thead class="border-b border-line bg-paper font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
      <tr><th class="px-6 py-3 font-medium">Utilisateur</th><th class="px-4 py-3 font-medium">Téléphone</th><th class="px-4 py-3 font-medium">Rôle</th>
      <th class="px-4 py-3 font-medium">Statut</th><th class="px-4 py-3 text-right font-medium">Annonces</th><th class="px-4 py-3 font-medium">Inscrit</th><th class="px-6 py-3"><span class="sr-only">Actions</span></th></tr>
    </thead>
    <tbody class="divide-y divide-line">${list.map((u) => `<tr class="${u.is_suspended ? 'bg-danger-soft/40' : ''}">
        <td class="px-6 py-4"><p class="font-medium text-text">${name(u)} ${isSelf(u) ? you : ''}</p><p class="text-xs text-muted">${esc(u.email)}</p></td>
        <td class="whitespace-nowrap px-4 py-4 font-mono text-xs">${esc(u.phone || '—')}</td>
        <td class="px-4 py-4">${roleTag(u)}</td>
        <td class="px-4 py-4">${statusTag(u)}</td>
        <td class="px-4 py-4 text-right font-mono">${esc(u.annonce_count ?? 0)}</td>
        <td class="whitespace-nowrap px-4 py-4 font-mono text-xs text-muted">${esc(fmtDate(u.created_at))}</td>
        <td class="px-6 py-4">${isSelf(u) ? '' : `<div class="flex justify-end gap-1">${suspendBtn(u)}${deleteBtn(u)}</div>`}</td>
      </tr>`).join('')}</tbody></table></div>`;

  setHTML(usersEl, cards + table);
}

$('[data-filter]').addEventListener('input', (e) => { query = e.target.value; paintUsers(); });

usersEl.addEventListener('click', async (e) => {
  const sus = e.target.closest('[data-suspend]');
  const del = e.target.closest('[data-del]');
  if (sus) {
    const id = sus.dataset.suspend;
    const suspend = sus.dataset.to === 'true';
    const u = users.find((x) => String(x.id) === id);
    const ok = await confirmDialog({
      title: suspend ? 'Suspendre ce compte ?' : 'Réactiver ce compte ?',
      message: `${u.prenom} ${u.nom} ${suspend ? 'ne pourra plus se connecter ni publier.' : 'retrouvera un accès complet.'}`,
      confirmLabel: suspend ? 'Suspendre' : 'Réactiver', danger: suspend,
    });
    if (!ok) return;
    try {
      await adminApi.suspendUser(id, suspend);
      u.is_suspended = suspend;
      paintUsers();
      toast(suspend ? 'Compte suspendu' : 'Compte réactivé', 'success');
    } catch (err) { toast(errorMessage(err, "Erreur lors de l'opération"), 'error'); }
  }
  if (del) {
    const id = del.dataset.del;
    const u = users.find((x) => String(x.id) === id);
    const ok = await confirmDialog({
      title: 'Supprimer définitivement ce compte ?',
      message: `Le compte de ${u.prenom} ${u.nom} et toutes ses annonces seront supprimés. Cette action est irréversible.`,
      confirmLabel: 'Supprimer', danger: true,
    });
    if (!ok) return;
    try {
      await adminApi.deleteUser(id);
      users = users.filter((x) => String(x.id) !== id);
      stats = { ...stats, totalUsers: Math.max(0, (stats.totalUsers || 1) - 1) };
      paintKpis();
      paintUsers();
      toast('Compte supprimé', 'success');
    } catch (err) { toast(errorMessage(err, 'Erreur lors de la suppression'), 'error'); }
  }
});

Promise.all([adminApi.stats(), adminApi.users()])
  .then(([s, u]) => {
    stats = s?.stats || s || {};
    users = u?.users || [];
    paintKpis();
    paintUsers();
  })
  .catch((err) => {
    setHTML($('[data-kpis]'), '');
    setHTML(usersEl, emptyStateHTML({ icon: 'triangle-alert', title: 'Erreur de chargement', text: errorMessage(err, 'Vérifiez votre connexion puis réessayez.') }));
  });
