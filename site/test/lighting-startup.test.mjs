import { test } from 'node:test';
import assert from 'node:assert/strict';
import { afterLightingLayout } from '../src/client/lighting.js';

test('decorative GPU startup waits for fonts and a content-paint opportunity', async () => {
  const frames = [];
  let releaseFonts;
  let started = 0;
  const done = afterLightingLayout(() => started++, {
    fontReady: new Promise((resolve) => { releaseFonts = resolve; }),
    frame: (callback) => frames.push(callback),
  });
  assert.equal(started, 0);
  assert.equal(frames.length, 0);
  releaseFonts();
  await new Promise(setImmediate);
  assert.equal(frames.length, 1);
  frames.shift()();
  assert.equal(started, 0);
  assert.equal(frames.length, 1);
  frames.shift()();
  await done;
  assert.equal(started, 1);
  assert.equal(frames.length, 0);
});

test('failed font readiness still permits lighting with fallback fonts', async () => {
  let started = 0;
  await afterLightingLayout(() => started++, {
    fontReady: Promise.reject(new Error('font readiness failed')),
    frame: (callback) => callback(),
  });
  assert.equal(started, 1);
});
