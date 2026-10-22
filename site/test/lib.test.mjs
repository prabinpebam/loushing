// Tier 0 logic: parsing, search, the Chopper picker and install plans.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseYaml, frontMatter } from '../src/lib/yaml.mjs';
import { renderMarkdown, sections, plainText } from '../src/lib/markdown.mjs';
import { esc, html, raw } from '../src/lib/html.mjs';
import { stem, tokenize, indexDoc, search, facetCounts, filtersToQuery, queryToFilters } from '../src/lib/search.mjs';
import { daypart, rng, fit, candidates, pickMoments } from '../src/lib/picker.mjs';
import { plan, SKILL_TARGETS, downloadUrl } from '../src/lib/install.mjs';

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

test('picker: the real scene library loads and has no approved renders without files', () => {
  const real = JSON.parse(readFileSync(new URL('../../design/chopper/scenes.json', import.meta.url), 'utf8'));
  for (const s of real.scenes) for (const z of s.zones) assert.ok(real.zones[z], `${s.id}: unknown zone ${z}`);
  for (const p of real.setPieces) for (const part of p.parts) assert.ok(real.scenes.some((s) => s.id === part.scene), `${p.id}: unknown scene ${part.scene}`);
  for (const t of real.threads) for (const b of t.beats) assert.ok(real.scenes.some((s) => s.id === b.scene) || real.setPieces.some((p) => p.id === b.setPiece), `${t.id}: unknown beat`);
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
