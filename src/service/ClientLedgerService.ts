import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  query,
  updateDoc,
  where,
} from "firebase/firestore";

export type LedgerType = "income" | "expense";

export interface LedgerEntry {
  id: string;
  clientId: string;
  type: LedgerType;
  amount: number;
  currency: string;
  date: string; // YYYY-MM-DD
  category: string;
  note: string;
  createdAt: number;
}

export type LedgerInput = Omit<LedgerEntry, "id" | "createdAt">;

const COLLECTION = "clientLedger";

// uses the default Firebase app that ../config/firebase/firebase already initialises
const col = () => collection(getFirestore(), COLLECTION);

export const listLedger = async (clientId: string): Promise<LedgerEntry[]> => {
  const snap = await getDocs(query(col(), where("clientId", "==", clientId)));
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<LedgerEntry, "id">) }))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
};

export const addLedger = async (input: LedgerInput): Promise<LedgerEntry> => {
  const createdAt = Date.now();
  const ref = await addDoc(col(), { ...input, createdAt });
  return { ...input, id: ref.id, createdAt };
};

export const updateLedger = async (id: string, input: LedgerInput): Promise<void> => {
  await updateDoc(doc(getFirestore(), COLLECTION, id), { ...input });
};

export const deleteLedger = async (id: string): Promise<void> => {
  await deleteDoc(doc(getFirestore(), COLLECTION, id));
};