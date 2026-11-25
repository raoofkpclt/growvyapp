import { useState } from "react";
import { auth } from "../../config/firebase/firebase";
import { listStaff, type Staff } from "../../service/staffService";
import { hasPermission } from "../../utils/types/staffRoles";
import { useLoad } from "../admin/Modal/Ui";
import PayrollPanel from "../staff/PayrollPanel";
import PayslipsPanel from "../staff/PayslipsPanel";

type Tab = "payroll" | "payslips";
const TABS: { id: Tab; label: string }[] = [
  { id: "payroll", label: "Payroll" },
  { id: "payslips", label: "Payslips" },
];

/**
 * Payroll page: only the HR manager and the main admin.
 *   HR tab:       <PayrollManagement />
 *   Admin page:   <PayrollManagement isAdmin />
 */
const PayrollManagement = ({ isAdmin = false }: { isAdmin?: boolean }) => {
  const [tab, setTab] = useState<Tab>("payroll");

  const me = auth.currentUser;
  const staff = useLoad(() => listStaff(), [], [] as Staff[]);
  const mine = staff.data.find((s) => s.uid === me?.uid);
  const viewer = {
    uid: me?.uid ?? "admin",
    name: mine?.name ?? me?.displayName ?? me?.email ?? "Admin",
  };

  // read from the staff record (same "payroll.manage" permission your menu uses),
  // so a wrong link can't open this page
  const allowed = isAdmin || (!!mine && hasPermission(mine, "payroll.manage"));

  if (!allowed) {
    return (
      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 text-center sm:p-8">
        <p className="text-sm text-zinc-300">
          {staff.loading
            ? "Checking access…"
            : "Only the HR manager and main admin can open this page."}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-5 sm:space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white sm:text-xl">Payroll</h2>
        <p className="text-sm text-zinc-500">
          Manage monthly payroll. Marking a month as paid sends the payslip to the staff.
        </p>
      </div>

      <div className="flex w-full gap-1 overflow-x-auto rounded-xl border border-white/5 bg-white/[0.03] p-1 sm:w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id ? "page" : undefined}
            className={`min-h-10 flex-1 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors sm:flex-none ${
              tab === t.id
                ? "bg-violet-500/15 text-violet-300"
                : "text-zinc-500 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "payroll" && <PayrollPanel viewer={viewer} canManage />}
      {tab === "payslips" && <PayslipsPanel viewer={viewer} scope="all" />}
    </div>
  );
};

export default PayrollManagement;