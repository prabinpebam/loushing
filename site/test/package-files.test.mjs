import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { packageFilesProblem, selectPackageFiles } from '../scripts/lib/package-files.mjs';
import { loadCatalog } from '../scripts/lib/catalog.mjs';
import { fixture } from './fixture.mjs';

const file = (path, extra = {}) => ({ path, type: 'blob', mode: '100644', size: 12, ...extra });

test('package roots select complete directories and exact files, never similarly named siblings', () => {
  const entries = ['LICENSE', 'skills/main/SKILL.md', 'skills/main/references/nested/guide.md', 'skills-other/private.md', 'test/private.mjs'].map((path) => file(path));
  assert.deepEqual(selectPackageFiles(entries, ['LICENSE', 'skills/']), entries.slice(0, 3));
  assert.deepEqual(selectPackageFiles(entries), entries, 'no selection retains the full tree');
});

test('package selectors reject invalid shapes, traversal, reserved names, globs and collisions', () => {
  for (const paths of [null, {}, 'skills/', [], [null], [12], [''], ['/'], ['../x'], ['/absolute'], ['C:/x'], ['a\\b'], ['a//b'], ['a/./b'], ['a/../b'], ['.git/'], ['.env'], ['node_modules/'], ['CON'], ['name.'], ['x\nfile'], ['skills/*'], ['a', 'A'], ['é', 'e\u0301']]) {
    assert.ok(packageFilesProblem(paths), JSON.stringify(paths));
    assert.throws(() => selectPackageFiles([file('LICENSE')], paths), /packageFiles/, JSON.stringify(paths));
  }
  assert.throws(() => selectPackageFiles([file('skills/main/SKILL.md')], ['missing/']), /missing or empty/);
  assert.throws(() => selectPackageFiles([file('skills/main/SKILL.md')], ['skills']), /missing or empty/);
  assert.throws(() => selectPackageFiles([file('skills/main/SKILL.md')], ['skills/', 'skills/main/']), /overlap/);
});

test('selected payloads reject symlinks, gitlinks, collisions and oversized metadata before reading blobs', () => {
  for (const entry of [
    file('skills/link', { mode: '120000' }),
    file('skills/nested', { mode: '160000', type: 'commit' }),
    file('skills/../outside'),
    file('skills/.env'),
  ]) assert.throws(() => selectPackageFiles([entry], ['skills/']), /unsafe path, link or nested repository/);
  assert.throws(() => selectPackageFiles([file('A'), file('a')]), /colliding paths/);
  for (const size of [-1, NaN, Infinity, 1.5]) assert.throws(() => selectPackageFiles([file('a', { size })]), /invalid file size/);
  assert.throws(() => selectPackageFiles([file('a', { size: 64 * 1024 * 1024 + 1 })]), /download budget/);
  assert.throws(() => selectPackageFiles(Array.from({ length: 10001 }, (_, i) => file(`${i}`))), /download budget/);
  assert.equal(selectPackageFiles([file('a', { size: 64 * 1024 * 1024 })]).length, 1);
});

test('catalog check reports malformed package declarations and refuses skill selection', () => {
  const root = fixture({});
  try {
    mkdirSync(join(root, 'external'));
    for (const [type, paths, expected] of [['kit', '[]', /nonempty array/], ['kit', '[../outside]', /unsafe path/], ['skill', '[LICENSE]', /only supported for kits/]]) {
      writeFileSync(join(root, 'external', 'example.yaml'), `id: example\ntype: ${type}\npackageFiles: ${paths}\nsource: { repo: https://example.com/kit, ref: ${'a'.repeat(40)} }\n`);
      assert.match(loadCatalog(root).problems.map((p) => p.message).join('\n'), expected);
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
});
