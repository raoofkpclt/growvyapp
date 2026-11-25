import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../config/firebase/firebase";
import type { DayMark } from "../utils/types/WorkRules";

/**
 * Extra data kept per person per day, separate from your attendance records:
 * - lunch / tea break times (set by the staff)
 * - a full / half / not-counted mark with a reason (set by HR or admin)
 */
export type BreakKind = "lunch" | "tea";

export type Extras = {
  id: string; // `${uid}_${YYYY-MM-DD}`
  uid: string;
  date: string;
  month: string;
  lunchStart?: number;
  lunchEnd?: number;
  teaStart?: number;
  teaEnd?: number;
  mark?: DayMark;
  markReason?: string;
  markBy?: string;
  markByName?: string;
};

const COL = "attendanceExtras";
const refOf = (uid: string, date: string) => doc(db, COL, `${uid}_${date}`);

export async function getExtras(uid: string, date: string): Promise<Extras | null> {
  const snap = await getDoc(refOf(uid, date));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Extras) : null;
}

export async function listExtras(month: string): Promise<Extras[]> {
  const snap = await getDocs(query(collection(db, COL), where("month", "==", month)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Extras);
}

/* ───────────── breaks (staff) ───────────── */
export const startBreak = (uid: string, date: string, kind: BreakKind) =>
  setDoc(
    refOf(uid, date),
    { uid, date, month: date.slice(0, 7), [`${kind}Start`]: Date.now() },
    { merge: true }
  );

export const endBreak = (uid: string, date: string, kind: BreakKind) =>
  setDoc(
    refOf(uid, date),
    { uid, date, month: date.slice(0, 7), [`${kind}End`]: Date.now() },
    { merge: true }
  );

/* ───────────── day mark (HR / admin) ───────────── */
export const setDayMark = (input: {
  uid: string;
  date: string;
  mark: DayMark;
  reason: string;
  by: string;
  byName: string;
}) =>
  setDoc(
    refOf(input.uid, input.date),
    {
      uid: input.uid,
      date: input.date,
      month: input.date.slice(0, 7),
      mark: input.mark,
      markReason: input.reason,
      markBy: input.by,
      markByName: input.byName,
    },
    { merge: true }
  );

export const clearDayMark = (uid: string, date: string) =>
  updateDoc(refOf(uid, date), {
    mark: deleteField(),
    markReason: deleteField(),
    markBy: deleteField(),
    markByName: deleteField(),
  });