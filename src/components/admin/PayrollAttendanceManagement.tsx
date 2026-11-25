import { useState } from "react";
import { auth } from "../../config/firebase/firebase";
import { listStaff, type Staff } from "../../service/staffService";
import { hasPermission } from "../../utils/types/staffRoles";
import AttendanceAdjustPanel from "../admin/Modal/AttendanceAdjustPanel";
import AttendancePanel from "../admin/AttendancePanel";
import LeavePanel from "../admin/Modal/LeavePanel";
import { useLoad } from "../admin/Modal/Ui";
import BreakControls from "../staff/BreakControls"; // adjust path
import HolidayPanel from "../staff/HolidayPanel"; // adjust path
import PayrollPanel from "../staff/PayrollPanel";
import PayslipsPanel from "../staff/PayslipsPanel"; // adjust path to where you saved it

/**
 * Tabs depend on `level`:
 *
 *  hr_manager → Attendance, My attendance, Adjust, Leave, Holidays, Payroll, Payslips, My payslips
 *               allowed for: main admin, or staff with "payroll.manage"
 *  operations → Team attendance, My attendance, My leave, Holidays, My payslips
 *               allowed for: main admin, or staff with "attendance.all"
 *  staff      → My attendance, My leave, Holidays, My payslips (everyone)
 *
 * Holidays: everyone can view the calendar (Sundays, 2nd Saturdays and special days).
 * Only the HR manager level (HR manager and main admin) can add or remove special days.
 *
 * The main admin (isAdmin) is not a staff member, so the "my ..." tabs
 * (My attendance, My leave, My payslips) are hidden for the admin.
 *
 * `only` splits the hr_manager page into two separate pages:
 *   <PayrollAttendanceManagement level="hr_manager" isAdmin only="attendance" />
 *   <PayrollAttendanceManagement level="hr_manager" isAdmin only="payroll" />
 * "payroll" shows: Payroll, Payslips, My payslips.
 * "attendance" shows everything else, including Holidays.
 * Without `only`, you get every tab on one page.
 */
export type Level = "hr_manager" | "operations" | "staff";
type Tab =
  | "team"
  | "mine"
  | "myLeave"
  | "adjust"
  | "leave"
  | "holidays"
  | "payroll"
  | "payslips"
  | "myPayslips";
type Only = "attendance" | "payroll";

const PAYROLL_TABS: Tab[] = ["payroll", "payslips", "myPayslips"];

// personal tabs: the main admin has none of these
const ADMIN_HIDDEN: Tab[] = ["mine", "myLeave", "myPayslips"];

const TABS: Record<Level, { id: Tab; label: string }[]> = {
  hr_manager: [
    { id: "team", label: "Attendance" },
    { id: "mine", label: "My attendance" },
    { id: "adjust", label: "Adjust" },
    { id: "leave", label: "Leave" },
    { id: "holidays", label: "Holidays" },
    { id: "payroll", label: "Payroll" },
    { id: "payslips", label: "Payslips" },
    { id: "myPayslips", label: "My payslips" },
  ],
  operations: [
    { id: "team", label: "Team attendance" },
    { id: "mine", label: "My attendance" },
    { id: "myLeave", label: "My leave" },
    { id: "holidays", label: "Holidays" },
    { id: "myPayslips", label: "My payslips" },
  ],
  staff: [
    { id: "mine", label: "My attendance" },
    { id: "myLeave", label: "My leave" },
    { id: "holidays", label: "Holidays" },
    { id: "myPayslips", label: "My payslips" },
  ],
};

const TITLES: Record<Level, { title: string; subtitle: string }> = {
  hr_manager: {
    title: "Payroll & Attendance",
    subtitle:
      "Track attendance and leave, manage holidays, adjust days, run monthly payroll and payslips.",
  },
  operations: {
    title: "Attendance",
    subtitle: "See the team's attendance, and manage your own attendance, leave and payslips.",
  },
  staff: {
    title: "My attendance",
    subtitle: "Check in, take your breaks, apply for leave and view your payslips.",
  },
};

const ONLY_TITLES: Record<Only, { title: string; subtitle: string }> = {
  attendance: {
    title: "Attendance",
    subtitle: "Track attendance and leave, manage holidays, and adjust attendance days.",
  },
  payroll: {
    title: "Payroll",
    subtitle: "Manage monthly payroll and send payslips to your team.",
  },
};

const DENIED: Record<Level, string> = {
  hr_manager: "Only the HR manager and main admin can open this page.",
  operations: "Only managers with team attendance access and the main admin can open this page.",
  staff: "",
};

const PayrollAttendanceManagement = ({
  level = "hr_manager",
  isAdmin = false,
  only,
}: {
  level?: Level;
  /** pass true from the main admin dashboard (the admin is not in the staff list) */
  isAdmin?: boolean;
  /** show just the attendance part or just the payroll part (hr_manager only) */
  only?: Only;
}) => {
  // the main admin has no personal attendance, leave or payslips
  const allTabs = TABS[level].filter((t) => !(isAdmin && ADMIN_HIDDEN.includes(t.id)));
  const filtered =
    level !== "hr_manager" || !only
      ? allTabs
      : only === "payroll"
      ? allTabs.filter((t) => PAYROLL_TABS.includes(t.id))
      : allTabs.filter((t) => !PAYROLL_TABS.includes(t.id));
  const tabs = filtered.length ? filtered : allTabs;

  const [picked, setTab] = useState<Tab>(tabs[0].id);
  // if the props change and the picked tab is no longer on this page, fall back to the first one
  const tab: Tab = tabs.some((t) => t.id === picked) ? picked : tabs[0].id;

  // the real logged-in person (regular staff don't need the staff list)
  const me = auth.currentUser;
  const staff = useLoad(
    () => (level === "staff" ? Promise.resolve([] as Staff[]) : listStaff()),
    [level],
    [] as Staff[]
  );
  const myStaff = staff.data.find((s) => s.uid === me?.uid);

  const viewer = {
    uid: me?.uid ?? "Admin",
    name: myStaff?.name ?? me?.displayName ?? me?.email ?? "Admin",
  };

  // Access comes from permissions (so custom access set in Staff Management works),
  // not from a role name. A disabled staff account never gets in.
  const disabled = myStaff?.active === false;
  const canHr = isAdmin || hasPermission(myStaff, "payroll.manage");
  const canTeam = isAdmin || hasPermission(myStaff, "attendance.all");
  const allowed =
    !disabled && (level === "staff" || (level === "hr_manager" ? canHr : canTeam));

  if (!allowed) {
    return (
      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 text-center sm:p-8">
        <p className="break-words text-sm text-zinc-300">
          {staff.loading
            ? "Checking access…"
            : disabled
            ? "This account is disabled."
            : DENIED[level]}
        </p>
      </div>
    );
  }

  const { title, subtitle } =
    level === "hr_manager" && only ? ONLY_TITLES[only] : TITLES[level];
  const isHr = level === "hr_manager";

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white sm:text-xl">{title}</h2>
        <p className="mt-0.5 text-xs text-zinc-500 sm:text-sm">{subtitle}</p>
      </div>

      {/* tab bar (hidden when the page has just one tab).
          Few tabs share the width on phones; many tabs swipe sideways and the tapped one centres. */}
      {tabs.length > 1 && (
        <div
          role="tablist"
          aria-label={title}
          className="flex w-full max-w-full snap-x gap-1 overflow-x-auto rounded-xl border border-white/5 bg-white/[0.03] p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:w-fit"
        >
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={(e) => {
                setTab(t.id);
                e.currentTarget.scrollIntoView({
                  behavior: "smooth",
                  inline: "center",
                  block: "nearest",
                });
              }}
              className={`min-h-10 shrink-0 grow snap-center whitespace-nowrap rounded-lg px-3.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 sm:grow-0 sm:px-4 ${
                tab === t.id
                  ? "bg-violet-500/15 text-violet-300"
                  : "text-zinc-500 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* min-w-0 lets wide tables inside the panels scroll in their own box instead of widening the page */}
      <div className="min-w-0">
        {/* everyone's attendance: HR, operations and admin */}
        {tab === "team" && <AttendancePanel viewer={viewer} scope="all" />}

        {/* the person's own attendance, with the lunch / tea break buttons (not for admin) */}
        {!isAdmin && tab === "mine" && (
          <div className="space-y-4 sm:space-y-5">
            <BreakControls uid={viewer.uid} />
            <AttendancePanel viewer={viewer} scope="own" />
          </div>
        )}

        {!isAdmin && tab === "myLeave" && <LeavePanel viewer={viewer} scope="own" />}

        {/* closed days: everyone can view, HR manager and main admin can edit */}
        {tab === "holidays" && <HolidayPanel viewer={viewer} canManage={isHr} />}

        {/* my own payslips: staff, operations and HR managers (not admin) */}
        {!isAdmin && tab === "myPayslips" && <PayslipsPanel viewer={viewer} scope="own" />}

        {/* HR manager and admin only */}
        {isHr && tab === "adjust" && <AttendanceAdjustPanel viewer={viewer} />}
        {isHr && tab === "leave" && <LeavePanel viewer={viewer} scope="all" canManage />}
        {isHr && tab === "payroll" && <PayrollPanel viewer={viewer} canManage />}
        {isHr && tab === "payslips" && <PayslipsPanel viewer={viewer} scope="all" />}
      </div>
    </div>
  );
};

export default PayrollAttendanceManagement;