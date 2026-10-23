import { CUT_CORNERS, OFF_FRAME, SKY_BINS, WALL_BINS, bounceReach, casterReach, goboProjection, linearColour, litWalls, offFrameCasters, offFrameStep, sourceBins } from './lighting.mjs';

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
 * Off-frame shadows (a gobo's light, or moving posts) fall from outside the view, so
 * they are drawn once, fixed to the view, as if everything stood on the page. Each
 * raised floor shows a copy slid sideways by its height: a fixed canvas inside a
 * clip-path of that floor's surfaces, which the browser moves with them, so no copy
 * ever depends on where another frame's surfaces were when it was drawn.
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
uniform bool uGobo;
uniform bool uSplit;
uniform sampler2D uGoboMask;
uniform vec2 uGoboBase;
uniform vec2 uGoboAcross;
uniform vec2 uGoboSize;
uniform float uGoboUnit;
uniform float uGoboStretch;
uniform float uGoboBlur;
uniform float uGoboDistance;
uniform float uGoboTime;
layout(location = 0) out vec4 outShade;
layout(location = 1) out vec4 outGlow;
layout(location = 2) out vec4 outGobo;
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
// the height p stands at. Off-frame casters are drawn in their own pass, with no
// surfaces, so they always fall on the page; the copies on raised floors slide them.
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

float hash(vec2 c) {
  return fract(sin(dot(c, vec2(127.1, 311.7))) * 43758.5453);
}

float valueNoise(vec2 x) {
  vec2 i = floor(x);
  vec2 f = fract(x);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

// The share of the light the gobo blocks at p, on the page. The image is held across
// the rays, so it stretches along the light; the copies on raised floors slide the
// whole pattern, its size and blur unchanged. It sways: a slow, smooth warp that grows
// toward its free (top) edge, in gusts, over a slower lean and drift. The source's
// size blurs it over a disc as wide as the gap between mask and page allows.
float goboShadow(vec2 p, float spin) {
  vec2 along = vec2(-uGoboAcross.y, uGoboAcross.x);
  vec2 q = p - uGoboBase;
  vec2 t = vec2(dot(q, uGoboAcross), dot(q, along) / uGoboStretch) / uGoboUnit;
  float tip = clamp(t.y / uGoboSize.y, 0.0, 1.0);
  vec2 cell = t / uGoboSize.y * 3.0;
  vec2 sway = vec2(valueNoise(cell + vec2(uGoboTime * 0.11, 0.0)), valueNoise(cell + vec2(23.7, uGoboTime * 0.09))) - 0.5;
  float gust = 0.6 + 0.4 * sin(uGoboTime * 0.21) * sin(uGoboTime * 0.067 + 1.3);
  t += sway * uGoboSize.y * (0.008 + 0.03 * tip) * gust;
  t.x += uGoboSize.y * (0.012 * tip * sin(uGoboTime * 0.05) + 0.02 * sin(uGoboTime * 0.017 + 0.7));
  float radius = uGoboDistance * uGoboBlur;
  float lod = log2(max(radius * 0.44, 1.0));
  int taps = radius < 0.5 ? 1 : 16;
  float blocked = 0.0;
  for (int i = 0; i < taps; i++) {
    float r = radius * sqrt((float(i) + 0.5) / float(taps));
    float a = float(i) * 2.39996323 + spin;
    vec2 s = t + r * vec2(cos(a), sin(a));
    vec2 uv = vec2(s.x / uGoboSize.x + 0.5, 1.0 - s.y / uGoboSize.y);
    if (uv.y < 0.0) continue;
    vec4 m = textureLod(uGoboMask, uv, lod);
    blocked += m.a * (1.0 - dot(m.rgb, vec3(0.2126, 0.7152, 0.0722)));
  }
  return blocked / float(taps);
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

// The light where the gobo blocks all of the source: as deep as a surface's shadow
// under open sky, and never deeper, since both block the same light.
vec3 goboFull() {
  return 1.0 - uIntensity * (1.0 - uGlobal) * (1.0 - uInk);
}

void main() {
  vec2 p = uOrigin + vec2(gl_FragCoord.x, uRows - gl_FragCoord.y) / uScale;
  float floorZ;
  vec3 ratio;
  float gobo = 0.0;
  if (uPoint) {
    float d = 0.25 / uScale;
    ratio = vec3(0.0);
    for (int s = 0; s < 4; s++) {
      vec2 shift = vec2((s & 1) == 0 ? -d : d, (s & 2) == 0 ? -d : d);
      vec2 shaded = shade(p + shift, 0.0, floorZ);
      if (uGobo) gobo += 0.25 * goboShadow(p + shift, 0.0);
      ratio += 0.25 * frameLight(shaded, uGlow ? bounce(p + shift, floorZ) : vec3(0.0));
    }
  } else {
    float noise = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
    vec2 shaded = shade(p, (noise - 0.5) * uStep, floorZ);
    if (uGobo) gobo = goboShadow(p, noise * 2.0 * PI);
    ratio = frameLight(shaded, uGlow ? bounce(p, floorZ) : vec3(0.0));
  }
  outShade = vec4(clamp(ratio, 0.0, 1.0), 1.0);
  // The gobo pass has no bounce, so its glow target takes the gobo's second half. The
  // gobo and a surface block the same source: where the surfaces leave light F and
  // the gobo blocks a share g of what reaches the page, the page gets
  // F (1 - g) + g goboFull(), which is 1 - k (a + g - a g) for a surface blocking a.
  // It is drawn in two parts the browser combines with the frames: (1 - g) multiplied,
  // then g goboFull() added. In a surface's full shadow it changes nothing. A browser
  // that cannot add (uSplit off) multiplies the gobo's own light instead.
  outGlow = uGobo ? vec4(gobo * goboFull(), 1.0) : vec4(1.0 - 1.0 / max(ratio, vec3(1.0)), 1.0);
  outGobo = vec4(uSplit ? vec3(1.0 - gobo) : 1.0 - gobo * (1.0 - goboFull()), 1.0);
}`;

const NAMES = ['uBoxes', 'uWalls', 'uCount', 'uGlow', 'uGround', 'uBins', 'uBinCount', 'uPoint', 'uWrap', 'uSpan', 'uStep', 'uInvTotal', 'uThreshold', 'uAzimuth', 'uIntensity', 'uGlobal', 'uInk', 'uOrigin', 'uScale', 'uRows',
  'uGobo', 'uSplit', 'uGoboMask', 'uGoboBase', 'uGoboAcross', 'uGoboSize', 'uGoboUnit', 'uGoboStretch', 'uGoboBlur', 'uGoboDistance', 'uGoboTime'];

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
  // Three targets drawn in one pass: the shadow factor (darkened with other frames), the
  // bounce (dodged) and the gobo's light (multiplied after the frames).
  const targets = [texture(), texture(), texture()];
  const buffer = gl.createFramebuffer();
  // Stands in for a gobo's mask until one is loaded: it blocks nothing.
  const clear = texture();
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
  return { program, uniforms, boxes: texture(), walls: texture(), clear, targets, buffer, size: [0, 0], vao: gl.createVertexArray() };
}

/**
 * A gobo's mask as a texture: mipmapped for its penumbra, mirrored across the light
 * so a narrow image tiles without seams, and clamped along it.
 */
function maskTexture(gl, image) {
  const made = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, made);
  gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.BROWSER_DEFAULT_WEBGL);
  gl.generateMipmap(gl.TEXTURE_2D);
  for (const [key, value] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) {
    gl.texParameteri(gl.TEXTURE_2D, key, value);
  }
  return made;
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

/** A canvas fixed to the view that shows the off-frame light on floors z high. */
function viewCopy(z) {
  const canvas = document.createElement('canvas');
  return { z, canvas, context: canvas.getContext('2d', { alpha: false }), drawn: null };
}

// A surface's corners clockwise from its top right: which corner, the direction its
// edge comes in along, and the direction it leaves along.
const OUTLINE = [['top-right', [1, 0], [0, 1]], ['bottom-right', [0, 1], [-1, 0]], ['bottom-left', [-1, 0], [0, -1]], ['top-left', [0, -1], [1, 0]]];

/** A surface's outline as SVG path data, less shift: its rounded box, one corner maybe cut straight across. */
function outline({ x, y, width, height, radius, notch }, [sx, sy]) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  const left = x - sx;
  const top = y - sy;
  const at = { 'top-right': [left + width, top], 'bottom-right': [left + width, top + height], 'bottom-left': [left, top + height], 'top-left': [left, top] };
  const n = (v) => Math.round(v * 100) / 100;
  const turns = OUTLINE.map(([name, into, out]) => {
    const cut = notch?.corner === name ? Math.min(notch.size, width, height) : 0;
    const k = cut || r;
    const [px, py] = at[name];
    return { from: [n(px - into[0] * k), n(py - into[1] * k)], to: [n(px + out[0] * k), n(py + out[1] * k)], arc: !cut && r > 0 };
  });
  const start = turns[3].to;
  return `M${start[0]} ${start[1]}${turns.map(({ from, to, arc }) => `L${from[0]} ${from[1]}${arc ? `A${n(r)} ${n(r)} 0 0 1 ${to[0]} ${to[1]}` : `L${to[0]} ${to[1]}`}`).join('')}Z`;
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
 * top-right). `gobos` maps a gobo's name (see GOBOS) to its mask's URL; a mask loads
 * when its gobo is first chosen. Returns { supported, update(settings, { visible,
 * motion }), destroy(), stats }.
 */
export function createLightRenderer({ selector = '[data-elevation]', heights, ink = 'var(--light-shadow-ink)', maxScale = 1, gobos = {} } = {}) {
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
  // over the page; the off-frame sets come last in the group, darkened (posts) or
  // multiplied (a gobo) over the frames, then added (a gobo's shared light). Glow
  // frames follow the group, so every bounce brightens the page after all shadows
  // have darkened it.
  const shadows = document.createElement('div');
  shadows.setAttribute('data-light-shadows', '');
  wrapper.append(shadows);
  // The off-frame sets, each the view's copy for the page, then each frame's floors
  // (see makeLayer), in the order the frames stack. Copies paint normally, so each
  // floor's covers the one beneath it, and only a set as a whole blends with the
  // frames. The first darkens (posts) or multiplies (a gobo); with a gobo the second
  // adds back the light a surface's shadow and the gobo's both block (see main).
  const sets = ['posts', 'add'].map((kind) => {
    const host = document.createElement('div');
    host.setAttribute('data-light-offframe', kind);
    host.hidden = true;
    const view = viewCopy(0);
    host.append(view.canvas);
    shadows.append(host);
    return { host, view };
  });
  const [offFrame, offAdd] = sets.map(({ host }) => host);
  const split = globalThis.CSS?.supports?.('mix-blend-mode', 'plus-lighter') ?? false;
  document.body.append(wrapper);
  const surface = document.createElement('canvas');

  let settings = null;
  let sky = null;
  let step = [0, 0];
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
  let goboTime = 0;
  const masks = new Map();
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

  /** The chosen gobo's mask once it has loaded, or null. Each mask loads once, on first use. */
  function goboMask() {
    const name = settings.offFrame ? settings.gobo ?? 'none' : 'none';
    if (name === 'none' || !gobos[name]) return null;
    let entry = masks.get(name);
    if (!entry) {
      entry = { texture: null, width: 0, height: 0 };
      masks.set(name, entry);
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.decoding = 'async';
      image.src = gobos[name];
      image.decode().then(() => {
        if (masks.get(name) !== entry) return;
        entry.texture = maskTexture(gl, image);
        entry.width = image.naturalWidth;
        entry.height = image.naturalHeight;
        version++;
        poke();
      }, (error) => console.warn(`The ${name} gobo could not be loaded.`, error));
    }
    return entry.texture ? { name, ...entry } : null;
  }

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
    shadows.insertBefore(shadow.outer, offFrame);
    wrapper.append(glow.outer);
    // The frame's raised floors for each off-frame set: divs that move like the
    // frame's, holding one clipped copy per floor height.
    const floors = sets.map(({ host }) => {
      const set = { outer: document.createElement('div'), marker: document.createElement('span'), levels: new Map() };
      set.outer.setAttribute('data-light-clip', fixed ? 'fixed' : 'page');
      set.outer.hidden = true;
      set.inner = set.outer;
      set.nest = frames.map(() => {
        const div = document.createElement('div');
        set.inner.append(div);
        set.inner = div;
        return div;
      });
      set.inner.append(set.marker);
      host.append(set.outer);
      return set;
    });
    const rank = fixed ? (frames.length ? 2 : 3) : (frames.length ? 1 : 0);
    return { key, fixed, rank, frames, outer: shadow.outer, nest: shadow.nest, marker, canvas: shadow.canvas, context: shadow.context, glow, floors, animations: [], group: 0, drawn: null };
  }

  function dropLevel(level) {
    for (const animation of level.animations) animation.cancel();
    level.clip.remove();
  }

  /** Outer frames wrap inner ones; each follows its scroll container on the compositor. */
  function animate(layer, frames) {
    for (const animation of layer.animations) animation.cancel();
    const outward = [...frames].reverse();
    layer.animations = [layer.nest, layer.glow.nest, ...layer.floors.map(({ nest }) => nest)].flatMap((nest) => outward.map(({ source, axis, stops }, k) => nest[k].animate(
      stops.map(([offset, value]) => ({ offset, transform: axis === 'x' ? `translate3d(${value}px, 0, 0)` : `translate3d(0, ${value}px, 0)` })),
      { timeline: new ScrollTimeline({ source, axis }), fill: 'both', easing: 'linear' },
    )));
    layer.frames = frames;
    for (const { levels } of layer.floors) for (const level of levels.values()) counter(layer, level);
    layer.drawn = null;
  }

  /**
   * A floor's copy stays fixed to the view while its clip moves with the floor. Inside
   * a frame's moving divs a fixed canvas is placed by them instead, so a chain of divs
   * undoes each move, the page's own scroll included.
   */
  function counter(layer, level) {
    for (const animation of level.animations) animation.cancel();
    level.clip.replaceChildren();
    const moves = [...layer.frames];
    if (moves.length && !layer.fixed) {
      const source = document.scrollingElement || document.documentElement;
      const max = source.scrollHeight - source.clientHeight;
      if (max > 0) moves.push({ source, axis: 'y', stops: [[0, 0], [1, -max]] });
    }
    let inner = level.clip;
    level.animations = moves.map(({ source, axis, stops }) => {
      const div = document.createElement('div');
      inner.append(div);
      inner = div;
      return div.animate(
        stops.map(([offset, value]) => ({ offset, transform: axis === 'x' ? `translate3d(${-value}px, 0, 0)` : `translate3d(0, ${-value}px, 0)` })),
        { timeline: new ScrollTimeline({ source, axis }), fill: 'both', easing: 'linear' },
      );
    });
    inner.append(level.canvas);
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
    for (const [key, layer] of layers) {
      if (wanted.has(key)) continue;
      for (const animation of layer.animations) animation.cancel();
      for (const floors of layer.floors) {
        for (const floor of floors.levels.values()) dropLevel(floor);
        floors.outer.remove();
      }
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
      layer.floors.forEach((floors, k) => sets[k].host.append(floors.outer));
    });
    // Measuring sticky surfaces wrote their style; those records are the layer's own.
    observer?.takeRecords();
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
    // Off-frame shadows come from the chosen gobo, or from moving objects when there is none.
    const mask = goboMask();
    const gobo = mask && { mask, ...goboProjection({ width, height: view.height, azimuth: settings.azimuth, altitude: settings.altitude, sourceSize: settings.sourceSize, image: mask, gobo: mask.name }) };
    const posts = settings.offFrame && (settings.gobo ?? 'none') === 'none'
      ? offFrameCasters({ width, height: view.height, azimuth: settings.azimuth, altitude: settings.altitude, sourceSize: settings.sourceSize, travel })
        .map((box) => ({ ...box, x: box.x + view.x, y: box.y + view.y, cut: [0, 0, 0], layer: null, post: true }))
      : [];
    const casters = [...posts, ...boxes].slice(0, MAX_CASTERS);
    lightWalls(casters, { view, pad, top, bottom });
    return { casters, surfaces: boxes, origin, view, pad, width, gobo };
  }

  /**
   * The light each wall bounces, for walls whose bounce can reach the view: strips
   * { a, b, rgb } with rgb the reflected light (albedo x irradiance x bounce share).
   * Surfaces shade each other's walls; off-frame shadows do not. They are fixed to the
   * view, so a wall's light would change as the page scrolls and lag the compositor;
   * they still dim the bounce where they fall, since the glow brightens the page after
   * the shadow group has darkened it. Kept while nothing moves.
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
    const own = casters.filter((box) => !box.post);
    const key = [version, ...own.flatMap((box) => [box.x, box.y, box.width, box.height, box.z, box.base ?? 0, box.notch?.size ?? 0, box.notch?.corner ?? '', near(box) ? 1 : 0])].join(',');
    if (wallCache.key !== key) {
      const solids = own.map((box) => ({ x: box.x, y: box.y, width: box.width, height: box.height, radius: box.radius, z: box.z, base: box.base, cut: box.notch ?? undefined }));
      wallCache = { key, strips: litWalls(solids, settings, { count: WALL_BINS, only: (_, i) => near(own[i]) }) };
    }
    own.forEach((box, i) => {
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
    const list = casters.filter((box) => !box.post);
    const count = list.length;
    const data = new Float32Array(Math.max(count, 1) * 4 * ROWS);
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
    return { key, data, count, walls, width: n, glow, region, scale, gobo: null };
  }

  /**
   * Each frame's raised floors, by height, clipped to their surfaces' outlines in the
   * frame's own coordinates, under the view's copy for the page, in off-frame set k.
   * Returns every copy.
   */
  function placeFloors({ surfaces, origin }, k) {
    const wanted = new Map();
    for (const box of surfaces) {
      if (!box.layer || box.z <= 0) continue;
      if (!wanted.has(box.layer)) wanted.set(box.layer, new Map());
      const floors = wanted.get(box.layer);
      if (!floors.has(box.z)) floors.set(box.z, []);
      floors.get(box.z).push(box);
    }
    const copies = [sets[k].view];
    for (const layer of layers.values()) {
      const floors = wanted.get(layer);
      const { outer, inner, marker, levels } = layer.floors[k];
      outer.hidden = !floors;
      for (const [z, level] of levels) {
        if (floors?.has(z)) continue;
        dropLevel(level);
        levels.delete(z);
      }
      if (!floors) continue;
      const mark = marker.getBoundingClientRect();
      const shift = [mark.left - origin.left, mark.top - origin.top];
      let added = false;
      for (const [z, boxes] of floors) {
        let level = levels.get(z);
        if (!level) {
          level = { ...viewCopy(z), clip: document.createElement('div'), animations: [], path: '' };
          level.clip.append(level.canvas);
          if (layer.frames.length) counter(layer, level);
          levels.set(z, level);
          added = true;
        }
        const path = `path('${boxes.map((box) => outline(box, shift)).join(' ')}')`;
        if (level.path !== path) {
          level.clip.style.clipPath = path;
          level.path = path;
        }
        copies.push(level);
      }
      if (added) [...levels.values()].sort((a, b) => a.z - b.z).forEach((level) => inner.append(level.clip));
    }
    return copies;
  }

  /**
   * The off-frame pass: the posts or the gobo on a bare page, in view px, with room on
   * each side for the copies' slides. It does not change as the page scrolls. The
   * copies reach pad past the view's top and bottom: the browser sizes a clip to what
   * it clips, so a view-sized copy would leave a floor that scrolls in bare for a frame.
   */
  function planOffFrame({ casters, gobo, view, pad }, copies) {
    const posts = casters.filter((box) => box.post);
    const top = Math.max(...copies.map(({ z }) => z));
    const margin = [Math.ceil(top * Math.abs(step[0])) + 1, Math.ceil(top * Math.abs(step[1])) + 1];
    const size = [Math.max(1, Math.round(view.width)), Math.max(1, Math.round(view.height)) + 2 * pad];
    const region = { x: -margin[0], y: -pad - margin[1], width: size[0] + 2 * margin[0], height: size[1] + 2 * margin[1] };
    const count = posts.length;
    const data = new Float32Array(Math.max(count, 1) * 4 * ROWS);
    posts.forEach((box, i) => {
      const bx = box.width / 2;
      const by = box.height / 2;
      data.set([box.x + bx - view.x, box.y + by - view.y, bx, by], i * 4);
      data.set([Math.min(Math.max(box.radius, 0), bx, by), box.z, Math.hypot(bx, by), 1], (count + i) * 4);
    });
    const scale = Math.min(window.devicePixelRatio || 1, maxScale);
    const placed = gobo && { ...gobo, time: goboTime, distance: settings.goboDistance };
    const key = [version, scale, ...size, pad, ...margin, count, ...data, ...(placed ? [...placed.base, placed.time] : [])].join(',');
    return { key, data, count, walls: new Float32Array(8), width: 1, glow: false, region, scale, gobo: placed, margin, size, pad };
  }

  /** Draw the off-frame pass if any copy needs it, then each copy from panel's image, slid by its height. */
  function drawOffFrame(next, copies, panel, rendered) {
    for (const target of copies) {
      if (target.drawn === next.key) continue;
      const [w, h] = rendered();
      const { canvas, context, z } = target;
      const vw = Math.max(1, Math.round(next.size[0] * next.scale));
      const vh = Math.max(1, Math.round(next.size[1] * next.scale));
      if (canvas.width !== vw || canvas.height !== vh) {
        canvas.width = vw;
        canvas.height = vh;
      }
      const sx = panel * w + Math.round((next.margin[0] - z * step[0]) * next.scale);
      const sy = surface.height - h + Math.round((next.margin[1] - z * step[1]) * next.scale);
      context.drawImage(surface, sx, sy, vw, vh, 0, 0, vw, vh);
      canvas.style.top = `${-next.pad}px`;
      canvas.style.width = `${next.size[0]}px`;
      canvas.style.height = `${next.size[1]}px`;
      target.drawn = next.key;
    }
  }

  /**
   * Show the off-frame set when a gobo or posts cast, and with a gobo the set that adds
   * back the light it shares with the surfaces' shadows; returns whether any shows.
   */
  function showOffFrame(scene) {
    const kind = scene.gobo ? 'gobo' : scene.casters.some((box) => box.post) ? 'posts' : null;
    offFrame.hidden = !kind;
    offAdd.hidden = !(kind === 'gobo' && split);
    if (!kind) return false;
    if (offFrame.getAttribute('data-light-offframe') !== kind) offFrame.setAttribute('data-light-offframe', kind);
    const copies = placeFloors(scene, 0);
    const next = planOffFrame(scene, copies);
    let drawn = null;
    const rendered = () => (drawn ??= render(next));
    drawOffFrame(next, copies, kind === 'gobo' ? 2 : 0, rendered);
    if (!offAdd.hidden) drawOffFrame(next, placeFloors(scene, 1), 1, rendered);
    return true;
  }

  /** Size the three render targets to at least w x h. */
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
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2]);
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

  /** Render one pass into the surface's three w x h panels, side by side at its bottom; returns [w, h]. */
  function render({ data, count, walls, width, glow, region, scale, gobo }) {
    const w = Math.max(1, Math.round(region.width * scale));
    const h = Math.max(1, Math.round(region.height * scale));
    if (surface.width < 3 * w) surface.width = 3 * w;
    if (surface.height < h) surface.height = h;
    targets(w, h);
    const { program, uniforms: u, boxes, walls: wallTexture, clear, buffer, vao } = glState;
    gl.bindFramebuffer(gl.FRAMEBUFFER, buffer);
    gl.viewport(0, 0, w, h);
    gl.useProgram(program);
    gl.bindVertexArray(vao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, boxes);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, Math.max(count, 1), ROWS, 0, gl.RGBA, gl.FLOAT, data);
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
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, gobo ? gobo.mask.texture : clear);
    gl.uniform1i(u.uGoboMask, 2);
    gl.uniform1i(u.uGobo, gobo ? 1 : 0);
    gl.uniform1i(u.uSplit, split ? 1 : 0);
    if (gobo) {
      gl.uniform2f(u.uGoboBase, gobo.base[0], gobo.base[1]);
      gl.uniform2f(u.uGoboAcross, gobo.across[0], gobo.across[1]);
      gl.uniform2f(u.uGoboSize, gobo.mask.width, gobo.mask.height);
      gl.uniform1f(u.uGoboUnit, gobo.unit);
      gl.uniform1f(u.uGoboStretch, gobo.stretch);
      gl.uniform1f(u.uGoboBlur, gobo.blur);
      gl.uniform1f(u.uGoboDistance, gobo.distance);
      gl.uniform1f(u.uGoboTime, gobo.time);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, buffer);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    gl.readBuffer(gl.COLOR_ATTACHMENT0);
    gl.blitFramebuffer(0, 0, w, h, 0, 0, w, h, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    if (glow || gobo) {
      gl.readBuffer(gl.COLOR_ATTACHMENT1);
      gl.blitFramebuffer(0, 0, w, h, w, 0, 2 * w, h, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    }
    if (gobo) {
      gl.readBuffer(gl.COLOR_ATTACHMENT2);
      gl.blitFramebuffer(0, 0, w, h, 2 * w, 0, 3 * w, h, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return [w, h];
  }

  function draw(layer, next) {
    const { region, glow } = next;
    const [w, h] = render(next);
    copy(layer.canvas, layer.context, 0, w, h, region);
    if (glow) copy(layer.glow.canvas, layer.glow.context, w, w, h, region);
    stats.draws++;
  }

  function tick(now) {
    frame = 0;
    if (!visible || lost) return;
    const moving = motion && settings.offFrame;
    if (moving) {
      const seconds = Math.min(0.1, Math.max(0, now - lastTick) / 1000);
      travel += seconds * settings.speed * OFF_FRAME.pace;
      goboTime += seconds * settings.speed / 5;
    }
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
      if (showOffFrame(scene)) shown++;
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
    // Detached targets are the layer's own leftovers (a canvas moved out of a dropped
    // chain); answering them would rebuild on every frame.
    observer = new MutationObserver((records) => {
      if (records.some(({ target }) => target.isConnected && !wrapper.contains(target))) reflow();
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
      masks.clear();
      lost = false;
      for (const layer of layers.values()) {
        layer.drawn = null;
        for (const { levels } of layer.floors) for (const level of levels.values()) level.drawn = null;
      }
      for (const { view } of sets) view.drawn = null;
      poke();
    } catch (error) {
      console.warn('Long shadows could not be restored.', error);
    }
  });

  function update(next, { visible: show = true, motion: moving = false } = {}) {
    if (!glState) return;
    settings = next;
    sky = sourceBins(next);
    ({ step } = offFrameStep(next));
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
    for (const layer of layers.values()) {
      for (const animation of layer.animations) animation.cancel();
      for (const { levels } of layer.floors) for (const level of levels.values()) dropLevel(level);
    }
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    wrapper.remove();
  }

  return renderer;
}
