import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32 } from 'node:zlib';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { loadCatalog, pinnedCheckoutBytes, sha256 } from '../scripts/lib/catalog.mjs';
import { checkPayload, deterministicZip, prepareArchives } from '../scripts/lib/archives.mjs';
import { buildModel } from '../scripts/lib/model.mjs';
import { catalogJson, itemJson, itemMarkdown } from '../scripts/lib/outputs.mjs';
import { assertOutput } from '../scripts/lib/schema.mjs';
import { setBase } from '../src/lib/urls.mjs';
import { card, fixture, skillMd } from './fixture.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

test('CRLF checkouts retain pinned Git hashes without concealing real text or binary changes', () => {
  const pinned = Buffer.from('Instructions\nResource\n');
  assert.deepEqual(pinnedCheckoutBytes(Buffer.from('Instructions\r\nResource\r\n'), pinned), pinned);
  const changed = Buffer.from('Other instructions\r\nResource\r\n');
  assert.equal(pinnedCheckoutBytes(changed, pinned), changed);
  const binary = Buffer.from([0, 13, 10]);
  assert.equal(pinnedCheckoutBytes(binary, Buffer.from([0, 10])), binary);
  assert.equal(pinnedCheckoutBytes(changed), changed);
});

function unzip(bytes, includeBytes = false) {
  const files = [];
  let at = 0;
  while (bytes.readUInt32LE(at) === 0x04034b50) {
    assert.equal(bytes.readUInt16LE(at + 8), 0);
    assert.equal(bytes.readUInt16LE(at + 10), 0);
    assert.equal(bytes.readUInt16LE(at + 12), 33);
    const size = bytes.readUInt32LE(at + 18);
    const nameSize = bytes.readUInt16LE(at + 26);
    const start = at + 30 + nameSize;
    const data = bytes.subarray(start, start + size);
    assert.equal(crc32(data), bytes.readUInt32LE(at + 14));
    files.push({ path: bytes.subarray(at + 30, start).toString(), size, sha256: sha256(data), ...(includeBytes ? { bytes: data } : {}) });
    at = start + size;
  }
  assert.equal(bytes.readUInt32LE(at), 0x02014b50);
  return files;
}

test('ZIP bytes are deterministic, ordered, checksum-valid and preserve binary data', () => {
  const files = [{ path: 'skill/z.bin', bytes: Buffer.from([0, 255, 10]) }, { path: 'skill/SKILL.md', bytes: Buffer.from('Instructions\n'), mode: '100755' }];
  const zip = deterministicZip(files);
  assert.deepEqual(zip, deterministicZip(files.toReversed()));
  assert.deepEqual(unzip(zip).map((f) => f.path), ['skill/SKILL.md', 'skill/z.bin']);
});

test('unsafe paths, case collisions and links cannot enter archives', () => {
  for (const path of ['../secret', '/absolute', 'x\\y', 'x/.git/config', '.env', 'x:stream', 'CON.txt', 'x/../y', 'x./y', 'x//y', 'x\nfile', 'file?.md', 'x*', 'a|b', 'quote"name', '<x>']) {
    assert.throws(() => deterministicZip([{ path, bytes: Buffer.from('x') }]), /Unsafe/);
  }
  assert.throws(() => deterministicZip([{ path: 'a', bytes: Buffer.alloc(0), mode: '120000' }]), /Unsafe/);
  assert.throws(() => deterministicZip(['a', 'A'].map((path) => ({ path, bytes: Buffer.alloc(0) }))), /Unsafe/);
  assert.throws(() => deterministicZip(['e\u0301', 'é'].map((path) => ({ path, bytes: Buffer.alloc(0) }))), /Unsafe/);
});

test('publication scan covers undisplayed text resources without leaking findings', () => {
  const secret = ['ghp_', 'A1'.repeat(20)].join('');
  assert.throws(() => checkPayload([{ path: 'resources/private.txt', bytes: Buffer.from(`token ${secret}`) }]), (e) => {
    assert.match(e.message, /publication check/);
    assert.ok(!e.message.includes(secret));
    return true;
  });
  assert.throws(() => checkPayload([{ path: 'resources/mixed.bin', bytes: Buffer.from(`\0token ${secret}`) }]), /publication check/);
});

test('download failures never publish local Git diagnostics or machine paths', () => {
  const missing = join(root, '.agent-orchestration', 'nonexistent-private-checkout');
  const item = { id: 'kit', type: 'kit', source: { local: true, commit: 'a'.repeat(40), path: 'kit' } };
  assert.deepEqual(prepareArchives({ root: missing, items: [item] }), []);
  assert.deepEqual(item.archive, { blocked: 'This pinned download could not be built. Use Git instead.' });
});

test('catalog fixtures do not inherit their parent repository pin or follow linked resources', () => {
  const dir = fixture({ tidy: { 'SKILL.md': skillMd('tidy'), 'about.md': card() } });
  try {
    assert.equal(loadCatalog(dir).head, null);
    const target = join(dir, 'outside');
    mkdirSync(target);
    writeFileSync(join(target, 'private.txt'), 'This resource must not be followed.');
    symlinkSync(target, join(dir, 'skills', 'tidy', 'linked'), process.platform === 'win32' ? 'junction' : 'dir');
    const catalog = loadCatalog(dir);
    assert.ok(catalog.problems.some((p) => p.message.includes('symbolic link')));
    assert.ok(!catalog.items[0].files.some((f) => f.path.includes('private.txt')));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('real item ZIPs, manifests, agent outputs and base-path download plans agree', () => {
  setBase('/loushing/', 'https://example.com');
  try {
    const catalog = loadCatalog(root);
    assert.deepEqual(catalog.problems, []);
    const artifacts = prepareArchives(catalog);
    const model = buildModel(catalog);
    const index = catalogJson(model);
    const safe = catalog.items.filter((item) => item.archive?.url);
    // Kits whose pinned payload fails the publication check: no local download, Git only.
    const blocked = ['slate'];
    assert.equal(safe.length, catalog.items.filter((i) => i.type !== 'stack' && !blocked.includes(i.id)).length, 'every skill and all three redistributable kits');
    for (const item of safe) {
      const zip = artifacts.find((a) => `/${a.path}` === item.archive.url).bytes;
      const manifest = JSON.parse(artifacts.find((a) => `/${a.path}` === item.archive.manifest).bytes);
      assert.equal(sha256(zip), manifest.sha256, item.id);
      assert.deepEqual(unzip(zip), manifest.files.map(({ path, size, sha256 }) => ({ path: `${item.id}/${path}`, size, sha256 })), item.id);
      if (item.type === 'skill') assert.deepEqual(manifest.files.map(({ path, size, sha256 }) => ({ path, size, sha256 })), item.files.map(({ path, size, sha256 }) => ({ path, size, sha256 })));
      const data = itemJson(item, model);
      assertOutput('item', data);
      assert.deepEqual(data.files.map(({ path, size, sha256, mode }) => ({ path, size, sha256, mode })), manifest.files, `${item.id}: item JSON has the full payload manifest`);
      for (const part of item.parts ?? []) for (const file of part.files) assert.equal(manifest.files.find((f) => f.path === file.path)?.sha256, file.sha256, `${item.id}: ${file.path}`);
      assert.deepEqual(index.items.find((i) => i.id === item.id).archive, data.archive);
      assert.ok(data.archive.url.startsWith('https://example.com/loushing/downloads/'));
      assert.ok(itemMarkdown(item, model).includes(data.archive.url));
      assert.ok(itemMarkdown(item, model).includes(data.archive.sha256));
      for (const plan of Object.values(data.install.plans).filter((p) => p.supported)) {
        assert.ok(plan.download.startsWith('/loushing/downloads/'));
        assert.ok(plan.downloadSteps.length >= 2);
      }
    }
    for (const id of blocked) {
      const kit = catalog.items.find((i) => i.id === id);
      assert.match(kit.archive.blocked, /publication check/, id);
      assert.ok(Object.values(kit.plans).every((p) => !p.download), id);
      assert.ok(artifacts.every((a) => !a.path.includes(`/${id}-`)), id);
    }
    const second = prepareArchives(loadCatalog(root));
    assert.deepEqual(artifacts, second, 'separate builds reproduce every byte');
  } finally { setBase(); }
});

test('ai-integration ships its complete pinned skill, installer and license without developer fixtures', () => {
  const catalog = loadCatalog(root);
  const kit = catalog.items.find((item) => item.id === 'ai-integration');
  prepareArchives({ root, items: [kit] });
  assert.ok(kit.archive.url, kit.archive.blocked);
  const paths = kit.archiveFiles.map((file) => file.path);
  for (const required of ['LICENSE', 'README.md', 'package.json', 'docs/intent.md', 'tools/install.mjs', 'skills/ai-integration/LICENSE', 'skills/ai-integration/scripts/lib/files.mjs']) {
    assert.ok(paths.includes(required), required);
  }
  for (const part of kit.parts) for (const file of part.files) {
    assert.equal(kit.archiveFiles.find((entry) => entry.path === file.path)?.sha256, file.sha256, file.path);
  }
  assert.ok(paths.every((path) => !/^(?:test|fixtures)\//.test(path)));
});

test('an explicit package cannot omit declared resources or license, bypass scanning, or select skill files', () => {
  const catalog = loadCatalog(root);
  const original = catalog.items.find((item) => item.id === 'ai-integration');
  for (const [packageFiles, message] of [
    [['LICENSE', 'README.md'], /omits declared parts/],
    [['skills/', 'tools/'], /include its LICENSE/],
    [[...original.packageFiles, 'test/'], /publication check/],
    [[...original.packageFiles, 'absent/'], /missing or empty/],
    [[...original.packageFiles, 'skills/ai-integration/'], /overlap/],
    [null, /nonempty array/],
  ]) {
    const kit = { ...original, packageFiles };
    assert.deepEqual(prepareArchives({ root, items: [kit] }), []);
    assert.match(kit.archive.blocked, message);
    assert.equal(kit.archiveFiles, undefined);
  }
  const skill = { ...catalog.items.find((item) => item.type === 'skill'), packageFiles: ['SKILL.md'] };
  assert.throws(() => prepareArchives({ root, items: [skill] }), /only supported for kits/);
});

test('the real ai-integration ZIP installs its full resource closure for github, agents and claude', () => {
  const catalog = loadCatalog(root);
  const kit = catalog.items.find((item) => item.id === 'ai-integration');
  const artifacts = prepareArchives({ root, items: [kit] });
  assert.ok(kit.archive.url, kit.archive.blocked);
  const zip = artifacts.find((entry) => `/${entry.path}` === kit.archive.url).bytes;
  const scratch = join(root, '.agent-orchestration');
  mkdirSync(scratch, { recursive: true });
  const dir = mkdtempSync(join(scratch, 'package-install-'));
  try {
    for (const { path, bytes } of unzip(zip, true)) {
      const destination = join(dir, path);
      mkdirSync(dirname(destination), { recursive: true });
      writeFileSync(destination, bytes);
    }
    const packageRoot = join(dir, kit.id);
    const canonical = kit.archiveFiles.filter((entry) => entry.path.startsWith('skills/ai-integration/'));
    for (const target of ['github', 'agents', 'claude']) {
      const project = join(dir, `project-${target}`);
      mkdirSync(project);
      const args = [join(packageRoot, 'tools', 'install.mjs'), project, '--target', target];
      const run = (extra = []) => JSON.parse(execFileSync(process.execPath, [...args, ...extra], { cwd: packageRoot, encoding: 'utf8' }));
      const dry = run(['--dry-run']);
      assert.equal(dry.dryRun, true);
      assert.equal(dry.fileCount, canonical.length);
      assert.deepEqual(readdirSync(project), [], `${target}: dry-run writes nothing`);
      const installed = run();
      assert.equal(installed.fileCount, canonical.length);
      const skillRoot = join(project, `.${target}`, 'skills', kit.id);
      for (const entry of canonical) {
        assert.equal(sha256(readFileSync(join(skillRoot, entry.path.slice('skills/ai-integration/'.length)))), entry.sha256, `${target}: ${entry.path}`);
      }
      assert.deepEqual(run(['--dry-run']).changes, [], `${target}: repeat install is exact`);
      for (const command of [['catalogue', 'validate'], ['profile', 'validate', 'assets/profile.example.json'], ['profile', 'plan', 'assets/profile.example.json']]) {
        execFileSync(process.execPath, ['scripts/ai.mjs', ...command], { cwd: skillRoot, stdio: 'pipe' });
      }
      assert.deepEqual(readdirSync(project), [`.${target}`], 'no project instruction or personal files changed');
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('a kit payload beyond its declared parts still publishes schema-valid file roles', () => {
  const catalog = loadCatalog(root);
  const kits = catalog.items.filter((i) => i.type === 'kit' && i.id !== 'slate');
  prepareArchives({ root: catalog.root, items: kits });
  const model = buildModel(catalog);
  for (const kit of kits.filter((k) => k.archive?.url)) {
    const extra = kit.archiveFiles.filter((file) => !(kit.files ?? []).some((f) => f.path === file.path));
    assert.ok(extra.length, `${kit.id}: the payload includes files outside the declared parts`);
    for (const file of extra) {
      assert.equal(typeof file.role, 'string', `${kit.id}: ${file.path}`);
      assert.equal(typeof file.runs, 'boolean', `${kit.id}: ${file.path}`);
      if (/\.(mjs|js|py|sh|ps1)$/.test(file.path)) assert.equal(file.runs, true, `${kit.id}: ${file.path} is code`);
    }
    assertOutput('item', itemJson(kit, model));
  }
});

test('a skill cannot claim pinned hashes for changed or untracked working files', () => {
  const catalog = loadCatalog(root);
  catalog.items.find((i) => i.type === 'skill').files.push({ path: 'private.txt', size: 1, sha256: 'x' });
  assert.throws(() => prepareArchives(catalog), /differ from the pinned commit/);
  const preview = prepareArchives(catalog, { preview: true });
  const changed = catalog.items.find((i) => i.type === 'skill');
  assert.match(changed.archive.blocked, /differ from the pinned commit/);
  assert.ok(preview.every((a) => !a.path.startsWith(`downloads/${changed.id}-`)));
});
