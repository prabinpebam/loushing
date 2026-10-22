/**
 * Catalog search: tokenizing, ranking and facet filtering. Tier 0: pure.
 * The same module runs in the build (tests) and in the browser, so results match.
 *
 * Ranking: each query term is matched against weighted fields (title, use-when lines,
 * summary, tags, area, kit and part text). Exact words score more than prefixes; the
 * last term also matches as a prefix so results update while typing. Every term must
 * match somewhere, or the item is left out.
 */

const STOP = new Set('a an and are as at be by for from how i in into is it its me my of on or our so that the this to use using want we what when with you your'.split(' '));

const WEIGHTS = { title: 8, id: 6, useWhen: 4, summary: 4, tags: 3, area: 2, text: 1 };

export function stem(word) {
  let w = word;
  if (w.length > 5 && w.endsWith('ing')) w = w.slice(0, -3);
  else if (w.length > 4 && w.endsWith('ies')) w = w.slice(0, -3) + 'y';
  else if (w.length > 4 && w.endsWith('ed')) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1);
  return w;
}

export function tokenize(text, { keepStop = false } = {}) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((w) => w && (keepStop || !STOP.has(w)))
    .map(stem);
}

/** Builds the compact per-document token lists the client ranks against. */
export function indexDoc(doc) {
  return {
    ...doc,
    f: {
      title: tokenize(doc.title),
      id: tokenize(doc.id),
      useWhen: tokenize((doc.useWhen ?? []).join(' ')),
      summary: tokenize(doc.summary),
      tags: tokenize((doc.tags ?? []).join(' ')),
      area: tokenize(doc.areaTitle ?? doc.area),
      text: tokenize(doc.text),
    },
  };
}

export function score(doc, terms) {
  if (!terms.length) return 1;
  let total = 0;
  for (let t = 0; t < terms.length; t++) {
    const term = terms[t];
    const prefix = t === terms.length - 1 && term.length >= 2;
    let best = 0;
    for (const [field, words] of Object.entries(doc.f)) {
      const w = WEIGHTS[field] ?? 1;
      for (const word of words) {
        if (word === term) best = Math.max(best, w * 2);
        else if (prefix && word.startsWith(term)) best = Math.max(best, w);
        else if (term.length >= 4 && word.length >= 4 && (word.startsWith(term) || term.startsWith(word))) best = Math.max(best, w * 0.75);
      }
    }
    if (!best) return 0;
    total += best;
  }
  if (doc.type !== 'part') total *= 1.15;
  return total;
}

/**
 * Filters by facets, then ranks by the query.
 * filters: { type: [], area: [], agent: [], without: [effects], status: [], deprecated: bool }
 */
export function search(docs, query, filters = {}) {
  const terms = tokenize(query);
  const matched = [];
  let hiddenByAgent = 0;
  for (const doc of docs) {
    if (!passes(doc, filters, { ignoreAgent: false })) {
      if (filters.agent?.length && passes(doc, filters, { ignoreAgent: true }) && score(doc, terms) > 0) hiddenByAgent++;
      continue;
    }
    const s = score(doc, terms);
    if (s > 0) matched.push({ doc, s });
  }
  matched.sort((a, b) => b.s - a.s || order(a.doc) - order(b.doc) || a.doc.title.localeCompare(b.doc.title));
  return { results: matched.map((m) => m.doc), hiddenByAgent, terms };
}

function order(doc) {
  return { kit: 0, stack: 1, skill: 2, part: 3 }[doc.type] ?? 4;
}

export function passes(doc, f, { ignoreAgent }) {
  const type = doc.type === 'part' ? 'kit' : doc.type;
  if (f.type?.length && !f.type.includes(type)) return false;
  if (f.area?.length && !f.area.includes(doc.area)) return false;
  if (!ignoreAgent && f.agent?.length && !f.agent.some((a) => doc.agents?.[a] === 'tested' || doc.agents?.[a] === 'expected')) return false;
  if (f.without?.length && (doc.effects ?? []).some((e) => f.without.includes(e))) return false;
  if (f.status?.length && !f.status.includes(doc.status)) return false;
  if (!f.deprecated && !f.status?.includes('deprecated') && doc.status === 'deprecated') return false;
  return true;
}

/** Counts for each facet value over the given docs, for the facet bar. */
export function facetCounts(docs, facet) {
  const counts = {};
  for (const doc of docs) {
    const values = facet === 'type' ? [doc.type === 'part' ? 'kit' : doc.type]
      : facet === 'agent' ? Object.entries(doc.agents ?? {}).filter(([, v]) => v !== 'unsupported').map(([k]) => k)
      : facet === 'without' ? doc.effects ?? []
      : [doc[facet]];
    for (const v of values) if (v) counts[v] = (counts[v] ?? 0) + 1;
  }
  return counts;
}

/** Facet state <-> URL query string, so a filtered view can be shared. */
export function filtersToQuery(q, f) {
  const p = new URLSearchParams();
  if (q) p.set('q', q);
  for (const k of ['type', 'area', 'agent', 'without', 'status']) if (f[k]?.length) p.set(k, f[k].join(','));
  if (f.deprecated) p.set('deprecated', '1');
  return p.toString();
}

export function queryToFilters(search) {
  const p = new URLSearchParams(search);
  const list = (k) => (p.get(k) ? p.get(k).split(',').filter(Boolean) : []);
  return {
    q: p.get('q') ?? '',
    filters: { type: list('type'), area: list('area'), agent: list('agent'), without: list('without'), status: list('status'), deprecated: p.get('deprecated') === '1' },
  };
}
