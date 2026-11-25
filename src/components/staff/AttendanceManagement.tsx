import { useState } from "react";
import { auth } from "../../config/firebase/firebase";
import { listStaff, type Staff } from "../../service/staffService";
import { hasPermission } from "../../utils/types/staffRoles";
import AttendanceAdjustPanel from "../admin/Modal/AttendanceAdjustPanel";
import AttendancePanel from "../admin/AttendancePanel";
import LeavePanel from "../admin/Modal/LeavePanel";
import { useLoad } from "../admin/Modal/Ui";
import { WorkHoursCard } from "./StaffDashboard"; // adjust path: the file that holds WorkHoursCard
import HolidayPanel from "./HolidayPanel";

/**
 * Attendance page (payroll is a separate page), with tabs by `level`.
 * The work-hours timer (check in / out / in again) shows at the top of every tab.
 *
 *  hr_manager → Attendance (all staff), My attendance, Adjust, Leave
 *  operations → Team attendance (all staff), My attendance, My leave
 *  staff      → My attendance, My leave
 *
 *   HR tab:          <AttendanceManagement level="hr_manager" />
 *   Main admin:      <AttendanceManagement level="hr_manager" isAdmin />
 *   Operations tab:  <AttendanceManagement level="operations" />
 *   Other staff:     <AttendanceManagement level="staff" />
 */
export type Level = "hr_manager" | "operations" | "staff";
type Tab = "team" | "mine" | "myLeave" | "adjust" | "leave" | "holidays";

const TABS: Record<Level, { id: Tab; label: string }[]> = {
  hr_manager: [
    { id: "team", label: "Attendance" },
    { id: "mine", label: "My attendance" },
    { id: "adjust", label: "Adjust" },
    { id: "leave", label: "Leave" },
    { id: "holidays", label: "Holidays" },
  ],
  operations: [
    { id: "team", label: "Team attendance" },
    { id: "mine", label: "My attendance" },
    { id: "myLeave", label: "My leave" },
    { id: "holidays", label: "Holidays" },
  ],
  staff: [
    { id: "mine", label: "My attendance" },
    { id: "myLeave", label: "My leave" },
    { id: "holidays", label: "Holidays" },
  ],
};

const AttendanceManagement = ({
  level = "staff",
  isAdmin = false,
}: {
  level?: Level;
  /** pass true from the main admin dashboard */
  isAdmin?: boolean;
}) => {
  const tabs = TABS[level];
  const [tab, setTab] = useState<Tab>(tabs[0].id);

  // the real logged-in person (regular staff don't need the staff list)
  const me = auth.currentUser;
  const staff = useLoad(
    () => (level === "staff" ? Promise.resolve([] as Staff[]) : listStaff()),
    [level],
    [] as Staff[]
  );
  const mine = staff.data.find((s) => s.uid === me?.uid);
  const viewer = {
    uid: me?.uid ?? "admin",
    name: mine?.name ?? me?.displayName ?? me?.email ?? "Admin",
  };

  // Attendance management is only for the main admin and people with the
  // "payroll.manage" permission (the HR Manager role has it, and so does custom access).
  const allowed =
    level !== "hr_manager" || isAdmin || hasPermission(mine, "payroll.manage");

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
    <div className="min-w-0 space-y-4 sm:space-y-6">
      {/* work-hours timer: check in, check out, check in again */}
      {me && <WorkHoursCard uid={viewer.uid} name={viewer.name} />}

      {/* tabs: scroll sideways on phones when there are many, stretch to fill when they fit */}
      <div className="max-w-full overflow-x-auto rounded-xl border border-white/5 bg-white/[0.03] p-1 sm:w-fit">
        <div className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? "page" : undefined}
              className={`shrink-0 flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-[13px] font-medium transition-colors sm:flex-none sm:px-4 sm:text-sm ${
                tab === t.id
                  ? "bg-violet-500/15 text-violet-300"
                  : "text-zinc-500 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* everyone's attendance: HR and operations */}
      {tab === "team" && (
        <div className="min-w-0">
          <AttendancePanel viewer={viewer} scope="all" />
        </div>
      )}

      {/* the person's own attendance history (the 9 hours include lunch and tea) */}
      {tab === "mine" && (
        <div className="min-w-0">
          <AttendancePanel viewer={viewer} scope="own" />
        </div>
      )}

      {tab === "myLeave" && (
        <div className="min-w-0">
          <LeavePanel viewer={viewer} scope="own" />
        </div>
      )}

      {/* closed days: everyone can view, HR manager and main admin can edit */}
      {tab === "holidays" && (
        <div className="min-w-0">
          <HolidayPanel viewer={viewer} canManage={level === "hr_manager"} />
        </div>
      )}

      {/* HR manager and main admin only */}
      {level === "hr_manager" && tab === "adjust" && (
        <div className="min-w-0">
          <AttendanceAdjustPanel viewer={viewer} />
        </div>
      )}
      {level === "hr_manager" && tab === "leave" && (
        <div className="min-w-0">
          <LeavePanel viewer={viewer} scope="all" canManage />
        </div>
      )}
    </div>
  );
};

export default AttendanceManagement;