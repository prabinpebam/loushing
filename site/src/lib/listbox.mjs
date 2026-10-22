/**
 * Listbox keyboard model for the custom Select (WAI-ARIA APG "select-only combobox").
 * Pure functions, no DOM: the client maps keys to actions and indexes with these.
 * @tier 0
 */

/**
 * What a key does to the combobox.
 * @param {string} key KeyboardEvent.key
 * @param {boolean} open whether the list is showing
 * @param {{ alt?: boolean, typing?: boolean }} [mods] alt held; a type-ahead already running
 * @returns {'open'|'close'|'select'|'select-tab'|'move'|'type'|null}
 */
export function comboAction(key, open, { alt = false, typing = false } = {}) {
  const printable = key.length === 1 && (key !== ' ' || typing);
  if (!open) {
    if (key === 'ArrowDown' && alt) return 'open';
    if (['ArrowDown', 'ArrowUp', 'Enter', ' ', 'Home', 'End'].includes(key)) return 'open';
    return printable ? 'type' : null;
  }
  if (key === 'ArrowUp' && alt) return 'select';
  if (key === 'Enter' || key === ' ') return typing && key === ' ' ? 'type' : 'select';
  if (key === 'Tab') return 'select-tab';
  if (key === 'Escape') return 'close';
  if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'PageUp', 'PageDown'].includes(key)) return 'move';
  return printable ? 'type' : null;
}

/** The option made active when the list opens with `key`. */
export function openIndex(key, selected, count) {
  if (count <= 0) return -1;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  return Math.max(0, Math.min(selected, count - 1));
}

/** The option made active by a movement key, clamped to the list. */
export function moveIndex(key, active, count) {
  const step = { ArrowDown: 1, ArrowUp: -1, PageDown: 10, PageUp: -10 }[key];
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  if (step === undefined) return active;
  return Math.max(0, Math.min(active + step, count - 1));
}

/**
 * Type-ahead: the first label starting with `buffer`, searching from the option after
 * `from`. A buffer of one repeated letter cycles through the labels starting with it.
 * @returns {number} the index, or -1 when nothing matches
 */
export function typeahead(buffer, labels, from) {
  const b = buffer.toLowerCase();
  if (!b) return -1;
  const same = [...b].every((c) => c === b[0]);
  const needle = same ? b[0] : b;
  const n = labels.length;
  const start = same ? from + 1 : from;
  for (let k = 0; k < n; k++) {
    const i = (((start + k) % n) + n) % n;
    if (labels[i].toLowerCase().startsWith(needle)) return i;
  }
  return -1;
}
