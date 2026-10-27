import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
// ⚠ use the SAME Firebase import as service/billService.ts (path/name may differ in your project)
import { db } from "../config/firebase/firebase";
import type { AccountCategory, AccountTransaction, BalanceSheetData } from "../utils/types/Types";
import { DEFAULT_CHART, sortChart } from "../service/Accounts";
import type { NewCategory } from "../service/Accounts";

const TXN = "accountTransactions";
const CHART = "accountCategories";
const SETTINGS = "accountSettings";

type NewTxn = Omit<AccountTransaction, "id" | "firestoreId">;

/* ---------------- Transactions (cash book) ---------------- */
export const getTransactions = async (): Promise<AccountTransaction[]> => {
  const snap = await getDocs(collection(db, TXN));
  return snap.docs.map((d) => ({ ...(d.data() as NewTxn), id: d.id, firestoreId: d.id }));
};

export const addTransaction = async (data: NewTxn): Promise<AccountTransaction> => {
  const ref = await addDoc(collection(db, TXN), data);
  return { ...data, id: ref.id, firestoreId: ref.id };
};

export const updateTransaction = async (t: AccountTransaction): Promise<AccountTransaction> => {
  if (!t.firestoreId) throw new Error("Missing transaction id");
  // explicit fields so no `undefined` ever reaches Firestore
  const data: NewTxn = {
    date: t.date,
    voucherNo: t.voucherNo,
    description: t.description,
    category: t.category,
    serviceCategory: t.serviceCategory,
    region: t.region,
    paymentMode: t.paymentMode,
    income: t.income,
    expense: t.expense,
    createdAt: t.createdAt,
  };
  await updateDoc(doc(db, TXN, t.firestoreId), data);
  return t;
};

export const deleteTransaction = async (firestoreId: string) => {
  await deleteDoc(doc(db, TXN, firestoreId));
};

/** Used by "Import from Excel" (Firestore batches are limited to 500 writes) */
export const bulkAddTransactions = async (rows: NewTxn[]): Promise<AccountTransaction[]> => {
  const created: AccountTransaction[] = [];
  for (let i = 0; i < rows.length; i += 400) {
    const batch = writeBatch(db);
    for (const row of rows.slice(i, i + 400)) {
      const ref = doc(collection(db, TXN));
      batch.set(ref, row);
      created.push({ ...row, id: ref.id, firestoreId: ref.id });
    }
    await batch.commit();
  }
  return created;
};

/* ---------------- Chart of Accounts ---------------- */
export const getChartOfAccounts = async (): Promise<AccountCategory[]> => {
  const snap = await getDocs(collection(db, CHART));
  return sortChart(
    snap.docs.map((d) => ({ ...(d.data() as NewCategory), id: d.id, firestoreId: d.id })),
  );
};

export const addCategory = async (data: NewCategory): Promise<AccountCategory> => {
  const ref = await addDoc(collection(db, CHART), data);
  return { ...data, id: ref.id, firestoreId: ref.id };
};

export const deleteCategory = async (firestoreId: string) => {
  await deleteDoc(doc(db, CHART, firestoreId));
};

/** Loads the 53 categories from the Excel "Chart of Accounts" sheet */
export const seedDefaultChart = async (): Promise<AccountCategory[]> => {
  const batch = writeBatch(db);
  const created: AccountCategory[] = DEFAULT_CHART.map((c) => {
    const ref = doc(collection(db, CHART));
    batch.set(ref, c);
    return { ...c, id: ref.id, firestoreId: ref.id };
  });
  await batch.commit();
  return sortChart(created);
};

/* ---------------- Balance Sheet (manual balances) ---------------- */
export const getBalanceSheet = async (): Promise<BalanceSheetData | null> => {
  const snap = await getDoc(doc(db, SETTINGS, "balanceSheet"));
  return snap.exists() ? (snap.data() as BalanceSheetData) : null;
};

export const saveBalanceSheet = async (data: BalanceSheetData) => {
  await setDoc(doc(db, SETTINGS, "balanceSheet"), data);
};