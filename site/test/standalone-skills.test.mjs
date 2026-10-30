import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { linkStandaloneSkills, loadCatalog } from '../scripts/lib/catalog.mjs';
import { buildModel } from '../scripts/lib/model.mjs';
import { catalogJson, itemJson, itemMarkdown, llmsTxt, searchIndex } from '../scripts/lib/outputs.mjs';
import { GetItPanel, ItemHeader, KitAnatomy, SourceViewer } from '../src/components/compounds/item.mjs';
import { setBase } from '../src/lib/urls.mjs';
import { frontMatter } from '../src/lib/yaml.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const catalog = loadCatalog(root);
const model = buildModel(catalog);
const adaptations = model.items.filter((i) => i.derivedFrom);
// Kits whose skills have standalone adaptations (skills/README.md). ai-integration's one
// skill is listed only inside its kit.
const ADAPTED_KITS = ['agentic-craft', 'agent-orchestration', 'slate'];

test('every skill in an adapted kit has exactly one separately listed standalone adaptation', () => {
  assert.deepEqual(catalog.problems, []);
  assert.equal(adaptations.length, 19);
  const skillParts = model.parts.filter((p) => p.kind === 'skill');
  const parts = skillParts.filter((p) => ADAPTED_KITS.includes(p.kit.id));
  assert.deepEqual(skillParts.filter((p) => !ADAPTED_KITS.includes(p.kit.id)).map((p) => [p.kit.id, p.name, Boolean(p.standalone)]), [['ai-integration', 'ai-integration', false]]);
  assert.equal(parts.length, adaptations.length);
  for (const part of parts) {
    assert.ok(part.standalone, `${part.id} has an independent version`);
    const skill = model.byId.get(part.standalone.id);
    assert.equal(skill.type, 'skill');
    assert.deepEqual(skill.derivedFrom, { kit: part.kit.id, skill: part.name });
    for (const plan of Object.values(skill.plans)) {
      assert.equal(plan.supported, true);
      assert.ok(plan.git.some((line) => line.includes(`skills/${skill.id}`)));
      assert.equal(plan.adds.length, 1, 'only its own folder is installed');
      assert.ok(!skill.install, 'no kit installer is used');
    }
  }
});

test('independent bundles retain all local documents and script imports when copied alone', () => {
  const temp = mkdtempSync(join(tmpdir(), 'loushing-independent-'));
  try {
    for (const skill of adaptations) {
      const bundle = join(temp, skill.id);
      for (const file of skill.files) cpSync(join(root, 'skills', skill.id, file.path), join(bundle, file.path), { recursive: true });
      assert.ok(!existsSync(join(bundle, 'about.md')), 'catalog cards are not needed by the skill');
      const { data } = frontMatter(readFileSync(join(bundle, 'SKILL.md'), 'utf8'));
      assert.equal(data.name, skill.id);
      assert.ok(data.description.length > 0 && data.description.length <= 1024);
      assert.ok(existsSync(join(bundle, 'references', 'source.md')), 'provenance travels with the bundle');
      for (const file of skill.files.filter((f) => f.text)) {
        const targets = file.path.endsWith('.md')
          ? [...file.text.matchAll(/\[[^\]\n]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)].map((m) => m[1])
          : /\.(mjs|js)$/.test(file.path)
            ? [...file.text.matchAll(/(?:from\s+|import\s*\(\s*|import\s*)['"](\.[^'"]+)['"]/g)].map((m) => m[1])
            : [];
        for (const target of targets) {
          if (/^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/i.test(target)) continue;
          const path = resolve(dirname(join(bundle, file.path)), decodeURIComponent(target.split('#')[0]));
          const rel = relative(bundle, path);
          assert.ok(!isAbsolute(rel) && rel !== '..' && !rel.startsWith(`..${sep}`), `${skill.id}/${file.path}: ${target} escapes the bundle`);
          assert.ok(existsSync(path), `${skill.id}/${file.path}: missing ${target}`);
          assert.ok(realpathSync(path).startsWith(realpathSync(bundle) + sep), 'links resolve inside the isolated copy');
        }
      }
    }
  } finally { rmSync(temp, { recursive: true, force: true }); }
});

test('standalone identity is validated instead of inferred from matching names', () => {
  const kit = () => ({ id: 'kit', type: 'kit', file: 'kit.card.md', parts: [{ kind: 'skill', name: 'source' }] });
  const skill = (id, derivedFrom) => ({ id, title: id, type: 'skill', file: `${id}/about.md`, derivedFrom });
  const goodKit = kit();
  const reports = [];
  linkStandaloneSkills([goodKit, skill('renamed', { kit: 'kit', skill: 'source' })], (...p) => reports.push(p));
  assert.deepEqual(reports, []);
  assert.equal(goodKit.parts[0].standalone.id, 'renamed');
  for (const derivedFrom of [null, [], 'kit/source', {}, { kit: 'missing', skill: 'source' }, { kit: 'kit', skill: 'missing' }]) {
    const errors = [];
    linkStandaloneSkills([kit(), skill('invalid', derivedFrom)], (...p) => errors.push(p));
    assert.equal(errors.length, 1, JSON.stringify(derivedFrom));
    assert.ok(errors[0][2].length > 10, 'the error gives a fix');
  }
  const duplicates = [];
  linkStandaloneSkills([kit(), skill('one', { kit: 'kit', skill: 'source' }), skill('two', { kit: 'kit', skill: 'source' })], (...p) => duplicates.push(p));
  assert.match(duplicates[0][1], /more than one standalone/);
});

test('kit parts offer a skill-only path, while non-skill parts still offer the kit', () => {
  setBase('/preview/', 'https://example.com');
  try {
    for (const part of model.parts.filter((p) => p.standalone)) {
      const panel = String(GetItPanel({ item: part }, { model }));
      assert.ok(panel.includes(`/preview/items/${part.standalone.id}#get-it`));
      assert.match(panel, /Get skill/);
      assert.match(panel, /Get kit/);
      assert.ok(String(ItemHeader({ item: part }, { model })).includes('use it separately'));
    }
    const tool = model.parts.find((p) => p.kind === 'tool');
    assert.match(String(GetItPanel({ item: tool }, { model })), /Get the kit to use it/);
    for (const kit of model.items.filter((i) => i.type === 'kit')) {
      const anatomy = String(KitAnatomy({ item: kit }));
      for (const part of kit.partItems.filter((p) => p.standalone)) assert.ok(anatomy.includes(`/preview${part.standalone.url}`));
    }
  } finally { setBase('/', ''); }
});

test('humans and agents receive the same standalone identities and source links', () => {
  const output = catalogJson(model);
  const search = searchIndex(model);
  for (const skill of adaptations) {
    assert.deepEqual(output.items.find((i) => i.id === skill.id).derivedFrom, skill.derivedFrom);
    assert.deepEqual(itemJson(skill, model).derivedFrom, skill.derivedFrom);
    assert.ok(search.docs.some((i) => i.id === skill.id && i.type === 'skill'));
    assert.ok(llmsTxt(model).includes(`/items/${skill.id}.md`));
    const kit = model.byId.get(skill.derivedFrom.kit);
    const part = itemJson(kit, model).parts.find((p) => p.name === skill.derivedFrom.skill && p.kind === 'skill');
    assert.equal(part.standalone.id, skill.id);
    assert.ok(itemMarkdown(kit, model).includes(`[Use separately](/items/${skill.id})`));
  }
});

test('bundled resource links in source views resolve relative to the owning file', () => {
  const skill = model.byId.get('presentation-deck');
  const view = String(SourceViewer({ item: skill }, { model }));
  assert.ok(view.includes(`${skill.source.repo}/blob/${skill.source.commit}/skills/presentation-deck/assets/deck-outline.md`));
  assert.ok(view.includes(`${skill.source.repo}/blob/${skill.source.commit}/skills/presentation-deck/references/source.md`));
});
