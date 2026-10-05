/**
 * Fold a flat list into the two layer shape `GroupedList` renders.
 *
 * A long flat table with a summary block above it makes the reader match a
 * number in one place against rows in another. Grouping puts the roll-up on the
 * row that opens onto the detail, so the two layers cannot disagree.
 */
export type RowGroup<T> = {
  key: string;
  title: string;
  rows: T[];
  /** The unit count the group header shows. */
  units: number;
  /** The money the group header shows. */
  value: number;
};

export type GroupRowsOptions<T> = {
  keyOf: (row: T) => string;
  titleOf: (key: string) => string;
  unitsOf?: (row: T) => number;
  valueOf?: (row: T) => number;
  /** The key a row with no key falls into. */
  fallbackKey?: string;
};

/**
 * Group `rows` by key, heaviest group first.
 *
 * The heaviest group leads because that is the one a reader opens first. Groups
 * of equal value fall back to their title, so the order never wobbles between
 * renders.
 */
export function groupRows<T>(rows: readonly T[], options: GroupRowsOptions<T>): RowGroup<T>[] {
  const { keyOf, titleOf, unitsOf, valueOf, fallbackKey = 'other' } = options;
  const groups = new Map<string, RowGroup<T>>();

  for (const row of rows) {
    const key = keyOf(row) || fallbackKey;
    const group = groups.get(key) || { key, title: titleOf(key), rows: [], units: 0, value: 0 };
    group.rows.push(row);
    group.units += unitsOf?.(row) || 0;
    group.value += valueOf?.(row) || 0;
    groups.set(key, group);
  }

  return Array.from(groups.values()).sort(
    (a, b) => b.value - a.value || a.title.localeCompare(b.title),
  );
}
