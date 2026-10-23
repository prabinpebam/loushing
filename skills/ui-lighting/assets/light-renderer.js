import { CUT_CORNERS, OFF_FRAME, SKY_BINS, WALL_BINS, bounceReach, casterReach, linearColour, litWalls, offFrameCasters, sourceBins } from './lighting.mjs';

/**
 * Portable shared shadow layer. One WebGL2 program draws every cast shadow from one
 * light, so overlapping shadows take the highest skyline instead of stacking. It is
 * product-agnostic: the host passes a selector, the height of each elevation level
 * and a CSS colour for the shadow ink, and styles [data-light-layer].
 *
 * Surfaces move in different scroll frames: with the page, with a sticky bar or a
 * scrolling box, or fixed to the view. Each frame gets its own canvas, which the
 * browser moves with the surfaces it holds through scroll-driven animations, so a
 * shadow never lags its caster. Canvas k holds only the light its own casters leave,
 * per channel 1 - a_k m, with a_k their shadow and m one minus the ink. The canvases
 * are darkened together and the result multiplied over the page: for one light the
 * darkest frame is the union of the shadows, and because the browser combines them
 * on every frame, a frame scrolling on the compositor never meets a stale neighbour.
 * Each redraws only when the scene changes within its frame, or while off-frame
 * casters move.
 */
const MAX_CASTERS = 128;
const MAX_LAYERS = 8;
const SETTLE_MS = 600;
const MOTION_MS = 33;
const MARGIN = 0.25;
const SNAP = 64;
const ROWS = 4;
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
uniform sampler2D uWalls;
uniform int uCount;
uniform bool uGlow;
uniform vec3 uGround;
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
layout(location = 0) out vec4 outShade;
layout(location = 1) out vec4 outGlow;
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

// The shadow at p from this frame's own casters: the share of the source hidden (x)
// and the sky hidden for global illumination (y). Every frame's surfaces still set
// the height p stands at.
vec2 shade(vec2 p, float jitter, out float floorZ) {
  floorZ = 0.0;
  for (int i = 0; i < uCount; i++) {
    vec4 a = texelFetch(uBoxes, ivec2(i, 0), 0);
    vec4 b = texelFetch(uBoxes, ivec2(i, 1), 0);
    vec4 c = texelFetch(uBoxes, ivec2(i, 2), 0);
    if (shapeDistance(p - a.xy, a.zw, b.x, c) <= 0.0) floorZ = max(floorZ, b.y);
  }
  vec2 light = vec2(sin(uAzimuth), -cos(uAzimuth));
  vec2 dirs[${SKY_BINS}];
  float hit[${SKY_BINS}];
  for (int k = 0; k < uBinCount; k++) {
    float phi = uAzimuth + uBins[k].x + jitter;
    dirs[k] = vec2(sin(phi), -cos(phi));
    hit[k] = 0.0;
  }
  float occ = 0.0;
  for (int i = 0; i < uCount; i++) {
    vec4 b = texelFetch(uBoxes, ivec2(i, 1), 0);
    float dz = b.y - floorZ;
    if (b.w < 0.5 || dz <= 0.0) continue;
    vec4 a = texelFetch(uBoxes, ivec2(i, 0), 0);
    vec4 c = texelFetch(uBoxes, ivec2(i, 2), 0);
    vec2 q = p - a.xy;
    float dist = max(shapeDistance(q, a.zw, b.x, c), 0.0);
    float dz2 = dz * dz;
    if (dz2 / (dz2 + dist * dist) <= uThreshold) continue;
    float away = length(q);
    bool around = away <= b.z;
    float cone = around ? 0.5 * PI : asin(b.z / away);
    occ = max(occ, (2.0 * cone / PI) * (1.0 - dist / sqrt(dist * dist + dz2)));
    if (uPoint) {
      float t = entry(q, light, a.zw, b.x, c);
      if (t >= 0.0) hit[0] = max(hit[0], dz2 / (dz2 + t * t));
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
      if (t >= 0.0) hit[j] = max(hit[j], dz2 / (dz2 + t * t));
    }
  }
  if (uPoint) return vec2(hit[0] > uBins[0].y ? 1.0 : 0.0, occ);
  float hidden = 0.0;
  for (int k = 0; k < uBinCount; k++) hidden += clamp(hit[k] - uBins[k].y, 0.0, uBins[k].z - uBins[k].y);
  return vec2(hidden * uInvTotal, occ);
}

// Lambert's polygon formula for a wall strip over the ground segment A..B (offsets
// from p), from lo to hi above p's floor: only its two level edges count.
float edgeTerm(vec2 A, vec2 B, float cz, float l2, float h) {
  float h2 = h * h;
  float c = (dot(A, B) + h2) * inversesqrt((dot(A, A) + h2) * (dot(B, B) + h2));
  return acos(clamp(c, -1.0, 1.0)) * -cz * inversesqrt(h2 * l2 + cz * cz);
}

// Light bounced onto p by this frame's lit walls, in shares of full light (linear).
vec3 bounce(vec2 p, float floorZ) {
  vec3 sum = vec3(0.0);
  for (int i = 0; i < uCount; i++) {
    vec4 w = texelFetch(uBoxes, ivec2(i, 3), 0);
    if (w.y < 0.5) continue;
    vec4 b = texelFetch(uBoxes, ivec2(i, 1), 0);
    if (b.w < 0.5 || b.y <= floorZ) continue;
    vec4 a = texelFetch(uBoxes, ivec2(i, 0), 0);
    vec4 c = texelFetch(uBoxes, ivec2(i, 2), 0);
    if (shapeDistance(p - a.xy, a.zw, b.x, c) > w.z) continue;
    float lo = max(w.w, floorZ) - floorZ;
    float hi = b.y - floorZ;
    int start = int(w.x + 0.5);
    int end = start + int(w.y + 0.5);
    for (int j = start; j < end; j++) {
      vec4 s = texelFetch(uWalls, ivec2(j, 0), 0);
      vec2 A = s.xy - p;
      vec2 B = s.zw - p;
      float cz = A.x * B.y - A.y * B.x;
      if (cz >= -1e-6) continue;
      vec2 d = B - A;
      float l2 = dot(d, d);
      float f = max(edgeTerm(A, B, cz, l2, lo) - edgeTerm(A, B, cz, l2, hi), 0.0) / (2.0 * PI);
      sum += texelFetch(uWalls, ivec2(j, 1), 0).rgb * f;
    }
  }
  return sum;
}

// The light at p from this frame alone, shadow plus bounce, limited so the page colour
// times the light stays displayable with its hue kept. The browser takes the darkest
// frame per channel, which is the union of their shadows.
vec3 frameLight(vec2 s, vec3 glow) {
  float shadow = uIntensity * s.x * (1.0 - uGlobal * (1.0 - min(s.y, 1.0)));
  vec3 lit = 1.0 - shadow * (1.0 - uInk) + glow;
  vec3 seen = uGround * lit;
  return lit / max(1.0, max(seen.r, max(seen.g, seen.b)));
}

void main() {
  vec2 p = uOrigin + vec2(gl_FragCoord.x, uRows - gl_FragCoord.y) / uScale;
  float floorZ;
  vec3 ratio;
  if (uPoint) {
    float d = 0.25 / uScale;
    ratio = vec3(0.0);
    for (int s = 0; s < 4; s++) {
      vec2 shift = vec2((s & 1) == 0 ? -d : d, (s & 2) == 0 ? -d : d);
      vec2 shaded = shade(p + shift, 0.0, floorZ);
      ratio += 0.25 * frameLight(shaded, uGlow ? bounce(p + shift, floorZ) : vec3(0.0));
    }
  } else {
    float noise = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
    vec2 shaded = shade(p, (noise - 0.5) * uStep, floorZ);
    ratio = frameLight(shaded, uGlow ? bounce(p, floorZ) : vec3(0.0));
  }
  outShade = vec4(clamp(ratio, 0.0, 1.0), 1.0);
  outGlow = vec4(1.0 - 1.0 / max(ratio, vec3(1.0)), 1.0);
}`;

const NAMES = ['uBoxes', 'uWalls', 'uCount', 'uGlow', 'uGround', 'uBins', 'uBinCount', 'uPoint', 'uWrap', 'uSpan', 'uStep', 'uInvTotal', 'uThreshold', 'uAzimuth', 'uIntensity', 'uGlobal', 'uInk', 'uOrigin', 'uScale', 'uRows'];

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
  const texture = (filter = gl.NEAREST) => {
    const made = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, made);
    for (const [key, value] of [[gl.TEXTURE_MIN_FILTER, filter], [gl.TEXTURE_MAG_FILTER, filter], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) {
      gl.texParameteri(gl.TEXTURE_2D, key, value);
    }
    return made;
  };
  // Two targets drawn in one pass: the shadow factor (multiplied) and the bounce (dodged).
  const targets = [texture(), texture()];
  const buffer = gl.createFramebuffer();
  return { program, uniforms, boxes: texture(), walls: texture(), targets, buffer, size: [0, 0], vao: gl.createVertexArray() };
}

/** Resolve any CSS colour to sRGB channels and alpha in 0..1 through a 2D canvas. */
function rgba(colour) {
  const context = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  if (!context) return [0, 0, 0, 1];
  context.clearRect(0, 0, 1, 1);
  context.fillStyle = '#000';
  context.fillStyle = colour;
  context.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
  return [r / 255, g / 255, b / 255, a / 255];
}

const rgb = (colour) => rgba(colour).slice(0, 3);

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
  // Every frame's shadow canvas sits in one group, darkened together and multiplied
  // over the page; glow frames follow the group, so every bounce brightens the page
  // after all shadows have darkened it.
  const shadows = document.createElement('div');
  shadows.setAttribute('data-light-shadows', '');
  wrapper.append(shadows);
  document.body.append(wrapper);
  const surface = document.createElement('canvas');

  let settings = null;
  let sky = null;
  let visible = false;
  let motion = false;
  let colour = [0, 0, 0];
  let ground = [1, 1, 1];
  const albedos = new Map();
  let wallCache = { key: '', strips: [] };
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
    const page = [document.body, document.documentElement].map((node) => rgba(getComputedStyle(node).backgroundColor)).find((channels) => channels[3] > 0.5);
    ground = page ? page.slice(0, 3) : [1, 1, 1];
    albedos.clear();
    version++;
  };
  /** A surface's walls share its background colour, as linear reflectance; see-through ones take the page's. */
  const albedoOf = (style) => {
    const key = style.backgroundColor;
    if (!albedos.has(key)) {
      const [r, g, b, a] = rgba(key);
      albedos.set(key, a > 0.5 ? linearColour([r, g, b]) : null);
    }
    return albedos.get(key) ?? linearColour(ground);
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

  /** Nested divs, one per frame, that the browser moves; the canvas sits innermost. */
  function nestFor(frames, fixed, glow) {
    const outer = document.createElement('div');
    outer.setAttribute(glow ? 'data-light-glow' : 'data-light-frame', fixed ? 'fixed' : 'page');
    outer.hidden = true;
    let inner = outer;
    const nest = frames.map(() => {
      const div = document.createElement('div');
      inner.append(div);
      inner = div;
      return div;
    });
    const canvas = document.createElement('canvas');
    return { outer, nest, inner, canvas, context: canvas.getContext('2d', { alpha: false }) };
  }

  function makeLayer({ key, fixed, frames }) {
    const shadow = nestFor(frames, fixed, false);
    const glow = nestFor(frames, fixed, true);
    const marker = document.createElement('span');
    shadow.inner.append(marker, shadow.canvas);
    glow.inner.append(glow.canvas);
    shadows.append(shadow.outer);
    wrapper.append(glow.outer);
    const rank = fixed ? (frames.length ? 2 : 3) : (frames.length ? 1 : 0);
    return { key, fixed, rank, outer: shadow.outer, nest: shadow.nest, marker, canvas: shadow.canvas, context: shadow.context, glow, animations: [], group: 0, drawn: null };
  }

  /** Outer frames wrap inner ones; each follows its scroll container on the compositor. */
  function animate(layer, frames) {
    for (const animation of layer.animations) animation.cancel();
    const outward = [...frames].reverse();
    layer.animations = [layer.nest, layer.glow.nest].flatMap((nest) => outward.map(({ source, axis, stops }, k) => nest[k].animate(
      stops.map(([offset, value]) => ({ offset, transform: axis === 'x' ? `translate3d(${value}px, 0, 0)` : `translate3d(0, ${value}px, 0)` })),
      { timeline: new ScrollTimeline({ source, axis }), fill: 'both', easing: 'linear' },
    )));
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
      layer.glow.outer.remove();
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
      const name = style.getPropertyValue('--light-cut-corner').trim() || 'top-right';
      const corner = CUT_CORNERS[name];
      const z = heightOf(el);
      const box = {
        x: left - origin.left, y: upper - origin.top, width: right - left, height: lower - upper,
        radius: parseFloat(style.borderTopLeftRadius) || 0, z, base: z - (heights[level(el)] || 0),
        cut: size > 0 && corner ? [size, ...corner] : [0, 0, 0],
        notch: size > 0 && corner ? { size, corner: name } : null,
        albedo: albedoOf(style),
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
    const casters = [...posts, ...boxes].slice(0, MAX_CASTERS);
    lightWalls(casters, { view, pad, top, bottom });
    return { casters, origin, view, pad, width };
  }

  /**
   * The light each wall bounces, for walls whose bounce can reach the view: strips
   * { a, b, rgb } with rgb the reflected light (albedo x irradiance x bounce share).
   * Every caster, off-frame posts included, can shade a wall. Kept while nothing moves.
   */
  function lightWalls(casters, { view, top, bottom }) {
    const gain = (settings.bounce ?? 0) / 100;
    for (const box of casters) {
      box.walls = [];
      box.reach = box.post || gain <= 0 ? 0 : bounceReach(box.z - box.base, gain * Math.max(...box.albedo));
    }
    if (gain <= 0) return;
    const near = (box) => {
      const dx = Math.max(view.x - (box.x + box.width), box.x - (view.x + view.width), 0);
      const dy = Math.max(top - (box.y + box.height), box.y - bottom, 0);
      return box.reach > 0 && Math.hypot(dx, dy) <= box.reach;
    };
    const key = [version, ...casters.flatMap((box) => [box.x, box.y, box.width, box.height, box.z, box.base ?? 0, box.notch?.size ?? 0, box.notch?.corner ?? '', near(box) ? 1 : 0])].join(',');
    if (wallCache.key !== key) {
      const solids = casters.map((box) => ({ x: box.x, y: box.y, width: box.width, height: box.height, radius: box.radius, z: box.z, base: box.base, post: box.post, cut: box.notch ?? undefined }));
      wallCache = { key, strips: litWalls(solids, settings, { count: WALL_BINS, only: (_, i) => near(casters[i]) }) };
    }
    casters.forEach((box, i) => {
      for (const { a, b, light } of wallCache.strips[i]) {
        const rgb = box.albedo.map((c) => Math.round(c * light * gain * 1024) / 1024);
        if (Math.max(...rgb) > 0) box.walls.push({ a, b, rgb });
      }
    });
  }

  /** Where this frame's casters can shade, within the view and its margin, in page px. */
  function footprint(own, { view, pad }) {
    const cap = Math.hypot(view.width, view.height) + 2 * pad;
    const arc = sweep();
    let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
    for (const box of own) {
      const reach = Math.min(casterReach(box.z, sky), cap);
      const glow = box.walls?.length ? Math.min(box.reach, cap) : 0;
      x0 = Math.min(x0, box.x - Math.max(reach * arc.left, glow));
      y0 = Math.min(y0, box.y - Math.max(reach * arc.up, glow));
      x1 = Math.max(x1, box.x + box.width + Math.max(reach * arc.right, glow));
      y1 = Math.max(y1, box.y + box.height + Math.max(reach * arc.down, glow));
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
    const list = casters.filter((box) => box.layer === layer || !box.post);
    const count = list.length;
    const data = new Float32Array(count * 4 * ROWS);
    const strips = [];
    list.forEach((box, i) => {
      const bx = box.width / 2;
      const by = box.height / 2;
      const own = box.layer === layer;
      data.set([box.x + bx - shift[0], box.y + by - shift[1], bx, by], i * 4);
      data.set([Math.min(Math.max(box.radius, 0), bx, by), box.z, Math.hypot(bx, by), own ? 1 : 0], (count + i) * 4);
      data.set([Math.min(box.cut[0], 2 * bx, 2 * by), box.cut[1], box.cut[2], 0], (2 * count + i) * 4);
      const lit = own ? box.walls ?? [] : [];
      data.set([strips.length, lit.length, box.reach ?? 0, box.base ?? 0], (3 * count + i) * 4);
      strips.push(...lit);
    });
    const n = Math.max(1, strips.length);
    const walls = new Float32Array(n * 4 * 2);
    strips.forEach(({ a, b, rgb }, j) => {
      walls.set([a[0] - shift[0], a[1] - shift[1], b[0] - shift[0], b[1] - shift[1]], j * 4);
      walls.set([...rgb, 0], (n + j) * 4);
    });
    const glow = strips.length > 0;
    const scale = Math.min(window.devicePixelRatio || 1, maxScale);
    const key = [version, layer.group, scale, region.x, region.y, region.width, region.height, count, ...data, ...(glow ? walls : [])].join(',');
    return { key, data, count, walls, width: n, glow, region, scale };
  }

  /** Size the two render targets to at least w x h. */
  function targets(w, h) {
    const { targets: made, buffer, size } = glState;
    if (size[0] >= w && size[1] >= h) return;
    const next = [Math.max(size[0], w), Math.max(size[1], h)];
    for (const target of made) {
      gl.bindTexture(gl.TEXTURE_2D, target);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, next[0], next[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, buffer);
    made.forEach((target, k) => gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + k, gl.TEXTURE_2D, target, 0));
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    glState.size = next;
  }

  /** Copy a w x h image from the surface's bottom-left, offset by sx, into a canvas. */
  function copy(canvas, context, sx, w, h, region) {
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    context.drawImage(surface, sx, surface.height - h, w, h, 0, 0, w, h);
    canvas.style.width = `${region.width}px`;
    canvas.style.height = `${region.height}px`;
    canvas.style.transform = `translate3d(${region.x}px, ${region.y}px, 0)`;
  }

  function draw(layer, { data, count, walls, width, glow, region, scale }) {
    const w = Math.max(1, Math.round(region.width * scale));
    const h = Math.max(1, Math.round(region.height * scale));
    if (surface.width < 2 * w) surface.width = 2 * w;
    if (surface.height < h) surface.height = h;
    targets(w, h);
    const { program, uniforms: u, boxes, walls: wallTexture, buffer, vao } = glState;
    gl.bindFramebuffer(gl.FRAMEBUFFER, buffer);
    gl.viewport(0, 0, w, h);
    gl.useProgram(program);
    gl.bindVertexArray(vao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, boxes);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, count, ROWS, 0, gl.RGBA, gl.FLOAT, data);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, wallTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width, 2, 0, gl.RGBA, gl.FLOAT, walls);
    const bins = new Float32Array(SKY_BINS * 4);
    sky.bins.forEach(({ angle, lo, hi }, k) => bins.set([angle, lo, hi, 0], k * 4));
    gl.uniform1i(u.uBoxes, 0);
    gl.uniform1i(u.uWalls, 1);
    gl.uniform1i(u.uCount, count);
    gl.uniform1i(u.uGlow, glow ? 1 : 0);
    gl.uniform3fv(u.uGround, ground);
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
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, buffer);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    gl.readBuffer(gl.COLOR_ATTACHMENT0);
    gl.blitFramebuffer(0, 0, w, h, 0, 0, w, h, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    if (glow) {
      gl.readBuffer(gl.COLOR_ATTACHMENT1);
      gl.blitFramebuffer(0, 0, w, h, w, 0, 2 * w, h, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    copy(layer.canvas, layer.context, 0, w, h, region);
    if (glow) copy(layer.glow.canvas, layer.glow.context, w, w, h, region);
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
        layer.glow.outer.hidden = !next?.glow;
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
