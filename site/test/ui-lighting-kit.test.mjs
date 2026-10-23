import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

test('the ui-lighting kit carries the exact engine, renderer and styles the site runs', () => {
  assert.equal(read('../../skills/ui-lighting/assets/lighting.mjs'), read('../src/lib/lighting.mjs'), 'copy site/src/lib/lighting.mjs into the kit');
  assert.equal(read('../../skills/ui-lighting/assets/lighting.css'), read('../src/styles/lighting.css'), 'copy site/src/styles/lighting.css into the kit');
  const site = read('../src/client/light-renderer.js').replace("from '../lib/lighting.mjs';", "from './lighting.mjs';");
  assert.equal(read('../../skills/ui-lighting/assets/light-renderer.js'), site, 'copy site/src/client/light-renderer.js into the kit, importing ./lighting.mjs');
});

test('the kit’s host tokens match the values the site generates', () => {
  const kit = read('../../skills/ui-lighting/assets/host-tokens.css');
  const generated = read('../../design/tokens/dist/tokens.css');
  for (const name of ['layer-lighting', 'lighting-dark-tint', 'size-lighting-panel']) {
    const value = (css) => css.match(new RegExp(`--${name}: ([^;]+);`))?.[1].trim();
    assert.equal(value(kit), value(generated), `--${name}`);
  }
});
