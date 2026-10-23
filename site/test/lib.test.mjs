// Tier 0 logic: parsing, search, the Chopper picker and install plans.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { parseYaml, frontMatter } from '../src/lib/yaml.mjs';
import { renderMarkdown, sections, plainText } from '../src/lib/markdown.mjs';
import { esc, html, raw } from '../src/lib/html.mjs';
import { stem, tokenize, indexDoc, search, facetCounts, filtersToQuery, queryToFilters } from '../src/lib/search.mjs';
import { daypart, rng, fit, candidates, pickMoments, zoneSizes } from '../src/lib/picker.mjs';
import { plan, SKILL_TARGETS, downloadUrl } from '../src/lib/install.mjs';
import { emptySlots } from '../src/lib/slots.mjs';
import { decodePng, encodePng, alphaBounds, lightMask, trimToAlpha } from '../scripts/lib/png.mjs';

test('yaml: maps, lists, nesting and front matter', () => {
  const data = parseYaml('id: slate\ntags:\n  - docs\n  - diagrams\nsource:\n  repo: https://github.com/a/b\n  commit: abc123\nbeta: true\ncount: 3\n');
  assert.deepEqual(data, { id: 'slate', tags: ['docs', 'diagrams'], source: { repo: 'https://github.com/a/b', commit: 'abc123' }, beta: true, count: 3 });
  const fm = frontMatter('---\nname: ground\ndescription: Use when starting\n---\n# Body\n');
  assert.equal(fm.data.name, 'ground');
  assert.match(fm.body, /# Body/);
});

test('markdown: escapes HTML and renders headings, lists and code', () => {
  const out = renderMarkdown('## Use it\n\n- one <b>\n- two\n\n```\ncode & more\n```\n');
  assert.match(out, /<h2[^>]*>Use it<\/h2>/);
  assert.match(out, /<li>one &lt;b&gt;<\/li>/);
  assert.match(out, /code &amp; more/);
  assert.doesNotMatch(out, /<b>/);
  assert.equal(sections('## A\none\n## B\ntwo\n').sections.length, 2);
  assert.equal(plainText('**Bold** and `code`').trim(), 'Bold and code');
});

test('html: escapes values unless marked raw', () => {
  assert.equal(esc('<a href="x">'), '&lt;a href=&quot;x&quot;&gt;');
  assert.equal(String(html`<p>${'<i>'}</p>`), '<p>&lt;i&gt;</p>');
  assert.equal(String(html`<p>${raw('<i>')}</p>`), '<p><i></p>');
});

const docs = [
  { id: 'agentic-craft', type: 'kit', title: 'agentic-craft', summary: 'Decide what is worth building and write a spec', useWhen: ['You are starting a product'], tags: ['specs'], area: 'product', agents: { 'claude-code': 'expected' }, effects: ['runs-scripts'], status: 'beta' },
  { id: 'slate', type: 'kit', title: 'Slate', summary: 'Documentation sites from notes', tags: ['docs'], area: 'docs', agents: { 'copilot-vscode': 'tested', 'claude-code': 'unsupported' }, effects: ['runs-scripts'], status: 'beta' },
  { id: 'old-thing', type: 'skill', title: 'Old spec helper', summary: 'Writes a spec', area: 'product', agents: {}, status: 'deprecated' },
  { id: 'agentic-craft/ground', type: 'part', title: 'ground', summary: 'Ground a spec in jobs', area: 'product', agents: {}, status: 'beta' },
].map(indexDoc);

test('search: stems, drops stop words and ranks top-level items first', () => {
  assert.equal(stem('specs'), 'spec');
  assert.equal(stem('building'), 'build');
  assert.deepEqual(tokenize('How to write the Specs'), ['write', 'spec']);
  const { results } = search(docs, 'write a spec');
  assert.equal(results[0].id, 'agentic-craft');
  assert.ok(!results.some((d) => d.id === 'old-thing'), 'deprecated items are hidden by default');
  assert.equal(search(docs, 'spe').results.length > 0, true, 'the last term matches as a prefix while typing');
  assert.equal(search(docs, 'spec zzzz').results.length, 0, 'every term must match');
});

test('search: facets filter, count and round-trip through the URL', () => {
  assert.deepEqual(search(docs, '', { area: ['docs'] }).results.map((d) => d.id), ['slate']);
  const agent = search(docs, 'spec', { agent: ['copilot-vscode'] });
  assert.equal(agent.results.length, 0);
  assert.ok(agent.hiddenByAgent > 0, 'reports what the agent filter hid');
  assert.deepEqual(facetCounts(docs, 'type'), { kit: 3, skill: 1 });
  assert.equal(facetCounts(docs, 'agent')['claude-code'], 1, 'unsupported agents are not counted');
  const qs = filtersToQuery('write spec', { type: ['kit'], area: [], agent: ['codex'] });
  assert.equal(qs, 'q=write+spec&type=kit&agent=codex');
  assert.deepEqual(queryToFilters(qs).filters.type, ['kit']);
  assert.equal(queryToFilters(qs).q, 'write spec');
});

const approved = { sm: { status: 'approved' }, md: { status: 'approved' } };
const library = {
  rules: { maxPerPage: 2, maxImagesPerPage: 3, minGapViewports: 1.5, historySize: 8, minCandidatesPerZone: 2, preferDaypart: true },
  zones: {
    'section-break': { poses: ['sitting', 'lying'], size: 'sm', align: 'either' },
    'footer-ledge': { poses: ['sitting', 'lying'], size: 'md', align: 'end' },
  },
  scenes: [
    { id: 'nap', pose: 'lying', zones: ['section-break', 'footer-ledge'], renders: approved, status: 'active' },
    { id: 'sit', pose: 'sitting', zones: ['section-break', 'footer-ledge'], renders: approved, status: 'active' },
    { id: 'squirrel', pose: 'sitting', standalone: false, zones: ['footer-ledge'], renders: approved, status: 'active' },
    { id: 'planned', pose: 'sitting', zones: ['section-break'], renders: { sm: { status: 'planned' } }, status: 'active' },
  ],
  setPieces: [{ id: 'standoff', zones: ['footer-ledge'], parts: [{ scene: 'squirrel', side: 'left' }, { scene: 'sit', side: 'right' }], status: 'active' }],
  threads: [{ id: 'day', daypart: 'day', beats: [{ scene: 'nap' }, { setPiece: 'standoff' }] }],
};
const zones = [{ id: 'section-break', top: 0, viewportHeight: 800 }, { id: 'footer-ledge', top: 3000, viewportHeight: 800 }];

test('picker: dayparts and a seeded, repeatable generator', () => {
  assert.equal(daypart(7), 'morning');
  assert.equal(daypart(2), 'night');
  const a = rng(42); const b = rng(42);
  assert.equal(a(), b());
});

test('picker: only approved renders, in zones and poses they fit', () => {
  assert.equal(fit(library, 'scene', 'planned', 'section-break'), null);
  assert.equal(fit(library, 'scene', 'nap', 'nowhere'), null);
  assert.equal(fit(library, 'setPiece', 'standoff', 'footer-ledge').length, 2);
  assert.ok(!candidates(library, 'footer-ledge').some((c) => c.id === 'squirrel'), 'parts of set pieces are not standalone');
});

test('picker: follows the story, respects limits and spacing, and stays off when thin', () => {
  const { moments, visit } = pickMoments(zones, library, {}, 12, 7);
  assert.deepEqual(moments.map((m) => m.id), ['nap', 'standoff']);
  assert.ok(moments.reduce((n, m) => n + m.images.length, 0) <= library.rules.maxImagesPerPage);
  assert.equal(visit.thread, null, 'the two-beat story is told');
  assert.deepEqual(visit.told, ['day']);
  const close = pickMoments([{ id: 'section-break', top: 0, viewportHeight: 800 }, { id: 'footer-ledge', top: 100, viewportHeight: 800 }], library, {}, 12, 7);
  assert.equal(close.moments.length, 1, 'moments keep their distance');
  const thin = { ...library, rules: { ...library.rules, minCandidatesPerZone: 99 } };
  assert.equal(pickMoments(zones, thin, {}, 12, 7).moments.length, 0);
  assert.equal(pickMoments(zones, thin, { review: { scene: 'sit' } }, 12, 7).moments[0].id, 'sit', 'review links bypass the threshold');
});

test('picker: drafts show only when the rules list them', () => {
  const drafts = { ...library, scenes: [...library.scenes, { id: 'draft-nap', pose: 'lying', zones: ['section-break'], renders: { sm: { status: 'draft' } }, status: 'active' }] };
  assert.equal(fit(drafts, 'scene', 'draft-nap', 'section-break'), null, 'approved only by default');
  const review = { ...drafts, rules: { ...drafts.rules, statusesShown: ['approved', 'draft'] } };
  assert.equal(fit(review, 'scene', 'draft-nap', 'section-break').length, 1);
  assert.equal(fit(review, 'scene', 'planned', 'section-break'), null, 'planned renders never show');
});

test('picker: a zone takes its extra sizes only from their breakpoint, before its own size', () => {
  const wide = {
    ...library,
    zones: { ...library.zones, 'section-break': { ...library.zones['section-break'], extraSizes: { strip: 'md' } } },
    scenes: [...library.scenes, { id: 'vista', pose: 'lying', zones: ['section-break'], renders: { strip: { status: 'approved' } }, status: 'active' }],
  };
  assert.deepEqual(zoneSizes(wide, 'section-break'), ['strip', 'sm']);
  assert.deepEqual(zoneSizes(wide, 'section-break', (bp) => bp !== 'md'), ['sm'], 'too narrow for a strip');
  assert.deepEqual(fit(wide, 'scene', 'vista', 'section-break'), [{ scene: 'vista', size: 'strip', side: 'fill', file: 'vista.strip' }]);
  assert.equal(fit(wide, 'scene', 'vista', 'section-break', ['sm']), null, 'no strip on a narrow screen');
  assert.equal(fit(wide, 'scene', 'nap', 'section-break')[0].size, 'sm', 'a scene without a strip keeps the zone size');
  const narrow = pickMoments([{ id: 'section-break', top: 0, viewportHeight: 800, sizes: ['sm'] }], wide, { review: { scene: 'vista' } }, 12, 1);
  assert.equal(narrow.moments.length, 0);
});

test('picker: the real scene library loads and every shown render has a master', () => {
  const real = JSON.parse(readFileSync(new URL('../../design/chopper/scenes.json', import.meta.url), 'utf8'));
  for (const s of real.scenes) for (const z of s.zones) assert.ok(real.zones[z], `${s.id}: unknown zone ${z}`);
  for (const s of real.scenes) for (const size of Object.keys(s.renders ?? {})) {
    assert.ok(s.zones.some((z) => zoneSizes(real, z).includes(size)), `${s.id}.${size}: none of its zones takes that size`);
    assert.ok(real.drawing.sizes[size], `${s.id}.${size}: unknown size class`);
  }
  for (const s of real.scenes) for (const c of s.cast ?? []) assert.ok(real.cast[c], `${s.id}: unknown cast ${c}`);
  for (const p of real.setPieces) for (const part of p.parts) assert.ok(real.scenes.some((s) => s.id === part.scene), `${p.id}: unknown scene ${part.scene}`);
  for (const t of real.threads) for (const b of t.beats) assert.ok(real.scenes.some((s) => s.id === b.scene) || real.setPieces.some((p) => p.id === b.setPiece), `${t.id}: unknown beat`);
  const shown = new Set(real.rules.statusesShown ?? ['approved']);
  for (const s of real.scenes) for (const [size, r] of Object.entries(s.renders ?? {})) {
    if (shown.has(r.status)) assert.ok(existsSync(new URL(`../../design/chopper/source/${s.id}.${size}.png`, import.meta.url)), `${s.id}.${size} is ${r.status} but has no master`);
  }
});

test('png: decodes, trims to the drawing and round-trips losslessly', () => {
  const width = 6; const height = 4; const data = new Uint8Array(width * height * 4);
  for (let y = 1; y < 3; y++) for (let x = 2; x < 5; x++) data.set([200, 100 + x, 50 + y, 255], (y * width + x) * 4);
  const img = decodePng(encodePng({ width, height, data }));
  assert.deepEqual([img.width, img.height], [width, height]);
  assert.deepEqual(Array.from(img.data), Array.from(data));
  assert.deepEqual(alphaBounds(img), { x: 2, y: 1, width: 3, height: 2 });
  const trimmed = trimToAlpha(img, 1);
  assert.deepEqual([trimmed.width, trimmed.height], [5, 4]);
});

test('png: a gobo becomes a greyscale mask of the light it lets through', () => {
  const row = [[0, 0, 0, 255], [0, 0, 0, 0], [255, 255, 255, 255], [0, 0, 0, 128]];
  const data = new Uint8Array([...row, ...row].flat());
  const mask = lightMask({ width: 4, height: 2, data });
  assert.deepEqual(Array.from(mask.data), [0, 255, 255, 127, 0, 255, 255, 127], 'black blocks, clear and white pass, alpha scales');
  const half = lightMask({ width: 4, height: 2, data }, 2);
  assert.deepEqual([half.width, half.height, ...half.data], [2, 1, 128, 191]);
  const back = decodePng(encodePng(mask));
  assert.deepEqual(Array.from(back.data.subarray(0, 16)), [0, 0, 0, 255, 255, 255, 255, 255, 255, 255, 255, 255, 127, 127, 127, 255]);
  assert.throws(() => lightMask({ width: 4, height: 2, data }, 1.5));
  assert.throws(() => encodePng({ width: 1, height: 1, data: new Uint8Array(2), channels: 2 }));
});

test('install: skill plans per agent and scope, with a pinned commit', () => {
  const item = { id: 'tidy', type: 'skill', title: 'tidy', source: { repo: 'https://github.com/prabinpebam/loushing', commit: 'abcdef1234567', path: 'skills/tidy' }, files: [{}, {}] };
  const agent = { id: 'claude-code', install: 'claude-code', title: 'Claude Code' };
  const p = plan(item, { agent, scope: 'personal' });
  assert.equal(p.supported, true);
  assert.equal(p.adds[0].path, `${SKILL_TARGETS['claude-code'].personal}/tidy/`);
  assert.match(p.git[1], /checkout abcdef1234567/);
  assert.match(p.ask, /only after I agree/);
  assert.equal(downloadUrl(item), 'https://github.com/prabinpebam/loushing/archive/abcdef1234567.zip');
  assert.equal(plan(item, { agent: { id: 'x', install: 'x', title: 'X' }, scope: 'project' }).supported, false);
});
import { comboAction, openIndex, moveIndex, typeahead } from '../src/lib/listbox.mjs';

test('listbox: keys map to combobox actions', () => {
  assert.equal(comboAction('ArrowDown', false), 'open');
  assert.equal(comboAction('Enter', false), 'open');
  assert.equal(comboAction(' ', false), 'open');
  assert.equal(comboAction('v', false), 'type');
  assert.equal(comboAction('Tab', false), null);
  assert.equal(comboAction('Escape', true), 'close');
  assert.equal(comboAction('Enter', true), 'select');
  assert.equal(comboAction('ArrowUp', true, { alt: true }), 'select');
  assert.equal(comboAction('Tab', true), 'select-tab');
  assert.equal(comboAction('PageDown', true), 'move');
  assert.equal(comboAction(' ', true, { typing: true }), 'type');
  assert.equal(comboAction('Shift', true), null);
});

test('listbox: opening, moving and type-ahead stay inside the list', () => {
  assert.equal(openIndex('ArrowDown', 2, 5), 2);
  assert.equal(openIndex('Home', 2, 5), 0);
  assert.equal(openIndex('End', 2, 5), 4);
  assert.equal(openIndex('Enter', 9, 5), 4);
  assert.equal(openIndex('Enter', 0, 0), -1);
  assert.equal(moveIndex('ArrowDown', 4, 5), 4);
  assert.equal(moveIndex('ArrowUp', 0, 5), 0);
  assert.equal(moveIndex('PageDown', 1, 30), 11);
  assert.equal(moveIndex('PageUp', 3, 30), 0);
  const labels = ['VS Code Copilot', 'Copilot CLI', 'Claude Code', 'Codex', 'Cursor'];
  assert.equal(typeahead('cl', labels, 0), 2);
  assert.equal(typeahead('c', labels, 1), 2);
  assert.equal(typeahead('cc', labels, 2), 3);
  assert.equal(typeahead('c', labels, 4), 1);
  assert.equal(typeahead('z', labels, 0), -1);
});

test('slots: a short last row gets the empty cells that complete it', () => {
  assert.equal(emptySlots(3, 4), 1);
  assert.equal(emptySlots(5, 4), 3);
  assert.equal(emptySlots(4, 4), 0);
  assert.equal(emptySlots(8, 4), 0);
  assert.equal(emptySlots(1, 3), 2);
  assert.equal(emptySlots(3, 1), 0, 'one column needs none');
  assert.equal(emptySlots(0, 4), 0, 'an empty grid stays empty');
  assert.equal(emptySlots(3, Number.NaN), 0);
});
