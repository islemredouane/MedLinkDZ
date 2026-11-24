import '../core/layout.js';
import { authApi, errorMessage } from '../core/api.js';
import { $, noticeHTML, setHTML } from '../core/dom.js';

const state = $('[data-state]');
const title = $('[data-title]');
const subtitle = $('[data-subtitle]');
const token = new URLSearchParams(location.search).get('token');

function fail(message) {
  title.innerHTML = 'Échec de la validation.';
  subtitle.textContent = "Nous n'avons pas pu valider votre adresse email. Essayez de renvoyer le lien.";
  setHTML(state, `${noticeHTML('error', 'Vérification impossible', message)}
    <div class="mt-6 flex flex-col gap-2">
      <a href="/resend-verification" class="btn btn-primary btn-lg w-full">Renvoyer l'email de vérification</a>
      <a href="/login" class="btn btn-ghost w-full">Retour à la connexion</a>
    </div>`);
}

if (!token) fail('Token de vérification manquant ou expiré.');
else {
  authApi.verifyEmail(token)
    .then((res) => {
      title.innerHTML = 'Compte activé.';
      subtitle.textContent = 'Votre compte est prêt. Bienvenue dans la communauté MedLink DZ.';
      setHTML(state, `${noticeHTML('success', 'Email vérifié', res?.message || 'Email vérifié avec succès.')}
        <a href="/login" class="btn btn-primary btn-lg mt-6 w-full">Se connecter <i data-lucide="arrow-right"></i></a>`);
    })
    .catch((err) => fail(errorMessage(err, 'Le lien de vérification a expiré ou est invalide.')));
}
