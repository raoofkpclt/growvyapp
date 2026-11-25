/**
 * Attendance rules: ONE place for shift times and day credit.
 * Pure functions, no Firebase. All times are read as IST (Asia/Kolkata), so the
 * result never depends on the staff member's device time zone.
 *
 * FLEXIBLE SHIFT (9 hours, the start slides between 9:30 and 10:00):
 *   arrive 9:30 -> leave 6:30 PM   (normal)
 *   arrive 9:45 -> leave 6:45 PM
 *   arrive 10:00 -> leave 7:00 PM  (latest)
 *   - check-in before 9:30 counts from 9:30
 *   - check-in after 10:00 = Late
 *   - check-in after 10:05 = Half day
 *   - leaving before your end time = Half day
 *
 * THE 9 HOURS INCLUDE LUNCH AND TEA. There are no break buttons and break time
 * is never deducted. A full day = 9 hours between check-in and check-out.
 *
 * RE-CHECK-IN: if someone checks out and checks in again the same day, the
 * original check-in stays, the check-out is cleared, and the time they were
 * checked out is saved as an "out" gap that IS deducted from worked hours.
 *
 * Save as: src/utils/types/AttendanceRules.ts
 */

export const RULES = {
  shiftStart: "09:30", //    earliest start (earlier check-ins count from here)
  flexStart: "10:00", //     latest on-time start; after this = Late
  halfDayAfter: "10:05", //  check-in after this = half day at most
  shiftHours: 8, //          end time = start + 9h  (9:30-18:30 ... 10:00-19:00)
  earlyLeaveGraceMinutes: 0, // leaving earlier than this many minutes before the end = half day
  fullDayHours: 8, //        worked hours for a full day (lunch and tea are included)
  halfDayHours: 4, //      worked hours for a half day
  countOvertime: false, //   time after the end time is reported, not paid
  // Legacy values, not used any more (breaks are included in the 9 hours):
  lunchMinutes: 60,
  teaMinutes: 15,
  maxTeaBreaks: 2,
} as const;

/**
 * "out" = the gap between a check-out and a re-check-in (deducted).
 * "lunch" and "tea" only exist on records saved before break buttons were removed;
 * they are ignored, so that time counts as worked.
 */
export type BreakType = "lunch" | "tea" | "out";
export type BreakEntry = { type: BreakType; start: unknown; end?: unknown };

export type DayInput = {
  date: string; //           "YYYY-MM-DD" (IST)
  checkIn?: unknown;
  checkOut?: unknown;
  /** set by HR / admin when the staff forgot to check out */
  fixedCheckOut?: unknown;
  breaks?: BreakEntry[];
  /** true on Sundays, 2nd Saturdays and holidays: no check-in is not an absence */
  closed?: boolean;
};

export type DayStatus =
  | "absent" //          no check-in
  | "off" //             closed day (Sunday, 2nd Saturday, holiday), nothing expected
  | "in_progress" //     checked in today, still working
  | "present" //         full day
  | "late" //            full day, but checked in after 10:00
  | "half_day"
  | "short" //           checked in but under the half-day hours
  | "missed_checkout"; // checked in, never checked out -> needs HR review

export type HalfDayReason = "late" | "early_leave" | "hours";

export type DayResult = {
  status: DayStatus;
  /** what payroll should count: 1, 0.5 or 0 */
  credit: 0 | 0.5 | 1;
  workedHours: number;
  /** time spent checked out between a check-out and a re-check-in */
  breakMinutes: number;
  /** same as breakMinutes: all of it is deducted from worked hours */
  excessBreakMinutes: number;
  overtimeMinutes: number;
  /** checked in after 10:00 */
  late: boolean;
  /** checked in after 10:05, so the day is capped at half */
  lateHalfDay: boolean;
  /** left before the end time, so the day is capped at half */
  earlyLeave: boolean;
  earlyLeaveMinutes: number;
  /** why a half day is half (null when it is not a half day) */
  halfDayReason: HalfDayReason | null;
  /** when this person's shift ends (check-in decides it: 18:30 to 19:00) */
  requiredEnd: number | null;
  /** minutes before 09:30 that are ignored */
  earlyMinutesIgnored: number;
  countedStart: number | null;
  countedEnd: number | null;
  /** checkout was entered by HR / admin */
  fixed: boolean;
  needsReview: boolean;
};

const MIN = 60_000;
const HOUR = 3_600_000;

/** Firestore Timestamp, Date, ISO string or epoch ms -> epoch ms */
export const toMs = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return v;
  if (v instanceof Date) return v.getTime();
  if (typeof v === "string") {
    const t = Date.parse(v);
    return Number.isNaN(t) ? null : t;
  }
  const maybe = v as { toMillis?: () => number };
  return typeof maybe.toMillis === "function" ? maybe.toMillis() : null;
};

/** "YYYY-MM-DD" for a moment, in IST */
export const istDate = (ms: number) => new Date(ms + 330 * MIN).toISOString().slice(0, 10);

/** epoch ms of HH:MM on a date, in IST */
export const atShift = (date: string, hhmm: string) => Date.parse(`${date}T${hhmm}:00+05:30`);

/** "18:30" -> "6:30 PM" */
export const fmtHHMM = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

/** an epoch moment as "6:45 PM" in IST */
export const fmtIST = (ms: number) =>
  fmtHHMM(new Date(ms + 330 * MIN).toISOString().slice(11, 16));

const minute = (ms: number) => Math.floor(ms / MIN) * MIN;

/**
 * When this person's day ends. The start slides between 09:30 and 10:00,
 * and the end is 9 hours after it (18:30 to 19:00).
 */
export const requiredEndFor = (date: string, checkInMs: number) => {
  const start = atShift(date, RULES.shiftStart);
  const flex = atShift(date, RULES.flexStart);
  const anchor = Math.min(Math.max(checkInMs, start), flex);
  return anchor + RULES.shiftHours * HOUR;
};

const EMPTY: DayResult = {
  status: "absent",
  credit: 0,
  workedHours: 0,
  breakMinutes: 0,
  excessBreakMinutes: 0,
  overtimeMinutes: 0,
  late: false,
  lateHalfDay: false,
  earlyLeave: false,
  earlyLeaveMinutes: 0,
  halfDayReason: null,
  requiredEnd: null,
  earlyMinutesIgnored: 0,
  countedStart: null,
  countedEnd: null,
  fixed: false,
  needsReview: false,
};

export function computeDay(d: DayInput, now: number = Date.now()): DayResult {
  const checkIn = toMs(d.checkIn);
  // a closed day with no check-in is simply "off", not an absence
  if (checkIn === null) return d.closed ? { ...EMPTY, status: "off" } : { ...EMPTY };

  const start = atShift(d.date, RULES.shiftStart);
  const flex = atShift(d.date, RULES.flexStart);
  const halfCut = atShift(d.date, RULES.halfDayAfter);
  const requiredEnd = requiredEndFor(d.date, checkIn);

  // 1) START: before 09:30 counts from 09:30. Late (after 10:00) / half day (after 10:05) by the minute.
  const late = minute(checkIn) > flex;
  const lateHalfDay = minute(checkIn) > halfCut;
  const countedStart = Math.max(checkIn, start);
  const earlyMinutesIgnored = Math.max(0, Math.round((start - checkIn) / MIN));

  // 2) END: real checkout, else HR's fixed checkout, else nothing
  const realOut = toMs(d.checkOut);
  const hrOut = toMs(d.fixedCheckOut);
  const out = realOut ?? hrOut;
  const fixed = realOut === null && hrOut !== null;

  if (out === null && d.date < istDate(now)) {
    // a day that is over with no checkout = forgotten logout: NOT a full day, HR must review
    return {
      ...EMPTY,
      status: "missed_checkout",
      late,
      lateHalfDay,
      requiredEnd,
      countedStart,
      earlyMinutesIgnored,
      needsReview: true,
    };
  }

  const rawEnd = out ?? now; // today and still working: provisional end = now
  const overtimeMinutes = Math.max(0, Math.round((rawEnd - requiredEnd) / MIN));
  const countedEnd = RULES.countOvertime ? rawEnd : Math.min(rawEnd, requiredEnd);
  const span = Math.max(0, countedEnd - countedStart);

  // leaving before the end time (by the minute)
  let earlyLeave = false;
  let earlyLeaveMinutes = 0;
  if (out !== null && minute(out) < requiredEnd - RULES.earlyLeaveGraceMinutes * MIN) {
    earlyLeave = true;
    earlyLeaveMinutes = Math.round((requiredEnd - out) / MIN);
  }

  // 3) TIME OUT: lunch and tea are part of the 9 hours, so they are NOT deducted.
  // Only the gap between a check-out and a re-check-in is deducted.
  let outGap = 0;
  for (const b of d.breaks ?? []) {
    if (b.type !== "out") continue;
    const s = toMs(b.start);
    if (s === null) continue;
    const e = toMs(b.end) ?? countedEnd;
    outGap += Math.max(0, Math.min(e, countedEnd) - Math.max(s, countedStart));
  }

  const workedHours = Math.max(0, span - outGap) / HOUR;
  const byHours: 0 | 0.5 | 1 =
    workedHours >= RULES.fullDayHours ? 1 : workedHours >= RULES.halfDayHours ? 0.5 : 0;
  // late check-in (after 10:05) or early leaving: half day at most
  const credit: 0 | 0.5 | 1 = (lateHalfDay || earlyLeave) && byHours === 1 ? 0.5 : byHours;

  const inProgress = out === null;
  const status: DayStatus = inProgress
    ? "in_progress"
    : credit === 1
    ? late
      ? "late"
      : "present"
    : credit === 0.5
    ? "half_day"
    : "short";

  const halfDayReason: HalfDayReason | null =
    inProgress || credit !== 0.5 ? null : lateHalfDay ? "late" : earlyLeave ? "early_leave" : "hours";

  return {
    status,
    credit: inProgress ? 0 : credit, // today's day counts only after checkout
    workedHours,
    breakMinutes: Math.round(outGap / MIN),
    excessBreakMinutes: Math.round(outGap / MIN),
    overtimeMinutes,
    late,
    lateHalfDay,
    earlyLeave,
    earlyLeaveMinutes,
    halfDayReason,
    requiredEnd,
    earlyMinutesIgnored,
    countedStart,
    countedEnd,
    fixed,
    needsReview: false,
  };
}

/* ───────────── open break helpers (kept so existing imports keep working) ───────────── */

export const openBreak = (d: DayInput) =>
  (d.breaks ?? []).find((b) => toMs(b.start) !== null && toMs(b.end) === null);

export type Check = { ok: true } | { ok: false; reason: string };

/** use when checking out: ends a break that was left open, at the checkout time */
export const closeOpenBreak = (breaks: BreakEntry[] | undefined, at: number): BreakEntry[] =>
  (breaks ?? []).map((b) => (toMs(b.start) !== null && toMs(b.end) === null ? { ...b, end: at } : b));

/** label for showing a break in a list */
export const BREAK_LABELS: Record<BreakType, string> = {
  lunch: "Lunch",
  tea: "Tea",
  out: "Checked out",
};

/* ───────────── check-in / check-out guards ───────────── */

export function canCheckIn(date: string, now: number = Date.now()): Check {
  const latestEnd = requiredEndFor(date, atShift(date, RULES.flexStart));
  if (now > latestEnd) return { ok: false, reason: `The shift is over (${fmtIST(latestEnd)}).` };
  return { ok: true };
}

/** show the "don't forget to check out" banner (from this person's own end time) */
export const needsCheckoutReminder = (d: DayInput, now: number = Date.now()) => {
  const checkIn = toMs(d.checkIn);
  return (
    checkIn !== null &&
    toMs(d.checkOut) === null &&
    d.date === istDate(now) &&
    now >= requiredEndFor(d.date, checkIn)
  );
};

/* ───────────── re-check-in after a check-out ───────────── */

/** Can this person check in again after checking out? */
export function canReCheckIn(d: DayInput, now: number = Date.now()): Check {
  const checkIn = toMs(d.checkIn);
  if (checkIn === null) return { ok: false, reason: "Check in first." };
  if (toMs(d.checkOut) === null) return { ok: false, reason: "You are already checked in." };
  if (d.date !== istDate(now))
    return { ok: false, reason: "You can only check in again on the same day." };
  if (now > requiredEndFor(d.date, checkIn))
    return { ok: false, reason: "Your shift is over, so you can't check in again." };
  return { ok: true };
}

/**
 * The change to save on the day's record when re-checking in:
 * clears the check-out and records the time out as an "out" gap.
 */
export function reCheckInPatch(d: DayInput, now: number = Date.now()) {
  const outAt = toMs(d.checkOut);
  if (outAt === null) throw new Error("You are already checked in.");
  return {
    checkOut: null,
    breaks: [...(d.breaks ?? []), { type: "out" as const, start: outAt, end: now }],
  };
}