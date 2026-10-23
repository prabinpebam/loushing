import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

test('the kit’s own check passes on the kit', () => {
  const check = fileURLToPath(new URL('../../skills/ui-lighting/scripts/check-lighting.mjs', import.meta.url));
  const env = { ...process.env };
  for (const name of ['LIGHTING_ENGINE', 'LIGHTING_RENDERER', 'LIGHTING_CSS', 'LIGHTING_PANEL', 'NODE_TEST_CONTEXT']) delete env[name];
  const out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', check], { env, encoding: 'utf8' });
  assert.match(out, /# fail 0/);
});

test('the ui-lighting kit carries the exact engine, renderer and styles the site runs', () => {
  assert.equal(read('../../skills/ui-lighting/assets/lighting.mjs'), read('../src/lib/lighting.mjs'), 'copy site/src/lib/lighting.mjs into the kit');
  assert.equal(read('../../skills/ui-lighting/assets/lighting.css'), read('../src/styles/lighting.css'), 'copy site/src/styles/lighting.css into the kit');
  const site = read('../src/client/light-renderer.js').replace("from '../lib/lighting.mjs';", "from './lighting.mjs';");
  assert.equal(read('../../skills/ui-lighting/assets/light-renderer.js'), site, 'copy site/src/client/light-renderer.js into the kit, importing ./lighting.mjs');
});

test('the kit’s gobo masks are the ones the site builds from the owner’s images', async () => {
  const { GOBOS } = await import('../src/lib/lighting.mjs');
  const { decodePng, encodePng, lightMask } = await import('../scripts/lib/png.mjs');
  for (const [name, { file }] of Object.entries(GOBOS)) {
    const source = readFileSync(new URL(`../../design/lighting/gobos/${name}.png`, import.meta.url));
    const kit = readFileSync(new URL(`../../skills/ui-lighting/assets/${file}`, import.meta.url));
    assert.ok(encodePng(lightMask(decodePng(source), 2)).equals(kit), `rebuild skills/ui-lighting/assets/${file} from design/lighting/gobos/${name}.png`);
  }
});

test('the kit’s host tokens match the values the site generates', () => {
  const kit = read('../../skills/ui-lighting/assets/host-tokens.css');
  const generated = read('../../design/tokens/dist/tokens.css');
  for (const name of ['layer-lighting', 'lighting-dark-tint', 'size-lighting-panel']) {
    const value = (css) => css.match(new RegExp(`--${name}: ([^;]+);`))?.[1].trim();
    assert.equal(value(kit), value(generated), `--${name}`);
  }
});
