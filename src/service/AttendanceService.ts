// import {
//   arrayUnion,
//   collection,
//   doc,
//   getDoc,
//   getDocs,
//   query,
//   serverTimestamp,
//   setDoc,
//   updateDoc,
//   where,
//   type DocumentData,
// } from "firebase/firestore";
// import { db } from "../config/firebase/firebase";
// import { pauseAllRunningForStaff } from "./TaskService";
// import {
//   canReCheckIn,
//   closeOpenBreak,
//   computeDay,
//   reCheckInPatch,
// } from "../utils/types/AttendanceRules";
// import type { FaceState } from "../utils/types/faceMatch";

// /** Evidence saved with every check-in / check-out / check-in again */
// export type Proof = {
//   selfieUrl: string;
//   lat: number | null;
//   lng: number | null;
//   accuracy: number | null;
//   distance: number | null; // metres from the office
//   capturedAt: number; // device time the selfie was taken (epoch ms)
//   face: { state: FaceState; distance: number | null };
// };

// export type Attendance = {
//   id: string; // `${uid}_${YYYY-MM-DD}`: one record per person per day
//   uid: string;
//   name: string;
//   date: string; // YYYY-MM-DD
//   checkIn: Date | null;
//   checkOut: Date | null;
//   checkInSelfie: string | null;
//   checkOutSelfie: string | null;
//   /** a face check was not a clean match: HR should look at it */
//   flagged: boolean;
// };

// const COL = "attendance";

// // ─── Helpers ──────────────────────────────────────────────────────────────────
// const pad = (n: number) => String(n).padStart(2, "0");

// export const dateKey = (d = new Date()) =>
//   `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// export const monthKey = (d = new Date()) => dateKey(d).slice(0, 7);

// export const hoursWorked = (r: Attendance) =>
//   r.checkIn && r.checkOut
//     ? (r.checkOut.getTime() - r.checkIn.getTime()) / 3_600_000
//     : 0;

// const toRecord = (id: string, data: DocumentData): Attendance => ({
//   id,
//   uid: data.uid,
//   name: data.name,
//   date: data.date,
//   checkIn: data.checkIn?.toDate?.() ?? null,
//   checkOut: data.checkOut?.toDate?.() ?? null,
//   checkInSelfie: data.checkInProof?.selfieUrl ?? null,
//   checkOutSelfie: data.checkOutProof?.selfieUrl ?? null,
//   flagged: !!data.flagged,
// });

// const newestFirst = (a: Attendance, b: Attendance) =>
//   b.date.localeCompare(a.date) || a.name.localeCompare(b.name);

// const needsReview = (p: Proof) => p.face.state !== "matched";

// const idFor = (uid: string) => doc(db, COL, `${uid}_${dateKey()}`);

// // ─── Marking (selfie + location + face check) ─────────────────────────────────
// export async function checkInWithProof(uid: string, name: string, proof: Proof) {
//   const ref = idFor(uid);
//   if ((await getDoc(ref)).exists()) throw new Error("Already checked in today.");

//   await setDoc(ref, {
//     uid,
//     name,
//     date: dateKey(),
//     checkIn: serverTimestamp(), // server time, not the device clock
//     checkOut: null,
//     breaks: [],
//     workedMs: 0,
//     workedHours: 0,
//     checkInProof: proof,
//     flagged: needsReview(proof),
//   });
// }

// /** Pauses the timer and saves the total worked time */
// export async function checkOutWithProof(uid: string, proof: Proof) {
//   const ref = idFor(uid);
//   const snap = await getDoc(ref);
//   if (!snap.exists()) throw new Error("You haven't checked in today.");
//   const d = snap.data();
//   if (d.checkOut) throw new Error("Already checked out.");

//   const t = Date.now();
//   const breaks = closeOpenBreak(d.breaks, t);
//   const r = computeDay(
//     { date: d.date, checkIn: d.checkIn, fixedCheckOut: d.fixedCheckOut, breaks, checkOut: t },
//     t
//   );

//   await pauseAllRunningForStaff(uid);
//   await updateDoc(ref, {
//     checkOut: serverTimestamp(),
//     breaks,
//     workedMs: Math.round(r.workedHours * 3_600_000),
//     workedHours: Math.round(r.workedHours * 100) / 100,
//     breakMinutes: r.breakMinutes,
//     credit: r.credit,
//     checkOutProof: proof,
//     ...(needsReview(proof) ? { flagged: true } : {}),
//   });
// }

// /** Continues the day after an accidental check-out; the gap becomes an unpaid "out" break */
// export async function reCheckInWithProof(uid: string, proof: Proof) {
//   const ref = idFor(uid);
//   const snap = await getDoc(ref);
//   if (!snap.exists()) throw new Error("You haven't checked in today.");
//   const d = snap.data();

//   const day = { date: d.date, checkIn: d.checkIn, checkOut: d.checkOut, breaks: d.breaks ?? [] };
//   const ok = canReCheckIn(day);
//   if (!ok.ok) throw new Error(ok.reason);
//   const patch = reCheckInPatch(day);

//   await updateDoc(ref, {
//     checkOut: null,
//     breaks: patch.breaks,
//     reCheckInProofs: arrayUnion(proof),
//     ...(needsReview(proof) ? { flagged: true } : {}),
//   });
// }

// // Old entry points: disabled so attendance can't be marked without a selfie.
// export async function markCheckIn(_uid?: string, _name?: string): Promise<void> {
//   throw new Error("Use the Check in button on the dashboard (selfie required).");
// }
// export async function markCheckOut(_uid?: string): Promise<void> {
//   throw new Error("Use the Check out button on the dashboard (selfie required).");
// }

// // ─── Reading ──────────────────────────────────────────────────────────────────
// export async function getToday(uid: string): Promise<Attendance | null> {
//   const id = `${uid}_${dateKey()}`;
//   const snap = await getDoc(doc(db, COL, id));
//   return snap.exists() ? toRecord(id, snap.data()) : null;
// }

// /** One person's records for a month ("YYYY-MM") */
// export async function getMyMonth(uid: string, month: string) {
//   const snap = await getDocs(query(collection(db, COL), where("uid", "==", uid)));
//   return snap.docs
//     .map((d) => toRecord(d.id, d.data()))
//     .filter((r) => r.date.startsWith(month))
//     .sort(newestFirst);
// }

// /** Everyone's records for a month: HR, Operation Manager, Admin */
// export async function getAllMonth(month: string) {
//   const snap = await getDocs(
//     query(
//       collection(db, COL),
//       where("date", ">=", `${month}-01`),
//       where("date", "<=", `${month}-31`),
//     ),
//   );
//   return snap.docs.map((d) => toRecord(d.id, d.data())).sort(newestFirst);
// }







import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type DocumentData,
} from "firebase/firestore";
import { db } from "../config/firebase/firebase";
import { pauseAllRunningForStaff } from "./TaskService";
import {
  canReCheckIn,
  closeOpenBreak,
  computeDay,
  dueScheduledBreak,
  reCheckInPatch,
  type ScheduledBreak,
} from "../utils/types/AttendanceRules";
import type { FaceState } from "../utils/types/faceMatch";

/** Evidence saved with every check-in / check-out / check-in again */
export type Proof = {
  selfieUrl: string;
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  distance: number | null; // metres from the office
  capturedAt: number; // device time the selfie was taken (epoch ms)
  face: { state: FaceState; distance: number | null };
};

export type Attendance = {
  id: string; // `${uid}_${YYYY-MM-DD}`: one record per person per day
  uid: string;
  name: string;
  date: string; // YYYY-MM-DD
  checkIn: Date | null;
  checkOut: Date | null;
  checkInSelfie: string | null;
  checkOutSelfie: string | null;
  /** a face check was not a clean match: HR should look at it */
  flagged: boolean;
};

const COL = "attendance";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, "0");

export const dateKey = (d = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const monthKey = (d = new Date()) => dateKey(d).slice(0, 7);

export const hoursWorked = (r: Attendance) =>
  r.checkIn && r.checkOut
    ? (r.checkOut.getTime() - r.checkIn.getTime()) / 3_600_000
    : 0;

const toRecord = (id: string, data: DocumentData): Attendance => ({
  id,
  uid: data.uid,
  name: data.name,
  date: data.date,
  checkIn: data.checkIn?.toDate?.() ?? null,
  checkOut: data.checkOut?.toDate?.() ?? null,
  checkInSelfie: data.checkInProof?.selfieUrl ?? null,
  checkOutSelfie: data.checkOutProof?.selfieUrl ?? null,
  flagged: !!data.flagged,
});

const newestFirst = (a: Attendance, b: Attendance) =>
  b.date.localeCompare(a.date) || a.name.localeCompare(b.name);

const needsReview = (p: Proof) => p.face.state !== "matched";

const idFor = (uid: string) => doc(db, COL, `${uid}_${dateKey()}`);

// ─── Marking (selfie + location + face check) ─────────────────────────────────
export async function checkInWithProof(uid: string, name: string, proof: Proof) {
  const ref = idFor(uid);
  if ((await getDoc(ref)).exists()) throw new Error("Already checked in today.");

  await setDoc(ref, {
    uid,
    name,
    date: dateKey(),
    checkIn: serverTimestamp(), // server time, not the device clock
    checkOut: null,
    breaks: [],
    autoOut: null,
    autoBreaksDone: [],
    workedMs: 0,
    workedHours: 0,
    checkInProof: proof,
    flagged: needsReview(proof),
  });
}

/** Pauses the timer and saves the total worked time */
export async function checkOutWithProof(uid: string, proof: Proof) {
  const ref = idFor(uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("You haven't checked in today.");
  const d = snap.data();
  if (d.checkOut) throw new Error("Already checked out.");

  const t = Date.now();
  const breaks = closeOpenBreak(d.breaks, t);
  const r = computeDay(
    { date: d.date, checkIn: d.checkIn, fixedCheckOut: d.fixedCheckOut, breaks, checkOut: t },
    t
  );

  await pauseAllRunningForStaff(uid);
  await updateDoc(ref, {
    checkOut: serverTimestamp(),
    breaks,
    workedMs: Math.round(r.workedHours * 3_600_000),
    workedHours: Math.round(r.workedHours * 100) / 100,
    breakMinutes: r.breakMinutes,
    credit: r.credit,
    checkOutProof: proof,
    ...(needsReview(proof) ? { flagged: true } : {}),
  });
}

/**
 * Continues the day after a check-out (automatic lunch / tea check-out, or a manual one).
 * The gap becomes an "out" entry. Back before 2:00 PM after lunch counts as 2:00 PM.
 */
export async function reCheckInWithProof(uid: string, proof: Proof) {
  const ref = idFor(uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("You haven't checked in today.");
  const d = snap.data();

  const day = {
    date: d.date,
    checkIn: d.checkIn,
    checkOut: d.checkOut,
    breaks: d.breaks ?? [],
    autoOut: (d.autoOut ?? null) as ScheduledBreak | null,
  };
  const ok = canReCheckIn(day);
  if (!ok.ok) throw new Error(ok.reason);
  const patch = reCheckInPatch(day);

  await updateDoc(ref, {
    checkOut: null,
    autoOut: null,
    breaks: patch.breaks,
    reCheckInProofs: arrayUnion(proof),
    ...(needsReview(proof) ? { flagged: true } : {}),
  });
}

// ─── Automatic check-out at 1:00 PM (lunch) and 4:00 PM (tea) ─────────────────
/**
 * If a scheduled break has started and this person is still checked in, check them
 * out at the exact break start time (1:00 PM / 4:00 PM) and pause their tasks.
 * Safe to call as often as you like: it does nothing when nothing is due.
 * Returns which break was applied, or null.
 */
export async function sweepScheduledBreaks(uid: string): Promise<ScheduledBreak | null> {
  const ref = idFor(uid);
  const hit: { kind: ScheduledBreak | null } = { kind: null };

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const d = snap.data();
    const breaks = d.breaks ?? [];

    const due = dueScheduledBreak({
      date: d.date,
      checkIn: d.checkIn,
      checkOut: d.checkOut,
      breaks,
      autoBreaksDone: d.autoBreaksDone ?? [],
    });
    if (!due) return;

    const r = computeDay(
      { date: d.date, checkIn: d.checkIn, fixedCheckOut: d.fixedCheckOut, breaks, checkOut: due.at },
      due.at
    );

    tx.update(ref, {
      checkOut: Timestamp.fromMillis(due.at),
      autoOut: due.kind,
      autoBreaksDone: arrayUnion(due.kind),
      workedMs: Math.round(r.workedHours * 3_600_000),
      workedHours: Math.round(r.workedHours * 100) / 100,
      breakMinutes: r.breakMinutes,
      credit: r.credit,
    });
    hit.kind = due.kind;
  });

  if (hit.kind) await pauseAllRunningForStaff(uid);
  return hit.kind;
}

/** Same sweep for everyone who is checked in today (used on the HR / team attendance page) */
export async function sweepAllScheduledBreaks() {
  const snap = await getDocs(
    query(collection(db, COL), where("date", "==", dateKey()), where("checkOut", "==", null))
  );
  const results = await Promise.allSettled(
    snap.docs.map((s) => sweepScheduledBreaks(s.data().uid))
  );
  return results.filter((r) => r.status === "fulfilled" && r.value).length;
}

// Old entry points: disabled so attendance can't be marked without a selfie.
export async function markCheckIn(_uid?: string, _name?: string): Promise<void> {
  throw new Error("Use the Check in button on the dashboard (selfie required).");
}
export async function markCheckOut(_uid?: string): Promise<void> {
  throw new Error("Use the Check out button on the dashboard (selfie required).");
}

// ─── Reading ──────────────────────────────────────────────────────────────────
export async function getToday(uid: string): Promise<Attendance | null> {
  const id = `${uid}_${dateKey()}`;
  const snap = await getDoc(doc(db, COL, id));
  return snap.exists() ? toRecord(id, snap.data()) : null;
}

/** One person's records for a month ("YYYY-MM") */
export async function getMyMonth(uid: string, month: string) {
  const snap = await getDocs(query(collection(db, COL), where("uid", "==", uid)));
  return snap.docs
    .map((d) => toRecord(d.id, d.data()))
    .filter((r) => r.date.startsWith(month))
    .sort(newestFirst);
}

/** Everyone's records for a month: HR, Operation Manager, Admin */
export async function getAllMonth(month: string) {
  const snap = await getDocs(
    query(
      collection(db, COL),
      where("date", ">=", `${month}-01`),
      where("date", "<=", `${month}-31`),
    ),
  );
  return snap.docs.map((d) => toRecord(d.id, d.data())).sort(newestFirst);
}