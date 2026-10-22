/**
 * Compounds for overviews: the hero, stat strip and the three tile families.
 * Made from fundamentals and tokens only; they take resolved plain data.
 * Styles: site/src/styles/compounds.css.
 * @tier 2
 */
import { html } from '../../lib/html.mjs';
import { url } from '../../lib/urls.mjs';
import { Badge, Chip, Icon, Metric, SearchBox, Tile } from '../fundamentals.mjs';
import { formatDate, plural } from './format.mjs';

/**
 * Hero: the page's promise and the search box (block `hero`).
 * Below the box, the job areas as quick starts, so the first screen shows what's here.
 * @param {{ title: string, standfirst?: string, search?: boolean }} props
 */
export function Hero({ title, standfirst, search }, { model }) {
  return html`<div class="c-hero">
  <h1 class="c-hero__title">${title}</h1>
  ${standfirst && html`<p class="c-hero__standfirst">${standfirst}</p>`}
  ${search && html`<div class="c-hero__search">${SearchBox({ id: 'hero-search', label: 'Search the catalog', placeholder: 'Describe your task, like “write a spec”', size: 'lg', action: url('/catalog') })}</div>`}
  ${search && model.areas.length > 0 && html`<p class="c-hero__starts"><span class="c-hero__starts-label">Or browse</span>${model.areas.map((a) => Chip({ label: a.title, icon: a.icon, href: url(a.url) }))}</p>`}
</div>`;
}

/**
 * StatStrip: catalog counts and freshness as number tiles (block `stat-strip`).
 * Shows only types that exist, so a new catalog never shows "0 skills".
 * @param {{ stats: { counts: {id,value,label,icon}[], latest: string|null } }} props
 */
export function StatStrip({ stats }) {
  return html`<ul class="c-stats" aria-label="The catalog in numbers">
  ${stats.counts.map((c) => html`<li class="c-stats__item">${Tile({ tone: 'sunken', children: Metric({ value: c.value, label: c.label, icon: c.icon }) })}</li>`)}
  ${stats.latest && html`<li class="c-stats__item">${Tile({ tone: 'sunken', children: Metric({ value: formatDate(stats.latest, 'short'), label: 'last updated', icon: 'schedule', kind: 'date' }) })}</li>`}
</ul>`;
}

/**
 * AreaTiles: job areas as tiles with their icon and item count (block `area-tiles`).
 * Only areas with at least one item reach this component (the model filters).
 * @param {{ items: {id,title,summary,icon,count,url}[] }} props
 */
export function AreaTiles({ items }) {
  return html`<section class="c-areas" aria-labelledby="areas-title">
  <h2 class="c-section-title" id="areas-title">Browse by job</h2>
  <ul class="c-areas__grid">${items.map((a) => html`<li>${Tile({
    href: url(a.url),
    tone: 'raised',
    children: html`<span class="c-areas__icon">${Icon({ name: a.icon })}</span><span class="c-areas__title">${a.title}</span><span class="c-areas__summary">${a.summary}</span><span class="c-areas__count">${plural(a.count, 'item')}${Icon({ name: 'arrow_forward' })}</span>`,
  })}</li>`)}</ul>
</section>`;
}

/**
 * ItemTiles: items as tiles (block `item-tiles`), in a bento, a tile grid or a list.
 * A tile shows type, title, summary and two facts; for a kit, its parts as a mini bar.
 * @param {{ items: object[], view?: 'bento'|'tiles'|'list', heading?: string }} props
 */
export function ItemTiles({ items, view = 'tiles', heading }) {
  const id = heading ? `h-${heading.toLowerCase().replace(/[^a-z]+/g, '-')}` : null;
  return html`<section class="c-items" data-view="${view}"${id ? html` aria-labelledby="${id}"` : ''}>
  ${heading && html`<h2 class="c-section-title" id="${id}">${heading}</h2>`}
  <ul class="c-items__grid">${items.map((item) => html`<li class="c-items__cell" data-id="${item.id}">${itemTile(item, view)}</li>`)}</ul>
</section>`;
}

/** One item as a tile: the private markup of ItemTiles, not a component of its own. */
function itemTile(item, view = 'tiles') {
  const type = item.type === 'part' ? item.kindTitle : item.typeTitle;
  return Tile({
    href: url(item.url),
    tone: 'raised',
    data: { type: item.type },
    children: html`<span class="c-tile__top">${Badge({ label: type, kind: 'type', value: item.type === 'part' ? item.kind : item.type })}${item.status && item.status !== 'stable' && Badge({ label: cap(item.status), kind: 'status', value: item.status })}</span>
<span class="c-tile__title">${item.title}</span>
${item.type === 'part' && html`<span class="c-tile__kit">Part of ${item.kit.title}</span>`}
<span class="c-tile__summary">${item.summary}</span>
${view !== 'list' && item.groups && html`<span class="c-tile__parts" aria-hidden="true">${item.groups.map((g) => html`<span class="c-tile__part" style="--part-count:${g.parts.length}" data-kind="${g.kind}"></span>`)}</span><span class="c-tile__legend">${item.groups.map((g) => html`<span class="c-tile__legend-item" data-kind="${g.kind}">${plural(g.parts.length, g.title.toLowerCase().replace(/s$/, ''))}</span>`)}</span>`}
${item.type === 'stack' && item.memberItems && html`<span class="c-tile__members">${item.memberItems.map((m, j) => html`${j > 0 && Icon({ name: 'east' })}<span>${m.item.title}</span>`)}</span>`}
<span class="c-tile__meta">${item.areaTitle && html`<span>${item.areaTitle}</span>`}${item.updated && html`<span>Updated ${formatDate(item.updated, 'short')}</span>`}</span>`,
  });
}

const cap = (s) => s[0].toUpperCase() + s.slice(1);

/**
 * StackTiles: stacks as tiles that show their members as a path (block `stack-tiles`).
 * @param {{ items: object[], heading?: string }} props
 */
export function StackTiles({ items, heading }) {
  if (!items.length) return html``;
  return html`<section class="c-stacks" aria-labelledby="stacks-title">
  ${heading && html`<h2 class="c-section-title" id="stacks-title">${heading}</h2>`}
  <ul class="c-stacks__list">${items.map((s) => html`<li>${Tile({
    href: url(s.url),
    tone: 'accent',
    children: html`<span class="c-stacks__top">${Badge({ label: 'Stack', kind: 'type', value: 'stack' })}</span>
<span class="c-stacks__title">${s.title}</span>
<span class="c-stacks__path">${s.memberItems.map((m, j) => html`${j > 0 && html`<span class="c-stacks__arrow">${Icon({ name: 'east' })}</span>`}<span class="c-stacks__member"><span class="c-stacks__step">${j + 1}</span>${m.item.title}</span>`)}</span>
<span class="c-stacks__summary">${s.summary}</span>`,
  })}</li>`)}</ul>
</section>`;
}
