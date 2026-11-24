import '../core/layout.js';
import { authApi, errorMessage } from '../core/api.js';
import { $ } from '../core/dom.js';
import { bindForm } from '../core/forms.js';

const form = $('[data-form]');
// Arriving from the sign-up "check your inbox" screen: the address is pre-filled.
const prefill = new URLSearchParams(location.search).get('email');
if (prefill) form.email.value = prefill;

bindForm(form, async ({ email }, ui) => {
  try {
    const res = await authApi.resendVerification({ email: email.trim().toLowerCase() });
    ui.notice('success', 'Email envoyé', res?.message || 'Si cet email existe, un email de vérification a été renvoyé.');
  } catch (err) {
    ui.notice('error', "Impossible d'envoyer l'email", errorMessage(err, "Impossible de renvoyer l'email pour le moment."));
  }
});
