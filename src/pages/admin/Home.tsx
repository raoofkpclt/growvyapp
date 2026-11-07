import React, { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "../../config/firebase/firebase";
import ClientManagement from "../../components/admin/ClientManagement";
import WorkManagement from "../../components/admin/WorkManagement";
import BillsManagement from "../../components/admin/BillsManagement";
import AccountManagement from "../../components/admin/AccountManagement";
import Dashboard from "../../components/admin/Dashboard";

// ─── Types & nav config ───────────────────────────────────────────────────────
type TabId = "dashboard" | "clients" | "work" | "bills" | "accounts";

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

const navItems: { id: TabId; label: string; subtitle: string; icon: string }[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    subtitle: "Overview of your agency",
    icon: "M3 12l9-9 9 9M5 10v10h14V10",
  },
  {
    id: "clients",
    label: "Clients",
    subtitle: "Manage your clients",
    icon: "M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM22 21v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8",
  },
  {
    id: "work",
    label: "Work",
    subtitle: "Creatives and deliverables",
    icon: "M3 7h18v13H3zM8 7V4h8v3",
  },
  {
    id: "bills",
    label: "Bills",
    subtitle: "Invoices and payments",
    icon: "M6 2h12v20l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6",
  },
  {
    id: "accounts",
    label: "Accounts",
    subtitle: "Team and access",
    icon: "M12 12a5 5 0 100-10 5 5 0 000 10zM3 22a9 9 0 0118 0",
  },
];

// ─── Main Component ───────────────────────────────────────────────────────────
const Home: React.FC = () => {
  const [tab, setTab] = useState<TabId>("dashboard");
  // Desktop only: expanded / collapsed. On mobile the sidebar is ALWAYS icon-only.
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const navigate = useNavigate();
  const activeItem = navItems.find((n) => n.id === tab)!;

  // start every section at the top of the page
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [tab]);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
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

      {/* ── Sticky Sidebar ──
          mobile  : narrow, icons only
          desktop : expanded (w-60) or collapsed (w-[72px]) via the toggle */}
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
          {navItems.map((item) => {
            const active = tab === item.id;
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
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-medium text-emerald-400">
                Live
              </span>
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-xs font-bold">
              G
            </div>
          </div>
        </header>

        <div className="px-3 sm:px-5 md:px-8 py-5 md:py-7 max-w-[1600px] mx-auto">
          {tab === "dashboard" && <Dashboard />}
          {tab === "clients" && <ClientManagement />}
          {tab === "work" && <WorkManagement />}
          {tab === "bills" && <BillsManagement />}
          {tab === "accounts" && <AccountManagement />}
        </div>
      </main>
    </div>
  );
};

export default Home;