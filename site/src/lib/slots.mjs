/**
 * Grid slots: how many placeholders complete the last row of a card grid. Pure.
 * @tier 0
 */

/** Empty cells left in the last row of `count` cards across `columns` columns; none for one column or no cards. */
export function emptySlots(count, columns) {
  if (!(count > 0) || !(columns > 1)) return 0;
  return (columns - (count % columns)) % columns;
}
