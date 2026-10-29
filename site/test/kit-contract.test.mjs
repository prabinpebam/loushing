import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contractProblem, permits } from '../src/lib/kit-contract.mjs';
import { loadCatalog } from '../scripts/lib/catalog.mjs';
import { buildModel } from '../scripts/lib/model.mjs';
import { itemJson } from '../scripts/lib/outputs.mjs';

test('future contracts require complete pinned-source metadata and bounded effects', () => {
  const c = { version: 1, command: ['node', 'tools/install.mjs'], project: ['{projectDir}'],
    agents: { copilot: 'copilot' }, files: [{ path: 'tools/install.mjs', size: 12, sha256: 'a'.repeat(64) }],
    writes: [{ path: '.github/skills/example', kind: 'tree' }], effects: ['writes-project-files'], network: false };
  assert.equal(contractProblem(c), null);
  assert.equal(permits(c, '.github/skills/example/SKILL.md'), true);
  assert.equal(permits(c, '.github/skills/unrelated/SKILL.md'), false);
  assert.equal(permits(c, '.github/skills/example/.GIT/config'), false);
  for (const change of [
    { version: 2 }, { command: ['sh', 'installer.sh'] }, { files: [] }, { network: true },
    { files: [{ ...c.files[0], path: '../outside' }] }, { writes: [{ path: '..', kind: 'tree' }] },
    { agents: { copilot: 'anything' } }, { agents: {} }, { agents: [] }, { files: [null] }, { writes: [null] }, { files: [c.files[0], c.files[0]] },
    { files: [{ ...c.files[0], path: '.GIT/config' }] },
    ...['.GIT/config', 'LOUSHING.LOCK.JSON', '.LOUSHING/lock.json', '.LOUSHING-transaction/owned'].map((path) => ({ writes: [{ path, kind: 'file' }] })),
  ]) assert.equal(typeof contractProblem({ ...c, ...change }), 'string');
});
test('all real unreleased kit and stack automation stays manual in shared page and JSON plans', () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const catalog = loadCatalog(root);
  assert.deepEqual(catalog.problems, []);
  const model = buildModel(catalog);
  for (const item of model.items.filter((i) => ['kit', 'stack'].includes(i.type))) {
    const data = itemJson(item, model);
    assert.equal(data.install.contract, undefined, 'No false contract activated against an old pin');
    for (const [key, plan] of Object.entries(item.plans)) {
      if (!plan.supported) continue;
      assert.equal(plan.automation.supported, false);
      assert.deepEqual(data.install.plans[key].automation, plan.automation);
      assert.deepEqual(data.install.plans[key].git, plan.git);
    }
  }
});
