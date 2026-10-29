import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as fundamentals from '../src/components/fundamentals.mjs';
import { REGISTRY } from '../src/components/registry.mjs';
import { componentDocs } from '../scripts/lib/library.mjs';
import { componentStories } from '../src/stories/components.mjs';
import { buildModel } from '../scripts/lib/model.mjs';
import { loadCatalog } from '../scripts/lib/catalog.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const model = buildModel(loadCatalog(root));
const docs = componentDocs(root);
const stories = componentStories(model);

test('every existing fundamental and registered compound has source docs and stories', () => {
  for (const name of [...Object.keys(fundamentals), ...Object.values(REGISTRY).map((fn) => fn.name), 'ResultsStatus', 'LightingPanel']) {
    const doc = docs.find((d) => d.name === name);
    assert.ok(doc, name);
    assert.ok(doc.documentation.length > 10, name);
    assert.ok(doc.stylesheetTokens.length > 0, name);
    assert.ok(stories.some((s) => s.component === name), name);
  }
});

test('story IDs are stable and unique, with real states rather than style overrides', () => {
  assert.equal(new Set(stories.map((s) => s.id)).size, stories.length);
  for (const story of stories) {
    assert.match(story.id, /^[a-z0-9-]+$/);
    assert.ok(story.states.length > 0);
    assert.ok(!('style' in story.props) && !('class' in story.props), story.id);
  }
  for (const state of ['rest', 'hover', 'focus-visible', 'pressed', 'disabled', 'loading', 'error', 'empty', 'open', 'success', 'unsupported']) assert.ok(stories.some((s) => s.states.includes(state)), state);
});

test('stateful controls demonstrate the actual disabled and selected props', () => {
  assert.equal(stories.find((s) => s.id === 'button-primary-disabled').props.disabled, true);
  assert.equal(stories.find((s) => s.id === 'toggle-on').props.checked, true);
  assert.equal(stories.find((s) => s.id === 'select-empty').props.options.length, 0);
  assert.equal(stories.find((s) => s.id === 'lightingpanel-default').shell, true, 'no duplicate lighting IDs');
});

test('an empty catalog still has a library without invented item examples', () => {
  const empty = buildModel({ ...model.catalog, items: [] });
  const examples = componentStories(empty);
  assert.ok(examples.length > 0);
  assert.ok(!examples.some((s) => ['ItemHeader', 'GetItPanel', 'SourceViewer'].includes(s.component)));
});
