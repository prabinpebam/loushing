import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, rmdirSync, writeFileSync } from 'node:fs';
import { resolve, join, dirname, basename, sep } from 'node:path';
import { contractProblem, permits } from '../../site/src/lib/kit-contract.mjs';
import { CliError, hash, own, portablePath, safePath, snapshot, stat, validCommit, validHash, validId, validVersion, validateManifest } from './safety.mjs';
import { download } from './network.mjs';
import { lockPath } from './lock.mjs';
import { transact } from './transaction.mjs';
import { destinations } from './targets.mjs';

const encode = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const digest = (value) => hash(JSON.stringify(value));
const statePath = (id) => `.kit-state/${id}.json`;
function rememberStacks(lock, stacks) {
  if (!stacks.length) return;
  lock.stacks ??= {};
  for (const stack of stacks) lock.stacks[stack.id] = { members: stack.members.map((m) => typeof m === 'string' ? m : m.id), next: stack.next };
}
const pinned = (item) => {
  if (!validId(item.id) || !validVersion(item.version) || item.type !== 'kit' || !validCommit(item.source?.commit)
    || !/^[\w.-]+\/[\w.-]+$/.test(item.source?.repo ?? '')) throw new CliError('A kit needs an ID, version, repository and exact commit.');
  portablePath(item.source.repo);
  const problem = contractProblem(item.install?.contract);
  if (problem) throw new CliError(`${item.id}: ${problem}`, 2, { manual: item.install?.plans });
  if (!item.install.contract.writes.some((w) => w.path === statePath(item.id) && w.kind === 'file')
    || item.install.contract.writes.some((w) => w.path.toLowerCase().startsWith('.kit-state') && (w.path !== statePath(item.id) || w.kind !== 'file'))) throw new CliError('A kit may declare only its own exact ownership record.');
};
export function validateKitRecord(name, entry, scope) {
  pinned({ ...entry, install: { contract: entry.kit?.contract } });
  if (name !== entry.id || entry.scope !== scope || entry.commit !== entry.source.commit || !validHash(entry.kit.sourceDigest)
    || !Array.isArray(entry.agents) || !entry.agents.length || entry.agents.some((a) => !own(entry.kit.contract.agents, a))
    || Object.keys(entry.files ?? {}).length !== 1 || !validHash(entry.files[statePath(name)])
    || typeof entry.kit.state !== 'string' || hash(Buffer.from(entry.kit.state, 'base64')) !== entry.files[statePath(name)]) throw new CliError(`Invalid kit lock record: ${name}.`);
  if (entry.kit.development && (entry.kit.development.mode !== 'uncommitted-local' || typeof entry.kit.development.root !== 'string')) throw new CliError('Invalid development source record.');
}
function readDevelopment(file) {
  if (!file) return {};
  const value = JSON.parse(readFileSync(safePath(dirname(resolve(file)), basename(file)), 'utf8'));
  if (value.mode !== 'uncommitted-local' || value.version !== 1 || !value.kits || Array.isArray(value.kits)) throw new CliError('--dev-kits requires an explicit local development manifest.');
  return value.kits;
}
const sourceIdentity = (item, c, development) => ({ id: item.id, source: item.source, contract: c, ...(development ? { development } : {}) });
export function kitUpdateAvailable(name, installed, latest, options) {
  if (!installed.kit?.development) return undefined;
  if (!options['dev-kits']) return { name, installed: installed.version, available: null, blocked: 'Local development install: supply --dev-kits to compare working-source manifests. Public pins are not development updates.' };
  const dev = readDevelopment(options['dev-kits'])[installed.id];
  if (!dev) throw new CliError(`The development manifest omits ${installed.id}.`);
  const candidate = { ...latest, source: { ...latest.source, commit: dev.commit } };
  const sourceDigest = digest(sourceIdentity(candidate, dev.contract, { mode: 'uncommitted-local', root: resolve(dev.root) }));
  return sourceDigest === installed.kit.sourceDigest && latest.version === installed.version ? null
    : { name, installed: installed.version, available: latest.version, commit: dev.commit, development: true, sourceDigest, changes: latest.changes ?? [] };
}
function verifyPlan(plan, member, root) {
  if (!plan || plan.contractVersion !== 1 || plan.id !== member.item.id || resolve(plan.root) !== resolve(root) || plan.network !== false
    || !Array.isArray(plan.writes) || !Array.isArray(plan.deletes) || !Array.isArray(plan.conflicts) || !Array.isArray(plan.effects)
    || plan.effects.some((e) => !member.contract.effects.includes(e))) throw new CliError(`Invalid or undeclared installer plan: ${member.item.id}.`);
  const { digest: expected, ...body } = plan;
  if (digest(body) !== expected) throw new CliError('The installer plan digest does not match.');
  const seen = new Set();
  for (const op of [...plan.writes, ...plan.deletes]) {
    portablePath(op.path);
    if (!permits(member.contract, op.path) || seen.has(op.path.toLowerCase()) || op.sha256 !== undefined && !validHash(op.sha256)
      || op.before !== null && !validHash(op.before)) throw new CliError(`Unsafe or overlapping kit change: ${op.path}.`);
    seen.add(op.path.toLowerCase());
  }
}
function invoke(member, source, root, scope, { dryRun = false, approval, uninstall = false } = {}) {
  const c = member.contract;
  for (const file of c.files) if (snapshot(source, file.path)?.hash !== file.sha256) throw new CliError(`Kit source changed before execution: ${file.path}.`);
  const args = (scope === 'personal' ? c.personal : c.project).map((a) => a.replaceAll('{projectDir}', root));
  if (c.logicalRootFlag) args.push(c.logicalRootFlag, member.logicalRoot);
  args.push('--for', [...new Set(member.agents.map((a) => c.agents[a]))].join(','), '--json');
  if (dryRun) args.push('--dry-run');
  if (uninstall) args.push('--uninstall');
  if (approval) args.push('--approve-plan', approval);
  const env = { ...process.env, HOME: root, USERPROFILE: root };
  // Node preload flags are not part of an approved source contract.
  delete env.NODE_OPTIONS; delete env.NODE_PATH;
  const result = spawnSync(process.execPath, [safePath(source, c.command[1]), ...args], { cwd: root, env, encoding: 'utf8', timeout: 120000, maxBuffer: 8 * 1024 * 1024, windowsHide: true });
  let value;
  try { value = JSON.parse(result.stdout); } catch { throw new CliError(`Installer ${member.item.id} returned no valid JSON (exit ${result.status}).`); }
  if (![0, 1, 2].includes(result.status) || value.status !== ['ok', 'error', 'needs-decision'][result.status]) throw new CliError(`Installer ${member.item.id} violated the exit-code contract.`);
  if (value.status !== 'ok' && !(dryRun && result.status === 2 && value.plan)) throw new CliError(value.message ?? `Installer ${member.item.id} needs a local-edit decision.`, result.status, { installer: value });
  verifyPlan(value.plan, member, root);
  if (value.plan.uninstall !== uninstall) throw new CliError('Installer returned the wrong operation.');
  return value;
}
async function acquire(member, folder, options, context) {
  mkdirSync(folder);
  let total = 0;
  const started = Date.now();
  for (const [index, file] of member.contract.files.entries()) {
    context.signal?.throwIfAborted();
    if (index % 25 === 0) context.progress?.(`Verifying ${member.item.id}: ${index} of ${member.contract.files.length} source files (${Math.round((Date.now() - started) / 1000)} s)…`);
    let bytes;
    if (member.development) bytes = readFileSync(safePath(member.development.root, file.path));
    else if (options['source-root']) {
      const source = resolve(options['source-root']);
      const mode = execFileSync('git', ['ls-tree', '-z', member.item.source.commit, '--', file.path], { cwd: source, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
      if (!/^100(644|755) blob [a-f0-9]{40}\t/.test(mode) || mode.split('\0').filter(Boolean).length !== 1) throw new CliError(`Not a regular pinned source: ${file.path}.`);
      bytes = execFileSync('git', ['show', `${member.item.source.commit}:${file.path}`], { cwd: source, stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 20 * 1024 * 1024 });
    } else {
      const path = file.path.split('/').map(encodeURIComponent).join('/');
      bytes = await download(`https://raw.githubusercontent.com/${member.item.source.repo}/${member.item.source.commit}/${path}`, {
        signal: context.signal, env: context.env, limit: 20 * 1024 * 1024,
        allow: (u) => u.protocol === 'https:' && u.hostname === 'raw.githubusercontent.com',
      });
    }
    if (bytes.length !== file.size || hash(bytes) !== file.sha256) throw new CliError(`Hash or size mismatch for kit source ${member.item.id}/${file.path}. No installer was executed.`);
    total += bytes.length;
    if (total > 80 * 1024 * 1024) throw new CliError('Kit source exceeds its size budget.');
    const target = safePath(folder, file.path);
    mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, bytes, { flag: 'wx' });
  }
  context.progress?.(`Verified ${member.item.id}: ${member.contract.files.length} source files.`);
}
function copyProject(root, target, declarations) {
  const copy = (path) => {
    const source = safePath(root, path), s = stat(source);
    const parts = path.split('/');
    for (let i = 1; i < parts.length; i++) {
      const parent = parts.slice(0, i).join('/');
      if (stat(safePath(root, parent))?.isDirectory()) mkdirSync(safePath(target, parent), { recursive: true });
    }
    if (!s) return;
    if (s.isDirectory()) {
      mkdirSync(safePath(target, path), { recursive: true });
      for (const name of readdirSync(source)) copy(`${path}/${name}`);
    } else {
      snapshot(root, path);
      mkdirSync(dirname(safePath(target, path)), { recursive: true });
      writeFileSync(safePath(target, path), readFileSync(source));
    }
  };
  for (const path of new Set(declarations.map((d) => d.path))) copy(path);
}
export async function runKits(args) {
  const leftovers = [];
  const result = await planAndRunKits({ ...args, leftovers });
  // The outcome stands even when the disposable folder cannot be deleted; only report it.
  return leftovers.length ? { ...result, cleanup: `Could not delete the disposable planning folder ${leftovers[0]}. Close programs using it, then delete it.` } : result;
}

async function planAndRunKits({ options, context, root, scope, catalog, lock, lockBefore, selected, executeSkills, leftovers }) {
  if (options.as || options.conflict === 'replace') throw new CliError('Kits do not support --as or forced replacement. Keep local edits, or resolve them before retrying.', 2);
  const development = readDevelopment(options['dev-kits']);
  const members = [], stacks = [], visited = new Set(), visiting = new Set();
  const expand = async (id, parent = null) => {
    if (visiting.has(id)) throw new CliError('Stack member cycle.');
    if (visited.has(id)) return;
    const old = own(lock.items, id) ? lock.items[id] : null;
    const item = ['install', 'remove'].includes(options.command) ? old ? { ...old, install: { contract: old.kit?.contract }, files: old.manifest } : own(lock.stacks ?? {}, id) ? { id, type: 'stack', ...lock.stacks[id] } : null
      : await catalog.item(old?.id ?? id, options);
    if (!item) throw new CliError(`Not installed: ${id}.`);
    if (item.type === 'stack') {
      if (!Array.isArray(item.members) || !item.members.length) throw new CliError('A stack needs ordered members.');
      visiting.add(id); stacks.push({ id, members: item.members, next: item.afterSetup ?? 'Fill in project facts and start a new agent chat.' });
      const ordered = options.command === 'remove' ? [...item.members].reverse() : item.members;
      for (const m of ordered) {
        const memberId = typeof m === 'string' ? m : m.id;
        if (options.command !== 'remove' || own(lock.items, memberId)) await expand(memberId, id);
      }
      visiting.delete(id); visited.add(id); return;
    }
    if (item.type === 'skill') {
      validateManifest(item);
      const agents = [...new Set([...(old?.agents ?? []), ...options.agents])];
      const sourceDigest = digest({ source: item.source, files: item.files });
      const compatible = options.command === 'add' && old?.type === 'skill' && old.version === item.version && old.commit === item.source.commit && agents.every((a) => old.agents.includes(a));
      members.push({ item, old, agents, skill: true, parent, sourceDigest, compatible,
        contract: { effects: item.effects, writes: [...new Set([...(old?.destinations ?? []), ...destinations(agents, scope, root, id)])].map((path) => ({ path, kind: 'tree' })) } });
      visited.add(id); return;
    }
    let local;
    if (options.command === 'install' || options.command === 'remove') {
      local = old?.kit?.development;
      if (local && (!options['dev-kits'] || !development[id] || resolve(development[id].root) !== resolve(local.root))) throw new CliError('Restoring or removing a development kit requires the explicit matching --dev-kits manifest.');
    } else if (own(development, id)) {
      const dev = development[id];
      local = { mode: 'uncommitted-local', root: resolve(dev.root) };
      item.install = { ...item.install, contract: dev.contract };
      item.source = { ...item.source, commit: dev.commit };
    }
    pinned(item);
    const contract = item.install.contract;
    const agents = [...new Set([...(old?.agents ?? []), ...options.agents])];
    if (!agents.length || agents.some((a) => !own(contract.agents, a)) || scope === 'personal' && !contract.personal) throw new CliError(`Unsupported scope or agent for ${item.id}.`, 2);
    if (options.command === 'remove' && options.agents.length && old.agents.some((a) => !options.agents.includes(a))) throw new CliError('Remove a kit as a whole; per-agent kit removal is not supported.', 2);
    const identity = sourceIdentity(item, contract, local), sourceDigest = digest(identity);
    if (old && ['install', 'remove'].includes(options.command) && sourceDigest !== old.kit.sourceDigest) throw new CliError('The locked kit source identity changed.');
    const state = snapshot(root, statePath(item.id));
    if (old && state && state.hash !== old.files[statePath(item.id)]) throw new CliError(`Kit ownership record changed: ${item.id}. Restore its recorded state before continuing.`);
    const compatible = options.command === 'add' && old?.type === 'kit' && old.version === item.version && old.kit.sourceDigest === sourceDigest
      && agents.every((a) => old.agents.includes(a)) && state;
    members.push({ item, old, contract, agents, development: local, sourceDigest, parent, compatible: !!compatible, logicalRoot: root });
    visited.add(id);
  };
  for (const id of selected) await expand(id);
  const active = members.filter((m) => !m.compatible);
  const sourcePlan = { root, scope, command: options.command, members: active.map((m) => ({ id: m.item.id, version: m.item.version, source: m.item.source, sourceDigest: m.sourceDigest, development: m.development, effects: m.contract.effects, writes: m.contract.writes })) };
  const trust = digest(sourcePlan);
  const decision = { id: 'trust-kit-source', flag: '--trust-source', value: trust, question: 'Approve execution of these exact sources in an isolated planning copy? Installers are trusted code, not sandboxed. No target installation is approved by this choice.' };
  if (active.length && options['trust-source'] !== trust) return { status: options['dry-run'] ? 'ok' : 'needs-decision', dryRun: !!options['dry-run'], sourcePlan, decisions: [decision], executed: false };
  if (!active.length) {
    const skipped = members.map((m) => m.item.id), next = structuredClone(lock);
    if (options.command === 'add') rememberStacks(next, stacks);
    if (JSON.stringify(next) === JSON.stringify(lock)) return { status: 'ok', message: 'Compatible members already installed.', skipped, stacks };
    const bytes = encode(next);
    const plan = { root, scope, command: options.command, record: lockPath(scope), recordChange: { before: lockBefore?.hash ?? null, sha256: hash(bytes) }, skipped, stacks };
    plan.digest = digest(plan);
    const approved = options.yes && options['approve-plan'] === plan.digest;
    if (options['dry-run'] || !approved) return { status: options['dry-run'] ? 'ok' : 'needs-decision', dryRun: !!options['dry-run'], executed: false, plan,
      decisions: [{ id: 'approve-kit-plan', flag: '--approve-plan', value: plan.digest, also: '--yes', question: 'Approve recording this stack of already compatible members? No installer will execute.' }] };
    transact(root, [{ path: lockPath(scope), before: lockBefore, bytes }], { signal: context.signal });
    return { status: 'ok', plan, completed: [], skipped, executed: false, next: stacks.map((s) => s.next).join(' ') };
  }
  if (!options['kit-cache']) return { status: 'needs-decision', decisions: [{ id: 'kit-cache', flag: '--kit-cache', question: 'Choose an existing disposable cache folder for verified source and isolated planning copies.' }], executed: false };
  const cache = resolve(options['kit-cache']);
  safePath(cache);
  if (!stat(cache)?.isDirectory()) throw new CliError('The kit cache must be an existing folder outside the destination project.');
  const physical = (path) => process.platform === 'win32' ? realpathSync(path).toLowerCase() : realpathSync(path);
  if (physical(cache) === physical(root) || physical(cache).startsWith(`${physical(root)}${sep}`)) throw new CliError('The kit cache must be an existing folder outside the destination project.');
  const work = mkdtempSync(join(cache, 'kit-run-'));
  let mutex = false;
  let pending = null;
  const completed = [];
  try {
    const shadow = join(work, 'project'); mkdirSync(shadow);
    copyProject(root, shadow, active.flatMap((m) => m.contract.writes));
    if (lockBefore) {
      mkdirSync(dirname(safePath(shadow, lockPath(scope))), { recursive: true });
      writeFileSync(safePath(shadow, lockPath(scope)), encode(lock));
    }
    const skillRun = (member, target, dryRun, held = false) => {
      const args = [options.command, ...(['install', 'update'].includes(options.command) ? [] : [member.item.id]), '--scope', scope, '--yes'];
      if (options.command === 'add') for (const agent of member.agents) args.push('--agent', agent);
      if (options.conflict) args.push('--conflict', options.conflict);
      if (dryRun) args.push('--dry-run');
      if (options.catalog) args.push('--catalog', options.catalog);
      if (options['source-root']) args.push('--source-root', options['source-root']);
      return executeSkills(args, { ...context, cwd: target, home: target, onlyItems: [member.item.id], catalog, transactionLockHeld: held });
    };
    const seeds = [];
    for (const member of active) {
      if (member.skill) continue;
      member.source = join(work, member.item.id);
      await acquire(member, member.source, options, context);
      const path = statePath(member.item.id);
      if (member.old && !snapshot(root, path)) {
        const bytes = Buffer.from(member.old.kit.state, 'base64');
        mkdirSync(dirname(safePath(shadow, path)), { recursive: true }); writeFileSync(safePath(shadow, path), bytes);
        seeds.push({ path, sha256: hash(bytes), member: member.item.id });
      }
    }
    // Verify every source before executing even the first dry run.
    for (const member of active) {
      context.signal?.throwIfAborted();
      context.progress?.(`Planning ${member.item.id} in the disposable copy…`);
      if (member.skill) {
        const preview = await skillRun(member, shadow, true);
        if (preview.status !== 'ok' || preview.decisions?.length) throw new CliError(preview.message ?? 'Skill member needs a conflict decision.', 2, { installer: preview });
        // Keeping edits leaves the skill installed, so removal stops before anything changes, as it does for kits.
        if (options.command === 'remove' && preview.plan.items.some((i) => i.skipped)) {
          const recorded = lock.items[member.item.id]?.files ?? {};
          const files = Object.keys(recorded).filter((path) => (snapshot(root, path)?.hash ?? null) !== recorded[path]);
          return { status: 'needs-decision', message: `Local edits block removing ${member.item.id}: ${files.join(', ')}. Restore or move those files, then remove again; a stack is removed as a whole.`, files, completed };
        }
        member.plan = { ...preview.plan, root };
        member.guards = Object.fromEntries([...preview.plan.writes, ...preview.plan.deletes].map((path) => [path, snapshot(shadow, path)?.hash ?? null]));
        const simulated = await skillRun(member, shadow, false);
        if (simulated.status !== 'ok') throw new CliError(simulated.message ?? 'Skill planning failed.');
        continue;
      }
      const preview = invoke(member, member.source, shadow, scope, { dryRun: true, uninstall: options.command === 'remove' });
      if (preview.plan.conflicts.length) {
        // Keeping edits leaves a kit installed, so it is a choice for add and update only. Removal stops here, as it does above for an edited skill member, so it never reports success without removing.
        if (options.command === 'remove') return { status: 'needs-decision', message: `Local edits block removing ${member.item.id}: ${preview.plan.conflicts.join(', ')}. Restore or move those files, then remove again; a kit is removed as a whole.`, files: preview.plan.conflicts, completed };
        if (options.conflict === 'keep') { member.kept = true; continue; }
        return { status: 'needs-decision', decisions: [{ id: 'kit-local-edits', flag: '--conflict', options: ['keep'], files: preview.plan.conflicts }], completed };
      }
      invoke(member, member.source, shadow, scope, { approval: preview.plan.digest, uninstall: options.command === 'remove' });
      const { digest: ignored, ...rebased } = preview.plan;
      rebased.root = root;
      member.plan = { ...rebased, digest: digest(rebased) };
    }
    const plan = { root, scope, command: options.command, record: lockPath(scope), sourceTrust: trust, seeds, members: members.map((m) => ({ id: m.item.id, version: m.item.version, skipped: m.compatible || !!m.kept, sourceDigest: m.sourceDigest, plan: m.plan, guards: m.guards })), stacks };
    plan.digest = digest(plan);
    const decisions = options.yes && options['approve-plan'] === plan.digest ? [] : [{ id: 'approve-kit-plan', flag: '--approve-plan', value: plan.digest, also: '--yes', question: 'Approve exactly this combined target plan? Changed plans require another approval.' }];
    if (options['dry-run']) return { status: 'ok', dryRun: true, plan, decisions };
    if (decisions.length) return { status: 'needs-decision', plan, decisions };
    context.signal?.throwIfAborted();
    try { mkdirSync(safePath(root, '.loushing-transaction')); mutex = true; } catch { throw new CliError('Another install may be running. Preserve .loushing-transaction.'); }
    const currentLock = snapshot(root, lockPath(scope));
    if (currentLock?.hash !== lockBefore?.hash) throw new CliError('Lockfile changed during planning. Run again.');
    let next = structuredClone(lock);
    if (scope === 'personal' && !stat(safePath(root, '.loushing'))) next.createdDirectories.push('.loushing');
    let recordBefore = lockBefore;
    for (const member of active.filter((m) => !m.kept)) {
      context.signal?.throwIfAborted();
      context.progress?.(`${options.command === 'remove' ? 'Removing' : 'Installing'} ${member.item.id} from its approved plan…`);
      if (member.skill) {
        for (const [path, expected] of Object.entries(member.guards)) if ((snapshot(root, path)?.hash ?? null) !== expected) throw new CliError(`Skill target changed since planning: ${path}.`);
        const result = await skillRun(member, root, false, true);
        if (result.status !== 'ok') throw new CliError(result.message ?? 'Skill member failed.');
        recordBefore = snapshot(root, lockPath(scope));
        next = recordBefore ? JSON.parse(readFileSync(safePath(root, lockPath(scope)))) : { ...next, items: {} };
        if (options.command === 'remove' && own(next.items, member.item.id)) throw new CliError(`${member.item.id} is still installed, so it was not removed. Restore or move its edited files, then remove again.`);
      } else {
      const path = statePath(member.item.id);
      const seed = seeds.find((s) => s.member === member.item.id);
      if (seed) transact(root, [{ path, before: null, bytes: Buffer.from(member.old.kit.state, 'base64') }], { signal: context.signal, lockHeld: true });
      context.beforeKit?.(member.item.id);
      pending = [...member.plan.writes, ...member.plan.deletes].map((op) => {
        const before = snapshot(root, op.path);
        if ((before?.hash ?? null) !== op.before) throw new CliError(`Changed before installer execution: ${op.path}.`);
        return { path: op.path, before, bytes: before ? readFileSync(safePath(root, op.path)) : null, after: op.sha256 ?? null };
      });
      pending.createdDirectories = [...new Set(pending.flatMap((op) => {
        const parts = op.path.split('/'), dirs = [];
        while (parts.length > 1) { parts.pop(); const dir = parts.join('/'); if (!stat(safePath(root, dir))) dirs.push(dir); }
        return dirs;
      }))];
      const result = invoke(member, member.source, root, scope, { approval: member.plan.digest, uninstall: options.command === 'remove' });
      if (result.plan.digest !== member.plan.digest) throw new CliError('The executed plan differs from the approved plan.');
      for (const w of result.plan.writes) if (snapshot(root, w.path)?.hash !== w.sha256) throw new CliError(`Installer result mismatch: ${w.path}.`);
      for (const d of result.plan.deletes) if (snapshot(root, d.path)) throw new CliError(`Installer did not remove ${d.path}.`);
      if (options.command === 'remove') delete next.items[member.item.id];
      else {
        const state = readFileSync(safePath(root, path));
        next.items[member.item.id] = {
          id: member.item.id, type: 'kit', version: member.item.version, commit: member.item.source.commit,
          source: member.item.source, agents: member.agents, scope, destinations: [path], effects: member.contract.effects,
          manifest: member.contract.files, files: { [path]: hash(state) },
          kit: { contract: member.contract, sourceDigest: member.sourceDigest, state: state.toString('base64'), ...(member.development ? { development: member.development } : {}) },
        };
      }
      }
      if (options.command !== 'remove') rememberStacks(next, stacks);
      if (next.stacks && options.command === 'remove') for (const [id, stack] of Object.entries(next.stacks)) {
        if (!stack.members.some((m) => own(next.items, m))) delete next.stacks[id];
      }
      const bytes = Object.keys(next.items).length ? encode(next) : null;
      transact(root, [{ path: lockPath(scope), before: recordBefore, bytes }], { signal: context.signal, lockHeld: true, beforeWrite: context.beforeKitRecord });
      pending = null;
      recordBefore = snapshot(root, lockPath(scope));
      completed.push(member.item.id);
      context.progress?.(`Recorded ${member.item.id}.`);
    }
    if (!Object.keys(next.items).length && scope === 'personal' && next.createdDirectories.includes('.loushing')) {
      try { rmdirSync(safePath(root, '.loushing')); } catch {}
    }
    return { status: 'ok', plan, completed, skipped: members.filter((m) => m.compatible || m.kept).map((m) => m.item.id), next: stacks.map((s) => s.next).join(' ') || 'Start a new chat to load the kit.' };
  } catch (error) {
    if (pending) {
      try {
        const undo = pending.flatMap((op) => {
          const now = snapshot(root, op.path);
          if ((now?.hash ?? null) === (op.before?.hash ?? null)) return [];
          if ((now?.hash ?? null) !== op.after) throw new CliError(`Recovery needed: ${op.path} changed outside the approved plan. Preserve the kit state and lockfile.`);
          return [{ path: op.path, before: now, bytes: op.bytes }];
        });
        if (undo.length) transact(root, undo, { lockHeld: true });
        const dirs = new Set(pending.filter((op) => !op.before).flatMap((op) => {
          const parts = op.path.split('/'), out = [];
          while (parts.length > 1) { parts.pop(); out.push(parts.join('/')); }
          return out;
        }));
        // Only directories absent before the member may be removed; other empty folders belong to the project.
        for (const dir of [...dirs].sort((a, b) => b.length - a.length)) {
          if (!pending.createdDirectories?.includes(dir)) continue;
          try { rmdirSync(safePath(root, dir)); } catch {}
        }
      } catch (recovery) { return { status: 'error', message: `${error.message} ${recovery.message}`, completed, recoveryRequired: true }; }
    }
    return { status: error.code === 2 ? 'needs-decision' : 'error', message: error.message, completed, resume: 'Resolve the failure and rerun the same command; completed members are recorded and skipped.', ...error.details };
  } finally {
    if (mutex) rmdirSync(safePath(root, '.loushing-transaction'));
    try { rmSync(work, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); } catch { leftovers.push(work); }
  }
}
