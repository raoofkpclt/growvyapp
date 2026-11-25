import { deleteApp, initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  sendPasswordResetEmail,
  signOut,
} from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import type { Permission, Role } from "../utils/types/staffRoles";
import type { IdProofType } from "../utils/types/staffId";
import { auth, db } from "../config/firebase/firebase"; // must export auth + db

const COL = "staff";

/* ───────────── Types ───────────── */
export type Staff = {
  uid: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  active: boolean;
  salary: number; // monthly, INR
  permissions: Permission[] | null; // null = use role defaults
  photoUrl: string;
  idProofType: IdProofType | "";
  idProofNumber: string;
  idProofFrontUrl: string;
  idProofBackUrl: string;
};

export type StaffExtras = {
  photoUrl: string;
  idProofType: IdProofType | "";
  idProofNumber: string;
  idProofFrontUrl: string;
  idProofBackUrl: string;
};

export type NewStaff = {
  name: string;
  email: string;
  phone: string;
  role: Role;
  salary: number;
  password: string;
  permissions?: Permission[] | null;
} & StaffExtras;

export type StaffUpdate = {
  name: string;
  phone: string;
  role: Role;
  salary: number;
  permissions: Permission[] | null;
} & StaffExtras;

const toStaff = (id: string, d: Record<string, any>): Staff => ({
  uid: id,
  name: d.name ?? "",
  email: d.email ?? "",
  phone: d.phone ?? "",
  role: d.role,
  active: d.active !== false,
  salary: Number(d.salary) || 0,
  permissions: Array.isArray(d.permissions) ? d.permissions : null,
  photoUrl: d.photoUrl ?? "",
  idProofType: d.idProofType ?? "",
  idProofNumber: d.idProofNumber ?? "",
  idProofFrontUrl: d.idProofFrontUrl ?? "",
  idProofBackUrl: d.idProofBackUrl ?? "",
});

/* ───────────── Reads ───────────── */
export async function listStaff(): Promise<Staff[]> {
  const snap = await getDocs(query(collection(db, COL), orderBy("name")));
  return snap.docs.map((d) => toStaff(d.id, d.data()));
}

export async function getStaff(uid: string): Promise<Staff | null> {
  const snap = await getDoc(doc(db, COL, uid));
  return snap.exists() ? toStaff(snap.id, snap.data()) : null;
}

/* ───────────── Create ───────────── */
/**
 * Creates the Auth user on a SECONDARY Firebase app so the admin
 * does not get signed out, then writes the profile with the admin's session.
 * If the profile write fails, the new login is removed so no orphan is left.
 */
export async function createStaff(input: NewStaff): Promise<string> {
  const secondary = initializeApp(auth.app.options, `staff-create-${Date.now()}`);
  try {
    const secAuth = getAuth(secondary);
    const cred = await createUserWithEmailAndPassword(
      secAuth,
      input.email.trim(),
      input.password
    );

    try {
      await setDoc(doc(db, COL, cred.user.uid), {
        name: input.name.trim(),
        email: input.email.trim().toLowerCase(),
        phone: input.phone.trim(),
        role: input.role,
        salary: input.salary,
        permissions: input.permissions ?? null,
        photoUrl: input.photoUrl,
        idProofType: input.idProofType,
        idProofNumber: input.idProofNumber.trim().toUpperCase(),
        idProofFrontUrl: input.idProofFrontUrl,
        idProofBackUrl: input.idProofBackUrl,
        active: true,
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      await cred.user.delete().catch(() => {}); // roll back the login
      throw e;
    }

    await signOut(secAuth);
    return cred.user.uid;
  } finally {
    await deleteApp(secondary);
  }
}

/* ───────────── Updates ───────────── */
export const updateStaffRole = (uid: string, role: Role) =>
  updateDoc(doc(db, COL, uid), { role });

export const updateStaffSalary = (uid: string, salary: number) =>
  updateDoc(doc(db, COL, uid), { salary });

export const setStaffActive = (uid: string, active: boolean) =>
  updateDoc(doc(db, COL, uid), { active });

export const sendStaffPasswordReset = (email: string) =>
  sendPasswordResetEmail(auth, email);

export const updateStaff = (uid: string, data: StaffUpdate) =>
  updateDoc(doc(db, COL, uid), {
    name: data.name.trim(),
    phone: data.phone.trim(),
    role: data.role,
    salary: data.salary,
    permissions: data.permissions,
    photoUrl: data.photoUrl,
    idProofType: data.idProofType,
    idProofNumber: data.idProofNumber.trim().toUpperCase(),
    idProofFrontUrl: data.idProofFrontUrl,
    idProofBackUrl: data.idProofBackUrl,
  });

/* ───────────── Delete ───────────── */
/** Removes the staff profile. The Firebase Auth login itself can't be deleted from the client. */
export const deleteStaff = (uid: string) => deleteDoc(doc(db, COL, uid));