import {
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../config/firebase/firebase";

export type InvoiceLine = { description: string; qty: number; rate: number };

export type Invoice = {
  id: string;
  number: string; // INV-2026-0001
  clientId: string;
  clientName: string;
  issueDate: string; // YYYY-MM-DD
  dueDate: string;
  lines: InvoiceLine[];
  gstPercent: number;
  subtotal: number;
  tax: number;
  total: number;
  notes: string;
  status: "unpaid" | "paid";
  createdAt: number;
  createdBy: string;
  createdByName: string;
  paidAt: number | null;
};

export type NewInvoice = Pick<
  Invoice,
  | "clientId"
  | "clientName"
  | "issueDate"
  | "dueDate"
  | "lines"
  | "gstPercent"
  | "notes"
  | "createdBy"
  | "createdByName"
>;

const COL = "invoices";

export const invoiceTotals = (lines: InvoiceLine[], gstPercent: number) => {
  const subtotal = Math.round(lines.reduce((s, l) => s + l.qty * l.rate, 0));
  const tax = Math.round((subtotal * gstPercent) / 100);
  return { subtotal, tax, total: subtotal + tax };
};

/** Creates the invoice with the next number in the series (INV-<year>-0001, 0002 ...) */
export async function createInvoice(input: NewInvoice) {
  const counterRef = doc(db, "meta", "invoiceCounter");
  const invoiceRef = doc(collection(db, COL));

  await runTransaction(db, async (tx) => {
    const counter = await tx.get(counterRef);
    const next = ((counter.exists() ? counter.data().last : 0) ?? 0) + 1;
    tx.set(counterRef, { last: next });

    tx.set(invoiceRef, {
      ...input,
      ...invoiceTotals(input.lines, input.gstPercent),
      number: `INV-${input.issueDate.slice(0, 4)}-${String(next).padStart(4, "0")}`,
      status: "unpaid",
      createdAt: Date.now(),
      paidAt: null,
    });
  });
}

export async function listInvoices(clientId: string): Promise<Invoice[]> {
  const snap = await getDocs(query(collection(db, COL), where("clientId", "==", clientId)));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as Invoice)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export const markInvoicePaid = (id: string) =>
  updateDoc(doc(db, COL, id), { status: "paid", paidAt: Date.now() });