/** Shared identity rules for the public builder and CLI; IDs are never reused. */
const idPattern = /^(?=.{1,64}$)[a-z0-9]+(?:-[a-z0-9]+)*$/;
const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const has = (value, key) => Object.hasOwn(value, key);
export function lifecycleProblems(data, items) {
  const errors = [];
  const live = new Set(items.map((item) => item.id));
  if (!record(data) || data.version !== 1 || !record(data.aliases) || !record(data.removed)) return ['Lifecycle data needs version 1, aliases and removed objects.'];
  for (const [id, target] of Object.entries(data.aliases)) {
    if (!idPattern.test(id) || typeof target !== 'string' || !idPattern.test(target)) errors.push(`Invalid alias: ${id}.`);
    if (live.has(id) || has(data.removed, id)) errors.push(`Alias ID is already in use: ${id}.`);
    const visited = new Set();
    let next = id;
    while (has(data.aliases, next)) {
      if (visited.has(next)) { errors.push(`Alias cycle: ${id}.`); break; }
      visited.add(next);
      next = data.aliases[next];
    }
    if (!live.has(next) && !has(data.removed, next)) errors.push(`Alias target does not exist: ${id}.`);
  }
  for (const [id, removal] of Object.entries(data.removed)) {
    if (!idPattern.test(id) || live.has(id)) errors.push(`Invalid or reused removed ID: ${id}.`);
    if (!record(removal) || typeof removal.reason !== 'string' || !removal.reason.trim()
      || !/^\d{4}-\d{2}-\d{2}$/.test(removal.date ?? '') || !Number.isFinite(Date.parse(removal.date))
      || new Date(removal.date).toISOString().slice(0, 10) !== removal.date) {
      errors.push(`Removal needs a date and reason: ${id}.`);
    }
    if (removal?.instead !== undefined && (!idPattern.test(removal.instead) || !live.has(removal.instead))) errors.push(`Removal alternative must be a current item: ${id}.`);
  }
  return errors;
}

export function resolveIdentity(data, requested) {
  let id = requested;
  const visited = new Set();
  while (has(data.aliases ?? {}, id)) {
    if (visited.has(id)) throw new Error('The catalog contains an alias cycle.');
    visited.add(id);
    id = data.aliases[id];
  }
  return { id, removed: has(data.removed ?? {}, id) ? data.removed[id] : null };
}
