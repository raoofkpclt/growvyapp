import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../config/firebase/firebase";
import type { Bill } from "../utils/types/Types";

const billsCollection = collection(db, "bills");

// Newest bill first (matches "last entered shows first")
export const getBills = async (): Promise<Bill[]> => {
  const q = query(billsCollection, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    ...(d.data() as Bill),
    id: d.id,
    firestoreId: d.id,
  }));
};

export const addBill = async (
  bill: Omit<Bill, "id" | "firestoreId">,
): Promise<Bill> => {
  const docRef = await addDoc(billsCollection, bill);
  return { ...bill, id: docRef.id, firestoreId: docRef.id };
};

export const updateBill = async (
  firestoreId: string,
  updates: Partial<Bill>,
): Promise<void> => {
  await updateDoc(doc(db, "bills", firestoreId), updates);
};

export const deleteBill = async (firestoreId: string): Promise<void> => {
  await deleteDoc(doc(db, "bills", firestoreId));
};
