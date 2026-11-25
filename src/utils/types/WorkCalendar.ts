/**
 * Work calendar: which days the office is closed. ONE place for the rule.
 *
 *   - Every Sunday is closed.
 *   - The 2nd Saturday of every month is closed.
 *   - HR / admin can mark special days:
 *       "holiday" → a normally open day that is closed (Onam, Diwali, strike day …)
 *       "working" → a normally closed day that is open (a working Saturday …)
 *
 * On a closed day nobody is marked absent, leave can't be marked, and the day
 * is not counted in the month's working days (payroll).
 *
 * Dates are "YYYY-MM-DD" calendar dates, so no time zone is involved.
 *
 * Save as: src/utils/types/workCalendar.ts
 */

export type SpecialDayType = "holiday" | "working";
export type SpecialDay = { date: string; name: string; type: SpecialDayType };
export type SpecialMap = Record<string, SpecialDay>;

const pad = (n: number) => String(n).padStart(2, "0");

/** 0 = Sunday … 6 = Saturday */
export const weekdayOf = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();

export const isSunday = (date: string) => weekdayOf(date) === 0;

/** The Saturday that falls on the 8th–14th of the month */
export const isSecondSaturday = (date: string) => {
  const day = Number(date.slice(8, 10));
  return weekdayOf(date) === 6 && day >= 8 && day <= 14;
};

export const isWeeklyOff = (date: string) => isSunday(date) || isSecondSaturday(date);

export const weeklyOffReason = (date: string) =>
  isSunday(date) ? "Sunday" : isSecondSaturday(date) ? "Second Saturday" : "";

export const toSpecialMap = (list: SpecialDay[]): SpecialMap =>
  Object.fromEntries(list.map((s) => [s.date, s]));

export type DayInfo = {
  closed: boolean;
  /** weekly = Sunday / 2nd Saturday, holiday = marked closed, working = marked open, normal = regular day */
  kind: "weekly" | "holiday" | "working" | "normal";
  reason: string;
};

/** Is this date a working day, and why / why not. Special days win over the weekly rule. */
export function dayInfo(date: string, specials: SpecialMap = {}): DayInfo {
  const sp = specials[date];
  if (sp?.type === "holiday") return { closed: true, kind: "holiday", reason: sp.name || "Holiday" };
  if (sp?.type === "working")
    return { closed: false, kind: "working", reason: sp.name || "Working day" };

  const weekly = weeklyOffReason(date);
  if (weekly) return { closed: true, kind: "weekly", reason: weekly };
  return { closed: false, kind: "normal", reason: "" };
}

export const isClosed = (date: string, specials: SpecialMap = {}) =>
  dayInfo(date, specials).closed;

/** Every date of a month ("YYYY-MM") */
export function monthDates(month: string): string[] {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: last }, (_, i) => `${month}-${pad(i + 1)}`);
}

/** Open days in a month: use this for payroll instead of counting Mon–Fri */
export const workingDaysIn = (month: string, specials: SpecialMap = {}) =>
  monthDates(month).filter((d) => !isClosed(d, specials)).length;