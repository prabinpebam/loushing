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
  { key: 'altitude', label: 'Light elevation', min: 0, max: 85, step: 1, unit: '°', value: 6 },
  { key: 'sourceSize', label: 'Light source size', min: 0, max: 120, step: 1, unit: '°', value: 14 },
  { key: 'globalIllumination', label: 'Global illumination', min: 0, max: 100, step: 1, unit: '%', value: 25 },
  { key: 'highlightIntensity', label: 'Highlight intensity', min: 0, max: 100, step: 1, unit: '%', value: 45 },
  { key: 'shadowIntensity', label: 'Shadow intensity', min: 0, max: 100, step: 1, unit: '%', value: 55 },
  { key: 'speed', label: 'Motion speed', min: 1, max: 10, step: 1, unit: '×', value: 2 },
];

export const LIGHT_DEFAULTS = Object.freeze({
  ...Object.fromEntries(LIGHT_CONTROLS.map(({ key, value }) => [key, value])),
  enabled: false, offFrame: true, animated: false,
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
/**
 * Off-frame casters: tall posts just beyond the edge of the view that faces the light,
 * fixed to the view. `offset` spreads them across it, `gap` sets how far beyond the
 * edge each stands, and drift moves each sideways on its own slow cycle.
 */
export const OFF_FRAME = Object.freeze({
  height: 1e4,
  drift: 80,
  cycle: 360,
  spread: 1.2,
  posts: Object.freeze([
    Object.freeze({ offset: -0.9, size: 40, gap: 60, period: 1, phase: 0 }),
    Object.freeze({ offset: -0.4, size: 140, gap: 240, period: 1.37, phase: 1.9 }),
    Object.freeze({ offset: 0.1, size: 28, gap: 40, period: 0.83, phase: 4.1 }),
    Object.freeze({ offset: 0.55, size: 90, gap: 160, period: 1.19, phase: 2.7 }),
    Object.freeze({ offset: 1, size: 56, gap: 100, period: 0.91, phase: 5.3 }),
  ]),
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
  return { cx: box.x + bx, cy: box.y + by, bx, by, r: Math.min(Math.max(box.radius || 0, 0), bx, by) };
};

/** Signed distance from a point to a rounded rectangle { x, y, width, height, radius }. */
export function boxDistance(px, py, box) {
  const { cx, cy, bx, by, r } = shape(box);
  const qx = Math.abs(px - cx) - bx + r;
  const qy = Math.abs(py - cy) - by + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

/**
 * Distance along the ray from (px, py) in unit direction (ux, uy) to where it enters a
 * rounded rectangle, or Infinity if it misses. A slab test finds the bounding-box
 * entry; if that lands in a corner square, the ray enters through the corner circle
 * or not at all, which is exact for the convex shape.
 */
export function rayEntry(px, py, ux, uy, box) {
  const { cx, cy, bx, by, r } = shape(box);
  const qx = px - cx;
  const qy = py - cy;
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
  let floor = 0;
  for (const box of boxes) if (boxDistance(px, py, box) <= 0) floor = Math.max(floor, box.z);
  const azimuth = settings.azimuth * RADIANS;
  const skyline = sky.bins.map(() => 0);
  let occlusion = 0;
  for (const box of boxes) {
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
  const blocked = sky.point
    ? Number(skyline[0] > sky.bins[0].lo)
    : sky.bins.reduce((sum, { lo, hi }, k) => sum + Math.min(Math.max(skyline[k] - lo, 0), hi - lo), 0) / sky.total;
  const fade = 1 - settings.globalIllumination / 100 * (1 - Math.min(1, occlusion));
  return { floor, blocked, occlusion, alpha: settings.shadowIntensity / 100 * blocked * fade };
}

/**
 * Off-frame casters for a view `width` x `height`, as blocks in view coordinates: tall
 * posts beyond the view's edge facing the light (always outside the view), drifting
 * sideways by up to OFF_FRAME.drift on cycles of OFF_FRAME.cycle / speed seconds.
 */
export function offFrameCasters({ width, height, azimuth, time = 0, speed = LIGHT_DEFAULTS.speed }) {
  if (![width, height, azimuth, time, speed].every(Number.isFinite) || width <= 0 || height <= 0 || speed <= 0) {
    throw new RangeError('Require a positive view size and speed, and finite azimuth and time.');
  }
  const angle = azimuth * RADIANS;
  const lx = Math.sin(angle);
  const ly = -Math.cos(angle);
  const reach = Math.abs(lx) * width / 2 + Math.abs(ly) * height / 2;
  const across = Math.abs(ly) * width / 2 + Math.abs(lx) * height / 2;
  return OFF_FRAME.posts.map(({ offset, size, gap, period, phase }) => {
    const along = reach + (Math.abs(lx) + Math.abs(ly)) * size / 2 + gap;
    const side = offset * OFF_FRAME.spread * across + OFF_FRAME.drift * Math.sin(2 * Math.PI * time * speed / (OFF_FRAME.cycle * period) + phase);
    const cx = width / 2 + lx * along - ly * side;
    const cy = height / 2 + ly * along + lx * side;
    return { x: cx - size / 2, y: cy - size / 2, width: size, height: size, radius: 0, z: OFF_FRAME.height };
  });
}

const number = (n) => String(Math.abs(n) < 0.0005 ? 0 : Number(n.toFixed(3)));

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
