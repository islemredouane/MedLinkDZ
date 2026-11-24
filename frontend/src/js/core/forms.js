import { $, $$, setLoading, showNotice } from './dom.js';
import { icon } from './icons.js';

/** Eye button next to password fields. */
export function initPasswordToggles(root = document) {
  $$('[data-toggle-pw]', root).forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.togglePw);
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.setAttribute('aria-label', show ? 'Masquer le mot de passe' : 'Afficher le mot de passe');
      btn.innerHTML = icon(show ? 'x' : 'eye', 'size-4');
    });
  });
}

/**
 * Wire a form: native validation, loading button, feedback area.
 * handler(data, ui) may throw; ui.notice(variant, title, msg, action) writes feedback.
 */
export function bindForm(form, handler) {
  const submit = $('[data-submit]', form);
  const feedback = $('[data-feedback]', form);
  const ui = { notice: (...args) => showNotice(feedback, ...args), clear: () => showNotice(feedback, '') };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    ui.clear();
    setLoading(submit, true);
    try {
      await handler(Object.fromEntries(new FormData(form)), ui);
    } finally {
      setLoading(submit, false);
      if (form.dataset.done) submit.disabled = true; // handler marked the form as finished
    }
  });
  initPasswordToggles(form);
  return ui;
}
