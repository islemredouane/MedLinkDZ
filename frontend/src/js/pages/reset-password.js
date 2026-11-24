import '../core/layout.js';
import { authApi, errorMessage } from '../core/api.js';
import { $ } from '../core/dom.js';
import { bindForm } from '../core/forms.js';

const form = $('[data-form]');
const token = new URLSearchParams(location.search).get('token');
if (token) form.token.value = token;

bindForm(form, async ({ token: t, newPassword }, ui) => {
  try {
    await authApi.resetPassword({ token: t.trim(), newPassword });
    ui.notice('success', 'Mot de passe mis à jour', 'Redirection vers la connexion…');
    setTimeout(() => location.assign('/login'), 1500);
  } catch (err) {
    ui.notice('error', 'Réinitialisation impossible', errorMessage(err, 'Le lien a peut-être expiré. Refaites une demande.'),
      { href: '/forgot-password', label: 'Demander un nouveau lien' });
  }
});
