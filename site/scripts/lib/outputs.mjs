/**
 * Agent-readable outputs (docs/spec/agent-access.md): catalog.json, per-item JSON and
 * Markdown, llms.txt, the search index and the feed. Pure functions of the model.
 */
import { absolute } from '../../src/lib/urls.mjs';

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
    ...(i.type === 'kit' ? { parts: (i.parts ?? []).map((p) => ({ kind: p.kind, name: p.name, url: absolute(`/items/${i.id}/${p.slug}`) })) } : {}),
    ...(i.type === 'stack' ? { members: (i.members ?? []).map((m) => m.id) } : {}),
    updated: i.updated,
    source: sourceOf(i),
    url: absolute(i.url),
    data: absolute(`${i.url}.json`),
  }));
  return {
    schema: absolute('/schema/catalog-1.json'),
    catalogVersion: catalogVersion(model),
    generated: model.catalog.generated,
    items,
    aliases: {},
    removed: {},
  };
}

/** Until catalog releases exist, the version is the date of the newest change. */
export function catalogVersion(model) {
  return (model.latest ?? model.catalog.generated).slice(0, 10).replace(/-/g, '.');
}

export function itemJson(item, model) {
  const card = {};
  for (const k of ['id', 'type', 'title', 'summary', 'useWhen', 'notFor', 'area', 'tags', 'agents', 'status', 'version', 'effects', 'requires', 'license', 'origin', 'owner', 'docs', 'examples', 'members', 'handoffs']) if (item[k] !== undefined) card[k] = item[k];
  return {
    ...card,
    updated: item.updated,
    added: item.added,
    source: { ...sourceOf(item), url: item.source?.repo ?? null },
    url: absolute(item.url),
    page: { markdown: absolute(`${item.url}.md`) },
    files: (item.files ?? []).map(({ path, size, sha256, role, runs }) => ({ path, size, sha256, role, runs })),
    parts: (item.parts ?? []).map((p) => ({ kind: p.kind, name: p.name, path: p.path, description: p.description, files: p.files.map(({ path, size, sha256 }) => ({ path, size, sha256 })) })),
    related: (item.related ?? []).map((r) => ({ id: r.id, relation: r.kind, reason: r.reason })),
    install: {
      note: 'One plan per agent and scope, keyed "<agent>:<scope>". "git" is the exact command list; "ask" is a prompt for an agent; "command" is the CLI line (not published yet).',
      plans: Object.fromEntries(Object.entries(item.plans).map(([k, p]) => [k, { supported: p.supported, reason: p.reason, git: p.git, ask: p.ask, command: p.command, download: p.download, adds: p.adds, next: p.next, dryRun: p.dryRun }])),
    },
    changes: model.releases.filter((r) => r.item.id === item.id).map((r) => ({ date: r.date, kind: r.kind, line: r.line })),
  };
}

export function itemMarkdown(item, model) {
  const lines = ['---', `id: ${item.id}`, `type: ${item.type}`, `title: ${item.title}`, `summary: ${item.summary}`, `status: ${item.status}`];
  if (item.version) lines.push(`version: ${item.version}`);
  if (item.effects?.length) lines.push(`effects: [${item.effects.join(', ')}]`);
  lines.push(`data: ${absolute(`${item.url}.json`)}`, '---', '', `# ${item.title}`, '', item.summary, '');
  if (item.useWhen?.length) lines.push('## Use it when', '', ...item.useWhen.map((l) => `- ${l}`), '');
  if (item.notFor?.length) lines.push('## Not for', '', ...item.notFor.map((l) => `- ${l}`), '');
  lines.push(String(item.body ?? '').trim(), '');
  if (item.examples?.length) lines.push('## Try it', '', ...item.examples.flatMap((e) => [`- Prompt: ${e.prompt}`, `  Expect: ${e.expect}`]), '');
  if (item.parts?.length) lines.push("## What's inside", '', ...item.parts.map((p) => `- ${p.kind} \`${p.name}\`: ${p.description}`), '');
  if (item.type === 'stack') lines.push('## Members', '', ...(item.members ?? []).map((m, i) => `${i + 1}. ${model.byId.get(m.id)?.title ?? m.id}: ${m.role}`), '');
  const p = item.plans['copilot-vscode:project'];
  if (p?.supported) lines.push('## Get it (VS Code Copilot, this project)', '', '```', ...p.git, '```', '', `Every agent and scope: ${absolute(`${item.url}.json`)}`, '');
  if (item.related?.length) lines.push('## Works well with', '', ...item.related.map((r) => `- ${model.byId.get(r.id)?.title ?? r.id} (${r.kind}): ${r.reason}`), '');
  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`;
}

export function llmsTxt(model) {
  const kits = model.items.filter((i) => i.type === 'kit');
  const stacks = model.items.filter((i) => i.type === 'stack');
  return [
    '# Loushing',
    '',
    '> A curated catalog of AI-agent skills, kits and stacks by Prabin Pebam, with plain-language pages and install steps for each agent.',
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
${entries.map((e) => `<item><title>${xmlEsc(`${e.kind === 'pinned' ? 'Pinned' : e.kind === 'added' ? 'Added' : 'Updated'}: ${e.item.title}`)}</title><link>${xmlEsc(absolute(e.item.url))}</link><guid isPermaLink="false">${xmlEsc(`${e.item.id}@${e.date}`)}</guid><pubDate>${new Date(e.date).toUTCString()}</pubDate><description>${xmlEsc(e.line)}</description></item>`).join('\n')}
</channel>
</rss>
`;
}
