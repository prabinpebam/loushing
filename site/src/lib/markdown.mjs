/**
 * A small, safe Markdown renderer with no dependencies. Tier 0: pure.
 *
 * Covers what catalog cards and kit files use: ATX headings, paragraphs, emphasis,
 * inline code, links, fenced code, nested lists, task-free GFM tables, block quotes
 * and rules. Raw HTML in the source is escaped, never passed through: kit files are
 * shown as content, not trusted markup.
 *
 * Options:
 *   resolveLink(href) -> href   rewrite relative links (for example to GitHub at a commit)
 *   headingShift                add to every heading level (1 renders an h1 as h2)
 *   idPrefix                    prefix for heading ids
 */
import { esc, slug } from './html.mjs';

export function renderMarkdown(src, options = {}) {
  const opts = { resolveLink: (h) => h, headingShift: 0, idPrefix: '', ...options, headingIds: new Set() };
  const lines = String(src ?? '').replace(/\r\n?/g, '\n').split('\n');
  return blocks(lines, opts);
}

const FENCE = /^(\s{0,3})(`{3,}|~{3,})\s*([\w+#.-]*)\s*$/;
const LIST = /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/;
const HEADING = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/;
const RULE = /^\s{0,3}([-*_])(\s*\1){2,}\s*$/;
const TABLE_SEP = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

function blocks(lines, opts) {
  let out = '';
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*$/.test(line)) { i++; continue; }
    let m;
    if ((m = FENCE.exec(line))) {
      const marker = m[2];
      const body = [];
      i++;
      while (i < lines.length && !new RegExp(`^\\s{0,3}${marker[0]}{${marker.length},}\\s*$`).test(lines[i])) body.push(lines[i++]);
      i++;
      const lang = m[3] ? ` data-lang="${esc(m[3])}"` : '';
      out += `<pre class="md-code"${lang} tabindex="0" role="region" aria-label="Code example"><code>${esc(body.join('\n'))}</code></pre>\n`;
      continue;
    }
    if ((m = HEADING.exec(line))) {
      const level = Math.min(6, m[1].length + opts.headingShift);
      const text = inline(m[2], opts);
      const base = opts.idPrefix + (slug(m[2]) || 'section');
      let id = base;
      for (let n = 2; opts.headingIds.has(id); n++) id = `${base}-${n}`;
      opts.headingIds.add(id);
      out += `<h${level} id="${esc(id)}">${text}</h${level}>\n`;
      i++;
      continue;
    }
    if (RULE.test(line)) { out += '<hr>\n'; i++; continue; }
    if (/^\s{0,3}>/.test(line)) {
      const body = [];
      while (i < lines.length && /^\s{0,3}>/.test(lines[i])) body.push(lines[i++].replace(/^\s{0,3}>\s?/, ''));
      out += `<blockquote>${blocks(body, opts)}</blockquote>\n`;
      continue;
    }
    if (line.includes('|') && i + 1 < lines.length && TABLE_SEP.test(lines[i + 1])) {
      const head = cells(line);
      const align = cells(lines[i + 1]).map((c) => (/^:-+:$/.test(c) ? 'center' : /-:$/.test(c) ? 'right' : ''));
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes('|') && !/^\s*$/.test(lines[i])) rows.push(cells(lines[i++]));
      const th = head.map((c, k) => `<th${align[k] ? ` data-align="${align[k]}"` : ''}>${inline(c, opts)}</th>`).join('');
      const tb = rows.map((r) => `<tr>${head.map((_, k) => `<td${align[k] ? ` data-align="${align[k]}"` : ''}>${inline(r[k] ?? '', opts)}</td>`).join('')}</tr>`).join('\n');
      out += `<div class="md-table" tabindex="0"><table><thead><tr>${th}</tr></thead><tbody>${tb}</tbody></table></div>\n`;
      continue;
    }
    if ((m = LIST.exec(line))) {
      const r = list(lines, i, opts);
      out += r.html;
      i = r.next;
      continue;
    }
    const para = [];
    while (i < lines.length && !/^\s*$/.test(lines[i]) && !FENCE.test(lines[i]) && !HEADING.test(lines[i]) && !/^\s{0,3}>/.test(lines[i]) && !(para.length && LIST.test(lines[i])) && !RULE.test(lines[i])) {
      para.push(lines[i++].trim());
    }
    if (!para.length) { para.push(lines[i++].trim()); }
    out += `<p>${inline(para.join('\n'), opts).replace(/\n/g, ' ')}</p>\n`;
  }
  return out;
}

function cells(row) {
  let s = row.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1);
  const out = [];
  let cur = '';
  let code = false;
  for (let k = 0; k < s.length; k++) {
    const c = s[k];
    if (c === '\\' && s[k + 1] === '|') { cur += '|'; k++; continue; }
    if (c === '`') code = !code;
    if (c === '|' && !code) { out.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  out.push(cur.trim());
  return out;
}

function list(lines, start, opts) {
  const first = LIST.exec(lines[start]);
  const baseIndent = first[1].length;
  const ordered = /\d/.test(first[2]);
  const tag = ordered ? 'ol' : 'ul';
  const startNum = ordered ? parseInt(first[2], 10) : 1;
  const items = [];
  let i = start;
  while (i < lines.length) {
    const m = LIST.exec(lines[i]);
    if (!m || m[1].length !== baseIndent || /\d/.test(m[2]) !== ordered) {
      if (m && m[1].length > baseIndent && items.length) { items[items.length - 1].push(lines[i].slice(Math.min(m[1].length, baseIndent + 2))); i++; continue; }
      if (/^\s*$/.test(lines[i]) && i + 1 < lines.length && items.length) {
        const n = lines[i + 1];
        const nm = LIST.exec(n);
        const contIndent = n.length - n.trimStart().length;
        if ((nm && nm[1].length >= baseIndent) || (!nm && contIndent > baseIndent)) {
          if (!nm || nm[1].length > baseIndent) items[items.length - 1].push('');
          i++;
          continue;
        }
      }
      if (!m && items.length && !/^\s*$/.test(lines[i]) && (lines[i].length - lines[i].trimStart().length) > baseIndent) {
        items[items.length - 1].push(lines[i].trim());
        i++;
        continue;
      }
      if (!m && items.length && !/^\s*$/.test(lines[i]) && !FENCE.test(lines[i]) && !HEADING.test(lines[i])) {
        // lazy continuation of the previous item's paragraph
        items[items.length - 1].push(lines[i].trim());
        i++;
        continue;
      }
      break;
    }
    items.push([m[3]]);
    i++;
  }
  const lis = items.map((body) => {
    const inner = blocks(body, opts);
    const tight = !body.includes('');
    return `<li>${tight ? inner.replace(/^<p>([\s\S]*?)<\/p>\n/, '$1') : inner}</li>`;
  });
  const startAttr = ordered && startNum !== 1 ? ` start="${startNum}"` : '';
  return { html: `<${tag}${startAttr}>\n${lis.join('\n')}\n</${tag}>\n`, next: i };
}

/** Inline Markdown: code, links, emphasis, autolinks. Everything else is escaped. */
export function inline(text, opts = { resolveLink: (h) => h }) {
  const tokens = [];
  const stash = (h) => `\u0000${tokens.push(h) - 1}\u0000`;
  let s = String(text);
  s = s.replace(/(`+)([\s\S]*?[^`])\1(?!`)/g, (_, __, code) => stash(`<code>${esc(code.trim())}</code>`));
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_, alt, href) => stash(`<a href="${esc(safeHref(opts.resolveLink(href)))}">${esc(alt || href)}</a>`));
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_, label, href) => {
    const h = safeHref(opts.resolveLink(href));
    const ext = /^https?:/.test(h);
    return stash(`<a href="${esc(h)}"${ext ? ' rel="noopener"' : ''}>${inlineText(label)}</a>`);
  });
  s = s.replace(/<(https?:\/\/[^>\s]+)>/g, (_, href) => stash(`<a href="${esc(href)}" rel="noopener">${esc(href)}</a>`));
  return inlineText(s).replace(/\u0000(\d+)\u0000/g, (_, n) => tokens[Number(n)]);
}

function inlineText(s) {
  return esc(s)
    .replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+?)__/g, '<strong>$1</strong>')
    .replace(/(^|[^\w*])\*([^*\s][^*]*?)\*(?!\w)/g, '$1<em>$2</em>')
    .replace(/(^|[^\w])_([^_\s][^_]*?)_(?!\w)/g, '$1<em>$2</em>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>');
}

function safeHref(href) {
  const h = String(href).trim();
  if (/^(javascript|data|vbscript):/i.test(h)) return '#';
  return h;
}

/** Splits a Markdown body into its `## ` sections: [{ title, id, body }]. Text before the first is `lead`. */
export function sections(src) {
  const lines = String(src ?? '').replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let lead = [];
  let cur = null;
  let fence = false;
  for (const line of lines) {
    if (FENCE.test(line)) fence = !fence;
    const m = !fence && /^##\s+(.*?)\s*#*\s*$/.exec(line);
    if (m) {
      cur = { title: m[1], id: slug(m[1]), body: [] };
      out.push(cur);
    } else if (cur) cur.body.push(line);
    else lead.push(line);
  }
  return { lead: lead.join('\n').trim(), sections: out.map((s) => ({ ...s, body: s.body.join('\n').trim() })) };
}

/** Plain text of Markdown, for summaries and search. */
export function plainText(src) {
  return String(src ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/^\s{0,3}(#{1,6}|>)\s+/gm, '')
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/(^|\W)[*_](\S[^*_]*?)[*_](?=\W|$)/g, '$1$2')
    .replace(/\|/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
