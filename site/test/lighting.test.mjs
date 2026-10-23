import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  LIGHT_DEFAULTS, LIGHT_LEVELS, LIGHT_SCHEMA, OFF_FRAME, SKY_BINS,
  boxDistance, casterReach, lightingMotion, lightingProperties, offFrameCasters, projectShadow,
  rayEntry, shadowAt, skyOcclusion, sourceBins, upgradeLighting, validateLighting,
} from '../src/lib/lighting.mjs';
import { LightingPanel } from '../src/components/compounds/lighting.mjs';
import { Button, Tile } from '../src/components/fundamentals.mjs';

const near = (actual, expected, tolerance = 1e-8) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);
const rad = Math.PI / 180;
const geometry = { height: 10, azimuth: 315, altitude: 45, sourceSize: 60 };
const light = (overrides = {}) => ({ ...LIGHT_DEFAULTS, globalIllumination: 0, shadowIntensity: 100, ...overrides });
const wall = (z) => ({ x: -5000, y: 0, width: 10000, height: 40, radius: 0, z });

/**
 * Reference for shadowAt, independent of its bins: integrate over the source disc,
 * cosine-weighted, and trace every ray against each block as a solid extrusion standing
 * on the ground. A ray is hidden if it enters a block's footprint below the block's top.
 */
function traced([px, py], boxes, { azimuth, altitude, sourceSize }, steps = 160) {
  let floor = 0;
  for (const box of boxes) if (boxDistance(px, py, box) <= 0) floor = Math.max(floor, box.z);
  const phi = azimuth * rad;
  const a = altitude * rad;
  const centre = [Math.cos(a) * Math.sin(phi), -Math.cos(a) * Math.cos(phi), Math.sin(a)];
  const side = [Math.cos(phi), Math.sin(phi), 0];
  const up = [-Math.sin(a) * Math.sin(phi), Math.sin(a) * Math.cos(phi), Math.cos(a)];
  const radius = sourceSize * rad / 2;
  let seen = 0;
  let hidden = 0;
  for (let i = 0; i < steps; i++) {
    const rho = (i + 0.5) / steps * radius;
    for (let j = 0; j < steps; j++) {
      const psi = (j + 0.5) / steps * 2 * Math.PI;
      const ray = centre.map((c, k) => Math.cos(rho) * c + Math.sin(rho) * (Math.cos(psi) * side[k] + Math.sin(psi) * up[k]));
      if (ray[2] <= 0) continue;
      const weight = ray[2] * Math.sin(rho);
      const ground = Math.hypot(ray[0], ray[1]);
      const blocked = boxes.some((box) => box.z > floor && rayEntry(px, py, ray[0] / ground, ray[1] / ground, box) * ray[2] / ground < box.z - floor);
      seen += weight;
      if (blocked) hidden += weight;
    }
  }
  return hidden / seen;
}

test('distant-source projection: L = h / tan(a), lateral penumbra = 2h tan(theta/2) / sin(a)', () => {
  const p = projectShadow(geometry);
  near(p.length, 10);
  near(p.x, p.length / Math.sqrt(2));
  near(p.y, p.length / Math.sqrt(2));
  near(p.penumbra, 20 * Math.tan(30 * rad) / Math.sin(45 * rad));
  const doubled = projectShadow({ ...geometry, height: 20 });
  near(doubled.length, p.length * 2);
  near(doubled.penumbra, p.penumbra * 2);
});

test('the lateral penumbra matches rays traced from the edges of the source', () => {
  const { height, altitude, sourceSize } = { height: 7, altitude: 24, sourceSize: 50 };
  const half = sourceSize * rad / 2;
  const toward = [Math.cos(altitude * rad) * Math.cos(half), Math.sin(half), Math.sin(altitude * rad) * Math.cos(half)];
  near(projectShadow({ height, azimuth: 0, altitude, sourceSize }).penumbra, 2 * height / toward[2] * toward[1]);
});

test('compass names the source, and shadows point away from it', () => {
  for (const [azimuth, x, y] of [[0, 0, 1], [90, -1, 0], [180, 0, -1], [270, 1, 0]]) {
    const p = projectShadow({ ...geometry, azimuth });
    near(p.x, p.length * x);
    near(p.y, p.length * y);
  }
});

test('contact, point light, zenith and horizon have the expected limits', () => {
  assert.deepEqual(projectShadow({ ...geometry, height: 0 }), { x: 0, y: 0, length: 0, penumbra: 0 });
  assert.equal(projectShadow({ ...geometry, sourceSize: 0 }).penumbra, 0);
  near(projectShadow({ ...geometry, altitude: 90 }).length, 0);
  const horizon = projectShadow({ ...geometry, altitude: 0 });
  assert.equal(horizon.length, Infinity, 'a light on the horizon casts an endless shadow');
  assert.equal(horizon.penumbra, Infinity);
});

test('higher objects, lower lights and bigger sources each lengthen or soften shadows', () => {
  let previous = { length: -1, penumbra: -1 };
  for (const height of LIGHT_LEVELS) {
    const p = projectShadow({ ...geometry, height });
    assert.ok(p.length > previous.length);
    assert.ok(p.penumbra > previous.penumbra);
    previous = p;
  }
  assert.ok(projectShadow({ ...geometry, altitude: 12 }).length > projectShadow({ ...geometry, altitude: 60 }).length);
  assert.ok(projectShadow({ ...geometry, sourceSize: 120 }).penumbra > projectShadow({ ...geometry, sourceSize: 30 }).penumbra);
});

test('impossible light geometry is explicitly rejected', () => {
  for (const override of [{ height: -1 }, { sourceSize: -1 }, { sourceSize: 180 }, { altitude: -1 }, { altitude: 91 }, { height: NaN }, { azimuth: Infinity }]) {
    assert.throws(() => projectShadow({ ...geometry, ...override }));
  }
});

test('settings validate types, ranges, booleans, colours and unknown fields', () => {
  assert.deepEqual(validateLighting({}), LIGHT_DEFAULTS);
  assert.equal(validateLighting({ altitude: 0 }).altitude, 0, 'the light may sit on the horizon');
  for (const bad of [null, [], 1, { enabled: 'true' }, { speed: 0 }, { altitude: -1 }, { altitude: 86 }, { azimuth: 360 }, { sourceSize: NaN }, { sourceSize: 121 }, { globalIllumination: 101 }, { highlightTint: 'red' }, { shadowTint: '#fff' }, { shadowTint: ['#112233'] }, { extra: 1 }]) {
    assert.throws(() => validateLighting(bad));
  }
  assert.deepEqual(validateLighting(JSON.parse(JSON.stringify(LIGHT_DEFAULTS))), LIGHT_DEFAULTS);
});

test('saved settings upgrade to schema 3, resetting only what changed meaning', () => {
  assert.equal(LIGHT_SCHEMA, 3);
  const saved = { enabled: true, altitude: 14, sourceSize: 800, globalIllumination: 90, shadowIntensity: 55, shadowTint: '#112233' };
  assert.deepEqual(upgradeLighting(saved, 1), { ...LIGHT_DEFAULTS, enabled: true, altitude: 14, shadowIntensity: 55, shadowTint: '#112233' });
  assert.deepEqual(upgradeLighting({ altitude: 14, sourceSize: 60, globalIllumination: 90 }, 2), { ...LIGHT_DEFAULTS, altitude: 14, sourceSize: 60 });
  assert.deepEqual(upgradeLighting({ globalIllumination: 90 }, 3), { ...LIGHT_DEFAULTS, globalIllumination: 90 });
  for (const [value, version] of [[{ altitude: 90 }, 1], [null, 1], [[], 2], [{}, 0], [{}, 4], [{ sourceSize: 800 }, 3]]) {
    assert.throws(() => upgradeLighting(value, version));
  }
});

test('the source is cosine-weighted bins clipped at the horizon', () => {
  const point = sourceBins({ altitude: 30, sourceSize: 0 });
  assert.equal(point.point, true);
  near(point.bins[0].lo, 0.25);
  assert.equal(sourceBins({ altitude: 20, sourceSize: 30 }).bins.length, SKY_BINS);
  for (const [altitude, sourceSize] of [[40, 30], [25, 50], [60, 20]]) {
    const sky = sourceBins({ altitude, sourceSize });
    assert.equal(sky.wrap, false);
    for (const { lo, hi } of sky.bins) assert.ok(lo >= 0 && hi <= 1 && hi >= lo);
    near(sky.total, sky.bins.reduce((sum, { lo, hi }) => sum + hi - lo, 0));
    // A cap above the horizon projects to an ellipse of area pi sin^2(alpha) sin(a).
    const projected = Math.PI * Math.sin(sourceSize * rad / 2) ** 2 * Math.sin(altitude * rad);
    near(sky.total * sky.step / 2, projected, projected * 0.01);
  }
  assert.equal(sourceBins({ altitude: 70, sourceSize: 60 }).wrap, true, 'a source over the zenith surrounds it');
  assert.equal(Math.min(...sourceBins({ altitude: 0, sourceSize: 30 }).bins.map(({ lo }) => lo)), 0, 'nothing below the horizon');
  assert.throws(() => sourceBins({ altitude: 20, sourceSize: 30 }, 0));
});

test('rays enter rounded blocks through their faces or corner arcs, exactly', () => {
  const box = { x: 0, y: 0, width: 100, height: 40, radius: 10 };
  near(rayEntry(50, 60, 0, -1, box), 20);
  near(rayEntry(-30, 20, 1, 0, box), 30);
  assert.equal(rayEntry(50, 60, 0, 1, box), Infinity);
  assert.equal(rayEntry(50, 20, 0, -1, box), 0);
  const d = Math.SQRT1_2;
  assert.equal(rayEntry(-5, 8, d, -d, box), Infinity, 'clips the corner square but misses the arc');
  near(rayEntry(-5, 8, d, -d, { ...box, radius: 0 }), 5 * Math.SQRT2);
  near(rayEntry(-5, 13, d, -d, box), 18 / Math.SQRT2 - Math.sqrt(28), 1e-9);
  near(boxDistance(50, 20, box), -20);
  near(boxDistance(-5, -5, box), Math.hypot(15, 15) - 10);
  near(boxDistance(-5, -5, { ...box, radius: 0 }), Math.hypot(5, 5));
});

test('a point light casts one crisp prism attached at contact, dz / tan(altitude) long', () => {
  const block = { x: 0, y: 0, width: 100, height: 40, radius: 0, z: 10 };
  const north = light({ azimuth: 0, altitude: 30, sourceSize: 0 });
  const length = 10 / Math.tan(30 * rad);
  for (const d of [0.01, 5, length - 0.01]) assert.equal(shadowAt([50, 40 + d], [block], north).blocked, 1);
  for (const d of [length + 0.01, 30, 400]) assert.equal(shadowAt([50, 40 + d], [block], north).blocked, 0);
  assert.equal(shadowAt([50, -1], [block], north).blocked, 0, 'the side facing the light is lit');
  assert.equal(shadowAt([101, 45], [block], north).blocked, 0, 'nothing beside the prism');
  const northWest = light({ azimuth: 315, altitude: 45, sourceSize: 0 });
  assert.equal(shadowAt([104, 20], [block], northWest).blocked, 1, 'the extruded side wall shades');
  assert.equal(shadowAt([104, 2], [block], northWest).blocked, 0, 'the prism walls run from the corners');
  assert.equal(shadowAt([50, 46], [block], northWest).blocked, 1);
  assert.equal(shadowAt([50, 48], [block], northWest).blocked, 0);
  const horizon = light({ azimuth: 0, altitude: 0, sourceSize: 0 });
  assert.equal(shadowAt([50, 1e6], [block], horizon).blocked, 1, 'at altitude 0 the shadow never ends');
});

test('an area light fades the shadow with distance: a bigger source shortens the umbra and lengthens the fade', () => {
  const profile = (sourceSize) => Array.from({ length: 300 }, (_, d) => shadowAt([0, 40.5 + d], [wall(12)], light({ azimuth: 0, altitude: 20, sourceSize })).blocked);
  const small = profile(10);
  const large = profile(60);
  for (const p of [small, large]) {
    assert.ok(p[0] > 0.99, 'dark at contact');
    p.forEach((value, d) => d && assert.ok(value <= p[d - 1] + 1e-9, 'never darker further away'));
  }
  const umbra = (p) => p.findIndex((value) => value < 0.99);
  const tail = (p) => p.findLastIndex((value) => value > 0.01);
  assert.ok(umbra(small) > umbra(large), `umbra ${umbra(small)} vs ${umbra(large)}`);
  assert.ok(tail(large) > tail(small), `fade ${tail(large)} vs ${tail(small)}`);
  const sky = light({ azimuth: 0, altitude: 20, sourceSize: 30 });
  const reach = casterReach(12, sourceBins(sky));
  assert.ok(reach <= 12 / Math.tan(5 * rad) && reach > 0.99 * 12 / Math.tan(5 * rad), 'reach ends where the lowest edge of the source clears the top');
  assert.ok(shadowAt([0, 40 + reach * 0.9], [wall(12)], sky).blocked > 0);
  assert.equal(shadowAt([0, 40 + reach + 1], [wall(12)], sky).blocked, 0);
  assert.equal(casterReach(12, sourceBins({ altitude: 0, sourceSize: 0 })), Infinity);
});

test('the penumbra scales with height: a block twice as high casts the same shadow twice as far', () => {
  const settings = light({ azimuth: 0, altitude: 20, sourceSize: 40 });
  for (const d of [1, 10, 25, 60, 120]) {
    near(shadowAt([0, 40 + 2 * d], [wall(12)], settings).blocked, shadowAt([0, 40 + d], [wall(6)], settings).blocked, 1e-9);
  }
});

test('shadows from one light never darken where they overlap', () => {
  const a = { x: 0, y: 0, width: 100, height: 40, radius: 0, z: 10 };
  const b = { x: -100, y: -100, width: 60, height: 60, radius: 0, z: 40 };
  const point = light({ azimuth: 315, altitude: 15, sourceSize: 0, shadowIntensity: 55 });
  assert.equal(shadowAt([50, 50], [a], point).alpha, 0.55);
  assert.equal(shadowAt([50, 50], [b], point).alpha, 0.55);
  assert.equal(shadowAt([50, 50], [a, b], point).alpha, 0.55, 'not 1 - 0.45^2');
  const boxes = [
    { x: 0, y: 0, width: 80, height: 60, radius: 12, z: 12 },
    { x: 100, y: 30, width: 80, height: 60, radius: 12, z: 6 },
    { x: 40, y: 110, width: 50, height: 40, radius: 8, z: 24 },
  ];
  for (const globalIllumination of [0, 60]) {
    const settings = light({ azimuth: 315, altitude: 15, sourceSize: 40, shadowIntensity: 55, globalIllumination });
    for (let x = -20; x <= 260; x += 14) {
      for (let y = -20; y <= 260; y += 14) {
        if (boxes.some((box) => boxDistance(x, y, box) <= 0)) continue;
        const singles = boxes.map((box) => shadowAt([x, y], [box], settings).alpha);
        const union = shadowAt([x, y], boxes, settings).alpha;
        assert.ok(union <= 0.55 + 1e-12);
        assert.ok(union >= Math.max(...singles) - 1e-12);
        if (!globalIllumination) assert.ok(union <= singles.reduce((sum, value) => sum + value) + 1e-12);
      }
    }
  }
});

test('the binned shadow matches a brute-force ray trace of the source', () => {
  const boxes = [
    { x: 0, y: 0, width: 120, height: 60, radius: 16, z: 12 },
    { x: 150, y: 20, width: 40, height: 40, radius: 8, z: 24 },
    { x: 40, y: 20, width: 30, height: 20, radius: 4, z: 14 },
  ];
  const points = [[130, 70], [125, 30], [60, 75], [200, 80], [100, 100], [55, 45], [-10, 30]];
  for (const settings of [
    light({ azimuth: 315, altitude: 15, sourceSize: 40 }),
    light({ azimuth: 200, altitude: 35, sourceSize: 90 }),
    light({ azimuth: 80, altitude: 0, sourceSize: 20 }),
    light({ azimuth: 135, altitude: 60, sourceSize: 80 }),
  ]) {
    for (const point of points) near(shadowAt(point, boxes, settings).blocked, traced(point, boxes, settings), 0.03);
  }
});

test('a block shades only what is lower: stacked surfaces shade by their difference in height', () => {
  const card = { x: 0, y: 0, width: 200, height: 100, radius: 0, z: 12 };
  const button = { x: 20, y: 20, width: 60, height: 20, radius: 0, z: 14 };
  const settings = light({ azimuth: 0, altitude: 10, sourceSize: 0 });
  const length = 2 / Math.tan(10 * rad);
  assert.equal(shadowAt([50, 40 + length - 0.1], [card, button], settings).blocked, 1);
  assert.equal(shadowAt([50, 40 + length + 0.1], [card, button], settings).blocked, 0);
  assert.equal(shadowAt([50, 30], [card, { ...button, z: 6 }], settings).blocked, 0, 'a lower block never shades a higher one');
});

test('sky occlusion is the cosine-weighted sky a wall hides, checked by quadrature', () => {
  const quadrature = (d, z, n = 20000) => {
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const c = Math.cos(-Math.PI / 2 + (i + 0.5) / n * Math.PI);
      sum += z * z * c * c / (d * d + z * z * c * c);
    }
    return sum / n;
  };
  for (const [d, z] of [[0, 10], [5, 10], [10, 10], [40, 12], [200, 6]]) near(skyOcclusion(d, z), quadrature(d, z), 1e-6);
  assert.equal(skyOcclusion(0, 10), 1);
  assert.equal(skyOcclusion(5, 0), 0);
  near(skyOcclusion(10, 10, Math.PI / 2), (1 - Math.SQRT1_2) / 2);
  for (const bad of [[-1, 1], [1, -1], [1, 1, -1], [NaN, 1]]) assert.throws(() => skyOcclusion(...bad));
});

test('global illumination lightens shadows away from their casters, never at contact and never on lit ground', () => {
  const at = (d, globalIllumination) => shadowAt([0, 40 + d], [wall(12)], light({ azimuth: 0, altitude: 10, sourceSize: 30, shadowIntensity: 60, globalIllumination }));
  near(at(0.001, 100).alpha, 0.6, 1e-3);
  let previous = 1;
  for (const d of [5, 20, 60, 150]) {
    const plain = at(d, 0);
    const lifted = at(d, 100);
    near(plain.alpha, 0.6 * plain.blocked, 1e-12);
    const ratio = lifted.alpha / plain.alpha;
    near(ratio, skyOcclusion(d, 12), 1e-9);
    assert.ok(ratio < previous, 'the fade grows with distance, so it is never uniform');
    previous = ratio;
  }
  const lit = shadowAt([0, -10], [wall(12)], light({ azimuth: 0, altitude: 10, sourceSize: 30, globalIllumination: 100 }));
  assert.ok(lit.occlusion > 0.1);
  assert.equal(lit.alpha, 0, 'global illumination never casts a shadow');
});

test('off-frame casters stand outside the view, upwind, and drift deterministically', () => {
  const view = { width: 1280, height: 860 };
  for (let azimuth = 0; azimuth < 360; azimuth += 5) {
    const lx = Math.sin(azimuth * rad);
    const ly = -Math.cos(azimuth * rad);
    const still = offFrameCasters({ ...view, azimuth });
    for (const time of [0, 37, 500, 9999]) {
      const posts = offFrameCasters({ ...view, azimuth, time, speed: 7 });
      assert.equal(posts.length, OFF_FRAME.posts.length);
      posts.forEach((post, k) => {
        assert.ok(post.x >= view.width || post.x + post.width <= 0 || post.y >= view.height || post.y + post.height <= 0, `post ${k} at ${azimuth}° is outside the view`);
        const cx = post.x + post.width / 2 - view.width / 2;
        const cy = post.y + post.height / 2 - view.height / 2;
        assert.ok(cx * lx + cy * ly > 0, 'between the view and the light');
        assert.equal(post.z, OFF_FRAME.height);
        const sx = post.x - still[k].x;
        const sy = post.y - still[k].y;
        near(sx * lx + sy * ly, 0, 1e-6);
        assert.ok(Math.hypot(sx, sy) <= 2 * OFF_FRAME.drift + 1e-9, 'drifts along the edge only');
      });
    }
  }
  assert.deepEqual(offFrameCasters({ ...view, azimuth: 315, time: 42 }), offFrameCasters({ ...view, azimuth: 315, time: 42 }));
  assert.notDeepEqual(offFrameCasters({ ...view, azimuth: 315, time: 42 }), offFrameCasters({ ...view, azimuth: 315, time: 0 }));
  for (const bad of [{ width: 0 }, { height: -1 }, { speed: 0 }, { time: NaN }, { azimuth: Infinity }]) {
    assert.throws(() => offFrameCasters({ ...view, azimuth: 315, ...bad }));
  }
});

test('rims light the edge facing the light and shade the opposite edge', () => {
  const north = lightingProperties({ ...LIGHT_DEFAULTS, azimuth: 0 });
  assert.equal(north['--data-light-rim'], 'inset 0px 1px 0 var(--light-highlight), inset 0px -1px 0 var(--light-edge-shadow)');
  assert.equal(lightingProperties(LIGHT_DEFAULTS)['--data-light-rim'], 'inset 0.707px 0.707px 0 var(--light-highlight), inset -0.707px -0.707px 0 var(--light-edge-shadow)');
  assert.equal(north['--data-light-intensity'], `${LIGHT_DEFAULTS.shadowIntensity}%`);
  assert.equal(north['--data-light-highlight-tint'], LIGHT_DEFAULTS.highlightTint);
  for (let azimuth = 0; azimuth < 360; azimuth += 15) {
    for (const value of Object.values(lightingProperties({ ...LIGHT_DEFAULTS, azimuth }))) assert.doesNotMatch(value, /NaN|Infinity|\de-/);
  }
});

test('motion requires every opt-in and pauses when hidden or reduced motion is requested', () => {
  const on = { ...LIGHT_DEFAULTS, enabled: true, offFrame: true, animated: true };
  assert.equal(lightingMotion(on), true);
  for (const key of ['enabled', 'offFrame', 'animated']) assert.equal(lightingMotion({ ...on, [key]: false }), false);
  assert.equal(lightingMotion(on, { reducedMotion: true }), false);
  assert.equal(lightingMotion(on, { hidden: true }), false);
});

test('control panel covers every setting, with labels and no duplicate IDs', () => {
  const markup = String(LightingPanel());
  for (const key of Object.keys(LIGHT_DEFAULTS).filter((key) => key !== 'enabled')) {
    assert.match(markup, new RegExp(`data-light-setting="${key}"`));
  }
  const ids = [...markup.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(ids.length, new Set(ids).size);
  for (const [, id] of markup.matchAll(/<input[^>]* id="([^"]+)"/g)) assert.ok(markup.includes(`for="${id}"`));
  assert.match(markup, /<fieldset[^>]+ disabled>/, 'no-script fallback is honest');
});

test('only elevated surfaces opt in, and the lighting system stays independent of Loushing', () => {
  assert.match(String(Tile({ tone: 'sunken', children: '' })), /data-elevation="0"/);
  assert.match(String(Tile({ children: '' })), /data-elevation="2"/);
  assert.match(String(Tile({ tone: 'accent', children: '' })), /data-elevation="3"/);
  assert.match(String(Button({ label: 'Get it', kind: 'primary' })), /data-elevation="1"/);
  assert.doesNotMatch(String(Button({ label: 'Read more', kind: 'quiet' })), /data-elevation=/);
  const css = readFileSync(new URL('../src/styles/lighting.css', import.meta.url), 'utf8');
  assert.doesNotMatch(css, /\.f-|\.c-|\.l-|loushing/i);
  assert.match(css, /@media \(forced-colors: none\) and \(prefers-contrast: no-preference\) \{\s*\[data-lighting='on'\] \[data-elevation\]:not\(\[data-elevation='0'\]\) \{\s*box-shadow: var\(--data-light-rim\);/, 'rims only where colours are the author’s');
  const layer = css.match(/\[data-light-layer\] \{([^}]*)\}/)[1];
  for (const rule of [/pointer-events: none/, /mix-blend-mode: multiply/, /z-index: var\(--layer-lighting\)/, /contain: strict/]) assert.match(layer, rule);
  assert.match(css, /@media \(prefers-contrast: more\), \(forced-colors: active\), print \{\s*\[data-light-layer\] \{ display: none !important; \}/);
  const renderer = readFileSync(new URL('../src/client/light-renderer.js', import.meta.url), 'utf8');
  assert.deepEqual([...renderer.matchAll(/^import .* from '([^']+)';$/gm)].map((m) => m[1]), ['../lib/lighting.mjs']);
  assert.doesNotMatch(renderer, /loushing|\.f-|\.c-|\.l-/i);
  const lib = readFileSync(new URL('../src/lib/lighting.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(lib, /^import /m, 'the geometry is pure');
  const generated = readFileSync(new URL('../../design/tokens/dist/tokens.css', import.meta.url), 'utf8');
  for (const name of ['size-lighting-panel', 'color-lighting-ink', 'lighting-dark-tint']) assert.match(generated, new RegExp(`--${name}:`), `host token ${name} is generated`);
  const level = (name) => Number(generated.match(new RegExp(`--layer-${name}: (\\d+);`))[1]);
  assert.ok(level('lighting') > level('raised') && level('lighting') < level('sticky'), 'shadows sit over content and under sticky bars');
  assert.doesNotMatch(generated, /--lighting-frame-/);
});
