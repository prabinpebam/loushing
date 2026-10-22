/**
 * A small YAML subset parser for catalog source files, with no dependencies.
 * Tier 0: pure, used by the build only.
 *
 * Supports: block mappings and sequences (including mappings inside sequences),
 * plain, single- and double-quoted scalars, numbers, booleans, null, comments,
 * single-line flow sequences and mappings, and `|` / `>` block scalars.
 * Not supported (fails with a line number): anchors, aliases, tags, multi-document
 * streams and multi-line flow collections.
 */

export class YamlError extends Error {
  constructor(message, line) {
    super(`line ${line}: ${message}`);
    this.line = line;
  }
}

export function parseYaml(text) {
  const raw = text.replace(/^\uFEFF/, '').split(/\r?\n/);
  const lines = [];
  for (let i = 0; i < raw.length; i++) {
    const r = raw[i];
    if (/^\s*(#.*)?$/.test(r)) continue;
    if (/^(---|\.\.\.)\s*$/.test(r)) {
      if (lines.length) throw new YamlError('only one document per file', i + 1);
      continue;
    }
    if (/^\s*\t/.test(r)) throw new YamlError('use spaces, not tabs, for indentation', i + 1);
    const indent = r.length - r.trimStart().length;
    lines.push({ indent, text: r.slice(indent).trimEnd(), line: i + 1, rawIndex: i });
  }
  const state = { lines, raw, pos: 0 };
  if (!lines.length) return null;
  const value = parseBlock(state, lines[0].indent);
  if (state.pos < lines.length) throw new YamlError('unexpected indentation', lines[state.pos].line);
  return value;
}

function parseBlock(state, indent) {
  const first = state.lines[state.pos];
  if (first.text.startsWith('- ') || first.text === '-') return parseSeq(state, indent);
  return parseMap(state, indent);
}

function parseSeq(state, indent) {
  const out = [];
  while (state.pos < state.lines.length) {
    const ln = state.lines[state.pos];
    if (ln.indent < indent) break;
    if (ln.indent > indent) throw new YamlError('unexpected indentation in list', ln.line);
    if (!(ln.text.startsWith('- ') || ln.text === '-')) break;
    const rest = ln.text === '-' ? '' : ln.text.slice(2).trimStart();
    const itemIndent = indent + (ln.text.length - rest.length);
    if (rest === '') {
      state.pos++;
      out.push(state.pos < state.lines.length && state.lines[state.pos].indent > indent ? parseBlock(state, state.lines[state.pos].indent) : null);
    } else if (isMapLine(rest)) {
      // A mapping that starts on the dash line: read the line as if it were indented.
      state.lines[state.pos] = { ...ln, indent: itemIndent, text: rest };
      out.push(parseMap(state, itemIndent));
    } else {
      state.pos++;
      out.push(parseInline(rest, ln.line, state, indent));
    }
  }
  return out;
}

function isMapLine(text) {
  if (text.startsWith('[') || text.startsWith('{')) return false;
  if (text.startsWith('"') || text.startsWith("'")) return /^(["'])(?:(?!\1).)*\1\s*:(\s|$)/.test(text);
  return /^[^\s#][^:#]*?:(\s|$)/.test(text);
}

function parseMap(state, indent) {
  const out = {};
  while (state.pos < state.lines.length) {
    const ln = state.lines[state.pos];
    if (ln.indent < indent) break;
    if (ln.indent > indent) throw new YamlError('unexpected indentation', ln.line);
    if (ln.text.startsWith('- ')) throw new YamlError('a list item where a key was expected', ln.line);
    const m = /^("(?:[^"\\]|\\.)*"|'(?:[^']|'')*'|[^:#][^:]*?)\s*:(?:\s+(.*))?$/.exec(ln.text);
    if (!m) throw new YamlError(`expected "key: value", found "${ln.text}"`, ln.line);
    const key = String(scalar(m[1], ln.line));
    if (Object.prototype.hasOwnProperty.call(out, key)) throw new YamlError(`duplicate key "${key}"`, ln.line);
    const rest = stripComment(m[2] ?? '');
    state.pos++;
    if (rest === '') {
      const next = state.lines[state.pos];
      if (next && next.indent > indent) out[key] = parseBlock(state, next.indent);
      else if (next && next.indent === indent && next.text.startsWith('- ')) out[key] = parseSeq(state, indent);
      else out[key] = null;
    } else out[key] = parseInline(rest, ln.line, state, indent);
  }
  return out;
}

function parseInline(text, line, state, parentIndent) {
  const t = stripComment(text);
  if (/^[|>][+-]?$/.test(t)) return blockScalar(t, state, parentIndent, line);
  if (t.startsWith('[') || t.startsWith('{')) {
    const p = { s: t, i: 0, line };
    const v = flow(p);
    skipWs(p);
    if (p.i < p.s.length) throw new YamlError(`unexpected "${p.s.slice(p.i)}" after a flow value`, line);
    return v;
  }
  return scalar(t, line);
}

function blockScalar(header, state, parentIndent, line) {
  const folded = header[0] === '>';
  const chomp = header[1] ?? '';
  const startRaw = state.lines[state.pos - 1].rawIndex + 1;
  const body = [];
  let blockIndent = -1;
  let i = startRaw;
  for (; i < state.raw.length; i++) {
    const r = state.raw[i];
    if (/^\s*$/.test(r)) { body.push(''); continue; }
    const ind = r.length - r.trimStart().length;
    if (blockIndent < 0) blockIndent = ind;
    if (ind < blockIndent || ind <= parentIndent) break;
    body.push(r.slice(blockIndent).trimEnd());
  }
  while (state.pos < state.lines.length && state.lines[state.pos].rawIndex < i) state.pos++;
  while (body.length && body[body.length - 1] === '') body.pop();
  if (blockIndent < 0) throw new YamlError('empty block scalar', line);
  let s = folded
    ? body.reduce((acc, l, k) => (k === 0 ? l : acc + (l === '' ? '\n' : body[k - 1] === '' ? l : ' ' + l)), '')
    : body.join('\n');
  if (chomp !== '-') s += '\n';
  return s;
}

function stripComment(t) {
  let q = '';
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '\\' && q === '"') i++;
      else if (c === q) q = '';
    } else if (c === '"' || c === "'") q = c;
    else if (c === '#' && (i === 0 || /\s/.test(t[i - 1]))) return t.slice(0, i).trimEnd();
  }
  return t.trim();
}

export function scalar(t, line) {
  t = t.trim();
  if (t.startsWith('"')) {
    if (!/^"(?:[^"\\]|\\.)*"$/.test(t)) throw new YamlError(`unterminated string ${t}`, line);
    return JSON.parse(t);
  }
  if (t.startsWith("'")) {
    if (!/^'(?:[^']|'')*'$/.test(t)) throw new YamlError(`unterminated string ${t}`, line);
    return t.slice(1, -1).replace(/''/g, "'");
  }
  if (/^[&*!]/.test(t)) throw new YamlError('anchors, aliases and tags are not supported', line);
  if (t === '' || t === '~' || t === 'null') return null;
  if (t === 'true') return true;
  if (t === 'false') return false;
  if (/^-?(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?$/.test(t)) return Number(t);
  return t;
}

function skipWs(p) {
  while (p.i < p.s.length && /\s/.test(p.s[p.i])) p.i++;
}

function flow(p) {
  skipWs(p);
  const c = p.s[p.i];
  if (c === '[') {
    p.i++;
    const out = [];
    skipWs(p);
    if (p.s[p.i] === ']') { p.i++; return out; }
    for (;;) {
      out.push(flow(p));
      skipWs(p);
      if (p.s[p.i] === ',') { p.i++; continue; }
      if (p.s[p.i] === ']') { p.i++; return out; }
      throw new YamlError('expected "," or "]" in a flow list', p.line);
    }
  }
  if (c === '{') {
    p.i++;
    const out = {};
    skipWs(p);
    if (p.s[p.i] === '}') { p.i++; return out; }
    for (;;) {
      const key = String(flowScalar(p, ':'));
      skipWs(p);
      if (p.s[p.i] !== ':') throw new YamlError('expected ":" in a flow mapping', p.line);
      p.i++;
      out[key] = flow(p);
      skipWs(p);
      if (p.s[p.i] === ',') { p.i++; continue; }
      if (p.s[p.i] === '}') { p.i++; return out; }
      throw new YamlError('expected "," or "}" in a flow mapping', p.line);
    }
  }
  return flowScalar(p, '');
}

function flowScalar(p, extraStop) {
  skipWs(p);
  const start = p.i;
  const c = p.s[p.i];
  if (c === '"' || c === "'") {
    p.i++;
    while (p.i < p.s.length) {
      if (c === '"' && p.s[p.i] === '\\') { p.i += 2; continue; }
      if (p.s[p.i] === c) {
        if (c === "'" && p.s[p.i + 1] === "'") { p.i += 2; continue; }
        p.i++;
        break;
      }
      p.i++;
    }
    return scalar(p.s.slice(start, p.i), p.line);
  }
  const stops = ',]}' + extraStop;
  while (p.i < p.s.length && !stops.includes(p.s[p.i])) {
    if (p.s[p.i] === ':' && extraStop === '' && /[\s,\]}]/.test(p.s[p.i + 1] ?? ' ')) break;
    p.i++;
  }
  return scalar(p.s.slice(start, p.i), p.line);
}

/** Splits a Markdown file into its YAML front matter and body. */
export function frontMatter(text) {
  const t = text.replace(/^\uFEFF/, '');
  const m = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/.exec(t);
  if (!m) return { data: {}, body: t };
  return { data: parseYaml(m[1]) ?? {}, body: m[2] };
}
