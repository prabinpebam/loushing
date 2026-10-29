import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { download } from './network.mjs';
import { lifecycleProblems } from '../../site/src/lib/lifecycle.mjs';
import { MetadataCache, PUBLIC_CATALOG } from './metadata-cache.mjs';
import { CliError, hash, own, portablePath, safePath, validateManifest, validId } from './safety.mjs';

export const DEFAULT_CATALOG = PUBLIC_CATALOG;

export class Catalog {
  constructor(location = DEFAULT_CATALOG, options = {}) {
    this.url = /^[a-z]+:\/\//i.test(location) ? new URL(location) : pathToFileURL(resolve(location));
    if (!['https:', 'file:'].includes(this.url.protocol)
      && !(this.url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(this.url.hostname))) {
      throw new CliError('The catalog must use HTTPS, a local file, or loopback HTTP.');
    }
    if (this.url.username || this.url.password || this.url.hash || this.url.search) throw new CliError('Do not put credentials or query parameters in the catalog URL.');
    this.options = options;
    this.cache = new Map();
    this.metadataCache = new MetadataCache(options.cacheRoot ?? resolve(homedir(), '.cache', 'loushing', 'metadata-v1'), {
      enabled: this.url.href === DEFAULT_CATALOG && !options.dryRun && !options.noCache,
      refresh: options.refresh, now: options.now,
    });
  }

  async read(url) {
    if (url.username || url.password || url.search || url.hash) throw new CliError('Catalog metadata URLs cannot contain credentials, query parameters or fragments.');
    if (this.cache.has(url.href)) return this.cache.get(url.href);
    const cached = this.metadataCache.get(url);
    if (cached) {
      this.options.progress?.('Using public catalog metadata cached for up to 10 minutes; --refresh checks again.');
      this.cache.set(url.href, cached);
      return cached;
    }
    let bytes;
    if (this.url.protocol === 'file:' && url.protocol === 'file:') {
      const base = dirname(fileURLToPath(this.url));
      const target = fileURLToPath(url);
      const relativeUrl = new URL('.', this.url);
      if (!url.href.startsWith(relativeUrl.href)) throw new CliError('Catalog metadata escaped its folder.');
      safePath(base, decodeURIComponent(url.href.slice(relativeUrl.href.length)));
      bytes = readFileSync(target);
      if (bytes.length > 6 * 1024 * 1024) throw new CliError('Catalog metadata exceeds the size limit.');
    } else {
      bytes = await download(url, { ...this.options, allow: (candidate) => candidate.origin === this.url.origin && candidate.protocol === this.url.protocol });
    }
    let data;
    try { data = JSON.parse(bytes.toString('utf8')); } catch { throw new CliError('The catalog returned invalid JSON. No files were changed.'); }
    this.metadataCache.set(url, data);
    this.cache.set(url.href, data);
    return data;
  }

  async index() {
    const index = await this.read(this.url);
    if (!index || !Array.isArray(index.items) || index.items.some((i) => !i || !validId(i.id)) || new Set(index.items.map((i) => i.id)).size !== index.items.length) {
      throw new CliError('The catalog index has invalid or duplicate item IDs.');
    }
    const problems = lifecycleProblems({ version: 1, aliases: index.aliases ?? {}, removed: index.removed ?? {} }, index.items);
    if (problems.length) throw new CliError(problems.join(' '));
    if (index.visibility === 'private' && this.url.protocol !== 'file:') throw new CliError('Private catalogs currently require an explicit local file. Network authentication policy is not implemented.');
    return index;
  }

  async item(requested, { version, channel = 'stable' } = {}) {
    if (!validId(requested)) throw new CliError(`Invalid item ID: ${requested}.`);
    const index = await this.index();
    let id = requested;
    const followed = new Set();
    while (own(index.aliases ?? {}, id)) {
      if (followed.has(id)) throw new CliError('The catalog contains an alias cycle.');
      followed.add(id);
      id = index.aliases[id];
      if (!validId(id)) throw new CliError('The catalog contains an invalid alias.');
    }
    if (own(index.removed ?? {}, id)) {
      const removed = index.removed[id];
      throw new CliError(`Removed item ${id}: ${removed.reason ?? 'No longer available'}.${removed.instead ? ` Try ${removed.instead}.` : ''}`);
    }
    const entry = index.items.find((i) => i.id === id);
    if (!entry) throw new CliError(`Unknown item: ${id}. Run find to search the catalog.`);
    let selected = entry.channels ? entry.channels.stable : entry;
    if (version) selected = entry.versions?.[version] ?? (!entry.versions && version === entry.version ? entry : undefined);
    else if (channel !== 'stable') selected = entry.channels?.[channel];
    if (!selected || typeof selected !== 'object') throw new CliError(`No published ${version ?? channel} version of ${id}.`);
    const dataUrl = new URL(this.url.protocol === 'file:' && selected === entry ? `items/${id}.json` : selected.data ?? `items/${id}.json`, this.url);
    const item = await this.read(dataUrl);
    if (!item || item.id !== id || item.type !== entry.type || (item.version ?? null) !== (selected.version ?? version ?? entry.version ?? null)
      || ['commit', 'repo', 'path'].some((key) => (item.source?.[key] ?? null) !== (selected.source?.[key] ?? null))) throw new CliError(`The catalog and item metadata disagree for ${id}. Retry with --refresh after the release completes.`);
    return item;
  }

  async searchIndex() {
    const data = await this.read(new URL('search-index.json', this.url));
    if (!data || !Array.isArray(data.docs) || data.docs.some((doc) => !doc?.f)) throw new CliError('The search index is invalid.');
    return data.docs;
  }

  async files(item) {
    validateManifest(item);
    const result = new Map();
    for (const file of item.files) {
      this.options.signal?.throwIfAborted();
      this.options.progress?.(`Verifying ${item.id}/${file.path}…`);
      const sourcePath = `${portablePath(item.source.path)}/${portablePath(file.path)}`;
      let bytes;
      if (this.options.sourceRoot) {
        const cwd = resolve(this.options.sourceRoot);
        const listing = execFileSync('git', ['ls-tree', '-z', item.source.commit, '--', sourcePath], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
        if (!/^100(644|755) blob [a-f0-9]{40}\t/.test(listing) || listing.split('\0').filter(Boolean).length !== 1) {
          throw new CliError(`The pinned source is not a regular Git file: ${sourcePath}.`);
        }
        bytes = execFileSync('git', ['show', `${item.source.commit}:${sourcePath}`], { cwd, maxBuffer: 6 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
      } else {
        const encoded = sourcePath.split('/').map(encodeURIComponent).join('/');
        const url = `https://raw.githubusercontent.com/${item.source.repo}/${item.source.commit}/${encoded}`;
        bytes = await download(url, { ...this.options, limit: 5 * 1024 * 1024, allow: (candidate) => candidate.protocol === 'https:' && candidate.hostname === 'raw.githubusercontent.com' });
      }
      if (bytes.length !== file.size || hash(bytes) !== file.sha256) throw new CliError(`Hash or size mismatch for ${item.id}/${file.path}. No files were changed.`);
      result.set(file.path, bytes);
    }
    return result;
  }
}
