import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

/** Enforce the specified index budget and keep development-only code off product pages. */
export function checkBudgets(dist, budgets) {
  const index = readFileSync(join(dist, 'search-index.json'));
  const searchIndexGzipBytes = gzipSync(index).length;
  const problems = [];
  if (searchIndexGzipBytes > budgets.searchIndexGzipBytes) problems.push(`Search index is ${searchIndexGzipBytes} gzip bytes; budget is ${budgets.searchIndexGzipBytes}`);
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (entry.name !== 'library') walk(join(dir, entry.name));
      } else if (entry.name.endsWith('.html')) {
        const html = readFileSync(join(dir, entry.name), 'utf8');
        const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);
        for (const excluded of budgets.excludedFromProductEntry) if (scripts.some((src) => src.includes(excluded))) problems.push(`${entry.name} loads development-only ${excluded}`);
      }
    }
  };
  walk(dist);
  return { searchIndexGzipBytes, problems };
}
