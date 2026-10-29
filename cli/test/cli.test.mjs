import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { run } from '../lib/cli.mjs';
import { hash } from '../lib/safety.mjs';
import { TARGETS } from '../lib/targets.mjs';
import { indexDoc } from '../../site/src/lib/search.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const work = join(repo, '.agent-orchestration', 'cli-tests');
mkdirSync(work, { recursive: true });
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim();
const gitFile = (path) => execFileSync('git', ['show', `${commit}:${path}`], { cwd: repo, maxBuffer: 6 * 1024 * 1024 });
const original = gitFile('skills/ground/SKILL.md');
const license = gitFile('skills/ground/LICENSE');

function fixture(t, { effects = [] } = {}) {
  const dir = mkdtempSync(join(work, 'case-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const project = join(dir, 'project');
  const home = join(dir, 'home');
  const metadata = join(dir, 'metadata');
  for (const folder of [project, home, join(metadata, 'items')]) mkdirSync(folder, { recursive: true });
  const item = {
    id: 'ground', title: 'Ground', summary: 'Ground a product in promises', type: 'skill', version: '1.0.0', effects, agents: { 'copilot-vscode': 'expected' },
    source: { repo: 'prabinpebam/loushing', path: 'skills/ground', commit },
    files: [{ path: 'SKILL.md', size: original.length, sha256: hash(original) }, { path: 'LICENSE', size: license.length, sha256: hash(license) }],
    install: { plans: { 'copilot:project': { adds: [{ path: '.agents/skills/ground' }] } } },
  };
  const index = { items: [], aliases: {}, removed: {} };
  const save = () => {
    index.items = [{ ...item, data: '/items/ground.json' }];
    writeFileSync(join(metadata, 'catalog.json'), JSON.stringify(index));
    writeFileSync(join(metadata, 'items', 'ground.json'), JSON.stringify(item));
    writeFileSync(join(metadata, 'search-index.json'), JSON.stringify({ docs: [indexDoc(item)] }));
  };
  save();
  const args = ['--catalog', join(metadata, 'catalog.json'), '--source-root', repo];
  const context = { cwd: project, home };
  const invoke = (argv, extra = {}) => run([...argv, ...args], { ...context, ...extra });
  return { dir, project, home, metadata, item, index, save, args, context, invoke };
}

function tree(root) {
  const out = {};
  const walk = (dir, prefix = '') => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = prefix + entry.name;
      if (entry.isDirectory()) { out[`${path}/`] = null; walk(join(dir, entry.name), `${path}/`); }
      else out[path] = readFileSync(join(dir, entry.name)).toString('base64');
    }
  };
  walk(root);
  return out;
}

test('JSON version and help need no network', async () => {
  assert.deepEqual(await run(['--version', '--json']), { status: 'ok', version: '0.0.1' });
  assert.match((await run(['--help', '--yes', '--json'])).help, /not published/);
});

for (const scope of ['project', 'personal']) for (const agent of Object.keys(TARGETS)) {
  test(`install, list and exact remove: ${agent}, ${scope}`, async (t) => {
    const f = fixture(t);
    const root = scope === 'project' ? f.project : f.home;
    writeFileSync(join(root, 'keep.txt'), 'Keep me.');
    const before = tree(root);
    const result = await f.invoke(['add', 'ground', '--agent', agent, '--scope', scope, '--yes', '--json']);
    assert.equal(result.status, 'ok', result.message);
    const dest = join(root, TARGETS[agent][scope], 'ground', 'SKILL.md');
    assert.deepEqual(readFileSync(dest), original);
    const listed = await f.invoke(['list', '--scope', scope, '--json', '--yes']);
    assert.equal(listed.items.length, 1);
    assert.equal(listed.items[0].commit, commit);
    assert.equal((await f.invoke(['remove', 'ground', '--scope', scope, '--yes', '--json'])).status, 'ok');
    assert.deepEqual(tree(root), before);
  });
}

test('Copilot uses an existing .github/skills folder; shared targets are deduplicated', async (t) => {
  const f = fixture(t);
  mkdirSync(join(f.project, '.github', 'skills'), { recursive: true });
  const before = tree(f.project);
  const result = await f.invoke(['add', 'ground', '--agent', 'copilot', '--agent', 'codex', '--agent', 'cursor']);
  assert.equal(result.plan.writes.length, 4);
  assert.equal(result.status, 'ok', result.message);
  await f.invoke(['remove', 'ground']);
  assert.deepEqual(tree(f.project), before);
});

test('explicit agents are required even with --yes; no writes on missing decision', async (t) => {
  const f = fixture(t);
  const result = await f.invoke(['add', 'ground', '--yes']);
  assert.equal(result.status, 'needs-decision');
  assert.equal(result.decisions[0].flag, '--agent');
  assert.deepEqual(tree(f.project), {});
});

test('dry run lists effects and writes but creates nothing, including no cache', async (t) => {
  const f = fixture(t, { effects: ['runs-scripts'] });
  const before = tree(f.dir);
  const result = await f.invoke(['add', 'ground', '--agent', 'copilot', '--dry-run']);
  assert.equal(result.status, 'ok');
  assert.equal(result.plan.writes.length, 2);
  assert.equal(result.decisions[0].flag, '--yes');
  assert.deepEqual(tree(f.dir), before);
});

test('effects require consent and the CLI never executes a skill', async (t) => {
  const f = fixture(t, { effects: ['runs-scripts'] });
  const result = await f.invoke(['add', 'ground', '--agent', 'copilot']);
  assert.equal(result.status, 'needs-decision');
  assert.deepEqual(tree(f.project), {});
  assert.equal((await f.invoke(['add', 'ground', '--agent', 'copilot', '--yes'])).status, 'ok');
});

test('a tampered download writes no item, lockfile, staging or cache', async (t) => {
  const f = fixture(t);
  f.item.files[1].sha256 = '0'.repeat(64);
  f.save();
  const result = await f.invoke(['add', 'ground', '--agent', 'copilot']);
  assert.equal(result.status, 'error');
  assert.match(result.message, /mismatch/);
  assert.deepEqual(tree(f.project), {});
});

test('changed files survive --yes; keep is a no-op; explicit replacement keeps a backup', async (t) => {
  const f = fixture(t);
  await f.invoke(['add', 'ground', '--agent', 'copilot']);
  const path = join(f.project, '.agents', 'skills', 'ground', 'SKILL.md');
  writeFileSync(path, 'My changes.');
  const before = tree(f.project);
  const decision = await f.invoke(['add', 'ground', '--agent', 'copilot', '--yes']);
  assert.equal(decision.status, 'needs-decision');
  assert.deepEqual(tree(f.project), before);
  assert.equal((await f.invoke(['add', 'ground', '--agent', 'copilot', '--conflict', 'keep'])).status, 'ok');
  assert.deepEqual(tree(f.project), before);
  assert.equal((await f.invoke(['add', 'ground', '--agent', 'copilot', '--conflict', 'replace'])).status, 'ok');
  assert.deepEqual(readFileSync(path), original);
  assert.equal(readFileSync(`${path}.loushing-1.0.0`, 'utf8'), 'My changes.');
});

test('pre-existing identical files are not silently adopted and removed', async (t) => {
  const f = fixture(t);
  const folder = join(f.project, '.agents', 'skills', 'ground');
  mkdirSync(folder, { recursive: true });
  writeFileSync(join(folder, 'SKILL.md'), original);
  const result = await f.invoke(['add', 'ground', '--agent', 'copilot']);
  assert.equal(result.status, 'needs-decision');
});

test('remove preserves unrecorded files, and edited removals need a distinct choice', async (t) => {
  const f = fixture(t);
  await f.invoke(['add', 'ground', '--agent', 'copilot']);
  const folder = join(f.project, '.agents', 'skills', 'ground');
  writeFileSync(join(folder, 'notes.txt'), 'Mine');
  writeFileSync(join(folder, 'SKILL.md'), 'Edited');
  const before = tree(f.project);
  assert.equal((await f.invoke(['remove', 'ground', '--yes'])).status, 'needs-decision');
  assert.deepEqual(tree(f.project), before);
  assert.equal((await f.invoke(['remove', 'ground', '--conflict', 'replace'])).status, 'ok');
  assert.equal(readFileSync(join(folder, 'notes.txt'), 'utf8'), 'Mine');
  assert.equal(readFileSync(join(folder, 'SKILL.md.loushing-1.0.0'), 'utf8'), 'Edited');
  assert.equal(existsSync(join(folder, 'LICENSE')), false);
});

test('install restores exact pins and target folders without catalog metadata', async (t) => {
  const f = fixture(t);
  mkdirSync(join(f.project, '.github', 'skills'), { recursive: true });
  await f.invoke(['add', 'ground', '--agent', 'copilot', '--agent', 'claude-code']);
  const clone = join(f.dir, 'clone');
  mkdirSync(clone);
  cpSync(join(f.project, 'loushing.lock.json'), join(clone, 'loushing.lock.json'));
  rmSync(f.metadata, { recursive: true });
  const restored = await f.invoke(['install'], { cwd: clone });
  assert.equal(restored.status, 'ok', restored.message);
  assert.deepEqual(readFileSync(join(clone, '.github', 'skills', 'ground', 'SKILL.md')), original);
  assert.deepEqual(readFileSync(join(clone, '.claude', 'skills', 'ground', 'SKILL.md')), original);
  assert.equal(existsSync(join(clone, '.agents')), false);
});

test('idempotent add preserves the lock bytes and reports already up to date', async (t) => {
  const f = fixture(t);
  await f.invoke(['add', 'ground', '--agent', 'copilot']);
  const before = tree(f.project);
  const result = await f.invoke(['add', 'ground', '--agent', 'copilot']);
  assert.equal(result.status, 'ok');
  assert.match(result.message, /up to date/);
  assert.deepEqual(tree(f.project), before);
});

test('transaction failure rolls back every file, lock and new directory', async (t) => {
  const f = fixture(t);
  writeFileSync(join(f.project, 'keep.txt'), 'Mine');
  const before = tree(f.project);
  const result = await f.invoke(['add', 'ground', '--agent', 'copilot', '--agent', 'claude-code'], {
    beforeWrite: (_operation, index) => { if (index === 2) throw new Error('injected disk failure'); },
  });
  assert.equal(result.status, 'error');
  assert.match(result.message, /injected disk failure/);
  assert.deepEqual(tree(f.project), before);
});

test('cancelled work and a write-time change both leave the project intact', async (t) => {
  const f = fixture(t);
  const abort = new AbortController();
  abort.abort();
  assert.equal((await f.invoke(['add', 'ground', '--agent', 'copilot'], { signal: abort.signal })).status, 'error');
  assert.deepEqual(tree(f.project), {});
  const duringCommit = new AbortController();
  const result = await f.invoke(['add', 'ground', '--agent', 'copilot'], {
    signal: duringCommit.signal, beforeWrite: () => duringCommit.abort(),
  });
  assert.equal(result.status, 'error');
  assert.deepEqual(tree(f.project), {});
});

for (const path of ['../escape', '/absolute', 'C:/escape', 'folder\\escape', 'a/../../escape', 'NUL.txt', 'x:stream', 'trailing.', 'a//b']) {
  test(`rejects malicious manifest path ${JSON.stringify(path)}`, async (t) => {
    const f = fixture(t);
    f.item.files[1].path = path;
    f.save();
    assert.equal((await f.invoke(['add', 'ground', '--agent', 'copilot'])).status, 'error');
    assert.deepEqual(tree(f.project), {});
  });
}

test('rejects file/folder collisions, case collisions and unpinned sources', async (t) => {
  const f = fixture(t);
  for (const file of [
    { ...f.item.files[0], path: 'skill.md' },
    { ...f.item.files[0], path: 'SKILL.md/child' },
  ]) {
    f.item.files[1] = file;
    f.save();
    assert.equal((await f.invoke(['add', 'ground', '--agent', 'copilot'])).status, 'error');
  }
  f.item.source.commit = 'main';
  f.save();
  assert.equal((await f.invoke(['add', 'ground', '--agent', 'copilot'])).status, 'error');
  assert.deepEqual(tree(f.project), {});
});

test('rejects destination junctions and malicious lock ownership before removing', async (t) => {
  const f = fixture(t);
  const outside = join(f.dir, 'outside');
  mkdirSync(outside);
  symlinkSync(outside, join(f.project, '.agents'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.equal((await f.invoke(['add', 'ground', '--agent', 'copilot'])).status, 'error');
  assert.deepEqual(tree(outside), {});
  rmSync(join(f.project, '.agents'));
  await f.invoke(['add', 'ground', '--agent', 'copilot']);
  const lockFile = join(f.project, 'loushing.lock.json');
  const lock = JSON.parse(readFileSync(lockFile, 'utf8'));
  lock.items.ground.files['../outside/keep'] = '0'.repeat(64);
  writeFileSync(lockFile, JSON.stringify(lock));
  const before = tree(f.project);
  assert.equal((await f.invoke(['remove', 'ground', '--yes'])).status, 'error');
  assert.deepEqual(tree(f.project), before);
});

test('existing install mutex fails safely without touching another run', async (t) => {
  const f = fixture(t);
  mkdirSync(join(f.project, '.loushing-transaction'));
  const before = tree(f.project);
  assert.equal((await f.invoke(['add', 'ground', '--agent', 'copilot'])).status, 'error');
  assert.deepEqual(tree(f.project), before);
});

test('aliases resolve, removed IDs explain why, and cycles fail', async (t) => {
  const f = fixture(t);
  f.index.aliases = { 'old-ground': 'ground' };
  f.save();
  assert.equal((await f.invoke(['info', 'old-ground'])).item.id, 'ground');
  f.index.removed = { retired: { date: '2026-10-29', reason: 'Moved', instead: 'ground' } };
  f.save();
  assert.match((await f.invoke(['info', 'retired'])).message, /Moved.*ground/);
  f.index.aliases = { a: 'b', b: 'a' };
  f.save();
  assert.match((await f.invoke(['info', 'a'])).message, /cycle/);
});

test('find shares site ranking and returns install plans; info returns hashes', async (t) => {
  const f = fixture(t);
  const found = await f.invoke(['find', 'product promises', '--json', '--yes']);
  assert.equal(found.status, 'ok', found.message);
  assert.equal(found.results[0].id, 'ground');
  assert.ok(found.results[0].install.plans);
  assert.equal((await f.invoke(['info', 'ground'])).item.files[0].sha256, hash(original));
});

test('outdated and update use new metadata but retain edited files until chosen', async (t) => {
  const f = fixture(t);
  await f.invoke(['add', 'ground', '--agent', 'copilot']);
  const path = join(f.project, '.agents', 'skills', 'ground', 'SKILL.md');
  writeFileSync(path, 'My version.');
  const replacement = gitFile('skills/ui-copy/SKILL.md');
  f.item.version = '1.1.0';
  f.item.source.path = 'skills/ui-copy';
  f.item.files[0] = { path: 'SKILL.md', size: replacement.length, sha256: hash(replacement) };
  f.item.files = [f.item.files[0]];
  f.item.changes = [{ line: 'Refined the workflow.' }];
  f.save();
  const outdated = await f.invoke(['outdated']);
  assert.equal(outdated.items[0].available, '1.1.0');
  assert.equal(outdated.items[0].changes[0].line, 'Refined the workflow.');
  assert.equal((await f.invoke(['update', '--yes'])).status, 'needs-decision');
  assert.equal(readFileSync(path, 'utf8'), 'My version.');
  assert.equal((await f.invoke(['update', '--conflict', 'replace'])).status, 'ok');
  assert.deepEqual(readFileSync(path), replacement);
  assert.equal((await f.invoke(['outdated'])).items.length, 0);
});

for (const command of ['update', 'add']) test(`${command} follows a catalog rename through its alias and moves the lock to the new ID`, async (t) => {
  const f = fixture(t);
  assert.equal((await f.invoke(['add', 'ground', '--agent', 'copilot'])).status, 'ok');
  const replacement = gitFile('skills/ui-copy/SKILL.md');
  const renamed = { ...structuredClone(f.item), id: 'grounding', version: '1.1.0', source: { ...f.item.source, path: 'skills/ui-copy' },
    files: [{ path: 'SKILL.md', size: replacement.length, sha256: hash(replacement) }] };
  f.index.items = [{ ...renamed, data: '/items/grounding.json' }];
  f.index.aliases = { ground: 'grounding' };
  writeFileSync(join(f.metadata, 'catalog.json'), JSON.stringify(f.index));
  writeFileSync(join(f.metadata, 'items', 'grounding.json'), JSON.stringify(renamed));
  writeFileSync(join(f.metadata, 'search-index.json'), JSON.stringify({ docs: [indexDoc(renamed)] }));
  rmSync(join(f.metadata, 'items', 'ground.json'));
  const result = await f.invoke(command === 'update' ? ['update', '--yes'] : ['add', 'ground', '--agent', 'copilot', '--yes']);
  assert.equal(result.status, 'ok', result.message);
  const lock = JSON.parse(readFileSync(join(f.project, 'loushing.lock.json'), 'utf8'));
  assert.deepEqual(Object.keys(lock.items), ['ground']);
  assert.equal(lock.items.ground.id, 'grounding');
  assert.equal(lock.items.ground.version, '1.1.0');
  const folder = join(f.project, '.agents', 'skills', 'ground');
  assert.deepEqual(readFileSync(join(folder, 'SKILL.md')), replacement);
  assert.equal(existsSync(join(folder, 'LICENSE')), false);
  assert.deepEqual((await f.invoke(['outdated'])).items, []);
});

test('namespaced copy avoids an existing skill without modifying it', async (t) => {
  const f = fixture(t);
  const folder = join(f.project, '.agents', 'skills', 'ground');
  mkdirSync(folder, { recursive: true });
  writeFileSync(join(folder, 'SKILL.md'), 'Personal workflow.');
  assert.equal((await f.invoke(['add', 'ground', '--agent', 'copilot', '--as', 'loushing-ground'])).status, 'ok');
  assert.equal(readFileSync(join(folder, 'SKILL.md'), 'utf8'), 'Personal workflow.');
  assert.deepEqual(readFileSync(join(f.project, '.agents', 'skills', 'loushing-ground', 'SKILL.md')), original);
});

test('bin prints one JSON object and uses exit codes 0, 1 and 2', (t) => {
  const f = fixture(t);
  for (const [args, code] of [[['list'], 0], [['info', 'unknown'], 1], [['add', 'ground'], 2]]) {
    const result = spawnSync(process.execPath, [join(repo, 'cli', 'bin', 'loushing.mjs'), ...args, ...f.args, '--json', '--yes'], { cwd: f.project, encoding: 'utf8' });
    assert.equal(result.status, code, result.stderr);
    assert.equal(JSON.parse(result.stdout).status, ['ok', 'error', 'needs-decision'][code]);
    assert.equal(result.stdout.trim().split('\n').length, 1);
  }
});

test('removing one agent retains a shared copy and the other recorded agents', async (t) => {
  const f = fixture(t);
  await f.invoke(['add', 'ground', '--agent', 'copilot', '--agent', 'codex', '--agent', 'claude-code']);
  const removed = await f.invoke(['remove', 'ground', '--agent', 'copilot']);
  assert.equal(removed.status, 'ok', removed.message);
  assert.deepEqual(readFileSync(join(f.project, '.agents', 'skills', 'ground', 'SKILL.md')), original);
  const list = await f.invoke(['list']);
  assert.deepEqual(list.items[0].agents, ['codex', 'claude-code']);
  assert.equal((await f.invoke(['remove', 'ground', '--agent', 'claude-code'])).status, 'ok');
  assert.equal(existsSync(join(f.project, '.claude')), false);
  assert.equal((await f.invoke(['remove', 'ground'])).status, 'ok');
  assert.deepEqual(tree(f.project), {});
});

test('a later tampered member prevents every member in a batch from being written', async (t) => {
  const f = fixture(t);
  const bad = { ...f.item, id: 'second', files: f.item.files.map((file) => ({ ...file, sha256: '0'.repeat(64) })) };
  writeFileSync(join(f.metadata, 'items', 'second.json'), JSON.stringify(bad));
  f.index.items.push({ ...bad, data: '/items/second.json' });
  writeFileSync(join(f.metadata, 'catalog.json'), JSON.stringify(f.index));
  const result = await f.invoke(['add', 'ground', 'second', '--agent', 'copilot']);
  assert.equal(result.status, 'error');
  assert.match(result.message, /mismatch/);
  assert.deepEqual(tree(f.project), {});
});

test('existing backups block replacement rather than losing either local copy', async (t) => {
  const f = fixture(t);
  await f.invoke(['add', 'ground', '--agent', 'copilot']);
  const path = join(f.project, '.agents', 'skills', 'ground', 'SKILL.md');
  writeFileSync(path, 'Edited');
  writeFileSync(`${path}.loushing-1.0.0`, 'Older edits');
  const before = tree(f.project);
  const result = await f.invoke(['add', 'ground', '--agent', 'copilot', '--conflict', 'replace']);
  assert.equal(result.status, 'error');
  assert.match(result.message, /Backup already exists/);
  assert.deepEqual(tree(f.project), before);
});

test('aborting at the final write still rolls the transaction back', async (t) => {
  const f = fixture(t);
  const abort = new AbortController();
  const result = await f.invoke(['add', 'ground', '--agent', 'copilot'], {
    signal: abort.signal,
    beforeWrite: (operation) => { if (operation.path === 'loushing.lock.json') abort.abort(); },
  });
  assert.equal(result.status, 'error');
  assert.deepEqual(tree(f.project), {});
});

test('a lockfile edit made while files download aborts the transaction', async (t) => {
  const f = fixture(t);
  await f.invoke(['add', 'ground', '--agent', 'copilot']);
  const file = join(f.project, '.agents', 'skills', 'ground', 'SKILL.md');
  rmSync(file);
  const lockFile = join(f.project, 'loushing.lock.json');
  const edited = `${readFileSync(lockFile, 'utf8')} `;
  const result = await f.invoke(['install'], {
    progress: (message) => { if (message.startsWith('Verifying')) writeFileSync(lockFile, edited); },
  });
  assert.equal(result.status, 'error');
  assert.match(result.message, /Changed during planning/);
  assert.equal(existsSync(file), false);
  assert.equal(readFileSync(lockFile, 'utf8'), edited);
  assert.equal(existsSync(join(f.project, '.loushing-transaction')), false);
});

test('commands use the locked catalog unless an explicit different source is rejected', async (t) => {
  const f = fixture(t);
  await f.invoke(['add', 'ground', '--agent', 'copilot']);
  assert.equal((await run(['outdated'], f.context)).status, 'ok');
  const result = await run(['update', '--catalog', 'https://other.invalid/catalog.json'], f.context);
  assert.equal(result.status, 'error');
  assert.match(result.message, /another catalog/);
});

test('unreleased kit execution requests the manual route without writes, while info explains its plan', async (t) => {
  const f = fixture(t);
  f.item.type = 'kit';
  f.save();
  assert.equal((await f.invoke(['info', 'ground'])).status, 'ok');
  const result = await f.invoke(['add', 'ground', '--agent', 'copilot', '--yes']);
  assert.equal(result.status, 'needs-decision');
  assert.match(result.message, /No released.*manual Git plan/);
  assert.deepEqual(tree(f.project), {});
});

test('find filters agents, info resolves the working directory, and invalid flags are explicit', async (t) => {
  const f = fixture(t);
  assert.equal((await f.invoke(['find', 'product', '--agent', 'copilot'])).results.length, 1);
  assert.equal((await f.invoke(['find', 'product', '--agent', 'claude-code'])).results.length, 0);
  const info = await f.invoke(['info', 'ground', '--agent', 'cursor', '--personal']);
  assert.deepEqual(info.plan.destinations, ['.cursor/skills/ground']);
  for (const args of [['add', 'ground', '--agent'], ['install', '--agent', 'copilot'], ['remove', 'ground', '--version', '1.0.0'], ['list', '--scope', 'elsewhere']]) {
    assert.equal((await f.invoke(args)).status, 'error');
  }
});

test('explicit older versions and next require published immutable metadata, never a guessed ref', async (t) => {
  const f = fixture(t);
  const older = { ...f.item, version: '0.9.0' };
  const next = { ...f.item, version: '1.1.0-beta.1' };
  mkdirSync(join(f.metadata, 'versions'));
  writeFileSync(join(f.metadata, 'versions', 'older.json'), JSON.stringify(older));
  writeFileSync(join(f.metadata, 'versions', 'next.json'), JSON.stringify(next));
  f.index.items[0].versions = { '0.9.0': { ...older, data: 'versions/older.json' } };
  f.index.items[0].channels = { next: { ...next, data: 'versions/next.json' } };
  writeFileSync(join(f.metadata, 'catalog.json'), JSON.stringify(f.index));
  assert.equal((await f.invoke(['info', 'ground', '--version', '0.9.0'])).item.version, '0.9.0');
  assert.equal((await f.invoke(['info', 'ground', '--channel', 'next'])).item.version, '1.1.0-beta.1');
  assert.equal((await f.invoke(['add', 'ground', '--agent', 'copilot', '--version', '0.8.0'])).status, 'error');
  assert.deepEqual(tree(f.project), {});
});

test('long project paths install and remove without shortening the recorded destinations', async (t) => {
  const f = fixture(t);
  const deep = join(f.project, ...Array.from({ length: 5 }, (_, i) => `nested-project-${i}-${'x'.repeat(28)}`));
  mkdirSync(deep, { recursive: true });
  assert.ok(deep.length > 260);
  const installed = await f.invoke(['add', 'ground', '--agent', 'copilot'], { cwd: deep });
  assert.equal(installed.status, 'ok', installed.message);
  assert.equal((await f.invoke(['remove', 'ground'], { cwd: deep })).status, 'ok');
  assert.deepEqual(tree(deep), {});
});
