// import {
//   collection,
//   doc,
//   getDocs,
//   query,
//   serverTimestamp,
//   updateDoc,
//   where,
//   writeBatch,
// } from "firebase/firestore";
// import { db } from "../config/firebase/firebase";
// import type { Attendance } from "./attendanceService";
// import type { Staff } from "./staffService";

// export type Payroll = {
//   id: string; // `${uid}_${YYYY-MM}`
//   uid: string;
//   name: string;
//   month: string;
//   baseSalary: number;
//   daysPresent: number;
//   workingDays: number;
//   bonus: number;
//   deductions: number;
//   net: number;
//   status: "pending" | "paid";
// };

// const COL = "payroll";

// /** Mon–Fri days in the month. Holidays are not subtracted. */
// export function workingDaysIn(month: string) {
//   const [y, m] = month.split("-").map(Number);
//   const last = new Date(y, m, 0).getDate();
//   let count = 0;
//   for (let d = 1; d <= last; d++) {
//     const day = new Date(y, m - 1, d).getDay();
//     if (day !== 0 && day !== 6) count++;
//   }
//   return count;
// }

// const calcNet = (
//   base: number,
//   present: number,
//   working: number,
//   bonus: number,
//   deductions: number
// ) =>
//   Math.max(
//     0,
//     Math.round(
//       (base * Math.min(present, working)) / Math.max(working, 1) +
//         bonus -
//         deductions
//     )
//   );

// export async function listPayroll(month: string): Promise<Payroll[]> {
//   const snap = await getDocs(query(collection(db, COL), where("month", "==", month)));
//   return snap.docs
//     .map((d) => ({ id: d.id, ...d.data() }) as Payroll)
//     .sort((a, b) => a.name.localeCompare(b.name));
// }

// /**
//  * Builds the month's payroll from attendance: base × (days present ÷ working days).
//  * Re-running refreshes unpaid rows but keeps their bonus/deductions, and
//  * never touches rows already marked paid.
//  */
// export async function generatePayroll(
//   month: string,
//   staff: Staff[],
//   attendance: Attendance[]
// ) {
//   const existing = new Map((await listPayroll(month)).map((p) => [p.id, p]));
//   const working = workingDaysIn(month);
//   const batch = writeBatch(db);

//   staff
//     .filter((s) => s.active)
//     .forEach((s) => {
//       const id = `${s.uid}_${month}`;
//       const old = existing.get(id);
//       if (old?.status === "paid") return;

//       const present = new Set(
//         attendance.filter((a) => a.uid === s.uid && a.checkIn).map((a) => a.date)
//       ).size;
//       const base = s.baseSalary ?? 0;
//       const bonus = old?.bonus ?? 0;
//       const deductions = old?.deductions ?? 0;

//       batch.set(doc(db, COL, id), {
//         uid: s.uid,
//         name: s.name,
//         month,
//         baseSalary: base,
//         daysPresent: present,
//         workingDays: working,
//         bonus,
//         deductions,
//         net: calcNet(base, present, working, bonus, deductions),
//         status: "pending",
//       });
//     });

//   await batch.commit();
// }

// export const updateAdjustments = (p: Payroll, bonus: number, deductions: number) =>
//   updateDoc(doc(db, COL, p.id), {
//     bonus,
//     deductions,
//     net: calcNet(p.baseSalary, p.daysPresent, p.workingDays, bonus, deductions),
//   });

// export const markPaid = (id: string) =>
//   updateDoc(doc(db, COL, id), { status: "paid", paidAt: serverTimestamp() });

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "../config/firebase/firebase";

/** One record per person per month. A record exists only while the month is marked paid. */
export type PayStatus = {
  id: string; // `${uid}_${YYYY-MM}`
  uid: string;
  name: string;
  month: string;
  amount: number; // amount paid, saved at the time HR marked it paid
  paidAt: number;
  paidBy: string;
  paidByName: string;
};

const COL = "payrollStatus";

export async function listPayStatus(month: string): Promise<PayStatus[]> {
  const snap = await getDocs(query(collection(db, COL), where("month", "==", month)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PayStatus);
}

export const markPaid = (input: Omit<PayStatus, "id" | "paidAt">) =>
  setDoc(doc(db, COL, `${input.uid}_${input.month}`), {
    ...input,
    amount: Math.round(input.amount),
    paidAt: Date.now(),
  });

export const markUnpaid = (uid: string, month: string) =>
  deleteDoc(doc(db, COL, `${uid}_${month}`));