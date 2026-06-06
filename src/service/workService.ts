import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";

import { db } from "../config/firebase/firebase";

import type { Creative } from "../utils/types/Types";

import { uploadFile } from "../utils/uploadFile";

export const addCreative = async (creative: Creative, file?: File | null) => {
  try {
    let imageUrl = "";
    let logoUrl = "";

    // =========================
    // POSTER IMAGE
    // =========================
    if (creative.type === "poster" && file) {
      imageUrl = await uploadFile(file);
    }

    // =========================
    // WEBSITE LOGO
    // =========================
    if (creative.type === "website" && file) {
      logoUrl = await uploadFile(file);
    }

    // =========================
    // SAVE FIRESTORE
    // =========================
    const creativeData = {
      clientId: creative.clientId || "",

      type: creative.type || "",

      title: creative.title || "",

      imageUrl: imageUrl || "",

      instagramUrl: creative.instagramUrl || "",

      websiteUrl: creative.websiteUrl || "",

      logoUrl: logoUrl || "",

      uploadedAt: new Date().toISOString(),
    };

    const docRef = await addDoc(collection(db, "creatives"), creativeData);

    return {
      ...creativeData,
      id: docRef.id,
    };
  } catch (error) {
    console.log(error);

    throw error;
  }
};

// ==============================
// GET CREATIVES
// ==============================
export const getCreatives = async (): Promise<Creative[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, "creatives"));

    return querySnapshot.docs.map((doc) => ({
      ...(doc.data() as Creative),
      id: doc.id,
    }));
  } catch (error) {
    console.log("Get Creative Error:", error);
    return [];
  }
};

// ==============================
// DELETE CREATIVE
// ==============================
export const deleteCreative = async (id: string) => {
  try {
    await deleteDoc(doc(db, "creatives", id));
  } catch (error) {
    console.log("Delete Creative Error:", error);

    throw error;
  }
};
