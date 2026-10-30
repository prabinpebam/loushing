/**
 * Loads the catalog source (skills/, external/, stacks/, catalog/taxonomy.yaml),
 * reads kits at their pinned commits through Git, validates every card, and returns
 * one in-memory catalog the site, the index and the agent files are built from.
 *
 * Every problem is reported as { file, message, fix } so the check can say what to do.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, join, posix, relative, resolve } from 'node:path';
import { frontMatter, parseYaml } from '../../src/lib/yaml.mjs';
import { plainText, sections } from '../../src/lib/markdown.mjs';
import { scanText } from './publication.mjs';
import { contractProblem } from '../../src/lib/kit-contract.mjs';
import { lifecycleProblems } from '../../src/lib/lifecycle.mjs';
import { loadReleases } from './releases.mjs';

export const RELATIONS = ['pairsWith', 'feedsInto', 'requires', 'partOf', 'alternativeTo', 'replacedBy'];
const BODY_ORDER = ['What it does', 'How it works', 'Try it', 'What it adds to your project', 'Good to know'];
const BODY_REQUIRED = ['What it does', 'How it works', 'What it adds to your project', 'Good to know'];
const STACK_BODY = ['What it does', 'After setup', 'Good to know'];
const TEXT_LIMIT = 200 * 1024;
const SKILL_LIMITS = { bytes: 5 * 1024 * 1024, files: 50 };

export function git(cwd, args, { buffer = false } = {}) {
  return execFileSync('git', args, { cwd, encoding: buffer ? 'buffer' : 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
}

function tryGit(cwd, args, opts) {
  try {
    return git(cwd, args, opts);
  } catch {
    return null;
  }
}

export const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

export function globToRegExp(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*' && glob[i + 1] === '*') { re += '.*'; i++; }
    else if (c === '*') re += '[^/]*';
    else if (c === '?') re += '[^/]';
    else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
}

const isBinary = (buf) => buf.subarray(0, 8000).includes(0);

/** A CRLF checkout is the same pinned text, not a different distributable payload. */
export function pinnedCheckoutBytes(working, pinned) {
  if (!pinned || isBinary(working) || isBinary(pinned)) return working;
  const normalized = Buffer.from(working.toString('utf8').replace(/\r\n/g, '\n'));
  return normalized.equals(pinned) ? pinned : working;
}

/** Runs the publication check over one file's text and reports each finding as a problem. */
function checkPublication(file, text, problem) {
  for (const f of scanText(text)) problem(file, `publication check: ${f.what} on line ${f.line} (${f.excerpt})`, f.fix);
}

function normRepo(url) {
  return String(url ?? '').trim().replace(/\.git$/, '').replace(/\/$/, '').replace(/^git@github\.com:/, 'https://github.com/').toLowerCase();
}

export function repoSlug(url) {
  return normRepo(url).replace(/^https:\/\/github\.com\//, '');
}

/** Maps repository URLs to local submodule checkouts, so the build can read kits offline. */
function localCheckouts(root) {
  const out = new Map();
  const listing = tryGit(root, ['config', '-f', '.gitmodules', '--get-regexp', '^submodule\\..*\\.(path|url)$']);
  if (!listing) return out;
  const paths = {};
  const urls = {};
  for (const line of listing.trim().split(/\r?\n/)) {
    const m = /^submodule\.(.+)\.(path|url) (.+)$/.exec(line);
    if (m) (m[2] === 'path' ? paths : urls)[m[1]] = m[3];
  }
  for (const name of Object.keys(paths)) if (urls[name]) out.set(normRepo(urls[name]), join(root, paths[name]));
  return out;
}

export function loadCatalog(root, { now = new Date() } = {}) {
  const problems = [];
  const problem = (file, message, fix) => problems.push({ file: relative(root, file).split('\\').join('/') || file, message, fix });

  const taxonomyFile = join(root, 'catalog', 'taxonomy.yaml');
  let taxonomy;
  try {
    taxonomy = parseYaml(readFileSync(taxonomyFile, 'utf8'));
  } catch (e) {
    problem(taxonomyFile, `can't read the taxonomy: ${e.message}`, 'Fix the YAML at the line named.');
    return { problems, items: [], taxonomy: { areas: [], tags: [], agents: [], effects: [], statuses: [] } };
  }
  const vocab = {
    areas: new Set(taxonomy.areas.map((a) => a.id)),
    tags: new Set(taxonomy.tags),
    agents: new Set(taxonomy.agents.map((a) => a.id)),
    effects: new Set(taxonomy.effects.map((e) => e.id)),
    statuses: new Set(taxonomy.statuses.map((s) => s.id)),
  };

  const items = [];
  const repoUrl = normRepo(tryGit(root, ['config', '--get', 'remote.origin.url']) ?? 'https://github.com/prabinpebam/loushing');
  const gitRoot = tryGit(root, ['rev-parse', '--show-toplevel'])?.trim();
  const samePath = (a, b) => process.platform === 'win32' ? resolve(a).toLowerCase() === resolve(b).toLowerCase() : resolve(a) === resolve(b);
  const repoHead = gitRoot && samePath(gitRoot, root)
    ? tryGit(root, ['rev-parse', 'HEAD'])?.trim() ?? null : null;
  const pinnedSkillPaths = repoHead
    ? git(root, ['ls-tree', '-rz', '--name-only', repoHead, '--', 'skills'], { buffer: true }).toString('utf8').split('\0').filter((p) => p && !/[\r\n]/.test(p))
    : [];
  const pinnedSkills = repoHead ? readBlobs(root, repoHead, pinnedSkillPaths) : new Map();
  const lastChange = (path) => tryGit(root, ['log', '-1', '--format=%cI', '--', path])?.trim() || null;
  const firstAdded = (path) => tryGit(root, ['log', '--diff-filter=A', '--format=%cI', '--', path])?.trim().split(/\r?\n/).pop() || null;

  // Skills that live in Loushing.
  const skillsDir = join(root, 'skills');
  if (existsSync(skillsDir)) {
    for (const id of readdirSync(skillsDir).sort()) {
      const dir = join(skillsDir, id);
      if (lstatSync(dir).isSymbolicLink()) {
        problem(dir, 'a skill folder is a symbolic link', 'Replace it with reviewed, regular files inside the catalog.');
        continue;
      }
      if (!statSync(dir).isDirectory()) continue;
      const item = loadSkill(root, dir, id, problem, pinnedSkills);
      if (!item) continue;
      item.updated = lastChange(relative(root, dir)) ?? fileDate(dir);
      item.added = firstAdded(relative(root, dir)) ?? item.updated;
      item.source = { repo: repoUrl, path: `skills/${id}`, commit: repoHead, local: true };
      items.push(item);
    }
  }

  // Kits and moved skills that live in their own repositories.
  const extDir = join(root, 'external');
  const checkouts = localCheckouts(root);
  if (existsSync(extDir)) {
    for (const f of readdirSync(extDir).filter((n) => n.endsWith('.yaml')).sort()) {
      const item = loadPointer(root, join(extDir, f), checkouts, problem);
      if (!item) continue;
      item.added = firstAdded(relative(root, join(extDir, f))) ?? item.updated;
      items.push(item);
    }
  }

  // Stacks.
  const stacksDir = join(root, 'stacks');
  if (existsSync(stacksDir)) {
    for (const f of readdirSync(stacksDir).filter((n) => n.endsWith('.md')).sort()) {
      const file = join(stacksDir, f);
      const { data, body } = readCard(file, problem);
      if (!data) continue;
      checkPublication(file, readFileSync(file, 'utf8'), problem);
      const item = { ...data, id: data.id ?? basename(f, '.md'), type: 'stack', body, file };
      if (item.id !== basename(f, '.md')) problem(file, `the id "${item.id}" differs from the file name`, `Rename the file to ${item.id}.md, or change the id.`);
      item.updated = lastChange(relative(root, file)) ?? fileDate(file);
      item.added = firstAdded(relative(root, file)) ?? item.updated;
      item.source = { repo: repoUrl, path: `stacks/${f}`, commit: repoHead, local: true };
      items.push(item);
    }
  }

  const byId = new Map();
  for (const item of items) {
    if (byId.has(item.id)) problem(item.file, `the id "${item.id}" is used twice`, 'Give each item its own id; ids are never reused.');
    byId.set(item.id, item);
  }
  for (const item of items) {
    validateCard(item, vocab, byId, problem);
    if (item.visibility !== undefined && item.visibility !== 'public') problem(item.file, 'non-public item cannot enter the public catalog', 'Keep private items in an explicit local source outside this public catalog.');
  }
  const lifecycleFile = join(root, 'catalog', 'lifecycle.json');
  let lifecycle = { version: 1, aliases: {}, removed: {} };
  if (existsSync(lifecycleFile)) {
    try { lifecycle = JSON.parse(readFileSync(lifecycleFile, 'utf8')); }
    catch { problem(lifecycleFile, 'invalid lifecycle JSON', 'Correct the lifecycle JSON before building.'); }
  }
  for (const message of lifecycleProblems(lifecycle, items)) problem(lifecycleFile, message, 'Use unique retired IDs, existing targets and acyclic aliases.');
  let releaseRegistry;
  try { releaseRegistry = loadReleases(root); }
  catch (error) { problem(join(root, 'catalog', 'releases.json'), error.message, 'Restore the immutable artifacts and explicitly choose an existing release channel.'); }
  linkStandaloneSkills(items, problem);
  const relations = buildRelations(items, byId);
  for (const item of items) {
    item.sections = sections(item.body);
    item.text = plainText(item.body);
    item.areaTitle = taxonomy.areas.find((a) => a.id === item.area)?.title ?? item.area;
    item.related = relations.get(item.id) ?? [];
    item.url = `/items/${item.id}`;
  }

  return { root, taxonomy, items, byId, problems, lifecycle, releaseRegistry, repo: repoUrl, head: repoHead, generated: now.toISOString() };
}

/** Validates source identities and links kit parts to independently installable adaptations. */
export function linkStandaloneSkills(items, problem) {
  const byId = new Map(items.map((item) => [item.id, item]));
  const linked = new Set();
  for (const item of items) {
    if (item.derivedFrom === undefined) continue;
    const source = item.derivedFrom;
    if (item.type !== 'skill' || !source || typeof source !== 'object' || Array.isArray(source)
      || typeof source.kit !== 'string' || typeof source.skill !== 'string') {
      problem(item.file, 'derivedFrom needs a kit id and a skill name on a skill card', 'Use derivedFrom: { kit: kit-id, skill: canonical-skill-name }.');
      continue;
    }
    const kit = byId.get(source.kit);
    const part = kit?.type === 'kit' ? kit.parts.find((p) => p.kind === 'skill' && p.name === source.skill) : null;
    if (!part) {
      problem(item.file, `derivedFrom names no skill "${source.skill}" in kit "${source.kit}"`, 'Use the kit id and skill name shown on its pinned part page.');
      continue;
    }
    const key = `${source.kit}/${source.skill}`;
    if (linked.has(key)) {
      problem(item.file, `the kit skill "${key}" has more than one standalone version`, 'Keep one independent skill card for each source skill.');
      continue;
    }
    linked.add(key);
    part.standalone = { id: item.id, title: item.title, url: `/items/${item.id}` };
  }
}

function fileDate(path) {
  return statSync(path).mtime.toISOString();
}

function readCard(file, problem) {
  try {
    const { data, body } = frontMatter(readFileSync(file, 'utf8'));
    if (!data || typeof data !== 'object') {
      problem(file, 'the card has no front matter', 'Start the file with --- and the card fields, then --- and the page body.');
      return {};
    }
    return { data, body };
  } catch (e) {
    problem(file, `can't read the card's front matter: ${e.message}`, 'Fix the YAML at the line named (counted from the first ---).');
    return {};
  }
}

function loadSkill(root, dir, id, problem, pinnedSkills) {
  const skillFile = join(dir, 'SKILL.md');
  const aboutFile = join(dir, 'about.md');
  for (const file of [skillFile, aboutFile]) {
    if (existsSync(file) && lstatSync(file).isSymbolicLink()) {
      problem(file, 'a skill entry or card is a symbolic link', 'Replace the link with a reviewed, regular file.');
      return null;
    }
  }
  if (!existsSync(skillFile)) {
    problem(dir, 'the skill folder has no SKILL.md', 'Add SKILL.md with name and description front matter (Agent Skills format).');
    return null;
  }
  if (!existsSync(aboutFile)) {
    problem(dir, 'the skill has no about.md card', 'Ask your agent to draft about.md from SKILL.md, then review it.');
    return null;
  }
  const skill = frontMatter(readFileSync(skillFile, 'utf8')).data ?? {};
  if (skill.name !== id) problem(skillFile, `SKILL.md's name "${skill.name}" differs from the folder "${id}"`, `Set name: ${id} in SKILL.md, or rename the folder.`);
  const { data, body } = readCard(aboutFile, problem);
  if (!data) return null;
  if (data.id && data.id !== id) problem(aboutFile, `the card's id "${data.id}" differs from the folder "${id}"`, `Use id: ${id}, or leave id out.`);
  const files = [];
  let bytes = 0;
  const walk = (d) => {
    for (const n of readdirSync(d).sort()) {
      const p = join(d, n);
      if (lstatSync(p).isSymbolicLink()) {
        problem(p, 'a skill contains a symbolic link', 'Replace the link with reviewed, regular files inside the skill folder.');
        continue;
      }
      if (statSync(p).isDirectory()) walk(p);
      else {
        const working = readFileSync(p);
        const sourcePath = relative(root, p).split('\\').join('/');
        const buf = pinnedCheckoutBytes(working, pinnedSkills.get(sourcePath));
        bytes += buf.length;
        const rel = relative(dir, p).split('\\').join('/');
        if (!isBinary(buf)) checkPublication(p, buf.toString('utf8'), problem);
        if (rel === 'about.md') continue;
        files.push(fileEntry(rel, buf));
      }
    }
  };
  walk(dir);
  if (bytes > SKILL_LIMITS.bytes || files.length > SKILL_LIMITS.files) problem(dir, `the skill is ${(bytes / 1048576).toFixed(1)} MB in ${files.length} files`, 'Skills inside Loushing stay under 5 MB and 50 files; give it its own repository and a pointer.');
  if (files.some((f) => f.path.startsWith('scripts/')) && !(data.effects ?? []).includes('runs-scripts')) {
    problem(aboutFile, 'the skill has scripts but its card doesn\'t declare runs-scripts', 'Add runs-scripts to effects.');
  }
  return { ...data, id, type: 'skill', body, file: aboutFile, skill: { name: skill.name, description: skill.description }, files };
}

export function fileRole(path) {
  return path === 'SKILL.md' ? 'instructions' : path.startsWith('scripts/') ? 'script' : path.startsWith('references/') ? 'reference' : path.startsWith('assets/') || path.startsWith('templates/') ? 'template' : 'file';
}

function fileEntry(path, buf) {
  const binary = isBinary(buf);
  const role = fileRole(path);
  return { path, size: buf.length, sha256: sha256(buf), role, runs: role === 'script', text: !binary && buf.length <= TEXT_LIMIT ? buf.toString('utf8') : null };
}

function loadPointer(root, file, checkouts, problem) {
  let p;
  try {
    const text = readFileSync(file, 'utf8');
    checkPublication(file, text, problem);
    p = parseYaml(text);
  } catch (e) {
    problem(file, `can't read the pointer: ${e.message}`, 'Fix the YAML at the line named.');
    return null;
  }
  const id = basename(file, '.yaml');
  if (p.id !== id) problem(file, `the pointer's id "${p.id}" differs from its file name`, `Use id: ${id}.`);
  const src = p.source ?? {};
  if (!src.repo || !src.ref) {
    problem(file, 'the pointer needs source.repo and source.ref', 'Add the repository URL and a release tag or full commit.');
    return null;
  }
  const local = checkouts.get(normRepo(src.repo));
  if (!local || !existsSync(local)) {
    problem(file, `no local copy of ${src.repo} to read the kit from`, 'Add it as a submodule, or run: git submodule update --init');
    return null;
  }
  const commit = tryGit(local, ['rev-parse', '--verify', '--quiet', `${src.ref}^{commit}`])?.trim();
  if (!commit) {
    problem(file, `the ref ${src.ref} isn't in the local copy of ${src.repo}`, `Fetch it: git -C ${relative(root, local)} fetch --tags origin`);
    return null;
  }
  const isTag = Boolean(tryGit(local, ['show-ref', '--verify', '--quiet', `refs/tags/${src.ref}`]) !== null);
  if (!isTag && !/^[0-9a-f]{40}$/.test(src.ref)) problem(file, `source.ref "${src.ref}" looks like a branch`, 'Pin a release tag or a full 40-character commit, never a branch.');

  const tree = git(local, ['ls-tree', '-r', '-l', '--full-tree', commit]).trim().split(/\r?\n/).map((l) => {
    const m = /^(\d+) (\w+) ([0-9a-f]+)\s+(-|\d+)\t(.+)$/.exec(l);
    return m && m[2] === 'blob' ? { path: m[5], size: Number(m[4]), mode: m[1] } : null;
  }).filter(Boolean);
  // Read every blob at the pinned commit in one process; a process per file is slow on Windows.
  const blobs = readBlobs(local, commit, tree.map((f) => f.path));
  const show = (path) => blobs.get(path) ?? null;
  let cardText = show(src.card ?? 'about.md')?.toString('utf8');
  let cardFile = `${src.repo}@${commit.slice(0, 7)}:${src.card ?? 'about.md'}`;
  if (!cardText && p.inlineCard) {
    const inline = join(dirname(file), p.inlineCard);
    if (existsSync(inline)) {
      cardText = readFileSync(inline, 'utf8');
      cardFile = inline;
    }
  }
  if (!cardText) {
    problem(file, `the kit has no ${src.card ?? 'about.md'} at ${commit.slice(0, 7)} and the pointer carries no card`, 'Add about.md to the kit, or an inlineCard file beside the pointer.');
    return null;
  }
  let data;
  let body;
  const cardPath = cardFile.startsWith(root) ? cardFile : file;
  checkPublication(cardPath, cardText, problem);
  try {
    ({ data, body } = frontMatter(cardText));
  } catch (e) {
    problem(cardPath, `can't read the card's front matter: ${e.message}`, 'Fix the YAML at the line named (counted from the first ---).');
    return null;
  }
  const readme = show('README.md')?.toString('utf8') ?? null;
  if (data.install?.contract) {
    const c = data.install.contract;
    const invalid = contractProblem(c);
    if (invalid) problem(cardPath, invalid, 'Publish a complete version-1 installer contract at the pinned revision.');
    else for (const f of c.files) {
      const bytes = show(f.path);
      if (!bytes || bytes.length !== f.size || createHash('sha256').update(bytes).digest('hex') !== f.sha256) {
        problem(cardPath, `installer source ${f.path} does not match the pinned commit`, 'Release the canonical installer first, then update the pin and its exact file hashes.');
      }
    }
  }
  const parts = discoverParts(p.parts ?? {}, tree, show, id, { readme, notes: data.partNotes ?? {} });
  let skillFiles;
  if (p.type === 'skill') {
    if (typeof src.path !== 'string' || !src.path.split('/').every((part) => /^[a-zA-Z0-9._-]+$/.test(part) && !['.', '..', '.git'].includes(part))) {
      problem(file, 'a moved skill needs a safe source.path folder', 'Set source.path to its folder at the pinned Git commit.');
      return null;
    }
    const selected = tree.filter((entry) => entry.path.startsWith(`${src.path}/`) && entry.path !== `${src.path}/about.md`);
    skillFiles = selected.map((entry) => {
      if (!['100644', '100755'].includes(entry.mode)) problem(file, `the moved skill contains a non-regular file: ${entry.path}`, 'Replace links with regular files before releasing the skill.');
      const bytes = show(entry.path);
      if (!isBinary(bytes)) checkPublication(file, bytes.toString('utf8'), problem);
      return fileEntry(entry.path.slice(src.path.length + 1), bytes);
    });
    const instructions = show(`${src.path}/SKILL.md`);
    try {
      if (!instructions || frontMatter(instructions.toString('utf8')).data.name !== id) throw new Error();
    } catch { problem(file, 'the moved skill needs SKILL.md with the same stable name', 'Keep its original ID in the skill front matter and pointer.'); }
    if (skillFiles.length > SKILL_LIMITS.files || skillFiles.reduce((sum, entry) => sum + entry.size, 0) > SKILL_LIMITS.bytes) problem(file, 'the moved skill exceeds the CLI file budget', 'Keep the installable skill within 50 files and 5 MB.');
    if (skillFiles.some((entry) => entry.runs) && !(data.effects ?? []).includes('runs-scripts')) problem(file, 'the moved skill does not declare its scripts', 'Add runs-scripts to effects.');
  }
  const committed = git(local, ['show', '-s', '--format=%cI', commit]).trim();
  return {
    ...data,
    id,
    type: p.type ?? 'kit',
    body,
    file: cardFile.startsWith(root) ? cardFile : file,
    pointerFile: file,
    source: { repo: normRepo(src.repo), ref: src.ref, commit, tag: isTag ? src.ref : null, card: src.card ?? 'about.md', inline: cardFile.startsWith(root), ...(p.type === 'skill' ? { path: src.path } : {}) },
    ...(skillFiles ? { files: skillFiles } : {}),
    ...(p.visibility ? { visibility: p.visibility } : {}),
    channels: p.channels ?? {},
    parts,
    readme,
    fileCount: tree.length,
    updated: committed,
  };
}

/** Reads many blobs at one commit with a single `git cat-file --batch`; returns path → Buffer. */
export function readBlobs(cwd, commit, paths) {
  const out = new Map();
  if (!paths.length) return out;
  const buf = execFileSync('git', ['cat-file', '--batch'], { cwd, input: paths.map((p) => `${commit}:${p}`).join('\n') + '\n', maxBuffer: 256 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'] });
  let at = 0;
  for (const path of paths) {
    const nl = buf.indexOf(10, at);
    const header = buf.subarray(at, nl).toString('utf8');
    at = nl + 1;
    const m = /^[0-9a-f]+ (\w+) (\d+)$/.exec(header);
    if (!m) continue;
    const size = Number(m[2]);
    if (m[1] === 'blob') out.set(path, buf.subarray(at, at + size));
    at += size + 1;
  }
  return out;
}

/** Finds a kit's parts at the pinned commit, from the pointer's globs. Nothing is typed by hand. */
export function discoverParts(globs, tree, show, kitId, { readme = '', notes = {} } = {}) {
  const described = readmeDescriptions(readme);
  const dirs = new Set();
  for (const f of tree) {
    const segs = f.path.split('/');
    for (let i = 1; i < segs.length; i++) dirs.add(segs.slice(0, i).join('/'));
  }
  const entries = [...tree.map((f) => ({ path: f.path, dir: false })), ...[...dirs].map((d) => ({ path: d, dir: true }))];
  const parts = [];
  const skillDirs = [];
  for (const [kind, patterns] of Object.entries(globs)) {
    for (const pattern of patterns) {
      const re = globToRegExp(pattern);
      for (const e of entries.filter((x) => re.test(x.path)).sort((a, b) => a.path.localeCompare(b.path))) {
        if (parts.some((pt) => pt.path === e.path)) continue;
        parts.push({ kind, path: e.path, dir: e.dir });
        if (kind === 'skill') skillDirs.push(posix.dirname(e.path));
      }
    }
  }
  const out = [];
  for (const pt of parts) {
    let name;
    let description = '';
    let files;
    if (pt.kind === 'skill') {
      const dir = posix.dirname(pt.path);
      const text = show(pt.path)?.toString('utf8') ?? '';
      const fm = safeFront(text);
      name = fm.data.name ?? (dir === '.' ? kitId : posix.basename(dir));
      description = fm.data.description ?? firstParagraph(fm.body);
      // A skill's files are its folder, minus nested skills. A skill at the kit's root is just its SKILL.md.
      files = dir === '.' ? [pt.path] : tree.map((f) => f.path).filter((p) => p.startsWith(dir + '/') && !skillDirs.some((d) => d !== dir && d.startsWith(dir + '/') && p.startsWith(d + '/')));
    } else if (pt.kind === 'agent') {
      const text = show(pt.path)?.toString('utf8') ?? '';
      const fm = safeFront(text);
      name = fm.data.name ?? posix.basename(pt.path).replace(/\.agent\.md$|\.md$/, '');
      description = fm.data.description ?? firstParagraph(fm.body);
      files = [pt.path];
    } else if (pt.dir) {
      name = posix.basename(pt.path);
      files = tree.map((f) => f.path).filter((p) => p.startsWith(pt.path + '/'));
      const readme = files.find((f) => /readme\.md$/i.test(f));
      description = readme ? firstParagraph(show(readme)?.toString('utf8') ?? '') : `A folder of ${files.length} files: ${files.map((f) => posix.basename(f)).slice(0, 4).join(', ')}${files.length > 4 ? '…' : ''}`;
    } else {
      name = posix.basename(pt.path).replace(/\.(mjs|js|md|json|html|ts)$/, '');
      const text = show(pt.path)?.toString('utf8') ?? '';
      description = describeFile(pt.path, text);
      files = [pt.path];
    }
    const fileEntries = files.map((p) => {
      const buf = show(p) ?? Buffer.alloc(0);
      const e = fileEntry(p, buf);
      if (pt.kind === 'tool') e.role = 'script';
      e.runs = pt.kind === 'tool' || /\.(mjs|js|py|sh|ps1|cjs)$/.test(p);
      return e;
    });
    if (pt.kind !== 'skill' && pt.kind !== 'agent') description = described.get(pt.path) ?? described.get(pt.path + '/') ?? notes[name] ?? description;
    else if (!description) description = notes[name] ?? '';
    out.push({ kind: pt.kind, name, slug: name, path: pt.path, description: oneLine(description), files: fileEntries });
  }
  // Slugs are unique within a kit. On a clash a skill keeps the plain name; the others get their kind as a prefix.
  const rank = { skill: 0, agent: 1, tool: 2, template: 3 };
  const taken = new Set();
  for (const p of [...out].sort((a, b) => rank[a.kind] - rank[b.kind])) {
    if (taken.has(p.slug)) p.slug = `${p.kind}-${p.slug}`;
    taken.add(p.slug);
  }
  return out;
}

function safeFront(text) {
  try {
    return frontMatter(text);
  } catch {
    return { data: {}, body: text };
  }
}

/** Part descriptions from the kit's README tables: rows whose first cell is exactly a part's path. */
export function readmeDescriptions(readme) {
  const out = new Map();
  for (const line of String(readme ?? '').split(/\r?\n/)) {
    const m = /^\|\s*(?:\[`?([^`\]]+)`?\]\(([^)]+)\)|`([^`]+)`)\s*\|(.+)\|\s*$/.exec(line);
    if (!m) continue;
    const path = (m[2] ?? m[3]).replace(/^\.\//, '');
    const cells = m[4].split('|').map((c) => c.trim()).filter(Boolean);
    if (cells.length) out.set(path, plainText(cells[cells.length - 1]));
  }
  return out;
}

function oneLine(s) {
  return String(s ?? '').replace(/\s+/g, ' ').trim();
}

function firstParagraph(md) {
  const lines = String(md ?? '').split(/\r?\n/);
  const para = [];
  for (const l of lines) {
    if (/^\s*$/.test(l)) { if (para.length) break; continue; }
    if (/^\s*(#|```|\||<|---)/.test(l)) { if (para.length) break; continue; }
    para.push(l.replace(/^>\s?/, '').trim());
  }
  return plainText(para.join(' '));
}

function describeFile(path, text) {
  if (path.endsWith('.json')) {
    try {
      const j = JSON.parse(text);
      if (j.description) return j.description;
      if (j.title) return j.title;
    } catch {}
    return 'A JSON template';
  }
  if (path.endsWith('.md')) {
    const h = /^#\s+(.+)$/m.exec(text);
    const p = firstParagraph(text.replace(/^#.*$/m, ''));
    return p || (h ? h[1] : 'A Markdown template');
  }
  if (path.endsWith('.html')) {
    const t = /<title>([^<]+)<\/title>/i.exec(text);
    return t ? `An HTML template: ${t[1]}` : 'An HTML template';
  }
  const doc = /\/\*\*([\s\S]*?)\*\//.exec(text);
  if (doc) {
    const line = doc[1].split(/\r?\n/).map((l) => l.replace(/^\s*\*\s?/, '').trim()).filter((l) => l && !l.startsWith('@'));
    if (line.length) return line[0].replace(/\s*\(.*?\)\.?$/, '').replace(/\.$/, '');
  }
  const comment = /^\s*\/\/\s*(?!@ts-)(.+)$/m.exec(text);
  return comment ? comment[1] : 'A script in the kit';
}

function validateCard(item, vocab, byId, problem) {
  const f = item.file;
  const need = (cond, message, fix) => { if (!cond) problem(f, message, fix); };
  const isAgentItem = item.type === 'skill' || item.type === 'kit';
  need(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(item.id) && item.id.length <= 64, `the id "${item.id}" isn't lowercase letters, digits and hyphens (64 at most)`, 'Rename the id; it appears in URLs and the CLI.');
  need(['skill', 'kit', 'stack'].includes(item.type), `unknown type "${item.type}"`, 'Use skill, kit or stack.');
  need(typeof item.title === 'string' && item.title.trim(), 'the card has no title', 'Add a title in sentence case.');
  need(typeof item.summary === 'string' && item.summary.length > 0, 'the card has no summary', 'Add one sentence on what a person gets.');
  if (typeof item.summary === 'string') need(item.summary.length <= 140, `the summary is ${item.summary.length} characters`, 'Keep it to 140 characters or fewer, outcome first.');
  need(Array.isArray(item.useWhen) && item.useWhen.length >= 2 && item.useWhen.length <= 5, 'useWhen needs 2 to 5 situations', 'List the situations in the person\'s words.');
  need(vocab.areas.has(item.area), `the area "${item.area}" isn't in the taxonomy`, `Use one of: ${[...vocab.areas].join(', ')}, or add the area to catalog/taxonomy.yaml.`);
  const tags = item.tags ?? [];
  need(tags.length <= 5, `${tags.length} tags`, 'Keep five tags at most.');
  for (const t of tags) need(vocab.tags.has(t), `the tag "${t}" isn't in the tag list`, 'Add it to tags in catalog/taxonomy.yaml in the same change, or use an existing tag.');
  need(vocab.statuses.has(item.status), `unknown status "${item.status}"`, `Use one of: ${[...vocab.statuses].join(', ')}.`);
  if (item.status === 'deprecated' || item.status === 'moved') need((item.related ?? []).some((r) => r.replacedBy) || item.statusReason, `a ${item.status} item needs a replacement or a reason`, 'Add a replacedBy relation or statusReason.');
  need(typeof item.owner === 'string' && item.owner, 'the card has no owner', 'Add owner (the catalog owner by default).');
  if (isAgentItem) {
    need(/^\d+\.\d+\.\d+([-+].+)?$/.test(String(item.version ?? '')), `the version "${item.version ?? ''}" isn't a semantic version`, 'Use MAJOR.MINOR.PATCH, raised on every published change.');
    need(item.agents && typeof item.agents === 'object', 'the card doesn\'t say which agents it works with', 'Add agents, each tested, expected or unsupported.');
    for (const [a, v] of Object.entries(item.agents ?? {})) {
      need(vocab.agents.has(a), `unknown agent "${a}"`, `Use one of: ${[...vocab.agents].join(', ')}.`);
      need(['tested', 'expected', 'unsupported'].includes(v), `agent "${a}" is "${v}"`, 'Use tested, expected or unsupported.');
    }
    need(Array.isArray(item.effects), 'the card doesn\'t declare effects', 'Add effects: [] when it only gives instructions, or list what it can do.');
    for (const e of item.effects ?? []) need(vocab.effects.has(e), `unknown effect "${e}"`, `Use one of: ${[...vocab.effects].join(', ')}.`);
    need(item.license, 'the card has no license', 'Add an SPDX identifier, such as MIT.');
    need(item.origin, 'the card has no origin', 'Use original, or adapted with the source URL.');
    if (item.status === 'stable') need((item.examples ?? []).length >= 1, 'a stable item needs at least one example', 'Add a Try it prompt and what should happen, or mark it beta.');
  }
  if (item.type === 'kit') need(item.install && item.install.command, 'the kit has no install contract', 'Add install.command and its arguments, or the kit\'s own setup steps.');
  for (const ex of item.examples ?? []) need(ex.prompt && ex.expect, 'an example needs a prompt and what to expect', 'Give both prompt and expect.');
  for (const r of item.related ?? []) {
    const kind = RELATIONS.find((k) => r[k]);
    need(kind, 'a relation has no type', `Use one of: ${RELATIONS.join(', ')}.`);
    if (!kind) continue;
    need(byId.has(r[kind]), `related item "${r[kind]}" isn't in the catalog`, 'Fix the id, or remove the relation.');
    need(r.reason && r.reason.length <= 100, `the ${kind} relation to ${r[kind]} needs a reason of 100 characters or fewer`, 'Say in one line why they belong together.');
  }
  if (item.type === 'stack') {
    need(Array.isArray(item.members) && item.members.length >= 2, 'a stack needs at least two members', 'List members in order, each with a role.');
    for (const m of item.members ?? []) need(byId.has(m.id) && m.role, `stack member "${m.id}" is missing or has no role`, 'Use an id from the catalog and a one-line role.');
  }
  const heads = sections(item.body).sections.map((s) => s.title);
  const required = item.type === 'stack' ? ['What it does'] : BODY_REQUIRED;
  for (const h of required) need(heads.includes(h), `the page body has no "${h}" section`, `Add "## ${h}" to the card body.`);
  const known = item.type === 'stack' ? STACK_BODY : BODY_ORDER;
  const order = heads.filter((h) => known.includes(h)).map((h) => known.indexOf(h));
  need(order.every((v, i) => i === 0 || v > order[i - 1]), 'the body sections are out of order', `Use this order: ${known.join(', ')}.`);
}

/** Expands relations so both pages show them, with the wording for each direction. */
function buildRelations(items, byId) {
  const out = new Map(items.map((i) => [i.id, []]));
  const add = (from, entry) => {
    const list = out.get(from);
    if (list && !list.some((e) => e.id === entry.id && e.kind === entry.kind)) list.push(entry);
  };
  for (const item of items) {
    for (const r of item.related ?? []) {
      const kind = RELATIONS.find((k) => r[k]);
      if (!kind || !byId.has(r[kind]) || !r.reason) continue;
      const to = r[kind];
      if (kind === 'pairsWith' || kind === 'alternativeTo') {
        add(item.id, { id: to, kind, reason: r.reason });
        add(to, { id: item.id, kind, reason: r.reason });
      } else if (kind === 'feedsInto') {
        add(item.id, { id: to, kind: 'feedsInto', reason: r.reason });
        add(to, { id: item.id, kind: 'picksUpFrom', reason: r.reason });
      } else if (kind === 'requires') {
        add(item.id, { id: to, kind: 'requires', reason: r.reason });
      } else if (kind === 'replacedBy') add(item.id, { id: to, kind: 'replacedBy', reason: r.reason });
    }
    if (item.type === 'stack') for (const m of item.members ?? []) if (byId.has(m.id)) add(m.id, { id: item.id, kind: 'inStack', reason: m.role });
  }
  return out;
}
