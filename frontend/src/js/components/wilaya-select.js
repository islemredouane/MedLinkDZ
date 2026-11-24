/* Searchable wilaya picker (combobox + listbox), keyboard accessible.
   Usage: const sel = wilayaSelect(el, { value, placeholder, onChange, name, tone }) */
import { WILAYAS } from '../data/wilayas.js';
import { icon } from '../core/icons.js';
import { esc } from '../core/dom.js';

let uid = 0;
const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const toOptions = (list) =>
  (Array.isArray(list) && list.length ? list : WILAYAS).map((w) => ({ id: String(w.id), name: w.name || w.nom_fr || w.nom || w.label || '' }));

/* pill: fully rounded trigger, to sit next to segmented controls / pill inputs */
export function wilayaSelect(root, { value = '', placeholder = 'Toutes les wilayas', onChange, name, options, tone = 'field', allowClear = false, pill = false } = {}) {
  const id = `wsel-${++uid}`;
  let opts = toOptions(options);
  let current = value ? String(value) : '';
  let active = -1;
  let filtered = opts;

  const shell = tone === 'bare'
    ? 'flex h-full w-full items-center gap-2.5 text-left'
    : `field-control w-full cursor-pointer text-left${pill ? ' rounded-full px-4' : ''}`;

  root.classList.add('relative');
  root.innerHTML = `
    <button type="button" class="${shell}" aria-haspopup="listbox" aria-expanded="false" aria-controls="${id}-list" data-trigger>
      ${icon('map-pin', 'size-[18px] shrink-0 text-muted')}
      <span class="min-w-0 flex-1 truncate text-[15px]" data-display></span>
      ${icon('chevron-down', 'size-4 shrink-0 text-muted transition')}
    </button>
    ${name ? `<input type="hidden" name="${esc(name)}" data-hidden>` : ''}
    <div class="absolute left-0 right-0 top-[calc(100%+6px)] z-30 min-w-[260px] overflow-hidden rounded-2xl border border-line bg-surface shadow-lift" data-pop hidden>
      <div class="border-b border-line p-2">
        <div class="flex h-10 items-center gap-2 rounded-xl bg-paper px-3">
          ${icon('search', 'size-4 text-muted')}
          <input type="text" class="w-full bg-transparent text-base text-text outline-none placeholder:text-muted sm:text-sm" placeholder="Rechercher une wilaya…"
                 role="combobox" aria-autocomplete="list" aria-controls="${id}-list" aria-expanded="true" data-search>
        </div>
      </div>
      <ul id="${id}-list" role="listbox" class="max-h-64 overflow-y-auto p-1.5" data-list></ul>
    </div>`;

  const trigger = root.querySelector('[data-trigger]');
  const display = root.querySelector('[data-display]');
  const hidden = root.querySelector('[data-hidden]');
  const pop = root.querySelector('[data-pop]');
  const search = root.querySelector('[data-search]');
  const list = root.querySelector('[data-list]');

  function paintValue() {
    const sel = opts.find((o) => o.id === current);
    display.innerHTML = sel
      ? `<span class="mr-1.5 font-mono text-xs text-muted">${sel.id.padStart(2, '0')}</span>${esc(sel.name)}`
      : `<span class="text-muted">${esc(placeholder)}</span>`;
    if (hidden) hidden.value = current;
  }

  function paintList() {
    const items = allowClear ? [{ id: '', name: placeholder }, ...filtered] : filtered;
    list.innerHTML = items.length
      ? items.map((o, i) => `<li role="option" id="${id}-o${i}" data-id="${esc(o.id)}" aria-selected="${o.id === current}"
            class="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-text ${i === active ? 'bg-paper-2' : ''} aria-selected:font-semibold aria-selected:text-brand">
            <span class="w-6 font-mono text-[11px] text-muted">${o.id ? o.id.padStart(2, '0') : '—'}</span>${esc(o.name)}</li>`).join('')
      : '<li class="px-3 py-6 text-center text-sm text-muted">Aucune wilaya trouvée</li>';
    if (active >= 0) {
      search.setAttribute('aria-activedescendant', `${id}-o${active}`);
      list.children[active]?.scrollIntoView({ block: 'nearest' });
    }
  }

  /* Open on the side with room: below by default, above when the field sits low in the viewport
     (hero search). If neither side fits the full list, the list shrinks to the larger side. */
  function place() {
    const GAP = 6;
    const rect = trigger.getBoundingClientRect();
    const dock = innerWidth < 768 ? 96 : 16; // fixed mobile menu bar at the bottom
    const below = innerHeight - rect.bottom - GAP - dock;
    const above = rect.top - GAP - 16;
    const searchH = pop.firstElementChild.offsetHeight;
    list.style.maxHeight = '';
    const need = searchH + Math.min(list.scrollHeight, 256) + 12;
    const up = need > below && above > below;
    const room = (up ? above : below) - searchH - 12;
    if (need > (up ? above : below)) list.style.maxHeight = `${Math.max(120, room)}px`;
    pop.classList.toggle('top-[calc(100%+6px)]', !up);
    pop.classList.toggle('bottom-[calc(100%+6px)]', up);
    pop.dataset.side = up ? 'up' : 'down';
  }

  function open() {
    pop.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    search.value = '';
    filtered = opts;
    active = -1;
    paintList();
    place();
    requestAnimationFrame(() => search.focus({ preventScroll: true }));
  }
  function close(focus = false) {
    pop.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    if (focus) trigger.focus();
  }
  function choose(val) {
    current = val;
    paintValue();
    close(true);
    onChange?.(current);
  }

  trigger.addEventListener('click', () => (pop.hidden ? open() : close()));
  search.addEventListener('input', () => {
    const q = norm(search.value.trim());
    filtered = opts.filter((o) => norm(o.name).includes(q) || o.id === q.replace(/^0/, ''));
    active = filtered.length ? 0 : -1;
    paintList();
  });
  search.addEventListener('keydown', (e) => {
    const count = list.querySelectorAll('[role="option"]').length;
    if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(count - 1, active + 1); paintList(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(0, active - 1); paintList(); }
    else if (e.key === 'Enter') { e.preventDefault(); const li = list.children[active]; if (li?.dataset.id !== undefined) choose(li.dataset.id); }
    else if (e.key === 'Escape') { e.preventDefault(); close(true); }
    else if (e.key === 'Tab') close();
  });
  list.addEventListener('click', (e) => {
    const li = e.target.closest('[role="option"]');
    if (li) choose(li.dataset.id);
  });
  document.addEventListener('click', (e) => { if (!root.contains(e.target)) close(); });
  addEventListener('resize', () => { if (!pop.hidden) place(); });

  paintValue();

  return {
    get value() { return current; },
    set value(v) { current = v ? String(v) : ''; paintValue(); },
    setOptions(next) { opts = toOptions(next); paintValue(); },
    nameOf(v) { return opts.find((o) => o.id === String(v))?.name || ''; },
    focus() { trigger.focus(); },
  };
}
