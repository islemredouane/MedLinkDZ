import '../core/layout.js';
import { register } from '../core/auth.js';
import { errorMessage, IS_MOCK } from '../core/api.js';
import { $, $$ } from '../core/dom.js';
import { bindForm } from '../core/forms.js';
import { wilayaSelect } from '../components/wilaya-select.js';

const wilaya = wilayaSelect($('[data-wilaya]'), { name: 'wilaya', placeholder: 'Choisir…' });
const form = $('[data-form]');
const subtitle = $('[data-subtitle]');
const defaultSubtitle = subtitle.textContent;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
let step = 1;

/* ---- Two steps: 1. who you are · 2. how to reach you + security ---- */
function showStep(n) {
  step = n;
  $$('[data-reg-step]').forEach((el) => { el.hidden = Number(el.dataset.regStep) !== n; });
  $('[data-step-bar]').classList.toggle('bg-brand', n === 2);
  $('[data-step-bar]').classList.toggle('bg-line', n === 1);
  $('[data-step-label]').textContent = `Étape ${n} sur 2`;
  $('[data-login-hint]').hidden = n === 2; // mid-signup, "already have an account?" is noise
  const firstName = form.prenom.value.trim();
  subtitle.textContent = n === 2 && firstName ? `Plus que quelques détails, ${firstName}.` : defaultSubtitle;

  const current = $(`[data-reg-step="${n}"]`);
  if (!reduceMotion.matches) {
    current.animate([{ opacity: 0, translate: `${n === 2 ? 16 : -16}px 0` }, { opacity: 1, translate: '0 0' }],
      { duration: 300, easing: 'cubic-bezier(.22,1,.36,1)' });
  }
  current.querySelector('input:not([type="hidden"])')?.focus({ preventScroll: true });
}

// Step 1 submit (button or Enter): check only its fields, then go to step 2.
// Registered in the capture phase so it runs before the form's normal submit handler.
form.addEventListener('submit', (e) => {
  if (step !== 1) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  const fields = $$('[data-reg-step="1"] input', form);
  const invalid = fields.find((input) => !input.checkValidity());
  if (invalid) { invalid.reportValidity(); return; }
  showStep(2);
}, true);

$('[data-prev-step]').addEventListener('click', () => showStep(1));

/* ---- After sign-up: dedicated "check your inbox" screen ---- */
function showDone(email) {
  ['[data-title]', '[data-subtitle]', '[data-step-progress]', '[data-login-hint]'].forEach((sel) => { $(sel).hidden = true; });
  form.hidden = true;
  const done = $('[data-reg-done]');
  $('[data-done-email]', done).textContent = email;
  $('[data-done-resend]', done).href = `/resend-verification?email=${encodeURIComponent(email)}`;
  $('[data-done-demo]', done).hidden = !IS_MOCK; // demo backend only
  done.hidden = false;
  if (!reduceMotion.matches) {
    done.animate([{ opacity: 0, translate: '0 12px' }, { opacity: 1, translate: '0 0' }], { duration: 360, easing: 'cubic-bezier(.22,1,.36,1)' });
  }
  window.scrollTo({ top: 0 });
}

/* ---- Step 2: create the account ---- */
bindForm(form, async (data, ui) => {
  if (!wilaya.value) {
    ui.notice('error', 'Wilaya manquante', 'Choisissez votre wilaya pour continuer.');
    wilaya.focus();
    return;
  }
  try {
    const res = await register({
      prenom: data.prenom.trim(),
      nom: data.nom.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone.trim(),
      password: data.password,
      wilaya: wilaya.value,
    });
    if (res?.success) {
      form.dataset.done = '1';
      showDone(data.email.trim().toLowerCase());
    }
  } catch (err) {
    ui.notice('error', 'Inscription impossible', errorMessage(err, 'Impossible de créer le compte. Vérifiez vos informations.'));
  }
});
