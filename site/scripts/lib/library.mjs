/** Generates the design library from source documentation, registry and story data. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as fundamentals from '../../src/components/fundamentals.mjs';
import { REGISTRY } from '../../src/components/registry.mjs';
import { ResultsStatus } from '../../src/components/compounds/index-page.mjs';
import { LightingPanel } from '../../src/components/compounds/lighting.mjs';
import { LAYOUTS, Shell } from '../../src/layouts/layouts.mjs';
import { componentStories } from '../../src/stories/components.mjs';
import { html } from '../../src/lib/html.mjs';
import { url } from '../../src/lib/urls.mjs';

const sources = [
  'components/fundamentals.mjs', 'components/compounds/overview.mjs',
  'components/compounds/item.mjs', 'components/compounds/index-page.mjs', 'components/compounds/lighting.mjs',
];

export function componentDocs(root) {
  return sources.flatMap((source) => {
    const text = readFileSync(join(root, 'site', 'src', source), 'utf8');
    const imports = [...text.matchAll(/^import .+ from '([^']+)';/gm)].map((m) => m[1]);
    const tier = Number(text.match(/@tier (\d)/)?.[1]);
    const style = tier === 1 ? 'fundamentals' : 'compounds';
    const css = readFileSync(join(root, 'site', 'src', 'styles', `${style}.css`), 'utf8');
    return [...text.matchAll(/\/\*\*((?:(?!\*\/)[\s\S])*?)\*\/\s*export function ([A-Z]\w*)\(([^]*?)\) \{/g)].map((m) => ({
      name: m[2], source, tier, imports,
      documentation: m[1].split('\n').map((line) => line.replace(/^\s*\* ?/, '')).join('\n').trim(),
      signature: m[3],
      stylesheet: `styles/${style}.css`,
      stylesheetTokens: [...new Set([...css.matchAll(/var\(--([\w-]+)/g)].map((token) => token[1]))].sort(),
    }));
  });
}

export function buildLibrary(root, ctx, write) {
  const docs = componentDocs(root);
  const stories = componentStories(ctx.model);
  const renderers = { ...fundamentals, ...Object.fromEntries(Object.values(REGISTRY).map((fn) => [fn.name, fn])), ResultsStatus, LightingPanel };
  const metadata = { contexts: ['light', 'dark', 'light-more-contrast', 'dark-more-contrast', 'forced-colors'], components: docs, layouts: Object.entries(LAYOUTS).map(([name, { regions, zones }]) => ({ name, regions, zones })), stories: stories.map(({ props, ...story }) => story) };
  const assets = { ...ctx.assets, js: url('/assets/client/library.js') };
  const page = (path, title, main) => write(`${path.slice(1)}/index.html`, Shell({
    title, description: 'Generated examples of the existing Loushing components.', path, layout: 'article',
    main: LAYOUTS.article.render({ header: '', body: main }), assets, chopper: { renders: 0 }, headerSearch: false,
  }).toString());
  for (const story of stories) {
    const component = renderers[story.component];
    if (!component) throw new Error(`Unknown story component: ${story.component}`);
    const doc = docs.find((d) => d.name === story.component);
    if (!doc) throw new Error(`Missing component documentation: ${story.component}`);
    const rendered = story.shell ? html`` : component(story.props, ctx);
    const hasHeading = /<h1[\s>]/.test(String(rendered));
    page(`/library/${story.id}`, `${story.component}: ${story.variant}`, html`
      <nav aria-label="Library">${fundamentals.Link({ href: url('/library'), label: 'Component library' })}</nav>
      ${!hasHeading && html`<h1>${story.component}: ${story.variant}</h1>`}
      <p>States: ${story.states.join(', ')}.</p>
      ${story.exercise && html`<p>${story.exercise}</p>`}
      ${contextLinks(`/library/${story.id}`)}
      <section data-story="${story.id}" aria-label="${story.component} example">${rendered}</section>
      <details class="prose"><summary>Component documentation</summary><pre class="md-code" tabindex="0" role="region" aria-label="Component documentation">${doc.documentation}</pre><p>Source: <code>site/src/${doc.source}</code></p><p>Props and defaults: <code>${doc.signature}</code></p></details>`);
  }
  page('/library', 'Component library', html`<h1>Component library</h1>
    <p>Examples generated from the component source and catalog. Use the live controls to inspect focus, hover and pressed states.</p>
    ${contextLinks('/library')}
    <p>Forced colours follows your system setting. Browser checks also exercise 320 px reflow and enlarged text. These examples are not a claim of accessibility compliance.</p>
    <div class="prose">${[1, 2].map((tier) => html`<section><h2>${tier === 1 ? 'Fundamentals' : 'Compounds'}</h2>
      ${docs.filter((d) => d.tier === tier).map((d) => html`<h3>${d.name}</h3><ul>${stories.filter((s) => s.component === d.name).map((s) => html`<li>${fundamentals.Link({ href: url(`/library/${s.id}`), label: s.variant })} — ${s.states.join(', ')}</li>`)}</ul>`)}</section>`)}
      <section><h2>Layouts</h2><dl>${metadata.layouts.map((l) => html`<dt>${l.name}</dt><dd>Regions: ${l.regions.join(', ')}. Existing cameo zones: ${l.zones.join(', ')}.</dd>`)}</dl></section>
      <p>${fundamentals.Link({ href: url('/library/components.json'), label: 'Read component data' })}</p>
    </div>`);
  write('library/components.json', `${JSON.stringify(metadata, null, 2)}\n`);
  return stories.length + 1;
}

function contextLinks(path) {
  return html`<nav aria-label="Example context"><p>${[
    ['Light', 'light', 'normal'], ['Dark', 'dark', 'normal'],
    ['Light, more contrast', 'light', 'more'], ['Dark, more contrast', 'dark', 'more'],
  ].map(([label, scheme, contrast]) => html`${fundamentals.Link({ href: `${url(path)}?scheme=${scheme}&contrast=${contrast}`, label })} `)}</p></nav>`;
}
