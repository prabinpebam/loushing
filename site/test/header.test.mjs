import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { Shell } from '../src/layouts/layouts.mjs';
import { Link } from '../src/components/fundamentals.mjs';

const shell = (headerSearch) => String(Shell({
  title: 'Loushing', path: '/catalog', layout: 'landing', main: '',
  assets: { css: [], js: '/assets/client/app.js' }, chopper: { renders: 0 }, headerSearch,
}));

test('the responsive header has one native menu and one copy of every control', () => {
  for (const headerSearch of [false, true]) {
    const markup = shell(headerSearch);
    const header = markup.match(/<header class="l-header">([\s\S]*?)<\/header>/)[1];
    assert.match(header, /<details class="l-header__menu" data-header-menu>/);
    assert.match(header, /<summary[^>]*aria-label="Open menu"[^>]*aria-controls="header-menu"[^>]*><svg/);
    for (const selector of ['data-header-menu', 'data-theme-toggle', 'data-lighting-toggle', 'data-lighting-panel']) {
      assert.equal((header.match(new RegExp(`\\b${selector}(?:=|[\\s>])`, 'g')) ?? []).length, 1, selector);
    }
    assert.equal((header.match(/<nav /g) ?? []).length, 1);
    assert.equal((header.match(/data-standalone="true"/g) ?? []).length, 4);
    assert.match(header, /aria-current="page"/);
    assert.equal((header.match(/id="header-search"/g) ?? []).length, Number(headerSearch));
    assert.match(header, /<\/details>\s*<details class="c-lighting"/, 'lighting stays outside the scrollable menu');
    const ids = [...markup.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
    assert.equal(ids.length, new Set(ids).size);
  }
});

test('standalone links opt into a control-height target without changing inline links', () => {
  assert.match(String(Link({ href: '/', label: 'Catalog', standalone: true })), /data-standalone="true"/);
  assert.doesNotMatch(String(Link({ href: '/', label: 'Catalog' })), /data-standalone/);
});

test('header breakpoints scale with enlarged text through their named container', () => {
  const css = readFileSync(new URL('../src/styles/layouts.css', import.meta.url), 'utf8');
  assert.match(css, /\.l-header\s*\{[^}]*container-type:\s*inline-size/);
  assert.match(css, /@container titlebar \(min-width: 72rem\)/);
  assert.match(css, /@container titlebar \(min-width: 90rem\)/);
});

test('new-tab links isolate the opener and announce their behavior without changing existing links', () => {
  const link = String(Link({ href: 'https://prabinpebam.github.io/atiya', label: 'More of my work', external: true, newTab: true }));
  assert.match(link, /target="_blank"/);
  assert.match(link, /rel="noopener"/);
  assert.match(link, /title="More of my work \(opens in a new tab\)"/);
  assert.match(link, /<span class="u-visually-hidden"> \(opens in a new tab\)<\/span>/);
  assert.match(link, /class="f-link__ext"/);
  for (const external of [false, true]) {
    const existing = String(Link({ href: 'https://github.com/prabinpebam', label: 'Prabin Pebam', external }));
    assert.doesNotMatch(existing, /target=|opens in a new tab/);
  }
});

test('the shared footer offers the personal site without crowding the title bar', () => {
  const markup = shell(true);
  const header = markup.match(/<header class="l-header">([\s\S]*?)<\/header>/)[1];
  const footer = markup.match(/<footer class="l-footer"[\s\S]*?<\/footer>/)[0];
  assert.doesNotMatch(header, /prabinpebam\.github\.io\/atiya/);
  assert.match(footer, /<a[^>]*href="https:\/\/prabinpebam\.github\.io\/atiya"[^>]*target="_blank"[^>]*>More of my work/);
  assert.match(footer, /href="https:\/\/github\.com\/prabinpebam\/loushing"/);
});

function fixture() {
  const doc = new EventTarget();
  const view = new EventTarget();
  const node = () => Object.assign(new EventTarget(), {
    open: false, attributes: {}, display: 'grid',
    setAttribute(key, value) { this.attributes[key] = value; },
    focus() {
      doc.activeElement = this;
      const event = new Event('focusin');
      Object.defineProperty(event, 'target', { value: this });
      doc.dispatchEvent(event);
    },
    checkVisibility() { return this.display !== 'none'; },
  });
  const menu = node(), trigger = node(), lighting = node(), brand = node(), link = node(), outside = node();
  menu.querySelector = () => trigger;
  menu.contains = (target) => [menu, trigger, link].includes(target);
  doc.querySelector = (selector) => ({
    '[data-header-menu]': menu, '[data-lighting-panel]': lighting, '.l-header__brand': brand,
  })[selector] ?? null;
  const code = readFileSync(new URL('../src/client/header.js', import.meta.url), 'utf8');
  runInNewContext(`${code.replace('export function', 'function')}\ninitHeader();`, {
    document: doc, addEventListener: view.addEventListener.bind(view), getComputedStyle: (element) => element,
  });
  const event = (target, type, props = {}) => {
    const e = new Event(type, { cancelable: true });
    for (const [key, value] of Object.entries(props)) Object.defineProperty(e, key, { value });
    target.dispatchEvent(e);
    return e;
  };
  return { doc, view, menu, trigger, lighting, brand, link, outside, event };
}

test('header menus update their name and never leave both panels open', () => {
  const { menu, trigger, lighting, event } = fixture();
  menu.open = lighting.open = true;
  event(menu, 'toggle');
  assert.equal(lighting.open, false);
  assert.equal(trigger.attributes['aria-label'], 'Close menu');
  assert.equal(trigger.title, 'Close menu');
  lighting.open = true;
  event(lighting, 'toggle');
  assert.equal(menu.open, false);
  event(menu, 'toggle');
  assert.equal(trigger.attributes['aria-label'], 'Open menu');
});

test('Escape dismisses an open menu and returns focus without affecting ordinary keys', () => {
  const { doc, menu, trigger, event } = fixture();
  menu.open = true;
  assert.equal(event(menu, 'keydown', { key: 'Tab' }).defaultPrevented, false);
  assert.equal(menu.open, true);
  assert.equal(event(menu, 'keydown', { key: 'Escape' }).defaultPrevented, true);
  assert.equal(menu.open, false);
  assert.equal(doc.activeElement, trigger);
});

test('outside clicks dismiss the menu without stealing focus from another control', () => {
  const { doc, menu, trigger, link, outside, event } = fixture();
  menu.open = true;
  link.focus();
  event(doc, 'click', { target: link });
  assert.equal(menu.open, true);
  event(doc, 'click', { target: outside });
  assert.equal(menu.open, false);
  assert.equal(doc.activeElement, trigger);
  menu.open = true;
  outside.focus();
  event(doc, 'click', { target: outside });
  assert.equal(doc.activeElement, outside);
});

test('expanding to inline navigation closes the menu and never leaves focus on a hidden trigger', () => {
  const { doc, view, menu, trigger, brand, event } = fixture();
  menu.open = true;
  trigger.focus();
  event(view, 'resize');
  assert.equal(menu.open, true, 'compact resizes preserve an open menu');
  trigger.display = 'none';
  event(view, 'resize');
  assert.equal(menu.open, false);
  assert.equal(doc.activeElement, brand);
});

test('collapsing navigation returns focus from a hidden link to the menu trigger', () => {
  const { doc, view, menu, trigger, link, event } = fixture();
  link.focus();
  event(view, 'resize');
  assert.equal(menu.open, false);
  assert.equal(doc.activeElement, trigger);
});

test('a desktop resize never leaves focus in a hidden search field', () => {
  const { doc, view, trigger, link, brand, event } = fixture();
  trigger.display = link.display = 'none';
  link.focus();
  event(view, 'resize');
  assert.equal(doc.activeElement, brand);
});

test('Tab can leave the menu and dismiss it without trapping or moving focus', () => {
  const { doc, menu, link, outside, event } = fixture();
  menu.open = true;
  link.focus();
  event(menu, 'focusout', { relatedTarget: link });
  assert.equal(menu.open, true);
  outside.focus();
  event(menu, 'focusout', { relatedTarget: outside });
  assert.equal(menu.open, false);
  assert.equal(doc.activeElement, outside);
});

test('resize restores focus even when the browser blurs hidden controls before notifying listeners', () => {
  const { doc, view, trigger, link, outside, brand, event } = fixture();
  link.focus();
  doc.activeElement = outside;
  event(view, 'resize');
  assert.equal(doc.activeElement, trigger);
  trigger.display = 'none';
  doc.activeElement = outside;
  event(view, 'resize');
  assert.equal(doc.activeElement, brand);
});
