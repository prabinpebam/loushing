/**
 * The view renderer: a view spec (layout + regions of blocks) becomes a page.
 * Queries in blocks are resolved against the model first, so compounds only see
 * plain data. Unknown layouts, regions or block types fail before rendering.
 */
import { html } from './lib/html.mjs';
import { REGISTRY } from './components/registry.mjs';
import { LAYOUTS, Shell } from './layouts/layouts.mjs';

export function validateView(view, name = 'view') {
  const errors = [];
  const layout = LAYOUTS[view.layout];
  if (!layout) errors.push(`${name}: unknown layout "${view.layout}"`);
  for (const [region, blocks] of Object.entries(view.regions ?? {})) {
    if (layout && !layout.regions.includes(region) && !layout.regions.includes('*')) errors.push(`${name}: the ${view.layout} layout has no region "${region}"`);
    for (const b of blocks) if (!REGISTRY[b.type]) errors.push(`${name}: no component for block type "${b.type}"`);
  }
  return errors;
}

function fill(template, ctx) {
  return String(template ?? '').replace(/\{(\w+)\.(\w+)\}/g, (_, obj, key) => ctx[obj]?.[key] ?? '');
}

export function renderBlock(block, ctx) {
  const props = {};
  for (const [k, v] of Object.entries(block)) {
    if (k === 'type') continue;
    props[k] = v && typeof v === 'object' && !Array.isArray(v) && 'from' in v ? ctx.model.resolve(v, ctx) : v;
  }
  return REGISTRY[block.type](props, ctx);
}

/**
 * @param {object} view a view spec
 * @param {{ model: object, item?: object, path: string, assets: object, chopper: object, page?: object }} ctx
 */
export function renderView(view, ctx) {
  const errors = validateView(view, ctx.path);
  if (errors.length) throw new Error(errors.join('\n'));
  const regions = {};
  for (const [region, blocks] of Object.entries(view.regions)) regions[region] = html`${blocks.map((b) => renderBlock(b, ctx))}`;
  const layout = LAYOUTS[view.layout];
  const main = layout.render(regions, ctx.page ?? {}, Object.keys(view.regions));
  return Shell({
    title: fill(view.title, ctx) || 'Loushing',
    description: ctx.description,
    path: ctx.path,
    layout: view.layout,
    main,
    assets: ctx.assets,
    chopper: ctx.chopper,
    alternate: ctx.alternate,
    headerSearch: ctx.headerSearch ?? true,
  }).toString();
}
