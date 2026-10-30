import { createHash } from 'node:crypto';
import { lstatSync, readFileSync } from 'node:fs';
import { isAbsolute, join, parse, relative, resolve, sep } from 'node:path';

export class CliError extends Error {
  constructor(message, code = 1, details = {}) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

export const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
export const own = (value, key) => Object.hasOwn(value, key);
export const validId = (id) => typeof id === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) && id.length <= 100;
export const validHash = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
export const validCommit = (value) => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
export const validVersion = (value) => typeof value === 'string' && /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(value);

export function portablePath(value) {
  if (typeof value !== 'string' || value.length > 1024 || !value || value.includes('\\') || isAbsolute(value)) {
    throw new CliError('Unsafe file path. Use relative paths with forward slashes.');
  }
  for (const part of value.split('/')) {
    if (!part || part === '.' || part === '..' || /[<>:"|?*\x00-\x1f\x7f]/.test(part) || /[. ]$/.test(part)
      || /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(part)) {
      throw new CliError(`Unsafe file path: ${value}. No files were changed.`);
    }
  }
  return value;
}

export function stat(path) {
  try { return lstatSync(path); } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

/** Check every ancestor, not just the leaf: junctions are links on Windows too. */
export function safePath(root, path = '') {
  root = resolve(root);
  const target = path ? resolve(root, ...portablePath(path).split('/')) : root;
  const rel = relative(root, target);
  if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) throw new CliError('The destination escapes its scope.');
  let current = parse(target).root;
  const parts = target.slice(current.length).split(sep).filter(Boolean);
  for (let i = 0; i < parts.length; i++) {
    current = join(current, parts[i]);
    const entry = stat(current);
    if (entry?.isSymbolicLink()) throw new CliError(`A symbolic link blocks ${current}. Choose a real folder.`);
    if (entry && i < parts.length - 1 && !entry.isDirectory()) throw new CliError(`A file blocks ${current}. Choose a folder.`);
  }
  return target;
}

export function snapshot(root, path) {
  const target = safePath(root, path);
  const entry = stat(target);
  if (!entry) return null;
  if (!entry.isFile() || entry.nlink > 1) throw new CliError(`Not a regular, unlinked file: ${path}. Nothing was changed.`);
  return { hash: hash(readFileSync(target)), mode: entry.mode };
}

export function sameSnapshot(a, b) {
  return a === null ? b === null : b !== null && a.hash === b.hash && a.mode === b.mode;
}

export function validateSource(source) {
  if (!source || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(source.repo ?? '')
    || !validCommit(source.commit)) throw new CliError('The item needs a GitHub repository and a full pinned commit.');
  portablePath(source.repo);
  portablePath(source.path);
}

export function validateManifest(item) {
  if (!validId(item.id) || !validVersion(item.version) || item.type !== 'skill') {
    throw new CliError('Only versioned skills can be installed by this CLI increment. Use the Git route for kits and stacks.');
  }
  validateSource(item.source);
  if (!Array.isArray(item.effects) || item.effects.some((effect) => !validId(effect))) throw new CliError('The item has no valid effects declaration.');
  if (!Array.isArray(item.files) || !item.files.length || item.files.length > 50) throw new CliError('A skill must contain 1–50 files.');
  const seen = new Set();
  let total = 0;
  for (const file of item.files) {
    portablePath(file.path);
    if (!validHash(file.sha256) || !Number.isSafeInteger(file.size) || file.size < 0) throw new CliError(`Missing hash or size for ${file.path}.`);
    const key = file.path.toLowerCase();
    if (seen.has(key)) throw new CliError(`Duplicate or case-colliding file: ${file.path}.`);
    seen.add(key);
    total += file.size;
  }
  for (const path of seen) {
    const parts = path.split('/');
    while (parts.length > 1) {
      parts.pop();
      if (seen.has(parts.join('/'))) throw new CliError('A file is also used as a folder.');
    }
  }
  if (!seen.has('skill.md') || !item.files.some((f) => f.path === 'SKILL.md') || total > 5 * 1024 * 1024) {
    throw new CliError('A skill needs SKILL.md and must stay within 5 MB.');
  }
}
