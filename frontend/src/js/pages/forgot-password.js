import '../core/layout.js';
import { authApi, errorMessage } from '../core/api.js';
import { $ } from '../core/dom.js';
import { bindForm } from '../core/forms.js';

bindForm($('[data-form]'), async ({ email }, ui) => {
  try {
    const res = await authApi.forgotPassword({ email: email.trim().toLowerCase() });
    ui.notice('success', 'Lien envoyé', res?.message || 'Si cet email existe, un lien de réinitialisation vient de vous être envoyé.');
  } catch (err) {
    ui.notice('error', 'Demande impossible', errorMessage(err, 'Impossible de demander la réinitialisation pour le moment.'));
  }
});
