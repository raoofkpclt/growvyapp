import { useMemo, useState } from "react";
import type { Staff } from "../../../service/staffService";
import {
  PERMISSION_LABELS,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
  permissionsFor,
  type Role,
} from "../../../utils/types/staffRoles";
import { ID_PROOF_LABELS, maskId } from "../../../utils/types/staffId";
import { Badge, Btn, money, useLoad } from "./Ui";
// ↓ adjust these paths if your folders differ
import TasksPanel from "../TasksPanel";
import AttendancePanel from "../AttendancePanel";
import LeavePanel from "./LeavePanel";
import PayrollPanel from "../../staff/PayrollPanel";
import PayslipsPanel from "../../staff/PayslipsPanel";

const isValidRole = (role: unknown): role is Role =>
  typeof role === "string" && role in ROLE_PERMISSIONS;

const isPdf = (url: string) => url.split("?")[0].toLowerCase().endsWith(".pdf");

/* ───────────── small pieces ───────────── */
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="min-w-0">
    <p className="text-xs text-zinc-500">{label}</p>
    <div className="mt-0.5 break-words text-sm text-white">{children}</div>
  </div>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-4 rounded-2xl border border-white/5 bg-[#0f1117] p-4 sm:p-5">
    <p className="text-sm font-medium text-white">{title}</p>
    {children}
  </div>
);

const ProofTile = ({
  label,
  url,
  onOpen,
}: {
  label: string;
  url: string;
  onOpen: (url: string) => void;
}) => (
  <div className="space-y-2">
    <p className="text-xs text-zinc-400">{label}</p>
    {!url ? (
      <div className="flex h-44 items-center justify-center rounded-lg border border-dashed border-white/10 text-xs text-zinc-500">
        Not uploaded
      </div>
    ) : isPdf(url) ? (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="flex h-44 flex-col items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/5 text-sm text-sky-300 hover:bg-white/10"
      >
        <span className="text-2xl">📄</span>
        Open PDF
      </a>
    ) : (
      <>
        <button
          type="button"
          onClick={() => onOpen(url)}
          className="block h-44 w-full overflow-hidden rounded-lg border border-white/10 bg-white/5"
          title="Click to enlarge"
        >
          <img src={url} alt={label} className="h-full w-full object-contain" />
        </button>
        <div className="flex gap-4 text-xs">
          <button type="button" onClick={() => onOpen(url)} className="py-1 text-sky-300 hover:underline">
            Enlarge
          </button>
          <a href={url} target="_blank" rel="noreferrer" className="py-1 text-sky-300 hover:underline">
            Open in new tab
          </a>
        </div>
      </>
    )}
  </div>
);

/* ───────────── Client-wise attendance ─────────────
 * One row per client: days worked and hours for this staff member.
 * WIRE THIS UP: replace loadClientAttendance with however your data links
 * a day of work to a client (attendance record, task, or timer entry).
 */
export interface ClientAttendanceEntry {
  date: string; // YYYY-MM-DD
  clientId: string;
  clientName: string;
  hours: number;
}

const loadClientAttendance = async (_uid: string): Promise<ClientAttendanceEntry[]> => {
  // TODO: fetch this staff member's entries that carry a client, e.g.
  // return (await getAttendanceByStaff(uid)).filter((r) => r.clientId).map(...)
  return [];
};

const ClientAttendanceTab = ({ uid }: { uid: string }) => {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const entries = useLoad(() => loadClientAttendance(uid), [uid], [] as ClientAttendanceEntry[]);

  const rows = useMemo(() => {
    const m = new Map<string, { name: string; days: Set<string>; hours: number }>();
    entries.data.forEach((e) => {
      if (from && e.date < from) return;
      if (to && e.date > to) return;
      const r = m.get(e.clientId) ?? { name: e.clientName || "Unnamed client", days: new Set<string>(), hours: 0 };
      r.days.add(e.date);
      r.hours += e.hours;
      m.set(e.clientId, r);
    });
    return [...m.entries()]
      .map(([id, r]) => ({ id, name: r.name, days: r.days.size, hours: r.hours }))
      .sort((a, b) => b.hours - a.hours);
  }, [entries.data, from, to]);

  const inputCls =
    "min-w-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-base text-white focus:border-violet-500/60 focus:outline-none sm:py-2 sm:text-xs";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
        <input type="date" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" className={inputCls} min={from} value={to} onChange={(e) => setTo(e.target.value)} />
        {(from || to) && (
          <button
            onClick={() => {
              setFrom("");
              setTo("");
            }}
            className="rounded-lg border border-white/10 px-3 py-2.5 text-xs text-zinc-300 hover:text-white sm:py-1.5"
          >
            All time
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#0f1117]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-white/5">
              <tr className="text-[10px] uppercase tracking-wider text-zinc-500">
                <th className="px-3 py-2.5 text-left font-medium">Client</th>
                <th className="px-3 py-2.5 text-right font-medium">Days</th>
                <th className="px-3 py-2.5 text-right font-medium">Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs text-zinc-300">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-white/[0.02]">
                  <td className="px-3 py-2.5 text-zinc-100">{r.name}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{r.days}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{r.hours.toFixed(1)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-xs text-zinc-600">
                    {entries.loading ? "Loading…" : "No client-wise attendance in this period."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/* ───────────── Staff view (full page) ───────────── */
type Tab = "profile" | "work" | "attendance" | "clients" | "payroll";
const TABS: { id: Tab; label: string }[] = [
  { id: "profile", label: "Profile" },
  { id: "work", label: "Assigned work" },
  { id: "attendance", label: "Attendance" },
  { id: "clients", label: "Client-wise" },
  { id: "payroll", label: "Payroll" },
];

const StaffView = ({
  staff: s,
  onBack,
  onEdit,
}: {
  staff: Staff;
  onBack: () => void; // go back to the staff list
  onEdit: () => void;
}) => {
  const [tab, setTab] = useState<Tab>("profile");
  const [showId, setShowId] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lightbox, setLightbox] = useState("");

  const validRole = isValidRole(s.role);
  const perms = permissionsFor(validRole ? s.role : undefined, s.permissions);

  // the panels take a "viewer"; here it is the staff member being viewed
  const staffViewer = { uid: s.uid, name: s.name };

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(s.idProofNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked: ignore */
    }
  };

  return (
    <div className="space-y-5">
      {/* back */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 py-1 text-sm text-zinc-400 transition-colors hover:text-white"
      >
        <span className="text-base leading-none">←</span> Back to staff
      </button>

      {/* header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          {s.photoUrl ? (
            <button type="button" onClick={() => setLightbox(s.photoUrl)} title="Click to enlarge" className="shrink-0">
              <img
                src={s.photoUrl}
                alt={s.name}
                className="h-16 w-16 rounded-2xl border border-white/10 object-cover sm:h-24 sm:w-24"
              />
            </button>
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-2xl text-white sm:h-24 sm:w-24 sm:text-3xl">
              {s.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 space-y-1">
            <h2 className="truncate text-lg font-semibold text-white sm:text-2xl">{s.name}</h2>
            <p className="text-sm text-zinc-400">{validRole ? ROLE_LABELS[s.role] : "No valid role"}</p>
            <Badge tone={s.active ? "emerald" : "red"}>{s.active ? "Active" : "Disabled"}</Badge>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Btn variant="ghost" onClick={onEdit}>Edit</Btn>
          <Btn variant="ghost" onClick={onBack}>Close</Btn>
        </div>
      </div>

      {/* tabs */}
      <div className="flex w-full gap-1 overflow-x-auto rounded-xl border border-white/5 bg-white/[0.03] p-1 sm:w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-colors sm:flex-none ${
              tab === t.id ? "bg-violet-500/15 text-violet-300" : "text-zinc-500 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* PROFILE */}
      {tab === "profile" && (
        <div className="space-y-4">
          <Section title="Details">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Full name">{s.name || "—"}</Field>
              <Field label="Email (login)">{s.email || "—"}</Field>
              <Field label="Phone">{s.phone || "—"}</Field>
              <Field label="Role">{validRole ? ROLE_LABELS[s.role] : "—"}</Field>
              <Field label="Monthly salary">{money(s.salary)}</Field>
              <Field label="Account status">{s.active ? "Active" : "Disabled"}</Field>
            </div>
          </Section>

          <Section title="ID proof">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Proof type">{s.idProofType ? ID_PROOF_LABELS[s.idProofType] : "—"}</Field>
              <Field label="ID number">
                {s.idProofNumber ? (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="break-all font-mono tracking-wide">
                      {showId ? s.idProofNumber : maskId(s.idProofNumber)}
                    </span>
                    <button type="button" onClick={() => setShowId((v) => !v)} className="py-1 text-xs text-sky-300 hover:underline">
                      {showId ? "Hide" : "Show"}
                    </button>
                    <button type="button" onClick={copyId} className="py-1 text-xs text-sky-300 hover:underline">
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                ) : (
                  "—"
                )}
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ProofTile label="Proof – front" url={s.idProofFrontUrl} onOpen={setLightbox} />
              <ProofTile label="Proof – back" url={s.idProofBackUrl} onOpen={setLightbox} />
            </div>
          </Section>

          <Section title="Access">
            <div className="flex flex-wrap gap-1">
              {s.permissions && <Badge tone="amber">Custom</Badge>}
              {perms.map((p) => (
                <Badge key={p} tone="sky">{PERMISSION_LABELS[p]}</Badge>
              ))}
              {!perms.length && <span className="text-xs text-zinc-500">No access</span>}
            </div>
            <p className="text-xs text-zinc-500">
              {s.permissions ? "Custom access set for this person" : "Using the role's default access"}
            </p>
          </Section>
        </div>
      )}

      {/* ASSIGNED WORK: same panel the staff sees, scoped to this person */}
      {tab === "work" && <TasksPanel viewer={staffViewer} scope="own" />}

      {/* ATTENDANCE + LEAVE of this person */}
      {tab === "attendance" && (
        <div className="space-y-6">
          <AttendancePanel viewer={staffViewer} scope="own" />
          <LeavePanel viewer={staffViewer} scope="own" />
        </div>
      )}

      {/* CLIENT-WISE ATTENDANCE */}
      {tab === "clients" && <ClientAttendanceTab uid={s.uid} />}

      {/* PAYROLL + PAYSLIPS of this person */}
      {tab === "payroll" && (
        <div className="space-y-6">
          <PayrollPanel viewer={staffViewer} canManage />
          <PayslipsPanel viewer={staffViewer} scope="own" />
        </div>
      )}

      {/* image lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-3 bg-black/90 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
          onClick={() => setLightbox("")}
        >
          <img
            src={lightbox}
            alt="Preview"
            className="max-h-[80vh] max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="flex gap-6 text-sm" onClick={(e) => e.stopPropagation()}>
            <a href={lightbox} target="_blank" rel="noreferrer" className="py-2 text-sky-300 hover:underline">
              Open in new tab
            </a>
            <button type="button" onClick={() => setLightbox("")} className="py-2 text-zinc-300 hover:underline">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffView;