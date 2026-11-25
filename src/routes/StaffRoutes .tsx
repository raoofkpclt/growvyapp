import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../config/firebase/firebase";

type Status = "loading" | "staff" | "none";

/** Resolves to "staff" only when signed in AND a staff/{uid} document exists */
const useStaffStatus = (): Status => {
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return setStatus("none");
      try {
        const snap = await getDoc(doc(db, "staff", user.uid));
        setStatus(snap.exists() ? "staff" : "none");
      } catch {
        setStatus("none");
      }
    });
    return unsub;
  }, []);

  return status;
};

const Loader = () => (
  <div className="min-h-screen bg-[#080a0e] flex items-center justify-center">
    <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-blue-400 animate-spin" />
  </div>
);

/** Only staff can see these routes */
export const StaffProtectRoute = () => {
  const status = useStaffStatus();
  if (status === "loading") return <Loader />;
  return status === "staff" ? <Outlet /> : <Navigate to="/staff/login" replace />;
};

/** Login/register: signed-in staff get sent to their home */
export const StaffPublicRoute = () => {
  const status = useStaffStatus();
  if (status === "loading") return <Loader />;
  return status === "staff" ? <Navigate to="/staff" replace /> : <Outlet />;
};