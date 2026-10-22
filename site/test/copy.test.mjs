// The site's own words read as one person's collection, not a pitch (P9, DoD PD14 and
// 1.13). Builds a neutral fixture catalog so only the site's copy is checked, never an
// item's own text, then scans every page and the agent outputs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { card, fixture, skillMd } from './fixture.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

// Store, hype and preaching words (P9), and the words the ui-copy rules ban.
const PITCH = [
  'the best', 'best-in-class', 'world-class', 'top-rated', 'most popular', 'trending',
  'powerful', 'supercharge', 'ultimate', 'must-have', 'game-changing', 'revolutionary',
  'seamless', 'unlock', 'trusted by', 'thousands of', 'millions of', 'marketplace',
  'store', 'shop', 'curated', 'discover', 'you should', 'you need', 'join', 'sign up',
  'the owner',
];
const UI_BANNED = ['click here', 'please', 'simply', 'oops', 'submit'];
const banned = new RegExp(`\\b(${[...PITCH, ...UI_BANNED].map((w) => w.replace(/[-]/g, '\\-')).join('|')})\\b`, 'gi');

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}

const visibleText = (html) => html
  .replace(/<(script|style|pre|code)[\s\S]*?<\/\1>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&rsquo;/g, '’')
  .replace(/&#39;/g, "'")
  .replace(/\s+/g, ' ');

const tmp = mkdtempSync(join(tmpdir(), 'loushing-copy-'));
const dir = fixture({ 'tidy-notes': { 'SKILL.md': skillMd('tidy-notes'), 'about.md': card() } });
const out = join(tmp, 'dist');
const result = spawnSync(process.execPath, ['site/scripts/build.mjs'], {
  cwd: root, encoding: 'utf8', env: { ...process.env, OUT_DIR: out, BASE: '/', CATALOG_ROOT: dir },
});
const files = result.status === 0 ? walk(out) : [];
process.on('exit', () => { rmSync(tmp, { recursive: true, force: true }); rmSync(dir, { recursive: true, force: true }); });

test('the fixture site builds', () => {
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.ok(files.some((f) => f.endsWith('index.html')));
});

test('no page uses pitch, store or preaching words', () => {
  const hits = [];
  for (const f of files.filter((n) => n.endsWith('.html'))) {
    const text = visibleText(readFileSync(f, 'utf8'));
    for (const m of text.matchAll(banned)) hits.push(`${f.slice(out.length)}: "${m[0]}" in …${text.slice(Math.max(0, m.index - 40), m.index + 40)}…`);
    for (const [, attr] of readFileSync(f, 'utf8').matchAll(/(?:content|aria-label|title|placeholder)="([^"]*)"/g)) {
      for (const m of attr.matchAll(banned)) hits.push(`${f.slice(out.length)}: "${m[0]}" in an attribute: ${attr}`);
    }
  }
  for (const name of ['llms.txt', 'get-started.md', 'for-agents.md']) {
    const text = readFileSync(join(out, name), 'utf8');
    for (const m of text.matchAll(banned)) hits.push(`${name}: "${m[0]}"`);
  }
  assert.deepEqual(hits, []);
});

test('visible copy uses curly apostrophes', () => {
  const hits = [];
  for (const f of files.filter((n) => n.endsWith('.html'))) {
    const text = visibleText(readFileSync(f, 'utf8'));
    for (const m of text.matchAll(/[A-Za-z]'(s|t|re|ll|m|ve|d)\b/g)) hits.push(`${f.slice(out.length)}: …${text.slice(Math.max(0, m.index - 30), m.index + 30)}…`);
  }
  assert.deepEqual(hits, []);
});

test('the site speaks as its author and says it is a personal collection', () => {
  const home = visibleText(readFileSync(join(out, 'index.html'), 'utf8'));
  assert.match(home, /\bI’m Prabin\b/, 'the home page introduces the author');
  assert.match(home, /\bI use\b/, 'the home page says these are the things the author uses');
  for (const f of files.filter((n) => n.endsWith('.html'))) {
    assert.match(visibleText(readFileSync(f, 'utf8')), /personal collection by Prabin Pebam/i, `the footer on ${f.slice(out.length)}`);
  }
  assert.match(readFileSync(join(out, 'llms.txt'), 'utf8'), /personal collection/);
});
