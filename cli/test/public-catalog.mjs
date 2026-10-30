// The real public catalog outputs (catalog.json, search-index.json, items/<id>.json),
// generated from the source in this checkout with the build's own output functions.
// Tests use this instead of site/dist, so they never depend on, or pass because of, a
// previous build.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { loadCatalog } from '../../site/scripts/lib/catalog.mjs';
import { buildModel } from '../../site/scripts/lib/model.mjs';
import { catalogJson, itemJson, searchIndex } from '../../site/scripts/lib/outputs.mjs';

const generated = new Map();

export function publicOutputs(root) {
  const catalog = loadCatalog(root);
  if (catalog.problems.length) throw new Error(`The catalog has problems: ${catalog.problems.map((p) => `${p.file}: ${p.message}`).join('; ')}`);
  const model = buildModel(catalog);
  return {
    'catalog.json': JSON.stringify(catalogJson(model)),
    'search-index.json': JSON.stringify(searchIndex(model)),
    ...Object.fromEntries(model.items.map((item) => [`items/${item.id}.json`, JSON.stringify(itemJson(item, model))])),
  };
}

export function publicCatalog(root) {
  if (!generated.has(root)) {
    const dir = mkdtempSync(join(tmpdir(), 'loushing-public-catalog-'));
    process.on('exit', () => rmSync(dir, { recursive: true, force: true }));
    for (const [path, text] of Object.entries(publicOutputs(root))) {
      mkdirSync(dirname(join(dir, path)), { recursive: true });
      writeFileSync(join(dir, path), text);
    }
    generated.set(root, dir);
  }
  return generated.get(root);
}