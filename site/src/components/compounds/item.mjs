/**
 * Compounds for item pages (skills, kits, parts, stacks). Each maps to one view block.
 * Made from fundamentals and tokens only; they take resolved plain data.
 * Styles: site/src/styles/compounds.css.
 * @tier 2
 */
import { html, raw } from '../../lib/html.mjs';
import { renderMarkdown, sections as splitSections } from '../../lib/markdown.mjs';
import { url } from '../../lib/urls.mjs';
import { Badge, Button, Chip, CopyField, Icon, Link, Segmented, Select, Tabs, Tile } from '../fundamentals.mjs';
import { bytes, formatDate, plural, RELATION_TITLES } from './format.mjs';

export const DEFAULT_AGENT = 'copilot-vscode';
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : '');
const short = (sha) => String(sha ?? '').slice(0, 7);

function githubAt(item, path = '') {
  const repo = item.source?.repo;
  const commit = item.source?.commit;
  if (!repo || !commit) return null;
  return `${repo}/${path && !path.endsWith('/') && /\.\w+$/.test(path) ? 'blob' : 'tree'}/${commit}/${path}`;
}

function md(src, item, opts = {}) {
  const resolveLink = (h) => (/^(https?:|mailto:|#)/.test(h) ? h : githubAt(item, h.replace(/^\.\//, '')) ?? h);
  return raw(renderMarkdown(src ?? '', { resolveLink, headingShift: 1, ...opts }));
}

/**
 * ItemHeader: type, status, title, summary, facts and agent chips (block `item-header`).
 * Holds the Banner for experimental, deprecated and moved items and for parts.
 * @param {{ item: object }} props
 */
export function ItemHeader({ item }, { model }) {
  const status = model.statusById.get(item.status);
  const kit = item.type === 'part' ? item.kit : null;
  const type = item.type === 'part' ? item.kindTitle : item.typeTitle;
  const agents = Object.entries(item.agents ?? {}).filter(([, v]) => v !== 'unsupported');
  return html`<header class="c-itemhead">
  <nav class="c-crumbs" aria-label="Breadcrumb"><ol>
    <li>${Link({ href: url('/catalog'), label: 'Catalog' })}</li>
    ${item.area && html`<li>${Link({ href: url(`/catalog?area=${item.area}`), label: item.areaTitle })}</li>`}
    ${kit && html`<li>${Link({ href: url(kit.url), label: kit.title })}</li>`}
  </ol></nav>
  ${kit && Banner({ icon: 'inventory_2', tone: 'info', text: html`Part of <a href="${url(kit.url)}">${kit.title}</a>. Get the kit to use it.` })}
  ${item.status === 'experimental' && Banner({ icon: 'construction', tone: 'caution', text: 'Experimental: may change or be removed. Pin a version if you depend on it.' })}
  ${item.status === 'deprecated' && Banner({ icon: 'warning', tone: 'caution', text: `Deprecated: ${item.statusReason ?? 'use its replacement.'}` })}
  ${item.status === 'moved' && Banner({ icon: 'drive_file_move', tone: 'info', text: `Moved: ${item.statusReason ?? 'now lives in its own repository. Installing still works.'}` })}
  <p class="c-itemhead__badges">${Badge({ label: type, kind: 'type', value: item.type === 'part' ? item.kind : item.type })}${status && html`<span class="c-itemhead__status" title="${status.explain}">${Badge({ label: status.title, kind: 'status', value: status.id })}<span class="c-itemhead__explain">${status.explain}</span></span>`}</p>
  <h1 class="c-itemhead__title">${item.title}</h1>
  <p class="c-itemhead__summary">${item.summary}</p>
  <ul class="c-itemhead__facts">
    ${item.version && html`<li>${Icon({ name: 'sell' })}<span>Version ${item.version}</span></li>`}
    ${item.updated && html`<li>${Icon({ name: 'history' })}<span>Updated ${formatDate(item.updated)}</span></li>`}
    ${item.groups && html`<li>${Icon({ name: 'category' })}<span>${plural(item.parts.length, 'part')}</span></li>`}
    ${item.type === 'stack' && html`<li>${Icon({ name: 'stacks' })}<span>${plural(item.memberItems.length, 'kit')}</span></li>`}
  </ul>
  ${(item.tags ?? []).length > 0 && html`<p class="c-itemhead__tags">${item.tags.map((t) => Chip({ label: t, icon: 'sell', href: url(`/catalog?q=${encodeURIComponent(t)}`) }))}</p>`}
  ${agents.length > 0 && html`<p class="c-itemhead__agents"><span class="c-itemhead__label">Works with</span>${agents.map(([a, v]) => Chip({ label: `${model.agentsById.get(a)?.short ?? a}${v === 'tested' ? ' · tested' : ''}`, icon: v === 'tested' ? 'verified' : 'check', tone: v === 'tested' ? 'positive' : 'muted', href: '#compat' }))}</p>`}
</header>`;
}

/** Banner: a one-line notice inside a header. */
function Banner({ icon, tone, text }) {
  return html`<p class="c-banner" data-tone="${tone}">${Icon({ name: icon })}<span>${text}</span></p>`;
}

/**
 * GetItPanel: the primary action (block `get-it-panel`). Agent picker, scope, and the
 * methods as tabs, for every agent and scope; the client shows the chosen one.
 * Without script, the default (VS Code Copilot, this project) is shown.
 * @a11y The plans are swapped with `hidden`, so only the chosen one is read.
 * @param {{ item: object }} props
 */
export function GetItPanel({ item }, { model }) {
  if (item.type === 'part') {
    return html`<section class="c-getit" id="get-it" aria-labelledby="getit-title">
  <h2 class="c-getit__title" id="getit-title">${Icon({ name: 'download' })}Get it</h2>
  <p class="c-getit__line">${item.title} comes with ${item.kit.title}. Get the kit to use it.</p>
  ${Button({ label: `Get ${item.kit.title}`, icon: 'arrow_forward', kind: 'primary', href: url(`${item.kit.url}#get-it`) })}
</section>`;
  }
  const agents = model.taxonomy.agents;
  const effects = (item.effects ?? []).map((e) => model.effectsById.get(e)).filter(Boolean);
  return html`<section class="c-getit" id="get-it" aria-labelledby="getit-title" data-getit data-default-agent="${DEFAULT_AGENT}">
  <h2 class="c-getit__title" id="getit-title">${Icon({ name: 'download' })}Get it</h2>
  <div class="c-getit__pickers">
    ${Select({ id: `agent-${item.id}`, label: 'Your agent', value: DEFAULT_AGENT, options: agents.map((a) => ({ value: a.id, label: a.title })), data: { 'agent-picker': 'true' } })}
    ${Segmented({ name: `scope-${item.id}`, label: 'Where', value: 'project', options: [{ value: 'project', label: 'This project' }, { value: 'personal', label: 'All my projects' }], data: { 'scope-picker': 'true' } })}
  </div>
  ${agents.flatMap((a) => ['project', 'personal'].map((scope) => PlanView(item, a, scope, model)))}
  ${effects.length > 0 && html`<div class="c-getit__before"><p class="c-getit__before-title">Before you copy</p><ul>${effects.map((e) => html`<li>${Icon({ name: e.icon })}<a href="#trust">${e.line}</a></li>`)}</ul></div>`}
</section>`;
}

function PlanView(item, agent, scope, model) {
  const key = `${agent.id}:${scope}`;
  const p = item.plans[key];
  const shown = agent.id === DEFAULT_AGENT && scope === 'project';
  const id = `get-${item.id}-${agent.id}-${scope}`.replace(/[^a-z0-9-]/gi, '-');
  let body;
  if (!p.supported) {
    const supported = Object.entries(item.agents ?? {}).filter(([, v]) => v !== 'unsupported').map(([a]) => model.agentsById.get(a)?.title ?? a);
    const clone = item.source?.commit ? [`git clone ${item.source.repo}.git ${item.id}`, `git -C ${item.id} checkout ${item.source.commit}`] : [];
    body = html`<div class="c-getit__unsupported">
  <p class="c-getit__notice">${Icon({ name: 'info' })}<span>${p.reason}${scope === 'project' && supported.length ? ` It's set up for ${supported.join(' and ')}.` : ''}</span></p>
  ${clone.length > 0 && html`<p class="c-getit__line">You can still get the files and set them up by hand:</p>${CopyField({ lines: clone })}`}
</div>`;
  } else {
    const tabs = [
      { id: 'git', label: 'Git', icon: 'fork_right', panel: html`${CopyField({ lines: p.git })}<p class="c-getit__hint">Run these in your project's folder.${p.inputs?.length ? ` Replace ${p.inputs.map((i) => `“${i.example}” with your ${i.ask.toLowerCase()}`).join(', ')}.` : ''}</p>` },
      { id: 'ask', label: 'Ask your agent', icon: 'chat', panel: html`${CopyField({ lines: [p.ask], copyLabel: 'Copy prompt', wrap: true })}<p class="c-getit__hint">Paste this into your agent's chat. It shows you the plan before changing anything.</p>` },
      p.download && { id: 'download', label: 'Download', icon: 'download', panel: html`${Button({ label: 'Download ZIP', icon: 'download', kind: 'secondary', href: p.download })}<p class="c-getit__hint">The repository at commit ${short(item.source.commit)}, from GitHub. GitHub builds the ZIP on request, so it has no fixed checksum; the commit is the fingerprint.</p>` },
      { id: 'command', label: 'Command', icon: 'terminal', panel: html`${CopyField({ lines: [p.command] })}<p class="c-getit__hint">${Badge({ label: 'Coming soon', kind: 'status', value: 'soon' })} The Loushing command isn't published yet. Use Git or Ask your agent for now.</p>` },
    ].filter(Boolean);
    const first = p.adds[0];
    body = html`${Tabs({ id, label: 'Ways to get it', tabs, selected: 'git' })}
  ${first && html`<p class="c-getit__adds">${Icon({ name: 'folder' })}<span>Adds <code>${first.path}</code>${p.adds.length > 1 ? ` and ${plural(p.adds.length - 1, 'more item')}` : ''} ${scope === 'personal' ? 'for all your projects' : 'to this project'}. <a href="#adds">See everything it adds</a></span></p>`}
  ${p.next && html`<p class="c-getit__next">${Icon({ name: 'arrow_forward' })}<span><strong>Then:</strong> ${p.next}</span></p>`}`;
  }
  return html`<div class="c-getit__plan" data-plan="${key}"${shown ? '' : raw(' hidden')}>${body}</div>`;
}

/**
 * EffectsChips: what the item can do beyond giving instructions (block `effects-chips`),
 * as icon plus word. "Only instructions" when it declares none.
 * @param {{ item: object }} props
 */
export function EffectsChips({ item }, { model }) {
  const effects = (item.effects ?? []).map((e) => model.effectsById.get(e)).filter(Boolean);
  return html`<div class="c-effects" aria-label="What it can do">${effects.length ? effects.map((e) => Chip({ label: e.title, icon: e.icon, tone: 'caution', href: '#trust', title: e.line })) : Chip({ label: 'Only instructions', icon: 'description', tone: 'positive' })}</div>`;
}

/**
 * CompatGrid: every agent with tested, expected or not supported, a word in every cell
 * (block `compat-grid`).
 * @param {{ item: object }} props
 */
export function CompatGrid({ item }, { model }) {
  const words = { tested: ['Tested', 'verified'], expected: ['Expected to work', 'check'], unknown: ['Not tried yet', 'help'], unsupported: ['Not supported', 'close'] };
  return html`<section class="c-compat" id="compat" aria-labelledby="compat-title">
  <h2 class="c-section-title" id="compat-title">Agents</h2>
  <ul class="c-compat__grid">${model.taxonomy.agents.map((a) => {
    const v = item.agents?.[a.id] ?? 'unknown';
    return html`<li class="c-compat__cell" data-value="${v}"><span class="c-compat__agent">${a.title}</span><span class="c-compat__value">${Icon({ name: words[v][1] })}${words[v][0]}</span></li>`;
  })}</ul>
  <p class="c-compat__note"><strong>Tested</strong> means the owner used it with that agent. <strong>Expected</strong> means it follows the shared skill format and should work, but hasn't been tried. <strong>Not tried yet</strong> means the item doesn't say either way.</p>
</section>`;
}

/** Turns paths into a nested tree: folders first, each leaf keeps its role. */
export function toTree(adds) {
  const root = { name: '', children: new Map() };
  for (const a of adds) {
    const isDir = a.path.endsWith('/');
    const parts = a.path.replace(/\/$/, '').split('/');
    let node = root;
    parts.forEach((name, i) => {
      if (!node.children.has(name)) node.children.set(name, { name, children: new Map(), dir: i < parts.length - 1 || isDir });
      node = node.children.get(name);
    });
    node.role = a.role;
  }
  return root;
}

function TreeView(node) {
  const kids = [...node.children.values()].sort((a, b) => (b.dir - a.dir) || a.name.localeCompare(b.name));
  return html`<ul>${kids.map((k) => html`<li data-dir="${String(k.dir)}"><span class="c-tree__name">${Icon({ name: k.dir ? 'folder' : 'description' })}<code>${k.name}${k.dir ? '/' : ''}</code></span>${k.role && html`<span class="c-tree__role">${k.role}</span>`}${k.children.size > 0 && TreeView(k)}</li>`)}</ul>`;
}

/**
 * AddsTree: exactly what the item adds, as a file tree with a role on each entry, for
 * the chosen agent and scope; beside it the trust panel (block `adds-tree`).
 * @param {{ item: object }} props
 */
export function AddsTree({ item }, { model }) {
  if (item.type === 'part') return html``;
  const effects = (item.effects ?? []).map((e) => model.effectsById.get(e)).filter(Boolean);
  const plans = Object.entries(item.plans);
  const lead = splitSections(item.body ?? '').sections.find((s) => s.title === SECTION_TITLES.adds);
  return html`<section class="c-adds" id="adds" aria-labelledby="adds-title">
  <h2 class="c-section-title" id="adds-title">What it adds to your project</h2>
  ${lead && html`<div class="prose c-adds__lead">${md(lead.body, item, { headingShift: 2, idPrefix: 'adds-' })}</div>`}
  <div class="c-adds__grid">
    <div class="c-adds__trees">${plans.map(([key, p]) => html`<div class="c-tree" data-plan="${key}"${key === `${DEFAULT_AGENT}:project` ? '' : raw(' hidden')}>${p.supported ? TreeView(toTree(p.adds)) : html`<p class="c-adds__none">${p.reason}</p>`}</div>`)}
      <p class="c-adds__note">For the agent and place chosen in Get it.</p>
    </div>
    <dl class="c-trust" id="trust" aria-label="Trust panel">
      <div><dt>${Icon({ name: 'bolt' })}Can do</dt><dd>${effects.length ? html`<ul>${effects.map((e) => html`<li>${e.line}</li>`)}</ul>` : 'Only instructions: no scripts, network or credentials.'}</dd></div>
      ${(item.requires ?? []).length > 0 && html`<div><dt>${Icon({ name: 'checklist' })}Needs</dt><dd><ul>${item.requires.map((r) => html`<li>${r}</li>`)}</ul></dd></div>`}
      <div><dt>${Icon({ name: 'verified' })}License</dt><dd>${item.license === 'NOASSERTION' ? html`Not stated yet. ${item.licenseNote ?? 'Ask the owner before reusing it.'}` : item.license}${item.origin && html` · ${cap(item.origin)}`}</dd></div>
      ${item.source?.commit && html`<div><dt>${Icon({ name: 'fact_check' })}Pinned at</dt><dd><a href="${githubAt(item)}"><code>${short(item.source.commit)}</code></a>${item.updated && html`, ${formatDate(item.updated)}`}</dd></div>`}
      <div><dt>${Icon({ name: 'checklist' })}What Loushing checked</dt><dd>The card's fields, sections and links${item.type === 'kit' ? ', that the pinned commit exists and the parts it lists are there' : ''}${item.type === 'skill' ? ', the files, their sizes and hashes' : ''}.</dd></div>
    </dl>
  </div>
</section>`;
}

/**
 * KitAnatomy: a kit's parts grouped by kind around its hub, each linking to its part
 * page (block `kit-anatomy`).
 * @param {{ item: object }} props
 */
export function KitAnatomy({ item }) {
  if (!item.groups) return html``;
  const hub = item.partItems.find((p) => p.hub);
  return html`<section class="c-anatomy" id="inside" aria-labelledby="inside-title">
  <h2 class="c-section-title" id="inside-title">What's inside</h2>
  ${hub && html`<div class="c-anatomy__hub">${Tile({ href: url(hub.url), tone: 'accent', children: html`<span class="c-anatomy__hub-kicker">${Icon({ name: 'explore' })}Start here</span><span class="c-anatomy__hub-name"><code>${hub.name}</code></span><span class="c-anatomy__hub-line">${item.anatomy.hubLine}</span>` })}</div>`}
  <div class="c-anatomy__groups">${item.groups.map((g) => html`<section class="c-anatomy__group" data-kind="${g.kind}" aria-labelledby="g-${g.kind}">
    <h3 class="c-anatomy__group-title" id="g-${g.kind}">${Icon({ name: g.icon })}${g.title}<span class="c-anatomy__count">${g.parts.length}</span></h3>
    <p class="c-anatomy__group-line">${g.line}</p>
    <ul>${item.partItems.filter((p) => p.kind === g.kind).map((p) => html`<li><a class="c-anatomy__part" href="${url(p.url)}"><code>${p.name}</code><span>${firstSentence(p.summary)}</span></a></li>`)}</ul>
  </section>`)}</div>
</section>`;
}

function firstSentence(s) {
  const t = String(s ?? '');
  const m = /^(.{20,160}?[.!?])(\s|$)/.exec(t);
  return m ? m[1] : t.length > 160 ? `${t.slice(0, 157)}…` : t;
}

/**
 * StackPath: a stack's members in order, then how they hand off (block `stack-path`).
 * @param {{ item: object }} props
 */
export function StackPath({ item }, { model }) {
  const title = (id) => model.byId.get(id)?.title ?? id;
  return html`<section class="c-path" id="members" aria-labelledby="members-title">
  <h2 class="c-section-title" id="members-title">Members, in order</h2>
  <ol class="c-path__steps">${item.memberItems.map((m, i) => html`<li class="c-path__step">${Tile({ href: url(m.item.url), tone: 'raised', children: html`<span class="c-path__num">${i + 1}</span><span class="c-path__name">${m.item.title}</span><span class="c-path__role">${m.role}</span>` })}</li>`)}</ol>
  ${(item.handoffs ?? []).length > 0 && html`<h3 class="c-path__subtitle">How they hand off</h3>
  <ul class="c-path__handoffs">${item.handoffs.map((h) => html`<li class="c-path__handoff">
    <span class="c-path__from">${title(h.from)}</span>
    <span class="c-path__flow">${Icon({ name: 'east' })}<span class="c-path__gives">${h.gives}</span></span>
    <span class="c-path__to">${title(h.to)}</span>
    <span class="c-path__uses">Used as: ${h.uses}</span>
  </li>`)}</ul>`}
</section>`;
}

/**
 * WorksWith: related items as small cards with the relation and its reason
 * (block `works-with`).
 * @param {{ item: object }} props
 */
export function WorksWith({ item }, { model }) {
  const rel = (item.type === 'part' ? [] : item.related ?? []).map((r) => ({ ...r, other: model.byId.get(r.id) })).filter((r) => r.other);
  if (!rel.length) return html``;
  return html`<section class="c-works" id="works-with" aria-labelledby="works-title">
  <h2 class="c-section-title" id="works-title">Works well with</h2>
  <ul class="c-works__grid">${rel.map((r) => html`<li>${Tile({ href: url(r.other.url), tone: 'raised', children: html`<span class="c-works__kind">${Icon({ name: r.kind === 'feedsInto' ? 'east' : r.kind === 'picksUpFrom' ? 'arrow_back' : r.kind === 'inStack' ? 'stacks' : 'link' })}${RELATION_TITLES[r.kind] ?? r.kind}</span><span class="c-works__title">${r.other.title}</span><span class="c-works__reason">${r.reason}</span>` })}</li>`)}</ul>
</section>`;
}

const SECTION_TITLES = { what: 'What it does', how: 'How it works', adds: 'What it adds to your project', good: 'Good to know', after: 'After setup' };

/**
 * ItemBody: the card's plain-language sections as text (block `item-body`).
 * `sections` picks which, in order, so a view can split the body across regions:
 * what, use (use it when / not for), try (examples), how, adds, good, after, part.
 * @param {{ item: object, sections?: string[] }} props
 */
export function ItemBody({ item, sections }, { model }) {
  const parsed = splitSections(item.body ?? '');
  const find = (title) => parsed.sections.find((s) => s.title === title);
  const order = sections ?? ['what', 'use', 'try', 'how', 'adds', 'good', 'after'];
  const out = order.map((key) => {
    if (key === 'use') return UseWhen(item, model);
    if (key === 'try') return TryIt(item);
    if (key === 'part') return PartBody(item);
    const s = find(SECTION_TITLES[key]);
    if (!s) return null;
    const id = s.id ?? key;
    return html`<section class="c-body__section" aria-labelledby="s-${id}"><h2 class="c-section-title" id="s-${id}">${s.title}</h2><div class="prose">${md(s.body, item, { headingShift: 2, idPrefix: `${id}-` })}</div></section>`;
  });
  return html`<div class="c-body">${out}</div>`;
}

function UseWhen(item, model) {
  if (!(item.useWhen ?? []).length && !(item.notFor ?? []).length) return null;
  const linkAlt = (line) => {
    for (const other of model.items) {
      if (other.id === item.id) continue;
      const at = line.indexOf(`use ${other.title}`);
      if (at >= 0) {
        const name = other.title;
        return html`${line.slice(0, at + 4)}<a href="${url(other.url)}">${name}</a>${line.slice(at + 4 + name.length)}`;
      }
    }
    return line;
  };
  return html`<section class="c-use" aria-label="Use it when, and not for">
  <div class="c-use__col" data-tone="yes"><h3 class="c-use__title">${Icon({ name: 'check_circle' })}Use it when</h3><ul>${(item.useWhen ?? []).map((l) => html`<li>${l}</li>`)}</ul></div>
  ${(item.notFor ?? []).length > 0 && html`<div class="c-use__col" data-tone="no"><h3 class="c-use__title">${Icon({ name: 'close' })}Not for</h3><ul>${item.notFor.map((l) => html`<li>${linkAlt(l)}</li>`)}</ul></div>`}
</section>`;
}

function TryIt(item) {
  const ex = item.examples ?? [];
  return html`<section class="c-try" id="try" aria-labelledby="try-title">
  <h2 class="c-section-title" id="try-title">Try it</h2>
  ${ex.length ? html`<ol class="c-try__list">${ex.map((e) => html`<li class="c-try__item">${CopyField({ lines: [e.prompt], copyLabel: 'Copy prompt', wrap: true })}<p class="c-try__expect">${Icon({ name: 'arrow_forward' })}<span>${e.expect}</span></p></li>`)}</ol>` : html`<p class="c-try__none">No examples yet.</p>`}
</section>`;
}

function PartBody(item) {
  return html`<section class="c-body__section" aria-labelledby="s-what"><h2 class="c-section-title" id="s-what">What it does</h2><p>${item.hub ? html`This is the kit's starting point: it routes to the other parts.` : html`It's one of ${item.kit.title}'s parts. Your agent loads it from the kit when a task needs it.`}</p></section>`;
}

/**
 * SourceViewer: the item's files at the pinned version, its changes, links for agents
 * and a way to report a problem (block `source-viewer`).
 * Markdown files show rendered, other text files with line numbers; large or binary
 * files show their size and hash with a link instead.
 * @param {{ item: object }} props
 */
export function SourceViewer({ item }, { model }) {
  const files = item.type === 'kit' ? kitFiles(item) : item.files ?? [];
  const entries = model.releases.filter((r) => r.item.id === (item.type === 'part' ? item.kit.id : item.id));
  const dataPath = item.type === 'part' ? null : url(`/items/${item.id}`);
  const issue = `https://github.com/prabinpebam/loushing/issues/new?title=${encodeURIComponent(`${item.title}: `)}&body=${encodeURIComponent(`Item: ${item.id}\nVersion: ${item.version ?? ''}\nCommit: ${item.source?.commit ?? ''}\n\nWhat happened:\n\nWhat you expected:\n`)}`;
  return html`<section class="c-source" id="source" aria-labelledby="source-title">
  <h2 class="c-section-title" id="source-title">Source</h2>
  ${item.source?.commit && html`<p class="c-source__pin">${Icon({ name: 'fact_check' })}<span>At commit <code>${short(item.source.commit)}</code>${item.type === 'kit' && item.fileCount ? html` · ${plural(item.fileCount, 'file')} in the repository` : ''}</span>${Button({ label: 'Open on GitHub', icon: 'code', kind: 'quiet', href: githubAt(item, item.source.path ?? ''), external: true })}</p>`}
  ${files.length > 0 && html`<div class="c-source__files">${files.map((f, i) => SourceFile(f, item, i === 0))}</div>`}
  <div class="c-source__grid">
    ${entries.length > 0 && html`<section class="c-source__box" aria-labelledby="changes-title"><h3 id="changes-title">${Icon({ name: 'history' })}Changes</h3><ul>${entries.map((e) => html`<li><span class="c-source__date">${formatDate(e.date)}</span> ${e.line}</li>`)}</ul></section>`}
    ${dataPath && html`<section class="c-source__box" aria-labelledby="agents-title"><h3 id="agents-title">${Icon({ name: 'smart_toy' })}For agents</h3><ul><li><a href="${dataPath}.json">This item as JSON</a>: card, files, hashes and install plans</li><li><a href="${dataPath}.md">This page as Markdown</a></li><li>Soon: <code>npx loushing info ${item.id} --json</code></li></ul></section>`}
    <section class="c-source__box" aria-labelledby="report-title"><h3 id="report-title">${Icon({ name: 'bug_report' })}Report a problem</h3><p>Something wrong or out of date? <a href="${issue}">Open an issue</a> with the item and version filled in.</p></section>
  </div>
</section>`;
}

function kitFiles(item) {
  return item.readme ? [{ path: 'README.md', size: Buffer.byteLength(item.readme), text: item.readme, role: 'documentation' }] : [];
}

function SourceFile(f, item, open) {
  const isMd = /\.md$/i.test(f.path);
  const name = f.path.split('/').pop();
  const content = f.text == null
    ? html`<p class="c-source__binary">${bytes(f.size)}${f.sha256 && html` · SHA-256 <code>${f.sha256.slice(0, 16)}…</code>`}. Too large or not text, so it isn't shown here.</p>`
    : isMd
      ? html`<div class="prose c-source__md">${md(stripFront(f.text), item, { headingShift: 2, idPrefix: `src-${name.replace(/\W/g, '')}-` })}</div>`
      : html`<pre class="c-source__code"><code>${f.text.split(/\r?\n/).map((l) => html`<span class="c-source__line">${l}</span>\n`)}</code></pre>`;
  return html`<details class="c-source__file"${open ? raw(' open') : ''}><summary>${Icon({ name: isMd ? 'description' : 'code' })}<code>${f.path}</code><span class="c-source__size">${bytes(f.size)}</span></summary>${content}</details>`;
}

function stripFront(text) {
  return String(text).replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
}
