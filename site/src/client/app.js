/**
 * The site's only script: progressive enhancement over pages that work without it.
 * Tabs, copy buttons, theme and Chopper switches, the Get it pickers, custom selects,
 * catalog filtering and Chopper's cameo picker. Pure logic lives in /assets/lib (tier 0).
 */
import { search, facetCounts, filtersToQuery, queryToFilters } from '../lib/search.mjs';
import { comboAction, openIndex, moveIndex, typeahead } from '../lib/listbox.mjs';
import { emptySlots } from '../lib/slots.mjs';
import { initLighting } from './lighting.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const base = document.body.dataset.base || '/';
const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* private mode */ } },
};

/* Tabs: APG tabs with automatic activation; Left/Right, Home/End. */
function initTabs() {
  for (const tabs of $$('[data-tabs]')) {
    const buttons = $$('[role=tab]', tabs);
    const panels = $$('[role=tabpanel]', tabs);
    const select = (btn, focus) => {
      for (const b of buttons) {
        const on = b === btn;
        b.setAttribute('aria-selected', String(on));
        b.tabIndex = on ? 0 : -1;
      }
      for (const p of panels) p.dataset.selected = String(p.dataset.tab === btn.dataset.tab);
      if (focus) btn.focus();
    };
    tabs.addEventListener('click', (e) => {
      const btn = e.target.closest('[role=tab]');
      if (btn && tabs.contains(btn)) select(btn, false);
    });
    tabs.addEventListener('keydown', (e) => {
      const i = buttons.indexOf(document.activeElement);
      if (i < 0) return;
      const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: buttons.length - 1 }[e.key];
      if (next === undefined) return;
      e.preventDefault();
      select(buttons[(next + buttons.length) % buttons.length], true);
    });
    tabs.dataset.ready = 'true';
  }
}

/* Copy buttons: "Copy command" -> "Copied" for a moment. */
function initCopy() {
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-copy]');
    if (!btn) return;
    const label = $('.f-copy__label', btn);
    try {
      await navigator.clipboard.writeText(btn.dataset.copy);
      btn.dataset.copied = 'true';
      if (label) label.textContent = 'Copied';
    } catch {
      const pre = btn.parentElement?.querySelector('pre');
      if (pre) getSelection().selectAllChildren(pre);
      if (label) label.textContent = 'Press Ctrl+C to copy';
    }
    clearTimeout(btn._t);
    btn._t = setTimeout(() => {
      delete btn.dataset.copied;
      if (label) label.textContent = btn.dataset.copyLabel;
    }, 2000);
  });
}

/* Theme: system -> light -> dark, saved; set before first paint by the shell. */
const THEME_LABEL = { system: 'Theme: match my system', light: 'Theme: light', dark: 'Theme: dark' };
function initTheme() {
  const btn = $('[data-theme-toggle]');
  if (!btn) return;
  const current = () => document.documentElement.dataset.scheme || 'system';
  const show = () => {
    btn.setAttribute('aria-label', THEME_LABEL[current()]);
    btn.title = THEME_LABEL[current()];
  };
  show();
  btn.addEventListener('click', () => {
    const next = { system: 'light', light: 'dark', dark: 'system' }[current()];
    if (next === 'system') delete document.documentElement.dataset.scheme;
    else document.documentElement.dataset.scheme = next;
    store.set('loushing.theme', next === 'system' ? null : next);
    show();
  });
}

/* Chopper switch: off hides every cameo now and on later visits. */
function initChopperToggle() {
  const btn = $('[data-chopper-toggle]');
  if (!btn) return;
  const on = () => document.documentElement.dataset.chopper !== 'off';
  btn.setAttribute('aria-checked', String(on()));
  btn.addEventListener('click', () => {
    if (on()) document.documentElement.dataset.chopper = 'off';
    else delete document.documentElement.dataset.chopper;
    store.set('loushing.chopper', on() ? null : 'off');
    btn.setAttribute('aria-checked', String(on()));
    if (on()) initChopper();
  });
}

/* Get it: the agent and scope pickers show one plan, everywhere on the page. */
function initGetIt() {
  const panel = $('[data-getit]');
  if (!panel) return;
  const picker = $('[data-agent-picker]', panel);
  const scopes = $$('[data-scope-picker] input[type=radio]', panel);
  if (!picker) return;
  const savedAgent = store.get('loushing.agent');
  if (savedAgent && [...picker.options].some((o) => o.value === savedAgent)) picker.value = savedAgent;
  const savedScope = store.get('loushing.scope');
  for (const r of scopes) if (savedScope && r.value === savedScope) r.checked = true;
  const apply = () => {
    const scope = scopes.find((r) => r.checked)?.value ?? 'project';
    const key = `${picker.value}:${scope}`;
    for (const el of $$('[data-plan]')) el.hidden = el.dataset.plan !== key;
  };
  picker.addEventListener('change', () => { store.set('loushing.agent', picker.value); apply(); });
  for (const r of scopes) r.addEventListener('change', () => { store.set('loushing.scope', r.value); apply(); });
  apply();
}

/* Select: the custom listbox over each native select (APG select-only combobox). */
function initSelects() {
  for (const root of $$('[data-select]')) {
    const native = $('select', root);
    const button = $('.f-select__button', root);
    const list = $('[role=listbox]', root);
    const label = $('.f-select__label', root);
    const value = $('.f-select__value', button);
    const options = $$('[role=option]', list);
    const labels = options.map((o) => o.textContent.trim());
    if (!native || !button || !list || !options.length) continue;
    let active = -1;
    let buffer = '';
    let bufferTimer;
    const isOpen = () => button.getAttribute('aria-expanded') === 'true';
    const selectedIndex = () => Math.max(0, options.findIndex((o) => o.dataset.value === native.value));

    const show = () => {
      const i = selectedIndex();
      options.forEach((o, k) => o.setAttribute('aria-selected', String(k === i)));
      value.textContent = labels[i];
    };
    const setActive = (i) => {
      active = i;
      options.forEach((o, k) => { if (k === i) o.dataset.active = 'true'; else delete o.dataset.active; });
      if (i >= 0) {
        button.setAttribute('aria-activedescendant', options[i].id);
        options[i].scrollIntoView({ block: 'nearest' });
      } else button.removeAttribute('aria-activedescendant');
    };
    const place = () => {
      const r = button.getBoundingClientRect();
      const gap = 4;
      const below = innerHeight - r.bottom - gap * 2;
      const above = r.top - gap * 2;
      const want = list.scrollHeight + list.offsetHeight - list.clientHeight;
      const up = want > below && above > below;
      list.style.left = `${r.left}px`;
      list.style.width = `${r.width}px`;
      list.style.maxHeight = `${Math.max(120, Math.min(want, up ? above : below))}px`;
      list.style.top = up ? 'auto' : `${r.bottom + gap}px`;
      list.style.bottom = up ? `${innerHeight - r.top + gap}px` : 'auto';
    };
    const open = (i) => {
      list.hidden = false;
      button.setAttribute('aria-expanded', 'true');
      place();
      setActive(i);
      addEventListener('scroll', place, true);
      addEventListener('resize', place);
    };
    const close = () => {
      list.hidden = true;
      button.setAttribute('aria-expanded', 'false');
      setActive(-1);
      removeEventListener('scroll', place, true);
      removeEventListener('resize', place);
    };
    const commit = (i) => {
      if (i < 0) return;
      const changed = native.value !== options[i].dataset.value;
      native.value = options[i].dataset.value;
      show();
      if (changed) native.dispatchEvent(new Event('change', { bubbles: true }));
    };
    const type = (key) => {
      clearTimeout(bufferTimer);
      buffer += key;
      bufferTimer = setTimeout(() => { buffer = ''; }, 500);
      const from = isOpen() ? active : selectedIndex();
      const i = typeahead(buffer, labels, from);
      if (i < 0) return;
      if (isOpen()) setActive(i);
      else commit(i);
    };

    button.addEventListener('click', () => (isOpen() ? close() : open(selectedIndex())));
    button.addEventListener('blur', () => { if (isOpen()) close(); });
    button.addEventListener('keydown', (e) => {
      const action = comboAction(e.key, isOpen(), { alt: e.altKey, typing: buffer.length > 0 });
      if (!action || e.ctrlKey || e.metaKey) return;
      if (action === 'select-tab') { commit(active); close(); return; }
      e.preventDefault();
      if (action === 'open') open(openIndex(e.key, selectedIndex(), options.length));
      else if (action === 'close') close();
      else if (action === 'select') { commit(active); close(); }
      else if (action === 'move') setActive(moveIndex(e.key, active, options.length));
      else if (action === 'type') type(e.key);
    });
    list.addEventListener('pointerdown', (e) => e.preventDefault());
    list.addEventListener('click', (e) => {
      const o = e.target.closest('[role=option]');
      if (!o) return;
      commit(options.indexOf(o));
      close();
      button.focus();
    });
    list.addEventListener('pointermove', (e) => {
      const o = e.target.closest('[role=option]');
      if (o && options.indexOf(o) !== active) setActive(options.indexOf(o));
    });
    label?.addEventListener('click', (e) => { e.preventDefault(); button.focus(); });
    native.addEventListener('change', show);

    show();
    button.tabIndex = 0;
    root.dataset.ready = 'true';
  }
}

/* Grid slots: faint placeholders complete a card grid's short last row, so it keeps its shape. */
function fillSlots(grid) {
  const template = $(':scope > template[data-slot-template]', grid);
  if (!template) return;
  const slots = $$(':scope > [data-slot]', grid);
  const cards = [...grid.children].filter((el) => el.tagName === 'LI' && !el.hidden && !el.hasAttribute('data-slot'));
  const columns = grid.hidden ? 0 : getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length;
  const want = emptySlots(cards.length, columns);
  while (slots.length > want) slots.pop().remove();
  while (slots.length < want) slots.push(template.content.firstElementChild.cloneNode(true));
  grid.append(...slots);
}

function initSlots() {
  const grids = $$('[data-slots]');
  if (!grids.length) return;
  for (const grid of grids) fillSlots(grid);
  if (!('ResizeObserver' in window)) return;
  const seen = new WeakMap();
  const observer = new ResizeObserver((entries) => {
    for (const { target, contentRect } of entries) {
      if (seen.get(target) === contentRect.width) continue;
      seen.set(target, contentRect.width);
      fillSlots(target);
    }
  });
  for (const grid of grids) observer.observe(grid);
}

/* Catalog: search and facets filter and rank the cells in place; the URL keeps the state. */
async function initCatalog() {
  const facets = $('[data-facets]');
  if (!facets) return;
  const form = $('[data-facet-form]', facets);
  const searchForm = $('#catalog-search')?.form;
  const input = $('#catalog-search');
  const grid = $('.c-items__grid');
  const status = $('[data-results-status]');
  const hiddenNote = $('[data-hidden-by-agent]');
  const empty = $('[data-empty=no-results]');
  if (!grid || !input) return;
  const cells = new Map($$('.c-items__cell', grid).map((li) => [li.dataset.id, li]));
  const staticOrder = [...cells.keys()];

  let docs;
  try {
    const res = await fetch(`${base}search-index.json`);
    docs = (await res.json()).docs;
  } catch {
    return; // The full list stays; search still submits to the server-rendered page.
  }

  const read = () => {
    const f = { type: [], area: [], agent: [], without: [], status: [] };
    for (const box of $$('input[type=checkbox]:checked', form)) f[box.name]?.push(box.value);
    return f;
  };
  const write = ({ q, filters }) => {
    input.value = q;
    for (const box of $$('input[type=checkbox]', form)) box.checked = !!filters[box.name]?.includes(box.value);
  };

  const run = (push) => {
    const q = input.value.trim();
    const filters = read();
    const { results, hiddenByAgent } = search(docs, q, filters);
    const ids = q ? results.map((d) => d.id) : staticOrder.filter((id) => results.some((d) => d.id === id));
    const shown = new Set(ids);
    for (const [id, li] of cells) li.hidden = !shown.has(id);
    for (const id of ids) grid.append(cells.get(id));
    for (const id of staticOrder) if (!shown.has(id)) grid.append(cells.get(id));

    // Counts: each facet counted over the docs that pass every other facet.
    for (const key of ['type', 'area', 'agent', 'without', 'status']) {
      const others = { ...filters, [key]: [] };
      const counts = facetCounts(search(docs, q, others).results, key);
      for (const el of $$(`[data-count-for^="${key}:"]`, form)) el.textContent = counts[el.dataset.countFor.slice(key.length + 1)] ?? 0;
    }

    const n = ids.length;
    status.textContent = n === 1 ? '1 item' : `${n} items`;
    if (q) status.textContent += ` for “${q}”`;
    hiddenNote.hidden = !hiddenByAgent;
    hiddenNote.textContent = hiddenByAgent ? `${hiddenByAgent === 1 ? '1 more item matches' : `${hiddenByAgent} more items match`} but isn’t set up for the agents you picked.` : '';
    if (empty) empty.hidden = n > 0;
    grid.hidden = n === 0;
    fillSlots(grid);

    const qs = filtersToQuery(q, filters);
    const url = `${location.pathname}${qs ? `?${qs}` : ''}${location.hash}`;
    if (url !== `${location.pathname}${location.search}${location.hash}`) history[push ? 'pushState' : 'replaceState'](null, '', url);
  };

  write(queryToFilters(location.search));
  let timer;
  input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => run(false), 120); });
  searchForm?.addEventListener('submit', (e) => { e.preventDefault(); run(true); });
  form.addEventListener('change', () => run(true));
  form.addEventListener('reset', () => setTimeout(() => run(true)));
  for (const btn of $$('[data-clear-filters]')) if (!form.contains(btn)) btn.addEventListener('click', () => { write({ q: '', filters: {} }); run(true); });
  addEventListener('popstate', () => { write(queryToFilters(location.search)); run(false); });
  run(false);
}

/* Chopper: fill the layout's zones with the renders the library shows, a story at a time. */
let chopperDone = false;
async function initChopper() {
  if (chopperDone || document.documentElement.dataset.chopper === 'off') return;
  if (document.body.dataset.chopperRenders === '0') return;
  if (matchMedia('(forced-colors: active)').matches) return;
  chopperDone = true;
  let library;
  try {
    const [{ pickMoments, zoneSizes }, res] = await Promise.all([import('../lib/picker.mjs'), fetch(`${base}assets/chopper/library.json`)]);
    library = await res.json();
    const minWidth = { none: 0, sm: 40, md: 56, lg: 72, xl: 90 };
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const zones = $$('.chopper-zone[data-zone]').map((el) => {
      const def = library.zones[el.dataset.zone];
      const host = el.closest('[data-zone-host]') ?? el.parentElement;
      const reached = (bp) => innerWidth >= (minWidth[bp] ?? 0) * rem;
      return { el, id: el.dataset.zone, top: host.getBoundingClientRect().top + scrollY, viewportHeight: innerHeight, available: !!def && reached(def.minBreakpoint), sizes: def ? zoneSizes(library, el.dataset.zone, reached) : [] };
    }).sort((a, b) => a.top - b.top);

    let visit = {};
    try { visit = JSON.parse(sessionStorage.getItem('loushing.visit') || '{}'); } catch { /* fresh visit */ }
    const params = new URLSearchParams(location.search);
    if (params.get('chopper-scene')) visit.review = { scene: params.get('chopper-scene') };
    else if (params.get('chopper-story')) visit.review = { story: params.get('chopper-story') };
    const seed = (crypto.getRandomValues(new Uint32Array(1))[0]) >>> 0;
    const { moments, visit: next } = pickMoments(zones, library, visit, new Date().getHours(), seed);
    try { sessionStorage.setItem('loushing.visit', JSON.stringify(next)); } catch { /* fine */ }

    for (const m of moments) {
      const zone = zones.find((z) => z.id === m.zone)?.el;
      if (!zone) continue;
      zone.dataset.size = m.images[0].size;
      if (m.images.length > 1) zone.dataset.pair = 'true';
      else zone.dataset.side = m.images[0].side;
      for (const img of m.images) {
        const render = library.scenes.find((s) => s.id === img.scene)?.renders?.[img.size];
        const el = new Image();
        el.alt = '';
        el.decoding = 'async';
        el.loading = 'lazy';
        if (render?.width) { el.width = render.width; el.height = render.height; }
        el.src = `${base}assets/chopper/${img.file}.png`;
        el.dataset.side = img.side;
        if (render?.status && render.status !== 'approved') el.dataset.status = render.status;
        zone.append(el);
      }
    }
  } catch {
    // Chopper is decoration; any failure leaves the page as it was.
  }
}

initTabs();
initCopy();
initSlots();
initTheme();
initLighting();
initChopperToggle();
initGetIt();
initSelects();
initCatalog();
if ('requestIdleCallback' in window) requestIdleCallback(() => initChopper(), { timeout: 2000 });
else setTimeout(initChopper, 200);
