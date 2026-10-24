// Design-system enforcement (docs/design/design-system.md#enforcement): tokens only,
// tiers, sealed fundamentals, documented components, and views made only from data.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REGISTRY } from '../src/components/registry.mjs';
import { LAYOUTS } from '../src/layouts/layouts.mjs';
import { validateView } from '../src/render.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const src = join(root, 'site', 'src');
const read = (...p) => readFileSync(join(...p), 'utf8');
const imports = (text) => [...text.matchAll(/^import [^;]*? from '([^']+)'/gm)].map((m) => m[1]);
const node = (args) => spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' });

/** Exported functions with their source up to the next export (the sources are ours). */
function exportedFunctions(text) {
  const starts = [...text.matchAll(/^export function (\w+)\s*\(/gm)];
  return starts.map((m, k) => {
    const before = text.slice(0, m.index).trimEnd();
    return { name: m[1], body: text.slice(m.index + m[0].length, starts[k + 1]?.index ?? text.length), documented: before.endsWith('*/') };
  });
}

test('styles: tokens only, primitives private, hover inside its media query', () => {
  const r = node(['agentic-craft/tools/lint-styles.mjs', 'site/src']);
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test('tokens: generated output is current and every contrast pair holds', () => {
  const built = node(['agentic-craft/tools/build-tokens.mjs', '--src', 'design/tokens', '--css', 'design/tokens/dist/tokens.css', '--md', 'docs/design/tokens.md', '--check']);
  assert.equal(built.status, 0, built.stdout + built.stderr);
  const contrast = node(['agentic-craft/tools/check-tokens.mjs', '--src', 'design/tokens', '--checks', 'design/tokens/checks.json']);
  assert.equal(contrast.status, 0, contrast.stdout + contrast.stderr);
});

test('links and selected states use color and weight, never underlines', () => {
  const styles = readdirSync(join(src, 'styles')).filter((name) => name.endsWith('.css'));
  for (const name of styles) {
    const css = read(src, 'styles', name).replace(/\/\*[\s\S]*?\*\//g, '');
    assert.doesNotMatch(css, /text-decoration(?:-line)?\s*:[^;{}]*\bunderline\b/, name);
    assert.doesNotMatch(css, /text-underline-|text-decoration-(?:color|thickness)\s*:/, name);
  }
  const base = read(src, 'styles', 'base.css');
  assert.match(base, /(?:^|\n)a\s*\{[^}]*text-decoration:\s*none/);
  assert.match(base, /\.prose a\s*\{[^}]*font-weight:\s*var\(--weight-semibold\)/);
  const fundamentals = read(src, 'styles', 'fundamentals.css');
  for (const selector of [".f-link[aria-current='page']", ".f-tabs__tab[aria-selected='true']"]) {
    const rule = fundamentals.slice(fundamentals.indexOf(selector)).split('}')[0];
    assert.ok(rule.startsWith(selector), selector);
    assert.match(rule, /color:\s*var\(--color-action\)/, selector);
    assert.match(rule, /font-weight:\s*var\(--weight-semibold\)/, selector);
    assert.doesNotMatch(rule, /border-bottom|text-decoration/);
  }
  const tab = fundamentals.match(/\.f-tabs__tab\s*\{([^}]+)\}/)[1];
  assert.doesNotMatch(tab, /border-bottom/);
  assert.match(base, /:focus-visible\s*\{[^}]*outline:\s*var\(--border-focus\)/);
});

test('tiers: each tier imports only from below', () => {
  assert.deepEqual(imports(read(src, 'components', 'fundamentals.mjs')).filter((p) => !/^\.\.\/lib\/|^\.\/icons\.mjs$/.test(p)), [], 'fundamentals use tier 0 only');
  const compounds = readdirSync(join(src, 'components', 'compounds')).filter((f) => f.endsWith('.mjs') && f !== 'format.mjs');
  for (const f of compounds) {
    const bad = imports(read(src, 'components', 'compounds', f)).filter((p) => !/^\.\.\/\.\.\/lib\/|^\.\.\/fundamentals\.mjs$|^\.\/format\.mjs$/.test(p));
    assert.deepEqual(bad, [], `${f} imports only fundamentals and tier 0`);
  }
  for (const f of readdirSync(join(src, 'lib'))) {
    assert.deepEqual(imports(read(src, 'lib', f)).filter((p) => !/^\.\/|^node:/.test(p)), [], `lib/${f} is tier 0`);
  }
  const layouts = imports(read(src, 'layouts', 'layouts.mjs'));
  assert.ok(layouts.every((p) => /^\.\.\/lib\/|^\.\.\/components\//.test(p)), 'layouts use components and tier 0');
});

test('tiers: a compound never renders another compound', () => {
  for (const f of ['overview.mjs', 'item.mjs', 'index-page.mjs']) {
    const fns = exportedFunctions(read(src, 'components', 'compounds', f)).filter((fn) => /^[A-Z]/.test(fn.name));
    const names = fns.map((fn) => fn.name);
    for (const fn of fns) {
      const used = names.filter((n) => n !== fn.name && new RegExp(`\\b${n}\\(`).test(fn.body));
      assert.deepEqual(used, [], `${fn.name} renders ${used.join(', ')}`);
    }
  }
});

test('fundamentals are sealed: no class or style props, only data passed through', () => {
  const text = read(src, 'components', 'fundamentals.mjs');
  const sigs = [...text.matchAll(/^export function (\w+)\s*\(([^)]*)\)/gm)];
  assert.ok(sigs.length >= 10);
  for (const [, name, params] of sigs) assert.doesNotMatch(params, /\b(class|className|style)\b/, `${name} takes no class or style`);
});

test('every component documents itself: purpose, tier and props', () => {
  const files = [['components', 'fundamentals.mjs'], ['components', 'compounds', 'overview.mjs'], ['components', 'compounds', 'item.mjs'], ['components', 'compounds', 'index-page.mjs'], ['layouts', 'layouts.mjs']];
  for (const f of files) {
    for (const fn of exportedFunctions(read(src, ...f))) {
      assert.ok(fn.documented, `${fn.name} in ${f.at(-1)} has a doc comment`);
    }
  }
  assert.match(read(src, 'components', 'fundamentals.mjs'), /@tier 1/);
});

test('views: every view is valid data for a known layout, with no styles of its own', () => {
  const dir = join(root, 'design', 'views');
  const used = new Set();
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.view.json'))) {
    const view = JSON.parse(read(dir, f));
    assert.deepEqual(validateView(view, f), []);
    assert.ok(LAYOUTS[view.layout], `${f} names a layout`);
    const text = JSON.stringify(view);
    assert.doesNotMatch(text, /"(style|class|className|css)"\s*:/, `${f} carries no styles`);
    for (const blocks of Object.values(view.regions)) for (const b of blocks) used.add(b.type);
  }
  const unused = Object.keys(REGISTRY).filter((t) => !used.has(t));
  assert.deepEqual(unused, [], 'every registered component is used by a view');
});

test('Chopper never gets in the way: no clicks, hidden on request, in forced colours and print', () => {
  const css = read(src, 'styles', 'chopper.css');
  assert.match(css, /pointer-events:\s*none/);
  assert.match(css, /data-chopper=['"]?off/);
  assert.match(css, /forced-colors:\s*active/);
  assert.match(css, /@media print/);
});
