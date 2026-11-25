/**
 * Working-day rules.
 * Hours are counted from check-in to check-out, with breaks included.
 *   8 hours or more      → full day
 *   4.5 to under 8 hours → half day
 *   under 4.5 hours      → not counted
 */
export const SCHEDULE = {
  start: "9:30 AM",
  end: "6:30 PM",
  lunch: { label: "1:00 – 2:00 PM", from: 13 * 60, to: 14 * 60 }, // minutes from midnight
  tea: { label: "4:00 – 4:15 PM", from: 16 * 60, to: 16 * 60 + 15 },
};

export const FULL_DAY_HOURS = 9;
export const HALF_DAY_HOURS = 4.5;

export type DayMark = "full" | "half" | "absent";

/** Credit for a day from hours worked: 1, 0.5 or 0 */
export const dayCredit = (hours: number): number =>
  hours >= FULL_DAY_HOURS ? 1 : hours >= HALF_DAY_HOURS ? 0.5 : 0;

/** Credit for a day HR / admin marked by hand */
export const markCredit = (m: DayMark): number => (m === "full" ? 1 : m === "half" ? 0.5 : 0);

export const creditLabel = (c: number) =>
  c >= 1 ? "Full day" : c > 0 ? "Half day" : "Not counted";

export const MARK_LABELS: Record<DayMark, string> = {
  full: "Full day",
  half: "Half day",
  absent: "Not counted",
};

/** 1 → "1", 0.5 → "0.5" */
export const fmtNum = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));