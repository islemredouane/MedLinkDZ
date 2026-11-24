import { assetUrl } from '../core/api.js';
import { esc, timeAgo } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { WILAYAS } from '../data/wilayas.js';

/** Normalise an annonce from the API into what the UI needs. */
export function mapAnnonce(a = {}) {
  const imagePath = a.imageUrl || a.image_url || a.image || a.medias?.[0]?.url || null;
  const wilayaId = a.wilaya_id ?? a.wilayaId ?? null;
  return {
    id: a.id,
    type: a.type === 'DON' ? 'offre' : 'demande',
    name: a.dci || a.marque || a.titre || 'Médicament',
    category: a.categorie_nom || a.category || 'Autre',
    wilaya: a.wilaya_nom || a.wilaya || WILAYAS.find((w) => String(w.id) === String(wilayaId))?.name || '—',
    wilayaId,
    date: a.created_at || a.date || null,
    imageUrl: imagePath ? assetUrl(imagePath) : null,
    description: a.description || '',
    quantity: a.quantite ?? null,
    expiry: a.date_peremption || null, // 'YYYY-MM-DD', offers only
  };
}

/** '2027-03-01' → '03/2027' (noon avoids any timezone shift) */
export const fmtExpiry = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', { month: '2-digit', year: 'numeric' });

export const typeLabel = (type) => (type === 'offre' ? 'Offre' : 'Demande');
export const typeTag = (type) => `<span class="tag tag-${type}">${typeLabel(type)}</span>`;
export const wilayaCode = (id) => (id != null && id !== '' ? String(id).padStart(2, '0') : '··');

const monogram = (name) => name.replace(/[^\p{L}\p{N} ]/gu, '').trim().slice(0, 2).toUpperCase() || 'Rx';

/** Visual used when an annonce has no photo: tinted label with a monogram. */
export function placeholderArt(a, size = 'text-7xl') {
  const tint = a.type === 'offre' ? 'bg-brand-soft text-brand' : 'bg-signal-soft text-signal';
  return `<div class="grid-lines absolute inset-0 ${tint} flex items-center justify-center">
    <span class="font-display ${size} font-bold tracking-tighter opacity-25">${esc(monogram(a.name))}</span>
  </div>`;
}

/** reveal: fade the card in when it scrolls into view (off when re-rendering filtered results). */
export function annonceCardHTML(a, { reveal = true } = {}) {
  const media = a.imageUrl
    ? `<img src="${esc(a.imageUrl)}" alt="" loading="lazy" class="absolute inset-0 size-full object-cover" onerror="this.remove()">`
    : '';
  return `
  <a href="/annonce/${esc(a.id)}" class="${reveal ? 'reveal ' : ''}lift group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
    <div class="relative aspect-[16/10] overflow-hidden border-b border-line">
      <div class="lift-media absolute inset-0">${placeholderArt(a)}${media}</div>
      <div class="absolute left-3 top-3">${typeTag(a.type)}</div>
      <span class="absolute right-3 top-3 grid size-8 translate-y-1 place-items-center rounded-full bg-white/90 text-text opacity-0 shadow-card backdrop-blur transition-[opacity,translate] duration-300 ease-out-soft group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100" aria-hidden="true">${icon('arrow-up-right', 'size-4')}</span>
    </div>
    <div class="flex flex-1 flex-col p-5">
      <p class="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">${esc(a.category)}${a.type === 'offre' && a.expiry ? ` · Exp. ${esc(fmtExpiry(a.expiry))}` : ''}</p>
      <h3 class="mb-5 mt-1.5 line-clamp-2 text-lg font-semibold leading-snug">${esc(a.name)}</h3>
      <div class="mt-auto flex items-center justify-between gap-3 border-t border-dashed border-line pt-4 text-[13px]">
        <span class="flex min-w-0 items-center gap-2 text-body">
          <span class="rounded-md bg-paper-2 px-1.5 py-0.5 font-mono text-[11px] font-medium text-text">${wilayaCode(a.wilayaId)}</span>
          <span class="truncate">${esc(a.wilaya)}</span>
        </span>
        <span class="shrink-0 font-mono text-[11px] text-muted">${a.date ? timeAgo(a.date) : ''}</span>
      </div>
    </div>
  </a>`;
}

export function cardSkeletonHTML() {
  return `<div class="overflow-hidden rounded-2xl border border-line bg-surface">
    <div class="skeleton aspect-[16/10] rounded-none"></div>
    <div class="space-y-3 p-5"><div class="skeleton h-3 w-24"></div><div class="skeleton h-5 w-3/4"></div><div class="skeleton mt-6 h-3 w-full"></div></div>
  </div>`;
}

/** Empty / error state block. */
export function emptyStateHTML({ icon = 'inbox', title, text, action }) {
  return `<div class="col-span-full flex flex-col items-center rounded-2xl border border-dashed border-line-strong bg-surface/60 px-6 py-16 text-center">
    <span class="grid size-12 place-items-center rounded-2xl bg-paper-2 text-muted"><i data-lucide="${icon}" class="size-6"></i></span>
    <h3 class="mt-5 text-lg font-semibold">${esc(title)}</h3>
    ${text ? `<p class="mt-1.5 max-w-sm text-sm">${esc(text)}</p>` : ''}
    ${action ? `<a href="${esc(action.href)}" class="btn btn-outline btn-sm mt-6">${esc(action.label)}</a>` : ''}
  </div>`;
}

/** Moderation status → label + tag class. */
export function statusInfo(raw) {
  const s = String(raw || '').toLowerCase();
  if (s === 'publiee') return { key: 'publiee', label: 'Publiée', cls: 'tag-offre' };
  if (s === 'en_attente') return { key: 'en_attente', label: 'En attente', cls: 'tag-pending' };
  if (s === 'rejetee') return { key: 'rejetee', label: 'Rejetée', cls: 'tag-danger' };
  if (s === 'suspendue') return { key: 'suspendue', label: 'Suspendue', cls: 'tag-danger' };
  return { key: 'terminee', label: raw && !['terminee', 'cloturee'].includes(s) ? String(raw) : 'Terminée', cls: 'tag-neutral' };
}
