import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../config/firebase/firebase";

/**
 * Leave policy
 * - Casual leave : 1 paid day per month
 * - Medical leave: 1 paid day per 2-month period (Jan–Feb, Mar–Apr, May–Jun …)
 * - Loss of Pay  : always unpaid
 * - Other        : paid, no quota (HR's discretion). Set OTHER_IS_PAID to false to make it unpaid.
 * A half day uses 0.5 of the quota. Days beyond the quota are automatically unpaid.
 * Only approved leave counts; pending and rejected leave never use the quota.
 */
export type LeaveType = "casual" | "medical" | "lop" | "other";
export type LeaveStatus = "pending" | "approved" | "rejected";

export type Leave = {
  id: string; // `${uid}_${YYYY-MM-DD}` → one leave entry per person per day
  uid: string;
  name: string;
  date: string; // YYYY-MM-DD
  month: string; // YYYY-MM
  type: LeaveType;
  half: boolean; // half-day leave
  status: LeaveStatus;
  note: string; // reason
  setBy: string; // who applied or marked it
  setByName: string;
  decidedBy?: string;
  decidedByName?: string;
};

export type ClassifiedLeave = Leave & {
  days: number; // 1 or 0.5
  paidDays: number;
  unpaidDays: number;
};

const COL = "leaves";

export const CASUAL_PER_MONTH = 1;
export const MEDICAL_PER_PERIOD = 1;
export const OTHER_IS_PAID = true;

/** Everything HR can mark */
export const LEAVE_TYPES: LeaveType[] = ["casual", "medical", "lop", "other"];
/** What staff can apply for (Loss of Pay is decided by HR) */
export const APPLY_TYPES: LeaveType[] = ["casual", "medical", "other"];

export const LEAVE_LABELS: Record<LeaveType, string> = {
  casual: "Casual leave",
  medical: "Medical leave",
  lop: "Loss of Pay",
  other: "Other leave",
};

export const leaveDays = (l: Pick<Leave, "half">) => (l.half ? 0.5 : 1);

/* ───────────── 2-month medical periods ───────────── */
const pad = (n: number) => String(n).padStart(2, "0");

/** First month of the 2-month period this month belongs to */
export function periodStart(month: string) {
  const [y, m] = month.split("-").map(Number);
  return `${y}-${pad(m % 2 === 0 ? m - 1 : m)}`;
}

/** Last month of the 2-month period this month belongs to */
export function periodEnd(month: string) {
  const [y, m] = month.split("-").map(Number);
  const start = m % 2 === 0 ? m - 1 : m;
  return `${y}-${pad(start + 1)}`;
}

/* ───────────── policy ───────────── */

/**
 * Works out how much of each approved leave is paid. Goes day by day, so the
 * first casual leave of a month and the first medical leave of a period are
 * paid and anything beyond that is unpaid.
 */
export function classifyLeaves(leaves: Leave[]): ClassifiedLeave[] {
  const used: Record<string, number> = {};

  return leaves
    .filter((l) => l.status === "approved")
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((l) => {
      const days = leaveDays(l);
      let paidDays = 0;

      const takeFromQuota = (key: string, quota: number) => {
        const already = used[key] ?? 0;
        paidDays = Math.min(days, Math.max(0, quota - already));
        used[key] = already + days;
      };

      if (l.type === "other") paidDays = OTHER_IS_PAID ? days : 0;
      if (l.type === "casual") takeFromQuota(`${l.uid}:c:${l.month}`, CASUAL_PER_MONTH);
      if (l.type === "medical")
        takeFromQuota(`${l.uid}:m:${periodStart(l.month)}`, MEDICAL_PER_PERIOD);

      return { ...l, days, paidDays, unpaidDays: days - paidDays };
    });
}

/** Balance for one person. `leaves` must cover the whole 2-month period. */
export function balanceFor(leaves: Leave[], uid: string, month: string) {
  const mine = leaves.filter((l) => l.uid === uid && l.status === "approved");
  const start = periodStart(month);

  const sum = (list: Leave[]) => list.reduce((n, l) => n + leaveDays(l), 0);
  const casualUsed = sum(mine.filter((l) => l.type === "casual" && l.month === month));
  const medicalUsed = sum(
    mine.filter((l) => l.type === "medical" && periodStart(l.month) === start)
  );

  return {
    casualUsed,
    casualLeft: Math.max(0, CASUAL_PER_MONTH - casualUsed),
    medicalUsed,
    medicalLeft: Math.max(0, MEDICAL_PER_PERIOD - medicalUsed),
  };
}

/* ───────────── Firestore ───────────── */

/** All leaves with month between `from` and `to` (both YYYY-MM, inclusive) */
export async function getLeaves(from: string, to: string): Promise<Leave[]> {
  const snap = await getDocs(
    query(collection(db, COL), where("month", ">=", from), where("month", "<=", to))
  );
  // defaults keep leave saved before half days / approval existed working
  return snap.docs.map(
    (d) => ({ half: false, status: "approved", note: "", ...d.data(), id: d.id }) as Leave
  );
}

type LeaveInput = Pick<Leave, "uid" | "name" | "date" | "type" | "half" | "note">;

/** Staff applies for leave: waits for HR / admin approval */
export async function applyLeave(input: LeaveInput) {
  const ref = doc(db, COL, `${input.uid}_${input.date}`);
  const snap = await getDoc(ref);
  if (snap.exists() && (snap.data().status ?? "approved") !== "rejected")
    throw new Error("There is already a leave entry on this date.");

  await setDoc(ref, {
    ...input,
    month: input.date.slice(0, 7),
    status: "pending",
    setBy: input.uid,
    setByName: input.name,
  });
}

/** HR / admin marks leave directly: approved straight away */
export const setLeave = (input: LeaveInput & { setBy: string; setByName: string }) =>
  setDoc(doc(db, COL, `${input.uid}_${input.date}`), {
    ...input,
    month: input.date.slice(0, 7),
    status: "approved",
    decidedBy: input.setBy,
    decidedByName: input.setByName,
  });

/** HR / admin approves or rejects a request */
export const decideLeave = (
  id: string,
  status: "approved" | "rejected",
  by: string,
  byName: string
) => updateDoc(doc(db, COL, id), { status, decidedBy: by, decidedByName: byName });

export const changeLeaveType = (id: string, type: LeaveType) =>
  updateDoc(doc(db, COL, id), { type });

export const removeLeave = (id: string) => deleteDoc(doc(db, COL, id));