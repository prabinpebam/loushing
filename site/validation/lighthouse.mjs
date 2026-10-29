// Five cold-cache runs per browser profile against production files, not a dev server.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { cpus, platform, release, arch } from 'node:os';
import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
import { browserPath, dist, results, root, serve } from './server.mjs';

mkdirSync(results, { recursive: true });
process.env.TEMP = process.env.TMP = join(root, '.agent-orchestration');
mkdirSync(process.env.TEMP, { recursive: true });
const catalog = JSON.parse(readFileSync(join(dist, 'catalog.json')));
const skill = catalog.items.find((i) => i.type === 'skill').id;
const routes = [`/items/${skill}/`];
const profiles = [
  { name: 'mobile', formFactor: 'mobile', throttlingMethod: 'simulate', throttling: { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 4, requestLatencyMs: 40, downloadThroughputKbps: 10240, uploadThroughputKbps: 1024 } },
  { name: 'desktop', formFactor: 'desktop', throttlingMethod: 'provided', screenEmulation: { mobile: false, width: 1365, height: 768, deviceScaleFactor: 1, disabled: false } },
];
const runs = [];
const server = await serve();
try {
  for (const profile of profiles) for (const route of routes) for (let run = 0; run < 5; run++) {
    const profileDir = join(root, '.agent-orchestration', `lighthouse-profile-${process.pid}-${profile.name}-${run}`);
    mkdirSync(profileDir, { recursive: true });
    const chrome = await launch({ chromePath: browserPath, chromeFlags: ['--headless=new'], userDataDir: profileDir });
    try {
      const { lhr } = await lighthouse(`${server.origin}${route}`, {
        port: chrome.port, output: 'json', logLevel: 'error',
        onlyCategories: ['performance', 'accessibility'],
        ...Object.fromEntries(Object.entries(profile).filter(([key]) => key !== 'name')),
      });
      writeFileSync(join(results, `lighthouse-${profile.name}-${run + 1}.json`), `${JSON.stringify(lhr, null, 2)}\n`);
      runs.push({
        route, profile: profile.name, run: run + 1, lighthouseVersion: lhr.lighthouseVersion, environment: lhr.environment,
        settings: { formFactor: lhr.configSettings.formFactor, throttlingMethod: lhr.configSettings.throttlingMethod, throttling: lhr.configSettings.throttling, screenEmulation: lhr.configSettings.screenEmulation },
        lcpMs: lhr.audits['largest-contentful-paint'].numericValue, fcpMs: lhr.audits['first-contentful-paint'].numericValue,
        cls: lhr.audits['cumulative-layout-shift'].numericValue, tbtMs: lhr.audits['total-blocking-time'].numericValue,
        performance: lhr.categories.performance.score, accessibility: lhr.categories.accessibility.score,
      });
      console.log(`Lighthouse ${profile.name} ${run + 1}/5: LCP ${Math.round(runs.at(-1).lcpMs)} ms`);
    } finally { await chrome.kill(); rmSync(profileDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); }
  }
} finally { await server.close(); }
const quantile = (profile, key, p) => {
  const values = runs.filter((r) => r.profile === profile).map((r) => r[key]).sort((a, b) => a - b);
  return values[Math.ceil(values.length * p) - 1];
};
const budget = JSON.parse(readFileSync(join(root, 'site', 'perf', 'budgets.json')));
const result = {
  recordedAt: new Date().toISOString(),
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  dirty: Boolean(execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim()),
  machine: { platform: platform(), release: release(), arch: arch(), cpu: cpus()[0]?.model, node: process.version },
  runs, summary: Object.fromEntries(profiles.map(({ name }) => [name, { lcpMedianMs: quantile(name, 'lcpMs', 0.5), lcpP75Ms: quantile(name, 'lcpMs', 0.75), clsP75: quantile(name, 'cls', 0.75), tbtP75Ms: quantile(name, 'tbtMs', 0.75) }])),
  target: { mobileLcpP75Ms: budget.targets.mobileLcpP75Ms, met: quantile('mobile', 'lcpMs', 0.75) <= budget.targets.mobileLcpP75Ms },
  limitations: ['Five cold-cache runs per profile of one skill page on one machine; desktop unthrottled, mobile simulated 4x CPU/10 Mbps/40 ms', 'Not field p75 or INP; no full-site performance claim', 'Lighthouse accessibility score is not WCAG conformance', 'Uncommitted engineering evidence, not release evidence'],
};
writeFileSync(join(results, 'lighthouse-summary.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ summary: result.summary, target: result.target }, null, 2));
if (!result.target.met) process.exitCode = 1;
