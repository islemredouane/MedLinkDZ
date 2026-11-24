import '../core/layout.js';
import { annonceApi, assetUrl, IS_MOCK } from '../core/api.js';
import { getUser } from '../core/auth.js';
import { $, esc, setHTML, fmtLong, fmtMonthYear } from '../core/dom.js';
import { placeholderArt, typeTag, wilayaCode } from '../components/annonce-card.js';
import { WILAYAS } from '../data/wilayas.js';
import { toast } from '../core/toast.js';

const view = $('[data-view]');
const id = location.pathname.match(/\/annonce\/([^/]+)/)?.[1] || new URLSearchParams(location.search).get('id');

if (document.referrer && new URL(document.referrer).origin === location.origin) {
  $('[data-back]').addEventListener('click', (e) => { e.preventDefault(); history.back(); });
}

function errorView(title) {
  setHTML(view, `<div class="mx-auto flex max-w-md flex-col items-center py-20 text-center">
    <span class="grid size-14 place-items-center rounded-2xl bg-danger-soft text-danger"><i data-lucide="circle-alert" class="size-6"></i></span>
    <h1 class="mt-6 text-3xl font-semibold">${esc(title)}</h1>
    <p class="mt-2">L'annonce a peut-être été retirée ou n'est plus disponible.</p>
    <a href="/search" class="btn btn-outline mt-8">Retour à la recherche</a>
  </div>`);
}

function infoRow(icon, label, value) {
  return `<div class="flex items-start gap-3 py-4">
    <i data-lucide="${icon}" class="mt-0.5 size-[18px] text-muted"></i>
    <div><p class="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">${label}</p><p class="mt-1 font-medium text-text">${value}</p></div>
  </div>`;
}

async function load() {
  if (!id) return errorView('Annonce introuvable');
  let data;
  try {
    const res = await annonceApi.getById(id);
    data = res?.success && res.annonce;
    if (!data) return errorView('Annonce introuvable');
  } catch (err) {
    return errorView(err?.status === 404 ? 'Annonce introuvable' : "Impossible de charger l'annonce");
  }

  const a = {
    type: data.type === 'DON' ? 'offre' : 'demande',
    name: data.dci || data.marque || 'Médicament',
    category: data.categorie_nom || 'Autre',
    wilayaId: data.wilaya_id ?? null,
    wilaya: data.wilaya_nom || WILAYAS.find((w) => String(w.id) === String(data.wilaya_id))?.name || '—',
    date: data.created_at,
    description: data.description || '',
    quantity: data.quantite,
    expiry: data.date_peremption || null,
    contact: data.user_phone || null,
    author: `${data.user_prenom || ''} ${data.user_nom || ''}`.trim() || 'Membre MedLink',
    joined: data.user_joined ? fmtMonthYear(data.user_joined) : null,
    imageUrl: data.medias?.length ? assetUrl(data.medias[0].url) : null,
  };
  document.title = `${a.name} — ${a.type === 'offre' ? 'Offre' : 'Demande'} · MedLink DZ`;

  const user = await getUser();
  const accent = a.type === 'offre' ? 'brand' : 'signal';
  const authorInitials = a.author.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase();

  const contactBlock = !user
    ? `<a href="/login?next=${encodeURIComponent(location.pathname)}" class="btn btn-dark w-full">${'<i data-lucide="lock"></i>'} Se connecter pour voir le contact</a>
       <p class="mt-3 text-center text-xs text-muted">Le numéro n'est visible que par les membres connectés.</p>`
    : `<button type="button" class="btn btn-${a.type === 'offre' ? 'primary' : 'signal'} w-full" data-reveal-contact><i data-lucide="phone"></i> Afficher le contact</button>
       <div class="hidden" data-contact>
         <a ${a.contact && !IS_MOCK ? `href="tel:${esc(a.contact.replace(/\s/g, ''))}"` : ''} class="flex items-center justify-between rounded-2xl border border-line bg-paper px-4 py-3.5">
           <span><span class="block font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Téléphone${IS_MOCK ? ' · fictif' : ''}</span>
           <span class="mt-0.5 block font-display text-xl font-semibold tracking-wide text-text">${esc(a.contact || 'Non disponible')}</span></span>
           ${a.contact ? '<i data-lucide="phone" class="size-5 text-brand"></i>' : ''}
         </a>
       </div>`;

  setHTML(view, `
    <div class="grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-14">
      <div class="animate-rise">
        <div class="relative aspect-[16/10] overflow-hidden rounded-3xl border border-line bg-surface">
          ${placeholderArt(a, 'text-[9rem]')}
          ${a.imageUrl ? `<img src="${esc(a.imageUrl)}" alt="${esc(a.name)}" class="absolute inset-0 size-full object-cover" onerror="this.remove()">` : ''}
          <div class="absolute left-4 top-4">${typeTag(a.type)}</div>
        </div>

        <div class="mt-10">
          <p class="font-mono text-xs uppercase tracking-[0.16em] text-muted">${esc(a.category)}</p>
          <h1 class="mt-3 text-4xl font-semibold leading-tight md:text-5xl">${esc(a.name)}</h1>
          <div class="mt-5 flex flex-wrap gap-2">
            <span class="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-sm"><span class="font-mono text-xs text-muted">${wilayaCode(a.wilayaId)}</span>${esc(a.wilaya)}</span>
            <span class="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-sm"><i data-lucide="calendar" class="size-4 text-muted"></i>${a.date ? fmtLong(a.date) : '—'}</span>
            ${a.type === 'offre' && a.expiry ? `<span class="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-sm"><i data-lucide="hourglass" class="size-4 text-muted"></i>Expire le ${esc(new Date(`${a.expiry}T12:00:00`).toLocaleDateString('fr-FR'))}</span>` : ''}
            ${a.quantity ? `<span class="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-sm"><i data-lucide="package" class="size-4 text-muted"></i>${esc(a.quantity)} unité${a.quantity > 1 ? 's' : ''}</span>` : ''}
          </div>

          <div class="mt-10 border-t border-line pt-8">
            <h2 class="text-lg font-semibold">Description</h2>
            <p class="mt-4 whitespace-pre-line text-[17px] leading-relaxed text-text/85">${a.description ? esc(a.description) : '<span class="text-muted">Aucune description fournie.</span>'}</p>
          </div>
        </div>
      </div>

      <aside class="animate-rise [animation-delay:.1s] lg:sticky lg:top-28 lg:self-start">
        <div class="card overflow-hidden">
          <div class="h-1.5 bg-${accent}"></div>
          <div class="p-6">
            <p class="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">${a.type === 'offre' ? 'Proposé par' : 'Recherché par'}</p>
            <div class="mt-4 flex items-center gap-3">
              <span class="grid size-12 place-items-center rounded-full bg-paper-2 font-mono text-sm font-semibold text-text">${esc(authorInitials || '·')}</span>
              <div><p class="font-semibold text-text">${esc(a.author)}</p>${a.joined ? `<p class="text-sm text-muted">Membre depuis ${esc(a.joined)}</p>` : ''}</div>
            </div>
            <div class="mt-6 divide-y divide-line border-y border-line">
              ${infoRow('map-pin', 'Wilaya', `${esc(a.wilaya)}`)}
              ${infoRow(a.type === 'offre' ? 'hand-heart' : 'search', 'Type', a.type === 'offre' ? 'Don gratuit' : 'Recherche')}
            </div>
            <div class="mt-6">${contactBlock}</div>
            <button type="button" class="btn btn-ghost btn-sm mt-3 w-full" data-share><i data-lucide="send"></i>Partager l'annonce</button>
          </div>
        </div>

        <div class="notice notice-info mt-4">
          <i data-lucide="shield-check"></i>
          <div><strong class="text-text">Conseils de sécurité</strong>Vérifiez la date de péremption et l'intégrité de l'emballage. Échangez dans un lieu public.</div>
        </div>
      </aside>
    </div>`);

  view.querySelector('[data-reveal-contact]')?.addEventListener('click', (e) => {
    e.currentTarget.remove();
    view.querySelector('[data-contact]').classList.remove('hidden');
  });
  view.querySelector('[data-share]').addEventListener('click', async () => {
    const url = location.href;
    try {
      if (navigator.share) await navigator.share({ title: document.title, url });
      else { await navigator.clipboard.writeText(url); toast('Lien copié dans le presse-papiers', 'success'); }
    } catch { /* share cancelled */ }
  });
}

load();
