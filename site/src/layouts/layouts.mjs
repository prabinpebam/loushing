/**
 * Layouts: page frames with named regions, and the only owners of Chopper's cameo
 * zones (design/chopper/scenes.json). Regions take rendered blocks from a view; a
 * layout adds no content of its own beyond the shared header and footer.
 * Styles: site/src/styles/layouts.css.
 * @tier 3
 */
import { html, raw } from '../lib/html.mjs';
import { url } from '../lib/urls.mjs';
import { Divider, Icon, IconButton, Link, SearchBox, Toggle } from '../components/fundamentals.mjs';
import { ResultsStatus } from '../components/compounds/index-page.mjs';

/** A cameo zone: empty until the picker fills it with an approved render. */
export function Zone(id, align) {
  return html`<div class="chopper-zone" data-zone="${id}"${align ? html` data-align="${align}"` : ''} aria-hidden="true"></div>`;
}

export const LAYOUTS = {
  /** Landing (Home): masthead, pulse, bento, fresh. Zones: masthead-edge, tile-peek, section-break, footer-ledge. */
  landing: { regions: ['masthead', 'pulse', 'bento', 'fresh'], zones: ['masthead-edge', 'tile-peek', 'section-break', 'footer-ledge'], render: (r) => html`<div class="l-landing">
  <section class="l-landing__masthead">${r.masthead}${Zone('masthead-edge', 'end')}</section>
  <div class="l-landing__pulse" data-zone-host="tile-peek">${Zone('tile-peek')}${r.pulse}</div>
  <div class="l-landing__bento">${r.bento}</div>
  ${Divider({ zone: true })}
  <div class="l-landing__fresh">${r.fresh}</div>
</div>` },

  /** Index (Catalog, What's new): head, filters, results. Zones: list-end, footer-ledge. */
  index: { regions: ['head', 'filters', 'results'], zones: ['list-end', 'footer-ledge'], render: (r, page) => html`<div class="l-index"${r.filters ? '' : raw(' data-single="true"')}>
  <header class="l-index__head">${r.head}</header>
  <div class="l-index__body">
    ${r.filters && html`<aside class="l-index__filters" aria-label="Search and filters">${r.filters}</aside>`}
    <div class="l-index__results">${page.results != null && ResultsStatus({ total: page.results })}${r.results}<div class="l-index__end" data-zone-host="list-end"><p class="l-index__end-line">${page.endLine ?? 'That’s everything.'}</p>${Zone('list-end')}</div></div>
  </div>
</div>` },

  /** Item (skill, kit, part): header, get (aside on wide screens), then the main regions in view order. Zones: section-break, gutter, footer-ledge. */
  item: { regions: ['header', 'get', '*'], zones: ['section-break', 'gutter', 'footer-ledge'], render: (r, page, order) => itemFrame(r, order, 'item') },

  /** Path (stack pages): as Item, with the members path first. */
  path: { regions: ['header', 'get', '*'], zones: ['section-break', 'gutter', 'footer-ledge'], render: (r, page, order) => itemFrame(r, order, 'path') },

  /** Article (Get started, For agents): header and body at reading measure. Zones: gutter, footer-ledge. */
  article: { regions: ['header', 'body'], zones: ['gutter', 'footer-ledge'], render: (r) => html`<article class="l-article">${Zone('gutter', 'end')}<header class="l-article__head">${r.header}</header><div class="l-article__body">${r.body}</div></article>` },

  /** Message (Not found, Gone): one message with its companion zone beside it. */
  message: { regions: ['body'], zones: ['empty-companion', 'footer-ledge'], render: (r) => html`<div class="l-message"><div class="l-message__body">${r.body}</div>${Zone('empty-companion', 'end')}</div>` },
};

function itemFrame(r, order, kind) {
  const main = order.filter((k) => k !== 'header' && k !== 'get' && r[k] && String(r[k]).trim());
  return html`<div class="l-item" data-kind="${kind}">
  <div class="l-item__header">${r.header}</div>
  <div class="l-item__grid">
    ${r.get && html`<aside class="l-item__aside" aria-label="Get it">${r.get}</aside>`}
    <div class="l-item__main">${main.map((k, i) => html`${i > 0 && i % 3 === 0 ? Divider({ zone: true }) : ''}<div class="l-item__region" data-region="${k}">${r[k]}</div>`)}</div>
  </div>
  ${Zone('gutter', 'start')}
</div>`;
}

const NAV = [
  { href: '/catalog', label: 'Catalog' },
  { href: '/get-started', label: 'Get started' },
  { href: '/whats-new', label: "What's new" },
  { href: '/for-agents', label: 'For agents' },
];

/**
 * The page shell: head, header, main and footer. The theme is set before first paint
 * from the saved choice, so there is no flash.
 */
export function Shell({ title, description, path, layout, main, assets, chopper, alternate, headerSearch = true }) {
  const docTitle = title === 'Loushing' ? 'Loushing: skills, kits and stacks for AI agents' : `${title} · Loushing`;
  return html`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${docTitle}</title>
${description && html`<meta name="description" content="${description}">`}
<meta name="color-scheme" content="light dark">
<link rel="icon" href="${url('/assets/favicon.svg')}" type="image/svg+xml">
<link rel="preload" href="${url('/assets/fonts/inter-latin-wght-normal.woff2')}" as="font" type="font/woff2" crossorigin>
${assets.css.map((h) => html`<link rel="stylesheet" href="${h}">`)}
${alternate && html`<link rel="alternate" type="text/markdown" href="${alternate}">`}
<link rel="alternate" type="application/rss+xml" title="Loushing: what's new" href="${url('/feed.xml')}">
<script>${raw(THEME_BOOT)}</script>
<script type="module" src="${assets.js}"></script>
</head>
<body data-layout="${layout}" data-chopper-renders="${chopper.renders}" data-base="${url('/')}">
<a class="u-skip" href="#main">Skip to content</a>
<header class="l-header">
  <div class="l-header__inner">
    <a class="l-header__brand" href="${url('/')}" aria-label="Loushing home">${Icon({ name: 'pets' })}<span>Loushing</span></a>
    <nav class="l-header__nav" aria-label="Main"><ul>${NAV.map((n) => html`<li>${Link({ href: url(n.href), label: n.label, current: path === n.href })}</li>`)}</ul></nav>
    ${headerSearch && html`<div class="l-header__search">${SearchBox({ id: 'header-search', label: 'Search the catalog', placeholder: 'Search skills and kits', action: url('/catalog') })}</div>`}
    ${IconButton({ label: 'Theme: match my system', icon: 'contrast', data: { 'theme-toggle': 'true' } })}
  </div>
</header>
<main id="main" class="l-main" tabindex="-1">
${main}
</main>
<footer class="l-footer" data-zone-host="footer-ledge">
  ${Zone('footer-ledge')}
  <div class="l-footer__inner">
    <p class="l-footer__tribute">${Icon({ name: 'pets' })}<span>Chopper, a very good boy, keeps us company here.</span></p>
    ${Toggle({ label: 'Show Chopper', checked: true, data: { 'chopper-toggle': 'true' } })}
    <ul class="l-footer__links">
      <li>${Link({ href: 'https://github.com/prabinpebam/loushing', label: 'GitHub', external: true })}</li>
      <li>${Link({ href: url('/catalog.json'), label: 'catalog.json' })}</li>
      <li>${Link({ href: url('/llms.txt'), label: 'llms.txt' })}</li>
      <li>${Link({ href: url('/feed.xml'), label: 'Feed' })}</li>
    </ul>
  </div>
</footer>
</body>
</html>
`;
}

const THEME_BOOT = `try{var s=localStorage.getItem('loushing.theme');if(s==='light'||s==='dark')document.documentElement.dataset.scheme=s;if(localStorage.getItem('loushing.chopper')==='off'||/[?&]chopper=off/.test(location.search))document.documentElement.dataset.chopper='off';}catch(e){}`;
