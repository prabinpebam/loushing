import { homedir } from 'node:os';
import { readFileSync, rmdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { search } from '../../site/src/lib/search.mjs';
import { loadCatalog } from '../../site/scripts/lib/catalog.mjs';
import { Catalog, DEFAULT_CATALOG } from './catalog.mjs';
import { CliError, own, safePath, snapshot, stat, validId, validVersion, validateManifest } from './safety.mjs';
import { allowedDestination, destinations, detectedAgents, TARGETS } from './targets.mjs';
import { lockPath, readLock } from './lock.mjs';
import { backupOperation, transact } from './transaction.mjs';
import { runKits, kitUpdateAvailable } from './kits.mjs';

export const VERSION = '0.0.1';
const COMMANDS = ['add', 'find', 'info', 'list', 'outdated', 'update', 'remove', 'install', 'check'];
const VALUES = new Set(['agent', 'scope', 'catalog', 'source-root', 'conflict', 'as', 'version', 'channel', 'dev-kits', 'kit-cache', 'trust-source', 'approve-plan']);
const BOOLEANS = new Set(['json', 'yes', 'dry-run', 'personal', 'help', 'refresh', 'no-cache']);
export const HELP = `Loushing ${VERSION} (local preview; not published)

  add <id…>       Install versioned skills, contract kits or stacks
  find <task>     Search with the site's ranking
  info <id>       Read the card, files, effects and plan
  list           List this scope's locked installs
  outdated       Show available skill and kit updates
  update [id…]   Update items, protecting local edits
  remove <id…>   Remove only recorded files
  install        Restore pinned files from the lockfile
  check [path]   Run catalog and publication checks

Flags: --agent <${Object.keys(TARGETS).join('|')}> (repeatable)
       --scope project|personal, --personal, --yes, --dry-run, --json
       --conflict keep|replace, --as <local-name>, --version <version>
       --channel stable|next, --catalog <catalog.json URL or file>
       --source-root <local Git checkout> (offline pinned Git objects)
       --dev-kits <local manifest> (explicit uncommitted-source testing only)
       --kit-cache <existing disposable folder outside the destination>
       --trust-source <digest>, --approve-plan <digest>
       --refresh (ignore cached metadata), --no-cache (no cache reads or writes)

--yes approves effects, never replacement of changed files.
Review --dry-run first. Kit code needs source trust and exact target-plan consent.
Current public kit pins still use manual Git routes; contracts are unreleased.
`;

export function parse(argv) {
  const options = { agents: [], scope: 'project', channel: 'stable', ids: [] };
  if (argv.includes('--version') && argv.every((arg) => ['--version', '--json', '--yes'].includes(arg))) return { command: 'version' };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      if (BOOLEANS.has(key)) options[key] = true;
      else if (VALUES.has(key)) {
        const value = argv[++i];
        if (!value || value.startsWith('--')) throw new CliError(`Missing value for --${key}.`);
        if (key === 'agent') options.agents.push(value);
        else options[key] = value;
      } else throw new CliError(`Unknown flag: ${arg}. Run --help.`);
    } else if (arg.startsWith('-')) throw new CliError(`Unknown flag: ${arg}. Run --help.`);
    else if (!options.command) options.command = arg;
    else options.ids.push(arg);
  }
  if (options.personal) options.scope = 'personal';
  if (options.help || !options.command) options.command = 'help';
  if (!['help', 'version', ...COMMANDS].includes(options.command)) throw new CliError(`Unknown command: ${options.command}. Run --help.`);
  if (!['project', 'personal'].includes(options.scope)) throw new CliError('Scope must be project or personal.');
  if (!['stable', 'next'].includes(options.channel)) throw new CliError('Channel must be stable or next.');
  if (options.conflict && !['keep', 'replace'].includes(options.conflict)) throw new CliError('Choose --conflict keep or --conflict replace.');
  if (options.as && (!validId(options.as) || options.command !== 'add' || options.ids.length !== 1)) throw new CliError('--as needs one skill and a valid local name.');
  if (options.agents.some((agent) => !own(TARGETS, agent))) throw new CliError(`Choose an agent: ${Object.keys(TARGETS).join(', ')}.`);
  if (options.agents.length && ['install', 'update', 'check'].includes(options.command)) throw new CliError(`${options.command} does not accept --agent. Use add to choose a new install target.`);
  if (options.version && !['add', 'info'].includes(options.command)) throw new CliError('--version selects a release for add or info; install restores the lockfile exactly.');
  if (options.version && (!validVersion(options.version) || options.channel !== 'stable')) throw new CliError('Choose a SemVer --version or --channel next, not both.');
  options.agents = [...new Set(options.agents)];
  return options;
}

const ok = (details = {}) => ({ status: 'ok', ...details });
const decision = (details) => ({ status: 'needs-decision', ...details });
const effectDecision = (effects) => ({ id: 'approve-effects', question: `Install skills declaring ${effects.join(', ')}?`, options: ['approve', 'cancel'], flag: '--yes' });
const conflictDecision = (files) => ({ id: 'changed-files', question: `Keep or replace ${files.length} changed or unowned files? Replacement saves a versioned backup.`, options: ['keep', 'replace', 'cancel'], flag: '--conflict', files });

export async function run(argv, context = {}) {
  try {
    return await execute(parse(argv), context);
  } catch (error) {
    return { status: error.code === 2 ? 'needs-decision' : 'error', message: error.name === 'AbortError' ? 'Cancelled. No install was committed.' : error.message, ...error.details };
  }
}

async function execute(options, context) {
  const { command, ids, scope } = options;
  const cwd = resolve(context.cwd ?? process.cwd());
  const root = scope === 'personal' ? resolve(context.home ?? homedir()) : cwd;
  if (command === 'help') return ok({ help: HELP });
  if (command === 'version') return ok({ version: VERSION });
  if (['add', 'remove', 'info', 'find'].includes(command) && !ids.length) throw new CliError(`${command} needs ${command === 'find' ? 'a task phrase' : 'an item ID'}.`);
  if (['info', 'check'].includes(command) && ids.length > 1) throw new CliError(`${command} accepts one ${command === 'info' ? 'ID' : 'path'}.`);
  if (['list', 'outdated', 'install'].includes(command) && ids.length) throw new CliError(`${command} does not accept item IDs.`);
  if (command === 'check') {
    const checked = loadCatalog(resolve(cwd, ids[0] ?? '.'));
    return { status: checked.problems.length ? 'error' : 'ok', items: checked.items.length, problems: checked.problems };
  }
  const location = options.catalog ?? DEFAULT_CATALOG;
  const catalogOptions = {
    signal: context.signal, sourceRoot: options['source-root'], progress: context.progress, env: context.env,
    dryRun: options['dry-run'], noCache: options['no-cache'], refresh: options.refresh,
    cacheRoot: resolve(context.home ?? homedir(), '.cache', 'loushing', 'metadata-v1'),
    cacheScope: resolve(context.home ?? homedir()),
  };
  let catalog = context.catalog ?? new Catalog(location, catalogOptions);
  if (command === 'find') {
    context.progress?.('Searching the catalog…');
    const agentIds = options.agents.flatMap((agent) => agent === 'copilot' ? ['copilot-vscode', 'copilot-cli'] : [agent]);
    const ranked = search(await catalog.searchIndex(), ids.join(' '), { agent: agentIds }).results;
    const candidates = await Promise.all(ranked.slice(0, 20).map(async (doc) => {
      const id = doc.type === 'part' ? doc.id.split('/')[0] : doc.id;
      const item = await catalog.item(id);
      return { ...doc, install: item.install, source: item.source, version: item.version };
    }));
    return ok({ query: ids.join(' '), results: candidates });
  }
  if (command === 'info') {
    const item = await catalog.item(ids[0], options);
    const plan = item.type === 'skill' && options.agents.length ? {
      scope, root, destinations: destinations(options.agents, scope, root, item.id),
      writes: destinations(options.agents, scope, root, item.id).flatMap((folder) => item.files.map((file) => `${folder}/${file.path}`)),
      effects: item.effects, record: lockPath(scope),
    } : undefined;
    return ok({ item, ...(plan ? { plan } : {}) });
  }
  safePath(root);
  const { lock, before: lockBefore } = readLock(root, scope, catalog.url.href);
  if (command === 'list') return ok({ scope, items: Object.entries(lock.items).filter(([, item]) => !options.agents.length || item.agents.some((agent) => options.agents.includes(agent))).map(([name, item]) => ({ name, ...item })), stacks: lock.stacks ?? {} });
  if (!options.catalog && !context.catalog) catalog = new Catalog(lock.catalog, catalogOptions);
  if (Object.keys(lock.items).length && options.catalog && catalog.url.href !== lock.catalog && ['add', 'update', 'install', 'outdated'].includes(command)) {
    throw new CliError('This lockfile belongs to another catalog. Keep one catalog per scope until multiple sources are supported.');
  }
  if (command === 'outdated') {
    const results = [];
    for (const [name, installed] of Object.entries(lock.items)) {
      if (options.agents.length && !installed.agents.some((agent) => options.agents.includes(agent))) continue;
      const latest = await catalog.item(installed.id, options);
      if (installed.type === 'kit') {
        const developmentUpdate = kitUpdateAvailable(name, installed, latest, options);
        if (developmentUpdate !== undefined) { if (developmentUpdate) results.push(developmentUpdate); continue; }
      }
      if (latest.version !== installed.version || latest.source.commit !== installed.commit) {
        results.push({ name, installed: installed.version, available: latest.version, commit: latest.source.commit, changes: latest.changes ?? [] });
      }
    }
    return ok({ items: results });
  }
  if (command === 'add' && !options.agents.length) {
    return decision({ decisions: [{ id: 'choose-agent', question: 'Which agent should use these skills?', options: Object.keys(TARGETS), detected: detectedAgents(cwd), flag: '--agent' }] });
  }
  const selected = context.onlyItems ?? [...new Set(command === 'install' || command === 'update' && !ids.length ? Object.keys(lock.items) : ids)];
  for (const id of selected) if (!validId(id)) throw new CliError(`Invalid item ID: ${id}.`);
  if (!selected.length) return ok({ message: 'Nothing to do.', scope });
  let hasKits = false;
  for (const id of selected) {
    const type = ['install', 'remove'].includes(command) ? lock.items[id]?.type ?? (own(lock.stacks ?? {}, id) ? 'stack' : undefined) : (await catalog.item(lock.items[id]?.id ?? id, options)).type;
    if (type === 'kit' || type === 'stack') hasKits = true;
  }
  if (hasKits) return runKits({ options, context, root, scope, catalog, lock, lockBefore, selected, executeSkills: run });
  const entries = [];
  for (const requested of selected) {
    const old = own(lock.items, requested) ? lock.items[requested] : null;
    if (command !== 'add' && !old) throw new CliError(`Not installed: ${requested}. Run list to see installed items.`);
    if (command === 'remove') {
      const agents = options.agents.length ? old.agents.filter((agent) => !options.agents.includes(agent)) : [];
      const folders = old.destinations.filter((folder) => allowedDestination(folder, requested, scope, agents));
      entries.push(agents.length ? {
        name: requested, old, item: { ...old, files: old.manifest }, agents, folders,
        files: Object.fromEntries(Object.entries(old.files).filter(([path]) => folders.some((folder) => path.startsWith(`${folder}/`)))),
      } : { name: requested, old, item: null, files: {} });
      continue;
    }
    const item = command === 'install' ? { ...old, files: old.manifest }
      : await catalog.item(old?.id ?? requested, { version: options.version, channel: options.channel });
    validateManifest(item);
    const name = options.as ?? (old ? requested : item.id);
    const previous = own(lock.items, name) ? lock.items[name] : null;
    // The entry being updated may follow a catalog alias to a new ID; only another item's local name is a clash.
    if (previous && previous !== old && previous.id !== item.id) throw new CliError(`The local name ${name} already belongs to ${previous.id}. Choose another --as name.`);
    const agents = [...new Set([...(previous?.agents ?? []), ...options.agents])];
    const folders = command === 'install' || command === 'update' && !options.agents.length
      ? previous.destinations
      : [...new Set([...(previous?.destinations ?? []), ...destinations(agents, scope, root, name)])];
    const files = Object.fromEntries(folders.flatMap((folder) => item.files.map((file) => [`${folder}/${file.path}`, file.sha256])));
    entries.push({ name, old: previous, item, agents, folders, files });
  }
  if (new Set(entries.map((entry) => entry.name)).size !== entries.length) throw new CliError('Several requested IDs resolve to the same installed name. Request it once.');
  const plan = { scope, root, writes: [], deletes: [], backups: [], record: lockPath(scope), effects: [], conflicts: [], items: [] };
  const next = structuredClone(lock);
  const work = [];
  const occupied = new Map(Object.entries(lock.items).flatMap(([name, item]) => Object.keys(item.files).map((path) => [path.toLowerCase(), name])));
  for (const entry of entries) {
    const paths = [...new Set([...Object.keys(entry.old?.files ?? {}), ...Object.keys(entry.files)])];
    const changes = [];
    for (const path of paths) {
      if (occupied.has(path.toLowerCase()) && occupied.get(path.toLowerCase()) !== entry.name) throw new CliError(`Another item owns ${path}.`);
      occupied.set(path.toLowerCase(), entry.name);
      const before = snapshot(root, path);
      const desired = entry.files[path];
      const owned = entry.old && own(entry.old.files, path);
      if (desired === before?.hash && owned || !desired && !before) continue;
      const changed = !!before && (!entry.old || entry.old.files[path] !== before.hash);
      changes.push({ path, before, desired, changed });
    }
    const conflicts = changes.filter((change) => change.changed).map((change) => change.path);
    const skip = conflicts.length && options.conflict === 'keep';
    plan.items.push({ id: entry.item?.id ?? entry.old.id, name: entry.name, version: entry.item?.version ?? entry.old.version, agents: entry.agents ?? entry.old.agents, destinations: entry.folders ?? entry.old.destinations, skipped: !!skip });
    if (skip) continue;
    plan.conflicts.push(...conflicts);
    plan.backups.push(...conflicts.map((path) => `${path}.loushing-${entry.old?.version ?? 'untracked'}`));
    plan.writes.push(...changes.filter((change) => change.desired).map((change) => change.path));
    plan.deletes.push(...changes.filter((change) => !change.desired).map((change) => change.path));
    if (entry.item) {
      plan.effects.push(...entry.item.effects);
      next.items[entry.name] = {
        id: entry.item.id, type: 'skill', version: entry.item.version, commit: entry.item.source.commit,
        source: entry.item.source, agents: entry.agents, scope, destinations: entry.folders,
        effects: entry.item.effects, manifest: entry.item.files.map(({ path, size, sha256 }) => ({ path, size, sha256 })),
        files: entry.files,
      };
    } else delete next.items[entry.name];
    work.push({ ...entry, changes });
  }
  plan.effects = [...new Set(plan.effects)];
  const decisions = [];
  if (plan.effects.length && !options.yes && command !== 'remove') decisions.push(effectDecision(plan.effects));
  if (plan.conflicts.length && !options.conflict) decisions.push(conflictDecision(plan.conflicts));
  if (options['dry-run']) return ok({ dryRun: true, plan, decisions });
  if (decisions.length) return decision({ plan, decisions });
  if (context.signal?.aborted) throw new CliError('Cancelled. No files were changed.');
  context.progress?.(`Plan: ${JSON.stringify(plan)}`);
  const operations = [];
  for (const entry of work) {
    const downloaded = entry.item && entry.changes.some((change) => change.desired) ? await catalog.files(entry.item) : null;
    for (const change of entry.changes) {
      if (change.changed) operations.push(backupOperation(root, change.path, entry.old?.version ?? 'untracked'));
      const sourceFile = change.desired ? entry.item.files.find((file) => entry.folders.some((folder) => `${folder}/${file.path}` === change.path)) : null;
      operations.push({ path: change.path, before: change.before, bytes: sourceFile ? downloaded.get(sourceFile.path) : null });
    }
  }
  const ownedDirs = new Set(lock.createdDirectories ?? []);
  const recordParents = (path) => {
    const parts = path.split('/');
    while (parts.length > 1) {
      parts.pop();
      const dir = parts.join('/');
      if (!stat(safePath(root, dir))) ownedDirs.add(dir);
    }
  };
  for (const operation of operations) if (operation.bytes !== null) recordParents(operation.path);
  if (Object.keys(next.items).length) recordParents(lockPath(scope));
  const liveFiles = Object.values(next.items).flatMap((entry) => Object.keys(entry.files));
  const removableDirs = [...ownedDirs].filter((dir) => !liveFiles.some((file) => file.startsWith(`${dir}/`)) && !(scope === 'personal' && dir === '.loushing' && liveFiles.length));
  next.createdDirectories = [...ownedDirs].filter((dir) => !removableDirs.includes(dir)).sort();
  const bytes = Object.keys(next.items).length ? Buffer.from(`${JSON.stringify(next, null, 2)}\n`) : null;
  const original = lockBefore ? readFileSync(safePath(root, lockPath(scope))) : null;
  if (operations.length || (bytes ? !original?.equals(bytes) : original !== null)) operations.push({ path: lockPath(scope), before: lockBefore, bytes });
  if (!operations.length) return ok({ message: plan.items.some((i) => i.skipped) ? 'Kept your files unchanged.' : 'Already up to date.', plan });
  const unique = new Set();
  for (const operation of operations) {
    const key = operation.path.toLowerCase();
    if (unique.has(key)) throw new CliError(`Overlapping write or backup: ${operation.path}. Nothing was changed.`);
    unique.add(key);
  }
  context.progress?.(`Committing ${operations.length} file changes…`);
  transact(root, operations, { signal: context.signal, beforeWrite: context.beforeWrite, lockHeld: context.transactionLockHeld });
  for (const dir of removableDirs.sort((a, b) => b.length - a.length)) {
    try { rmdirSync(safePath(root, dir)); } catch (error) {
      if (!['ENOENT', 'ENOTEMPTY', 'EEXIST'].includes(error.code)) context.progress?.(`Kept folder ${dir}; remove it by hand if it is empty.`);
    }
  }
  return ok({ plan, written: operations.filter((o) => o.bytes !== null).map((o) => o.path), removed: operations.filter((o) => o.bytes === null).map((o) => o.path), next: command === 'remove' ? 'Start a new chat to refresh the agent’s skills.' : 'Start a new chat in your chosen agent to use the skills.' });
}
