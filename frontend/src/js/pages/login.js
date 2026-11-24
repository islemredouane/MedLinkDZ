import '../core/layout.js';
import { login, getUser } from '../core/auth.js';
import { errorMessage } from '../core/api.js';
import { $, safeNext } from '../core/dom.js';
import { bindForm } from '../core/forms.js';

const next = safeNext(new URLSearchParams(location.search).get('next'));

getUser().then((u) => { if (u) location.replace(next); });

bindForm($('[data-form]'), async ({ email, password }, ui) => {
  try {
    await login(email.trim().toLowerCase(), password);
    location.replace(next);
  } catch (err) {
    const msg = errorMessage(err, err?.status === 0 ? 'Serveur injoignable. Réessayez dans un instant.' : 'Email ou mot de passe incorrect.');
    if (msg.includes('Email non vérifié')) {
      ui.notice('info', 'Compte à vérifier', "Votre email n'est pas encore vérifié. Renvoyez le message pour activer votre accès.",
        { href: '/resend-verification', label: "Renvoyer l'email de vérification" });
    } else {
      ui.notice('error', 'Connexion impossible', msg);
    }
  }
});
