/**
 * Compounds for index, article and message pages.
 * @tier 2
 */
import { html, raw } from '../../lib/html.mjs';
import { renderMarkdown } from '../../lib/markdown.mjs';
import { facetCounts } from '../../lib/search.mjs';
import { url } from '../../lib/urls.mjs';
import { Badge, Button, Icon, SearchBox } from '../fundamentals.mjs';
import { formatDate } from './format.mjs';

const FACET_TITLES = { type: 'Type', area: 'Job', agent: 'Works with', effects: 'Leave out items that', status: 'Status' };

/**
 * FacetBar: the catalog's search box and filters with counts (block `facet-bar`).
 * Filters live in the URL (?q=&type=&area=&agent=&without=&status=), so a filtered
 * list can be shared. The client filters the server-rendered list in place.
 * @a11y Native checkboxes in fieldsets; the result count is a polite live region.
 * @param {{ facets: string[] }} props
 */
export function FacetBar({ facets }, { model }) {
  const docs = model.docs;
  const groups = facets.map((f) => {
    const key = f === 'effects' ? 'without' : f;
    const counts = facetCounts(docs, key);
    let options;
    if (f === 'type') options = [['kit', 'Kits and their parts'], ['stack', 'Stacks'], ['skill', 'Skills']].filter(([v]) => counts[v]).map(([v, l]) => ({ v, l, n: counts[v] }));
    else if (f === 'area') options = model.areas.map((a) => ({ v: a.id, l: a.title, n: counts[a.id] ?? 0 }));
    else if (f === 'agent') options = model.taxonomy.agents.map((a) => ({ v: a.id, l: a.title, n: counts[a.id] ?? 0 })).filter((o) => o.n);
    else if (f === 'effects') options = model.taxonomy.effects.map((e) => ({ v: e.id, l: e.without, n: counts[e.id] ?? 0 })).filter((o) => o.n);
    else if (f === 'status') options = model.taxonomy.statuses.filter((s) => s.id !== 'deprecated').map((s) => ({ v: s.id, l: s.title, n: counts[s.id] ?? 0 })).filter((o) => o.n);
    return { f, key, options };
  }).filter((g) => g.options.length > 0);
  return html`<div class="c-facets" data-facets>
  ${SearchBox({ id: 'catalog-search', label: 'Search the catalog', placeholder: 'Describe your task', action: url('/catalog'), hideLabel: false, live: true })}
  <form class="c-facets__form" aria-label="Filters" data-facet-form>
    ${groups.map((g) => html`<fieldset class="c-facets__group"><legend>${FACET_TITLES[g.f]}</legend>${g.options.map((o) => html`<label class="c-facets__option"><input type="checkbox" name="${g.key}" value="${o.v}"><span class="c-facets__label">${o.l}</span><span class="c-facets__count" data-count-for="${g.key}:${o.v}">${o.n}</span></label>`)}</fieldset>`)}
    <button class="c-facets__clear" type="reset" data-clear-filters>Clear filters</button>
  </form>
</div>`;
}

/**
 * ResultsHeader: the live count above results, and the hidden-by-agent note.
 * Rendered by the index layout with the result list.
 */
export function ResultsStatus({ total }) {
  return html`<p class="c-results__status" role="status" aria-live="polite" data-results-status>${total} items</p>
<p class="c-results__hidden" data-hidden-by-agent hidden></p>`;
}

/**
 * ReleaseTimeline: changes newest first, grouped by month, as a vertical timeline
 * (block `release-timeline`).
 * @param {{ items: { date: string, kind: string, item: object, line: string }[] }} props
 */
export function ReleaseTimeline({ items }) {
  const months = new Map();
  for (const e of items) {
    const k = formatDate(e.date, 'month');
    if (!months.has(k)) months.set(k, []);
    months.get(k).push(e);
  }
  const kinds = { pinned: ['Pinned', 'fact_check'], added: ['Added', 'new_label'], updated: ['Updated', 'history'] };
  return html`<div class="c-timeline">${[...months].map(([month, list]) => html`<section class="c-timeline__month" aria-labelledby="m-${month.replace(/\s/g, '-')}">
  <h2 class="c-timeline__title" id="m-${month.replace(/\s/g, '-')}">${month}</h2>
  <ol class="c-timeline__list">${list.map((e) => html`<li class="c-timeline__entry" data-kind="${e.kind}">
    <span class="c-timeline__dot">${Icon({ name: kinds[e.kind][1] })}</span>
    <span class="c-timeline__date">${formatDate(e.date)}</span>
    <span class="c-timeline__what">${Badge({ label: kinds[e.kind][0], kind: 'status', value: e.kind })} <a href="${url(e.item.url)}">${e.item.title}</a></span>
    <span class="c-timeline__line">${e.line}</span>
  </li>`)}</ol>
</section>`)}</div>`;
}

const EMPTY = {
  'no-results': { icon: 'search_off', title: 'Nothing matches that yet', body: 'Try fewer words, or a word for the job rather than a tool.', action: { label: 'Clear search and filters', href: '/catalog', data: { 'clear-filters': 'true' } } },
  'not-found': { icon: 'explore', title: "This page isn't here", body: 'The address may be mistyped, or the page may have moved. Items keep their addresses, so try searching for it.', action: { label: 'Search the catalog', href: '/catalog' } },
  gone: { icon: 'history', title: 'This item was removed', body: 'Its page stays so links keep working. The catalog lists what to use instead.', action: { label: 'See the catalog', href: '/catalog' } },
  'empty-catalog': { icon: 'inventory_2', title: 'Nothing here yet', body: 'Items appear here as I add them.', action: null },
};

/**
 * EmptyState: what happened, what it means, what to do (block `empty-state`).
 * Layouts place the empty-companion cameo zone beside it, never over it.
 * @param {{ kind: 'no-results'|'not-found'|'gone'|'empty-catalog', hidden?: boolean, pageTitle?: boolean }} props
 *   `pageTitle` makes the title the page's h1, for a page that is only this message
 */
export function EmptyState({ kind, hidden = false, pageTitle = false }) {
  const e = EMPTY[kind];
  return html`<div class="c-empty" data-empty="${kind}"${hidden ? raw(' hidden') : ''}>
  <span class="c-empty__icon">${Icon({ name: e.icon })}</span>
  <div class="c-empty__text">${pageTitle ? html`<h1 class="c-empty__title">${e.title}</h1>` : html`<p class="c-empty__title">${e.title}</p>`}<p class="c-empty__body">${e.body}</p>
  ${e.action && Button({ label: e.action.label, kind: 'secondary', href: url(e.action.href), data: e.action.data })}</div>
</div>`;
}

/**
 * Text: authored Markdown for articles (block `text`). Text content stays text.
 * @param {{ markdown?: string, src?: string }} props  `src` names a file in site/src/content, read by the build
 */
export function Text({ markdown, src }, ctx = {}) {
  const text = src ? ctx.content(src) : markdown;
  return html`<div class="prose">${raw(renderMarkdown(text, { resolveLink: (h) => (h.startsWith('/') ? url(h) : h) }))}</div>`;
}
