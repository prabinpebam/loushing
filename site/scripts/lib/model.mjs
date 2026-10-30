/**
 * The site model: the loaded catalog turned into the plain data views query.
 * Views name a source ({ from, where, sort, limit }); resolve() answers it, so components
 * only ever see plain data and no number or claim is typed into a view.
 */
import { allPlans } from '../../src/lib/install.mjs';
import { indexDoc } from '../../src/lib/search.mjs';

const TYPE_ORDER = { kit: 0, stack: 1, skill: 2, part: 3 };

export function buildModel(catalog) {
  const { taxonomy, items } = catalog;
  const byId = new Map(items.map((i) => [i.id, i]));
  const agentsById = new Map(taxonomy.agents.map((a) => [a.id, a]));
  const effectsById = new Map(taxonomy.effects.map((e) => [e.id, e]));
  const statusById = new Map(taxonomy.statuses.map((s) => [s.id, s]));

  for (const item of items) {
    item.name = item.title;
    item.typeTitle = { kit: 'Kit', skill: 'Skill', stack: 'Stack' }[item.type];
    if (item.type === 'kit') item.groups = groupParts(item);
    if (item.type === 'stack') item.memberItems = (item.members ?? []).map((m) => ({ ...m, item: byId.get(m.id) })).filter((m) => m.item);
    item.plans = allPlans(item, taxonomy.agents, byId);
  }

  const parts = items.filter((i) => i.type === 'kit').flatMap((kit) => (kit.parts ?? []).map((p) => partItem(kit, p)));
  for (const kit of items.filter((i) => i.type === 'kit')) kit.partItems = parts.filter((p) => p.kit.id === kit.id);

  const areas = taxonomy.areas
    .map((a, order) => ({ ...a, order, count: items.filter((i) => i.area === a.id).length, url: `/catalog?area=${a.id}` }))
    .filter((a) => a.count > 0);

  const count = (type) => items.filter((i) => i.type === type).length;
  const latest = items.map((i) => i.updated).filter(Boolean).sort().pop() ?? null;
  const counts = [
    { id: 'skill', value: count('skill'), label: count('skill') === 1 ? 'skill' : 'skills', icon: 'widgets' },
    { id: 'kit', value: count('kit'), label: count('kit') === 1 ? 'kit' : 'kits', icon: 'inventory_2' },
    { id: 'stack', value: count('stack'), label: count('stack') === 1 ? 'stack' : 'stacks', icon: 'stacks' },
    { id: 'part', value: parts.length, label: 'parts inside kits', icon: 'category' },
  ].filter((c) => c.value > 0);

  const releases = timeline(items, catalog.releaseRegistry);
  const docs = [...items, ...parts].map(searchDoc);

  const model = { catalog, taxonomy, items, parts, byId, areas, counts, latest, releases, docs, agentsById, effectsById, statusById, stacks: items.filter((i) => i.type === 'stack') };
  model.resolve = (query, ctx = {}) => resolve(model, query, ctx);
  return model;
}

function groupParts(kit) {
  const kinds = [
    { kind: 'skill', title: 'Skills', icon: 'widgets', line: 'Load when a task needs them' },
    { kind: 'agent', title: 'Agents', icon: 'smart_toy', line: 'Reviewers you can call by name' },
    { kind: 'template', title: 'Templates', icon: 'description', line: 'Starting points your agent fills in' },
    { kind: 'tool', title: 'Tools', icon: 'terminal', line: 'Scripts that set up or check things' },
  ];
  return kinds.map((k) => ({ ...k, parts: (kit.parts ?? []).filter((p) => p.kind === k.kind) })).filter((g) => g.parts.length);
}

export function partItem(kit, p) {
  return {
    id: `${kit.id}/${p.slug}`,
    slug: p.slug,
    type: 'part',
    kind: p.kind,
    kindTitle: { skill: 'Skill', agent: 'Agent', template: 'Template', tool: 'Tool' }[p.kind],
    title: p.name,
    name: p.name,
    summary: p.description,
    kit: { id: kit.id, title: kit.title, url: kit.url },
    area: kit.area,
    areaTitle: kit.areaTitle,
    tags: kit.tags,
    agents: kit.agents,
    effects: p.kind === 'tool' ? ['runs-scripts'] : p.files.some((f) => f.runs) ? ['runs-scripts'] : [],
    status: kit.status,
    version: kit.version,
    updated: kit.updated,
    url: `/items/${kit.id}/${p.slug}`,
    path: p.path,
    files: p.files,
    hub: kit.anatomy?.hub === p.name,
    source: { repo: kit.source.repo, commit: kit.source.commit, path: p.path },
    standalone: p.standalone ?? null,
  };
}

/**
 * What's new: each item's history from Git (a kit's pin, otherwise added or updated),
 * merged with the entries of explicit immutable catalog releases, newest first.
 */
export function timeline(items, registry) {
  const byId = new Map(items.map((item) => [item.id, item]));
  const history = items.filter((i) => i.updated).map((i) => i.type === 'kit'
    ? { date: i.updated, kind: 'pinned', item: i, line: `Pinned ${i.version ? `to version ${i.version} ` : ''}at commit ${String(i.source?.commit ?? '').slice(0, 7)}` }
    : { date: i.updated, kind: i.updated === i.added ? 'added' : 'updated', item: i, line: i.summary });
  const releases = (registry?.releases ?? []).flatMap((release) => release.changes.map((change) => ({
    date: release.date, kind: change.kind, release: release.version,
    item: byId.get(change.id) ?? { id: change.id, title: change.id, ...release.index.items.find((item) => item.id === change.id), url: `/items/${change.id}` },
    line: `${release.version}: ${change.line}`,
  })));
  const time = (date) => Date.parse(date) || 0;
  return [...history, ...releases].sort((a, b) => time(b.date) - time(a.date));
}

function searchDoc(i) {
  const doc = {
    id: i.id,
    type: i.type,
    kind: i.kind ?? null,
    title: i.title,
    summary: i.summary,
    area: i.area,
    areaTitle: i.areaTitle,
    tags: i.tags ?? [],
    agents: i.agents ?? {},
    effects: i.effects ?? [],
    status: i.status,
    url: i.url,
    useWhen: i.useWhen ?? [],
    kit: i.kit ? i.kit.title : null,
    text: i.type === 'part' ? '' : i.text,
  };
  const indexed = indexDoc(doc);
  delete indexed.text;
  delete indexed.useWhen;
  return indexed;
}

function sortBy(list, key) {
  const out = [...list];
  if (key === 'updated') out.sort((a, b) => String(b.updated).localeCompare(String(a.updated)) || a.title.localeCompare(b.title));
  else if (key === 'added') out.sort((a, b) => String(b.added).localeCompare(String(a.added)) || a.title.localeCompare(b.title));
  else if (key === 'name') out.sort((a, b) => a.title.localeCompare(b.title));
  else if (key === 'order') out.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  else out.sort((a, b) => (TYPE_ORDER[a.type] ?? 9) - (TYPE_ORDER[b.type] ?? 9) || a.title.localeCompare(b.title));
  return out;
}

export function resolve(model, query, ctx) {
  if (!query || typeof query !== 'object') return query;
  let list;
  switch (query.from) {
    case 'item': return ctx.item;
    case 'counts': return { counts: model.counts, latest: model.latest };
    case 'items': list = model.items; break;
    case 'stacks': list = model.stacks; break;
    case 'areas': list = model.areas; break;
    case 'releases': list = model.releases; break;
    case 'search': list = [...model.items, ...model.parts]; break;
    default: throw new Error(`unknown query source "${query.from}"`);
  }
  for (const [k, v] of Object.entries(query.where ?? {})) list = list.filter((x) => (Array.isArray(v) ? v.includes(x[k]) : x[k] === v));
  if (query.from !== 'releases') list = sortBy(list, query.sort);
  if (query.limit) list = list.slice(0, query.limit);
  return list;
}
