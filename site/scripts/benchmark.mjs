// Build first, then: node site/scripts/benchmark.mjs [--baseline | --check]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cpus, platform, release, arch } from 'node:os';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { search } from '../src/lib/search.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
if (process.argv.includes('--baseline') && process.argv.includes('--check')) throw new Error('Choose baseline recording or comparison, not both');
const perf = join(root, 'site', 'perf');
const indexBytes = readFileSync(join(root, 'site', 'dist', 'search-index.json'));
const index = JSON.parse(indexBytes);
const budgets = JSON.parse(readFileSync(join(perf, 'budgets.json')));
const docs = Array.from({ length: budgets.searchDocuments }, (_, n) => ({ ...index.docs[n % index.docs.length], id: `benchmark-${n}` }));
const queries = ['write documentation', 'design system', 'run unattended', 'copy skills', 'plan a feature'];
const stats = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const percentile = (p) => sorted[Math.ceil(sorted.length * p) - 1];
  return { median: percentile(0.5), p75: percentile(0.75), min: sorted[0], max: sorted.at(-1), samples: sorted.length };
};
const samples = [];
for (let run = 0; run < 5; run++) {
  for (const query of queries) {
    const start = performance.now();
    search(docs, query);
    samples.push(performance.now() - start);
  }
}
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const result = {
  schemaVersion: 1, recordedAt: new Date().toISOString(), commit: git('rev-parse', 'HEAD'), dirty: Boolean(git('status', '--porcelain')),
  machine: { platform: platform(), release: release(), arch: arch(), cpu: cpus()[0]?.model, node: process.version },
  fixture: { kind: '200 synthetic search documents sampled from the public catalog; not participant tasks', documents: docs.length, sourceDocuments: index.docs.length, corpusSha256: createHash('sha256').update(indexBytes).digest('hex') },
  definition: 'Synchronous search call entry to ranked result return; Node lab only, excludes network and browser paint',
  metrics: { firstSearchMs: samples[0], searchMs: stats(samples), searchIndexGzipBytes: gzipSync(indexBytes).length, fixtureGzipBytes: gzipSync(JSON.stringify({ docs })).length },
  targets: { searchP75Ms: budgets.targets.searchP75Ms, met: stats(samples).p75 <= budgets.targets.searchP75Ms },
  limitations: ['One machine, no controlled CPU or network throttling', 'No browser INP, page LCP or field data in this run', 'Candidate baseline remains uncommitted until integrated and reviewed'],
};
mkdirSync(join(perf, 'runs'), { recursive: true });
const file = join(perf, 'runs', `${result.recordedAt.replace(/[:.]/g, '-')}.json`);
writeFileSync(file, `${JSON.stringify(result, null, 2)}\n`);
if (process.argv.includes('--baseline')) writeFileSync(join(perf, 'baseline.json'), `${JSON.stringify(result, null, 2)}\n`);
if (process.argv.includes('--check')) {
  const baseline = JSON.parse(readFileSync(join(perf, 'baseline.json')));
  if (JSON.stringify(result.machine) !== JSON.stringify(baseline.machine)) throw new Error('Baseline machine differs; record a deliberate comparable baseline');
  if (result.fixture.corpusSha256 !== baseline.fixture.corpusSha256) throw new Error('Benchmark corpus differs; review the new fixture and record a deliberate baseline');
  const before = baseline.metrics.searchMs.p75;
  const after = result.metrics.searchMs.p75;
  if (after > before * (1 + budgets.comparison.relative) && after - before > budgets.comparison.searchAbsoluteMs) throw new Error(`Search regression: ${before} ms → ${after} ms`);
}
if (result.metrics.fixtureGzipBytes > budgets.searchIndexGzipBytes) throw new Error('The 200-document search fixture exceeds the index budget');
console.log(JSON.stringify({ file, metrics: result.metrics, targets: result.targets }, null, 2));
if (!result.targets.met) process.exitCode = 1;
