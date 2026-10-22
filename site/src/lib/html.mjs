/**
 * HTML helpers. Tier 0: pure.
 *
 * `html` is a tagged template that escapes every interpolated value unless it is a
 * `SafeHtml` (the result of `html` or `raw`). Arrays are joined. null, undefined and
 * false render nothing, so conditionals read naturally: ${cond && html`…`}.
 */

export class SafeHtml {
  constructor(value) {
    this.value = value;
  }
  toString() {
    return this.value;
  }
}

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
}

/** Marks a string as already-safe HTML. Use only for output of this module or the Markdown renderer. */
export function raw(value) {
  return new SafeHtml(String(value ?? ''));
}

function part(v) {
  if (v === null || v === undefined || v === false || v === true) return '';
  if (v instanceof SafeHtml) return v.value;
  if (Array.isArray(v)) return v.map(part).join('');
  return esc(v);
}

export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) out += part(values[i]) + strings[i + 1];
  return new SafeHtml(out);
}

/** Renders an attribute map; true renders the bare name, false/null/undefined are left out. */
export function attrs(map) {
  const out = [];
  for (const [k, v] of Object.entries(map)) {
    if (v === false || v === null || v === undefined) continue;
    out.push(v === true ? ` ${k}` : ` ${k}="${esc(v)}"`);
  }
  return raw(out.join(''));
}

/** A URL-safe slug for anchors. */
export function slug(text) {
  return String(text)
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[`*_~]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}
