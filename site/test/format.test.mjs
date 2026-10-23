import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatDate } from '../src/components/compounds/format.mjs';

test('dates read in each style, with the compact year as an apostrophe and two digits', () => {
  assert.equal(formatDate('2026-10-23'), '23 October 2026');
  assert.equal(formatDate('2026-10-23', 'short'), '23 Oct 2026');
  assert.equal(formatDate('2026-10-23', 'compact'), '23 Oct \u201926');
  assert.equal(formatDate('2026-10-23', 'month'), 'October 2026');
  assert.equal(formatDate('not a date'), '');
});
