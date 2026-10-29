import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const releaseVersion = (value) => typeof value === 'string' && /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[a-zA-Z-][a-zA-Z0-9-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][a-zA-Z0-9-]*))*)?$/.test(value);
export const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const portable = (path) => typeof path === 'string' && path.split('/').every((part) => /^[a-zA-Z0-9._-]+$/.test(part)
  && !['.', '..', '.git'].includes(part.toLowerCase()) && !/[. ]$/.test(part) && !/^(?:con|prn|aux|nul|com\d|lpt\d)(?:\.|$)/i.test(part));

/** Immutable local release artifacts. Nothing infers a release from Git dates. */
export function loadReleases(root) {
  const file = join(root, 'catalog', 'releases.json');
  if (!existsSync(file)) return { version: 1, channels: { stable: null, next: null }, releases: [] };
  const registry = JSON.parse(readFileSync(file, 'utf8'));
  if (registry.version !== 1 || !Array.isArray(registry.releases) || !registry.channels
    || Object.keys(registry.channels).some((channel) => !['stable', 'next'].includes(channel))) throw new Error('Invalid release registry.');
  const versions = new Set();
  const releases = registry.releases.map((record) => {
    if (!releaseVersion(record.version) || versions.has(record.version) || !/^[a-f0-9]{64}$/.test(record.sha256 ?? '')) throw new Error('Invalid or duplicate immutable release.');
    versions.add(record.version);
    const dir = join(root, 'catalog', 'releases', record.version);
    for (const path of [join(root, 'catalog'), join(root, 'catalog', 'releases'), dir, join(dir, 'manifest.json')]) {
      if (lstatSync(path).isSymbolicLink()) throw new Error('Release artifacts cannot contain links.');
    }
    const manifestBytes = readFileSync(join(dir, 'manifest.json'));
    if (digest(manifestBytes) !== record.sha256) throw new Error(`Release manifest changed: ${record.version}.`);
    const manifest = JSON.parse(manifestBytes);
    if (manifest.version !== record.version || manifest.manifestVersion !== 1 || !Number.isFinite(Date.parse(manifest.date))
      || !/^[a-f0-9]{40}$/.test(manifest.commit ?? '') || !Array.isArray(manifest.changes) || !manifest.files || Array.isArray(manifest.files)) throw new Error(`Invalid release manifest: ${record.version}.`);
    for (const [path, expected] of Object.entries(manifest.files)) {
      if (!portable(path) || !/^[a-f0-9]{64}$/.test(expected)) throw new Error(`Unsafe release artifact: ${record.version}.`);
      let current = dir;
      for (const segment of path.split('/')) {
        current = join(current, segment);
        if (lstatSync(current).isSymbolicLink()) throw new Error('Release artifacts cannot contain links.');
      }
      if (digest(readFileSync(current)) !== expected) throw new Error(`Release artifact changed: ${record.version}/${path}.`);
    }
    if (!manifest.files['catalog.json'] || !manifest.files['search-index.json']) throw new Error('Release is missing its catalog or search index.');
    const index = JSON.parse(readFileSync(join(dir, 'catalog.json'), 'utf8'));
    if (index.catalogVersion !== record.version || !Array.isArray(index.items) || index.visibility === 'private') throw new Error('Invalid or non-public release catalog.');
    for (const item of index.items) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id) || !manifest.files[`items/${item.id}.json`]) throw new Error(`Release is missing a valid item.`);
      const data = JSON.parse(readFileSync(join(dir, 'items', `${item.id}.json`), 'utf8'));
      if (data.visibility === 'private' || data.id !== item.id || data.type !== item.type || (data.version ?? null) !== (item.version ?? null)
        || ['commit', 'path', 'repo'].some((key) => (data.source?.[key] ?? null) !== (item.source?.[key] ?? null))) throw new Error(`Release item metadata disagrees: ${item.id}.`);
    }
    for (const change of manifest.changes) {
      const known = change.kind === 'removed' ? Object.hasOwn(index.removed ?? {}, change.id) : index.items.some((item) => item.id === change.id);
      if (!known || !['added', 'updated', 'pinned', 'removed'].includes(change.kind)
        || typeof change.line !== 'string' || !change.line.trim()) throw new Error('Invalid release change.');
    }
    return { ...manifest, dir, index, sha256: record.sha256 };
  });
  for (const channel of ['stable', 'next']) {
    const version = registry.channels[channel];
    if (version !== null && !versions.has(version)) throw new Error(`Unknown ${channel} release.`);
    if (channel === 'stable' && version?.includes('-')) throw new Error('Stable cannot select a prerelease.');
  }
  return { version: 1, channels: registry.channels, releases };
}

export function publishedVersions(item, registry) {
  const versions = {};
  const channels = {};
  for (const release of registry?.releases ?? []) {
    const entry = release.index.items.find((candidate) => candidate.id === item.id);
    if (!entry) continue;
    const selection = { version: entry.version ?? null, source: entry.source, data: `releases/${release.version}/items/${item.id}.json` };
    if (entry.version) {
      if (versions[entry.version] && JSON.stringify(versions[entry.version].source) !== JSON.stringify(selection.source)) throw new Error(`Item version was reused with a different source: ${item.id}@${entry.version}.`);
      versions[entry.version] ??= selection;
    }
    for (const [channel, selected] of Object.entries(registry.channels)) if (selected === release.version) channels[channel] = selection;
  }
  return Object.keys(versions).length || Object.keys(channels).length ? { ...(Object.keys(versions).length ? { versions } : {}), channels } : {};
}

export function verifyPinnedFiles(item, checkout) {
  const files = item.type === 'skill' ? item.files : item.install?.contract?.files ?? [];
  for (const file of files) {
    const path = item.type === 'skill' ? `${item.source.path}/${file.path}` : file.path;
    if (!portable(path)) throw new Error(`Unsafe source path: ${item.id}.`);
    const listing = execFileSync('git', ['ls-tree', '-z', item.source.commit, '--', path], { cwd: checkout, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    if (!/^100(?:644|755) blob [a-f0-9]{40}\t/.test(listing) || listing.split('\0').filter(Boolean).length !== 1) throw new Error(`Not a regular pinned Git file: ${item.id}/${file.path}.`);
    const bytes = execFileSync('git', ['show', `${item.source.commit}:${path}`], { cwd: checkout, maxBuffer: 8 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
    if (bytes.length !== file.size || digest(bytes) !== file.sha256) throw new Error(`Pinned Git content differs: ${item.id}/${file.path}. No release was written.`);
  }
}
