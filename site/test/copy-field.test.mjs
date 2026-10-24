import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { CopyField } from '../src/components/fundamentals.mjs';

test('copy controls are icon-only with named tooltips, feedback icons and a live status', () => {
  for (const copyLabel of ['Copy command', 'Copy prompt']) {
    const markup = String(CopyField({ lines: ['echo "<hello>"', 'next command'], copyLabel }));
    const button = markup.match(/<button\b([^>]*)>([\s\S]*?)<\/button>/);
    assert.ok(button);
    assert.ok(button[1].includes(`aria-label="${copyLabel}"`));
    assert.ok(button[1].includes(`title="${copyLabel}"`));
    assert.equal(button[2].replace(/<[^>]+>/g, '').trim(), '');
    assert.match(button[2], /class="f-copy__idle"/);
    assert.match(button[2], /class="f-copy__done" hidden/);
    assert.match(markup, /class="f-copy__status u-visually-hidden" role="status"/);
    assert.match(markup, /<code>echo &quot;&lt;hello&gt;&quot;\nnext command<\/code>/);
  }
});

function fixture(writeText) {
  const button = {
    dataset: { copy: 'echo hello\nnext command', copyLabel: 'Copy command' },
    attributes: {}, setAttribute(key, value) { this.attributes[key] = value; },
  };
  const status = {
    textContent: '', classes: new Set(['u-visually-hidden']),
    classList: { add(name) { status.classes.add(name); }, remove(name) { status.classes.delete(name); } },
  };
  const idle = { hidden: false }, done = { hidden: true }, pre = {};
  button.parentElement = {
    querySelector: (selector) => ({ '.f-copy__status': status, pre })[selector],
  };
  button.querySelector = (selector) => ({ '.f-copy__idle': idle, '.f-copy__done': done })[selector];
  const timers = new Map(), selected = [], warnings = [];
  let listener, timerId = 0;
  const source = readFileSync(new URL('../src/client/app.js', import.meta.url), 'utf8');
  const init = source.slice(source.indexOf('function initCopy()'), source.indexOf('/* Theme:'));
  runInNewContext(`${init}\ninitCopy();`, {
    document: { addEventListener(type, handler) { assert.equal(type, 'click'); listener = handler; } },
    $: (selector, parent) => parent.querySelector(selector),
    navigator: { clipboard: { writeText } },
    getSelection: () => ({ selectAllChildren: (element) => selected.push(element) }),
    console: { warn: (...args) => warnings.push(args) },
    setTimeout: (callback, delay) => { assert.equal(delay, 2000); timers.set(++timerId, callback); return timerId; },
    clearTimeout: (id) => timers.delete(id),
  });
  const click = (target = button) => listener({ target: { closest: () => target } });
  return { button, status, idle, done, timers, selected, warnings, pre, click };
}

test('successful copying preserves the exact code, confirms with a check and resets the accessible name', async () => {
  const copied = [];
  const f = fixture(async (text) => copied.push(text));
  await f.click();
  assert.deepEqual(copied, ['echo hello\nnext command']);
  assert.equal(f.button.dataset.copied, 'true');
  assert.equal(f.button.attributes['aria-label'], 'Copied');
  assert.equal(f.button.title, 'Copied');
  assert.equal(f.status.textContent, 'Copied');
  assert.ok(f.status.classes.has('u-visually-hidden'));
  assert.equal(f.idle.hidden, true);
  assert.equal(f.done.hidden, false);
  [...f.timers.values()][0]();
  assert.equal(f.button.dataset.copied, undefined);
  assert.equal(f.button.attributes['aria-label'], 'Copy command');
  assert.equal(f.button.title, 'Copy command');
  assert.equal(f.idle.hidden, false);
  assert.equal(f.done.hidden, true);
  assert.equal(f.status.textContent, '');
});

test('a failed copy selects the original code and leaves a visible, announced instruction', async () => {
  const error = new Error('Clipboard denied');
  const f = fixture(async () => { throw error; });
  await f.click();
  assert.deepEqual(f.selected, [f.pre]);
  assert.equal(f.warnings[0][1], error);
  assert.match(f.status.textContent, /Couldn’t copy.*copy it manually/);
  assert.equal(f.status.classes.has('u-visually-hidden'), false);
  assert.equal(f.button.dataset.copied, undefined);
  assert.equal(f.button.attributes['aria-label'], 'Copy command');
  assert.equal(f.idle.hidden, false);
  assert.equal(f.done.hidden, true);
  assert.equal(f.timers.size, 0, 'the error stays until retry instead of disappearing');
});

test('retry clears stale errors and cancels prior success timers', async () => {
  let calls = 0;
  const f = fixture(async () => { if (++calls === 1) throw new Error('Clipboard denied'); });
  await f.click();
  await f.click();
  assert.equal(f.status.textContent, 'Copied');
  assert.ok(f.status.classes.has('u-visually-hidden'));
  await f.click();
  assert.equal(f.timers.size, 1);
  await f.click(null);
  assert.equal(calls, 3, 'unrelated clicks do not copy');
});
