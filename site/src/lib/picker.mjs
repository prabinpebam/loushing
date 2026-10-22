/**
 * Chopper's moment picker. Tier 0: pure, unit-tested, runs in the browser.
 * See docs/design/chopper.md#how-a-moment-is-chosen.
 *
 * pickMoments(zones, library, visit, hour, seed) -> { moments, visit }
 *   zones    the layout's zones on this page, top to bottom:
 *            [{ id, top, viewportHeight, available, sizes }] where `available` is false when the
 *            zone is below its minimum width, and `sizes` (optional) lists the size classes
 *            it takes at this width, extra sizes first (see zoneSizes)
 *   library  design/chopper/scenes.json
 *   visit    this visit's state: { thread, beat, history, told, review }
 *            review is optional: { scene: id } or { story: threadId }
 *   hour     the visitor's local hour, 0-23 (never stored or sent)
 *   seed     an integer; the same seed gives the same pick
 */

export const DAYPARTS = { morning: [5, 11], day: [11, 17], evening: [17, 21], night: [21, 29] };

export function daypart(hour) {
  const h = hour < 5 ? hour + 24 : hour;
  for (const [name, [a, b]] of Object.entries(DAYPARTS)) if (h >= a && h < b) return name;
  return 'day';
}

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A render shows when the library's rules show its status (approved, plus drafts while
// they are reviewed in place).
const shown = (library, render) => !!render && (library.rules?.statusesShown ?? ['approved']).includes(render.status);

/** The size classes a zone takes here: its extra sizes whose breakpoint is met, then its own. */
export function zoneSizes(library, zoneId, reached = () => true) {
  const zone = library.zones[zoneId];
  if (!zone) return [];
  return [...Object.entries(zone.extraSizes ?? {}).filter(([, bp]) => reached(bp)).map(([size]) => size), zone.size];
}

/** The images a scene or set piece needs in a zone, or null when it doesn't fit there. */
export function fit(library, kind, id, zoneId, sizes = zoneSizes(library, zoneId)) {
  const zone = library.zones[zoneId];
  if (!zone) return null;
  if (kind === 'scene') {
    const scene = library.scenes.find((s) => s.id === id);
    if (!scene || scene.status === 'retired' || !scene.zones.includes(zoneId) || !zone.poses.includes(scene.pose)) return null;
    const size = sizes.find((sz) => shown(library, scene.renders?.[sz]));
    if (!size) return null;
    const single = size === zone.size || size === 'tall';
    const side = single ? (zone.align === 'either' ? 'end' : zone.align) : 'fill';
    return [{ scene: scene.id, size, side, file: `${scene.id}.${size}` }];
  }
  const piece = library.setPieces.find((p) => p.id === id);
  if (!piece || piece.status === 'retired' || !piece.zones.includes(zoneId)) return null;
  for (const size of sizes.filter((sz) => sz !== 'strip' && sz !== 'tall')) {
    const images = [];
    for (const part of piece.parts) {
      const scene = library.scenes.find((s) => s.id === part.scene);
      const render = scene?.renders?.[size];
      if (!shown(library, render)) break;
      images.push({ scene: scene.id, size, side: part.side, file: `${scene.id}.${size}` });
    }
    if (images.length === piece.parts.length) return images;
  }
  return null;
}

/** Every standalone moment (scene or set piece) that fits a zone. */
export function candidates(library, zoneId, sizes = zoneSizes(library, zoneId)) {
  const out = [];
  for (const s of library.scenes) if (s.standalone !== false && fit(library, 'scene', s.id, zoneId, sizes)) out.push({ kind: 'scene', id: s.id });
  for (const p of library.setPieces) if (fit(library, 'setPiece', p.id, zoneId, sizes)) out.push({ kind: 'setPiece', id: p.id });
  return out;
}

export function pickMoments(zones, library, visit = {}, hour = 12, seed = 1) {
  const rules = library.rules;
  const random = rng(seed);
  const state = { thread: null, beat: 0, history: [], told: [], ...visit };
  const review = state.review;
  delete state.review;
  const moments = [];
  let images = 0;
  let lastTop = -Infinity;

  const usable = zones.filter((z) => z.available !== false && library.zones[z.id]);

  const place = (zone, kind, id) => {
    const imgs = fit(library, kind, id, zone.id, zone.sizes);
    if (!imgs) return false;
    if (moments.length >= rules.maxPerPage || images + imgs.length > rules.maxImagesPerPage) return false;
    const gap = (zone.viewportHeight ?? 0) * rules.minGapViewports;
    if (moments.length && zone.top - lastTop < gap) return false;
    moments.push({ zone: zone.id, kind, id, images: imgs });
    images += imgs.length;
    lastTop = zone.top ?? 0;
    return true;
  };

  if (review?.scene) {
    const kind = library.setPieces.some((p) => p.id === review.scene) ? 'setPiece' : 'scene';
    for (const z of usable) if (place(z, kind, review.scene)) break;
    return { moments, visit: state };
  }

  // A zone turns on only once it has enough choices (review links bypass this).
  const live = review?.story ? usable : usable.filter((z) => candidates(library, z.id, z.sizes).length >= rules.minCandidatesPerZone);
  if (!live.length) return { moments, visit: state };

  // Story: continue this visit's thread, or start one that suits the time of day.
  let thread = library.threads.find((t) => t.id === (review?.story ?? state.thread));
  let beat = review?.story ? 0 : state.beat;
  if (!thread || beat >= thread.beats.length) {
    const part = daypart(hour);
    const pool = library.threads.filter((t) => !state.told.includes(t.id));
    const from = pool.length ? pool : library.threads;
    const weighted = from.flatMap((t) => Array(rules.preferDaypart && t.daypart === part ? 3 : t.daypart === 'any' ? 2 : 1).fill(t));
    thread = weighted[Math.floor(random() * weighted.length)];
    beat = 0;
  }

  const used = new Set();
  for (const zone of live) {
    while (thread && beat < thread.beats.length) {
      const b = thread.beats[beat];
      const kind = b.setPiece ? 'setPiece' : 'scene';
      const id = b.setPiece ?? b.scene;
      beat++;
      if (place(zone, kind, id)) {
        used.add(zone.id);
        break;
      }
    }
  }

  // Fill any zone left with a fresh standalone moment, skipping recent ones.
  for (const zone of live) {
    if (used.has(zone.id) || moments.length >= rules.maxPerPage) continue;
    const recent = new Set(state.history);
    const shown = new Set(moments.map((m) => m.id));
    const all = candidates(library, zone.id, zone.sizes).filter((c) => !shown.has(c.id));
    const fresh = all.filter((c) => !recent.has(c.id));
    const pool = fresh.length ? fresh : all;
    for (let tries = 0; tries < pool.length; tries++) {
      const c = pool[Math.floor(random() * pool.length)];
      if (place(zone, c.kind, c.id)) break;
    }
  }

  const history = [...state.history, ...moments.map((m) => m.id)].slice(-rules.historySize);
  const done = !thread || beat >= thread.beats.length;
  const told = done && thread ? [...state.told.filter((t) => t !== thread.id), thread.id].slice(-Math.max(1, library.threads.length - 1)) : state.told;
  return { moments, visit: { thread: done ? null : thread.id, beat: done ? 0 : beat, history, told } };
}
