// Builds the Loushing site into site/dist from the catalog, the design tokens and the
// view specs. No dependencies.
//   node site/scripts/build.mjs            build once (fails on any catalog problem)
//   SITE_URL=https://example.org BASE=/loushing/ node site/scripts/build.mjs
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCatalog } from './lib/catalog.mjs';
import { buildModel } from './lib/model.mjs';
import { catalogJson, feedXml, itemJson, itemMarkdown, llmsTxt, searchIndex } from './lib/outputs.mjs';
import { decodePng, encodePng, trimToAlpha } from './lib/png.mjs';
import { renderView } from '../src/render.mjs';
import { setBase, url } from '../src/lib/urls.mjs';
import { frontMatter } from '../src/lib/yaml.mjs';
import { iconPaths } from '../src/components/icons.mjs';

const started = performance.now();
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const src = join(root, 'site', 'src');
const finalDist = process.env.OUT_DIR ? resolve(process.env.OUT_DIR) : join(root, 'site', 'dist');
// Build into a private staging folder and swap it in only on success, so the preview
// always has a complete last good build, even when two builds overlap.
const dist = `${finalDist}.build-${process.pid}`;
process.on('exit', () => rmSync(dist, { recursive: true, force: true }));
setBase(process.env.BASE ?? '/', process.env.SITE_URL ?? '');

const catalog = loadCatalog(process.env.CATALOG_ROOT ? resolve(process.env.CATALOG_ROOT) : root);
if (catalog.problems.length) {
  console.error(`The catalog has ${catalog.problems.length} problem${catalog.problems.length === 1 ? '' : 's'}:\n`);
  for (const p of catalog.problems) console.error(`  ${p.file}: ${p.message}\n    Fix: ${p.fix}`);
  process.exit(1);
}
const model = buildModel(catalog);

rmSync(dist, { recursive: true, force: true });
const write = (path, content) => {
  const file = join(dist, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
};
const copy = (from, to) => {
  mkdirSync(dirname(join(dist, to)), { recursive: true });
  copyFileSync(from, join(dist, to));
};
const hash = (s) => createHash('sha256').update(s).digest('hex').slice(0, 10);

// Styles: tokens first, then the tiers in order, as one file.
const STYLE_FILES = ['base', 'fundamentals', 'compounds', 'layouts', 'chopper'];
const cssParts = [join(root, 'design', 'tokens', 'dist', 'tokens.css'), ...STYLE_FILES.map((n) => join(src, 'styles', `${n}.css`))];
const css = cssParts.map((f) => `/* ${f.slice(root.length + 1).replace(/\\/g, '/')} */\n${readFileSync(f, 'utf8')}`).join('\n');
write('assets/site.css', css);

// Fonts, client modules and the shared pure libraries the client imports.
for (const f of readdirSync(join(src, 'vendor', 'fonts'))) copy(join(src, 'vendor', 'fonts', f), `assets/fonts/${f}`);
let jsHash = '';
for (const [dir, files] of [['client', readdirSync(join(src, 'client'))], ['lib', ['search.mjs', 'picker.mjs', 'listbox.mjs']]]) {
  for (const f of files) {
    const text = readFileSync(join(src, dir, f), 'utf8');
    jsHash += hash(text);
    write(`assets/${dir}/${f}`, text);
  }
}
write('assets/favicon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path fill="#a8412f" d="${iconPaths('pets')[0]}"/></svg>`);

// Chopper: renders whose status the library shows (rules.statusesShown) reach the site,
// trimmed to the figure. Every render is shown at the same reduction, so line weight
// matches across images: CSS px = master px / (2 × drawing.masterFactor).
const scenes = JSON.parse(readFileSync(join(root, 'design', 'chopper', 'scenes.json'), 'utf8'));
const library = chopperLibrary(scenes);
write('assets/chopper/library.json', JSON.stringify(library));

const assets = { css: [`${url('/assets/site.css')}?v=${hash(css)}`], js: `${url('/assets/client/app.js')}?v=${hash(jsHash)}` };
const chopper = { renders: library.renderCount };
const views = Object.fromEntries(readdirSync(join(root, 'design', 'views')).filter((f) => f.endsWith('.view.json')).map((f) => [f.replace('.view.json', ''), JSON.parse(readFileSync(join(root, 'design', 'views', f), 'utf8'))]));
const content = (name) => frontMatter(readFileSync(join(src, 'content', name), 'utf8')).body;
const ctxBase = { model, assets, chopper, content };
let pages = 0;
const page = (path, view, ctx = {}) => {
  // Folder-style pages (items/slate/index.html) so /items/slate works on any static
  // host even though items/slate/ also holds the kit's part pages.
  const file = path === '/' ? 'index.html' : path === '/404' ? '404.html' : `${path.slice(1)}/index.html`;
  write(file, renderView(view, { ...ctxBase, path, ...ctx }));
  pages++;
};

page('/', views.home, { headerSearch: false, description: 'The AI agent skills and kits Prabin Pebam uses in his own work, each explained plainly, with how to set one up if you want to use it too.' });
page('/catalog', views.catalog, { headerSearch: false, page: { results: model.items.length + model.parts.length, endLine: 'That’s everything I use so far.' }, description: 'Search and filter every skill, kit and stack I use.' });
page('/whats-new', views['whats-new'], { page: { endLine: 'That’s the whole history so far.' }, description: 'Items added, updated or pinned to a new version.' });
page('/get-started', views['get-started'], { description: 'What skills, kits and stacks are, and how to get one.', alternate: url('/get-started.md') });
page('/for-agents', views['for-agents'], { description: 'Machine-readable files for agents.', alternate: url('/for-agents.md') });
page('/404', views['not-found'], { description: 'This page isn’t here.' });

for (const item of model.items) {
  const view = { kit: views.kit, skill: views.skill, stack: views.stack }[item.type];
  page(item.url, view, { item, description: item.summary, alternate: url(`${item.url}.md`) });
  write(`${item.url.slice(1)}.json`, JSON.stringify(itemJson(item, model), null, 2));
  write(`${item.url.slice(1)}.md`, itemMarkdown(item, model));
}
for (const part of model.parts) page(part.url, views.part, { item: part, description: part.summary });

write('catalog.json', JSON.stringify(catalogJson(model), null, 2));
write('search-index.json', JSON.stringify(searchIndex(model)));
write('llms.txt', llmsTxt(model));
write('feed.xml', feedXml(model));
for (const name of ['get-started', 'for-agents']) write(`${name}.md`, readFileSync(join(src, 'content', `${name}.md`), 'utf8'));

const ms = Math.round(performance.now() - started);
swapIn();
console.log(`Built ${pages} pages (${model.items.length} items, ${model.parts.length} parts) in ${ms} ms.`);

function swapIn() {
  const old = `${finalDist}.old-${process.pid}`;
  for (let attempt = 0; ; attempt++) {
    try {
      if (existsSync(finalDist)) renameSync(finalDist, old);
      renameSync(dist, finalDist);
      break;
    } catch (e) {
      // Windows can briefly lock a folder that is being read; try again shortly.
      if (attempt >= 20) throw e;
      try {
        if (existsSync(old) && !existsSync(finalDist)) renameSync(old, finalDist);
      } catch { /* still locked; the next attempt tries again */ }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
    }
  }
  rmSync(old, { recursive: true, force: true });
}

function chopperLibrary(data) {
  const shown = new Set(data.rules?.statusesShown ?? ['approved']);
  const scale = 2 * (data.drawing?.masterFactor ?? 1);
  const files = [];
  const scenesOut = [];
  for (const s of data.scenes ?? []) {
    if (s.status !== 'active') continue;
    const renders = {};
    for (const [size, r] of Object.entries(s.renders ?? {})) {
      if (!shown.has(r.status)) continue;
      // Masters are design/chopper/source/<id>.<size>.png. Stage 1 gap: no WebP 1x/2x
      // conversion yet (no dependency-free encoder), so the trimmed master ships as PNG.
      const file = `${s.id}.${size}.png`;
      const master = join(root, 'design', 'chopper', 'source', file);
      if (!existsSync(master)) {
        console.warn(`Chopper: ${s.id} (${size}) is ${r.status} but design/chopper/source/${file} is missing; it won't show.`);
        continue;
      }
      const img = trimToAlpha(decodePng(readFileSync(master)), 2);
      write(`assets/chopper/${file}`, encodePng(img));
      renders[size] = { status: r.status, canvas: r.canvas, width: Math.round(img.width / scale), height: Math.round(img.height / scale) };
      files.push(file);
    }
    if (Object.keys(renders).length) scenesOut.push({ ...s, renders });
  }
  return { rules: data.rules, zones: data.zones, scenes: scenesOut, setPieces: data.setPieces ?? [], threads: data.threads ?? [], renderCount: files.length, files };
}
