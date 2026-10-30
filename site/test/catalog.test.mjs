// The catalog check, the publication check (DoD 1.6, 1.7) and the real catalog's data.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCatalog } from '../scripts/lib/catalog.mjs';
import { buildModel } from '../scripts/lib/model.mjs';
import { scanText } from '../scripts/lib/publication.mjs';
import { card, fixture, skillMd } from './fixture.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

test('a skill is added with a folder and an about.md, and loads without problems', () => {
  const dir = fixture({ 'tidy-notes': { 'SKILL.md': skillMd('tidy-notes'), 'about.md': card() } });
  try {
    const c = loadCatalog(dir);
    assert.deepEqual(c.problems, []);
    assert.equal(c.items[0].id, 'tidy-notes');
    assert.equal(c.items[0].files[0].path, 'SKILL.md');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('the check names each problem with its file and its fix', () => {
  const dir = fixture({
    'no-card': { 'SKILL.md': skillMd('no-card') },
    'wrong-name': { 'SKILL.md': skillMd('other'), 'about.md': card().replace('area: documentation', 'area: cooking') },
    'has-scripts': { 'SKILL.md': skillMd('has-scripts'), 'about.md': card(), 'scripts/run.mjs': 'console.log(1);\n' },
  });
  try {
    const { problems } = loadCatalog(dir);
    const say = problems.map((p) => `${p.file}: ${p.message}`).join('\n');
    assert.match(say, /skills\/no-card: the skill has no about\.md card/);
    assert.match(say, /SKILL\.md's name "other" differs from the folder "wrong-name"/);
    assert.match(say, /the area "cooking" isn't in the taxonomy/);
    assert.match(say, /has scripts but its card doesn't declare runs-scripts/);
    for (const p of problems) assert.ok(p.fix && p.fix.length > 10, `${p.message} has a fix`);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('publication check: finds planted secrets and internal hosts, and masks them', () => {
  const token = `ghp_${'a1B2c3D4e5'.repeat(4)}`;
  const findings = scanText([
    `export GITHUB_TOKEN=${token}`,
    'See https://wiki.contoso.corp/notes for the team page.',
    'password = "hunter2hunter2hunter2x9"',
    '-----BEGIN OPENSSH PRIVATE KEY-----',
    'Server at 10.1.2.3 answers.',
  ].join('\n'));
  assert.deepEqual(findings.map((f) => f.rule), ['github-token', 'internal-host', 'assigned-secret', 'private-key', 'private-ip']);
  assert.ok(findings.every((f) => !f.excerpt.includes(token.slice(8))), 'the report never repeats the secret');
});

test('publication check: ordinary skill text passes', () => {
  const ok = [
    'Preview at http://127.0.0.1:8080 and read the token reference.',
    'Set token: color.text-muted on muted labels; the password field needs a label.',
    'api_key: <your key here>',
    'Visit https://github.com/prabinpebam/slate and https://example.com.',
  ].join('\n');
  assert.deepEqual(scanText(ok), []);
});

test('publication check: an item with a planted secret is a catalog problem', () => {
  const secret = `AKIA${'ABCDEFGH12345678'}`;
  const dir = fixture({ leaky: { 'SKILL.md': skillMd('leaky'), 'about.md': card(), 'references/setup.md': `Use key ${secret} to sign in.\n` } });
  try {
    const { problems } = loadCatalog(dir);
    assert.equal(problems.length, 1);
    assert.match(problems[0].file, /skills\/leaky\/references\/setup\.md$/);
    assert.match(problems[0].message, /publication check: an AWS access key on line 1/);
    assert.ok(!problems[0].message.includes(secret));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('the real catalog loads cleanly, with a plan for every agent and scope', () => {
  const c = loadCatalog(root);
  assert.deepEqual(c.problems, []);
  const model = buildModel(c);
  const agents = c.taxonomy.agents.map((a) => a.id);
  for (const item of model.items) {
    for (const a of agents) for (const s of ['project', 'personal']) assert.ok(item.plans[`${a}:${s}`], `${item.id} has a ${a}:${s} plan`);
    for (const r of item.related) assert.ok(model.byId.has(r.id), `${item.id} relates to a real item`);
    if (item.type !== 'stack') assert.match(item.source.commit, /^[0-9a-f]{40}$/, `${item.id} is pinned to a commit`);
  }
  const slate = model.byId.get('slate');
  assert.equal(slate.plans['claude-code:project'].supported, false);
  assert.match(slate.plans['claude-code:project'].reason, /Claude Code isn’t one of them/);
});

test('real job areas have at least two items and no more than a third of the catalog', () => {
  const model = buildModel(loadCatalog(root));
  assert.ok(model.areas.length <= 8);
  for (const area of model.areas) {
    assert.ok(area.count >= 2, `${area.id} has only ${area.count} item`);
    assert.ok(area.count <= model.items.length / 3, `${area.id} holds more than a third of the catalog`);
  }
  assert.equal(model.byId.get('ai-integration').area, 'product-planning');
  assert.deepEqual(model.byId.get('ai-integration').tags, ['ai-providers', 'local-models', 'privacy', 'migrations']);
  assert.ok(!model.taxonomy.areas.some((area) => area.id === 'ai-features'));
});
