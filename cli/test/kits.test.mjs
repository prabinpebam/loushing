import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { run } from '../lib/cli.mjs';
import { developmentManifest } from '../scripts/dev-kits.mjs';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { hash } from '../lib/safety.mjs';
import { publicCatalog } from './public-catalog.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const work = join(repo, '.agent-orchestration', 'kit-tests');
mkdirSync(work, { recursive: true });
const development = developmentManifest(repo);
const real = Object.keys(development.kits);
const published = publicCatalog(repo);
test('standalone kit engines are identical vendored copies, without a cross-kit dependency', () => {
  const engine = readFileSync(join(repo, 'agentic-craft', 'tools', 'install-contract.mjs'));
  assert.deepEqual(readFileSync(join(repo, 'agent-orchestration', 'tools', 'install-contract.mjs')), engine);
  assert.deepEqual(readFileSync(join(repo, 'slate', 'scripts', 'install-contract.mjs')), engine);
});
function tree(root) {
  return Object.fromEntries(readdirSync(root, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap((e) => e.isDirectory()
    ? [[`${e.name}/`, null], ...Object.entries(tree(join(root, e.name))).map(([k, v]) => [`${e.name}/${k}`, v])]
    : [[e.name, readFileSync(join(root, e.name)).toString('base64')]]));
}
function fixture(t) {
  const dir = mkdtempSync(join(work, 'case-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const project = join(dir, 'project'), cache = join(dir, 'cache'), metadata = join(dir, 'metadata');
  for (const p of [project, cache, join(metadata, 'items')]) mkdirSync(p, { recursive: true });
  const items = Object.fromEntries([...real, 'plan-build-document'].map((id) => [id, JSON.parse(readFileSync(join(published, 'items', `${id}.json`), 'utf8'))]));
  const dev = structuredClone(development), devPath = join(dir, 'dev.json');
  const save = () => {
    writeFileSync(devPath, JSON.stringify(dev));
    writeFileSync(join(metadata, 'catalog.json'), JSON.stringify({ items: Object.values(items) }));
    for (const item of Object.values(items)) writeFileSync(join(metadata, 'items', `${item.id}.json`), JSON.stringify(item));
  };
  save();
  const base = ['--catalog', join(metadata, 'catalog.json'), '--dev-kits', devPath, '--kit-cache', cache, '--json'];
  const context = { cwd: project, home: project };
  const invoke = (args, extra = {}) => run([...args, ...base], { ...context, ...extra });
  const approve = async (args, extra = {}) => {
    const first = await invoke([...args, '--dry-run']);
    if (!first.decisions?.some((d) => d.id === 'trust-kit-source')) return first;
    const trust = ['--trust-source', first.decisions.find((d) => d.id === 'trust-kit-source').value];
    const preview = await invoke([...args, ...trust, '--dry-run']);
    assert.equal(preview.status, 'ok', JSON.stringify(preview));
    assert.ok(preview.plan?.digest);
    return invoke([...args, ...trust, '--yes', '--approve-plan', preview.plan.digest], extra);
  };
  return { dir, project, cache, items, dev, devPath, save, invoke, approve };
}
for (const id of real) test(`real ${id}: no unconsented code, reviewed plan, lock, restore and exact remove`, async (t) => {
  const f = fixture(t);
  writeFileSync(join(f.project, 'AGENTS.md'), '# Owner notes\n');
  const before = tree(f.project);
  const first = await f.invoke(['add', id, '--agent', 'copilot', '--yes']);
  assert.equal(first.status, 'needs-decision', JSON.stringify(first));
  assert.equal(first.executed, false);
  assert.deepEqual(tree(f.project), before);
  assert.deepEqual(tree(f.cache), {});
  const added = await f.approve(['add', id, '--agent', 'copilot']);
  assert.equal(added.status, 'ok', JSON.stringify(added));
  assert.deepEqual(added.completed, [id]);
  const lock = JSON.parse(readFileSync(join(f.project, 'loushing.lock.json')));
  assert.equal(lock.items[id].type, 'kit');
  assert.equal(lock.items[id].kit.development.mode, 'uncommitted-local');
  assert.equal((await f.invoke(['add', id, '--agent', 'copilot'])).skipped[0], id);
  const path = id === 'slate' ? 'docs/shell/slate.js' : `.github/skills/${id === 'agentic-craft' ? 'craft' : 'orchestrate'}/SKILL.md`;
  rmSync(join(f.project, ...path.split('/')));
  const restored = await f.approve(['install']);
  assert.equal(restored.status, 'ok', JSON.stringify(restored));
  assert.equal(existsSync(join(f.project, ...path.split('/'))), true);
  const removed = await f.approve(['remove', id]);
  assert.equal(removed.status, 'ok', JSON.stringify(removed));
  assert.deepEqual(tree(f.project), before);
  assert.deepEqual(tree(f.cache), {});
});
test('real ordered stack records partial success and safely resumes after a forced member failure', async (t) => {
  const f = fixture(t), before = tree(f.project);
  const args = ['add', 'plan-build-document', '--agent', 'copilot'];
  const failed = await f.approve(args, { beforeKit: (id) => { if (id === 'agent-orchestration') throw new Error('Injected member failure'); } });
  assert.equal(failed.status, 'error');
  assert.deepEqual(failed.completed, ['agentic-craft']);
  assert.deepEqual(Object.keys(JSON.parse(readFileSync(join(f.project, 'loushing.lock.json'))).items), ['agentic-craft']);
  const resumed = await f.approve(args);
  assert.equal(resumed.status, 'ok', JSON.stringify(resumed));
  assert.deepEqual(resumed.completed, ['agent-orchestration', 'slate']);
  assert.deepEqual(resumed.skipped, ['agentic-craft']);
  const record = join(f.project, 'loushing.lock.json'), individualInstalls = JSON.parse(readFileSync(record));
  delete individualInstalls.stacks; writeFileSync(record, JSON.stringify(individualInstalls));
  const unapproved = await f.invoke([...args, '--yes']);
  assert.equal(unapproved.status, 'needs-decision');
  assert.equal(JSON.parse(readFileSync(record)).stacks, undefined);
  const recorded = await f.invoke([...args, '--yes', '--approve-plan', unapproved.plan.digest]);
  assert.equal(recorded.status, 'ok', JSON.stringify(recorded));
  assert.equal(recorded.executed, false);
  assert.deepEqual(recorded.skipped, ['agentic-craft', 'agent-orchestration', 'slate']);
  assert.ok(JSON.parse(readFileSync(record)).stacks['plan-build-document']);
  const removed = await f.approve(['remove', 'plan-build-document']);
  assert.equal(removed.status, 'ok', JSON.stringify(removed));
  assert.deepEqual(tree(f.project), before);
});
test('a busy disposable planning folder never hides the partial-success record', async (t) => {
  const f = fixture(t);
  let holder;
  const release = async () => { if (holder && holder.exitCode === null && holder.signalCode === null) { const exited = once(holder, 'exit'); holder.kill(); await exited; } };
  t.after(release);
  const failed = await f.approve(['add', 'plan-build-document', '--agent', 'copilot'], { beforeKit: (id) => {
    if (id !== 'agent-orchestration') return;
    // A process working inside the planning folder (an indexer or scanner) keeps Windows from deleting it.
    const busy = readdirSync(f.cache).find((name) => name.startsWith('kit-run-'));
    holder = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 60000)'], { cwd: join(f.cache, busy), stdio: 'ignore' });
    throw new Error('Injected member failure');
  } });
  await release();
  assert.equal(failed.status, 'error', JSON.stringify(failed));
  assert.match(failed.message, /Injected member failure/);
  assert.deepEqual(failed.completed, ['agentic-craft']);
  assert.deepEqual(Object.keys(JSON.parse(readFileSync(join(f.project, 'loushing.lock.json'))).items), ['agentic-craft']);
  const leftover = readdirSync(f.cache).filter((name) => name.startsWith('kit-run-'));
  if (leftover.length) assert.match(failed.cleanup ?? '', new RegExp(leftover[0]));
  else assert.equal(failed.cleanup, undefined);
});
test('old public pins remain manual; no implicit development override', async (t) => {
  const f = fixture(t);
  const result = await run(['add', 'agentic-craft', '--agent', 'copilot', '--yes', '--catalog', join(f.dir, 'metadata', 'catalog.json')], { cwd: f.project });
  assert.equal(result.status, 'needs-decision');
  assert.match(result.message, /No released/);
  assert.deepEqual(tree(f.project), {});
});
test('source mismatch fails before any installer executes; yes does not approve an undescribed plan', async (t) => {
  const f = fixture(t);
  f.dev.kits['agentic-craft'].contract.files[0].sha256 = '0'.repeat(64); f.save();
  const args = ['add', 'agentic-craft', '--agent', 'copilot'];
  const first = await f.invoke([...args, '--dry-run']);
  const failed = await f.invoke([...args, '--trust-source', first.decisions[0].value, '--yes']);
  assert.equal(failed.status, 'error');
  assert.match(failed.message, /mismatch/);
  assert.deepEqual(tree(f.project), {});
  f.dev.kits['agentic-craft'].contract.writes.push({ path: '.KIT-STATE/unrelated.json', kind: 'file' }); f.save();
  const namespace = await f.invoke(args);
  assert.equal(namespace.status, 'error');
  assert.match(namespace.message, /own exact ownership record/);
  assert.deepEqual(tree(f.project), {});
});
test('locked ownership tampering is refused before execution', async (t) => {
  const f = fixture(t);
  assert.equal((await f.approve(['add', 'agentic-craft', '--agent', 'copilot'])).status, 'ok');
  writeFileSync(join(f.project, '.kit-state', 'agentic-craft.json'), '{}');
  const before = tree(f.project), result = await f.invoke(['remove', 'agentic-craft', '--yes']);
  assert.equal(result.status, 'error');
  assert.match(result.message, /ownership record changed/);
  assert.deepEqual(tree(f.project), before);
});
test('pinned real installer in a disposable Git repository: update, preserve facts and refuse edits', async (t) => {
  const f = fixture(t), source = join(f.dir, 'source');
  mkdirSync(source);
  const c = structuredClone(development.kits['agentic-craft'].contract);
  c.files = c.files.filter((file) => /^(tools|skills|agents|templates)\//.test(file.path));
  for (const file of c.files) {
    const target = join(source, ...file.path.split('/'));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, readFileSync(join(repo, 'agentic-craft', ...file.path.split('/'))));
  }
  const git = (...args) => execFileSync('git', ['-c', 'core.autocrlf=false', '-c', 'core.hooksPath=disabled-hooks', '-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', ...args], { cwd: source, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git('init', '--quiet'); git('add', '.'); git('commit', '--quiet', '-m', 'Disposable installer fixture');
  const item = f.items['agentic-craft'];
  item.source = { repo: 'example/kit-fixture', path: null, commit: git('rev-parse', 'HEAD') };
  item.install.contract = c;
  f.save();
  const base = ['--catalog', join(f.dir, 'metadata', 'catalog.json'), '--source-root', source, '--kit-cache', f.cache];
  const invoke = (args) => run([...args, ...base], { cwd: f.project });
  const approve = async (args) => {
    const first = await invoke([...args, '--dry-run']);
    const trust = ['--trust-source', first.decisions[0].value];
    const preview = await invoke([...args, ...trust, '--dry-run']);
    if (preview.status !== 'ok') return preview;
    return invoke([...args, ...trust, '--yes', '--approve-plan', preview.plan.digest]);
  };
  assert.equal((await approve(['add', item.id, '--agent', 'copilot'])).status, 'ok');
  const instructions = join(f.project, 'AGENTS.md');
  writeFileSync(instructions, readFileSync(instructions, 'utf8').replace('### Project facts', '### Project facts\n\nOur durable facts.'));
  const skill = c.files.find((file) => file.path === 'skills/craft/SKILL.md');
  const updated = Buffer.concat([readFileSync(join(source, ...skill.path.split('/'))), Buffer.from('\nUpdated fixture content.\n')]);
  writeFileSync(join(source, ...skill.path.split('/')), updated);
  skill.sha256 = hash(updated); skill.size = updated.length;
  git('add', '.'); git('commit', '--quiet', '-m', 'Disposable fixture update');
  item.source.commit = git('rev-parse', 'HEAD'); item.version = '0.2.1'; f.save();
  assert.equal((await invoke(['outdated'])).items[0].available, '0.2.1');
  const update = await approve(['update', item.id]);
  assert.equal(update.status, 'ok', JSON.stringify(update));
  assert.match(readFileSync(instructions, 'utf8'), /Our durable facts/);
  const installed = join(f.project, '.github', 'skills', 'craft', 'SKILL.md');
  assert.match(readFileSync(installed, 'utf8'), /Updated fixture content/);
  writeFileSync(installed, 'My local edit');
  const before = tree(f.project);
  const blocked = await approve(['update', item.id]);
  assert.equal(blocked.status, 'needs-decision');
  assert.deepEqual(tree(f.project), before);
  const kept = await approve(['update', item.id, '--conflict', 'keep']);
  assert.equal(kept.status, 'ok', JSON.stringify(kept));
  assert.deepEqual(tree(f.project), before);
});
test('ordered mixed stack reuses the skill transaction and removes in reverse order', async (t) => {
  const f = fixture(t), before = tree(f.project);
  f.items['ui-lighting'] = JSON.parse(readFileSync(join(published, 'items', 'ui-lighting.json'), 'utf8'));
  for (const file of f.items['ui-lighting'].files) {
    const item = f.items['ui-lighting'];
    const bytes = execFileSync('git', ['show', `${item.source.commit}:${item.source.path}/${file.path}`], { cwd: repo });
    file.size = bytes.length; file.sha256 = hash(bytes);
  }
  f.items['mixed-stack'] = { ...f.items['plan-build-document'], id: 'mixed-stack', members: [{ id: 'ui-lighting' }, { id: 'agentic-craft' }] };
  f.save();
  const added = await f.approve(['add', 'mixed-stack', '--agent', 'copilot', '--source-root', repo]);
  assert.equal(added.status, 'ok', JSON.stringify(added));
  assert.deepEqual(added.completed, ['ui-lighting', 'agentic-craft']);
  const removed = await f.approve(['remove', 'mixed-stack', '--source-root', repo]);
  assert.equal(removed.status, 'ok', JSON.stringify(removed));
  assert.deepEqual(removed.completed, ['agentic-craft', 'ui-lighting']);
  assert.deepEqual(tree(f.project), before);
});
test('removing a stack with an edited skill member and keep changes nothing and asks for a decision', async (t) => {
  const f = fixture(t);
  f.items['ui-lighting'] = JSON.parse(readFileSync(join(published, 'items', 'ui-lighting.json'), 'utf8'));
  for (const file of f.items['ui-lighting'].files) {
    const item = f.items['ui-lighting'];
    const bytes = execFileSync('git', ['show', `${item.source.commit}:${item.source.path}/${file.path}`], { cwd: repo });
    file.size = bytes.length; file.sha256 = hash(bytes);
  }
  f.items['mixed-stack'] = { ...f.items['plan-build-document'], id: 'mixed-stack', members: [{ id: 'ui-lighting' }, { id: 'agentic-craft' }] };
  f.save();
  const added = await f.approve(['add', 'mixed-stack', '--agent', 'copilot', '--source-root', repo]);
  assert.equal(added.status, 'ok', JSON.stringify(added));
  const lockFile = join(f.project, 'loushing.lock.json');
  const edited = Object.keys(JSON.parse(readFileSync(lockFile, 'utf8')).items['ui-lighting'].files).find((path) => path.endsWith('/SKILL.md'));
  writeFileSync(join(f.project, edited), `${readFileSync(join(f.project, edited), 'utf8')}\nLocal edit.\n`);
  const before = tree(f.project);
  const args = ['remove', 'mixed-stack', '--conflict', 'keep', '--source-root', repo];
  const dry = await f.invoke([...args, '--dry-run']);
  const trust = dry.decisions?.find((d) => d.id === 'trust-kit-source');
  const runs = [dry];
  if (trust) runs.push(await f.invoke([...args, '--trust-source', trust.value, '--dry-run']));
  runs.push(await f.invoke([...args, ...(trust ? ['--trust-source', trust.value] : []), '--yes', '--approve-plan', added.plan.digest]));
  for (const result of runs.slice(-2)) {
    assert.equal(result.status, 'needs-decision', JSON.stringify(result));
    assert.ok(result.files?.includes(edited), JSON.stringify(result));
    assert.deepEqual(result.completed ?? [], []);
  }
  assert.deepEqual(tree(f.project), before);
  const lock = JSON.parse(readFileSync(lockFile, 'utf8'));
  assert.ok(lock.items['ui-lighting'] && lock.items['agentic-craft'] && lock.stacks?.['mixed-stack'], JSON.stringify(Object.keys(lock.items)));
});
test('personal orchestration plans use the real destination in clock hooks, never the planning copy', async (t) => {
  const f = fixture(t), before = tree(f.project);
  const added = await f.approve(['add', 'agent-orchestration', '--agent', 'copilot', '--scope', 'personal']);
  assert.equal(added.status, 'ok', JSON.stringify(added));
  const hooks = readFileSync(join(f.project, '.copilot', 'hooks', 'orchestration-clock.json'), 'utf8');
  assert.ok(hooks.includes(f.project.replaceAll('\\', '/')));
  assert.doesNotMatch(hooks, /kit-run-/);
  const removed = await f.approve(['remove', 'agent-orchestration', '--scope', 'personal']);
  assert.equal(removed.status, 'ok', JSON.stringify(removed));
  assert.deepEqual(tree(f.project), before);
});
test('a failed lock commit rolls back the successful kit member and leaves the project exact', async (t) => {
  const f = fixture(t), before = tree(f.project);
  const failed = await f.approve(['add', 'agentic-craft', '--agent', 'copilot'], { beforeKitRecord: () => { throw new Error('Injected record failure'); } });
  assert.equal(failed.status, 'error');
  assert.match(failed.message, /Injected record failure/);
  assert.deepEqual(failed.completed, []);
  assert.deepEqual(tree(f.project), before);
});
test('yes without an exact reviewed target plan cannot install a trusted kit', async (t) => {
  const f = fixture(t), before = tree(f.project);
  const args = ['add', 'agentic-craft', '--agent', 'copilot'];
  const first = await f.invoke([...args, '--dry-run']);
  const trust = ['--trust-source', first.decisions[0].value];
  const unapproved = await f.invoke([...args, ...trust, '--yes']);
  assert.equal(unapproved.status, 'needs-decision');
  assert.equal(unapproved.decisions[0].flag, '--approve-plan');
  assert.deepEqual(tree(f.project), before);
  const stale = await f.invoke([...args, ...trust, '--yes', '--approve-plan', '0'.repeat(64)]);
  assert.equal(stale.status, 'needs-decision');
  assert.deepEqual(tree(f.project), before);
});
test('a tampered contract path or unpinned source is rejected before source execution', async (t) => {
  const f = fixture(t);
  f.dev.kits['agentic-craft'].contract.files[0].path = '../outside'; f.save();
  const result = await f.invoke(['add', 'agentic-craft', '--agent', 'copilot', '--yes']);
  assert.equal(result.status, 'needs-decision');
  assert.match(result.message, /source file/);
  assert.deepEqual(tree(f.project), {});
  f.dev.kits['agentic-craft'] = structuredClone(development.kits['agentic-craft']);
  f.dev.kits['agentic-craft'].commit = 'main'; f.save();
  assert.equal((await f.invoke(['add', 'agentic-craft', '--agent', 'copilot'])).status, 'error');
  assert.deepEqual(tree(f.cache), {});
});
test('human bin output shows source plans and exact consent flags without crashing', (t) => {
  const f = fixture(t);
  const result = spawnSync(process.execPath, [join(repo, 'cli', 'bin', 'loushing.mjs'), 'add', 'agentic-craft', '--agent', 'copilot',
    '--catalog', join(f.dir, 'metadata', 'catalog.json'), '--dev-kits', f.devPath, '--kit-cache', f.cache], { cwd: f.project, encoding: 'utf8' });
  assert.equal(result.status, 2, result.stderr);
  assert.match(result.stdout, /sourceDigest/);
  assert.match(result.stderr, /--trust-source [a-f0-9]{64}/);
  assert.deepEqual(tree(f.project), {});
});
test('removing kits leaves files they never owned and records no lock entry', async (t) => {
  const f = fixture(t);
  const hooks = join(f.project, '.github', 'hooks', 'orchestration-clock.json');
  mkdirSync(dirname(hooks), { recursive: true });
  writeFileSync(hooks, '{ "owner": "my own clock limits" }\n');
  const before = tree(f.project);
  for (const id of ['agent-orchestration', 'agentic-craft']) assert.equal((await f.approve(['add', id, '--agent', 'copilot'])).status, 'ok');
  writeFileSync(join(f.project, 'CLAUDE.md'), '# Made after install\n');
  for (const id of ['agentic-craft', 'agent-orchestration']) {
    const removed = await f.approve(['remove', id]);
    assert.equal(removed.status, 'ok', JSON.stringify(removed));
    assert.deepEqual(removed.completed, [id]);
  }
  assert.equal(existsSync(join(f.project, 'loushing.lock.json')), false);
  assert.equal(readFileSync(join(f.project, 'CLAUDE.md'), 'utf8'), '# Made after install\n');
  rmSync(join(f.project, 'CLAUDE.md'));
  assert.deepEqual(tree(f.project), before);
});
test('kit removal never reports success while local edits keep the kit installed', async (t) => {
  const f = fixture(t);
  assert.equal((await f.approve(['add', 'agentic-craft', '--agent', 'copilot'])).status, 'ok');
  writeFileSync(join(f.project, '.github', 'skills', 'craft', 'SKILL.md'), 'Owner changed this.');
  const before = tree(f.project);
  const args = ['remove', 'agentic-craft', '--conflict', 'keep'];
  const trust = ['--trust-source', (await f.invoke([...args, '--dry-run'])).decisions.find((d) => d.id === 'trust-kit-source').value];
  for (const extra of [['--dry-run'], ['--yes']]) {
    const result = await f.invoke([...args, ...trust, ...extra]);
    assert.equal(result.status, 'needs-decision', JSON.stringify(result));
    assert.deepEqual(result.files, ['.github/skills/craft/SKILL.md']);
  }
  assert.deepEqual(tree(f.project), before);
  assert.equal(JSON.parse(readFileSync(join(f.project, 'loushing.lock.json'))).items['agentic-craft'].type, 'kit');
});
test('real harness installers: rerunning and removing Craft keeps the Orchestration section and facts byte for byte', (t) => {
  const project = mkdtempSync(join(work, 'case-'));
  t.after(() => rmSync(project, { recursive: true, force: true }));
  const install = (kit, ...args) => {
    const result = spawnSync(process.execPath, [join(repo, kit, 'tools', 'install.mjs'), project, '--for', 'copilot', '--json', ...args], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stdout);
  };
  install('agentic-craft');
  install('agent-orchestration');
  const agents = join(project, 'AGENTS.md'), text = readFileSync(agents, 'utf8'), at = text.indexOf('<!-- agent-orchestration:start -->');
  writeFileSync(agents, text.slice(0, at) + text.slice(at).replace('### Project facts', '### Project facts\n\n- Orchestration facts stay.'));
  install('agent-orchestration');
  const filled = readFileSync(agents, 'utf8');
  const orchestration = filled.slice(filled.indexOf('<!-- agent-orchestration:start -->'), filled.indexOf('<!-- agent-orchestration:end -->'));
  assert.match(orchestration, /Orchestration facts stay/);
  install('agentic-craft');
  install('agentic-craft', '--uninstall');
  const after = readFileSync(agents, 'utf8');
  assert.ok(after.includes(orchestration));
  assert.doesNotMatch(after, /agentic-craft:/);
  assert.equal(existsSync(join(project, '.kit-state', 'agentic-craft.json')), false);
  assert.equal(existsSync(join(project, '.kit-state', 'agent-orchestration.json')), true);
});
