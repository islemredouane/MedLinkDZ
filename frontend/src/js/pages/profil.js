import '../core/layout.js';
import { requireAuth, logout, isAdmin, initials, userWilayaId } from '../core/auth.js';
import { annonceApi, assetUrl } from '../core/api.js';
import { $, esc, setHTML, fmtMonthYear, fmtShort } from '../core/dom.js';
import { statusInfo } from '../components/annonce-card.js';
import { WILAYAS } from '../data/wilayas.js';

const user = await requireAuth();

const avatar = assetUrl(user.avatar_url);
$('[data-avatar]').innerHTML = avatar ? `<img src="${esc(avatar)}" alt="" class="size-full object-cover">` : esc(initials(user));
$('[data-fullname]').textContent = `${user.prenom || ''} ${user.nom || ''}`.trim() || 'Mon profil';
$('[data-admin-link]').hidden = !isAdmin(user);
$('[data-logout-btn]').addEventListener('click', logout);

const wilayaName = WILAYAS.find((w) => w.id === userWilayaId(user))?.name || user.wilaya;
setHTML($('[data-chips]'), [
  `<span class="tag tag-neutral">${isAdmin(user) ? 'Administrateur' : 'Membre'}</span>`,
  user.is_verified ? '<span class="tag tag-offre">Compte vérifié</span>' : '<span class="tag tag-pending">À vérifier</span>',
  user.created_at ? `<span class="tag tag-neutral">Depuis ${esc(fmtMonthYear(user.created_at))}</span>` : '',
].join(''));

const row = (icon, label, value) => `<div class="flex items-center gap-4 py-4">
  <i data-lucide="${icon}" class="size-[18px] text-muted"></i>
  <div class="min-w-0"><dt class="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">${label}</dt><dd class="mt-0.5 truncate font-medium text-text">${esc(value)}</dd></div>
</div>`;
setHTML($('[data-info]'), [
  row('mail', 'Email', user.email || '—'),
  row('phone', 'Téléphone', user.phone || '—'),
  row('map-pin', 'Wilaya', wilayaName || '—'),
].join(''));

const recent = $('[data-recent]');
annonceApi.myAnnonces()
  .then((data) => {
    const list = Array.isArray(data) ? data : data?.annonces || [];
    const count = (k) => list.filter((a) => statusInfo(a.statut || a.status).key === k).length;
    $('[data-stat="total"]').textContent = list.length;
    $('[data-stat="publiee"]').textContent = count('publiee');
    $('[data-stat="en_attente"]').textContent = count('en_attente');

    if (!list.length) {
      setHTML(recent, `<li class="py-8 text-center text-sm text-muted">Vous n'avez encore publié aucune annonce.</li>`);
      return;
    }
    setHTML(recent, list.slice(0, 4).map((a) => {
      const s = statusInfo(a.statut || a.status);
      const type = String(a.type).toUpperCase() === 'DON' || String(a.type).toLowerCase() === 'offre' ? 'offre' : 'demande';
      return `<li class="flex items-center gap-4 py-4">
        <span class="mt-2 size-2 shrink-0 self-start rounded-full sm:mt-0 sm:self-center ${type === 'offre' ? 'bg-brand' : 'bg-signal'}"></span>
        <div class="min-w-0 flex-1">
          <p class="line-clamp-2 font-medium leading-snug text-text sm:truncate">${esc(a.marque || a.dci || a.titre || 'Médicament')}</p>
          <p class="mt-0.5 truncate whitespace-nowrap font-mono text-[11px] text-muted">${type === 'offre' ? 'Offre' : 'Demande'} · ${esc(fmtShort(a.created_at))}</p>
          <span class="tag ${s.cls} mt-2 sm:hidden">${esc(s.label)}</span>
        </div>
        <span class="tag ${s.cls} hidden sm:inline-flex">${esc(s.label)}</span>
      </li>`;
    }).join(''));
  })
  .catch(() => {
    setHTML(recent, `<li class="py-8 text-center text-sm text-muted">Impossible de charger vos annonces.</li>`);
  });
