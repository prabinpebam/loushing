/**
 * Icons as data: the vendored Material Symbols (rounded, 400) read once at build time.
 * Only these names exist; an unknown name throws so a typo fails the build.
 * @tier 0
 */
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('../vendor/icons/', import.meta.url));
const PATHS = new Map();
for (const f of readdirSync(dir).filter((n) => n.endsWith('.svg'))) {
  const svg = readFileSync(dir + f, 'utf8');
  const d = [...svg.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map((m) => m[1]);
  PATHS.set(f.replace(/\.svg$/, ''), d);
}

export function iconPaths(name) {
  const d = PATHS.get(name);
  if (!d) throw new Error(`unknown icon "${name}"; vendor it into site/src/vendor/icons first`);
  return d;
}

export function iconNames() {
  return [...PATHS.keys()].sort();
}
