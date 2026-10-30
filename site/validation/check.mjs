// npm --prefix site/validation run check -- [--all]
// Focused Get it geometry/copy regression: node site/validation/check.mjs --getit-overflow [--label=after]
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright-core';
import { browserPath, dist, results, root, serve } from './server.mjs';

const require = createRequire(import.meta.url);
mkdirSync(results, { recursive: true });
process.env.TEMP = process.env.TMP = join(root, '.agent-orchestration');
mkdirSync(process.env.TEMP, { recursive: true });
if (process.argv.includes('--getit-overflow')) {
  await checkGetItOverflow();
  process.exit(0);
}
const catalog = JSON.parse(readFileSync(join(dist, 'catalog.json')));
const skill = catalog.items.find((i) => i.type === 'skill').id;
const contexts = [
  { name: 'light', colorScheme: 'light', width: 1280 },
  { name: 'dark', colorScheme: 'dark', width: 1280 },
  { name: 'light-more-contrast', colorScheme: 'light', contrast: 'more', width: 320 },
  { name: 'dark-more-contrast', colorScheme: 'dark', contrast: 'more', width: 320 },
  { name: 'forced-colors', colorScheme: 'light', forcedColors: 'active', width: 320 },
];
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((f) => f.isDirectory() ? walk(join(dir, f.name)) : f.name === 'index.html' ? [`/${relative(dist, dir).replaceAll('\\', '/')}/`.replace('//', '/')] : f.name.endsWith('.html') ? [`/${relative(dist, join(dir, f.name)).replaceAll('\\', '/')}`] : []);
const routes = process.argv.includes('--all') ? walk(dist) : ['/', '/catalog/', `/items/${skill}/`, '/library/', '/library/button-primary/', '/library/select-default/', '/library/tabs-default/', '/library/copyfield-command/', '/library/getitpanel-skill/'];
const started = performance.now();
const report = { complete: false, recordedAt: new Date().toISOString(), scope: process.argv.includes('--all') ? 'all built pages and stories' : 'smoke', browser: '', contexts, pages: [], interactions: [], screenshots: [], limitations: ['Automated axe findings are not full WCAG 2.2 AA certification', 'No screen-reader or participant trial', 'Pseudo-state keyboard/copy checks cover representative controls, not every combination'] };
const reportFile = join(results, process.argv.includes('--all') ? 'accessibility-all.json' : 'accessibility-smoke.json');
const server = await serve();
const browser = await chromium.launch({ executablePath: browserPath, headless: true });
report.browser = browser.version();
try {
  for (const context of contexts) {
    const ctx = await browser.newContext({ viewport: { width: context.width, height: 900 }, colorScheme: context.colorScheme, forcedColors: context.forcedColors ?? 'none', reducedMotion: 'reduce', contrast: context.contrast ?? 'no-preference' });
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      window.__qualityWebglContexts = 0;
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
        if (kind === 'webgl2') window.__qualityWebglContexts++;
        return getContext.call(this, kind, ...args);
      };
    });
    let checked = 0;
    for (const route of routes) {
      const errors = [];
      const onError = (e) => errors.push(e.message);
      page.on('pageerror', onError);
      await page.goto(`${server.origin}${route}`, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
      const result = await page.evaluate(async () => {
        const scan = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } });
        return {
          violations: scan.violations.map(({ id, impact, nodes }) => ({ id, impact, nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })) })),
          incomplete: scan.incomplete.map(({ id }) => id),
          overflow: document.documentElement.scrollWidth > innerWidth,
          duplicateIds: [...document.querySelectorAll('[id]')].map((e) => e.id).filter((id, i, all) => all.indexOf(id) !== i),
        };
      });
      report.pages.push({ route, context: context.name, ...result, errors });
      checked++;
      if (checked % 25 === 0 || checked === routes.length) {
        console.log(`axe ${context.name}: ${checked}/${routes.length} pages`);
        writeFileSync(reportFile, `${JSON.stringify(report, null, 2)}\n`);
      }
      page.off('pageerror', onError);
    }
    if (context.name === 'light' || context.name === 'dark-more-contrast') {
      await page.goto(`${server.origin}/items/${skill}/`, { waitUntil: 'networkidle' });
      await page.locator('[data-plan]:not([hidden]) [role=tab][data-tab=download]').click();
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.locator('[data-plan]:not([hidden]) a').filter({ hasText: 'Download ZIP' }).click(),
      ]);
      const digest = createHash('sha256').update(readFileSync(await download.path())).digest('hex');
      assert.equal(digest, catalog.items.find((i) => i.id === skill).archive.sha256);
      report.interactions.push(`${context.name}: Get it downloads the item ZIP matching its SHA256`);
      const getItScreenshot = join(results, `download-${context.name}.png`);
      await page.locator('#get-it').screenshot({ path: getItScreenshot });
      report.screenshots.push(relative(root, getItScreenshot));
      await page.goto(`${server.origin}/library/select-default/`, { waitUntil: 'networkidle' });
      const combo = page.locator('[data-story] [role=combobox]');
      await combo.focus();
      await page.keyboard.press('ArrowDown');
      assert.equal(await combo.getAttribute('aria-expanded'), 'true');
      await page.keyboard.press('End');
      await page.keyboard.press('Enter');
      assert.equal(await page.locator('#story-select').inputValue(), 'personal');
      report.interactions.push(`${context.name}: combobox keyboard open/select`);
      await page.goto(`${server.origin}/library/tabs-default/`);
      const tab = page.locator('[data-story] [role=tab]').first();
      await tab.focus();
      await page.keyboard.press('ArrowRight');
      assert.equal(await page.locator('[data-story] [role=tab]').nth(1).getAttribute('aria-selected'), 'true');
      report.interactions.push(`${context.name}: tabs arrow-key selection`);
      await page.goto(`${server.origin}/library/copyfield-command/`);
      await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('test denial'); } } }));
      await page.locator('[data-story] [data-copy]').click();
      await page.locator('[data-story] .f-copy__status').filter({ hasText: /copy/i }).waitFor();
      assert.ok(!(await page.locator('[data-story] .f-copy__status').getAttribute('class')).includes('u-visually-hidden'));
      report.interactions.push(`${context.name}: clipboard rejection leaves selectable text and visible instructions`);
      const screenshot = join(results, `copy-error-${context.name}.png`);
      await page.screenshot({ path: screenshot, fullPage: true });
      report.screenshots.push(relative(root, screenshot));
      await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => {} } }));
      await page.locator('[data-story] [data-copy]').click();
      assert.equal(await page.locator('[data-story] [data-copy]').getAttribute('data-copied'), 'true');
      report.interactions.push(`${context.name}: clipboard success status`);
    }
    await page.goto(`${server.origin}/library/copyfield-command/`, { waitUntil: 'load' });
    await page.locator('summary').filter({ hasText: 'Component documentation' }).click();
    await page.locator('pre[aria-label="Component documentation"]').focus();
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), 'Component documentation');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    report.interactions.push(`${context.name}: expanded component documentation remains focusable and within the page width`);
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve)))));
    const lighting = await page.evaluate(() => ({
      contexts: window.__qualityWebglContexts,
      initialized: performance.getEntriesByName('lighting:initialize')[0]?.startTime,
      contentPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
      visibleLayer: Boolean(document.querySelector('[data-light-layer]:not([hidden])')),
      canvasCount: document.querySelectorAll('[data-light-layer] canvas').length,
      fallback: document.querySelector('[data-lighting-status]')?.textContent.includes('only edges follow the light'),
    }));
    if (context.contrast === 'more' || context.forcedColors === 'active') {
      assert.equal(lighting.contexts, 0);
      report.interactions.push(`${context.name}: hidden lighting allocates no WebGL context`);
    } else {
      assert.equal(lighting.contexts, 1);
      assert.ok(lighting.initialized >= lighting.contentPaint);
      assert.ok((lighting.visibleLayer && lighting.canvasCount > 0) || lighting.fallback);
      report.interactions.push(`${context.name}: content paints before decorative GPU initialization`);
    }
    (report.lightingEvidence ??= []).push({ context: context.name, ...lighting });
    await ctx.close();
  }
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto(`${server.origin}/library/`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: join(results, 'library-light.png'), fullPage: true });
  report.screenshots.push('site/validation/results/library-light.png');
  await page.goto(`${server.origin}/items/${skill}/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  report.interactions.push('item page: 200% root text size has no page overflow at 1280px');
  await context.close();
  report.complete = true;
} catch (error) {
  report.error = { name: error.name, message: error.message };
  throw error;
} finally {
  await browser.close();
  await server.close();
  report.durationMs = Math.round(performance.now() - started);
  writeFileSync(reportFile, `${JSON.stringify(report, null, 2)}\n`);
}
const failures = report.pages.filter((p) => p.violations.length || p.overflow || p.duplicateIds.length || p.errors.length);
console.log(JSON.stringify({ checked: report.pages.length, failures: failures.length, interactions: report.interactions.length, report: reportFile }));
if (failures.length) process.exitCode = 1;

/** Focused Get it regression; run against a built snapshot with --getit-overflow. */
async function checkGetItOverflow() {
  const label = process.argv.find((arg) => arg.startsWith('--label='))?.slice(8) ?? 'current';
  assert.match(label, /^[a-z0-9-]+$/);
  const report = { complete: false, recordedAt: new Date().toISOString(), cases: [], screenshots: [] };
  const output = join(results, `getit-overflow-${label}.json`);
  const server = await serve();
  const browser = await chromium.launch({ executablePath: browserPath, headless: true });
  try {
    for (const width of [320, 1280]) {
      for (const colorScheme of ['dark', 'light']) {
        for (const contrast of ['more', 'no-preference']) {
          const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme, contrast, reducedMotion: 'reduce' });
          try {
            for (const route of ['/items/assumptions/', '/items/agentic-craft/', '/library/getitpanel-skill/']) {
              const page = await ctx.newPage();
              await page.goto(`${server.origin}${route}`, { waitUntil: 'networkidle' });
              await page.evaluate(() => document.fonts.ready);
              const plan = page.locator('.c-getit__plan:not([hidden])');
              const list = plan.getByRole('tablist');
              const tabs = list.getByRole('tab');
              const measure = () => plan.evaluate((el) => {
                const list = el.querySelector('[role=tablist]');
                const box = list.getBoundingClientRect();
                const field = el.querySelector('[role=tabpanel][data-tab=download] .f-copy__text');
                return {
                  pageWidth: document.documentElement.scrollWidth,
                  list: { clientWidth: list.clientWidth, scrollWidth: list.scrollWidth, scrollLeft: list.scrollLeft, left: box.left, right: box.right },
                  tabs: [...list.children].map((tab) => {
                    const r = tab.getBoundingClientRect();
                    return { label: tab.textContent.trim(), left: r.left, right: r.right, selected: tab.getAttribute('aria-selected') };
                  }),
                  sha: field && { text: field.textContent, clientWidth: field.clientWidth, scrollWidth: field.scrollWidth, height: field.clientHeight },
                };
              });
              const row = { route, width, height: 900, colorScheme, contrast, initial: await measure() };
              report.cases.push(row);
              assert.equal(row.initial.list.scrollLeft, 0, 'fresh navigation must expose Git');
              assert.equal(row.initial.tabs[0].label, 'Git');
              assert.ok(row.initial.tabs[0].left >= row.initial.list.left && row.initial.tabs[0].right <= row.initial.list.right);
              assert.equal(row.initial.pageWidth, width);
              await tabs.first().focus();
              row.keyboardGeometry = [];
              for (const key of ['End', 'Home', 'ArrowRight', 'Home']) {
                await page.keyboard.press(key);
                await page.evaluate(() => new Promise(requestAnimationFrame));
                const geometry = await measure();
                row.keyboardGeometry.push({ key, ...geometry });
                const selected = geometry.tabs.find((tab) => tab.selected === 'true');
                assert.ok(selected.left >= geometry.list.left - 1 && selected.right <= geometry.list.right + 1, `${key}: selected tab must be fully accessible`);
                assert.equal(await list.locator(':focus-visible').count(), 1, `${key}: keyboard focus is visible`);
              }
              row.keyboard = 'End/Home reach both tab-row edges; ArrowRight selects next tab with visible focus';
              for (let i = 0; i < await tabs.count(); i++) {
                await tabs.nth(i).click();
                const geometry = await measure();
                const selected = geometry.tabs[i];
                assert.equal(selected.selected, 'true');
                assert.ok(selected.left >= geometry.list.left - 1 && selected.right <= geometry.list.right + 1, `${selected.label}: tab is fully accessible after click`);
              }
              await plan.locator('[role=tab][data-tab=download]').click();
              row.download = await measure();
              const screenshot = join(results, `getit-overflow-${label}-${width}-${colorScheme}-${contrast}-${route.includes('library') ? 'library' : route.split('/')[2]}.png`);
              await plan.locator('[data-tabs]').screenshot({ path: screenshot });
              report.screenshots.push(relative(root, screenshot));
              assert.ok(row.download.sha, 'the fixture must include the new archive checksum');
              assert.match(row.download.sha.text, /^[a-f0-9]{64}$/);
              assert.equal(row.download.sha.scrollWidth, row.download.sha.clientWidth, 'the complete SHA256 must be readable without horizontal clipping');
              assert.equal(row.download.pageWidth, width);
              await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text) => { window.__copiedChecksum = text; } } }));
              const copy = plan.locator('[data-copy-label="Copy SHA256"]');
              await copy.click();
              assert.equal(await page.evaluate(() => window.__copiedChecksum), row.download.sha.text);
              assert.equal(await copy.getAttribute('data-copied'), 'true');
              const text = copy.locator('..').locator('pre');
              await text.focus();
              assert.equal(await text.evaluate((el) => el === document.activeElement), true);
              await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('test denial'); } } }));
              await copy.click();
              await copy.locator('..').locator('[role=status]:not(.u-visually-hidden)').waitFor();
              const selectedText = await page.evaluate(() => getSelection().toString());
              assert.equal(selectedText, row.download.sha.text);
              row.copy = 'all 64 characters copied; keyboard-focusable/selectable fallback after clipboard denial';
              await page.close();
            }
          } finally { await ctx.close(); }
        }
      }
    }
    report.complete = true;
  } catch (error) {
    report.error = error.message;
    throw error;
  } finally {
    await browser.close();
    await server.close();
    writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify({ cases: report.cases.length, complete: report.complete, report: output }));
  }
}
