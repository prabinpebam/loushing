// The build end to end: every page renders, every internal link resolves, the agent
// outputs parse, and a catalog that fails its checks is never built (DoD 1.6, 1.7).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { card, fixture } from './fixture.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const build = (env) => spawnSync(process.execPath, ['site/scripts/build.mjs'], { cwd: root, encoding: 'utf8', env: { ...process.env, ...env } });

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}

const tmp = mkdtempSync(join(tmpdir(), 'loushing-build-'));
const out = join(tmp, 'dist');
const result = build({ OUT_DIR: out, BASE: '/' });
const files = result.status === 0 ? walk(out) : [];
const pages = files.filter((f) => f.endsWith('.html'));
process.on('exit', () => rmSync(tmp, { recursive: true, force: true }));

test('the real catalog builds', () => {
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.ok(pages.length >= 50, `${pages.length} pages`);
  assert.ok(!readdirSync(tmp).some((n) => n.includes('.build-')), 'the staging folder is gone');
});

test('every page has a language, a title, one main heading and one main region', () => {
  for (const f of pages) {
    const html = readFileSync(f, 'utf8');
    assert.match(html, /<html lang="en"/, f);
    assert.match(html, /<title>[^<]+<\/title>/, f);
    assert.equal((html.match(/<h1[\s>]/g) ?? []).length, 1, `one h1 in ${f}`);
    assert.equal((html.match(/<main[\s>]/g) ?? []).length, 1, `one main in ${f}`);
  }
});

test('every internal link and asset resolves to a built file', () => {
  const broken = new Set();
  for (const f of pages) {
    const html = readFileSync(f, 'utf8');
    for (const [, ref] of html.matchAll(/\s(?:href|src)="(\/[^"#?]*)/g)) {
      if (ref.startsWith('//')) continue;
      const p = join(out, decodeURI(ref));
      const ok = (existsSync(p) && statSync(p).isFile()) || existsSync(join(p, 'index.html'));
      if (!ok) broken.add(`${ref} (from ${f.slice(out.length)})`);
    }
  }
  assert.deepEqual([...broken], []);
});

test('the outputs for agents parse and agree with the pages', () => {
  const catalog = JSON.parse(readFileSync(join(out, 'catalog.json'), 'utf8'));
  const index = JSON.parse(readFileSync(join(out, 'search-index.json'), 'utf8'));
  assert.ok(Array.isArray(catalog.items) && catalog.items.length > 0);
  for (const item of catalog.items) assert.ok(existsSync(join(out, 'items', item.id, 'index.html')), `a page for ${item.id}`);
  assert.ok(index && typeof index === 'object');
  for (const f of files.filter((n) => n.endsWith('.json'))) assert.doesNotThrow(() => JSON.parse(readFileSync(f, 'utf8')), f);
  assert.match(readFileSync(join(out, 'llms.txt'), 'utf8'), /^# /);
  assert.match(readFileSync(join(out, 'feed.xml'), 'utf8'), /^<\?xml/);
});

test('a catalog with a problem is never built, and says which file and how to fix it', () => {
  const secret = ['AKIA', 'Z7Q2', 'XK4M', 'P9RT', 'B3WD'].join('');
  const dir = fixture({ leaky: { 'SKILL.md': `---\nname: leaky\ndescription: Use when testing.\n---\n\nkey: ${secret}\n`, 'about.md': card() } });
  const bad = join(tmp, 'bad');
  try {
    const r = build({ OUT_DIR: bad, CATALOG_ROOT: dir });
    assert.equal(r.status, 1);
    assert.ok(!existsSync(bad), 'nothing is written');
    assert.match(r.stdout + r.stderr, /skills[\\/]leaky[\\/]SKILL\.md/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
