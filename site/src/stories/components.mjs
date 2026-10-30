/**
 * Examples of the existing component contracts, using catalog data and real copy.
 * Pseudo-states are exercised on the live controls, never painted with fake classes.
 */
import { html } from '../lib/html.mjs';
import { url } from '../lib/urls.mjs';
import { LIGHT_DEFAULTS } from '../lib/lighting.mjs';

const interactive = ['rest', 'hover', 'focus-visible', 'pressed'];
const passive = ['rest'];

export function componentStories(model) {
  const stories = [];
  const add = (component, variant, props, states = passive, options = {}) => stories.push({
    id: `${component}-${variant}`.toLowerCase(), component, variant, props, states, ...options,
  });
  const skill = model.items.find((i) => i.type === 'skill') ?? model.items[0];
  const kit = model.items.find((i) => i.type === 'kit');
  const stack = model.items.find((i) => i.type === 'stack');
  const opts = [{ value: 'project', label: 'This project' }, { value: 'personal', label: 'All my projects' }];
  const target = url('/catalog');
  add('Icon', 'decorative', { name: 'search' });
  add('Icon', 'labelled', { name: 'search', label: 'Search' });
  for (const kind of ['primary', 'secondary', 'quiet']) {
    add('Button', kind, { label: 'Open catalog', kind }, interactive);
    add('Button', `${kind}-disabled`, { label: 'Open catalog', kind, disabled: true }, ['disabled']);
  }
  add('Button', 'link', { label: 'Open catalog', href: target }, interactive);
  add('IconButton', 'default', { label: 'Show lighting', icon: 'lightbulb' }, interactive);
  add('IconButton', 'pressed', { label: 'Show lighting', icon: 'lightbulb', pressed: true }, ['pressed']);
  add('Link', 'inline', { label: 'Catalog', href: target }, interactive);
  add('Link', 'current', { label: 'Catalog', href: target, current: true }, interactive);
  add('Link', 'external', { label: 'Source repository', href: 'https://github.com/prabinpebam/loushing', external: true, newTab: true }, interactive);
  for (const tone of ['neutral', 'positive', 'caution', 'muted']) add('Chip', tone, { label: tone === 'positive' ? 'Tested' : 'Expected', tone });
  add('Chip', 'link', { label: 'Documentation', href: target }, interactive);
  for (const value of ['skill', 'kit', 'stack']) add('Badge', value, { label: value, value });
  for (const value of ['stable', 'beta', 'experimental', 'deprecated', 'moved']) add('Badge', value, { label: value, kind: 'status', value });
  add('SearchBox', 'empty', { id: 'story-search', label: 'Search skills', hideLabel: false, action: target }, [...interactive, 'empty']);
  add('SearchBox', 'filled', { id: 'story-search', label: 'Search skills', hideLabel: false, value: 'write documentation', action: target }, interactive);
  add('SearchBox', 'live', { id: 'story-search', label: 'Search skills', hideLabel: false, live: true, action: target }, interactive);
  add('Tabs', 'default', { id: 'story-tabs', label: 'Ways to get it', tabs: [
    { id: 'git', label: 'Git', panel: 'Get the pinned source with Git.' },
    { id: 'download', label: 'Download', panel: 'Get the complete item ZIP and its checksum.' },
  ] }, interactive);
  add('CopyField', 'command', { lines: ['git status --short'] }, [...interactive, 'success', 'error'], { exercise: 'Copy the command. Test clipboard rejection to see the manual-copy error, and success to hear the copied status.' });
  add('CopyField', 'prompt', { lines: ['Find a skill for writing documentation. Show me what it adds before making changes.'], copyLabel: 'Copy prompt', wrap: true }, [...interactive, 'success', 'error']);
  add('Select', 'default', { id: 'story-select', label: 'Where', options: opts, value: 'project' }, [...interactive, 'open']);
  add('Select', 'empty', { id: 'story-select', label: 'Where', options: [] }, ['empty']);
  add('Segmented', 'default', { name: 'story-scope', label: 'Where', options: opts, value: 'project' }, interactive);
  for (const checked of [false, true]) add('Toggle', checked ? 'on' : 'off', { label: 'Show details', checked, data: { 'story-toggle': 'true' } }, interactive);
  add('Toggle', 'disabled', { label: 'Show details', disabled: true }, ['disabled']);
  add('LightInput', 'range', { id: 'story-range', label: 'Light height', value: 45, min: 0, max: 90, unit: '°' }, interactive);
  add('LightInput', 'color', { id: 'story-color', label: 'Highlight tint', type: 'color', value: LIGHT_DEFAULTS.highlightTint }, interactive);
  for (const tone of ['raised', 'sunken', 'accent']) add('Tile', tone, { children: html`<p>Skills for the task in front of you.</p>`, tone });
  add('Tile', 'link', { children: html`<p>Browse the catalog</p>`, href: target }, interactive);
  add('Metric', 'number', { value: model.items.length, label: 'catalog items', icon: 'widgets' });
  add('Metric', 'date', { value: model.latest?.slice(0, 10) ?? 'Not recorded', label: 'Latest change', kind: 'date' });
  add('Divider', 'default', {});
  add('Skeleton', 'loading', { lines: 3 }, ['loading'], { exercise: 'Decorative placeholder only; the containing view must announce what is loading.' });

  add('Hero', 'default', { title: 'The skills and kits I use', standfirst: 'Each explained plainly, with how to get it.', search: true }, interactive);
  add('StatStrip', 'default', { stats: { counts: model.counts, latest: model.latest } });
  add('AreaTiles', 'default', { items: model.areas }, interactive);
  add('AreaTiles', 'empty', { items: [] }, ['empty']);
  for (const view of ['tiles', 'list']) add('ItemTiles', view, { items: model.items.slice(0, 3), view, heading: 'Items' }, interactive);
  add('ItemTiles', 'empty', { items: [], heading: 'Items' }, ['empty']);
  if (stack) add('StackTiles', 'default', { items: [stack], heading: 'Stacks' }, interactive);
  add('StackTiles', 'empty', { items: [] }, ['empty']);
  add('FacetBar', 'default', { facets: ['type', 'area', 'agent', 'effects', 'status'] }, interactive);
  for (const item of [skill, kit, stack].filter(Boolean)) {
    add('ItemHeader', item.type, { item });
    add('GetItPanel', item.type, { item }, [...interactive, 'unsupported']);
  }
  if (skill) {
    for (const status of ['experimental', 'deprecated', 'moved']) add('ItemHeader', status, { item: { ...skill, status, statusReason: 'Check the source before setting it up.' } });
    add('EffectsChips', 'none', { item: { ...skill, effects: [] } });
    add('EffectsChips', 'declared', { item: { ...skill, effects: [...model.effectsById.keys()] } });
    add('CompatGrid', 'default', { item: skill });
    add('AddsTree', 'default', { item: skill });
    add('WorksWith', 'default', { item: skill }, interactive);
    add('WorksWith', 'empty', { item: { ...skill, related: [] } }, ['empty']);
    add('ItemBody', 'default', { item: skill }, interactive);
    add('SourceViewer', 'default', { item: skill }, interactive);
  }
  if (kit) add('KitAnatomy', 'default', { item: kit }, interactive);
  if (stack) add('StackPath', 'default', { item: stack }, interactive);
  add('ReleaseTimeline', 'default', { items: model.releases.slice(0, 3) });
  add('ReleaseTimeline', 'empty', { items: [] }, ['empty']);
  add('Text', 'default', { markdown: '## Reading the source\n\nEvery item points to its pinned version.' });
  for (const kind of ['no-results', 'not-found', 'gone', 'empty-catalog']) add('EmptyState', kind, { kind }, ['empty']);
  add('ResultsStatus', 'default', { total: model.items.length });
  add('ResultsStatus', 'empty', { total: 0 }, ['empty']);
  add('LightingPanel', 'default', {}, [...interactive, 'disabled', 'open'], { shell: true, exercise: 'Use the shared Lighting disclosure in the title bar. It is the same component, not a duplicate with conflicting IDs.' });
  return stories;
}
