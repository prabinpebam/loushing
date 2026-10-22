/**
 * Fundamentals: the smallest components, sealed. They take props only (no class or
 * style), pass `data` through as data-* attributes, and read only tokens.
 * Styles: site/src/styles/fundamentals.css. Each one is documented here and shown in
 * every state by the library (stage 1 follow-up: /library/).
 * @tier 1
 */
import { attrs, html, raw } from '../lib/html.mjs';
import { iconPaths } from './icons.mjs';

const dataAttrs = (data = {}) => Object.fromEntries(Object.entries(data).map(([k, v]) => [`data-${k}`, v]));

/**
 * Icon: a decorative or labelled Material Symbol drawn in currentColor.
 * Not for: meaning on its own; pair it with a word unless `label` is given.
 * @a11y Decorative by default (aria-hidden); with `label` it becomes role="img".
 * @param {{ name: string, label?: string }} props
 */
export function Icon({ name, label }) {
  const paths = iconPaths(name).map((d) => html`<path d="${d}"/>`);
  return html`<svg class="f-icon" viewBox="0 -960 960 960"${attrs(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': 'true', focusable: 'false' })}>${paths}</svg>`;
}

/**
 * Button: an action, or a link styled as one when `href` is given.
 * kind: primary (one per region), secondary, quiet. Text says what it does.
 * @a11y Native <button>/<a>; 44 px target; visible focus ring.
 * @key Enter, Space activate (native).
 * @param {{ label: string, icon?: string, kind?: 'primary'|'secondary'|'quiet', href?: string, external?: boolean, data?: object, disabled?: boolean }} props
 */
export function Button({ label, icon, kind = 'secondary', href, external = false, data, disabled = false }) {
  const inner = html`${icon && Icon({ name: icon })}<span class="f-button__label">${label}</span>${external && Icon({ name: 'north_east' })}`;
  const a = { class: 'f-button', 'data-kind': kind, ...dataAttrs(data) };
  if (href) return html`<a${attrs({ ...a, href, rel: external ? 'noopener' : null, target: external ? '_blank' : null })}>${inner}</a>`;
  return html`<button${attrs({ ...a, type: 'button', disabled })}>${inner}</button>`;
}

/**
 * IconButton: an icon-only action with a required accessible name.
 * @a11y aria-label from `label`; `pressed` renders aria-pressed for toggles.
 * @param {{ label: string, icon: string, pressed?: boolean, data?: object }} props
 */
export function IconButton({ label, icon, pressed, data }) {
  return html`<button${attrs({ class: 'f-iconbutton', type: 'button', 'aria-label': label, title: label, 'aria-pressed': pressed === undefined ? null : String(pressed), ...dataAttrs(data) })}>${Icon({ name: icon })}</button>`;
}

/**
 * Link: inline navigation. External links say so with an arrow and open in place.
 * @param {{ href: string, label: string, external?: boolean, current?: boolean }} props
 */
export function Link({ href, label, external = false, current = false }) {
  return html`<a${attrs({ class: 'f-link', href, 'aria-current': current ? 'page' : null, rel: external ? 'noopener' : null })}>${label}${external && html`<span class="f-link__ext">${Icon({ name: 'north_east' })}</span>`}</a>`;
}

/**
 * Chip: a short fact (an agent, an effect, a tag); a link when `href` is given.
 * tone: neutral, positive (tested), caution (an effect), muted (expected).
 * @param {{ label: string, icon?: string, tone?: 'neutral'|'positive'|'caution'|'muted', href?: string, title?: string }} props
 */
export function Chip({ label, icon, tone = 'neutral', href, title }) {
  const inner = html`${icon && Icon({ name: icon })}<span>${label}</span>`;
  const a = { class: 'f-chip', 'data-tone': tone, title };
  return href ? html`<a${attrs({ ...a, href })}>${inner}</a>` : html`<span${attrs(a)}>${inner}</span>`;
}

/**
 * Badge: the type or status of an item, as a word.
 * @param {{ label: string, kind?: 'type'|'status', value?: string }} props
 */
export function Badge({ label, kind = 'type', value }) {
  return html`<span${attrs({ class: 'f-badge', 'data-kind': kind, 'data-value': value })}>${label}</span>`;
}

/**
 * SearchBox: the catalog search field. Works without script (submits to /catalog).
 * `live` drops the Search button where results update while typing; Enter still submits.
 * @a11y role=search landmark, a real label (visually hidden when `hideLabel`).
 * @key Enter submits; Escape clears (native search field).
 * @param {{ id: string, label: string, placeholder?: string, value?: string, action?: string, size?: 'lg'|'md', hideLabel?: boolean, live?: boolean, data?: object }} props
 */
export function SearchBox({ id, label, placeholder = '', value = '', action = '/catalog', size = 'md', hideLabel = true, live = false, data }) {
  return html`<form class="f-search" role="search" action="${action}"${attrs({ 'data-size': size, ...dataAttrs(data) })}>
  <label class="f-search__label${hideLabel ? ' u-visually-hidden' : ''}" for="${id}">${label}</label>
  <span class="f-search__field">${Icon({ name: 'search' })}<input id="${id}" class="f-search__input" type="search" name="q" value="${value}" placeholder="${placeholder}" autocomplete="off" spellcheck="false"></span>
  ${!live && html`<button class="f-search__submit" type="submit">Search</button>`}
</form>`;
}

/**
 * Tabs: one panel at a time. Server-rendered with every panel present, so it reads
 * in order without script; the client hides the others and adds the keyboard model.
 * @a11y APG tabs: tablist, tab (aria-selected, aria-controls), tabpanel (aria-labelledby).
 * @key Left/Right move between tabs; Home/End jump; focus follows selection.
 * @param {{ id: string, label: string, tabs: { id: string, label: string, icon?: string, panel: any }[], selected?: string }} props
 */
export function Tabs({ id, label, tabs, selected }) {
  const sel = selected ?? tabs[0]?.id;
  return html`<div class="f-tabs" data-tabs>
  <div class="f-tabs__list" role="tablist" aria-label="${label}">${tabs.map((t) => html`<button${attrs({ class: 'f-tabs__tab', role: 'tab', type: 'button', id: `${id}-tab-${t.id}`, 'aria-controls': `${id}-panel-${t.id}`, 'aria-selected': String(t.id === sel), tabindex: t.id === sel ? '0' : '-1', 'data-tab': t.id })}>${t.icon && Icon({ name: t.icon })}<span>${t.label}</span></button>`)}</div>
  ${tabs.map((t) => html`<div${attrs({ class: 'f-tabs__panel', role: 'tabpanel', id: `${id}-panel-${t.id}`, 'aria-labelledby': `${id}-tab-${t.id}`, 'data-tab': t.id, 'data-selected': String(t.id === sel), tabindex: '0' })}>${t.panel}</div>`)}
</div>`;
}

/**
 * CopyField: a command or prompt in a monospace well with a copy button.
 * The button says "Copy command" then "Copied" (ui-copy); `copyLabel` names the thing.
 * @a11y The copied text is real text, selectable; the result is announced politely.
 * @param {{ lines: string[], copyLabel?: string, wrap?: boolean, data?: object }} props
 */
export function CopyField({ lines, copyLabel = 'Copy command', wrap = false, data }) {
  const text = lines.join('\n');
  return html`<div${attrs({ class: 'f-copy', 'data-wrap': String(wrap), ...dataAttrs(data) })}>
  <pre class="f-copy__text"><code>${text}</code></pre>
  <button class="f-copy__button" type="button" data-copy="${text}" data-copy-label="${copyLabel}">${Icon({ name: 'content_copy' })}<span class="f-copy__label">${copyLabel}</span></button>
</div>`;
}

/**
 * Select: a custom single-choice list (APG select-only combobox) over a native select.
 * The native select is the value and the no-script fallback; the client shows the
 * button and listbox, keeps the two in step and fires the native `change` event.
 * @a11y combobox button (aria-expanded, aria-controls, aria-activedescendant) + listbox
 * of options (aria-selected); the label names both.
 * @key Down/Up/Enter/Space open; Up/Down/Home/End/PageUp/PageDown move; Enter/Space
 * choose; Escape closes; Tab chooses and moves on; typing jumps to a match.
 * @param {{ id: string, label: string, options: { value: string, label: string }[], value?: string, data?: object }} props
 */
export function Select({ id, label, options, value, data }) {
  const sel = options.some((o) => o.value === value) ? value : options[0]?.value;
  const current = options.find((o) => o.value === sel);
  const optId = (v) => `${id}-opt-${String(v).replace(/[^a-z0-9_-]/gi, '-')}`;
  return html`<span class="f-select" data-select><label class="f-select__label" id="${id}-label" for="${id}">${label}</label><span class="f-select__field"><select${attrs({ id, class: 'f-select__input', ...dataAttrs(data) })}>${options.map((o) => html`<option${attrs({ value: o.value, selected: o.value === sel })}>${o.label}</option>`)}</select><button${attrs({ class: 'f-select__button', type: 'button', role: 'combobox', 'aria-haspopup': 'listbox', 'aria-expanded': 'false', 'aria-controls': `${id}-list`, 'aria-labelledby': `${id}-label`, tabindex: '-1' })}><span class="f-select__value">${current?.label ?? ''}</span></button>${Icon({ name: 'keyboard_arrow_down' })}</span><ul${attrs({ class: 'f-select__list', role: 'listbox', id: `${id}-list`, 'aria-labelledby': `${id}-label`, tabindex: '-1', hidden: true })}>${options.map((o) => html`<li${attrs({ class: 'f-select__option', role: 'option', id: optId(o.value), 'data-value': o.value, 'aria-selected': String(o.value === sel) })}><span>${o.label}</span>${Icon({ name: 'check' })}</li>`)}</ul></span>`;
}

/**
 * Segmented: a small single choice shown as buttons (scope, theme).
 * @a11y A radio group of native radios, so arrow keys work without script.
 * @param {{ name: string, label: string, options: { value: string, label: string, icon?: string }[], value?: string, hideLabel?: boolean, data?: object }} props
 */
export function Segmented({ name, label, options, value, hideLabel = false, data }) {
  return html`<fieldset${attrs({ class: 'f-segmented', ...dataAttrs(data) })}><legend class="f-segmented__legend${hideLabel ? ' u-visually-hidden' : ''}">${label}</legend><span class="f-segmented__options">${options.map((o) => html`<label class="f-segmented__option"><input${attrs({ type: 'radio', name, value: o.value, checked: o.value === value })}>${o.icon && Icon({ name: o.icon })}<span>${o.label}</span></label>`)}</span></fieldset>`;
}

/**
 * Toggle: an on/off setting as a switch.
 * @a11y role=switch with aria-checked; the label is the setting, not the state.
 * @param {{ label: string, checked?: boolean, data?: object }} props
 */
export function Toggle({ label, checked = false, data }) {
  return html`<button${attrs({ class: 'f-toggle', type: 'button', role: 'switch', 'aria-checked': String(checked), ...dataAttrs(data) })}><span class="f-toggle__track" aria-hidden="true"><span class="f-toggle__thumb"></span></span><span>${label}</span></button>`;
}

/**
 * Tile: a rounded surface that frames one thing; the whole tile is the link when
 * `href` is given (one link per tile, no nested controls).
 * tone: raised (white card), sunken (a quiet well), accent (the one highlight per view:
 * a coral tint with a folded "dog-ear" corner, u-ear).
 * @param {{ href?: string, tone?: 'raised'|'sunken'|'accent', children: any, data?: object, label?: string }} props
 */
export function Tile({ href, tone = 'raised', children, data, label }) {
  const a = { class: tone === 'accent' ? 'f-tile u-ear' : 'f-tile', 'data-tone': tone, 'aria-label': label, ...dataAttrs(data) };
  return href ? html`<a${attrs({ ...a, href })}>${children}</a>` : html`<div${attrs(a)}>${children}</div>`;
}

/**
 * Metric: a number with its label and an icon, for stat strips. `kind: 'date'` sets a
 * date at a smaller size so it stays on one line.
 * @param {{ value: string|number, label: string, icon?: string, kind?: 'number'|'date' }} props
 */
export function Metric({ value, label, icon, kind = 'number' }) {
  return html`<span class="f-metric" data-kind="${kind}">${icon && html`<span class="f-metric__icon">${Icon({ name: icon })}</span>`}<span class="f-metric__value">${String(value)}</span><span class="f-metric__label">${label}</span></span>`;
}

/**
 * Divider: a hairline between sections; marks a section-break cameo zone when asked.
 * @param {{ zone?: boolean }} props
 */
export function Divider({ zone = false } = {}) {
  return zone ? html`<div class="f-divider" data-zone-host="section-break"><hr><div class="chopper-zone" data-zone="section-break" aria-hidden="true"></div></div>` : html`<hr class="f-divider">`;
}

/** Skeleton: a placeholder line while a client-side part loads (search results). */
export function Skeleton({ lines = 3 } = {}) {
  return html`<div class="f-skeleton" aria-hidden="true">${Array.from({ length: lines }, () => raw('<span class="f-skeleton__line"></span>'))}</div>`;
}
