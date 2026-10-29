import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';
import { run } from '../lib/cli.mjs';
import { Catalog } from '../lib/catalog.mjs';
import { loadCatalog } from '../../site/scripts/lib/catalog.mjs';
import { buildModel } from '../../site/scripts/lib/model.mjs';
import { catalogJson, itemJson, searchIndex } from '../../site/scripts/lib/outputs.mjs';
import { card, skillMd } from '../../site/test/fixture.mjs';
import { syntheticTasks, trial } from '../scripts/finder-trials.mjs';
import { publicCatalog, publicOutputs } from './public-catalog.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const work = join(root, '.agent-orchestration', 'agent-access-tests');
mkdirSync(work, { recursive: true });
const publicIndex = join(publicCatalog(root), 'catalog.json');
const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const put = (root, path, value) => { const target = join(root, path); mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, value); };
const init = (root) => { git(root, 'init', '-q'); git(root, 'config', 'user.name', 'Synthetic fixture'); git(root, 'config', 'user.email', 'fixture@example.invalid'); git(root, 'config', 'core.autocrlf', 'false'); };
const commit = (root) => { git(root, 'add', '.'); git(root, 'commit', '-qm', 'Synthetic fixture'); return git(root, 'rev-parse', 'HEAD'); };
function fixture(t) {
  const dir = mkdtempSync(join(work, 'case-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const source = join(dir, 'source'), project = join(dir, 'project'), metadata = join(dir, 'metadata');
  for (const p of [source, project, metadata]) mkdirSync(p);
  init(source);
  put(source, 'catalog/taxonomy.yaml', readFileSync(join(root, 'catalog', 'taxonomy.yaml')));
  put(source, 'skills/tidy-notes/SKILL.md', skillMd('tidy-notes'));
  put(source, 'skills/tidy-notes/about.md', card());
  commit(source);
  const emit = () => {
    const catalog = loadCatalog(source);
    assert.deepEqual(catalog.problems, []);
    const model = buildModel(catalog);
    put(metadata, 'catalog.json', JSON.stringify(catalogJson(model)));
    put(metadata, 'search-index.json', JSON.stringify(searchIndex(model)));
    for (const item of model.items) put(metadata, `items/${item.id}.json`, JSON.stringify(itemJson(item, model)));
    return model;
  };
  const invoke = (args, checkout = source, catalog = join(metadata, 'catalog.json')) => run([...args, '--catalog', catalog, '--source-root', checkout], { cwd: project, home: project });
  return { dir, source, project, metadata, emit, invoke };
}

test('synthetic finder regression meets 7/10; it is not a two-agent trial', async (t) => {
  const dir = mkdtempSync(join(work, 'finder-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const result = await trial({ catalog: publicIndex, cwd: dir });
  assert.equal(syntheticTasks.length, 10);
  assert.ok(result.correct >= 7, JSON.stringify(result));
  assert.equal(result.installCommands, 0);
  assert.equal(result.evidence, 'synthetic ranking and preview regression; not real-agent or participant evidence');
  assert.deepEqual(readdirSync(dir), [], 'find and preview do not install or create a lock');
  const skill = readFileSync(join(root, 'skills', 'loushing', 'SKILL.md'), 'utf8');
  assert.match(skill, /actual user's explicit consent/);
  assert.match(skill, /No consent, refusal or ambiguity means no write command/);
  assert.match(skill, /--trust-source/);
  assert.match(skill, /--approve-plan/);
});

test('private local catalog is explicit, does not merge sources and never changes the public build', async (t) => {
  const f = fixture(t);
  f.emit();
  const publicBytes = readFileSync(publicIndex);
  const indexPath = join(f.metadata, 'catalog.json');
  const index = JSON.parse(readFileSync(indexPath));
  index.visibility = 'private';
  writeFileSync(indexPath, JSON.stringify(index));
  assert.equal((await f.invoke(['info', 'tidy-notes'])).status, 'ok');
  assert.equal((await f.invoke(['find', 'meeting notes'])).status, 'ok');
  assert.deepEqual(readdirSync(f.project), [], 'discovery cannot leak into a lock');
  assert.equal((await f.invoke(['add', 'tidy-notes', '--agent', 'copilot', '--dry-run'])).status, 'ok');
  assert.deepEqual(readdirSync(f.project), []);
  assert.equal((await f.invoke(['add', 'tidy-notes', '--agent', 'copilot'])).status, 'ok');
  const lock = JSON.parse(readFileSync(join(f.project, 'loushing.lock.json')));
  assert.equal(lock.catalog, pathToFileURL(indexPath).href);
  for (const command of ['add', 'update', 'install', 'outdated']) {
    const args = command === 'add' ? [command, 'ground', '--agent', 'copilot'] : [command];
    const blocked = await f.invoke(args, f.source, publicIndex);
    assert.equal(blocked.status, 'error');
    assert.match(blocked.message, /one catalog per scope/);
  }
  assert.deepEqual(readFileSync(publicIndex), publicBytes);
  assert.deepEqual(JSON.parse(publicOutputs(root)['catalog.json']).items, JSON.parse(publicBytes).items, 'the public build from source is unchanged');
  assert.ok(!JSON.parse(publicBytes).items.some((item) => item.id === 'tidy-notes'));
});

test('network private identity is not silently implemented; credential query URLs are rejected', async () => {
  assert.throws(() => new Catalog('https://example.invalid/catalog.json?token=sensitive'), /query parameters/);
  const catalog = new Catalog('https://example.invalid/catalog.json');
  catalog.read = async () => ({ visibility: 'private', items: [] });
  await assert.rejects(catalog.index(), /explicit local file/);
});

test('stable and historical versions come from releases, never newer development metadata', async (t) => {
  const f = fixture(t);
  f.emit();
  const indexPath = join(f.metadata, 'catalog.json');
  const index = JSON.parse(readFileSync(indexPath));
  const original = JSON.parse(readFileSync(join(f.metadata, 'items/tidy-notes.json')));
  const stable = { version: original.version, source: index.items[0].source, data: 'releases/1.0.0/items/tidy-notes.json' };
  put(f.metadata, stable.data, JSON.stringify(original));
  index.items[0] = { ...index.items[0], version: '2.0.0', versions: { '1.0.0': stable }, channels: { stable } };
  put(f.metadata, 'items/tidy-notes.json', JSON.stringify({ ...original, version: '2.0.0' }));
  put(f.metadata, 'catalog.json', JSON.stringify(index));
  assert.equal((await f.invoke(['info', 'tidy-notes'])).item.version, '1.0.0');
  assert.equal((await f.invoke(['info', 'tidy-notes', '--version', '1.0.0'])).item.version, '1.0.0');
  assert.match((await f.invoke(['info', 'tidy-notes', '--version', '2.0.0'])).message, /No published/);
  assert.match((await f.invoke(['info', 'tidy-notes', '--channel', 'next'])).message, /No published/);
  index.items[0].channels = {};
  put(f.metadata, 'catalog.json', JSON.stringify(index));
  assert.match((await f.invoke(['info', 'tidy-notes'])).message, /No published stable/);
});

test('moving an external skill retains ID, old links, exact old restore and new pinned installs', async (t) => {
  const f = fixture(t);
  const before = f.emit().items[0];
  assert.equal((await f.invoke(['add', 'tidy-notes', '--agent', 'copilot'])).status, 'ok');
  const external = join(f.source, 'moved-source');
  mkdirSync(external);
  init(external);
  put(external, 'skills/tidy-notes/SKILL.md', `${skillMd('tidy-notes')}\nUpdated in the external fixture.\n`);
  put(external, 'skills/tidy-notes/about.md', card().replace('version: 1.0.0', 'version: 1.1.0'));
  const pin = commit(external);
  rmSync(join(f.source, 'skills'), { recursive: true });
  put(f.source, '.gitmodules', '[submodule "moved"]\npath = moved-source\nurl = https://github.com/example/synthetic-moved\n');
  put(f.source, 'external/tidy-notes.yaml', `id: tidy-notes\ntype: skill\nsource:\n  repo: https://github.com/example/synthetic-moved\n  ref: ${pin}\n  path: skills/tidy-notes\n  card: skills/tidy-notes/about.md\n`);
  put(f.source, 'catalog/lifecycle.json', JSON.stringify({ version: 1, aliases: { 'old-notes': 'tidy-notes' }, removed: {} }));
  const after = f.emit().items[0];
  assert.equal(after.id, before.id);
  assert.equal(after.url, before.url);
  assert.equal(after.source.commit, pin);
  assert.ok(after.files.some((file) => file.path === 'SKILL.md'));
  assert.equal((await f.invoke(['info', 'old-notes'])).item.id, 'tidy-notes');
  const installed = join(f.project, '.agents', 'skills', 'tidy-notes', 'SKILL.md');
  rmSync(installed);
  assert.equal((await f.invoke(['install'])).status, 'ok', 'old lock still restores from the old repo');
  assert.equal(readFileSync(installed, 'utf8'), skillMd('tidy-notes'));
  assert.equal((await f.invoke(['outdated'])).items[0].available, '1.1.0');
  const updated = await f.invoke(['update'], external);
  assert.equal(updated.status, 'ok', JSON.stringify(updated));
  assert.match(readFileSync(installed, 'utf8'), /Updated in the external fixture/);
  const lock = JSON.parse(readFileSync(join(f.project, 'loushing.lock.json')));
  assert.equal(lock.items['tidy-notes'].source.repo, 'example/synthetic-moved');
  assert.equal(lock.items['tidy-notes'].commit, pin);
  rmSync(installed);
  assert.equal((await f.invoke(['install'], external)).status, 'ok');
  assert.match(readFileSync(installed, 'utf8'), /Updated in the external fixture/);
});
