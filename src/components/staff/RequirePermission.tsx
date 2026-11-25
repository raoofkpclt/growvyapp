import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { auth } from "../../config/firebase/firebase";
import { getStaff } from "../../service/staffService";
// adjust this path to wherever your Role / Permission file lives
import { hasPermission, type Permission } from "../../utils/types/staffRoles";

type StaffRecord = Awaited<ReturnType<typeof getStaff>>;

/** Loads the signed-in staff record once. */
export const useStaff = () => {
  const uid = auth.currentUser?.uid;
  const [staff, setStaff] = useState<StaffRecord | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!uid) {
      setReady(true);
      return;
    }
    getStaff(uid)
      .then(setStaff)
      .catch(() => setStaff(null))
      .finally(() => setReady(true));
  }, [uid]);

  return { staff, ready };
};

/**
 * Route guard. Pass one permission or several (any one is enough).
 *
 * <RequirePermission any={["clients.view"]}> <ClientsPage /> </RequirePermission>
 */
export const RequirePermission = ({
  any,
  children,
  redirectTo = "/",
}: {
  any: Permission[];
  children: ReactNode;
  redirectTo?: string;
}) => {
  const { staff, ready } = useStaff();

  if (!ready) {
    return <div className="h-40 animate-pulse rounded-2xl border border-white/5 bg-white/[0.03]" />;
  }
  const allowed = any.some((p) => hasPermission(staff, p));
  return allowed ? <>{children}</> : <Navigate to={redirectTo} replace />;
};

/**
 * Inside a page: show edit/add/delete controls only when allowed.
 *
 * const { canManage } = useModuleAccess("bills");
 * {canManage && <button>Add bill</button>}
 */
export const useModuleAccess = (
  module: "clients" | "plans" | "works" | "bills" | "accounts" | "staff"
) => {
  const { staff, ready } = useStaff();
  return {
    ready,
    canView: hasPermission(staff, `${module}.view` as Permission),
    canManage: hasPermission(staff, `${module}.manage` as Permission),
  };
};