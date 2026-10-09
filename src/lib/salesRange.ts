/** Local calendar days → [start of `from`, start of the day after `to`) as instants; null if unusable.
 *  Date inputs accept years like 20262, which `new Date` can't parse, so check the dates, not the strings. */
export function toRange(from: string, to: string): readonly [string, string] | null {
  const start = new Date(`${from}T00:00`), end = new Date(`${to}T00:00`);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return null;
  end.setDate(end.getDate() + 1);
  return [start.toISOString(), end.toISOString()] as const;
}
