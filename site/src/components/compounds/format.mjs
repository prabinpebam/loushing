/**
 * Formatting helpers shared by compounds. Pure.
 * @tier 0
 */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "22 Oct 2026" (short), "22 October 2026" (long), "October 2026" (month). Dates are calendar dates in UTC. */
export function formatDate(iso, style = 'long') {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const day = d.getUTCDate();
  const m = d.getUTCMonth();
  const y = d.getUTCFullYear();
  if (style === 'month') return `${LONG[m]} ${y}`;
  return `${day} ${style === 'short' ? MONTHS[m] : LONG[m]} ${y}`;
}

export function plural(n, word, many = `${word}s`) {
  return `${n} ${n === 1 ? word : many}`;
}

export function bytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export const RELATION_TITLES = {
  picksUpFrom: 'Picks up from',
  feedsInto: 'Hands off to',
  pairsWith: 'Pairs with',
  inStack: 'Part of the stack',
  hasMember: 'Includes',
  alternativeTo: 'Instead of',
  requires: 'Needs',
  replacedBy: 'Replaced by',
};
