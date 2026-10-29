import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workflow = readFileSync(new URL('../../.github/workflows/site-quality.yml', import.meta.url), 'utf8');

test('quality CI uses the approved feed and preinstalled runtime/browser without bootstrap downloads', () => {
  assert.match(workflow, /runs-on: windows-latest/);
  assert.match(workflow, /RUNNER_TOOL_CACHE\\node\\24\.\*/);
  assert.match(workflow, /Microsoft\\Edge\\Application\\msedge\.exe/);
  assert.match(workflow, /https:\/\/packagefeedproxy\.microsoft\.io\/npm\//);
  assert.match(workflow, /npm config list --json/);
  assert.match(workflow, /EndsWith\(':registry'\)/);
  assert.match(workflow, /npm ci --ignore-scripts/);
  assert.doesNotMatch(workflow, /setup-node|npx|playwright install|registry\.npmjs\.org|nodejs\.org/);
});

test('quality CI checks budgets, browser contexts and all Lighthouse runs, retaining failures', () => {
  for (const command of ['node --test', 'site\\scripts\\build.mjs', 'site\\scripts\\benchmark.mjs', 'site\\validation\\check.mjs --all', 'site\\validation\\lighthouse.mjs']) assert.ok(workflow.includes(command), command);
  assert.match(workflow, /steps\.build\.outcome == 'success'/);
  assert.match(workflow, /steps\.validation\.outcome == 'success'/);
  assert.match(workflow, /if: always\(\)/);
  assert.match(workflow, /actions\/upload-artifact@/);
});
