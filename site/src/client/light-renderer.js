import { SKY_BINS, casterReach, offFrameCasters, sourceBins } from '../lib/lighting.mjs';

/**
 * Portable shared shadow layer. One WebGL2 canvas draws every cast shadow from one
 * light, so overlapping shadows take the highest skyline instead of stacking. It is
 * product-agnostic: the host passes a selector, the height of each elevation level
 * and a CSS colour for the shadow ink, and styles [data-light-layer]. The canvas
 * covers the view plus a margin, positioned in page coordinates so it scrolls with
 * the page; it redraws only when the measured scene changes, or while off-frame
 * casters move.
 */
const MAX_CASTERS = 128;
const SETTLE_MS = 600;
const MOTION_MS = 33;
const MARGIN = 0.25;

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

float roundedDistance(vec2 q, vec2 b, float r) {
  vec2 d = abs(q) - b + r;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r;
}

float entry(vec2 q, vec2 u, vec2 b, float r) {
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

float shade(vec2 p, float jitter, out float occlusion) {
  float floorZ = 0.0;
  for (int i = 0; i < uCount; i++) {
    vec4 a = texelFetch(uBoxes, ivec2(i, 0), 0);
    vec4 b = texelFetch(uBoxes, ivec2(i, 1), 0);
    if (roundedDistance(p - a.xy, a.zw, b.x) <= 0.0) floorZ = max(floorZ, b.y);
  }
  vec2 light = vec2(sin(uAzimuth), -cos(uAzimuth));
  vec2 dirs[${SKY_BINS}];
  float sky[${SKY_BINS}];
  for (int k = 0; k < uBinCount; k++) {
    float phi = uAzimuth + uBins[k].x + jitter;
    dirs[k] = vec2(sin(phi), -cos(phi));
    sky[k] = 0.0;
  }
  occlusion = 0.0;
  for (int i = 0; i < uCount; i++) {
    vec4 a = texelFetch(uBoxes, ivec2(i, 0), 0);
    vec4 b = texelFetch(uBoxes, ivec2(i, 1), 0);
    float dz = b.y - floorZ;
    if (dz <= 0.0) continue;
    vec2 q = p - a.xy;
    float dist = max(roundedDistance(q, a.zw, b.x), 0.0);
    float dz2 = dz * dz;
    if (dz2 / (dz2 + dist * dist) <= uThreshold) continue;
    float away = length(q);
    bool around = away <= b.z;
    float cone = around ? 0.5 * PI : asin(b.z / away);
    occlusion = max(occlusion, (2.0 * cone / PI) * (1.0 - dist / sqrt(dist * dist + dz2)));
    if (uPoint) {
      float t = entry(q, light, a.zw, b.x);
      if (t >= 0.0) sky[0] = max(sky[0], dz2 / (dz2 + t * t));
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
      float t = entry(q, dirs[j], a.zw, b.x);
      if (t >= 0.0) sky[j] = max(sky[j], dz2 / (dz2 + t * t));
    }
  }
  if (uPoint) return sky[0] > uBins[0].y ? 1.0 : 0.0;
  float blocked = 0.0;
  for (int k = 0; k < uBinCount; k++) blocked += clamp(sky[k] - uBins[k].y, 0.0, uBins[k].z - uBins[k].y);
  return blocked * uInvTotal;
}

void main() {
  vec2 p = uOrigin + vec2(gl_FragCoord.x, uRows - gl_FragCoord.y) / uScale;
  float occlusion;
  float blocked;
  if (uPoint) {
    float o;
    float d = 0.25 / uScale;
    blocked = 0.0;
    occlusion = 0.0;
    for (int s = 0; s < 4; s++) {
      vec2 shift = vec2((s & 1) == 0 ? -d : d, (s & 2) == 0 ? -d : d);
      blocked += 0.25 * shade(p + shift, 0.0, o);
      occlusion += 0.25 * o;
    }
  } else {
    float noise = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
    blocked = shade(p, (noise - 0.5) * uStep, occlusion);
  }
  float alpha = uIntensity * blocked * (1.0 - uGlobal * (1.0 - min(occlusion, 1.0)));
  outColor = vec4(mix(vec3(1.0), uInk, alpha), 1.0);
}`;

const NAMES = ['uBoxes', 'uCount', 'uBins', 'uBinCount', 'uPoint', 'uWrap', 'uSpan', 'uStep', 'uInvTotal', 'uThreshold', 'uAzimuth', 'uIntensity', 'uGlobal', 'uInk', 'uOrigin', 'uScale', 'uRows'];

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

/**
 * Create the layer. `heights[level]` is the height of a surface whose selector element
 * carries data-elevation="level"; nested surfaces stand on their ancestors. Returns
 * { supported, update(settings, { visible, motion }), destroy(), stats }.
 */
export function createLightRenderer({ selector = '[data-elevation]', heights, ink = 'var(--light-shadow-ink)', maxScale = 1 } = {}) {
  if (!Array.isArray(heights)) throw new TypeError('heights must list the height of each elevation level.');
  const wrapper = document.createElement('div');
  wrapper.setAttribute('data-light-layer', '');
  wrapper.setAttribute('aria-hidden', 'true');
  wrapper.hidden = true;
  const canvas = document.createElement('canvas');
  const probe = document.createElement('span');
  probe.hidden = true;
  probe.style.color = ink;
  wrapper.append(canvas, probe);
  document.body.append(wrapper);

  let settings = null;
  let sky = null;
  let visible = false;
  let motion = false;
  let colour = [0, 0, 0];
  let version = 0;
  let lastKey = null;
  let region = null;
  let frame = 0;
  let activeUntil = 0;
  let lastDraw = 0;
  let lastTick = 0;
  let clock = 0;
  let lost = false;
  let listening = null;
  let glState = null;
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'low-power' });
  try {
    if (gl) glState = compile(gl);
  } catch (error) {
    console.warn('Long shadows are unavailable: the shadow shader failed.', error);
  }
  const stats = { casters: 0, draws: 0, width: 0, height: 0, scale: 1 };
  const renderer = { supported: Boolean(glState), update, destroy, stats };
  if (!glState) {
    wrapper.remove();
    return renderer;
  }

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

  function measure(now) {
    const root = document.documentElement;
    const origin = wrapper.getBoundingClientRect();
    const width = root.clientWidth;
    const view = { x: -origin.left, y: -origin.top, width, height: root.clientHeight };
    const height = Math.max(Math.ceil(document.body.getBoundingClientRect().bottom - origin.top), view.y + view.height);
    if (wrapper.style.width !== `${width}px`) wrapper.style.width = `${width}px`;
    if (wrapper.style.height !== `${height}px`) wrapper.style.height = `${height}px`;
    const pad = Math.ceil(view.height * MARGIN);
    const near = Math.ceil(view.height * MARGIN / 5);
    const stale = !region || region.width !== width || region.layer !== height
      || (view.y < region.top + near && region.top > 0)
      || (view.y + view.height > region.top + region.height - near && region.top + region.height < height);
    if (stale) {
      const top = Math.max(0, Math.floor(view.y - pad));
      region = { top, height: Math.max(1, Math.min(height, Math.ceil(view.y + view.height + pad)) - top), width, layer: height };
    }
    const reachable = (box) => {
      const dx = Math.max(view.x - (box.x + box.width), box.x - (view.x + width), 0);
      const dy = Math.max(region.top - (box.y + box.height), box.y - (region.top + region.height), 0);
      return Math.hypot(dx, dy) <= casterReach(box.z, sky);
    };
    const boxes = [];
    for (const el of document.querySelectorAll(selector)) {
      if (level(el) <= 0 || wrapper.contains(el)) continue;
      if (el.checkVisibility && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true, checkOpacity: true, checkVisibilityCSS: true })) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) continue;
      const box = { x: rect.left - origin.left, y: rect.top - origin.top, width: rect.width, height: rect.height, radius: parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0, z: heightOf(el) };
      if (reachable(box)) boxes.push(box);
    }
    const centre = [view.x + width / 2, view.y + view.height / 2];
    boxes.sort((a, b) => Math.hypot(a.x + a.width / 2 - centre[0], a.y + a.height / 2 - centre[1]) - Math.hypot(b.x + b.width / 2 - centre[0], b.y + b.height / 2 - centre[1]));
    const posts = settings.offFrame
      ? offFrameCasters({ width, height: view.height, azimuth: settings.azimuth, time: clock, speed: settings.speed }).map((box) => ({ ...box, x: box.x + view.x, y: box.y + view.y }))
      : [];
    const casters = [...posts, ...boxes].slice(0, MAX_CASTERS);
    const count = casters.length;
    const data = new Float32Array(Math.max(count, 1) * 8);
    casters.forEach((box, i) => {
      const bx = box.width / 2;
      const by = box.height / 2;
      data.set([box.x + bx, box.y + by, bx, by], i * 4);
      data.set([Math.min(Math.max(box.radius, 0), bx, by), box.z, Math.hypot(bx, by), 0], (count + i) * 4);
    });
    const key = [version, region.top, region.height, width, count, ...data].join(',');
    return { key, data, count, region, width };
  }

  function draw({ data, count, region: area, width }) {
    const scale = Math.min(window.devicePixelRatio || 1, maxScale);
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(area.height * scale));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    canvas.style.width = `${width}px`;
    canvas.style.height = `${area.height}px`;
    canvas.style.transform = `translate3d(0, ${area.top}px, 0)`;
    const { program, uniforms: u, texture, vao } = glState;
    gl.viewport(0, 0, w, h);
    gl.useProgram(program);
    gl.bindVertexArray(vao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, Math.max(count, 1), 2, 0, gl.RGBA, gl.FLOAT, data);
    const bins = new Float32Array(SKY_BINS * 4);
    sky.bins.forEach(({ angle, lo, hi }, k) => bins.set([angle, lo, hi, 0], k * 4));
    gl.uniform1i(u.uBoxes, 0);
    gl.uniform1i(u.uCount, count);
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
    gl.uniform2f(u.uOrigin, 0, area.top);
    gl.uniform1f(u.uScale, scale);
    gl.uniform1f(u.uRows, h);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    Object.assign(stats, { casters: count, draws: stats.draws + 1, width: w, height: h, scale });
  }

  function tick(now) {
    frame = 0;
    if (!visible || lost) return;
    const moving = motion && settings.offFrame;
    if (moving) clock += Math.min(0.1, Math.max(0, now - lastTick) / 1000);
    lastTick = now;
    if (!moving || now < activeUntil || now - lastDraw >= MOTION_MS) {
      const scene = measure(now);
      if (scene.key !== lastKey) {
        draw(scene);
        lastKey = scene.key;
        lastDraw = now;
      }
    }
    if (moving || now < activeUntil) schedule();
  }

  function listen() {
    if (listening) return;
    listening = new AbortController();
    const options = { passive: true, capture: true, signal: listening.signal };
    for (const type of ['scroll', 'resize', 'pointerover', 'pointerout', 'pointerdown', 'pointerup', 'focusin', 'focusout', 'transitionrun', 'transitionend', 'animationstart', 'animationend', 'load']) {
      window.addEventListener(type, poke, options);
    }
    const scheme = matchMedia('(prefers-color-scheme: dark)');
    scheme.addEventListener('change', () => { readInk(); poke(); }, { signal: listening.signal });
    const resize = new ResizeObserver(poke);
    resize.observe(document.body);
    const mutations = new MutationObserver((records) => {
      if (records.some(({ target }) => !wrapper.contains(target))) poke();
    });
    mutations.observe(document.body, { subtree: true, childList: true, attributes: true });
    const theme = new MutationObserver(() => { readInk(); poke(); });
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-scheme', 'data-theme', 'style'] });
    listening.signal.addEventListener('abort', () => {
      resize.disconnect();
      mutations.disconnect();
      theme.disconnect();
    });
    document.fonts?.ready.then(poke);
  }

  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    lost = true;
    cancelAnimationFrame(frame);
    frame = 0;
  });
  canvas.addEventListener('webglcontextrestored', () => {
    try {
      glState = compile(gl);
      lost = false;
      lastKey = null;
      poke();
    } catch (error) {
      console.warn('Long shadows could not be restored.', error);
    }
  });

  function update(next, { visible: show = true, motion: moving = false } = {}) {
    if (!glState) return;
    settings = next;
    sky = sourceBins(next);
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
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    wrapper.remove();
  }

  return renderer;
}
