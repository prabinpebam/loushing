import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { run } from '../lib/cli.mjs';

// Authored synthetic regression phrases, never participant or model observations.
export const syntheticTasks = [
  { task: 'customer promise', expected: 'ground' },
  { task: 'risks assumptions', expected: 'assumptions' },
  { task: 'definition done', expected: 'definition-of-done' },
  { task: 'design tokens', expected: 'design-system' },
  { task: 'error messages', expected: 'ui-copy' },
  { task: 'perceived performance', expected: 'perceived-performance' },
  { task: 'benchmark performance', expected: 'performance' },
  { task: 'handoff', expected: 'coordinate' },
  { task: 'stage validation', expected: 'stage-validation' },
  { task: 'execution modes', expected: 'execution-modes' },
];

export async function trial({ catalog, cwd }) {
  const results = [];
  for (const task of syntheticTasks) {
    const found = await run(['find', task.task, '--catalog', catalog, '--json'], { cwd });
    if (found.status !== 'ok') throw new Error(found.message);
    const candidates = found.results.slice(0, 5).map((item) => item.id);
    const preview = await run(['add', task.expected, '--agent', 'copilot', '--catalog', catalog, '--dry-run', '--json'], { cwd });
    if (preview.status !== 'ok') throw new Error(preview.message);
    results.push({ ...task, candidates, correct: candidates.includes(task.expected), effects: preview.plan.effects, writes: preview.plan.writes, consent: 'not given', installed: false });
  }
  const correct = results.filter((result) => result.correct).length;
  return { evidence: 'synthetic ranking and preview regression; not real-agent or participant evidence', threshold: '7/10', correct, total: results.length, passed: correct >= 7, installCommands: 0, results };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const catalog = process.argv[2] ?? 'site/dist/catalog.json';
  try {
    const result = await trial({ catalog, cwd: process.cwd() });
    console.log(JSON.stringify(result, null, 2));
    if (!result.passed) process.exitCode = 1;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
