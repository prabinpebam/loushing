import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CACHE_TTL, MetadataCache, PUBLIC_CATALOG } from '../lib/metadata-cache.mjs';
import { Catalog } from '../lib/catalog.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const work = join(root, '.agent-orchestration', 'metadata-cache-tests');
mkdirSync(work, { recursive: true });
function fixture(t) {
  const dir = mkdtempSync(join(work, 'case-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}
test('public metadata persists across instances for exactly 10 minutes, then expires', (t) => {
  const dir = fixture(t), url = new URL(PUBLIC_CATALOG);
  let now = 100;
  new MetadataCache(dir, { now: () => now }).set(url, { items: [] });
  const second = new MetadataCache(dir, { now: () => now });
  assert.deepEqual(second.get(url), { items: [] });
  now += CACHE_TTL - 1;
  assert.deepEqual(second.get(url), { items: [] });
  now++;
  assert.equal(second.get(url), null);
});
test('refresh bypasses old metadata; no-cache and dry-run never write', (t) => {
  const dir = fixture(t), url = new URL(PUBLIC_CATALOG);
  const cache = new MetadataCache(dir);
  cache.set(url, { items: [] });
  const refresh = new MetadataCache(dir, { refresh: true });
  assert.equal(refresh.get(url), null);
  refresh.set(url, { items: [{ id: 'new' }] });
  assert.equal(cache.get(url).items[0].id, 'new');
  const empty = fixture(t);
  for (const options of [{ dryRun: true }, { noCache: true }]) {
    const catalog = new Catalog(PUBLIC_CATALOG, { ...options, cacheRoot: empty });
    catalog.metadataCache.set(url, { items: [] });
    assert.equal(catalog.metadataCache.get(url), null);
  }
  assert.deepEqual(readdirSync(empty), []);
});
test('private, local, alternate and credential-bearing sources cannot enter persistent storage', (t) => {
  const dir = fixture(t), cache = new MetadataCache(dir);
  for (const location of ['file:///C:/synthetic/catalog.json', 'https://example.invalid/catalog.json', `${PUBLIC_CATALOG}?token=synthetic`, 'https://prabinpebam.github.io/other/catalog.json']) {
    cache.set(new URL(location), { items: [] });
    assert.equal(cache.get(new URL(location)), null);
  }
  cache.set(new URL(PUBLIC_CATALOG), { visibility: 'private', items: [{ id: 'secret-fixture' }] });
  const local = new Catalog(join(dir, 'catalog.json'), { cacheRoot: dir });
  local.metadataCache.set(new URL(PUBLIC_CATALOG), { items: [] });
  assert.deepEqual(readdirSync(dir), []);
});
test('cache corruption is explicit, never stale fallback; refresh repairs it', (t) => {
  const dir = fixture(t), cache = new MetadataCache(dir), url = new URL(PUBLIC_CATALOG);
  cache.set(url, { items: [] });
  writeFileSync(cache.path(url), '{');
  assert.throws(() => cache.get(url), /--refresh or --no-cache/);
  new MetadataCache(dir, { refresh: true }).set(url, { items: [] });
  assert.deepEqual(cache.get(url), { items: [] });
  assert.equal(readdirSync(dir).filter((file) => file.endsWith('.pending')).length, 0);
});
test('a home reached through a linked parent keeps its cache; a linked folder between home and the cache is refused', (t) => {
  const dir = fixture(t), url = new URL(PUBLIC_CATALOG);
  const link = (target, path) => symlinkSync(target, path, process.platform === 'win32' ? 'junction' : 'dir');
  const real = join(dir, 'real'), outside = join(dir, 'outside');
  mkdirSync(join(real, 'home'), { recursive: true });
  mkdirSync(outside);
  link(real, join(dir, 'via'));
  const home = join(dir, 'via', 'home');
  const cache = () => new MetadataCache(join(home, '.cache', 'loushing', 'metadata-v1'), { scope: home });
  cache().set(url, { items: [] });
  assert.deepEqual(cache().get(url), { items: [] });
  rmSync(join(real, 'home', '.cache'), { recursive: true });
  link(outside, join(real, 'home', '.cache'));
  assert.throws(() => cache().set(url, { items: [] }), /Could not save/);
  assert.deepEqual(readdirSync(outside), []);
});
