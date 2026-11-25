import { useEffect, useMemo, useState } from "react";
import { auth } from "../../config/firebase/firebase";
import { getClients } from "../../service/clientService";
import { dateKey, monthKey } from "../../service/AttendanceService";
import {
  addDays,
  contentDue,
  createPlan,
  daysBetween,
  ENDING_SOON_DAYS,
  extendPlan,
  fmtDate,
  listPlans,
  pausePlan,
  planState,
  resumePlan,
  saveContentPlan,
  savePosted,
  updatePlan,
  type Plan,
  type PlanInput,
  type PlanItem,
  type PlanState,
  type Posted,
} from "../../service/PlanService";
import {
  listInvoices,
  markInvoicePaid,
  type Invoice,
} from "../../service/InvoiceService";
import { printInvoice } from "../../utils/InvoicePrint";
import { SERVICE_OPTIONS, type Client } from "../../utils/types/Types";
import { Badge, Btn, Card, Label, Modal, Notice, errMsg, inputCls, money, useLoad } from "./Modal/Ui";
import AlertModal, { type AlertState } from "./Modal/AlertModal";
import ConfirmModal from "./Modal/ConfirmModal";
import AddBillModal from "./Modal/AddBillModal";

/* ───────────── small helpers ───────────── */

type Who = { uid: string; name: string };
type Tone = "emerald" | "amber" | "red" | "sky";
type St = { state: PlanState; daysLeft: number };

type PlanManagementProps = {
  /** false = read only (no create / edit / pause / extend / posting / invoices) */
  canManage?: boolean;
};

/** the plan id is the client id */
export const clientKey = (c: Client) => (c as Client & { firestoreId?: string }).firestoreId || c.id;

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

const monthLabel = (m: string) => {
  const [y, mo] = m.split("-").map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
};

const whenLabel = (ms: number) =>
  new Date(ms).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

const num = (s: string) => Math.max(0, Math.floor(Number(s) || 0));

const QUICK_ITEMS = ["Brochure", "Company profile", "Show reel", "Logo", "Banner", "Catalogue"];

/** 16px text on phones stops iOS Safari zooming into a field when it is tapped */
const fieldCls = `${inputCls} !text-base sm:!text-sm`;

/** a row that scrolls sideways on phones (no scrollbar) and wraps on large screens */
const chipRow =
  "-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:flex-wrap lg:overflow-visible";

const STATE_TONE: Record<PlanState, Tone> = {
  active: "emerald",
  ending: "amber",
  ended: "red",
  paused: "sky",
  no_plan: "amber",
};

const ORDER: Record<PlanState, number> = { ended: 0, ending: 1, no_plan: 2, paused: 3, active: 4 };

const stateLabel = (s: St) => {
  switch (s.state) {
    case "ended":
      return `Ended ${plural(-s.daysLeft, "day")} ago`;
    case "ending":
      return s.daysLeft === 0 ? "Ends today" : `Ends in ${plural(s.daysLeft, "day")}`;
    case "paused":
      return "Paused";
    case "active":
      return `${plural(s.daysLeft, "day")} left`;
    default:
      return "No plan";
  }
};

const StateBadge = ({ st }: { st: St }) => (
  <span className="shrink-0">
    {st.state === "no_plan" ? (
      <span className="whitespace-nowrap rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] font-medium text-zinc-400">
        No plan
      </span>
    ) : (
      <Badge tone={STATE_TONE[st.state]}>{stateLabel(st)}</Badge>
    )}
  </span>
);

const EVENT_LABEL: Record<string, string> = {
  created: "Created",
  updated: "Updated",
  paused: "Paused",
  resumed: "Resumed",
  extended: "Extended",
  content: "Content plan",
  posted: "Posting update",
};

/** how many of each output are already posted */
const postedOf = (p: Plan): Posted => ({
  posters: p.posted?.posters ?? 0,
  videos: p.posted?.videos ?? 0,
  extra: p.posted?.extra ?? {},
});

type PostRow = { key: string; label: string; total: number; done: number };

const postingRows = (p: Plan): PostRow[] => {
  const d = postedOf(p);
  return [
    { key: "posters", label: "Posters", total: p.posters, done: d.posters },
    { key: "videos", label: "Videos", total: p.videos, done: d.videos },
    ...p.extraItems.map((i) => ({
      key: `extra:${i.name}`,
      label: i.name,
      total: i.count,
      done: d.extra[i.name] ?? 0,
    })),
  ].filter((r) => r.total > 0);
};

const Tile = ({ label, value, sub }: { label: string; value: string | number; sub?: string }) => (
  <div className="min-w-0 rounded-xl border border-white/5 bg-white/[0.02] p-3 sm:p-4">
    <p className="break-words text-xs text-zinc-500">{label}</p>
    <p className="mt-1 break-words text-lg font-semibold text-white sm:text-xl">{value}</p>
    {sub && <p className="mt-0.5 text-xs text-zinc-500">{sub}</p>}
  </div>
);

const Section = ({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <Card className="min-w-0 space-y-4 p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 className="font-semibold text-white">{title}</h3>
      {action}
    </div>
    {children}
  </Card>
);

/* ───────────── alerts for the sidebar (used by Home) ───────────── */

/** Counts for the red badge on the "Plans" menu item: plans ending soon or already ended. */
export function usePlanAlerts() {
  const clients = useLoad(() => getClients(), [], [] as Client[]);
  const plans = useLoad(() => listPlans(), [], [] as Plan[]);

  const active = new Set(clients.data.filter((c) => c.status === "active").map(clientKey));
  let ending = 0;
  let ended = 0;
  let content = 0;
  const withPlan = new Set<string>();
  plans.data.forEach((p) => {
    if (!active.has(p.clientId)) return;
    withPlan.add(p.clientId);
    const { state } = planState(p);
    if (state === "ending") ending++;
    if (state === "ended") ended++;
    if (contentDue(p)) content++;
  });

  return {
    count: ending + ended,
    ending,
    ended,
    contentDue: content,
    noPlan: active.size - withPlan.size,
    reload: () => {
      clients.reload();
      plans.reload();
    },
  };
}

/* ═════════════════════════ page ═════════════════════════ */

type Filter = "all" | "ending" | "ended" | "paused" | "no_plan" | "active";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "ending", label: "Ending soon" },
  { id: "ended", label: "Ended" },
  { id: "paused", label: "Paused" },
  { id: "no_plan", label: "No plan" },
  { id: "active", label: "Active" },
];

const PlanManagement = ({ canManage = true }: PlanManagementProps) => {
  const me = auth.currentUser;
  const viewer: Who = { uid: me?.uid ?? "admin", name: me?.displayName ?? me?.email ?? "Admin" };

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [flash, setFlash] = useState("");

  const clients = useLoad(() => getClients(), [], [] as Client[]);
  const plans = useLoad(() => listPlans(), [], [] as Plan[]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(""), 4000);
    return () => clearTimeout(t);
  }, [flash]);

  const planBy = useMemo(() => new Map(plans.data.map((p) => [p.clientId, p])), [plans.data]);

  // every active client, most urgent first
  const rows = useMemo(
    () =>
      clients.data
        .filter((c) => c.status === "active")
        .map((client) => {
          const key = clientKey(client);
          const plan = planBy.get(key);
          return { client, key, plan, st: planState(plan) };
        })
        .sort(
          (a, b) =>
            ORDER[a.st.state] - ORDER[b.st.state] ||
            a.st.daysLeft - b.st.daysLeft ||
            a.client.name.localeCompare(b.client.name)
        ),
    [clients.data, planBy]
  );

  const count = (s: PlanState) => rows.filter((r) => r.st.state === s).length;
  const counts: Record<Filter, number> = {
    all: rows.length,
    ending: count("ending"),
    ended: count("ended"),
    paused: count("paused"),
    no_plan: count("no_plan"),
    active: count("active"),
  };
  const dueContent = rows.filter((r) => r.plan && contentDue(r.plan)).length;

  const visible = rows.filter((r) => {
    if (filter !== "all" && r.st.state !== filter) return false;
    return !search || r.client.name.toLowerCase().includes(search.toLowerCase());
  });

  const selected = rows.find((r) => r.key === selectedKey);

  const alertBtn =
    "block min-h-11 w-full break-words rounded-xl border px-4 py-3 text-left text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60";

  return (
    <div className="min-w-0 space-y-4 sm:space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-white sm:text-xl">Client plans</h2>
        <p className="mt-0.5 text-xs text-zinc-500 sm:text-sm">
          Plan dates, outputs, monthly content plans and renewals for every active client.
        </p>
      </div>

      <Notice message={clients.error || plans.error} />

      {flash && (
        <p
          role="status"
          className="break-words rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
        >
          {flash}
        </p>
      )}

      {/* alerts */}
      {(counts.ended > 0 || counts.ending > 0 || counts.no_plan > 0 || dueContent > 0) && (
        <div className="space-y-2">
          {counts.ended > 0 && (
            <button
              onClick={() => setFilter("ended")}
              className={`${alertBtn} border-red-500/20 bg-red-500/10 text-red-300`}
            >
              {plural(counts.ended, "plan")} {counts.ended === 1 ? "has" : "have"} ended.
              {canManage && (
                <>
                  {" "}
                  Extend or renew {counts.ended === 1 ? "it" : "them"}.
                </>
              )}{" "}
              <span className="underline">Show</span>
            </button>
          )}
          {counts.ending > 0 && (
            <button
              onClick={() => setFilter("ending")}
              className={`${alertBtn} border-amber-500/20 bg-amber-500/10 text-amber-300`}
            >
              {plural(counts.ending, "plan")} {counts.ending === 1 ? "ends" : "end"} within {ENDING_SOON_DAYS}{" "}
              days.{canManage && " Create the renewal invoice or extend."}{" "}
              <span className="underline">Show</span>
            </button>
          )}
          {counts.no_plan > 0 && (
            <button
              onClick={() => setFilter("no_plan")}
              className={`${alertBtn} border-white/10 bg-white/[0.03] text-zinc-300`}
            >
              {plural(counts.no_plan, "active client")} {counts.no_plan === 1 ? "has" : "have"} no plan yet.{" "}
              <span className="underline">Show</span>
            </button>
          )}
          {dueContent > 0 && (
            <p className="break-words rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-400">
              {plural(dueContent, "client")} still {dueContent === 1 ? "needs" : "need"} the content plan for{" "}
              {monthLabel(monthKey())}.
            </p>
          )}
        </div>
      )}

      {/* phones and tablets: list OR detail (with a Back button). Large screens: side by side.
          minmax(0, 1fr) stops wide content in the detail from stretching the page. */}
      <div className="grid gap-4 sm:gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
        {/* client list */}
        <div className={`min-w-0 space-y-3 ${selected ? "hidden lg:block" : ""}`}>
          <input
            type="search"
            aria-label="Search client"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search client…"
            className={fieldCls}
          />
          <div className={chipRow} role="tablist" aria-label="Plan status">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                role="tab"
                aria-selected={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={`min-h-10 shrink-0 whitespace-nowrap rounded-lg border px-3 text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 lg:min-h-9 ${
                  filter === f.id
                    ? "border-violet-500 bg-violet-600 text-white"
                    : "border-white/10 text-zinc-400 hover:text-white"
                }`}
              >
                {f.label} · {counts[f.id]}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {visible.map((r) => (
              <button
                key={r.key}
                onClick={() => setSelectedKey(r.key)}
                className={`w-full min-w-0 rounded-xl border p-3.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 sm:p-3 ${
                  r.key === selectedKey
                    ? "border-violet-500/40 bg-violet-500/10"
                    : "border-white/5 bg-white/[0.02] hover:bg-white/5"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 truncate font-medium text-white">{r.client.name}</p>
                  <StateBadge st={r.st} />
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  {r.plan ? `${fmtDate(r.plan.startDate)} – ${fmtDate(r.plan.endDate)}` : "No plan yet"}
                </p>
                {r.plan && postingRows(r.plan).length > 0 && (
                  <p className="mt-1 break-words text-[11px] text-zinc-400">
                    {postingRows(r.plan)
                      .map((x) => `${x.label} ${x.done}/${x.total}`)
                      .join(" · ")}
                  </p>
                )}
                {r.plan && contentDue(r.plan) && (
                  <p className="mt-1 text-[11px] text-amber-300">
                    Content plan for {monthLabel(monthKey())} not added
                  </p>
                )}
              </button>
            ))}
            {!visible.length && (
              <Card className="p-6 text-center text-sm text-zinc-500">
                {clients.loading || plans.loading ? "Loading…" : "No clients in this view."}
              </Card>
            )}
          </div>
        </div>

        {/* selected client */}
        <div className={`min-w-0 ${selected ? "" : "hidden lg:block"}`}>
          {selected ? (
            <PlanDetail
              key={selected.key}
              client={selected.client}
              clientId={selected.key}
              plan={selected.plan}
              viewer={viewer}
              canManage={canManage}
              onBack={() => setSelectedKey(null)}
              onChanged={(msg) => {
                plans.reload();
                setFlash(msg);
              }}
            />
          ) : (
            <Card className="p-8 text-center text-sm text-zinc-500 sm:p-10">
              Select a client to see the full plan.
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

/* ═════════════════════════ one client ═════════════════════════ */

type ModalKind = "create" | "edit" | "pause" | "resume" | "extend" | "invoice" | null;

/** full-width, 44px-tall on phones; normal size from sm up */
const mBtn = "min-h-11 w-full sm:min-h-0 sm:w-auto";

/**
 * view = "plan"     → plan card, details, content plans, history
 * view = "invoices" → only the invoices list (+ create invoice)
 * onBack is optional: leave it out when used inside the Client details page.
 * canManage (default true): false hides every create / edit / pause / extend / posting / invoice action.
 */
export const PlanDetail = ({
  client,
  clientId,
  plan,
  viewer,
  onBack,
  onChanged,
  view = "plan",
  canManage = true,
}: {
  client: Client;
  clientId: string;
  plan?: Plan;
  viewer: Who;
  onBack?: () => void;
  onChanged: (message: string) => void;
  view?: "plan" | "invoices";
  canManage?: boolean;
}) => {
  const [modal, setModal] = useState<ModalKind>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  // mark-paid confirm + result alert
  const [payTarget, setPayTarget] = useState<Invoice | null>(null);
  const [paying, setPaying] = useState(false);
  const [invAlert, setInvAlert] = useState<AlertState>(null);

  const invoices = useLoad(() => listInvoices(clientId), [clientId], [] as Invoice[]);

  const open = (m: ModalKind) => {
    if (!canManage) return;
    setErr("");
    setModal(m);
  };

  const run = async (fn: () => Promise<unknown>, done: string, alsoInvoices = false) => {
    if (!canManage) return;
    setErr("");
    setBusy(true);
    try {
      await fn();
      if (alsoInvoices) invoices.reload();
      onChanged(done);
      setModal(null);
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!payTarget || !canManage) return;
    const number = payTarget.number;
    try {
      setPaying(true);
      await markInvoicePaid(payTarget.id);
      invoices.reload();
      setPayTarget(null);
      setInvAlert({
        type: "success",
        title: "Invoice marked as paid",
        message: `${number} has been marked as paid.`,
      });
    } catch (e) {
      setPayTarget(null);
      setInvAlert({
        type: "error",
        title: "Couldn't update invoice",
        message: errMsg(e),
      });
    } finally {
      setPaying(false);
    }
  };

  // shown on phones and tablets, where the list and the detail are separate screens
  const header = onBack ? (
    <div className="flex items-center gap-3 lg:hidden">
      <button
        onClick={onBack}
        className="inline-flex min-h-10 items-center rounded-lg border border-white/10 px-3 text-sm text-zinc-400 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60"
      >
        ← Back to clients
      </button>
    </div>
  ) : null;

  /* no plan yet */
  if (!plan) {
    return (
      <div className="min-w-0 space-y-4">
        {header}
        <Card className="space-y-4 p-6 text-center sm:p-8">
          <h3 className="break-words text-lg font-semibold text-white">{client.name}</h3>
          <p className="text-sm text-zinc-500">
            {view === "invoices"
              ? canManage
                ? "Create a plan first, then you can make invoices."
                : "No plan yet, so there are no invoices."
              : "This active client has no plan yet."}
          </p>
          {view === "plan" && canManage && (
            <div>
              <Btn className={mBtn} onClick={() => open("create")}>
                Create plan
              </Btn>
            </div>
          )}
        </Card>
        {canManage && modal === "create" && (
          <PlanFormModal
            clientId={clientId}
            clientName={client.name}
            defaultServices={client.requiredServices ?? []}
            busy={busy}
            err={err}
            onClose={() => setModal(null)}
            onSubmit={(input) =>
              run(() => createPlan(input, viewer.uid, viewer.name), "Plan created.")
            }
          />
        )}
      </div>
    );
  }

  const st = planState(plan);
  const today = dateKey();
  const totalDays = daysBetween(plan.startDate, plan.endDate) + 1;
  const elapsed = Math.min(totalDays, Math.max(0, daysBetween(plan.startDate, today) + 1));
  const pct = totalDays > 0 ? Math.round((elapsed / totalDays) * 100) : 0;
  const paused = plan.status === "paused";
  const pausedDays = paused ? Math.max(0, daysBetween(plan.pausedOn, today)) : 0;
  const nextEnd = addDays(plan.endDate, pausedDays);

  const events = [...plan.history].reverse();
  const earlier = plan.contentPlans
    .filter((c) => c.month < monthKey())
    .sort((a, b) => b.month.localeCompare(a.month));

  return (
    <div className="min-w-0 space-y-4">
      {header}

      {view === "plan" && (
        <>
          {/* title + actions */}
          <Card className="space-y-4 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="break-words text-lg font-semibold text-white sm:truncate">{client.name}</h3>
                <p className="mt-1 text-sm text-zinc-500">
                  {fmtDate(plan.startDate)} – {fmtDate(plan.endDate)}
                </p>
              </div>
              <StateBadge st={st} />
            </div>

            {st.state === "ending" && (
              <p className="break-words rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
                {st.daysLeft === 0 ? "This plan ends today." : `This plan ends in ${plural(st.daysLeft, "day")}.`}
                {canManage && " Create the renewal invoice or extend the plan."}
              </p>
            )}
            {st.state === "ended" && (
              <p className="break-words rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                This plan ended on {fmtDate(plan.endDate)} ({plural(-st.daysLeft, "day")} ago).
                {canManage && " Extend it, or create an invoice to renew."}
              </p>
            )}
            {paused && (
              <p className="break-words rounded-xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-300">
                Paused since {fmtDate(plan.pausedOn)} ({plural(pausedDays, "day")}). Reason: {plan.pauseReason}.
                {canManage && ` When you resume, the end date moves to ${fmtDate(nextEnd)}.`}
              </p>
            )}

            {/* two buttons per row on phones, with Create invoice across the full width */}
            {canManage && (
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                <Btn variant="ghost" className={mBtn} onClick={() => open("edit")}>
                  Edit plan
                </Btn>
                <Btn variant="ghost" className={mBtn} onClick={() => open("extend")}>
                  Extend
                </Btn>
                {paused ? (
                  <Btn variant="ghost" className={mBtn} onClick={() => open("resume")}>
                    Resume
                  </Btn>
                ) : (
                  <Btn variant="ghost" className={mBtn} onClick={() => open("pause")}>
                    Pause
                  </Btn>
                )}
                <Btn className={`${mBtn} col-span-2 sm:col-span-1`} onClick={() => open("invoice")}>
                  Create invoice
                </Btn>
              </div>
            )}
          </Card>

          {/* plan details */}
          <Section title="Plan details">
            <div>
              <div className="mb-1.5 flex justify-between gap-3 text-xs text-zinc-500">
                <span>
                  Day {elapsed} of {totalDays}
                </span>
                <span className="text-right">{paused ? "Paused" : stateLabel(st)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/5">
                <div
                  className={`h-full rounded-full ${
                    paused
                      ? "bg-sky-400"
                      : st.state === "ended"
                      ? "bg-red-400"
                      : st.state === "ending"
                      ? "bg-amber-400"
                      : "bg-emerald-400"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
              <Tile label="Plan amount" value={money(plan.amount)} />
              <Tile label="Posters" value={plan.posters} />
              <Tile label="Videos" value={plan.videos} />
              <Tile label="Duration" value={plural(totalDays, "day")} />
              {plan.extraItems.map((i) => (
                <Tile key={i.name} label={i.name} value={i.count} />
              ))}
            </div>

            <div>
              <p className="mb-2 text-xs text-zinc-500">Required services</p>
              <div className="flex flex-wrap gap-2">
                {plan.services.length ? (
                  plan.services.map((s) => (
                    <span
                      key={s}
                      className="rounded-lg border border-violet-500/20 bg-violet-500/10 px-3 py-1.5 text-xs text-violet-300"
                    >
                      {s}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-zinc-500">None added</span>
                )}
              </div>
            </div>

            {plan.notes && (
              <div>
                <p className="mb-1 text-xs text-zinc-500">Notes</p>
                <p className="whitespace-pre-wrap break-words text-sm text-zinc-300">{plan.notes}</p>
              </div>
            )}
          </Section>

          {/* posting progress */}
          <PostingSection
            plan={plan}
            busy={busy}
            canManage={canManage}
            onSave={(posted, note) =>
              run(() => savePosted(plan.id, posted, note, viewer.uid, viewer.name), "Posting updated.")
            }
          />

          {/* content plan */}
          <ContentPlanSection
            plan={plan}
            busy={busy}
            canManage={canManage}
            err={modal === null ? err : ""}
            onSave={(month, content) =>
              run(
                () => saveContentPlan(plan.id, month, content, viewer.uid, viewer.name),
                `Content plan saved for ${monthLabel(month)}.`
              )
            }
          />

          {earlier.length > 0 && (
            <Section title="Earlier content plans">
              <div className="space-y-2">
                {earlier.map((c) => (
                  <details key={c.month} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                    <summary className="min-h-6 cursor-pointer text-sm text-zinc-200">
                      {monthLabel(c.month)}
                      <span className="mt-0.5 block text-xs text-zinc-500 sm:ml-2 sm:mt-0 sm:inline">
                        {c.updatedByName} · {whenLabel(c.updatedAt)}
                      </span>
                    </summary>
                    <p className="mt-3 whitespace-pre-wrap break-words text-sm text-zinc-400">{c.content}</p>
                  </details>
                ))}
              </div>
              <p className="text-xs text-zinc-600">Earlier months are kept as they were and can't be changed.</p>
            </Section>
          )}

          {/* history */}
          <Section title="History">
            <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
              {events.map((e, i) => (
                <div key={`${e.at}-${i}`} className="border-l border-white/10 pl-3">
                  <p className="text-sm text-zinc-200">
                    {EVENT_LABEL[e.type] ?? e.type}
                    <span className="mt-0.5 block text-xs text-zinc-500 sm:ml-2 sm:mt-0 sm:inline">
                      {e.byName} · {whenLabel(e.at)}
                    </span>
                  </p>
                  {e.note && <p className="mt-0.5 break-words text-xs text-zinc-500">{e.note}</p>}
                </div>
              ))}
            </div>
          </Section>
        </>
      )}

      {/* invoices */}
      {view === "invoices" && (
        <Section
          title="Invoices"
          action={
            canManage ? (
              <Btn variant="ghost" className="min-h-10 sm:min-h-0" onClick={() => open("invoice")}>
                Create invoice
              </Btn>
            ) : undefined
          }
        >
          <Notice message={invoices.error} />
          <div className="space-y-2">
            {invoices.data.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-col gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="break-words text-sm font-medium text-white">
                    {inv.number} · {money(inv.total)}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Issued {fmtDate(inv.issueDate)} · Due {fmtDate(inv.dueDate)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={inv.status === "paid" ? "emerald" : "amber"}>
                    {inv.status === "paid" ? "Paid" : "Unpaid"}
                  </Badge>
                  <Btn variant="ghost" className="min-h-10 sm:min-h-0" onClick={() => printInvoice(inv)}>
                    Print / PDF
                  </Btn>
                  {inv.status !== "paid" && canManage && (
                    <Btn variant="ghost" className="min-h-10 sm:min-h-0" onClick={() => setPayTarget(inv)}>
                      Mark paid
                    </Btn>
                  )}
                </div>
              </div>
            ))}
            {!invoices.data.length && (
              <p className="text-sm text-zinc-500">{invoices.loading ? "Loading…" : "No invoices yet."}</p>
            )}
          </div>
        </Section>
      )}

      {/* modals (only ever opened when canManage is true) */}
      {canManage && modal === "edit" && (
        <PlanFormModal
          clientId={clientId}
          clientName={client.name}
          plan={plan}
          defaultServices={[]}
          busy={busy}
          err={err}
          onClose={() => setModal(null)}
          onSubmit={(input) => run(() => updatePlan(input, viewer.uid, viewer.name), "Plan updated.")}
        />
      )}

      {canManage && modal === "pause" && (
        <ReasonModal
          title="Pause plan"
          intro="Use this when the client delays payment or there is a shoot issue. The end date stays as it is until you resume, then it moves forward by the days paused."
          label="Reason"
          button="Pause plan"
          busy={busy}
          err={err}
          onClose={() => setModal(null)}
          onSubmit={(reason) => run(() => pausePlan(plan.id, reason, viewer.uid, viewer.name), "Plan paused.")}
        />
      )}

      {canManage && modal === "resume" && (
        <Modal title="Resume plan" onClose={() => !busy && setModal(null)}>
          <div className="space-y-4">
            <p className="text-sm text-zinc-300">
              Paused for <b className="text-white">{plural(pausedDays, "day")}</b>. The end date moves from{" "}
              <b className="text-white">{fmtDate(plan.endDate)}</b> to{" "}
              <b className="text-white">{fmtDate(nextEnd)}</b>.
            </p>
            <Notice message={err} />
            <div className="grid grid-cols-2 gap-2">
              <Btn variant="ghost" className="min-h-11" disabled={busy} onClick={() => setModal(null)}>
                Cancel
              </Btn>
              <Btn
                className="min-h-11"
                disabled={busy}
                onClick={() => run(() => resumePlan(plan.id, viewer.uid, viewer.name), "Plan resumed.")}
              >
                {busy ? "Saving…" : "Resume plan"}
              </Btn>
            </div>
          </div>
        </Modal>
      )}

      {canManage && modal === "extend" && (
        <ExtendModal
          plan={plan}
          busy={busy}
          err={err}
          onClose={() => setModal(null)}
          onSubmit={(newEnd, reason) =>
            run(() => extendPlan(plan.id, newEnd, reason, viewer.uid, viewer.name), "Plan extended.")
          }
        />
      )}

      {/* Create invoice → opens the existing bill creating modal */}
      {canManage && modal === "invoice" && (
        <AddBillModal
          onClose={() => setModal(null)}
          onSave={() => {
            setModal(null);
            onChanged("Bill created.");
          }}
        />
      )}

      {canManage && payTarget && (
        <ConfirmModal
          title="Mark invoice as paid?"
          message={`${payTarget.number} · ${money(payTarget.total)} will be marked as paid.`}
          confirmText="Mark paid"
          loading={paying}
          onClose={() => setPayTarget(null)}
          onConfirm={handleMarkPaid}
        />
      )}

      {invAlert && (
        <AlertModal
          type={invAlert.type}
          title={invAlert.title}
          message={invAlert.message}
          onClose={() => setInvAlert(null)}
        />
      )}
    </div>
  );
};

/* ───────────── posting progress ───────────── */

const PostingSection = ({
  plan,
  busy,
  canManage,
  onSave,
}: {
  plan: Plan;
  busy: boolean;
  canManage: boolean;
  onSave: (posted: Posted, note: string) => void;
}) => {
  const rows = postingRows(plan);
  const doneAll = rows.length > 0 && rows.every((r) => r.done >= r.total);

  const change = (row: PostRow, next: number) => {
    if (!canManage) return;
    const v = Math.min(row.total, Math.max(0, next));
    if (v === row.done) return;
    const d = postedOf(plan);
    const posted: Posted =
      row.key === "posters"
        ? { ...d, posters: v }
        : row.key === "videos"
        ? { ...d, videos: v }
        : { ...d, extra: { ...d.extra, [row.key.slice(6)]: v } };
    onSave(posted, `${row.label}: ${row.done} → ${v} of ${row.total} posted`);
  };

  return (
    <Section
      title="Posting progress"
      action={doneAll ? <Badge tone="emerald">All posted</Badge> : undefined}
    >
      {!rows.length ? (
        <p className="text-sm text-zinc-500">
          {canManage
            ? "No posters, videos or items in this plan. Use Edit plan to add them."
            : "No posters, videos or items in this plan."}
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const pct = Math.min(100, Math.round((r.done / r.total) * 100));
            const complete = r.done >= r.total;
            return (
              <div key={r.key} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                {/* phones: the text on top and the buttons on their own row, large enough to tap */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-medium text-white">
                      {r.label}{" "}
                      <span className="text-zinc-500">
                        · {r.done} of {r.total} posted
                      </span>
                    </p>
                    <p className="text-xs text-zinc-500">
                      {complete ? "Complete" : `${r.total - r.done} left`}
                    </p>
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-2">
                      <Btn
                        variant="ghost"
                        className="min-h-11 w-12 shrink-0 sm:min-h-0 sm:w-auto"
                        aria-label={`One less ${r.label} posted`}
                        disabled={busy || r.done <= 0}
                        onClick={() => change(r, r.done - 1)}
                      >
                        −
                      </Btn>
                      <Btn
                        className="min-h-11 flex-1 sm:min-h-0 sm:flex-none"
                        disabled={busy || complete}
                        onClick={() => change(r, r.done + 1)}
                      >
                        + Posted
                      </Btn>
                      {!complete && (
                        <Btn
                          variant="ghost"
                          className="min-h-11 flex-1 sm:min-h-0 sm:flex-none"
                          disabled={busy}
                          onClick={() => change(r, r.total)}
                        >
                          All done
                        </Btn>
                      )}
                    </div>
                  )}
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5">
                  <div
                    className={`h-full rounded-full ${complete ? "bg-emerald-400" : "bg-violet-400"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
};

/* ───────────── monthly content plan ───────────── */

const ContentPlanSection = ({
  plan,
  busy,
  canManage,
  err,
  onSave,
}: {
  plan: Plan;
  busy: boolean;
  canManage: boolean;
  err: string;
  onSave: (month: string, content: string) => void;
}) => {
  const [month, setMonth] = useState(monthKey());
  const saved = plan.contentPlans.find((c) => c.month === month)?.content ?? "";
  const [text, setText] = useState(saved);

  useEffect(() => {
    setText(saved);
  }, [month, saved, plan.id]);

  const previous = plan.contentPlans
    .filter((c) => c.month < month)
    .sort((a, b) => b.month.localeCompare(a.month))[0];

  return (
    <Section
      title="Monthly content plan"
      action={
        <input
          type="month"
          aria-label="Month"
          min={monthKey()}
          value={month}
          onChange={(e) => e.target.value && setMonth(e.target.value)}
          className={`${fieldCls} !w-auto`}
        />
      }
    >
      {!saved && (
        <p className="break-words text-sm text-amber-300">No content plan saved for {monthLabel(month)} yet.</p>
      )}
      <textarea
        rows={6}
        className={fieldCls}
        value={text}
        readOnly={!canManage}
        onChange={(e) => setText(e.target.value)}
        placeholder={
          canManage
            ? `What will be created in ${monthLabel(month)}? Topics, posters, video ideas, shoot dates…`
            : "No content plan yet."
        }
      />
      <Notice message={err} />
      {canManage && (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Btn
            className={mBtn}
            disabled={busy || !text.trim() || text === saved}
            onClick={() => onSave(month, text.trim())}
          >
            {busy ? "Saving…" : `Save ${monthLabel(month)}`}
          </Btn>
          {previous && (
            <Btn variant="ghost" className={mBtn} onClick={() => setText(previous.content)}>
              Copy from {monthLabel(previous.month)}
            </Btn>
          )}
        </div>
      )}
    </Section>
  );
};

/* ───────────── modals ───────────── */

const ReasonModal = ({
  title,
  intro,
  label,
  button,
  busy,
  err,
  onClose,
  onSubmit,
}: {
  title: string;
  intro: string;
  label: string;
  button: string;
  busy: boolean;
  err: string;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}) => {
  const [reason, setReason] = useState("");
  const [local, setLocal] = useState("");
  return (
    <Modal title={title} onClose={() => !busy && onClose()}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!reason.trim()) return setLocal(`Add the ${label.toLowerCase()}.`);
          setLocal("");
          onSubmit(reason.trim());
        }}
      >
        <p className="text-sm text-zinc-400">{intro}</p>
        <Label text={label}>
          <textarea rows={3} className={fieldCls} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Label>
        <Notice message={local || err} />
        <Btn type="submit" disabled={busy} className="min-h-11 w-full">
          {busy ? "Saving…" : button}
        </Btn>
      </form>
    </Modal>
  );
};

const ExtendModal = ({
  plan,
  busy,
  err,
  onClose,
  onSubmit,
}: {
  plan: Plan;
  busy: boolean;
  err: string;
  onClose: () => void;
  onSubmit: (newEnd: string, reason: string) => void;
}) => {
  const [newEnd, setNewEnd] = useState(addDays(plan.endDate, 30));
  const [reason, setReason] = useState("");
  const [local, setLocal] = useState("");

  return (
    <Modal title="Extend plan" onClose={() => !busy && onClose()}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (newEnd <= plan.endDate) return setLocal("The new end date must be after the current end date.");
          if (!reason.trim()) return setLocal("Add a reason for the extension.");
          setLocal("");
          onSubmit(newEnd, reason.trim());
        }}
      >
        <p className="text-sm text-zinc-400">Current end date: {fmtDate(plan.endDate)}</p>
        <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
          {[7, 15, 30].map((n) => (
            <Btn
              key={n}
              type="button"
              variant="ghost"
              className="min-h-11 sm:min-h-0"
              onClick={() => setNewEnd(addDays(plan.endDate, n))}
            >
              +{n} days
            </Btn>
          ))}
        </div>
        <Label text="New end date">
          <input
            type="date"
            min={addDays(plan.endDate, 1)}
            className={fieldCls}
            value={newEnd}
            onChange={(e) => setNewEnd(e.target.value)}
          />
        </Label>
        <Label text="Reason">
          <textarea rows={3} className={fieldCls} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Label>
        <Notice message={local || err} />
        <Btn type="submit" disabled={busy} className="min-h-11 w-full">
          {busy ? "Saving…" : "Extend plan"}
        </Btn>
      </form>
    </Modal>
  );
};

type ItemRow = { name: string; count: string };

const PlanFormModal = ({
  clientId,
  clientName,
  plan,
  defaultServices,
  busy,
  err,
  onClose,
  onSubmit,
}: {
  clientId: string;
  clientName: string;
  plan?: Plan;
  defaultServices: string[];
  busy: boolean;
  err: string;
  onClose: () => void;
  onSubmit: (input: PlanInput) => void;
}) => {
  const today = dateKey();
  const [startDate, setStartDate] = useState(plan?.startDate ?? today);
  const [endDate, setEndDate] = useState(plan?.endDate ?? addDays(today, 30));
  const [amount, setAmount] = useState(plan ? String(plan.amount) : "");
  const [services, setServices] = useState<string[]>(plan?.services ?? defaultServices);
  const [posters, setPosters] = useState(plan ? String(plan.posters) : "0");
  const [videos, setVideos] = useState(plan ? String(plan.videos) : "0");
  const [items, setItems] = useState<ItemRow[]>(
    plan?.extraItems.map((i) => ({ name: i.name, count: String(i.count) })) ?? []
  );
  const [notes, setNotes] = useState(plan?.notes ?? "");
  const [local, setLocal] = useState("");

  const options = Array.from(new Set<string>([...SERVICE_OPTIONS, ...services]));
  const toggle = (s: string) =>
    setServices((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));
  const setItem = (i: number, patch: Partial<ItemRow>) =>
    setItems((p) => p.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addItem = (name: string) =>
    setItems((p) =>
      p.some((r) => r.name.toLowerCase() === name.toLowerCase()) ? p : [...p, { name, count: "1" }]
    );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) return setLocal("Choose the start and end dates.");
    if (endDate <= startDate) return setLocal("The end date must be after the start date.");
    if (amount.trim() === "" || !(Number(amount) >= 0)) return setLocal("Enter the plan amount.");
    const extraItems: PlanItem[] = items
      .filter((r) => r.name.trim())
      .map((r) => ({ name: r.name.trim(), count: num(r.count) }));
    setLocal("");
    onSubmit({
      clientId,
      clientName,
      startDate,
      endDate,
      amount: Number(amount),
      services,
      posters: num(posters),
      videos: num(videos),
      extraItems,
      notes: notes.trim(),
    });
  };

  return (
    <Modal title={plan ? "Edit plan" : "Create plan"} onClose={() => !busy && onClose()}>
      <form onSubmit={submit} className="space-y-4">
        <p className="break-words text-sm text-zinc-400">{clientName}</p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Label text="Start date">
            <input type="date" className={fieldCls} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Label>
          <Label text="End date">
            <input type="date" className={fieldCls} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </Label>
        </div>

        <Label text="Plan amount (₹, for the whole period)">
          <input
            type="number"
            inputMode="decimal"
            min={0}
            className={fieldCls}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Label>

        <div>
          <p className="mb-2 text-sm text-zinc-400">Required services</p>
          <div className="flex flex-wrap gap-2">
            {options.map((s) => (
              <button
                type="button"
                key={s}
                aria-pressed={services.includes(s)}
                onClick={() => toggle(s)}
                className={`min-h-10 rounded-lg border px-3 text-xs transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 sm:min-h-9 ${
                  services.includes(s)
                    ? "border-violet-500 bg-violet-600 text-white"
                    : "border-white/10 text-zinc-400 hover:text-white"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Label text="Posters">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              className={fieldCls}
              value={posters}
              onChange={(e) => setPosters(e.target.value)}
            />
          </Label>
          <Label text="Videos">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              className={fieldCls}
              value={videos}
              onChange={(e) => setVideos(e.target.value)}
            />
          </Label>
        </div>

        <div>
          <p className="mb-2 text-sm text-zinc-400">Other items (brochure, company profile, show reel…)</p>
          <div className="mb-2 flex flex-wrap gap-2">
            {QUICK_ITEMS.map((q) => (
              <button
                type="button"
                key={q}
                onClick={() => addItem(q)}
                className="min-h-10 rounded-lg border border-white/10 px-3 text-xs text-zinc-400 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 sm:min-h-9"
              >
                + {q}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            {items.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  className={`${fieldCls} min-w-0 flex-1`}
                  aria-label="Item name"
                  placeholder="Item name"
                  value={r.name}
                  onChange={(e) => setItem(i, { name: e.target.value })}
                />
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  aria-label="Count"
                  className={`${fieldCls} !w-20 shrink-0 sm:!w-24`}
                  value={r.count}
                  onChange={(e) => setItem(i, { count: e.target.value })}
                />
                <Btn
                  type="button"
                  variant="ghost"
                  className="min-h-11 shrink-0 sm:min-h-0"
                  aria-label={`Remove ${r.name || "item"}`}
                  onClick={() => setItems((p) => p.filter((_, idx) => idx !== i))}
                >
                  ✕
                </Btn>
              </div>
            ))}
            <Btn
              type="button"
              variant="ghost"
              className="min-h-11 w-full sm:min-h-0 sm:w-auto"
              onClick={() => setItems((p) => [...p, { name: "", count: "1" }])}
            >
              + Add item
            </Btn>
          </div>
        </div>

        <Label text="Notes">
          <textarea rows={3} className={fieldCls} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Label>

        <Notice message={local || err} />
        <Btn type="submit" disabled={busy} className="min-h-11 w-full">
          {busy ? "Saving…" : plan ? "Save changes" : "Create plan"}
        </Btn>
      </form>
    </Modal>
  );
};

export default PlanManagement;