// Prepares an immutable LOCAL artifact. Does not publish or move stable/next.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCatalog } from './lib/catalog.mjs';
import { buildModel } from './lib/model.mjs';
import { catalogJson, itemJson, itemMarkdown, searchIndex } from './lib/outputs.mjs';
import { assertOutput } from './lib/schema.mjs';
import { digest, publishedVersions, releaseVersion, verifyPinnedFiles } from './lib/releases.mjs';

export function prepareRelease({ root, out, version, date, changes, sourceRoots = {} }) {
  root = resolve(root);
  out = resolve(out);
  if (!releaseVersion(version) || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(date ?? '') || !Number.isFinite(Date.parse(date))) throw new Error('Supply an explicit SemVer and UTC release date.');
  if (existsSync(out)) throw new Error('Release output already exists. Immutable releases cannot be replaced.');
  const dirty = execFileSync('git', ['status', '--porcelain', '--untracked-files=all', '--', 'catalog', 'skills', 'external', 'stacks'], { cwd: root, encoding: 'utf8' });
  if (dirty.trim()) throw new Error('Catalog sources are uncommitted. Commit approved sources before preparing a release; nothing was written.');
  const catalog = loadCatalog(root, { now: new Date(date) });
  if (catalog.problems.length) throw new Error(catalog.problems.map((p) => `${p.file}: ${p.message}`).join('\n'));
  if (catalog.releaseRegistry.releases.some((release) => release.version === version)) throw new Error('This catalog version already exists.');
  if (!Array.isArray(changes) || !changes.length || changes.some((change) => !(change.kind === 'removed' ? Object.hasOwn(catalog.lifecycle.removed, change.id) : catalog.byId.has(change.id))
    || !['added', 'updated', 'pinned', 'removed'].includes(change.kind) || typeof change.line !== 'string' || !change.line.trim())) throw new Error('Supply real item changes (id, kind, line); release notes are not inferred from main.');
  for (const item of catalog.items) {
    publishedVersions(item, catalog.releaseRegistry);
    const checkout = item.source.local ? root : sourceRoots[item.source.repo];
    for (const release of catalog.releaseRegistry.releases) {
      const old = item.version && release.index.items.find((candidate) => candidate.id === item.id && candidate.version === item.version);
      if (!old) continue;
      const sameLocation = old.source.repo === item.source.repo.replace('https://github.com/', '')
        && (old.source.path ?? null) === (item.source.path ?? null);
      if (sameLocation && item.source.local && old.source.commit !== item.source.commit) {
        try {
          execFileSync('git', ['diff', '--quiet', old.source.commit, item.source.commit, '--', item.source.path], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
          item.source.commit = old.source.commit;
        } catch { throw new Error(`Bump the item version before changing its source: ${item.id}.`); }
      }
      if (!sameLocation || old.source.commit !== item.source.commit) throw new Error(`Bump the item version before changing its source: ${item.id}.`);
    }
    if (item.type !== 'stack') {
      if (!checkout && (item.type === 'skill' || item.install?.contract)) throw new Error(`Supply a local pinned checkout for ${item.source.repo}.`);
      if (checkout) verifyPinnedFiles(item, checkout);
    }
  }
  catalog.releaseVersion = version;
  const model = buildModel(catalog);
  const index = catalogJson(model);
  for (const entry of index.items) {
    delete entry.versions;
    delete entry.channels;
    entry.data = `items/${entry.id}.json`;
  }
  const contents = new Map([
    ['catalog.json', JSON.stringify(assertOutput('catalog', index), null, 2)],
    ['search-index.json', JSON.stringify(searchIndex(model))],
  ]);
  for (const item of model.items) {
    contents.set(`items/${item.id}.json`, JSON.stringify(assertOutput('item', itemJson(item, model)), null, 2));
    contents.set(`items/${item.id}.md`, itemMarkdown(item, model));
  }
  const manifest = { manifestVersion: 1, version, date, commit: catalog.head, changes, files: Object.fromEntries([...contents].map(([path, text]) => [path, digest(text)])) };
  contents.set('manifest.json', JSON.stringify(manifest, null, 2));
  const staging = `${out}.prepare-${process.pid}`;
  if (existsSync(staging)) throw new Error('A release preparation folder already exists. Inspect it before retrying.');
  try {
    mkdirSync(staging, { recursive: true });
    for (const [path, text] of contents) {
      const target = join(staging, path);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, text, { flag: 'wx' });
    }
    if (existsSync(out)) throw new Error('Release output appeared during preparation; it was not overwritten.');
    renameSync(staging, out);
  } finally { rmSync(staging, { recursive: true, force: true }); }
  return { version, sha256: digest(contents.get('manifest.json')), output: out, channelsChanged: false, published: false };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { readFileSync } = await import('node:fs');
    const [config] = process.argv.slice(2);
    if (!config) throw new Error('Usage: node site\\scripts\\release.mjs <local-release-config.json>');
    console.log(JSON.stringify(prepareRelease(JSON.parse(readFileSync(config, 'utf8'))), null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
