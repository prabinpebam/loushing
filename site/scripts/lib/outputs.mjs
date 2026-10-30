/**
 * Agent-readable outputs (docs/spec/agent-access.md): catalog.json, per-item JSON and
 * Markdown, llms.txt, the search index and the feed. Pure functions of the model.
 */
import { absolute } from '../../src/lib/urls.mjs';
import { publishedVersions } from './releases.mjs';

const agentLists = (agents = {}) => {
  const out = { tested: [], expected: [], unsupported: [] };
  for (const [a, v] of Object.entries(agents)) out[v]?.push(a);
  return out;
};

const sourceOf = (i) => ({
  repo: String(i.source?.repo ?? '').replace('https://github.com/', ''),
  path: i.source?.path ?? null,
  commit: i.source?.commit ?? null,
});
const archiveOf = (i) => i.archive?.url ? { ...i.archive, url: absolute(i.archive.url), manifest: absolute(i.archive.manifest) } : i.archive ?? null;

export function catalogJson(model) {
  const items = model.items.map((i) => ({
    id: i.id,
    type: i.type,
    title: i.title,
    summary: i.summary,
    useWhen: i.useWhen ?? [],
    notFor: i.notFor ?? [],
    area: i.area,
    tags: i.tags ?? [],
    agents: agentLists(i.agents),
    status: i.status,
    version: i.version ?? null,
    effects: i.effects ?? [],
    ...(i.derivedFrom ? { derivedFrom: i.derivedFrom } : {}),
    ...(i.type === 'kit' ? { parts: (i.parts ?? []).map((p) => ({ kind: p.kind, name: p.name, url: absolute(`/items/${i.id}/${p.slug}`), ...(p.standalone ? { standalone: { id: p.standalone.id, url: absolute(p.standalone.url) } } : {}) })) } : {}),
    ...(i.type === 'stack' ? { members: (i.members ?? []).map((m) => m.id) } : {}),
    updated: i.updated,
    source: sourceOf(i),
    archive: archiveOf(i),
    url: absolute(i.url),
    data: absolute(`${i.url}.json`),
    ...publishedVersions(i, model.catalog.releaseRegistry),
  }));
  return {
    schema: absolute('/schema/catalog-1.json'),
    catalogVersion: catalogVersion(model),
    generated: model.catalog.generated,
    items,
    aliases: model.catalog.lifecycle?.aliases ?? {},
    removed: model.catalog.lifecycle?.removed ?? {},
  };
}

/** A working-tree build is not a release, even when main changed. */
export function catalogVersion(model) {
  return model.catalog.releaseVersion ?? 'development';
}

export function itemJson(item, model) {
  const card = {};
  for (const k of ['id', 'type', 'title', 'summary', 'useWhen', 'notFor', 'area', 'tags', 'agents', 'status', 'version', 'effects', 'requires', 'license', 'licenseNote', 'origin', 'owner', 'docs', 'examples', 'members', 'handoffs', 'derivedFrom']) if (item[k] !== undefined) card[k] = item[k];
  return {
    schema: absolute('/schema/item-1.json'),
    ...card,
    effects: item.effects ?? [],
    updated: item.updated,
    added: item.added,
    source: { ...sourceOf(item), url: item.source?.repo ?? null },
    archive: archiveOf(item),
    url: absolute(item.url),
    page: { markdown: absolute(`${item.url}.md`) },
    files: (item.archiveFiles ?? item.files ?? []).map(({ path, size, sha256, mode, role, runs }) => ({ path, size, sha256, mode, role, runs })),
    parts: (item.parts ?? []).map((p) => ({ kind: p.kind, name: p.name, path: p.path, description: p.description, ...(p.standalone ? { standalone: { id: p.standalone.id, url: absolute(p.standalone.url) } } : {}), files: p.files.map(({ path, size, sha256 }) => ({ path, size, sha256 })) })),
    related: (item.related ?? []).map((r) => ({ id: r.id, relation: r.kind, reason: r.reason })),
    install: {
      ...(item.install?.contract ? { contract: item.install.contract } : {}),
      note: 'One plan per agent and scope, keyed "<agent>:<scope>". "git" is the exact command list; "ask" is a prompt for an agent; "command" is the CLI line (not published yet).',
      plans: Object.fromEntries(Object.entries(item.plans).map(([k, p]) => [k, { supported: p.supported, automation: p.automation, reason: p.reason, git: p.git, ask: p.ask, command: p.command, download: p.download, downloadSteps: p.downloadSteps, adds: p.adds, next: p.next, dryRun: p.dryRun }])),
    },
    changes: model.releases.filter((r) => r.item.id === item.id).map((r) => ({ date: r.date, kind: r.kind, line: r.line })),
  };
}

export function itemMarkdown(item, model) {
  const lines = ['---', `id: ${item.id}`, `type: ${item.type}`, `title: ${item.title}`, `summary: ${item.summary}`, `status: ${item.status}`];
  if (item.version) lines.push(`version: ${item.version}`);
  if (item.effects?.length) lines.push(`effects: [${item.effects.join(', ')}]`);
  lines.push(`data: ${absolute(`${item.url}.json`)}`, '---', '', `# ${item.title}`, '', item.summary, '');
  if (item.useWhen?.length) lines.push('## When I use it', '', ...item.useWhen.map((l) => `- ${l}`), '');
  if (item.notFor?.length) lines.push('## Not for', '', ...item.notFor.map((l) => `- ${l}`), '');
  lines.push(String(item.body ?? '').trim(), '');
  if (item.derivedFrom) lines.push('## Source skill', '', `Independent adaptation of \`${item.derivedFrom.skill}\` in [${item.derivedFrom.kit}](${absolute(`/items/${item.derivedFrom.kit}`)}); installing the kit is not required.`, '');
  if (item.examples?.length) lines.push('## Try it', '', ...item.examples.flatMap((e) => [`- Prompt: ${e.prompt}`, `  Expect: ${e.expect}`]), '');
  if (item.parts?.length) lines.push("## What's inside", '', ...item.parts.map((p) => `- ${p.kind} \`${p.name}\`: ${p.description}${p.standalone ? ` [Use separately](${absolute(p.standalone.url)})` : ''}`), '');
  if (item.type === 'stack') lines.push('## Members', '', ...(item.members ?? []).map((m, i) => `${i + 1}. ${model.byId.get(m.id)?.title ?? m.id}: ${m.role}`), '');
  const p = item.plans['copilot-vscode:project'];
  if (p?.supported) lines.push('## Get it (VS Code Copilot, this project)', '', '```', ...p.git, '```', '', `Every agent and scope: ${absolute(`${item.url}.json`)}`, '');
  if (item.archive?.url) lines.push('## Download', '',
    `[Download ZIP](${absolute(item.archive.url)}) · [File manifest](${absolute(item.archive.manifest)})`, '',
    `SHA256: \`${item.archive.sha256}\``, '', ...(p?.downloadSteps ?? []).map((step, i) => `${i + 1}. ${step}`), '');
  if (item.related?.length) lines.push('## Works well with', '', ...item.related.map((r) => `- ${model.byId.get(r.id)?.title ?? r.id} (${r.kind}): ${r.reason}`), '');
  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`;
}

export function llmsTxt(model) {
  const skills = model.items.filter((i) => i.type === 'skill');
  const kits = model.items.filter((i) => i.type === 'kit');
  const stacks = model.items.filter((i) => i.type === 'stack');
  return [
    '# Loushing',
    '',
    '> The AI agent skills, kits and stacks Prabin Pebam uses in his own work: a personal collection, each with a plain-language page and setup steps for each agent, for anyone who wants to use one too.',
    '',
    'Read catalog.json to search. Each item\'s JSON has the install plan for every agent and scope; show your user the plan and install only after they agree. The `npx loushing` CLI is not published yet.',
    '',
    '## Catalog',
    '',
    `- [catalog.json](${absolute('/catalog.json')}): every item with summary, agents, effects and links`,
    `- [Get started](${absolute('/get-started.md')}): what skills, kits and stacks are`,
    `- [For agents](${absolute('/for-agents.md')}): the files and the consent rule`,
    '',
    '## Kits',
    '',
    ...kits.map((k) => `- [${k.title}](${absolute(`${k.url}.md`)}): ${k.summary}`),
    ...(skills.length ? ['', '## Skills', '', ...skills.map((s) => `- [${s.title}](${absolute(`${s.url}.md`)}): ${s.summary}`)] : []),
    ...(stacks.length ? ['', '## Stacks', '', ...stacks.map((s) => `- [${s.title}](${absolute(`${s.url}.md`)}): ${s.summary}`)] : []),
    '',
  ].join('\n');
}

export function searchIndex(model) {
  return { version: catalogVersion(model), docs: model.docs };
}

const xmlEsc = (s) => String(s ?? '').replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]);

export function feedXml(model) {
  const entries = model.releases.slice(0, 50);
  return `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0">
<channel>
<title>Loushing: what's new</title>
<link>${xmlEsc(absolute('/whats-new'))}</link>
<description>Skills, kits and stacks added, updated or pinned to a new version.</description>
${entries.map((e) => `<item><title>${xmlEsc(`${({ pinned: 'Pinned', added: 'Added', updated: 'Updated', removed: 'Removed' })[e.kind]}: ${e.item.title}`)}</title><link>${xmlEsc(absolute(e.item.url))}</link><guid isPermaLink="false">${xmlEsc(`${e.item.id}@${e.release}`)}</guid><pubDate>${new Date(e.date).toUTCString()}</pubDate><description>${xmlEsc(e.line)}</description></item>`).join('\n')}
</channel>
</rss>
`;
}
