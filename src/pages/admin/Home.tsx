import React, { useState } from "react";
import type { Client, Creative } from "../../utils/types/Types";
import { signOut } from "firebase/auth";
import { auth } from "../../config/firebase/firebase";
import { useNavigate } from "react-router-dom";
import ClientManagement from "../../components/admin/ClientManagement";
import WorkManagement from "../../components/admin/WorkManagement";

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({
  label,
  value,
  delta,
  icon,
  accent,
}: {
  label: string;
  value: string;
  delta: string;
  icon: string;
  accent: string;
}) => (
  <div
    className={`relative overflow-hidden rounded-2xl bg-[#0f1117] border border-white/5 p-5 flex flex-col gap-4 group hover:border-white/10 transition-all duration-300`}
  >
    <div
      className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${accent}`}
    >
      {icon}
    </div>
    <div>
      <p className="text-3xl font-bold text-white tracking-tight">{value}</p>
      <p className="text-xs text-zinc-500 mt-0.5 uppercase tracking-widest font-medium">
        {label}
      </p>
    </div>
    <span className="text-xs font-semibold text-emerald-400">{delta}</span>
    <div
      className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full opacity-5 ${accent} blur-2xl group-hover:opacity-10 transition-opacity`}
    />
  </div>
);

// ─── Sparkline (pure CSS bars) ────────────────────────────────────────────────
const Sparkline = ({ data, color }: { data: number[]; color: string }) => {
  const max = Math.max(...data);
  return (
    <div className="flex items-end gap-[3px] h-10">
      {data.map((v, i) => (
        <div
          key={i}
          style={{ height: `${(v / max) * 100}%` }}
          className={`w-1.5 rounded-sm ${color} opacity-80`}
        />
      ))}
    </div>
  );
};

// ─── Modal Shell ──────────────────────────────────────────────────────────────
const Modal = ({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
    <div className="bg-[#0f1117] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl animate-fade-in">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <h3 className="text-white font-semibold text-base">{title}</h3>
        <button
          onClick={onClose}
          className="text-zinc-500 hover:text-white transition-colors text-xl leading-none"
        >
          ×
        </button>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  </div>
);

// ─── Input ────────────────────────────────────────────────────────────────────
const Field = ({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs text-zinc-400 font-medium uppercase tracking-wider">
      {label}
    </label>
    <input
      {...props}
      className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/60 transition-colors"
    />
  </div>
);

const TextAreaField = ({
  label,
  ...props
}: { label: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs text-zinc-400 font-medium uppercase tracking-wider">
      {label}
    </label>
    <textarea
      {...props}
      rows={3}
      className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/60 transition-colors resize-none"
    />
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const Home = () => {
  const [tab, setTab] = useState<"dashboard" | "clients" | "work">("dashboard");
  const [clients, setClients] = useState<Client[]>([]);
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [showEditClient, setShowEditClient] = useState<Client | null>(null);
  const [showAddCreative, setShowAddCreative] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navigate = useNavigate();

  const [creativeForm, setCreativeForm] = useState({
    clientId: "",
    type: "poster" as Creative["type"],
    title: "",
    imageUrl: "",
    instagramUrl: "",
    websiteUrl: "",
  });

  const handleEditClient = () => {
    if (!showEditClient) return;
    setClients((p) =>
      p.map((c) => (c.id === showEditClient.id ? showEditClient : c)),
    );
    setShowEditClient(null);
  };

  const handleAddCreative = () => {
    if (!creativeForm.title || !creativeForm.clientId) return;
    const nc: Creative = {
      id: Date.now().toString(),
      ...creativeForm,
      uploadedAt: new Date().toISOString().slice(0, 10),
    };
    setCreatives((p) => [nc, ...p]);
    setCreativeForm({
      clientId: "",
      type: "poster",
      title: "",
      imageUrl: "",
      instagramUrl: "",
      websiteUrl: "",
    });
    setShowAddCreative(false);
  };

  const trafficData = [40, 65, 50, 80, 55, 90, 70, 88, 60, 95, 72, 85];

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: "⬡" },
    { id: "clients", label: "Clients", icon: "◈" },
    { id: "work", label: "Work", icon: "◧" },
  ];

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.log("Logout Error", error);
    }
  };

  return (
    <div className="min-h-screen bg-[#080a0e] font-['DM_Sans',sans-serif] flex text-white">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Syne:wght@600;700;800&display=swap');
        * { box-sizing: border-box; }
        .font-display { font-family: 'Syne', sans-serif; }
        @keyframes fade-in { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
        .animate-fade-in { animation: fade-in 0.25s ease forwards; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: #ffffff18; border-radius: 99px; }
      `}</style>

      {/* ── Sidebar ── */}
      <aside
        className={`${sidebarOpen ? "w-56" : "w-16"} flex-shrink-0 bg-[#0b0d12] border-r border-white/5 flex flex-col py-6 transition-all duration-300 relative`}
      >
        <div className="px-4 mb-8 overflow-hidden">
          {sidebarOpen ? (
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-xs font-bold font-display">
                A
              </div>
              <span className="font-display font-700 text-base text-white whitespace-nowrap">
                Growvy
              </span>
            </div>
          ) : (
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-xs font-bold font-display mx-auto">
              A
            </div>
          )}
        </div>

        <nav className="flex flex-col gap-1 px-2 flex-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id as typeof tab)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${tab === item.id ? "bg-violet-500/15 text-violet-300 border border-violet-500/20" : "text-zinc-500 hover:text-zinc-200 hover:bg-white/5"}`}
            >
              <span className="text-lg leading-none flex-shrink-0">
                {item.icon}
              </span>
              {sidebarOpen && (
                <span className="whitespace-nowrap">{item.label}</span>
              )}
            </button>
          ))}
        </nav>

        <button
          onClick={() => setSidebarOpen((p) => !p)}
          className="mx-auto mt-auto w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center text-zinc-500 hover:text-white hover:border-white/20 transition-all text-xs"
        >
          {sidebarOpen ? "‹" : "›"}
        </button>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <header className="sticky top-0 z-10 bg-[#080a0e]/90 backdrop-blur border-b border-white/5 px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-display text-lg font-700 text-white capitalize">
              {tab}
            </h1>
            <p className="text-xs text-zinc-600 mt-0.5">
              {tab === "dashboard" && "Business & traffic overview"}
              {tab === "clients" && `${clients.length} total clients`}
              {tab === "work" && `${creatives.length} creative assets`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-zinc-500">Live</span>
            <div
              onClick={handleLogout}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-xs font-bold"
            >
              A
            </div>
          </div>
        </header>

        <div className="px-8 py-7">
          {/* ══ DASHBOARD ══ */}
          {tab === "dashboard" && (
            <div className="space-y-7 animate-fade-in">
              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  label="Total Clients"
                  value="24"
                  delta="↑ 3 this month"
                  icon="◈"
                  accent="bg-violet-500"
                />
                <StatCard
                  label="Monthly Revenue"
                  value="₹2.4L"
                  delta="↑ 18% vs last month"
                  icon="◆"
                  accent="bg-emerald-500"
                />
                <StatCard
                  label="Active Projects"
                  value="11"
                  delta="2 deadlines this week"
                  icon="◧"
                  accent="bg-amber-500"
                />
                <StatCard
                  label="Website Visits"
                  value="9.3K"
                  delta="↑ 42% this week"
                  icon="⬡"
                  accent="bg-sky-500"
                />
              </div>

              {/* Charts row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Traffic */}
                <div className="bg-[#0f1117] border border-white/5 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Website Traffic
                      </p>
                      <p className="text-xs text-zinc-600">Last 12 months</p>
                    </div>
                    <span className="text-xs bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2.5 py-1 rounded-full font-medium">
                      +42%
                    </span>
                  </div>
                  <div className="flex items-end gap-2 h-32">
                    {trafficData.map((v, i) => (
                      <div
                        key={i}
                        className="flex-1 flex flex-col items-center justify-end gap-1"
                      >
                        <div
                          style={{ height: `${(v / 100) * 112}px` }}
                          className="w-full rounded-t-md bg-gradient-to-t from-sky-600 to-sky-400 opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                          title={`${v}k`}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-2">
                    {[
                      "Jun",
                      "Jul",
                      "Aug",
                      "Sep",
                      "Oct",
                      "Nov",
                      "Dec",
                      "Jan",
                      "Feb",
                      "Mar",
                      "Apr",
                      "May",
                    ].map((m) => (
                      <span
                        key={m}
                        className="text-[9px] text-zinc-700 flex-1 text-center"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Revenue */}
                <div className="bg-[#0f1117] border border-white/5 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Revenue
                      </p>
                      <p className="text-xs text-zinc-600">Monthly breakdown</p>
                    </div>
                    <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-medium">
                      +18%
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {[
                      {
                        label: "Branding & Design",
                        val: 85,
                        color: "bg-violet-500",
                      },
                      {
                        label: "Social Media",
                        val: 62,
                        color: "bg-emerald-500",
                      },
                      {
                        label: "Web Development",
                        val: 45,
                        color: "bg-sky-500",
                      },
                      {
                        label: "Reels & Content",
                        val: 38,
                        color: "bg-amber-500",
                      },
                    ].map((r) => (
                      <div key={r.label}>
                        <div className="flex justify-between mb-1">
                          <span className="text-xs text-zinc-400">
                            {r.label}
                          </span>
                          <span className="text-xs text-zinc-500">
                            {r.val}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${r.val}%` }}
                            className={`h-full ${r.color} rounded-full`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Recent activity */}
                <div className="lg:col-span-2 bg-[#0f1117] border border-white/5 rounded-2xl p-5">
                  <p className="text-sm font-semibold text-white mb-4">
                    Recent Activity
                  </p>
                  <div className="space-y-3">
                    {[
                      {
                        msg: "New client Arjun Menon added",
                        time: "2h ago",
                        dot: "bg-violet-400",
                      },
                      {
                        msg: "Poster uploaded for Priya Nair",
                        time: "5h ago",
                        dot: "bg-emerald-400",
                      },
                      {
                        msg: "Website link added for Rahul Das",
                        time: "1d ago",
                        dot: "bg-sky-400",
                      },
                      {
                        msg: "Instagram Reel shared – Fashion Reel",
                        time: "2d ago",
                        dot: "bg-pink-400",
                      },
                      {
                        msg: "Client Meera Pillai marked inactive",
                        time: "3d ago",
                        dot: "bg-zinc-500",
                      },
                    ].map((a, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${a.dot}`}
                        />
                        <p className="text-sm text-zinc-300 flex-1">{a.msg}</p>
                        <span className="text-xs text-zinc-600 whitespace-nowrap">
                          {a.time}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick stats */}
                <div className="bg-[#0f1117] border border-white/5 rounded-2xl p-5 flex flex-col gap-4">
                  <p className="text-sm font-semibold text-white">
                    Quick Stats
                  </p>
                  {[
                    {
                      label: "Posters Created",
                      val: 38,
                      spark: [30, 45, 38, 50, 42, 55, 48, 60, 52, 65, 58, 70],
                      color: "bg-violet-400",
                    },
                    {
                      label: "Reels Shared",
                      val: 14,
                      spark: [5, 8, 6, 10, 9, 12, 10, 14, 11, 14, 12, 14],
                      color: "bg-pink-400",
                    },
                    {
                      label: "Websites Launched",
                      val: 7,
                      spark: [1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7],
                      color: "bg-sky-400",
                    },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <p className="text-lg font-bold text-white">{s.val}</p>
                        <p className="text-xs text-zinc-600">{s.label}</p>
                      </div>
                      <Sparkline data={s.spark} color={s.color} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══ CLIENTS ══ */}
          {tab === "clients" && <ClientManagement />}

          {/* ══ WORK ══ */}
          {tab === "work" && <WorkManagement />}
        </div>
      </main>

      {/* ══ EDIT CLIENT MODAL ══ */}
      {showEditClient && (
        <Modal title="Edit Client" onClose={() => setShowEditClient(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Full Name"
                value={showEditClient.name}
                onChange={(e) =>
                  setShowEditClient((p) => p && { ...p, name: e.target.value })
                }
              />
              <Field
                label="Email"
                value={showEditClient.email}
                onChange={(e) =>
                  setShowEditClient((p) => p && { ...p, email: e.target.value })
                }
              />
            </div>
            <TextAreaField
              label="Description"
              value={showEditClient.description}
              onChange={(e) =>
                setShowEditClient(
                  (p) => p && { ...p, description: e.target.value },
                )
              }
            />
            <Field
              label="Profile Image URL"
              value={showEditClient.profileImage}
              onChange={(e) =>
                setShowEditClient(
                  (p) => p && { ...p, profileImage: e.target.value },
                )
              }
            />
            <Field
              label="Portfolio Banner URL"
              value={showEditClient.portfolioImage}
              onChange={(e) =>
                setShowEditClient(
                  (p) => p && { ...p, portfolioImage: e.target.value },
                )
              }
            />
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowEditClient(null)}
                className="flex-1 py-2.5 rounded-xl text-sm text-zinc-400 border border-white/10 hover:text-white hover:border-white/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditClient}
                className="flex-1 py-2.5 rounded-xl text-sm bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors"
              >
                Update Client
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ══ ADD CREATIVE MODAL ══ */}
      {showAddCreative && (
        <Modal
          title="Upload Creative"
          onClose={() => setShowAddCreative(false)}
        >
          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-zinc-400 font-medium uppercase tracking-wider">
                Client
              </label>
              <select
                value={creativeForm.clientId}
                onChange={(e) =>
                  setCreativeForm((p) => ({ ...p, clientId: e.target.value }))
                }
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/60 transition-colors"
              >
                <option value="" className="bg-[#0f1117]">
                  Select client…
                </option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#0f1117]">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-zinc-400 font-medium uppercase tracking-wider">
                Type
              </label>
              <div className="flex gap-2">
                {(["poster", "reel", "website"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setCreativeForm((p) => ({ ...p, type: t }))}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-all capitalize ${creativeForm.type === t ? "bg-violet-500/15 border-violet-500/30 text-violet-300" : "border-white/10 text-zinc-400 hover:text-white"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <Field
              label="Title"
              value={creativeForm.title}
              onChange={(e) =>
                setCreativeForm((p) => ({ ...p, title: e.target.value }))
              }
              placeholder="e.g. Summer Campaign Poster"
            />
            {creativeForm.type === "poster" && (
              <Field
                label="Image URL / S3 Key"
                value={creativeForm.imageUrl}
                onChange={(e) =>
                  setCreativeForm((p) => ({ ...p, imageUrl: e.target.value }))
                }
                placeholder="https://... or s3://bucket/posters/..."
              />
            )}
            {creativeForm.type === "reel" && (
              <Field
                label="Instagram Reel URL"
                value={creativeForm.instagramUrl}
                onChange={(e) =>
                  setCreativeForm((p) => ({
                    ...p,
                    instagramUrl: e.target.value,
                  }))
                }
                placeholder="https://www.instagram.com/reel/..."
              />
            )}
            {creativeForm.type === "website" && (
              <Field
                label="Website URL"
                value={creativeForm.websiteUrl}
                onChange={(e) =>
                  setCreativeForm((p) => ({ ...p, websiteUrl: e.target.value }))
                }
                placeholder="https://..."
              />
            )}
            <p className="text-xs text-zinc-600">
              Images are uploaded to S3; metadata is written to Firestore.
            </p>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowAddCreative(false)}
                className="flex-1 py-2.5 rounded-xl text-sm text-zinc-400 border border-white/10 hover:text-white hover:border-white/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCreative}
                className="flex-1 py-2.5 rounded-xl text-sm bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors"
              >
                Save Creative
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Home;
