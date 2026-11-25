import { useEffect, useState } from "react";
import { collection, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import { db } from "../../config/firebase/firebase";
import { todayStr } from "../../service/attendanceGate";
import {
  canReCheckIn,
  fmtIST,
  reCheckInPatch,
  toMs,
  type DayInput,
} from "../../utils/types/AttendanceRules";

type DayDoc = DayInput & { ref: ReturnType<typeof import("firebase/firestore").doc> };

/**
 * Shows only after check-out. Checking in again keeps the original check-in,
 * clears the check-out, and records the gap as a deducted "out" break.
 */
const ReCheckInCard = ({ uid }: { uid: string }) => {
  const [day, setDay] = useState<DayDoc | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const q = query(
      collection(db, "attendance"),
      where("uid", "==", uid),
      where("date", "==", todayStr())
    );
    return onSnapshot(
      q,
      (snap) => {
        const d = snap.docs[0];
        setDay(d ? ({ ...(d.data() as DayInput), ref: d.ref } as DayDoc) : null);
      },
      () => setDay(null)
    );
  }, [uid]);

  // only after a check-out
  if (!day || toMs(day.checkOut) === null) return null;

  const check = canReCheckIn(day);

  const go = async () => {
    setErr("");
    setBusy(true);
    try {
      await updateDoc(day.ref, reCheckInPatch(day));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not check in. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full min-w-0 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3 sm:p-5">
      <p className="break-words text-sm font-medium text-amber-100">
        You checked out at {fmtIST(toMs(day.checkOut)!)}.
      </p>
      <p className="mt-1 text-xs leading-relaxed text-amber-200/80">
        Checked out by mistake? Check in again. The time you were out is counted as a break
        and is not paid.
      </p>

      {check.ok ? (
        // full-width on phones for an easy tap; natural width from sm up
        <button
          onClick={go}
          disabled={busy}
          className="mt-3 min-h-11 w-full rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60 sm:w-auto"
        >
          {busy ? "Checking in…" : "Check in again"}
        </button>
      ) : (
        <p className="mt-3 break-words text-xs text-amber-200">{check.reason}</p>
      )}

      {err && (
        <p role="alert" className="mt-2 break-words text-xs text-red-300">
          {err}
        </p>
      )}
    </div>
  );
};

export default ReCheckInCard;