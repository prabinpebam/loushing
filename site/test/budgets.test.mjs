import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkBudgets } from '../scripts/lib/budgets.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
mkdirSync(join(root, '.agent-orchestration'), { recursive: true });

test('build budgets reject large indexes and validation code on product pages', () => {
  const dir = mkdtempSync(join(root, '.agent-orchestration', 'budget-fixture-'));
  try {
    writeFileSync(join(dir, 'search-index.json'), '{"docs":[]}');
    writeFileSync(join(dir, 'index.html'), '<script src="/assets/client/app.js"></script>');
    const budgets = { searchIndexGzipBytes: 150000, excludedFromProductEntry: ['library.js', 'axe'] };
    assert.deepEqual(checkBudgets(dir, budgets).problems, []);
    assert.match(checkBudgets(dir, { ...budgets, searchIndexGzipBytes: 1 }).problems[0], /budget/);
    writeFileSync(join(dir, 'index.html'), '<script src="/assets/client/library.js"></script>');
    assert.match(checkBudgets(dir, budgets).problems[0], /development-only/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
