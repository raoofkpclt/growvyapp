import React, { useEffect, useRef, useState } from "react";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "../../config/firebase/firebase";
import ClientManagement from "../../components/admin/ClientManagement";
import WorkManagement from "../../components/admin/WorkManagement";
import BillsManagement from "../../components/admin/BillsManagement";
import AccountManagement from "../../components/admin/AccountManagement";
import Dashboard from "../../components/admin/Dashboard";
import StaffManagement from "../../components/admin/StaffManagement";
import PayrollAttendanceManagement from "../../components/admin/PayrollAttendanceManagement";
import TaskManagement from "../../components/admin/TaskManagement";
import AdminProfile from "../../components/admin/AdminProfile"; // adjust path if you saved it elsewhere
import PlanManagement, { usePlanAlerts } from "../../components/admin/PlanManagement";
import NotificationBell from "../../components/staff/NotificationBel"; // adjust path if needed
import NotificationsPage from "../../components/staff/NotificationsPage"; // adjust path if needed

// ─── Types & nav config ───────────────────────────────────────────────────────
type TabId =
  | "dashboard"
  | "notifications"
  | "clients"
  | "plans"
  | "work"
  | "bills"
  | "staff"
  | "attendance"
  | "payroll"
  | "payslips"
  | "tasks"
  | "accounts"
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

type NavItem = {
  id: TabId;
  label: string;
  subtitle: string;
  icon: string;
  /** reachable (e.g. from the bell) but not drawn in the sidebar */
  hidden?: boolean;
};

const navItems: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    subtitle: "Overview of your agency",
    icon: "M3 12l9-9 9 9M5 10v10h14V10",
  },
  // opened from the bell ("View all notifications"), not shown in the sidebar
  {
    id: "notifications",
    label: "Notifications",
    subtitle: "Task alerts and history",
    icon: "M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0",
    hidden: true,
  },
  {
    id: "plans",
    label: "Plans",
    subtitle: "Client plans, content and renewals",
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 14l2 2 4-4",
  },
  {
    id: "clients",
    label: "Clients",
    subtitle: "Manage your clients",
    icon: "M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM22 21v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8",
  },
  {
    id: "work",
    label: "Works",
    subtitle: "Creatives and deliverables",
    icon: "M3 7h18v13H3zM8 7V4h8v3",
  },
  {
    id: "staff",
    label: "Staffs",
    subtitle: "Roles, access and salary",
    icon: "M17 21v-2a4 4 0 00-3-3.9M9 11a4 4 0 100-8 4 4 0 000 8zM3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2M16 3.1a4 4 0 010 7.8",
  },
  {
    id: "attendance",
    label: "Attendance",
    subtitle: "Attendance, leave and adjustments",
    icon: "M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2",
  },
  {
    id: "tasks",
    label: "Task",
    subtitle: "Assign work and track progress",
    icon: "M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11",
  },
  {
    id: "payroll",
    label: "Payroll",
    subtitle: "Monthly payroll",
    icon: "M3 7h18v12H3zM3 11h18M16 15h2",
  },
  {
    id: "payslips",
    label: "Payslips",
    subtitle: "Staff payslips",
    icon: "M6 2h12v20l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6",
  },
  {
    id: "accounts",
    label: "Accounting",
    subtitle: "Cashbook, income and expenses",
    icon: "M3 5h18v14H3zM3 10h18M7 15h4M16 14h2",
  },
  {
    id: "bills",
    label: "Bills",
    subtitle: "Invoices and payments",
    icon: "M6 2h12v20l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6",
  },
  {
    id: "profile",
    label: "Profile",
    subtitle: "Your name, login email and password",
    icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  },
];

// ─── Remember the open page, so a browser refresh stays on it ─────────────────
const tabKey = (uid: string) => `growvy-admin-tab-${uid}`;

const readTab = (uid: string): TabId => {
  try {
    const saved = localStorage.getItem(tabKey(uid));
    return navItems.some((n) => n.id === saved) ? (saved as TabId) : "dashboard";
  } catch {
    return "dashboard";
  }
};

// ─── Main Component ───────────────────────────────────────────────────────────
const Home: React.FC = () => {
  const me = auth.currentUser;
  const uid = me?.uid ?? "";

  const [tab, setTab] = useState<TabId>(() => readTab(uid));
  // Desktop only: expanded / collapsed. On mobile the sidebar is ALWAYS icon-only.
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const navigate = useNavigate();
  const activeItem = navItems.find((n) => n.id === tab) ?? navItems[0];

  const initial = (me?.displayName || me?.email || "A").charAt(0).toUpperCase();

  // red badge on "Plans": plans ending soon or already ended
  const alerts = usePlanAlerts();
  const prevTab = useRef<TabId>(tab);
  useEffect(() => {
    // refresh the badge after the admin leaves the Plans page
    if (prevTab.current === "plans" && tab !== "plans") alerts.reload();
    prevTab.current = tab;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // start every section at the top of the page
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [tab]);

  // remember the open page for the next refresh
  useEffect(() => {
    if (!uid) return;
    try {
      localStorage.setItem(tabKey(uid), tab);
    } catch {
      /* ignore */
    }
  }, [tab, uid]);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      // next login starts on the dashboard again
      try {
        if (uid) localStorage.removeItem(tabKey(uid));
      } catch {
        /* ignore */
      }
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.log("Logout Error", error);
    } finally {
      setLoggingOut(false);
    }
  };

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

      {/* ── Sticky Sidebar ── */}
      <aside
        style={{ height: "100dvh" }}
        className={`w-[68px] ${
          sidebarOpen ? "md:w-60" : "md:w-[72px]"
        } sticky top-0 h-screen self-start shrink-0 z-30 flex flex-col
        bg-gradient-to-b from-[#0d0f15] to-[#0a0c11] border-r border-white/5
        transition-[width] duration-300 ease-out`}
      >
        {/* Brand */}
        <div
          className={`h-16 flex items-center justify-center border-b border-white/5 ${
            sidebarOpen ? "md:justify-start md:px-4" : ""
          }`}
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center font-display font-bold shadow-lg shadow-violet-900/40 shrink-0">
            G
          </div>
          {sidebarOpen && (
            <div className="ml-3 overflow-hidden hidden md:block">
              <p className="font-display font-bold text-base leading-none">
                Growvy
              </p>
              <p className="text-[11px] text-zinc-500 mt-1">Admin panel</p>
            </div>
          )}
        </div>

        {/* Nav (scrolls internally on short screens) */}
        <nav className="flex-1 overflow-y-auto px-2 md:px-3 py-4 md:py-5 space-y-1">
          {navItems
            .filter((item) => !item.hidden)
            .map((item) => {
              const active = activeItem.id === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  title={!sidebarOpen ? item.label : undefined}
                  aria-label={item.label}
                  aria-current={active ? "page" : undefined}
                  className={`relative w-full flex items-center justify-center gap-3 px-3 py-3 md:py-2.5 rounded-xl text-sm font-medium
                  transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60
                  ${sidebarOpen ? "md:justify-start" : ""}
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
                  {sidebarOpen && (
                    <span className="whitespace-nowrap hidden md:inline">
                      {item.label}
                    </span>
                  )}
                  {item.id === "plans" && alerts.count > 0 && (
                    <span
                      title={`${alerts.ended} ended, ${alerts.ending} ending soon`}
                      className="absolute right-1.5 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white"
                    >
                      {alerts.count}
                    </span>
                  )}
                </button>
              );
            })}
        </nav>

        {/* ── Sidebar bottom: collapse (desktop only) + logout ── */}
        <div className="p-2 md:p-3 border-t border-white/5 space-y-2">
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
            className={`w-full flex items-center justify-center gap-3 px-3 py-3 md:py-2.5 rounded-xl text-sm font-medium
            text-red-300 bg-red-500/10 border border-red-500/20
            hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-200
            disabled:opacity-60 disabled:cursor-not-allowed
            transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60
            ${sidebarOpen ? "md:justify-start" : ""}`}
          >
            <Icon d={LOGOUT_ICON} />
            {sidebarOpen && (
              <span className="whitespace-nowrap hidden md:inline">
                {loggingOut ? "Logging out…" : "Log out"}
              </span>
            )}
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 min-w-0">
        {/* Sticky top bar */}
        <header className="sticky top-0 z-20 h-16 bg-[#080a0e]/80 backdrop-blur-xl border-b border-white/5 px-4 md:px-8 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-lg font-bold text-white leading-none truncate">
              {activeItem.label}
            </h1>
            <p className="text-xs text-zinc-500 mt-1 truncate">
              {activeItem.subtitle}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* bell: sound, pop-ups, tab-title count, history list.
                Keep it here so it is mounted on every page. */}
            {uid && (
              <NotificationBell
                uid={uid}
                onOpen={() => setTab("tasks")}
                onViewAll={() => setTab("notifications")}
              />
            )}

            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-medium text-emerald-400">
                Live
              </span>
            </div>

            {/* avatar opens the profile page */}
            <button
              onClick={() => setTab("profile")}
              title="My profile"
              aria-label="Open profile"
              className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-xs font-bold
              hover:ring-2 hover:ring-violet-400/50 transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            >
              {initial}
            </button>
          </div>
        </header>

        <div className="px-3 sm:px-5 md:px-8 py-5 md:py-7 max-w-[1600px] mx-auto">
          {activeItem.id === "dashboard" && <Dashboard />}
          {activeItem.id === "notifications" && uid && (
            <NotificationsPage uid={uid} onOpen={() => setTab("tasks")} />
          )}
          {activeItem.id === "clients" && <ClientManagement />}
          {activeItem.id === "plans" && <PlanManagement />}
          {activeItem.id === "work" && <WorkManagement />}
          {activeItem.id === "bills" && <BillsManagement />}
          {activeItem.id === "staff" && <StaffManagement />}
          {activeItem.id === "attendance" && (
            <PayrollAttendanceManagement level="hr_manager" isAdmin only="attendance" />
          )}
          {activeItem.id === "payroll" && (
            <PayrollAttendanceManagement level="hr_manager" isAdmin only="payroll" />
          )}
          {activeItem.id === "tasks" && <TaskManagement />}
          {activeItem.id === "accounts" && <AccountManagement />}
          {activeItem.id === "profile" && <AdminProfile />}
        </div>
      </main>
    </div>
  );
};

export default Home;