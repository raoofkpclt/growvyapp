import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { db } from "../config/firebase/firebase";
import type { Client } from "../utils/types/Types";

// ADD CLIENT
export const addClient = async (client: Client) => {
  try {
    await addDoc(collection(db, "clients"), client);
  } catch (error) {
    console.log("Add Client Error:", error);
    throw error;
  }
};

// GET ALL CLIENTS
export const getClients = async (): Promise<Client[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, "clients"));

    return querySnapshot.docs.map((doc) => ({
      firestoreId: doc.id, // FIREBASE DOC ID
      ...(doc.data() as Client),
    })) as Client[];
  } catch (error) {
    console.log("Get Clients Error:", error);
    return [];
  }
};

// EDIT CLIENT
export const editClient = async (
  updatedData: Partial<Client>
) => {
  try {
    if (!updatedData.id) return;

    // Find document using custom id
    const q = query(
      collection(db, "clients"),
      where("id", "==", updatedData.id)
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log("Client not found");
      return;
    }

    // Get firestore document id
    const firestoreDoc = querySnapshot.docs[0];

    // Update document
    await updateDoc(
      doc(db, "clients", firestoreDoc.id),
      {
        ...updatedData,
      }
    );

    console.log("Client Updated");
  } catch (error) {
    console.log("Edit Client Error:", error);
    throw error;
  }
};



// DELETE CLIENT
export const deleteClient = async (firestoreId: string) => {
  try {
    await deleteDoc(doc(db, "clients", firestoreId));
  } catch (error) {
    console.log("Delete Client Error:", error);
    throw error;
  }
};