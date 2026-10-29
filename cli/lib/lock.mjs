import { readFileSync } from 'node:fs';
import { CliError, own, portablePath, safePath, snapshot, validId, validateManifest } from './safety.mjs';
import { allowedDestination, TARGETS } from './targets.mjs';
import { validateKitRecord } from './kits.mjs';

export const lockPath = (scope) => scope === 'personal' ? '.loushing/lock.json' : 'loushing.lock.json';

export function readLock(root, scope, catalog) {
  const path = lockPath(scope);
  const before = snapshot(root, path);
  if (!before) return { lock: { lockVersion: 1, catalog, items: {}, createdDirectories: [] }, before };
  let lock;
  try { lock = JSON.parse(readFileSync(safePath(root, path), 'utf8')); } catch { throw new CliError('The Loushing lockfile is not valid JSON. Restore it from version control.'); }
  if (lock.lockVersion !== 1 || typeof lock.catalog !== 'string' || !lock.items || Array.isArray(lock.items) || typeof lock.items !== 'object') {
    throw new CliError('Unsupported or invalid Loushing lockfile. No files were changed.');
  }
  const claimed = new Set();
  if (lock.stacks !== undefined && (!lock.stacks || typeof lock.stacks !== 'object' || Array.isArray(lock.stacks)
    || Object.entries(lock.stacks).some(([id, s]) => !validId(id) || !Array.isArray(s.members) || !s.members.length || s.members.some((m) => !validId(m) || m === id)))) throw new CliError('Invalid locked stack.');
  for (const [name, entry] of Object.entries(lock.items)) {
    if (entry.type === 'kit') {
      validateKitRecord(name, entry, scope);
      continue;
    }
    if (!validId(name) || !Array.isArray(entry.agents) || !entry.agents.length
      || entry.agents.some((a) => !own(TARGETS, a)) || !Array.isArray(entry.destinations) || !entry.destinations.length
      || !entry.files || typeof entry.files !== 'object' || Array.isArray(entry.files)) throw new CliError(`Invalid lock entry: ${name}.`);
    validateManifest({ ...entry, files: entry.manifest });
    if (entry.commit !== entry.source.commit || entry.scope !== scope) throw new CliError(`Invalid source or scope in lock entry: ${name}.`);
    const expected = new Map();
    for (const destination of entry.destinations) {
      if (!allowedDestination(destination, name, scope, entry.agents)) throw new CliError(`Unsafe locked destination: ${destination}.`);
      for (const file of entry.manifest) expected.set(`${destination}/${file.path}`, file.sha256);
    }
    if (entry.agents.some((agent) => !entry.destinations.some((destination) => allowedDestination(destination, name, scope, [agent])))) {
      throw new CliError(`A locked agent has no destination: ${name}.`);
    }
    if (Object.keys(entry.files).length !== expected.size) throw new CliError(`Incomplete file ownership in lock entry: ${name}.`);
    for (const [file, digest] of Object.entries(entry.files)) {
      portablePath(file);
      if (expected.get(file) !== digest || claimed.has(file.toLowerCase())) throw new CliError(`Invalid or shared locked file: ${file}.`);
      claimed.add(file.toLowerCase());
    }
  }
  if (!Array.isArray(lock.createdDirectories ?? [])) throw new CliError('Invalid directory ownership in lockfile.');
  const prefixes = ['.agents', '.github', '.claude', '.copilot', '.cursor', '.loushing'];
  for (const dir of lock.createdDirectories ?? []) {
    portablePath(dir);
    if (!prefixes.includes(dir.split('/')[0]) || !Object.values(lock.items).some((entry) => Object.keys(entry.files).some((file) => file.startsWith(`${dir}/`)))
      && !(scope === 'personal' && dir === '.loushing')) throw new CliError(`Invalid locked directory: ${dir}.`);
  }
  return { lock, before };
}
