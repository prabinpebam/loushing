import { CUT_CORNERS, OFF_FRAME, SKY_BINS, casterReach, offFrameCasters, sourceBins } from '../lib/lighting.mjs';

/**
 * Portable shared shadow layer. One WebGL2 program draws every cast shadow from one
 * light, so overlapping shadows take the highest skyline instead of stacking. It is
 * product-agnostic: the host passes a selector, the height of each elevation level
 * and a CSS colour for the shadow ink, and styles [data-light-layer].
 *
 * Surfaces move in different scroll frames: with the page, with a sticky bar or a
 * scrolling box, or fixed to the view. Each frame gets its own canvas, which the
 * browser moves with the surfaces it holds through scroll-driven animations, so a
 * shadow never lags its caster. Frames are ordered, and canvas k draws only what its
 * own casters add to the frames before it: per channel (1 - a_k m) / (1 - a_(k-1) m),
 * with a the shadow of frames up to k and m one minus the ink. Multiplied together
 * the canvases equal one union shadow. Each redraws only when the scene changes
 * within its frame, or while off-frame casters move.
 */
const MAX_CASTERS = 128;
const MAX_LAYERS = 8;
const SETTLE_MS = 600;
const MOTION_MS = 33;
const MARGIN = 0.25;
const SNAP = 64;
const ROWS = 3;
const timelines = typeof ScrollTimeline === 'function' && typeof Element.prototype.animate === 'function';

const VERTEX = `#version 300 es
void main() {
  vec2 corner = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(corner * 2.0 - 1.0, 0.0, 1.0);
}`;

const FRAGMENT = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
uniform sampler2D uBoxes;
uniform int uCount;
uniform int uGroup;
uniform vec4 uBins[${SKY_BINS}];
uniform int uBinCount;
uniform bool uPoint;
uniform bool uWrap;
uniform float uSpan;
uniform float uStep;
uniform float uInvTotal;
uniform float uThreshold;
uniform float uAzimuth;
uniform float uIntensity;
uniform float uGlobal;
uniform vec3 uInk;
uniform vec2 uOrigin;
uniform float uScale;
uniform float uRows;
out vec4 outColor;
const float PI = 3.14159265;
const float HALF_ROOT2 = 0.70710678;
const float EPS = 1e-3;

float roundedDistance(vec2 q, vec2 b, float r) {
  vec2 d = abs(q) - b + r;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r;
}

float cutDistance(vec2 q, vec2 b, vec4 c) {
  return (c.y * (q.x - c.y * b.x) + c.z * (q.y - c.z * b.y) + c.x) * HALF_ROOT2;
}

float shapeDistance(vec2 q, vec2 b, float r, vec4 c) {
  float d = roundedDistance(q, b, r);
  return c.x > 0.0 ? max(d, cutDistance(q, b, c)) : d;
}

float roundedEntry(vec2 q, vec2 u, vec2 b, float r) {
  vec2 s = vec2(u.x >= 0.0 ? max(u.x, 1e-9) : u.x, u.y >= 0.0 ? max(u.y, 1e-9) : u.y);
  vec2 t1 = (-b - q) / s;
  vec2 t2 = (b - q) / s;
  vec2 near = min(t1, t2);
  vec2 far = max(t1, t2);
  float enter = max(max(near.x, near.y), 0.0);
  if (min(far.x, far.y) < enter) return -1.0;
  vec2 k = b - r;
  vec2 e = q + u * enter;
  if (r <= 0.0 || abs(e.x) <= k.x || abs(e.y) <= k.y) return enter;
  vec2 m = q - sign(e) * k;
  float bq = dot(m, u);
  float cq = dot(m, m) - r * r;
  if (cq <= 0.0) return enter;
  float disc = bq * bq - cq;
  if (disc < 0.0) return -1.0;
  float t = -bq - sqrt(disc);
  return t < 0.0 ? -1.0 : max(t, enter);
}

float entry(vec2 q, vec2 u, vec2 b, float r, vec4 c) {
  float t = roundedEntry(q, u, b, r);
  if (c.x <= 0.0 || t < 0.0 || cutDistance(q + u * t, b, c) <= EPS) return t;
  float rate = (c.y * u.x + c.z * u.y) * HALF_ROOT2;
  if (rate >= 0.0) return -1.0;
  float s = -cutDistance(q, b, c) / rate;
  return s >= 0.0 && roundedDistance(q + u * s, b, r) <= EPS ? s : -1.0;
}

// The shadow at p from the frames below this one (x, z) and up to it (y, w): the share
// of the source hidden, and the sky hidden for global illumination. touched is false
// when no caster of this frame reaches p, so it adds nothing there.
vec4 shade(vec2 p, float jitter, out bool touched) {
  float floorZ = 0.0;
  for (int i = 0; i < uCount; i++) {
    vec4 a = texelFetch(uBoxes, ivec2(i, 0), 0);
    vec4 b = texelFetch(uBoxes, ivec2(i, 1), 0);
    vec4 c = texelFetch(uBoxes, ivec2(i, 2), 0);
    if (shapeDistance(p - a.xy, a.zw, b.x, c) <= 0.0) floorZ = max(floorZ, b.y);
  }
  vec2 light = vec2(sin(uAzimuth), -cos(uAzimuth));
  vec2 dirs[${SKY_BINS}];
  float below[${SKY_BINS}];
  float upto[${SKY_BINS}];
  for (int k = 0; k < uBinCount; k++) {
    float phi = uAzimuth + uBins[k].x + jitter;
    dirs[k] = vec2(sin(phi), -cos(phi));
    below[k] = 0.0;
    upto[k] = 0.0;
  }
  float occBelow = 0.0;
  float occUpto = 0.0;
  touched = false;
  for (int i = 0; i < uCount; i++) {
    vec4 b = texelFetch(uBoxes, ivec2(i, 1), 0);
    int group = int(b.w + 0.5);
    float dz = b.y - floorZ;
    if (group > uGroup || dz <= 0.0) continue;
    vec4 a = texelFetch(uBoxes, ivec2(i, 0), 0);
    vec4 c = texelFetch(uBoxes, ivec2(i, 2), 0);
    vec2 q = p - a.xy;
    float dist = max(shapeDistance(q, a.zw, b.x, c), 0.0);
    float dz2 = dz * dz;
    if (dz2 / (dz2 + dist * dist) <= uThreshold) continue;
    bool lower = group < uGroup;
    touched = touched || !lower;
    float away = length(q);
    bool around = away <= b.z;
    float cone = around ? 0.5 * PI : asin(b.z / away);
    float occ = (2.0 * cone / PI) * (1.0 - dist / sqrt(dist * dist + dz2));
    occUpto = max(occUpto, occ);
    if (lower) occBelow = max(occBelow, occ);
    if (uPoint) {
      float t = entry(q, light, a.zw, b.x, c);
      if (t >= 0.0) {
        float v = dz2 / (dz2 + t * t);
        upto[0] = max(upto[0], v);
        if (lower) below[0] = max(below[0], v);
      }
      continue;
    }
    int k0 = 0;
    int k1 = uBinCount - 1;
    if (!around) {
      vec2 v = -q;
      float delta = atan(light.x * v.y - light.y * v.x, dot(light, v));
      k0 = int(ceil((delta - cone + uSpan - jitter) / uStep - 0.5));
      k1 = int(floor((delta + cone + uSpan - jitter) / uStep - 0.5));
      if (!uWrap) {
        k0 = max(k0, 0);
        k1 = min(k1, uBinCount - 1);
      } else if (k1 - k0 >= uBinCount) {
        k0 = 0;
        k1 = uBinCount - 1;
      }
    }
    for (int k = k0; k <= k1; k++) {
      int j = k < 0 ? k + uBinCount : (k >= uBinCount ? k - uBinCount : k);
      float t = entry(q, dirs[j], a.zw, b.x, c);
      if (t >= 0.0) {
        float v = dz2 / (dz2 + t * t);
        upto[j] = max(upto[j], v);
        if (lower) below[j] = max(below[j], v);
      }
    }
  }
  if (!touched) return vec4(0.0);
  if (uPoint) return vec4(below[0] > uBins[0].y ? 1.0 : 0.0, upto[0] > uBins[0].y ? 1.0 : 0.0, occBelow, occUpto);
  float hiddenBelow = 0.0;
  float hiddenUpto = 0.0;
  for (int k = 0; k < uBinCount; k++) {
    float width = uBins[k].z - uBins[k].y;
    hiddenBelow += clamp(below[k] - uBins[k].y, 0.0, width);
    hiddenUpto += clamp(upto[k] - uBins[k].y, 0.0, width);
  }
  return vec4(hiddenBelow * uInvTotal, hiddenUpto * uInvTotal, occBelow, occUpto);
}

vec3 increment(vec4 s, bool touched) {
  if (!touched) return vec3(1.0);
  float below = uIntensity * s.x * (1.0 - uGlobal * (1.0 - min(s.z, 1.0)));
  float upto = uIntensity * s.y * (1.0 - uGlobal * (1.0 - min(s.w, 1.0)));
  vec3 m = 1.0 - uInk;
  return clamp((1.0 - upto * m) / max(1.0 - below * m, vec3(1e-4)), 0.0, 1.0);
}

void main() {
  vec2 p = uOrigin + vec2(gl_FragCoord.x, uRows - gl_FragCoord.y) / uScale;
  bool touched;
  vec3 colour;
  if (uPoint) {
    float d = 0.25 / uScale;
    colour = vec3(0.0);
    for (int s = 0; s < 4; s++) {
      vec2 shift = vec2((s & 1) == 0 ? -d : d, (s & 2) == 0 ? -d : d);
      vec4 shaded = shade(p + shift, 0.0, touched);
      colour += 0.25 * increment(shaded, touched);
    }
  } else {
    float noise = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
    vec4 shaded = shade(p, (noise - 0.5) * uStep, touched);
    colour = increment(shaded, touched);
  }
  outColor = vec4(colour, 1.0);
}`;

const NAMES = ['uBoxes', 'uCount', 'uGroup', 'uBins', 'uBinCount', 'uPoint', 'uWrap', 'uSpan', 'uStep', 'uInvTotal', 'uThreshold', 'uAzimuth', 'uIntensity', 'uGlobal', 'uInk', 'uOrigin', 'uScale', 'uRows'];

function compile(gl) {
  const program = gl.createProgram();
  for (const [type, source] of [[gl.VERTEX_SHADER, VERTEX], [gl.FRAGMENT_SHADER, FRAGMENT]]) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) || 'Shader did not compile.');
    gl.attachShader(program, shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || 'Shader did not link.');
  const uniforms = Object.fromEntries(NAMES.map((name) => [name, gl.getUniformLocation(program, name)]));
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  for (const [key, value] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) {
    gl.texParameteri(gl.TEXTURE_2D, key, value);
  }
  return { program, uniforms, texture, vao: gl.createVertexArray() };
}

/** Resolve any CSS colour to sRGB channels in 0..1 through a 2D canvas. */
function rgb(colour) {
  const context = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  if (!context) return [0, 0, 0];
  context.fillStyle = '#000';
  context.fillStyle = colour;
  context.fillRect(0, 0, 1, 1);
  const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
  return [r / 255, g / 255, b / 255];
}

const scrolling = (style) => /auto|scroll|hidden/.test(style.overflow);
const clipping = (style) => /auto|scroll|hidden|clip/.test(style.overflow);
const isRoot = (node) => !node || node === document.body || node === document.documentElement;

/** The scroll container a sticky node sticks within. */
function scrollerOf(node) {
  for (let up = node.parentElement; !isRoot(up); up = up.parentElement) if (scrolling(getComputedStyle(up))) return up;
  return document.scrollingElement || document.documentElement;
}

/**
 * Create the layer. `heights[level]` is the height of a surface whose selector element
 * carries data-elevation="level"; nested surfaces stand on their ancestors. A surface
 * may cut one corner straight across with the registered length --light-cut-size and
 * --light-cut-corner (top-left, top-right, bottom-right or bottom-left; default
 * top-right). Returns { supported, update(settings, { visible, motion }), destroy(), stats }.
 */
export function createLightRenderer({ selector = '[data-elevation]', heights, ink = 'var(--light-shadow-ink)', maxScale = 1 } = {}) {
  if (!Array.isArray(heights)) throw new TypeError('heights must list the height of each elevation level.');
  const wrapper = document.createElement('div');
  wrapper.setAttribute('data-light-layer', '');
  wrapper.setAttribute('aria-hidden', 'true');
  wrapper.hidden = true;
  const probe = document.createElement('span');
  probe.hidden = true;
  probe.style.color = ink;
  wrapper.append(probe);
  document.body.append(wrapper);
  const surface = document.createElement('canvas');

  let settings = null;
  let sky = null;
  let visible = false;
  let motion = false;
  let colour = [0, 0, 0];
  let version = 0;
  let pageRegion = null;
  let frame = 0;
  let activeUntil = 0;
  let lastDraw = 0;
  let lastTick = 0;
  let travel = 0;
  let lost = false;
  let listening = null;
  let observer = null;
  let dirty = true;
  let chains = new Map();
  const layers = new Map();
  const ids = new WeakMap();
  let glState = null;
  const gl = surface.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'low-power' });
  try {
    if (gl) glState = compile(gl);
  } catch (error) {
    console.warn('Long shadows are unavailable: the shadow shader failed.', error);
  }
  const stats = { casters: 0, draws: 0, layers: 0, frames: 0, timelines };
  const renderer = { supported: Boolean(glState), update, destroy, stats };
  if (!glState) {
    wrapper.remove();
    return renderer;
  }

  let nextId = 1;
  const id = (node) => {
    if (!ids.has(node)) ids.set(node, nextId++);
    return ids.get(node);
  };
  const level = (el) => Number(el.getAttribute('data-elevation')) || 0;
  const heightOf = (el) => {
    let z = 0;
    for (let node = el; node; node = node.parentElement?.closest(selector)) z += heights[level(node)] || 0;
    return z;
  };
  const readInk = () => {
    colour = rgb(getComputedStyle(probe).color);
    version++;
  };
  const schedule = () => {
    if (!frame && visible && !lost) frame = requestAnimationFrame(tick);
  };
  const poke = () => {
    activeUntil = performance.now() + SETTLE_MS;
    schedule();
  };
  const reflow = () => {
    dirty = true;
    poke();
  };

  /** A scrolling box moves its content by its scroll offset. */
  function scrollFrames(node, style) {
    if (!scrolling(style)) return [];
    const found = [];
    const y = node.scrollHeight - node.clientHeight;
    const x = node.scrollWidth - node.clientWidth;
    if (y > 1) found.push({ id: `y${id(node)}`, source: node, axis: 'y', stops: [[0, 0], [1, -y]] });
    if (x > 1) found.push({ id: `x${id(node)}`, source: node, axis: 'x', stops: [[0, 0], [1, -x]] });
    return found;
  }

  /**
   * A top-sticky node is offset by clamp(s - (N - top), 0, room) at scroll s, where N is
   * where it would sit unstuck and room is how far it can travel inside its containing
   * block (approximated by its parent's content box). N is read by briefly laying it
   * out static, which places it exactly as sticky does with no offset.
   */
  function stickyFrames(node, style) {
    if (style.position !== 'sticky' || style.top === 'auto') return [];
    const source = scrollerOf(node);
    const root = source === document.scrollingElement || source === document.documentElement;
    const max = source.scrollHeight - source.clientHeight;
    if (max <= 1) return [];
    const port = root ? 0 : source.getBoundingClientRect().top + source.clientTop;
    const scrolled = source.scrollTop;
    const height = root ? document.documentElement.clientHeight : source.clientHeight;
    const inset = style.top.endsWith('%') ? parseFloat(style.top) * height / 100 : parseFloat(style.top) || 0;
    const margin = parseFloat(style.marginBottom) || 0;
    const saved = node.getAttribute('style');
    node.style.setProperty('position', 'static', 'important');
    const rest = node.getBoundingClientRect();
    if (saved === null) node.removeAttribute('style');
    else node.setAttribute('style', saved);
    const parent = node.parentElement;
    const box = getComputedStyle(parent);
    const limit = parent.getBoundingClientRect().bottom - parseFloat(box.borderBottomWidth) - parseFloat(box.paddingBottom) - port + scrolled;
    const top = rest.top - port + scrolled;
    const start = top - inset;
    const room = Math.max(0, limit - (top + rest.height + margin));
    const offset = (s) => Math.min(Math.max(s - start, 0), room);
    const stops = [...new Set([0, start, start + room, max].map((s) => Math.min(Math.max(s, 0), max)))].sort((a, b) => a - b);
    return [{ id: `s${id(node)}`, source, axis: 'y', stops: stops.map((s) => [s / max, offset(s)]) }];
  }

  /** The frames a surface moves in, inner first, the boxes that clip it, and its root. */
  function chainOf(el, memo) {
    const frames = [];
    const clips = [];
    let fixed = false;
    for (let node = el; !isRoot(node); node = node.parentElement) {
      let entry = memo.get(node);
      if (!entry) {
        entry = { style: getComputedStyle(node) };
        memo.set(node, entry);
      }
      const { style } = entry;
      if (node !== el) {
        if (clipping(style)) clips.push(node);
        if (timelines) frames.push(...(entry.scroll ??= scrollFrames(node, style)));
      }
      if (style.position === 'fixed') {
        fixed = true;
        break;
      }
      if (timelines) frames.push(...(entry.sticky ??= stickyFrames(node, style)));
    }
    const root = fixed ? 'fixed' : 'page';
    return { key: frames.reduce((key, { id: name }) => `${key}/${name}`, root), root, fixed, frames, clips };
  }

  function makeLayer({ key, fixed, frames }) {
    const outer = document.createElement('div');
    outer.setAttribute('data-light-frame', fixed ? 'fixed' : 'page');
    outer.hidden = true;
    let inner = outer;
    const nest = frames.map(() => {
      const div = document.createElement('div');
      inner.append(div);
      inner = div;
      return div;
    });
    const marker = document.createElement('span');
    const canvas = document.createElement('canvas');
    inner.append(marker, canvas);
    wrapper.append(outer);
    const rank = fixed ? (frames.length ? 2 : 3) : (frames.length ? 1 : 0);
    return { key, fixed, rank, outer, nest, marker, canvas, context: canvas.getContext('2d', { alpha: false }), animations: [], group: 0, drawn: null };
  }

  /** Outer frames wrap inner ones; each follows its scroll container on the compositor. */
  function animate(layer, frames) {
    for (const animation of layer.animations) animation.cancel();
    const outward = [...frames].reverse();
    layer.animations = outward.map(({ source, axis, stops }, k) => layer.nest[k].animate(
      stops.map(([offset, value]) => ({ offset, transform: axis === 'x' ? `translate3d(${value}px, 0, 0)` : `translate3d(0, ${value}px, 0)` })),
      { timeline: new ScrollTimeline({ source, axis }), fill: 'both', easing: 'linear' },
    ));
    layer.drawn = null;
  }

  function rebuild() {
    dirty = false;
    chains = new Map();
    const memo = new Map();
    const wanted = new Map([['page', { key: 'page', fixed: false, frames: [] }], ['fixed', { key: 'fixed', fixed: true, frames: [] }]]);
    for (const el of document.querySelectorAll(selector)) {
      if (level(el) <= 0 || wrapper.contains(el)) continue;
      const chain = chainOf(el, memo);
      if (!wanted.has(chain.key) && wanted.size >= MAX_LAYERS) chain.key = chain.root;
      chains.set(el, chain);
      if (!wanted.has(chain.key)) wanted.set(chain.key, chain);
    }
    observer?.takeRecords();
    for (const [key, layer] of layers) {
      if (wanted.has(key)) continue;
      for (const animation of layer.animations) animation.cancel();
      layer.outer.remove();
      layers.delete(key);
    }
    for (const [key, chain] of wanted) {
      const layer = layers.get(key) ?? makeLayer(chain);
      if (chain.frames.length) animate(layer, chain.frames);
      layers.set(key, layer);
    }
    [...layers.values()].sort((a, b) => a.rank - b.rank).forEach((layer, group) => {
      layer.group = group;
      layer.drawn = null;
    });
    stats.frames = layers.size - 2;
  }

  /** Unit reach of the shadow along each screen axis: the downwind arc the source spans. */
  function sweep() {
    const half = sky.point ? 0 : sky.span + sky.step;
    if (sky.wrap || half >= Math.PI / 2) return { left: 1, right: 1, up: 1, down: 1 };
    const away = settings.azimuth * Math.PI / 180 + Math.PI;
    const angles = [away - half, away + half];
    for (let k = 0; k < 4; k++) {
      const axis = k * Math.PI / 2;
      if (Math.abs(Math.atan2(Math.sin(axis - away), Math.cos(axis - away))) <= half) angles.push(axis);
    }
    const xs = angles.map(Math.sin);
    const ys = angles.map((angle) => -Math.cos(angle));
    return { left: Math.max(0, -Math.min(...xs)), right: Math.max(0, ...xs), up: Math.max(0, -Math.min(...ys)), down: Math.max(0, ...ys) };
  }

  function measure() {
    const root = document.documentElement;
    const origin = wrapper.getBoundingClientRect();
    const width = root.clientWidth;
    const view = { x: -origin.left, y: -origin.top, width, height: root.clientHeight };
    const height = Math.max(Math.ceil(document.body.getBoundingClientRect().bottom - origin.top), view.y + view.height);
    if (wrapper.style.width !== `${width}px`) wrapper.style.width = `${width}px`;
    if (wrapper.style.height !== `${height}px`) wrapper.style.height = `${height}px`;
    const pad = Math.ceil(view.height * MARGIN);
    const near = Math.ceil(view.height * MARGIN / 5);
    const stale = !pageRegion || pageRegion.width !== width || pageRegion.layer !== height
      || (view.y < pageRegion.top + near && pageRegion.top > 0)
      || (view.y + view.height > pageRegion.top + pageRegion.height - near && pageRegion.top + pageRegion.height < height);
    if (stale) {
      const top = Math.max(0, Math.floor(view.y - pad));
      pageRegion = { top, height: Math.max(1, Math.min(height, Math.ceil(view.y + view.height + pad)) - top), width, layer: height };
    }
    const top = Math.min(pageRegion.top, view.y - pad);
    const bottom = Math.max(pageRegion.top + pageRegion.height, view.y + view.height + pad);
    const reachable = (box) => {
      const dx = Math.max(view.x - (box.x + box.width), box.x - (view.x + width), 0);
      const dy = Math.max(top - (box.y + box.height), box.y - bottom, 0);
      return Math.hypot(dx, dy) <= casterReach(box.z, sky);
    };
    const boxes = [];
    for (const el of document.querySelectorAll(selector)) {
      if (level(el) <= 0 || wrapper.contains(el)) continue;
      if (el.checkVisibility && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true, checkOpacity: true, checkVisibilityCSS: true })) continue;
      const chain = chains.get(el);
      if (!chain) dirty = true;
      const rect = el.getBoundingClientRect();
      let { left, top: upper, right, bottom: lower } = rect;
      for (const clip of chain?.clips ?? []) {
        const edge = clip.getBoundingClientRect();
        left = Math.max(left, edge.left + clip.clientLeft);
        upper = Math.max(upper, edge.top + clip.clientTop);
        right = Math.min(right, edge.left + clip.clientLeft + clip.clientWidth);
        lower = Math.min(lower, edge.top + clip.clientTop + clip.clientHeight);
      }
      if (right - left < 1 || lower - upper < 1) continue;
      const whole = left === rect.left && upper === rect.top && right === rect.right && lower === rect.bottom;
      const style = getComputedStyle(el);
      const size = whole ? parseFloat(style.getPropertyValue('--light-cut-size')) || 0 : 0;
      const corner = CUT_CORNERS[style.getPropertyValue('--light-cut-corner').trim() || 'top-right'];
      const box = {
        x: left - origin.left, y: upper - origin.top, width: right - left, height: lower - upper,
        radius: parseFloat(style.borderTopLeftRadius) || 0, z: heightOf(el),
        cut: size > 0 && corner ? [size, ...corner] : [0, 0, 0],
        layer: (chain && layers.get(chain.key)) || layers.get(chain?.fixed ? 'fixed' : 'page'),
      };
      if (reachable(box)) boxes.push(box);
    }
    const centre = [view.x + width / 2, view.y + view.height / 2];
    boxes.sort((a, b) => Math.hypot(a.x + a.width / 2 - centre[0], a.y + a.height / 2 - centre[1]) - Math.hypot(b.x + b.width / 2 - centre[0], b.y + b.height / 2 - centre[1]));
    const fixed = layers.get('fixed');
    const posts = settings.offFrame
      ? offFrameCasters({ width, height: view.height, azimuth: settings.azimuth, altitude: settings.altitude, sourceSize: settings.sourceSize, travel })
        .map((box) => ({ ...box, x: box.x + view.x, y: box.y + view.y, cut: [0, 0, 0], layer: fixed, post: true }))
      : [];
    return { casters: [...posts, ...boxes].slice(0, MAX_CASTERS), origin, view, pad, width };
  }

  /** Where this frame's casters can shade, within the view and its margin, in page px. */
  function footprint(own, { view, pad }) {
    const cap = Math.hypot(view.width, view.height) + 2 * pad;
    const arc = sweep();
    let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
    for (const box of own) {
      const reach = Math.min(casterReach(box.z, sky), cap);
      x0 = Math.min(x0, box.x - reach * arc.left);
      y0 = Math.min(y0, box.y - reach * arc.up);
      x1 = Math.max(x1, box.x + box.width + reach * arc.right);
      y1 = Math.max(y1, box.y + box.height + reach * arc.down);
    }
    x0 = Math.max(x0, view.x);
    x1 = Math.min(x1, view.x + view.width);
    y0 = Math.max(y0, view.y - pad);
    y1 = Math.min(y1, view.y + view.height + pad);
    return x1 > x0 && y1 > y0 ? { x: x0, y: y0, width: x1 - x0, height: y1 - y0 } : null;
  }

  /** The canvas for one frame, in the frame's own coordinates: what to draw, and its key. */
  function plan(layer, scene) {
    const { casters, origin, view } = scene;
    const own = casters.filter((box) => box.layer === layer);
    if (!own.length) return null;
    const mark = layer.marker.getBoundingClientRect();
    const shift = [mark.left - origin.left, mark.top - origin.top];
    const area = layer.key === 'page' ? { x: 0, y: pageRegion.top, width: view.width, height: pageRegion.height }
      : layer.key === 'fixed' ? { x: view.x, y: view.y, width: view.width, height: view.height }
        : footprint(own, scene);
    if (!area) return null;
    const exact = layer.key === 'page' || layer.key === 'fixed';
    const x = exact ? Math.round(area.x - shift[0]) : Math.floor((area.x - shift[0]) / SNAP) * SNAP;
    const y = exact ? Math.round(area.y - shift[1]) : Math.floor((area.y - shift[1]) / SNAP) * SNAP;
    const region = {
      x, y,
      width: Math.max(1, exact ? Math.round(area.width) : Math.ceil((area.x - shift[0] + area.width) / SNAP) * SNAP - x),
      height: Math.max(1, exact ? Math.round(area.height) : Math.ceil((area.y - shift[1] + area.height) / SNAP) * SNAP - y),
    };
    const list = casters.filter((box) => box.layer.group <= layer.group || !box.post);
    const count = list.length;
    const data = new Float32Array(count * 4 * ROWS);
    list.forEach((box, i) => {
      const bx = box.width / 2;
      const by = box.height / 2;
      data.set([box.x + bx - shift[0], box.y + by - shift[1], bx, by], i * 4);
      data.set([Math.min(Math.max(box.radius, 0), bx, by), box.z, Math.hypot(bx, by), Math.min(box.layer.group, layer.group + 1)], (count + i) * 4);
      data.set([Math.min(box.cut[0], 2 * bx, 2 * by), box.cut[1], box.cut[2], 0], (2 * count + i) * 4);
    });
    const scale = Math.min(window.devicePixelRatio || 1, maxScale);
    const key = [version, layer.group, scale, region.x, region.y, region.width, region.height, count, ...data].join(',');
    return { key, data, count, region, scale };
  }

  function draw(layer, { data, count, region, scale }) {
    const w = Math.max(1, Math.round(region.width * scale));
    const h = Math.max(1, Math.round(region.height * scale));
    if (surface.width < w) surface.width = w;
    if (surface.height < h) surface.height = h;
    const { program, uniforms: u, texture, vao } = glState;
    gl.viewport(0, 0, w, h);
    gl.useProgram(program);
    gl.bindVertexArray(vao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, count, ROWS, 0, gl.RGBA, gl.FLOAT, data);
    const bins = new Float32Array(SKY_BINS * 4);
    sky.bins.forEach(({ angle, lo, hi }, k) => bins.set([angle, lo, hi, 0], k * 4));
    gl.uniform1i(u.uBoxes, 0);
    gl.uniform1i(u.uCount, count);
    gl.uniform1i(u.uGroup, layer.group);
    gl.uniform4fv(u.uBins, bins);
    gl.uniform1i(u.uBinCount, sky.bins.length);
    gl.uniform1i(u.uPoint, sky.point ? 1 : 0);
    gl.uniform1i(u.uWrap, sky.wrap ? 1 : 0);
    gl.uniform1f(u.uSpan, sky.span);
    gl.uniform1f(u.uStep, sky.step);
    gl.uniform1f(u.uInvTotal, 1 / sky.total);
    gl.uniform1f(u.uThreshold, sky.threshold);
    gl.uniform1f(u.uAzimuth, settings.azimuth * Math.PI / 180);
    gl.uniform1f(u.uIntensity, settings.shadowIntensity / 100);
    gl.uniform1f(u.uGlobal, settings.globalIllumination / 100);
    gl.uniform3fv(u.uInk, colour);
    gl.uniform2f(u.uOrigin, region.x, region.y);
    gl.uniform1f(u.uScale, scale);
    gl.uniform1f(u.uRows, h);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    const { canvas, context } = layer;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    context.drawImage(surface, 0, surface.height - h, w, h, 0, 0, w, h);
    canvas.style.width = `${region.width}px`;
    canvas.style.height = `${region.height}px`;
    canvas.style.transform = `translate3d(${region.x}px, ${region.y}px, 0)`;
    stats.draws++;
  }

  function tick(now) {
    frame = 0;
    if (!visible || lost) return;
    const moving = motion && settings.offFrame;
    if (moving) travel += Math.min(0.1, Math.max(0, now - lastTick) / 1000) * settings.speed * OFF_FRAME.pace;
    lastTick = now;
    if (!moving || now < activeUntil || now - lastDraw >= MOTION_MS) {
      if (dirty) rebuild();
      const scene = measure();
      let shown = 0;
      for (const layer of [...layers.values()].sort((a, b) => a.group - b.group)) {
        const next = plan(layer, scene);
        layer.outer.hidden = !next;
        if (!next) {
          layer.drawn = null;
          continue;
        }
        shown++;
        if (next.key !== layer.drawn) {
          draw(layer, next);
          layer.drawn = next.key;
        }
      }
      Object.assign(stats, { casters: scene.casters.length, layers: shown });
      lastDraw = now;
    }
    if (moving || now < activeUntil) schedule();
  }

  function listen() {
    if (listening) return;
    listening = new AbortController();
    const options = { passive: true, capture: true, signal: listening.signal };
    for (const type of ['scroll', 'pointerover', 'pointerout', 'pointerdown', 'pointerup', 'focusin', 'focusout', 'transitionrun', 'animationstart']) {
      window.addEventListener(type, poke, options);
    }
    for (const type of ['resize', 'transitionend', 'animationend', 'load']) window.addEventListener(type, reflow, options);
    const scheme = matchMedia('(prefers-color-scheme: dark)');
    scheme.addEventListener('change', () => { readInk(); reflow(); }, { signal: listening.signal });
    const resize = new ResizeObserver(reflow);
    resize.observe(document.body);
    observer = new MutationObserver((records) => {
      if (records.some(({ target }) => !wrapper.contains(target))) reflow();
    });
    observer.observe(document.body, { subtree: true, childList: true, attributes: true });
    const theme = new MutationObserver(() => { readInk(); reflow(); });
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-scheme', 'data-theme', 'style'] });
    listening.signal.addEventListener('abort', () => {
      resize.disconnect();
      observer.disconnect();
      observer = null;
      theme.disconnect();
    });
    document.fonts?.ready.then(reflow);
  }

  surface.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    lost = true;
    cancelAnimationFrame(frame);
    frame = 0;
  });
  surface.addEventListener('webglcontextrestored', () => {
    try {
      glState = compile(gl);
      lost = false;
      for (const layer of layers.values()) layer.drawn = null;
      poke();
    } catch (error) {
      console.warn('Long shadows could not be restored.', error);
    }
  });

  function update(next, { visible: show = true, motion: moving = false } = {}) {
    if (!glState) return;
    settings = next;
    sky = sourceBins(next);
    if (show && !visible) dirty = true;
    visible = show;
    motion = moving;
    wrapper.hidden = !visible;
    version++;
    if (!visible) {
      listening?.abort();
      listening = null;
      cancelAnimationFrame(frame);
      frame = 0;
      return;
    }
    readInk();
    listen();
    lastTick = performance.now();
    poke();
  }

  function destroy() {
    listening?.abort();
    cancelAnimationFrame(frame);
    for (const layer of layers.values()) for (const animation of layer.animations) animation.cancel();
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    wrapper.remove();
  }

  return renderer;
}
