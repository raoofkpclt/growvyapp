import { collection, getDocs, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../config/firebase/firebase";

// local date, not toISOString(), which is UTC and breaks around midnight in India
export const todayStr = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

// ADAPT THIS to your attendance collection
const attendanceQuery = (uid: string) =>
  query(
    collection(db, "attendance"),
    where("uid", "==", uid),
    where("date", "==", todayStr())
  );

const isOpen = (docs: { data: () => any }[]) =>
  docs.some((d) => d.data().checkIn && !d.data().checkOut);

/** One-time check, used to guard Start on the server side of the flow */
export async function isCheckedIn(uid: string) {
  const snap = await getDocs(attendanceQuery(uid));
  return isOpen(snap.docs);
}

/** Live check: the Start button enables/disables instantly on check-in/out */
export const subscribeCheckedIn = (uid: string, cb: (v: boolean) => void) =>
  onSnapshot(
    attendanceQuery(uid),
    (snap) => cb(isOpen(snap.docs)),
    () => cb(false)
  );