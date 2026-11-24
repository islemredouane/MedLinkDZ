/* Promise-based confirmation dialog built on <dialog>. */
import { icon } from '../core/icons.js';
import { esc } from '../core/dom.js';

export function confirmDialog({ title, message, confirmLabel = 'Confirmer', cancelLabel = 'Annuler', danger = false }) {
  return new Promise((resolve) => {
    const dlg = document.createElement('dialog');
    dlg.className = 'm-auto w-[min(440px,calc(100vw-32px))] rounded-3xl border border-line bg-surface p-0 text-body shadow-lift backdrop:bg-ink/50 backdrop:backdrop-blur-sm';
    dlg.innerHTML = `
      <form method="dialog" class="p-6 sm:p-7">
        <span class="grid size-11 place-items-center rounded-2xl ${danger ? 'bg-danger-soft text-danger' : 'bg-brand-soft text-brand'}">
          ${icon(danger ? 'triangle-alert' : 'circle-help', 'size-5')}
        </span>
        <h2 class="mt-5 text-xl font-semibold">${esc(title)}</h2>
        ${message ? `<p class="mt-2 text-sm leading-relaxed">${esc(message)}</p>` : ''}
        <div class="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button value="cancel" class="btn btn-outline">${esc(cancelLabel)}</button>
          <button value="ok" class="btn ${danger ? 'btn-signal' : 'btn-primary'}">${esc(confirmLabel)}</button>
        </div>
      </form>`;
    document.body.append(dlg);
    dlg.addEventListener('close', () => { resolve(dlg.returnValue === 'ok'); dlg.remove(); });
    dlg.showModal();
  });
}
