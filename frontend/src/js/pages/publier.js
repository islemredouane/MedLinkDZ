import '../core/layout.js';
import { requireAuth, userWilayaId } from '../core/auth.js';
import { annonceApi, catalogApi, ordonnanceApi, errorMessage } from '../core/api.js';
import { $, $$, esc, setHTML, setLoading, showNotice } from '../core/dom.js';
import { icon } from '../core/icons.js';
import { wilayaSelect } from '../components/wilaya-select.js';
import { typeTag } from '../components/annonce-card.js';
import { toast } from '../core/toast.js';

// Fallback = the categories seeded by the backend (same IDs). Replaced by /api/catalog/categories when it loads.
let CATEGORIES = ['Antibiotiques', 'Cardiovasculaire', 'Diabète', 'Neurologie', 'Oncologie', 'Dermatologie', 'Pédiatrie', 'Ophtalmologie', 'Autre']
  .map((nom, i) => ({ id: String(i + 1), nom }));
const STEPS = ['Type', 'Médicament', 'Localisation', 'Confirmation'];
const BLANK = { type: '', name: '', category: '', quantity: '', expiryDate: '', description: '', image: null, rx: null };
const todayISO = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
let rxMedicines = new Set(); // lower-cased names of medicines that need a prescription
let uploadedRx = null;       // { file, id }: reused if the annonce submit has to be retried

const user = await requireAuth();
let step = 1;
let form = { ...BLANK };
let previewUrl = null;

const preset = new URLSearchParams(location.search).get('type');
if (preset === 'offre' || preset === 'demande') form.type = preset;

const wilaya = wilayaSelect($('[data-wilaya]'), { value: userWilayaId(user), placeholder: 'Choisir une wilaya', onChange: () => update() });
catalogApi.wilayas().then((r) => { const list = r?.wilayas || r; if (Array.isArray(list) && list.length) wilaya.setOptions(list); }).catch(() => {});
if (user?.phone) $('[data-phone-hint]').textContent = ` (${user.phone})`;

/* Categories (real IDs from the API) */
const paintCategories = () => setHTML($('[data-cats]'), CATEGORIES
  .map((c) => `<button type="button" class="chip" aria-pressed="false" data-cat="${esc(c.id)}">${esc(c.nom)}</button>`).join(''));
paintCategories();
catalogApi.categories().then((r) => {
  const list = r?.categories || r;
  if (Array.isArray(list) && list.length) { CATEGORIES = list.map((c) => ({ id: String(c.id), nom: c.nom })); paintCategories(); update(); }
}).catch(() => {});
const categoryName = (id) => CATEGORIES.find((c) => c.id === String(id))?.nom || '';

/* Medicines that need a prescription (to tell the member before they submit) */
catalogApi.medicaments().then((r) => {
  const list = r?.medicaments || r;
  if (!Array.isArray(list)) return;
  rxMedicines = new Set(list.filter((m) => m.prescription_required).flatMap((m) => [m.marque, m.dci]).filter(Boolean).map((n) => n.trim().toLowerCase()));
  update();
}).catch(() => {});
const needsRx = () => form.type === 'demande' && rxMedicines.has(form.name.trim().toLowerCase());

$('[data-expiry]').min = todayISO();

/* Stepper */
function paintStepper() {
  $$('[data-step-ind]').forEach((li) => {
    const n = Number(li.dataset.stepInd);
    const done = n < step;
    const current = n === step;
    li.className = 'flex shrink-0 items-center gap-3 rounded-full border px-3 py-2 lg:rounded-none lg:border-0 lg:border-l-2 lg:px-5 lg:py-4 '
      + (current ? 'border-ink bg-ink text-white lg:border-brand lg:bg-transparent lg:text-text' : done ? 'border-line text-text lg:border-brand/40' : 'border-line text-muted lg:border-line');
    li.innerHTML = `<span class="grid size-6 place-items-center rounded-full font-mono text-[11px] ${done ? 'bg-brand text-white' : current ? 'bg-white text-ink lg:bg-brand lg:text-white' : 'bg-paper-2'}">${done ? icon('check', 'size-3.5') : n}</span>
      <span class="text-sm font-medium">${STEPS[n - 1]}</span>`;
    if (current) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
  });
}

const qtyValid = () => /^\d+$/.test(form.quantity) && Number(form.quantity) > 0;
const expiryValid = () => /^\d{4}-\d{2}-\d{2}$/.test(form.expiryDate) && form.expiryDate >= todayISO();
function canNext() {
  if (step === 1) return !!form.type;
  if (step === 2) {
    return form.name.trim() && form.category && qtyValid()
      && (form.type !== 'offre' || expiryValid())  // offers: expiry date required, not in the past
      && (!needsRx() || !!form.rx);                // requests: prescription when the medicine needs one
  }
  if (step === 3) return !!wilaya.value;
  return true;
}

function paintRecap() {
  const offre = form.type === 'offre';
  const media = previewUrl
    ? `<img src="${previewUrl}" alt="" class="size-14 shrink-0 rounded-xl object-cover sm:size-16">`
    : `<span class="grid size-14 shrink-0 place-items-center rounded-xl sm:size-16 ${offre ? 'bg-brand-soft text-brand' : 'bg-signal-soft text-signal'}">${icon(offre ? 'hand-heart' : 'search', 'size-6')}</span>`;
  const cell = (label, value) => ({ label, value });
  const cells = [
    cell('Catégorie', esc(categoryName(form.category))),
    cell('Quantité', `${esc(form.quantity)} u.`),
    offre && form.expiryDate ? cell('Péremption', esc(new Date(`${form.expiryDate}T12:00:00`).toLocaleDateString('fr-FR'))) : null,
    !offre ? cell('Ordonnance', form.rx ? `<span class="inline-flex items-center gap-1.5">${icon('file-text', 'size-4 text-brand')}Jointe</span>` : '<span class="text-muted">Aucune</span>') : null,
    user?.phone ? cell('Contact', esc(user.phone)) : null,
  ].filter(Boolean);
  // An odd last cell takes the full row so the grid never ends with a hole
  const grid = cells.map((c, i) => `<div class="bg-surface px-4 py-3.5 sm:px-5${cells.length % 2 && i === cells.length - 1 ? ' col-span-2' : ''}">
      <dt class="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">${c.label}</dt>
      <dd class="mt-1 break-words font-medium text-text">${c.value}</dd></div>`).join('');
  setHTML($('[data-recap]'), `
    <div class="flex items-start gap-4 p-4 sm:p-5">
      ${media}
      <div class="min-w-0 flex-1">
        ${typeTag(form.type)}
        <p class="mt-2 line-clamp-3 break-words font-display text-lg font-semibold leading-snug text-text">${esc(form.name.trim())}</p>
        <p class="mt-1.5 flex items-center gap-1.5 text-sm">${icon('map-pin', 'size-3.5 shrink-0 text-muted')}${esc(wilaya.nameOf(wilaya.value))}</p>
      </div>
    </div>
    <dl class="grid grid-cols-2 gap-px border-t border-line bg-line">${grid}</dl>`);
}

// Confirmation screen: a compact receipt of what was sent, worded for offers vs requests
function paintSuccess() {
  const offre = form.type === 'offre';
  const meta = [
    categoryName(form.category),
    form.quantity ? `${form.quantity} u.` : '',
    offre && form.expiryDate ? `Exp. ${new Date(`${form.expiryDate}T12:00:00`).toLocaleDateString('fr-FR', { month: '2-digit', year: 'numeric' })}` : '',
    !offre && form.rx ? 'Ordonnance jointe' : '',
  ].filter(Boolean).map(esc).join(' · ');
  const media = previewUrl
    ? `<img src="${previewUrl}" alt="" class="size-12 shrink-0 rounded-xl object-cover sm:size-14">`
    : `<span class="grid size-12 shrink-0 place-items-center rounded-xl sm:size-14 ${offre ? 'bg-brand-soft text-brand' : 'bg-signal-soft text-signal'}">${icon(offre ? 'hand-heart' : 'search', 'size-6')}</span>`;
  setHTML($('[data-success-summary]'), `
    ${media}
    <div class="min-w-0 flex-1">
      <div class="flex flex-wrap items-center gap-1.5">${typeTag(form.type)}<span class="tag tag-pending">En attente</span></div>
      <p class="mt-2 line-clamp-2 font-display text-lg font-semibold leading-snug text-text">${esc(form.name.trim())}</p>
      <p class="mt-1 font-mono text-[11px] uppercase leading-relaxed tracking-[0.12em] text-muted">${meta}</p>
      <p class="mt-1.5 flex items-center gap-1.5 text-sm">${icon('map-pin', 'size-3.5 text-muted')}${esc(wilaya.nameOf(wilaya.value))}</p>
    </div>`);
  $('[data-success-review]').textContent = !offre && form.rx
    ? "Nous vérifions l'annonce et votre ordonnance, qui reste privée."
    : "Nous vérifions que l'annonce respecte les règles de la plateforme.";
  $('[data-success-publish]').textContent = offre
    ? 'Votre offre devient visible et les membres intéressés vous contactent.'
    : 'Votre demande devient visible et les donateurs peuvent vous contacter.';
}

function update() {
  $$('[data-step]').forEach((s) => { s.hidden = Number(s.dataset.step) !== step; });
  $$('[data-type]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.type === form.type)));
  $$('[data-cat]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cat === form.category)));
  $('[data-expiry-wrap]').hidden = form.type !== 'offre';
  const expiryBad = form.type === 'offre' && form.expiryDate && !expiryValid();
  $('[data-expiry-hint]').className = `field-hint ${expiryBad ? '!text-danger' : ''}`;
  $('[data-expiry-hint]').textContent = expiryBad ? 'Ce médicament est périmé : il ne peut pas être proposé.' : 'Les médicaments périmés ne peuvent pas être proposés.';
  // Prescription block: requests only; required (with a notice) for medicines that need one
  const rx = needsRx();
  $('[data-rx-wrap]').hidden = form.type !== 'demande';
  $('[data-rx-hint]').hidden = !rx;
  $('[data-rx-required]').hidden = !rx;
  $('[data-rx-optional]').hidden = rx;
  $('[data-qty-hint]').className = `field-hint ${form.quantity && !qtyValid() ? '!text-danger' : ''}`;
  $('[data-qty-hint]').textContent = form.quantity && !qtyValid() ? 'Entrez un nombre entier positif.' : "Nombre de boîtes ou d'unités.";
  $('[data-prev]').hidden = step === 1;
  $('[data-next]').hidden = step === 4;
  $('[data-submit]').hidden = step !== 4;
  $('[data-next]').disabled = !canNext();
  $('[data-progress]').textContent = `${step} / 4`;
  if (step === 4) paintRecap();
  paintStepper();
}

/* Inputs */
$$('[data-type]').forEach((b) => b.addEventListener('click', () => {
  form.type = b.dataset.type;
  if (form.type === 'demande') form.expiryDate = '';
  update();
}));
$('[data-cats]').addEventListener('click', (e) => {
  const b = e.target.closest('[data-cat]');
  if (b) { form.category = b.dataset.cat; update(); }
});
const bindInput = (sel, key) => $(sel).addEventListener('input', (e) => { form[key] = e.target.value; update(); });
bindInput('[data-name]', 'name');
bindInput('[data-qty]', 'quantity');
bindInput('[data-expiry]', 'expiryDate');
bindInput('[data-desc]', 'description');

$('[data-file]').addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  // Same rules as the backend upload middleware: JPG/PNG/WebP, 5 MB max
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
    toast(file.size > 5 * 1024 * 1024 ? 'Image trop lourde : 5 Mo maximum.' : 'Format non accepté : JPG, PNG ou WebP.', 'error');
    e.target.value = '';
    return;
  }
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  form.image = file;
  previewUrl = URL.createObjectURL(file);
  $('[data-preview-img]').src = previewUrl;
  $('[data-preview-name]').textContent = file.name;
  $('[data-preview]').hidden = false;
  $('[data-drop]').hidden = true;
});
/* Prescription file (PDF or image, 5 MB, same rules as the backend) */
$('[data-rx-file]').addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
    toast(file.size > 5 * 1024 * 1024 ? 'Fichier trop lourd : 5 Mo maximum.' : 'Format non accepté : PDF, JPG, PNG ou WebP.', 'error');
    e.target.value = '';
    return;
  }
  form.rx = file;
  $('[data-rx-name]').textContent = file.name;
  $('[data-rx-preview]').hidden = false;
  $('[data-rx-drop]').hidden = true;
  update();
});
$('[data-rx-remove]').addEventListener('click', () => {
  form.rx = null;
  $('[data-rx-file]').value = '';
  $('[data-rx-preview]').hidden = true;
  $('[data-rx-drop]').hidden = false;
  update();
});

$('[data-remove-file]').addEventListener('click', () => {
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  form.image = null;
  previewUrl = null;
  $('[data-file]').value = '';
  $('[data-preview]').hidden = true;
  $('[data-drop]').hidden = false;
});

/* Navigation */
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const go = (n) => {
  const forward = n > step;
  step = n;
  update();
  // New step slides in from the direction of travel
  if (!reduceMotion.matches) {
    $(`[data-step="${step}"]`).animate(
      [{ opacity: 0, translate: `${forward ? 16 : -16}px 0` }, { opacity: 1, translate: '0 0' }],
      { duration: 320, easing: 'cubic-bezier(.22,1,.36,1)' },
    );
  }
  $('[data-flow]').scrollIntoView({ behavior: 'smooth', block: 'start' });
};
$('[data-next]').addEventListener('click', () => canNext() && go(step + 1));
$('[data-prev]').addEventListener('click', () => go(step - 1));

$('[data-submit]').addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  const feedback = $('[data-feedback]');
  showNotice(feedback, '');
  setLoading(btn, true);
  try {
    // 1. Prescription first (private upload), reused if this submit is a retry
    let ordonnanceId = null;
    if (form.type === 'demande' && form.rx) {
      if (uploadedRx?.file !== form.rx) {
        const res = await ordonnanceApi.upload(form.rx);
        uploadedRx = { file: form.rx, id: res?.ordonnance?.id };
      }
      ordonnanceId = uploadedRx.id;
    }

    // 2. The annonce
    const fd = new FormData();
    fd.append('type', form.type === 'offre' ? 'DON' : 'DEMANDE');
    fd.append('wilaya_id', wilaya.value);
    fd.append('medicament_name', form.name.trim()); // backend finds or creates the medicine
    fd.append('categorie_id', form.category);       // saved on a new medicine (never overwrites an existing one)
    fd.append('quantite', parseInt(form.quantity, 10));
    if (form.type === 'offre') fd.append('date_peremption', form.expiryDate);
    if (ordonnanceId) fd.append('ordonnance_id', ordonnanceId);
    if (form.description.trim()) fd.append('description', form.description.trim());
    if (form.image) fd.append('images', form.image);
    await annonceApi.create(fd);
    uploadedRx = null;
    paintSuccess();
    $('[data-flow]').hidden = true;
    $('[data-intro]').hidden = true;
    $('[data-success]').hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (err) {
    showNotice(feedback, 'error', 'Envoi impossible', errorMessage(err, 'Une erreur est survenue. Veuillez réessayer.'));
  } finally {
    setLoading(btn, false);
  }
});

$('[data-again]').addEventListener('click', () => {
  form = { ...BLANK };
  ['[data-name]', '[data-qty]', '[data-expiry]', '[data-desc]'].forEach((s) => { $(s).value = ''; });
  $('[data-remove-file]').click();
  $('[data-rx-remove]').click();
  $('[data-success]').hidden = true;
  $('[data-intro]').hidden = false;
  $('[data-flow]').hidden = false;
  go(1);
});

if (form.type) step = 2;
update();
