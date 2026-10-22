/**
 * The site's only script: progressive enhancement over pages that work without it.
 * Tabs, copy buttons, theme and Chopper switches, the Get it pickers, catalog
 * filtering and Chopper's cameo picker. Pure logic lives in /assets/lib (tier 0).
 */
import { search, facetCounts, filtersToQuery, queryToFilters } from '../lib/search.mjs';

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
    hiddenNote.textContent = hiddenByAgent ? `${hiddenByAgent === 1 ? '1 more item matches' : `${hiddenByAgent} more items match`} but isn't set up for the agents you picked.` : '';
    if (empty) empty.hidden = n > 0;
    grid.hidden = n === 0;

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

/* Chopper: fill the layout's zones with approved renders, a story at a time. */
let chopperDone = false;
async function initChopper() {
  if (chopperDone || document.documentElement.dataset.chopper === 'off') return;
  if (document.body.dataset.chopperRenders === '0') return;
  if (matchMedia('(forced-colors: active)').matches) return;
  chopperDone = true;
  let library;
  try {
    const [{ pickMoments }, res] = await Promise.all([import('../lib/picker.mjs'), fetch(`${base}assets/chopper/library.json`)]);
    library = await res.json();
    const minWidth = { none: 0, sm: 40, md: 56, lg: 72, xl: 90 };
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const zones = $$('.chopper-zone[data-zone]').map((el) => {
      const def = library.zones[el.dataset.zone];
      const host = el.closest('[data-zone-host]') ?? el.parentElement;
      return { el, id: el.dataset.zone, top: host.getBoundingClientRect().top + scrollY, viewportHeight: innerHeight, available: !!def && innerWidth >= (minWidth[def.minBreakpoint] ?? 0) * rem };
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
        const el = new Image();
        el.alt = '';
        el.decoding = 'async';
        el.loading = 'lazy';
        el.src = `${base}assets/chopper/${img.file}.png`;
        el.dataset.side = img.side;
        zone.append(el);
      }
    }
  } catch {
    // Chopper is decoration; any failure leaves the page as it was.
  }
}

initTabs();
initCopy();
initTheme();
initChopperToggle();
initGetIt();
initCatalog();
if ('requestIdleCallback' in window) requestIdleCallback(() => initChopper());
else setTimeout(initChopper, 200);
