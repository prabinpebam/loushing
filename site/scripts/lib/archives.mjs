/**
 * Item downloads use only pinned Git blobs, never a working tree or GitHub's ZIP.
 * The manifest lists every payload byte; ZIP metadata is fixed for reproducibility.
 */
import { join } from 'node:path';
import { fileRole, git, readBlobs, sha256 } from './catalog.mjs';
import { scanText } from './publication.mjs';
import { safeArchivePath as safePath, selectPackageFiles } from './package-files.mjs';

class DownloadError extends Error {}

const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;

/** Uncompressed ZIP, UTF-8 paths, 1980-01-01, stable Unix permissions, no extras. */
export function deterministicZip(entries) {
  const local = [];
  const central = [];
  const seen = new Set();
  let offset = 0;
  for (const { path, bytes, mode = '100644' } of [...entries].sort((a, b) => compare(a.path, b.path))) {
    const identity = typeof path === 'string' ? path.normalize('NFC').toLowerCase() : '';
    if (!safePath(path) || seen.has(identity) || !['100644', '100755'].includes(mode)) throw new DownloadError('Unsafe or duplicate archive path or file mode');
    seen.add(identity);
    const name = Buffer.from(path);
    if (name.length > 65535 || bytes.length > 0xffffffff) throw new DownloadError('Archive exceeds ZIP32 limits');
    const crc = crc32(bytes);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0x800, 6);
    header.writeUInt16LE(33, 12);
    header.writeUInt32LE(crc, 14);
    header.writeUInt32LE(bytes.length, 18);
    header.writeUInt32LE(bytes.length, 22);
    header.writeUInt16LE(name.length, 26);
    local.push(header, name, bytes);
    const record = Buffer.alloc(46);
    record.writeUInt32LE(0x02014b50);
    record.writeUInt16LE(0x314, 4);
    header.copy(record, 6, 4, 30);
    record.writeUInt32LE((parseInt(mode, 8) * 65536) >>> 0, 38);
    record.writeUInt32LE(offset, 42);
    central.push(record, name);
    offset += header.length + name.length + bytes.length;
  }
  const directory = Buffer.concat(central);
  if (entries.length > 65535 || offset + directory.length > 0xffffffff) throw new DownloadError('Archive exceeds ZIP32 limits');
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, directory, end]);
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Screens the complete payload, including resources not displayed in source panels. */
export function checkPayload(files) {
  for (const file of files) {
    if (!file.bytes) throw new DownloadError('A pinned blob is missing');
    if (scanText(file.bytes.toString('utf8')).length) {
      throw new DownloadError('The pinned payload did not pass the publication check; review its source before enabling downloads');
    }
  }
}

/** Read pinned package roots, rejecting links, nested repositories and odd paths. */
function pinnedFiles(cwd, commit, prefix = '', packageFiles) {
  if (!/^[a-f0-9]{40}$/.test(commit ?? '')) throw new DownloadError('A full pinned commit is required');
  const tree = git(cwd, ['ls-tree', '-rzl', '--full-tree', commit], { buffer: true });
  let entries = tree.toString('utf8').split('\0').filter(Boolean).map((line) => {
    const match = /^(\d+) (\w+) [a-f0-9]+\s+(-|\d+)\t(.+)$/.exec(line);
    if (!match) throw new DownloadError('Unsupported Git tree entry');
    return { mode: match[1], type: match[2], size: Number(match[3]), sourcePath: match[4] };
  }).filter((f) => !prefix || f.sourcePath.startsWith(`${prefix}/`));
  entries = entries.map((f) => ({ ...f, path: prefix ? f.sourcePath.slice(prefix.length + 1) : f.sourcePath }));
  try { entries = selectPackageFiles(entries, packageFiles); }
  catch (error) { throw new DownloadError(error.message); }
  const blobs = readBlobs(cwd, commit, entries.map((f) => f.sourcePath));
  return entries.map((f) => ({ ...f, bytes: blobs.get(f.sourcePath) })).sort((a, b) => compare(a.path, b.path));
}

/**
 * Build all safe archives before any site output. A blocked kit has no local download;
 * local skill drift is fatal because its published file hashes would contradict Git.
 */
export function prepareArchives(catalog, { preview = false } = {}) {
  const artifacts = [];
  for (const item of catalog.items) {
    delete item.archive;
    delete item.archiveFiles;
    if (item.type === 'stack') continue;
    if (!item.source.commit) {
      item.archive = { blocked: 'A pinned commit is required before a download can be built' };
      continue;
    }
    try {
      const cwd = item.source.local ? catalog.root : checkoutFor(catalog.root, item.source.repo);
      // Skills retain their exact folder; kits may explicitly select complete package roots.
      if (item.packageFiles !== undefined && item.type !== 'kit') throw new DownloadError('packageFiles is only supported for kits');
      let files = pinnedFiles(cwd, item.source.commit, item.source.local || item.type === 'skill' ? item.source.path ?? '' : '', item.packageFiles);
      if (item.packageFiles !== undefined) {
        const included = new Set(files.map((file) => file.path));
        if (!included.has('LICENSE')) throw new DownloadError('The selected kit package must include its LICENSE');
        if ((item.parts ?? []).some((part) => part.files.some((file) => !included.has(file.path)))) throw new DownloadError('The selected kit package omits declared parts or their resources');
      }
      if (item.type === 'skill') {
        files = files.filter((f) => f.path !== 'about.md');
        const actual = files.map((f) => ({ path: f.path, size: f.bytes.length, sha256: sha256(f.bytes) }));
        const declared = item.files.map(({ path, size, sha256 }) => ({ path, size, sha256 })).sort((a, b) => compare(a.path, b.path));
        if (JSON.stringify(actual) !== JSON.stringify(declared)) throw new DownloadError('Skill files differ from the pinned commit; commit the reviewed skill before building downloads');
      }
      checkPayload(files);
      if (!safePath(item.id) || item.id.includes('/')) throw new DownloadError('Unsafe item id');
      const archive = deterministicZip(files.map((f) => ({ ...f, path: `${item.id}/${f.path}` })));
      const stem = `${item.id}-${item.source.commit}`;
      const manifest = {
        schemaVersion: 1, id: item.id, source: { repo: item.source.repo, commit: item.source.commit, path: item.source.path ?? null },
        root: `${item.id}/`, format: 'zip', size: archive.length, sha256: sha256(archive),
        files: files.map(({ path, bytes, mode }) => ({ path, size: bytes.length, sha256: sha256(bytes), mode })),
      };
      // Files outside the declared parts still need the published role and run flags; code counts as runnable.
      const described = (file) => ({ role: fileRole(file.path), runs: fileRole(file.path) === 'script' || file.mode === '100755' || /\.(mjs|cjs|js|py|sh|ps1)$/.test(file.path) });
      item.archiveFiles = manifest.files.map((file) => ({ ...described(file), ...(item.files ?? []).find((f) => f.path === file.path), ...file }));
      item.archive = { url: `/downloads/${stem}.zip`, manifest: `/downloads/${stem}.json`, sha256: manifest.sha256, size: manifest.size, root: manifest.root, files: manifest.files.length };
      artifacts.push({ path: item.archive.url.slice(1), bytes: archive }, { path: item.archive.manifest.slice(1), bytes: `${JSON.stringify(manifest, null, 2)}\n` });
    } catch (error) {
      delete item.archiveFiles;
      if (item.type === 'skill' && !preview) throw new Error(`${item.id}: ${error.message}`);
      item.archive = { blocked: error instanceof DownloadError ? error.message : 'This pinned download could not be built. Use Git instead.' };
    }
  }
  return artifacts;
}

function checkoutFor(root, repo) {
  const names = git(root, ['config', '-f', '.gitmodules', '--get-regexp', '^submodule\\..*\\.url$']).trim().split(/\r?\n/);
  const normalized = (s) => s.replace(/\.git$/, '').replace(/\/$/, '').toLowerCase();
  const row = names.find((line) => normalized(line.slice(line.indexOf(' ') + 1)) === normalized(repo));
  if (!row) throw new DownloadError('No pinned local repository is available');
  const key = row.slice(0, row.indexOf(' ')).replace(/\.url$/, '.path');
  return join(root, git(root, ['config', '-f', '.gitmodules', '--get', key]).trim());
}
