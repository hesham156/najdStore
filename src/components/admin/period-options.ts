/**
 * Period choices for the dashboard.
 *
 * Deliberately a plain module with no "use client" directive: the admin
 * dashboard is a server component and reads these values directly. Exporting
 * them from a client module would hand the server a client-reference proxy,
 * and calling `.find()` on it throws at request time.
 */

export const RANGE_OPTIONS = [
  { value: "7", label: "آخر 7 أيام", short: "7 أيام", compareLabel: "مقارنة بالأسبوع السابق" },
  { value: "30", label: "آخر 30 يوماً", short: "30 يوماً", compareLabel: "مقارنة بالفترة السابقة" },
  { value: "90", label: "آخر 90 يوماً", short: "90 يوماً", compareLabel: "مقارنة بالفترة السابقة" },
] as const;

export type RangeKey = (typeof RANGE_OPTIONS)[number]["value"];

export const DEFAULT_RANGE: RangeKey = "30";

/** Narrows an untrusted `?range=` query value to a known option. */
export function resolveRange(value?: string): (typeof RANGE_OPTIONS)[number] {
  return RANGE_OPTIONS.find((o) => o.value === value) ?? RANGE_OPTIONS.find((o) => o.value === DEFAULT_RANGE)!;
}
