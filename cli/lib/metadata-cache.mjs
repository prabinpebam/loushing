import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { CliError, hash, safePath, stat } from './safety.mjs';

export const PUBLIC_CATALOG = 'https://prabinpebam.github.io/loushing/catalog.json';
export const CACHE_TTL = 10 * 60 * 1000;

/** Only unauthenticated metadata from the one public catalog may persist. */
export class MetadataCache {
  constructor(root, { now = Date.now, enabled = true, refresh = false } = {}) {
    this.root = root;
    this.now = now;
    this.enabled = enabled;
    this.refresh = refresh;
  }
  eligible(url) {
    const base = new URL('.', PUBLIC_CATALOG);
    return this.enabled && !!this.root && url.href.startsWith(base.href)
      && !url.search && !url.hash && !url.username && !url.password;
  }
  path(url) { return safePath(this.root, `${hash(url.href)}.json`); }
  get(url) {
    if (!this.eligible(url) || this.refresh) return null;
    try {
      const path = this.path(url);
      const info = stat(path);
      if (!info) return null;
      if (!info.isFile() || info.nlink > 1 || info.size > 7 * 1024 * 1024) throw new Error();
      const cached = JSON.parse(readFileSync(path, 'utf8'));
      if (cached.cacheVersion !== 1 || cached.url !== url.href || !Number.isFinite(cached.savedAt)
        || cached.savedAt > this.now() || this.now() - cached.savedAt >= CACHE_TTL) return null;
      if (!cached.data || cached.data.visibility === 'private') throw new Error();
      return cached.data;
    } catch { throw new CliError('Could not read the public metadata cache. Retry with --refresh or --no-cache.'); }
  }
  set(url, data) {
    if (!this.eligible(url) || data?.visibility === 'private') return;
    let staging;
    try {
      safePath(this.root);
      mkdirSync(this.root, { recursive: true, mode: 0o700 });
      const target = this.path(url);
      const existing = stat(target);
      if (existing && (!existing.isFile() || existing.nlink > 1)) throw new Error();
      staging = safePath(this.root, `${hash(url.href)}-${randomUUID()}.pending`);
      writeFileSync(staging, JSON.stringify({ cacheVersion: 1, url: url.href, savedAt: this.now(), data }), { flag: 'wx', mode: 0o600 });
      safePath(this.root);
      renameSync(staging, this.path(url));
      staging = undefined;
    } catch { throw new CliError('Could not save the public metadata cache. Retry with --no-cache.'); }
    finally { if (staging) rmSync(staging, { force: true }); }
  }
}
