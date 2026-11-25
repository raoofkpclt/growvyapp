import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "../../config/firebase/firebase";
import { getStaff, type Staff } from "../../service/staffService";
import { hasPermission, ROLE_LABELS } from "../../utils/types/staffRoles";
import TasksPanel from "../../components/admin/TasksPanel";
import AttendanceManagement, {
  type Level,
} from "../../components/staff/AttendanceManagement";
import PayrollManagement from "../../components/staff/PayrollManagement";
import MyPayslips from "../../components/staff/MyPayslips";
import StaffProfile from "../../components/staff/StaffProfile";
import NotificationBell from "../../components/staff/NotificationBel";
import NotificationsPage from "../../components/staff/NotificationsPage";
import StaffDashboard from "../../components/staff/StaffDashboard"; // adjust path to where your dashboard file is
import StaffManagement from "../../components/admin/StaffManagement"; // adjust path to where your StaffManagement file is
import AccountsManagement from "../../components/admin/AccountManagement"; // adjust path to where your AccountsManagement file is
import WorkManagement from "../../components/admin/WorkManagement"; // adjust path to where your WorkManagement file is
import ClientManagement from "../../components/admin/ClientManagement"; // adjust path to where your ClientManagement file is
import PlanManagement from "../../components/admin/PlanManagement"; // adjust path to where your PlanManagement file is
import { useLoad } from "../../components/admin/Modal/Ui";

// ─── Types & icons (same icons as the admin Home) ─────────────────────────────
type TabId =
  | "dashboard"
  | "notifications"
  | "attendance"
  | "payroll"
  | "payslips"
  | "task"
  | "works"
  | "clients"
  | "plans"
  | "staff"
  | "accounting"
  | "profile";

const Icon = ({ d, className = "w-5 h-5" }: { d: string; className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    className={`${className} shrink-0`}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.7}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
);

const LOGOUT_ICON =
  "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9";
const MENU_ICON = "M3 6h18M3 12h18M3 18h18";

const ICONS = {
  dashboard: "M3 12l9-9 9 9M5 10v10h14V10",
  notifications: "M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0",
  clients:
    "M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM22 21v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8",
  plans:
    "M8 2v4M16 2v4M3 8h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2zM8 14h3M8 18h6",
  works: "M3 7h18v13H3zM8 7V4h8v3",
  payslips: "M6 2h12v20l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6",
  staff:
    "M17 21v-2a4 4 0 00-3-3.9M9 11a4 4 0 100-8 4 4 0 000 8zM3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2M16 3.1a4 4 0 010 7.8",
  attendance: "M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2",
  payroll: "M3 7h18v12H3zM3 11h18M16 15h2",
  task: "M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11",
  accounts: "M3 5h18v14H3zM3 10h18M7 15h4M16 14h2",
  profile: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
};

type NavItem = {
  id: TabId;
  label: string;
  subtitle: string;
  icon: string;
  /** reachable (e.g. from the bell) but not drawn in the sidebar */
  hidden?: boolean;
};

// ─── Remember the open page, so a browser refresh stays on it ─────────────────
const TAB_IDS: TabId[] = [
  "dashboard",
  "notifications",
  "attendance",
  "payroll",
  "payslips",
  "task",
  "works",
  "clients",
  "plans",
  "staff",
  "accounting",
  "profile",
];

const tabKey = (uid: string) => `growvy-staff-tab-${uid}`;

const readTab = (uid: string): TabId => {
  try {
    const saved = localStorage.getItem(tabKey(uid)) as TabId | null;
    return saved && TAB_IDS.includes(saved) ? saved : "dashboard";
  } catch {
    return "dashboard";
  }
};

// ─── Main component ───────────────────────────────────────────────────────────
const StaffHome = () => {
  const navigate = useNavigate();
  const uid = auth.currentUser!.uid;
  const me = useLoad(() => getStaff(uid), [uid], null as Staff | null);

  const [tab, setTab] = useState<TabId>(() => readTab(uid));
  // Desktop only: expanded / collapsed.
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // Phones: the sidebar is a slide-in drawer opened from the menu button.
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const staff = me.data;

  // disabled accounts get kicked out
  useEffect(() => {
    if (staff && !staff.active) signOut(auth).then(() => navigate("/staff/login"));
  }, [staff, navigate]);

  // start every section at the top of the page
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [tab]);

  // remember the open page for the next refresh
  useEffect(() => {
    try {
      localStorage.setItem(tabKey(uid), tab);
    } catch {
      /* ignore */
    }
  }, [tab, uid]);

  // drawer: Escape closes it, and the page behind it doesn't scroll while it is open
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen]);

  if (!staff) {
    return <div className="min-h-screen bg-[#080a0e] text-zinc-500 p-8">Loading…</div>;
  }

  const viewer = { uid, name: staff.name };

  // What this person can open in Attendance. HR manager gets attendance management,
  // managers get team attendance, everyone else gets their own attendance and leave.
  const canPayroll = hasPermission(staff, "payroll.manage");
  const level: Level = canPayroll
    ? "hr_manager"
    : hasPermission(staff, "attendance.all")
    ? "operations"
    : "staff";

  // board members and the CEO have no attendance, so no menu item either
  const canAttendance =
    hasPermission(staff, "attendance.own") ||
    hasPermission(staff, "attendance.all");
  const canWork = hasPermission(staff, "tasks.own") || hasPermission(staff, "tasks.all");

  // Staff management: HR (and anyone given staff access) can open it
  const canStaff =
    hasPermission(staff, "staff.view") ||
    hasPermission(staff, "staff.create") ||
    hasPermission(staff, "staff.manage");

  // Accounts: view = read only, manage = add / edit / delete transactions
  const canAccounts =
    hasPermission(staff, "accounts.view") ||
    hasPermission(staff, "accounts.manage");

  // Works: view = see only, manage = upload / delete
  const canWorks =
    hasPermission(staff, "works.view") || hasPermission(staff, "works.manage");
  const canManageWorks = hasPermission(staff, "works.manage");

  // Clients: view = read only, manage = add / edit / delete
  const canClients =
    hasPermission(staff, "clients.view") || hasPermission(staff, "clients.manage");
  const canManageClients = hasPermission(staff, "clients.manage");

  // Plans: view = read only, manage = create / edit / pause / extend plans, update posting, create invoices
  const canPlans =
    hasPermission(staff, "plans.view") || hasPermission(staff, "plans.manage");
  const canManagePlans = hasPermission(staff, "plans.manage");

  const navItems: NavItem[] = [
    {
      id: "dashboard",
      label: "Dashboard",
      subtitle: "Overview of your work",
      icon: ICONS.dashboard,
    },
    // opened from the bell ("View all notifications"), not shown in the sidebar
    {
      id: "notifications",
      label: "Notifications",
      subtitle: "Task alerts and history",
      icon: ICONS.notifications,
      hidden: true,
    },
    ...(canAttendance
      ? [
          {
            id: "attendance" as TabId,
            label: "Attendance",
            subtitle: "Attendance and leave",
            icon: ICONS.attendance,
          },
        ]
      : []),
    ...(canWork
      ? [
          {
            id: "task" as TabId,
            label: "Tasks",
            subtitle: "Your tasks and progress",
            icon: ICONS.task,
          },
        ]
      : []),
    ...(canClients
      ? [
          {
            id: "clients" as TabId,
            label: "Clients",
            subtitle: canManageClients ? "Manage clients" : "View clients",
            icon: ICONS.clients,
          },
        ]
      : []),
    ...(canPlans
      ? [
          {
            id: "plans" as TabId,
            label: "Plans",
            subtitle: canManagePlans
              ? "Client plans, content and renewals"
              : "View client plans",
            icon: ICONS.plans,
          },
        ]
      : []),
    ...(canWorks
      ? [
          {
            id: "works" as TabId,
            label: "Works",
            subtitle: canManageWorks ? "Manage creatives" : "View creatives",
            icon: ICONS.works,
          },
        ]
      : []),
    ...(canStaff
      ? [
          {
            id: "staff" as TabId,
            label: "Staff",
            subtitle: "Manage staff",
            icon: ICONS.staff,
          },
        ]
      : []),
    ...(canPayroll
      ? [
          {
            id: "payroll" as TabId,
            label: "Payroll",
            subtitle: "Monthly payroll",
            icon: ICONS.payroll,
          },
        ]
      : []),
    ...(canAccounts
      ? [
          {
            id: "accounting" as TabId,
            label: "Accounting",
            subtitle: "Accounts and transactions",
            icon: ICONS.accounts,
          },
        ]
      : []),
    {
      id: "profile",
      label: "Profile",
      subtitle: "Your details and password",
      icon: ICONS.profile,
    },
    {
      id: "payslips",
      label: "Payslips",
      subtitle: "View and download payslips",
      icon: ICONS.payslips,
    },
  ];

  // if the saved page isn't available to this person, fall back to the dashboard
  const activeItem = navItems.find((n) => n.id === tab) ?? navItems[0];

  const attScope = hasPermission(staff, "tasks.all") ? "all" : "own";

  // switch page and close the phone drawer
  const goTo = (id: TabId) => {
    setTab(id);
    setMobileOpen(false);
  };

  // clicking a notification takes the person to the Tasks page (if they have one)
  const openFromNotification = () => {
    if (canWork) setTab("task");
  };

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      // next login starts on the dashboard again
      try {
        localStorage.removeItem(tabKey(uid));
      } catch {
        /* ignore */
      }
      await signOut(auth);
      navigate("/staff/login");
    } catch (error) {
      console.log("Logout Error", error);
    } finally {
      setLoggingOut(false);
    }
  };

  // On phones the drawer always shows labels. On desktop, labels hide when collapsed.
  const labelCls = sidebarOpen ? "" : "md:hidden";
  const rowAlign = sidebarOpen ? "justify-start" : "justify-start md:justify-center";

  return (
    <div className="min-h-screen bg-[#080a0e] font-['DM_Sans',sans-serif] flex text-white">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=Syne:wght@600;700;800&display=swap');
        * { box-sizing: border-box; }
        .font-display { font-family: 'Syne', sans-serif; }
        /* no "forwards": once finished, no transform is left on the page wrapper */
        @keyframes fade-in { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
        .animate-fade-in { animation: fade-in 0.25s ease; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #ffffff18; border-radius: 99px; }
        @media (prefers-reduced-motion: reduce) {
          .animate-fade-in { animation: none; }
        }
      `}</style>

      {/* ── Phone drawer backdrop ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar: slide-in drawer on phones, sticky column from md up ── */}
      <aside
        style={{ height: "100dvh" }}
        className={`fixed inset-y-0 left-0 z-40 w-64 shrink-0 flex flex-col
        bg-gradient-to-b from-[#0d0f15] to-[#0a0c11] border-r border-white/5
        transition-[transform,width] duration-300 ease-out
        ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        md:sticky md:top-0 md:z-30 md:translate-x-0 md:self-start
        ${sidebarOpen ? "md:w-60" : "md:w-[72px]"}`}
      >
        {/* Brand */}
        <div
          className={`h-16 flex items-center px-4 border-b border-white/5 ${
            sidebarOpen ? "" : "md:justify-center md:px-0"
          }`}
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center font-display font-bold shadow-lg shadow-violet-900/40 shrink-0">
            G
          </div>
          <div className={`ml-3 overflow-hidden ${labelCls}`}>
            <p className="font-display font-bold text-base leading-none">Growvy</p>
            <p className="text-[11px] text-zinc-500 mt-1">Staff panel</p>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/5 hover:text-white md:hidden"
          >
            ✕
          </button>
        </div>

        {/* Nav (scrolls internally on short screens) */}
        <nav className="flex-1 overflow-y-auto overscroll-contain px-3 py-4 md:py-5 space-y-1">
          {navItems
            .filter((item) => !item.hidden)
            .map((item) => {
              const active = activeItem.id === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => goTo(item.id)}
                  title={!sidebarOpen ? item.label : undefined}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                  className={`relative w-full flex items-center gap-3 px-3 py-3 md:py-2.5 rounded-xl text-sm font-medium
                  transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60
                  ${rowAlign}
                  ${
                    active
                      ? "bg-violet-500/10 text-violet-300"
                      : "text-zinc-500 hover:text-zinc-100 hover:bg-white/5"
                  }`}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-violet-500" />
                  )}
                  <Icon d={item.icon} />
                  <span className={`whitespace-nowrap ${labelCls}`}>{item.label}</span>
                </button>
              );
            })}
        </nav>

        {/* ── Sidebar bottom: collapse (desktop only) + logout ── */}
        <div className="p-3 border-t border-white/5 space-y-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            onClick={() => setSidebarOpen((p) => !p)}
            aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            className="hidden md:flex w-full h-9 rounded-xl items-center justify-center gap-2 text-xs text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
          >
            <Icon
              d={sidebarOpen ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"}
              className="w-4 h-4"
            />
            {sidebarOpen && <span>Collapse</span>}
          </button>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            title={!sidebarOpen ? "Log out" : undefined}
            aria-label="Log out"
            className={`w-full flex items-center gap-3 px-3 py-3 md:py-2.5 rounded-xl text-sm font-medium
            text-red-300 bg-red-500/10 border border-red-500/20
            hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-200
            disabled:opacity-60 disabled:cursor-not-allowed
            transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60
            ${rowAlign}`}
          >
            <Icon d={LOGOUT_ICON} />
            <span className={`whitespace-nowrap ${labelCls}`}>
              {loggingOut ? "Logging out…" : "Log out"}
            </span>
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 min-w-0">
        {/* Sticky top bar */}
        <header className="sticky top-0 z-20 h-16 bg-[#080a0e]/80 backdrop-blur-xl border-b border-white/5 px-3 sm:px-4 md:px-8 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            {/* phones: opens the menu drawer */}
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 text-zinc-300 hover:bg-white/5 hover:text-white md:hidden"
            >
              <Icon d={MENU_ICON} />
            </button>
            <div className="min-w-0">
              <h1 className="font-display text-base sm:text-lg font-bold text-white leading-none truncate">
                {activeItem.label}
              </h1>
              <p className="text-xs text-zinc-500 mt-1 truncate">
                {activeItem.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* bell: sound, pop-ups, tab-title count, history list.
                Keep it here so it is mounted on every page. */}
            <NotificationBell
              uid={uid}
              onOpen={openFromNotification}
              onViewAll={() => setTab("notifications")}
            />

            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-medium text-emerald-400">
                Live
              </span>
            </div>

            {/* name + role (staff only) */}
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium leading-none">{staff.name}</p>
              <p className="text-[11px] text-zinc-500 mt-1">
                {ROLE_LABELS[staff.role] ?? "No role"}
              </p>
            </div>

            {/* avatar opens the profile page */}
            <button
              onClick={() => setTab("profile")}
              title="My profile"
              aria-label="Open profile"
              className="w-9 h-9 sm:w-8 sm:h-8 rounded-full overflow-hidden bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-xs font-bold
              hover:ring-2 hover:ring-violet-400/50 transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            >
              {staff.photoUrl ? (
                <img
                  src={staff.photoUrl}
                  alt={staff.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                staff.name.charAt(0).toUpperCase()
              )}
            </button>
          </div>
        </header>

        <div className="px-3 sm:px-5 md:px-8 py-4 sm:py-5 md:py-7 max-w-[1600px] mx-auto">
          {activeItem.id === "dashboard" && <StaffDashboard name={staff.name} />}

          {activeItem.id === "notifications" && (
            <NotificationsPage uid={uid} onOpen={openFromNotification} />
          )}

          {activeItem.id === "clients" && canClients && (
            <ClientManagement canManage={canManageClients} />
          )}

          {activeItem.id === "plans" && canPlans && (
            <PlanManagement canManage={canManagePlans} />
          )}

          {activeItem.id === "works" && canWorks && (
            <WorkManagement canManage={canManageWorks} />
          )}

          {activeItem.id === "staff" && canStaff && <StaffManagement me={staff} />}

          {activeItem.id === "attendance" && <AttendanceManagement level={level} />}

          {activeItem.id === "payroll" && canPayroll && <PayrollManagement />}

          {activeItem.id === "task" && (
            <TasksPanel
              viewer={viewer}
              scope={attScope}
              canAssign={hasPermission(staff, "tasks.assign")}
              canFeedback={hasPermission(staff, "tasks.feedback")}
            />
          )}

          {activeItem.id === "accounting" && canAccounts && (
            <AccountsManagement me={staff} />
          )}

          {activeItem.id === "payslips" && <MyPayslips />}

          {activeItem.id === "profile" && <StaffProfile staff={staff} />}
        </div>
      </main>
    </div>
  );
};

export default StaffHome;