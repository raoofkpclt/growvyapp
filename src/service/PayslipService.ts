import {
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  where,
} from "firebase/firestore";
import { db } from "../config/firebase/firebase";

/**
 * One payslip per person per month. Creating the payslip is what marks the
 * month as paid, and the staff sees it in their own payslip list.
 * A payslip can't be changed or removed from the app once it exists.
 */
export type Payslip = {
  id: string; // `${uid}_${YYYY-MM}`
  slipNo: string;
  uid: string;
  name: string;
  email: string;
  roleLabel: string;
  month: string; // YYYY-MM

  // saved at the time HR marked it paid, so the slip never changes later
  monthlySalary: number;
  workingDays: number;
  fullDays: number;
  halfDays: number;
  paidLeaveDays: number;
  lopDays: number;
  payDays: number;
  hours: number;

  amount: number; // net pay
  paidAt: number;
  paidBy: string;
  paidByName: string;
};

export type NewPayslip = Omit<Payslip, "id" | "slipNo" | "paidAt">;

const COL = "payslips";

/** Marks the month as paid and sends the payslip to the staff */
export async function issuePayslip(input: NewPayslip) {
  const ref = doc(db, COL, `${input.uid}_${input.month}`);

  await runTransaction(db, async (tx) => {
    if ((await tx.get(ref)).exists())
      throw new Error("This month is already marked as paid.");

    tx.set(ref, {
      ...input,
      amount: Math.round(input.amount),
      slipNo: `PS-${input.month.replace("-", "")}-${input.uid.slice(0, 4).toUpperCase()}`,
      paidAt: Date.now(),
    });
  });
}

/** HR / admin: every payslip of one month */
export async function listPayslips(month: string): Promise<Payslip[]> {
  const snap = await getDocs(query(collection(db, COL), where("month", "==", month)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Payslip);
}

/** Staff: all of their own payslips, newest month first */
export async function listMyPayslips(uid: string): Promise<Payslip[]> {
  const snap = await getDocs(query(collection(db, COL), where("uid", "==", uid)));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Payslip)
    .sort((a, b) => b.month.localeCompare(a.month));
}