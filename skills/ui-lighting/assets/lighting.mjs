/**
 * Portable lighting geometry and settings. No DOM, framework or product imports.
 * Lengths share one unit; the renderer uses CSS px. The light is a distant source
 * (like the sun or a sky window) seen at an angular diameter. Azimuth locates it
 * clockwise from north: 0 north, 90 east, 180 south, 270 west; screen y points down.
 * Altitude is its elevation above the receiving plane.
 *
 * Raised surfaces are blocks standing on the plane. A point is lit by the part of
 * the source that no block hides. Blocks are combined by their skyline, the highest
 * elevation any of them hides in each direction, so shadows from one light never
 * darken each other where they overlap.
 */
export const LIGHT_CONTROLS = [
  { key: 'azimuth', label: 'Light direction', min: 0, max: 359, step: 1, unit: '°', value: 315 },
  { key: 'altitude', label: 'Light elevation', min: 0, max: 85, step: 1, unit: '°', value: 0 },
  { key: 'sourceSize', label: 'Light source size', min: 0, max: 120, step: 1, unit: '°', value: 9 },
  { key: 'globalIllumination', label: 'Global illumination', min: 0, max: 100, step: 1, unit: '%', value: 30 },
  { key: 'bounce', label: 'Bounced light', min: 0, max: 200, step: 1, unit: '%', value: 100 },
  { key: 'highlightIntensity', label: 'Highlight intensity', min: 0, max: 100, step: 1, unit: '%', value: 15 },
  { key: 'shadowIntensity', label: 'Shadow intensity', min: 0, max: 100, step: 1, unit: '%', value: 33 },
  { key: 'goboDistance', label: 'Gobo distance', min: 0, max: 600, step: 10, unit: 'px', value: 50 },
  { key: 'speed', label: 'Motion speed', min: 1, max: 10, step: 1, unit: '×', value: 5 },
];

/**
 * Gobos: masks held in the light between it and the page, like a stage light's gobo
 * or a tree between the sun and a wall. Dark, opaque pixels block the light; light or
 * transparent pixels let it through. The image stands with its bottom edge beyond the
 * view's light-facing edge and its top toward the shadow side. `root` is the share of
 * the image kept beyond that edge, and `reach` how far into the view, as a share of
 * the view's extent along the light, its top falls when the light is lowest. `file`
 * is the host's path for the mask; the renderer takes its URL as an option.
 */
export const GOBOS = Object.freeze({
  palm: Object.freeze({ label: 'Palm', file: 'gobos/palm.png', root: 0.15, reach: 0.8 }),
});
/** Off-frame shadows come from moving objects ('none') or one of the GOBOS. */
export const GOBO_CHOICES = Object.freeze(['none', ...Object.keys(GOBOS)]);
/**
 * A gobo's image lands on the page stretched along the light by 1 / sin(altitude),
 * capped here so a light at the horizon still frames it.
 */
export const GOBO_STRETCH = 3;
/**
 * The most an off-frame shadow's lift (see offFrameStep) can be, per px of height:
 * cot(2.4°), for a point light at the horizon, whose shadows never end.
 */
export const OFF_FRAME_LIFT = 24;

export const LIGHT_DEFAULTS = Object.freeze({
  ...Object.fromEntries(LIGHT_CONTROLS.map(({ key, value }) => [key, value])),
  enabled: false, offFrame: true, animated: true, gobo: 'none',
  highlightTint: '#ffdfb3', shadowTint: '#294573',
});

/**
 * Settings schema. 1 measured sourceSize in px; 2 used global illumination for a
 * halo and an even fade; 3 uses it only to lighten shadows away from their casters.
 */
export const LIGHT_SCHEMA = 3;
/** Settings each older schema used differently, reset to defaults on upgrade. */
const SCHEMA_RESETS = Object.freeze({ 1: ['sourceSize', 'globalIllumination'], 2: ['globalIllumination'] });
export const LIGHT_LEVELS = Object.freeze([0, 2, 6, 12, 24]);
/** Azimuth samples across the source; each covers its full elevation range exactly. */
export const SKY_BINS = 32;
/** Darkness, as a share of the source, a skipped far-away caster may leave out (under 1/255). */
export const CULL_SHARE = 0.002;
/** Each lit wall is cut into up to this many strips along its length, each with its own light. */
export const WALL_SEGMENTS = 6;
/** Facets per rounded corner of a block's walls. */
export const ARC_STEPS = 3;
/** A wall gets a strip for about every this many px of its length, at least one. */
const STRIP_LENGTH = 24;
/** Azimuth bins used to find how much of the source reaches a wall. */
export const WALL_BINS = 8;
/** Heights, as shares of the wall, where a strip's light is sampled and averaged. */
const WALL_HEIGHTS = Object.freeze([0.25, 0.75]);
/** Bounced light under this share of full light is left out (under half of 1/255). */
export const BOUNCE_CULL = 1 / 512;
/** A small seeded generator, so the off-frame objects are the same on every page. */
function seeded(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Off-frame casters: tall square posts beyond the edge of the view that faces the
 * light, fixed to the view. Each is its own object with its own `size`, `speed` (a
 * factor on the shared pace), `direction` across the light (1 or -1) and path: it
 * moves from `gap[0]` to `gap[1]` beyond the edge, so it slants toward or away from
 * the view. Each enters from beyond one side, sweeps its shadow across the view and
 * leaves past the other side. Their timing overlaps so that one is always crossing:
 * an object counts as crossing while its centre line is within `show` of the view's
 * half-width across the light, and each starts crossing at `stagger` (a share) of the
 * previous one's crossing, before it ends. The `count` objects then repeat.
 * `pace` is the travel in px per second at speed 1. `spread` caps the source's
 * half-width used to clear the view, since penumbra beyond it is too faint to see.
 */
export const OFF_FRAME = (() => {
  const limits = { count: 32, size: [56, 168], gap: [40, 420], speed: [0.6, 1.5], stagger: [0.3, 0.75] };
  const random = seeded(0x10a5);
  const between = ([lo, hi]) => lo + (hi - lo) * random();
  const objects = Array.from({ length: limits.count }, () => Object.freeze({
    size: Math.round(between(limits.size)),
    speed: Number(between(limits.speed).toFixed(3)),
    direction: random() < 0.5 ? -1 : 1,
    gap: Object.freeze([Math.round(between(limits.gap)), Math.round(between(limits.gap))]),
    stagger: Number(between(limits.stagger).toFixed(3)),
  }));
  return Object.freeze({ height: 1e4, pace: 8, spread: 60, show: 0.5, ...limits, objects: Object.freeze(objects) });
})();
/** Corners a block's straight cut can remove, as the signs of that corner's x and y. */
export const CUT_CORNERS = Object.freeze({
  'top-left': Object.freeze([-1, -1]),
  'top-right': Object.freeze([1, -1]),
  'bottom-right': Object.freeze([1, 1]),
  'bottom-left': Object.freeze([-1, 1]),
});

const RADIANS = Math.PI / 180;

/** Reject invalid settings at the boundary, including malformed persisted values. */
export function validateLighting(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('Lighting settings must be an object.');
  for (const key of Object.keys(value)) {
    if (!Object.hasOwn(LIGHT_DEFAULTS, key)) throw new TypeError(`Unknown lighting setting: ${key}.`);
  }
  const settings = { ...LIGHT_DEFAULTS, ...value };
  for (const { key, min, max } of LIGHT_CONTROLS) {
    if (!Number.isFinite(settings[key]) || settings[key] < min || settings[key] > max) {
      throw new RangeError(`${key} must be between ${min} and ${max}.`);
    }
  }
  for (const key of ['enabled', 'offFrame', 'animated']) {
    if (typeof settings[key] !== 'boolean') throw new TypeError(`${key} must be true or false.`);
  }
  for (const key of ['highlightTint', 'shadowTint']) {
    if (typeof settings[key] !== 'string' || !/^#[\da-f]{6}$/i.test(settings[key])) throw new TypeError(`${key} must be a six-digit hex colour.`);
  }
  if (!GOBO_CHOICES.includes(settings.gobo)) throw new TypeError(`gobo must be one of ${GOBO_CHOICES.join(', ')}.`);
  return settings;
}

/** Settings saved under an older schema keep everything whose meaning is unchanged. */
export function upgradeLighting(value, version) {
  if (version === LIGHT_SCHEMA) return validateLighting(value);
  if (!Object.hasOwn(SCHEMA_RESETS, version)) throw new RangeError(`Unknown lighting schema: ${version}.`);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('Lighting settings must be an object.');
  const kept = { ...value };
  for (const key of SCHEMA_RESETS[version]) delete kept[key];
  return validateLighting(kept);
}

/**
 * Shadow of a point at `height` from a distant source of angular diameter
 * `sourceSize` centred at `altitude`: the central ray lands L = h / tan(a) away, and
 * the penumbra across the light direction is p = 2 h tan(theta/2) / sin(a). At
 * altitude 0 both are infinite. Along the light direction the penumbra is longer
 * and lopsided: rays from the top and bottom of the source land at h / tan(a ± theta/2).
 */
export function projectShadow({ height, azimuth, altitude, sourceSize }) {
  if (![height, azimuth, altitude, sourceSize].every(Number.isFinite)) throw new TypeError('Light geometry must be finite.');
  if (height < 0 || sourceSize < 0 || sourceSize >= 180 || altitude < 0 || altitude > 90) {
    throw new RangeError('Require height >= 0, 0 <= sourceSize < 180 and 0 <= altitude <= 90.');
  }
  const angle = azimuth * RADIANS;
  const length = !height || altitude === 90 ? 0 : altitude === 0 ? Infinity : height / Math.tan(altitude * RADIANS);
  const penumbra = !height || !sourceSize ? 0 : altitude === 0 ? Infinity : 2 * height * Math.tan(sourceSize * RADIANS / 2) / Math.sin(altitude * RADIANS);
  const along = (unit) => (Math.abs(unit) < 1e-12 ? 0 : unit * length);
  return { x: along(-Math.sin(angle)), y: along(Math.cos(angle)), length, penumbra };
}

/**
 * The source as azimuth bins. The source is a disc of angular radius theta/2 around
 * the light, clipped at the horizon and weighted by the cosine of incidence on a level
 * receiver, so the irradiance from elevation e grows as sin(e) cos(e) and a bin's
 * share between elevations e1 and e2 is proportional to sin^2(e2) - sin^2(e1). Each bin
 * stores `lo` and `hi`, those squared sines, at its centre `angle` (radians from the
 * light's azimuth). A point source is one bin that is either fully hidden or not.
 * `threshold` is the squared sine below which nothing visible is hidden: no part of the
 * source sits that low, or the loss is under CULL_SHARE.
 */
export function sourceBins({ altitude, sourceSize }, count = SKY_BINS) {
  if (!Number.isInteger(count) || count < 1) throw new RangeError('count must be a positive integer.');
  const a = altitude * RADIANS;
  const radius = sourceSize * RADIANS / 2;
  const sa = Math.sin(a);
  const ca = Math.cos(a);
  if (!radius) {
    const lo = sa * sa;
    return { point: true, wrap: false, span: 0, step: 0, bins: [{ angle: 0, lo, hi: lo }], total: 1, threshold: lo };
  }
  const cosRadius = Math.cos(radius);
  const wrap = a + radius >= Math.PI / 2;
  const span = wrap ? Math.PI : Math.acos(Math.min(1, Math.sqrt(Math.max(0, cosRadius ** 2 - sa * sa)) / ca));
  const step = 2 * span / count;
  const bins = Array.from({ length: count }, (_, k) => {
    const angle = -span + (k + 0.5) * step;
    const reach = Math.hypot(sa, ca * Math.cos(angle));
    if (reach <= cosRadius) return { angle, lo: 0, hi: 0 };
    const centre = Math.atan2(sa, ca * Math.cos(angle));
    const half = Math.acos(cosRadius / reach);
    const low = Math.max(0, centre - half);
    const high = Math.min(Math.PI / 2, centre + half);
    return high > low ? { angle, lo: Math.sin(low) ** 2, hi: Math.sin(high) ** 2 } : { angle, lo: 0, hi: 0 };
  });
  const lit = bins.filter(({ lo, hi }) => hi > lo);
  const total = lit.reduce((sum, { lo, hi }) => sum + hi - lo, 0);
  const threshold = Math.max(Math.min(...lit.map(({ lo }) => lo)), CULL_SHARE * total / count);
  return { point: false, wrap, span, step, bins, total, threshold };
}

/** How far a caster `z` above the receiver can visibly shade, for a given source. */
export function casterReach(z, { threshold }) {
  return threshold > 0 ? z * Math.sqrt(1 / threshold - 1) : Infinity;
}

const shape = (box) => {
  const bx = box.width / 2;
  const by = box.height / 2;
  const size = Math.min(Math.max(box.cut?.size || 0, 0), 2 * bx, 2 * by);
  const [sx, sy] = size ? CUT_CORNERS[box.cut.corner ?? 'top-right'] ?? [] : [];
  if (size && sx === undefined) throw new RangeError(`Unknown cut corner: ${box.cut.corner}.`);
  return { cx: box.x + bx, cy: box.y + by, bx, by, r: Math.min(Math.max(box.radius || 0, 0), bx, by), cut: size ? { size, sx, sy } : null };
};

const roundedDistance = (qx, qy, bx, by, r) => {
  const dx = Math.abs(qx) - bx + r;
  const dy = Math.abs(qy) - by + r;
  return Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0) - r;
};

/**
 * Signed distance to the cut's line, positive on the removed side. The cut joins the
 * points `size` from its corner along both edges, so it is a half-plane whose normal
 * points into that corner: (sx (x - Kx) + sy (y - Ky) + size) / sqrt 2, K the corner.
 */
const cutDistance = (qx, qy, bx, by, { size, sx, sy }) => (sx * (qx - sx * bx) + sy * (qy - sy * by) + size) / Math.SQRT2;

/**
 * Signed distance from a point to a rounded rectangle { x, y, width, height, radius },
 * optionally with one corner cut straight across by `cut: { size, corner }`. With a
 * cut it is the larger of the two distances: exact on the boundary and inside, a lower
 * bound outside, which is what the receiver and reach tests need.
 */
export function boxDistance(px, py, box) {
  const { cx, cy, bx, by, r, cut } = shape(box);
  const d = roundedDistance(px - cx, py - cy, bx, by, r);
  return cut ? Math.max(d, cutDistance(px - cx, py - cy, bx, by, cut)) : d;
}

/**
 * Distance along the ray from (px, py) in unit direction (ux, uy) to where it enters a
 * rounded rectangle, or Infinity if it misses. A slab test finds the bounding-box
 * entry; if that lands in a corner square, the ray enters through the corner circle
 * or not at all, which is exact for the convex shape. A cut corner leaves a convex
 * shape too: the ray enters where it enters the rectangle, if that point is on the
 * kept side of the cut, and otherwise where it crosses the cut, if that is inside.
 */
export function rayEntry(px, py, ux, uy, box) {
  const { cx, cy, bx, by, r, cut } = shape(box);
  const qx = px - cx;
  const qy = py - cy;
  const enter = roundedEntry(qx, qy, ux, uy, bx, by, r);
  if (!cut || enter === Infinity) return enter;
  const eps = 1e-6 * (1 + bx + by);
  if (cutDistance(qx + ux * enter, qy + uy * enter, bx, by, cut) <= eps) return enter;
  const rate = (cut.sx * ux + cut.sy * uy) / Math.SQRT2;
  if (rate >= 0) return Infinity;
  const t = -cutDistance(qx, qy, bx, by, cut) / rate;
  return t >= 0 && roundedDistance(qx + ux * t, qy + uy * t, bx, by, r) <= eps ? t : Infinity;
}

function roundedEntry(qx, qy, ux, uy, bx, by, r) {
  const sx = ux >= 0 ? Math.max(ux, 1e-9) : ux;
  const sy = uy >= 0 ? Math.max(uy, 1e-9) : uy;
  const ax = (-bx - qx) / sx;
  const bxT = (bx - qx) / sx;
  const ay = (-by - qy) / sy;
  const byT = (by - qy) / sy;
  const enter = Math.max(Math.min(ax, bxT), Math.min(ay, byT), 0);
  const exit = Math.min(Math.max(ax, bxT), Math.max(ay, byT));
  if (exit < enter) return Infinity;
  const kx = bx - r;
  const ky = by - r;
  const ex = qx + ux * enter;
  const ey = qy + uy * enter;
  if (r <= 0 || Math.abs(ex) <= kx || Math.abs(ey) <= ky) return enter;
  const mx = qx - Math.sign(ex) * kx;
  const my = qy - Math.sign(ey) * ky;
  const b = mx * ux + my * uy;
  const c = mx * mx + my * my - r * r;
  if (c <= 0) return enter;
  const disc = b * b - c;
  if (disc < 0) return Infinity;
  const t = -b - Math.sqrt(disc);
  return t < 0 ? Infinity : Math.max(t, enter);
}

/**
 * Sky hidden near a block `z` above the receiver, `distance` from its footprint, whose
 * footprint spans `angle` radians as seen from the point: (angle / pi)(1 - d / sqrt(d^2 + z^2)).
 * 1 at contact with a long block; it falls with distance and narrower blocks.
 */
export function skyOcclusion(distance, z, angle = Math.PI) {
  if (![distance, z, angle].every(Number.isFinite) || distance < 0 || z < 0 || angle < 0) throw new RangeError('Require finite distance, z and angle >= 0.');
  if (!z) return 0;
  return Math.min(1, angle / Math.PI) * (1 - distance / Math.hypot(distance, z));
}

/**
 * The shadow at a receiver point from blocks { x, y, width, height, radius, z }. This is
 * the reference the renderer's shader mirrors. The receiver is the tallest block that
 * contains the point; only taller blocks shade it. In each azimuth bin a block hides
 * the elevations up to atan(dz / entry), where entry is how far the ground ray travels
 * before reaching the block; the union of blocks is the highest of these, never a sum.
 * `blocked` is the share of the source hidden (cosine-weighted). `occlusion` is the
 * sky hidden by the nearest tall block, which keeps a shadow dark where global
 * illumination can't reach. `alpha` = intensity x blocked x (1 - g (1 - occlusion)),
 * so lit points stay unshaded and g = 0 leaves the shadow unfaded. `offset` places the
 * sample within each bin, from 0 to 1; the shader varies it per pixel.
 */
export function shadowAt([px, py], boxes, value, { offset = 0.5, count = SKY_BINS } = {}) {
  const settings = validateLighting(value);
  const sky = sourceBins(settings, count);
  const floor = floorAt(px, py, boxes);
  const { blocked, occlusion } = hiddenShare(px, py, floor, boxes, sky, settings.azimuth * RADIANS, offset);
  const fade = 1 - settings.globalIllumination / 100 * (1 - Math.min(1, occlusion));
  return { floor, blocked, occlusion, alpha: settings.shadowIntensity / 100 * blocked * fade };
}

/** The top of the tallest block containing the point, or 0 on the ground. */
function floorAt(px, py, boxes) {
  let floor = 0;
  for (const box of boxes) if (boxDistance(px, py, box) <= 0) floor = Math.max(floor, box.z);
  return floor;
}

/**
 * The share of the source hidden from a point at height `floor`, and the sky hidden by
 * the nearest taller block. `skip` leaves one block out (a wall's own block).
 * `vertical` weights the source for a vertical receiver facing the light, cos^2(e)
 * per elevation e, instead of sin(e) cos(e) for a level one.
 */
function hiddenShare(px, py, floor, boxes, sky, azimuth, offset, { skip = null, vertical = false } = {}) {
  const skyline = sky.bins.map(() => 0);
  let occlusion = 0;
  for (const box of boxes) {
    if (box === skip) continue;
    const dz = box.z - floor;
    if (dz <= 0) continue;
    const distance = Math.max(0, boxDistance(px, py, box));
    if (dz * dz / (dz * dz + distance * distance) <= sky.threshold) continue;
    const spread = Math.hypot(box.width, box.height) / 2;
    const away = Math.hypot(box.x + box.width / 2 - px, box.y + box.height / 2 - py);
    occlusion = Math.max(occlusion, skyOcclusion(distance, dz, away > spread ? 2 * Math.asin(spread / away) : Math.PI));
    sky.bins.forEach(({ angle }, k) => {
      const phi = azimuth + angle + (offset - 0.5) * sky.step;
      const t = rayEntry(px, py, Math.sin(phi), -Math.cos(phi), box);
      if (t !== Infinity) skyline[k] = Math.max(skyline[k], dz * dz / (dz * dz + t * t));
    });
  }
  if (sky.point) return { blocked: Number(skyline[0] > sky.bins[0].lo), occlusion };
  if (!vertical) {
    return { blocked: sky.bins.reduce((sum, { lo, hi }, k) => sum + Math.min(Math.max(skyline[k] - lo, 0), hi - lo), 0) / sky.total, occlusion };
  }
  // Squared sines back to elevations; a vertical receiver gains e/2 + sin(2e)/4.
  const gain = (s2) => {
    const e = Math.asin(Math.sqrt(Math.min(Math.max(s2, 0), 1)));
    return e / 2 + Math.sin(2 * e) / 4;
  };
  let hidden = 0;
  let total = 0;
  sky.bins.forEach(({ lo, hi }, k) => {
    if (hi <= lo) return;
    total += gain(hi) - gain(lo);
    hidden += gain(Math.min(Math.max(skyline[k], lo), hi)) - gain(lo);
  });
  return { blocked: total > 0 ? hidden / total : 0, occlusion };
}

/**
 * The walls of a block as ground segments [a, b], clockwise on screen (y down), so
 * each faces outward along (dy, -dx). Rounded corners become ARC_STEPS facets each; a
 * cut corner is cut straight across instead, adding its diagonal wall.
 */
export function wallFaces(box) {
  const { x, y, width, height } = box;
  const r = Math.min(Math.max(box.radius || 0, 0), width / 2, height / 2);
  const corners = [[x, y], [x + width, y], [x + width, y + height], [x, y + height]];
  const names = ['top-left', 'top-right', 'bottom-right', 'bottom-left'];
  const size = Math.min(Math.max(box.cut?.size || 0, 0), width, height);
  const cut = size ? names.indexOf(box.cut.corner ?? 'top-right') : -1;
  if (size && cut < 0) throw new RangeError(`Unknown cut corner: ${box.cut.corner}.`);
  const points = [];
  corners.forEach((corner, k) => {
    if (k === cut) {
      for (const other of [corners[(k + 3) % 4], corners[(k + 1) % 4]]) {
        const length = Math.hypot(other[0] - corner[0], other[1] - corner[1]);
        points.push([corner[0] + (other[0] - corner[0]) * size / length, corner[1] + (other[1] - corner[1]) * size / length]);
      }
      return;
    }
    if (r <= 0) {
      points.push(corner);
      return;
    }
    // Arc centre inside the corner; the arc turns a quarter clockwise from angle k pi/2 + pi.
    const cx = corner[0] + (k === 0 || k === 3 ? r : -r);
    const cy = corner[1] + (k < 2 ? r : -r);
    for (let s = 0; s <= ARC_STEPS; s++) {
      const angle = Math.PI + (k + s / ARC_STEPS) * Math.PI / 2;
      points.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
    }
  });
  return points
    .map((point, k) => [point, points[(k + 1) % points.length]])
    .filter(([a, b]) => Math.hypot(b[0] - a[0], b[1] - a[1]) > 1e-9);
}

/**
 * Light falling on each block's walls, as strips { a, b, light } along every wall that
 * faces the light; `light` is the irradiance as a share of full light square-on:
 * cos(altitude) (n . l) times the share of the source no other block hides, averaged
 * over two heights up the wall. A wall in another block's shadow gets none, and so
 * bounces none. Blocks may set `base`, the height their walls stand on (default 0).
 * Off-frame posts (`post`) only cast shadows. `only(box, i)` may limit which blocks'
 * walls are lit; every block still shades the rest. Returns one list per block.
 */
export function litWalls(boxes, value, { segments = WALL_SEGMENTS, count = WALL_BINS, only = null } = {}) {
  const settings = validateLighting(value);
  const sky = sourceBins(settings, count);
  const azimuth = settings.azimuth * RADIANS;
  const lx = Math.sin(azimuth);
  const ly = -Math.cos(azimuth);
  const square = Math.cos(settings.altitude * RADIANS);
  return boxes.map((box, i) => {
    const base = box.base ?? 0;
    if (box.post || box.z <= base || (only && !only(box, i))) return [];
    const strips = [];
    for (const [a, b] of wallFaces(box)) {
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const length = Math.hypot(dx, dy);
      if (length < 1e-9) continue;
      const nx = dy / length;
      const ny = -dx / length;
      const facing = square * (nx * lx + ny * ly);
      if (facing <= 1e-9) continue;
      const parts = Math.max(1, Math.min(segments, Math.round(length / STRIP_LENGTH)));
      for (let s = 0; s < parts; s++) {
        const mid = (s + 0.5) / parts;
        const px = a[0] + dx * mid + nx * 1e-3;
        const py = a[1] + dy * mid + ny * 1e-3;
        const seen = WALL_HEIGHTS.reduce((sum, share) => sum + 1 - hiddenShare(px, py, base + (box.z - base) * share, boxes, sky, azimuth, 0.5, { skip: box, vertical: true }).blocked, 0);
        strips.push({
          a: [a[0] + dx * s / parts, a[1] + dy * s / parts],
          b: [a[0] + dx * (s + 1) / parts, a[1] + dy * (s + 1) / parts],
          light: facing * seen / WALL_HEIGHTS.length,
        });
      }
    }
    return strips;
  });
}

/**
 * The form factor from a point on a level receiver to a vertical wall strip standing
 * on the ground segment [a, b], from `lo` to `hi` above the receiver: the share of a
 * diffuse wall's light that reaches the point, the inverse-square law integrated over
 * the strip. By Lambert's polygon formula only the strip's two level edges count:
 * F = (G(lo) - G(hi)) / 2 pi, G(h) = gamma(h) |c| / sqrt(h^2 |b - a|^2 + c^2), with
 * gamma(h) the angle the edge at height h subtends and c the cross product of the
 * ground offsets to a and b. 0 behind the wall. For a long wall at distance d with
 * lo = 0 it is (1 - d / sqrt(d^2 + hi^2)) / 2.
 */
export function wallFormFactor([px, py], a, b, lo, hi) {
  const ax = a[0] - px;
  const ay = a[1] - py;
  const bx = b[0] - px;
  const by = b[1] - py;
  const cross = ax * by - ay * bx;
  if (cross >= -1e-9 || hi <= lo) return 0;
  const length2 = (bx - ax) ** 2 + (by - ay) ** 2;
  const edge = (h) => {
    const h2 = h * h;
    const cos = (ax * bx + ay * by + h2) / Math.sqrt((ax * ax + ay * ay + h2) * (bx * bx + by * by + h2));
    return Math.acos(Math.min(1, Math.max(-1, cos))) * -cross / Math.sqrt(h2 * length2 + cross * cross);
  };
  return Math.max(0, edge(Math.max(lo, 0)) - edge(hi)) / (2 * Math.PI);
}

/** How far from a wall `height` tall its bounce stays above BOUNCE_CULL, at `strength`. */
export function bounceReach(height, strength) {
  return strength > 0 && height > 0 ? height * Math.sqrt(strength / (4 * BOUNCE_CULL)) : 0;
}

/** sRGB channels in 0..1 to linear reflectance. */
export function linearColour(channels) {
  return channels.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
}

/**
 * Light bounced onto a level point by lit walls, as linear RGB in shares of full
 * light. Each wall reflects diffusely in its block's `albedo` (linear RGB, default
 * white): bounce x albedo x light x form factor, summed over the walls of every block
 * taller than the point's floor. `walls` is litWalls' result for the same blocks.
 * Bounce isn't blocked by other blocks on its way, nor bounced again.
 */
export function bounceAt([px, py], boxes, walls, value) {
  const settings = validateLighting(value);
  const floor = floorAt(px, py, boxes);
  const sum = [0, 0, 0];
  boxes.forEach((box, i) => {
    if (box.z <= floor) return;
    const lo = Math.max(box.base ?? 0, floor) - floor;
    const albedo = box.albedo ?? [1, 1, 1];
    for (const { a, b, light } of walls[i] ?? []) {
      const share = light * wallFormFactor([px, py], a, b, lo, box.z - floor);
      for (let c = 0; c < 3; c++) sum[c] += albedo[c] * share;
    }
  });
  return sum.map((v) => v * settings.bounce / 100);
}

/**
 * Off-frame casters for a view `width` x `height`, as blocks in view coordinates: the
 * OFF_FRAME objects in flight after the shared conveyor has moved `travel` px (each
 * object moves `speed` times that). Objects always stand outside the view, between it
 * and the light. Each enters and leaves where its shadow, widened by the source's
 * spread over the view's depth, clears the view. At travel 0 the first object is
 * centred, and at every travel at least one object is crossing the view's middle.
 */
export function offFrameCasters({ width, height, azimuth, altitude = LIGHT_DEFAULTS.altitude, sourceSize = LIGHT_DEFAULTS.sourceSize, travel = 0 }) {
  if (![width, height, azimuth, altitude, sourceSize, travel].every(Number.isFinite) || width <= 0 || height <= 0) {
    throw new RangeError('Require a positive view size, and finite azimuth, light and travel.');
  }
  const angle = azimuth * RADIANS;
  const lx = Math.sin(angle);
  const ly = -Math.cos(angle);
  const square = Math.abs(lx) + Math.abs(ly);
  const reach = Math.abs(lx) * width / 2 + Math.abs(ly) * height / 2;
  const across = Math.abs(ly) * width / 2 + Math.abs(lx) * height / 2;
  const widen = Math.tan(Math.min(sourceBins({ altitude, sourceSize }, 1).span, OFF_FRAME.spread * RADIANS));
  const show = OFF_FRAME.show * across;
  // Each object's half-range from clear to clear, and when (in shared travel) it
  // enters and leaves. Each starts crossing part-way through the previous crossing.
  let start = 0;
  const plan = OFF_FRAME.objects.map((object, k) => {
    const half = square * object.size / 2;
    const range = across + half + (2 * reach + Math.max(...object.gap) + square * object.size) * widen;
    const crossing = 2 * show / object.speed;
    if (k === 0) start = -crossing / 2;
    const entry = start - (range - show) / object.speed;
    const step = { object, half, range, entry, exit: entry + 2 * range / object.speed };
    start += object.stagger * crossing;
    return step;
  });
  const first = -show / plan[0].object.speed;
  const cycle = start - first;
  const now = first + (((travel - first) % cycle) + cycle) % cycle;
  const longest = Math.max(...plan.map(({ entry, exit }) => exit - entry));
  const boxes = [];
  for (let k = -Math.ceil(longest / cycle); k <= 1; k++) {
    plan.forEach(({ object, half, range, entry, exit }, index) => {
      if (now < entry + k * cycle || now >= exit + k * cycle) return;
      const moved = (now - entry - k * cycle) * object.speed;
      const side = object.direction * (moved - range);
      const gap = object.gap[0] + (object.gap[1] - object.gap[0]) * moved / (2 * range);
      const out = reach + half + gap;
      const cx = width / 2 + lx * out - ly * side;
      const cy = height / 2 + ly * out + lx * side;
      const { size } = object;
      boxes.push({ x: cx - size / 2, y: cy - size / 2, width: size, height: size, radius: 0, z: OFF_FRAME.height, object: index });
    });
  }
  return boxes;
}

/**
 * Where a gobo's image falls on a view `width` x `height`, as the shader samples it.
 * The mask is held across the light's rays `distance` px from the page, so its shadow
 * is the image stretched along the light by 1 / sin(altitude) (up to GOBO_STRETCH).
 * Returned, in view px: `base`, the middle of the image's bottom edge, beyond the
 * light-facing edge; `across`, the unit vector along the image's rows (its columns run
 * along the light, from the base toward the shadow side); `unit`, px per image pixel
 * before the stretch; `stretch`; and `blur`, the penumbra radius in image pixels per
 * px between the mask and the page, along the rays: tan(sourceSize / 2) / unit, 0 for
 * a point light. The blur is the same on every surface, raised or not. On a raised
 * surface the pattern moves sideways by offFrameStep.
 * The size of the image on the page depends on the view, not on the light, so a
 * higher light shortens the pattern as it shortens every shadow.
 */
export function goboProjection({ width, height, azimuth, altitude = LIGHT_DEFAULTS.altitude, sourceSize = LIGHT_DEFAULTS.sourceSize, image, gobo }) {
  if (![width, height, azimuth, altitude, sourceSize].every(Number.isFinite) || width <= 0 || height <= 0) {
    throw new RangeError('Require a positive view size, and finite azimuth and light.');
  }
  if (!image || !(image.width > 0) || !(image.height > 0)) throw new RangeError('Require the gobo image size.');
  const frame = typeof gobo === 'string' ? GOBOS[gobo] : gobo;
  if (!frame) throw new TypeError(`Unknown gobo: ${gobo}.`);
  const angle = azimuth * RADIANS;
  const along = [-Math.sin(angle), Math.cos(angle)];
  const across = [Math.cos(angle), Math.sin(angle)];
  const extent = Math.abs(width * along[0]) + Math.abs(height * along[1]);
  const sine = Math.sin(Math.min(Math.max(altitude, 0), 90) * RADIANS);
  const stretch = sine * GOBO_STRETCH > 1 ? 1 / sine : GOBO_STRETCH;
  const unit = frame.reach * extent / ((1 - frame.root) * GOBO_STRETCH * image.height);
  const back = extent / 2 + frame.root * unit * image.height * stretch;
  const base = [width / 2 - along[0] * back, height / 2 - along[1] * back];
  const blur = sourceSize > 0 ? Math.tan(sourceSize * RADIANS / 2) / unit : 0;
  return { base, across, unit, stretch, blur };
}

/**
 * How an off-frame shadow (moving objects or a gobo) moves on a surface raised above
 * the page, per px of height: the whole shadow, unchanged in size and blur, slides
 * sideways, to the left or right of the light, by lift x sin(2 azimuth) / 2. With the
 * light along either axis of the view (0, 90, 180 or 270 degrees) it does not move.
 * `lift` is how far beyond a raised surface its own shadow is half dark, per px of
 * height (see halfShadow), so the step grows as every shadow lengthens. Returns
 * { lift, step }, `step` the [x, y] offset in px per px of height.
 */
export function offFrameStep({ azimuth, altitude = LIGHT_DEFAULTS.altitude, sourceSize = LIGHT_DEFAULTS.sourceSize }) {
  if (![azimuth, altitude, sourceSize].every(Number.isFinite)) throw new RangeError('Require a finite azimuth and light.');
  const lift = halfShadow({ altitude: Math.min(Math.max(altitude, 0), 90), sourceSize: Math.min(Math.max(sourceSize, 0), 179) });
  const angle = azimuth * RADIANS;
  const lx = Math.sin(angle);
  const ly = -Math.cos(angle);
  const k = lift * lx * ly;
  const step = [k * ly, -k * lx].map((v) => (Math.abs(v) < 1e-12 ? 0 : v));
  return { lift, step };
}

const number = (n) => String(Math.abs(n) < 0.0005 ? 0 : Number(n.toFixed(3)));

/**
 * How far beyond a long wall facing the light, per px of its height, its shadow is half
 * dark: the distance r at which half the source sits below the wall's top. A bin at
 * angle a from the light meets the wall r / cos(a) away. Capped at OFF_FRAME_LIFT.
 */
function halfShadow(sky) {
  const { point, bins, total } = sourceBins(sky);
  if (point) return bins[0].lo > 0 ? Math.min(Math.sqrt(1 / bins[0].lo - 1), OFF_FRAME_LIFT) : OFF_FRAME_LIFT;
  const hidden = (r) => bins.reduce((sum, { angle, lo, hi }) => {
    const c = Math.cos(angle);
    if (c <= 0) return sum;
    return sum + Math.min(Math.max(1 / (1 + (r / c) ** 2) - lo, 0), hi - lo);
  }, 0) / total;
  if (hidden(OFF_FRAME_LIFT) >= 0.5) return OFF_FRAME_LIFT;
  if (hidden(0) <= 0.5) return 0;
  let [a, b] = [0, OFF_FRAME_LIFT];
  for (let k = 0; k < 40; k++) {
    const m = (a + b) / 2;
    if (hidden(m) > 0.5) a = m;
    else b = m;
  }
  return (a + b) / 2;
}

/**
 * Custom properties for the CSS side: tints, intensities and the directional rims
 * every lit surface draws (highlight on the side facing the light, shade opposite).
 * Cast shadows are drawn by the renderer, not by CSS.
 */
export function lightingProperties(value) {
  const settings = validateLighting(value);
  const angle = settings.azimuth * RADIANS;
  const rimX = -Math.sin(angle);
  const rimY = Math.cos(angle);
  return {
    '--data-light-highlight-tint': settings.highlightTint,
    '--data-light-shadow-tint': settings.shadowTint,
    '--data-light-highlight': `${number(settings.highlightIntensity)}%`,
    '--data-light-intensity': `${number(settings.shadowIntensity)}%`,
    '--data-light-rim': `inset ${number(rimX)}px ${number(rimY)}px 0 var(--light-highlight), inset ${number(-rimX)}px ${number(-rimY)}px 0 var(--light-edge-shadow)`,
  };
}

/** Animation is independently switchable and never overrides the OS motion request. */
export function lightingMotion(settings, { reducedMotion = false, hidden = false } = {}) {
  return settings.enabled && settings.offFrame && settings.animated && !reducedMotion && !hidden;
}
