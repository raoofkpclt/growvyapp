import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "../config/firebase/firebase";
import type { SpecialDay, SpecialDayType } from "../utils/types/WorkCalendar";

/**
 * Special days HR / admin marks on top of the weekly rule (Sundays, 2nd Saturdays).
 * One document per date: the document id is the date, so a day can't be marked twice.
 *
 * Save as: src/service/holidayService.ts
 */
const COL = "holidays";

/** Special days with a date between `from` and `to` (both YYYY-MM-DD, inclusive) */
export async function listSpecialDays(from: string, to: string): Promise<SpecialDay[]> {
  const snap = await getDocs(
    query(collection(db, COL), where("date", ">=", from), where("date", "<=", to))
  );
  return snap.docs
    .map((d) => d.data() as SpecialDay)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getSpecialDay(date: string): Promise<SpecialDay | null> {
  const snap = await getDoc(doc(db, COL, date));
  return snap.exists() ? (snap.data() as SpecialDay) : null;
}

export const saveSpecialDay = (input: {
  date: string;
  name: string;
  type: SpecialDayType;
  by: string;
  byName: string;
}) =>
  setDoc(doc(db, COL, input.date), {
    date: input.date,
    name: input.name.trim(),
    type: input.type,
    by: input.by,
    byName: input.byName,
    updatedAt: Date.now(),
  });

export const removeSpecialDay = (date: string) => deleteDoc(doc(db, COL, date));