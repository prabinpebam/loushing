import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCatalog } from '../scripts/lib/catalog.mjs';
import { buildModel } from '../scripts/lib/model.mjs';
import { catalogJson, catalogVersion, feedXml, itemJson } from '../scripts/lib/outputs.mjs';
import { assertOutput, outputSchema, validateSchema } from '../scripts/lib/schema.mjs';
import { lifecycleProblems, resolveIdentity } from '../src/lib/lifecycle.mjs';
import { loadReleases, digest, publishedVersions, verifyPinnedFiles } from '../scripts/lib/releases.mjs';
import { prepareRelease } from '../scripts/release.mjs';
import { card, skillMd } from './fixture.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const work = join(root, '.agent-orchestration', 'site-agent-access-tests');
mkdirSync(work, { recursive: true });
const put = (root, path, value) => { const target = join(root, path); mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, value); };
const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
function fixture(t) {
  const dir = mkdtempSync(join(work, 'case-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const source = join(dir, 'source');
  mkdirSync(source);
  git(source, 'init', '-q');
  git(source, 'config', 'user.name', 'Synthetic fixture');
  git(source, 'config', 'user.email', 'fixture@example.invalid');
  git(source, 'config', 'core.autocrlf', 'false');
  put(source, 'catalog/taxonomy.yaml', readFileSync(join(root, 'catalog', 'taxonomy.yaml')));
  put(source, 'skills/tidy-notes/SKILL.md', skillMd('tidy-notes'));
  put(source, 'skills/tidy-notes/about.md', card());
  const commit = () => { git(source, 'add', '.'); git(source, 'commit', '-qm', 'Synthetic fixture'); return git(source, 'rev-parse', 'HEAD'); };
  commit();
  return { dir, source, commit };
}

test('real index and every item validate against served versioned JSON schemas', () => {
  const catalog = loadCatalog(root);
  assert.deepEqual(catalog.problems, []);
  const model = buildModel(catalog);
  assert.doesNotThrow(() => assertOutput('catalog', catalogJson(model)));
  for (const item of model.items) assert.doesNotThrow(() => assertOutput('item', itemJson(item, model)), item.id);
  for (const name of ['catalog', 'item', 'lifecycle']) assert.equal(outputSchema(name).$schema, 'https://json-schema.org/draft/2020-12/schema');
});

test('schemas reject missing IDs, wrong hashes, plan types, duplicate effects and unknown fields', () => {
  const model = buildModel(loadCatalog(root));
  const index = JSON.parse(JSON.stringify(catalogJson(model)));
  const item = JSON.parse(JSON.stringify(itemJson(model.items.find(({ id }) => id === 'ground'), model)));
  assert.deepEqual(validateSchema(index, outputSchema('catalog')), []);
  assert.deepEqual(validateSchema(item, outputSchema('item')), []);
  for (const mutate of [
    (value) => delete value.id,
    (value) => { value.id = '../escape'; },
    (value) => { value.files[0].sha256 = 'bad'; },
    (value) => { value.files[0].size = -1; },
    (value) => { value.files[0].size = 1.5; },
    (value) => { value.effects = ['network', 'network']; },
    (value) => { value.install.plans['copilot:project'] = { supported: 'yes' }; },
    (value) => { value.mystery = true; },
    (value) => { value.constructor = 'not a schema property'; },
  ]) {
    const invalid = structuredClone(item);
    mutate(invalid);
    assert.ok(validateSchema(invalid, outputSchema('item')).length);
  }
  index.items[0].source.commit = 'main';
  assert.ok(validateSchema(index, outputSchema('catalog')).length);
});

test('lifecycle rejects cycles, collisions, invalid IDs, missing targets and invalid removals', () => {
  const items = [{ id: 'current' }];
  const base = { version: 1, aliases: {}, removed: {} };
  for (const change of [
    { aliases: { a: 'b', b: 'a' } },
    { aliases: { '../bad': 'current' } },
    { aliases: { current: 'current' } },
    { aliases: { old: 'missing' } },
    { removed: { current: { date: '2026-10-29', reason: 'Retired' } } },
    { removed: { old: { date: 'invalid', reason: 'Retired' } } },
    { removed: { old: { date: '2026-10-29', reason: '' } } },
    { removed: { old: { date: '2026-10-29', reason: 'Retired', instead: 'missing' } } },
  ]) assert.ok(lifecycleProblems({ ...base, ...change }, items).length, JSON.stringify(change));
  const valid = { ...base, aliases: { old: 'older', older: 'current' }, removed: { retired: { date: '2026-10-29', reason: 'Replaced', instead: 'current' } } };
  assert.deepEqual(lifecycleProblems(valid, items), []);
  assert.equal(resolveIdentity(valid, 'old').id, 'current');
});

test('old HTML/JSON/Markdown addresses and Gone reasons survive a base-path build', (t) => {
  const f = fixture(t);
  put(f.source, 'catalog/lifecycle.json', JSON.stringify({ version: 1, aliases: { old: 'tidy-notes', ancient: 'old', obsolete: 'retired' }, removed: { retired: { date: '2026-10-29', reason: 'This synthetic workflow was retired.', instead: 'tidy-notes' } } }));
  const out = join(f.dir, 'dist');
  const built = spawnSync(process.execPath, ['site/scripts/build.mjs'], { cwd: root, encoding: 'utf8', env: { ...process.env, CATALOG_ROOT: f.source, OUT_DIR: out, BASE: '/preview/' } });
  assert.equal(built.status, 0, built.stderr);
  for (const id of ['old', 'ancient', 'obsolete', 'retired']) for (const suffix of ['.json', '.md', '/index.html']) assert.ok(existsSync(join(out, `items/${id}${suffix}`)));
  assert.match(readFileSync(join(out, 'items/ancient/index.html'), 'utf8'), /content="0;url=\/preview\/items\/tidy-notes"/);
  assert.ok(!readFileSync(join(out, 'items/ancient/index.html'), 'utf8').includes('/preview/preview/'));
  const gone = readFileSync(join(out, 'items/retired/index.html'), 'utf8');
  assert.match(gone, /This synthetic workflow was retired/);
  assert.match(gone, /href="\/preview\/items\/tidy-notes"/);
  assert.equal(JSON.parse(readFileSync(join(out, 'items/retired.json'))).status, 'removed');
  for (const id of ['old', 'ancient', 'obsolete', 'retired']) assert.doesNotThrow(() => assertOutput('lifecycle', JSON.parse(readFileSync(join(out, `items/${id}.json`)))));
  assert.throws(() => assertOutput('lifecycle', { schema: '/schema/lifecycle-1.json', id: 'old', status: 'removed' }), /allowed shape/);
  assert.ok(existsSync(join(out, 'schema/catalog-1.json')));
  assert.ok(existsSync(join(out, 'schema/item-1.json')));
});

test('a marked private card is rejected before public output', (t) => {
  const f = fixture(t);
  put(f.source, 'skills/tidy-notes/about.md', card().replace('status: beta', 'status: beta\nvisibility: private'));
  const catalog = loadCatalog(f.source);
  assert.match(catalog.problems.map((problem) => problem.message).join('\n'), /non-public item/);
  const out = join(f.dir, 'dist');
  const built = spawnSync(process.execPath, ['site/scripts/build.mjs'], { cwd: root, encoding: 'utf8', env: { ...process.env, CATALOG_ROOT: f.source, OUT_DIR: out } });
  assert.equal(built.status, 1);
  assert.ok(!existsSync(out));
});

test('no release means development, Git item history in the feed and no guessed stable/next', () => {
  const model = buildModel(loadCatalog(root));
  assert.equal(catalogVersion(model), 'development');
  assert.ok(model.releases.length > 0, 'What’s new lists item history before any release');
  assert.ok(model.releases.every((entry) => !entry.release), 'no release is invented');
  assert.ok(model.releases.some((entry) => entry.item.id === 'ai-integration' && entry.kind === 'pinned'));
  assert.ok(model.releases.every((entry, i, all) => i === 0 || Date.parse(all[i - 1].date) >= Date.parse(entry.date)), 'newest first');
  const feed = feedXml(model);
  assert.equal((feed.match(/<item>/g) ?? []).length, Math.min(model.releases.length, 50));
  assert.ok(!feed.includes('@undefined'));
  const kit = model.items.find((item) => item.id === 'ai-integration');
  assert.ok(itemJson(kit, model).changes.length > 0);
  assert.ok(catalogJson(model).items.every((item) => !item.channels && !item.versions));
});

test('release preparation verifies pinned bytes, is immutable and never moves channels', (t) => {
  const f = fixture(t);
  const out = join(f.dir, 'prepared');
  const options = { root: f.source, out, version: '1.0.0', date: '2026-10-29T12:00:00Z', changes: [{ id: 'tidy-notes', kind: 'added', line: 'Synthetic fixture release, not a product release.' }] };
  const result = prepareRelease(options);
  assert.equal(result.published, false);
  assert.equal(result.channelsChanged, false);
  assert.ok(!existsSync(join(f.source, 'catalog/releases.json')));
  const bytes = readFileSync(join(out, 'manifest.json'));
  assert.equal(digest(bytes), result.sha256);
  const snapshot = JSON.parse(readFileSync(join(out, 'catalog.json')));
  assert.equal(snapshot.items[0].data, 'items/tidy-notes.json');
  assert.ok(!snapshot.items[0].channels && !snapshot.items[0].versions, 'an immutable snapshot cannot redirect itself to an older channel');
  assert.throws(() => prepareRelease(options), /cannot be replaced/);
  assert.deepEqual(readFileSync(join(out, 'manifest.json')), bytes);
  cpSync(out, join(f.source, 'catalog/releases/1.0.0'), { recursive: true });
  put(f.source, 'catalog/releases.json', JSON.stringify({ version: 1, channels: { stable: '1.0.0', next: null }, releases: [{ version: result.version, sha256: result.sha256 }] }));
  const registry = loadReleases(f.source);
  assert.equal(registry.channels.stable, '1.0.0');
  const model = buildModel(loadCatalog(f.source));
  const released = model.releases.filter((entry) => entry.release);
  assert.equal(released.length, 1);
  assert.equal(released[0].item.id, 'tidy-notes');
  assert.ok(model.releases.some((entry) => !entry.release && entry.item.id === 'tidy-notes'), 'Git item history stays beside releases');
  assert.match(feedXml(model), /Synthetic fixture release/);
  assert.match(feedXml(model), /tidy-notes@1\.0\.0/);
  const entry = catalogJson(model).items[0];
  assert.equal(entry.channels.stable.version, '1.0.0');
  assert.equal(entry.channels.next, undefined);
  assert.equal(entry.versions['1.0.0'].data, 'releases/1.0.0/items/tidy-notes.json');
  put(f.source, 'README.md', 'Unrelated synthetic repository change.\n');
  f.commit();
  const secondOut = join(f.dir, 'second');
  prepareRelease({ ...options, out: secondOut, version: '1.1.0' });
  const second = JSON.parse(readFileSync(join(secondOut, 'items/tidy-notes.json')));
  assert.equal(second.source.commit, snapshot.items[0].source.commit, 'unrelated main changes retain the immutable item pin');
  const secondIndex = JSON.parse(readFileSync(join(secondOut, 'catalog.json')));
  assert.ok(!secondIndex.items[0].channels && !secondIndex.items[0].versions);
  put(f.source, 'skills/tidy-notes/SKILL.md', `${skillMd('tidy-notes')}\nChanged payload without a version bump.\n`);
  f.commit();
  assert.throws(() => prepareRelease({ ...options, out: join(f.dir, 'third'), version: '1.2.0' }), /Bump the item version/);
  put(f.source, 'catalog/releases/1.0.0/items/tidy-notes.json', '{}');
  assert.throws(() => loadReleases(f.source), /artifact changed/);
});

test('dirty bytes cannot be attached to a commit or released', (t) => {
  const f = fixture(t);
  const item = loadCatalog(f.source).items[0];
  item.files[0].sha256 = '0'.repeat(64);
  assert.throws(() => verifyPinnedFiles(item, f.source), /Pinned Git content differs/);
  put(f.source, 'skills/tidy-notes/SKILL.md', 'dirty data');
  const out = join(f.dir, 'release');
  assert.throws(() => prepareRelease({ root: f.source, out, version: '1.0.0', date: '2026-10-29T12:00:00Z', changes: [] }), /uncommitted/);
  assert.ok(!existsSync(out));
});

test('a removal-only release retains its reason, Gone address and feed entry', (t) => {
  const f = fixture(t);
  rmSync(join(f.source, 'skills'), { recursive: true });
  put(f.source, 'catalog/lifecycle.json', JSON.stringify({ version: 1, aliases: {}, removed: { 'tidy-notes': { date: '2026-10-29', reason: 'Synthetic removal fixture.' } } }));
  f.commit();
  const out = join(f.dir, 'prepared');
  const result = prepareRelease({ root: f.source, out, version: '1.0.0', date: '2026-10-29T12:00:00Z', changes: [{ id: 'tidy-notes', kind: 'removed', line: 'Synthetic removal fixture.' }] });
  cpSync(out, join(f.source, 'catalog/releases/1.0.0'), { recursive: true });
  put(f.source, 'catalog/releases.json', JSON.stringify({ version: 1, channels: { stable: '1.0.0', next: null }, releases: [{ version: result.version, sha256: result.sha256 }] }));
  const model = buildModel(loadCatalog(f.source));
  assert.equal(model.releases.find((entry) => entry.release).item.url, '/items/tidy-notes');
  assert.match(feedXml(model), /Removed: tidy-notes/);
  assert.match(feedXml(model), /Synthetic removal fixture/);
});

test('published item versions cannot silently change their pinned source', () => {
  const item = { id: 'fixture' };
  const release = (version, commit) => ({ version, index: { items: [{ id: 'fixture', version: '1.0.0', source: { commit } }] } });
  assert.throws(() => publishedVersions(item, { channels: {}, releases: [release('1.0.0', 'a'), release('1.1.0', 'b')] }), /reused/);
  const stack = publishedVersions({ id: 'stack' }, { channels: { stable: '1.0.0' }, releases: [{ version: '1.0.0', index: { items: [{ id: 'stack', type: 'stack', version: null, source: { commit: 'a' } }] } }] });
  assert.equal(stack.channels.stable.data, 'releases/1.0.0/items/stack.json');
  assert.equal(stack.channels.stable.version, null);
  assert.ok(!stack.versions, 'stacks do not invent an item SemVer');
});
