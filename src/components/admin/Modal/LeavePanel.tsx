import { useState } from "react";
import { dateKey, monthKey } from "../../../service/AttendanceService";
import { listStaff, type Staff } from "../../../service/staffService";
import {
  applyLeave,
  APPLY_TYPES,
  balanceFor,
  CASUAL_PER_MONTH,
  changeLeaveType,
  classifyLeaves,
  decideLeave,
  getLeaves,
  LEAVE_LABELS,
  LEAVE_TYPES,
  MEDICAL_PER_PERIOD,
  periodEnd,
  periodStart,
  removeLeave,
  setLeave,
  type Leave,
  type LeaveType,
} from "../../../service/LeaveService";
import {
  notifyLeaveApplied,
  notifyLeaveDecision,
} from "../../../service/NotificationService";
import { fmtNum } from "../../../utils/types/WorkRules";
import {
  Badge,
  Btn,
  Card,
  Label,
  Modal,
  Notice,
  errMsg,
  inputCls,
  useLoad,
  type Viewer,
} from "./Ui";

type Props = {
  viewer: Viewer;
  /** "all" = everyone (HR / admin), "own" = a staff member's own leave */
  scope: "all" | "own";
  /** HR and admin: mark leave, approve / reject, change status */
  canManage?: boolean;
};

type Mode = "manage" | "apply";

const TYPE_TONE = { casual: "sky", medical: "emerald", lop: "red", other: "zinc" } as const;

// items shown per page
const PENDING_PAGE_SIZE = 5;
const BALANCE_PAGE_SIZE = 10;
const LEAVE_PAGE_SIZE = 10;

const Th = ({ children }: { children?: React.ReactNode }) => (
  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">{children}</th>
);

const lastDay = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
};

/** slice one page out of a list; the page is clamped so it is always valid */
const paginate = <T,>(items: T[], page: number, size: number) => {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(Math.max(page, 1), pages);
  return { current, pages, rows: items.slice((current - 1) * size, current * size) };
};

/** page numbers with "…" gaps, e.g. 1 … 4 5 6 … 12 */
const pageList = (current: number, pages: number): (number | "gap")[] => {
  const keep = new Set([1, pages, current - 1, current, current + 1]);
  const nums = [...keep].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  nums.forEach((n, i) => {
    if (i > 0 && n - nums[i - 1] > 1) out.push("gap");
    out.push(n);
  });
  return out;
};

const Pagination = ({
  page,
  total,
  size,
  onChange,
}: {
  page: number;
  total: number;
  size: number;
  onChange: (p: number) => void;
}) => {
  if (total <= size) return null;
  const { current, pages } = paginate(new Array(total), page, size);
  const from = (current - 1) * size + 1;
  const to = Math.min(current * size, total);

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
      <p className="text-xs text-zinc-500">
        Showing {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-1.5">
        <Btn variant="ghost" disabled={current <= 1} onClick={() => onChange(current - 1)}>
          Prev
        </Btn>
        {/* numbered buttons need room, so phones only get "Page x of y" */}
        <div className="hidden items-center gap-1 sm:flex">
          {pageList(current, pages).map((n, i) =>
            n === "gap" ? (
              <span key={`gap-${i}`} className="px-1 text-zinc-500">
                …
              </span>
            ) : (
              <button
                key={n}
                type="button"
                onClick={() => onChange(n)}
                aria-current={n === current ? "page" : undefined}
                className={`h-8 min-w-8 rounded-md px-2 text-xs transition ${
                  n === current
                    ? "bg-sky-500/20 font-medium text-sky-200"
                    : "text-zinc-400 hover:bg-white/5"
                }`}
              >
                {n}
              </button>
            )
          )}
        </div>
        <span className="px-2 text-xs text-zinc-400 sm:hidden">
          Page {current} of {pages}
        </span>
        <Btn variant="ghost" disabled={current >= pages} onClick={() => onChange(current + 1)}>
          Next
        </Btn>
      </div>
    </div>
  );
};

const LeavePanel = ({ viewer, scope, canManage = false }: Props) => {
  const [month, setMonth] = useState(monthKey());
  const [mode, setMode] = useState<Mode | null>(null);
  const [form, setForm] = useState({
    uid: "",
    date: "",
    type: "casual" as LeaveType,
    half: false,
    note: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [pendingPage, setPendingPage] = useState(1);
  const [balancePage, setBalancePage] = useState(1);
  const [leavePage, setLeavePage] = useState(1);

  const staff = useLoad(
    () => (scope === "all" ? listStaff() : Promise.resolve([] as Staff[])),
    [scope],
    [] as Staff[]
  );
  // load the whole 2-month period so the medical leave balance is right
  const leaves = useLoad(
    () => getLeaves(periodStart(month), periodEnd(month)),
    [month],
    [] as Leave[]
  );

  const changeMonth = (m: string) => {
    setMonth(m);
    setPendingPage(1);
    setBalancePage(1);
    setLeavePage(1);
  };

  const people =
    scope === "all"
      ? staff.data.filter((s) => s.active).map((s) => ({ uid: s.uid, name: s.name }))
      : [{ uid: viewer.uid, name: viewer.name }];

  const visible = scope === "own" ? leaves.data.filter((l) => l.uid === viewer.uid) : leaves.data;
  const cls = new Map(classifyLeaves(visible).map((c) => [c.id, c]));

  const entries = visible
    .filter((l) => l.month === month)
    .sort((a, b) => b.date.localeCompare(a.date));
  const pending = visible
    .filter((l) => l.status === "pending")
    .sort((a, b) => a.date.localeCompare(b.date));

  const pendingView = paginate(pending, pendingPage, PENDING_PAGE_SIZE);
  const balanceView = paginate(people, balancePage, BALANCE_PAGE_SIZE);
  const entriesView = paginate(entries, leavePage, LEAVE_PAGE_SIZE);

  // numbers for the people on the current balance page
  const balanceRows = balanceView.rows.map((p) => {
    const b = balanceFor(leaves.data, p.uid, month);
    const unpaid = [...cls.values()]
      .filter((l) => l.uid === p.uid && l.month === month)
      .reduce((n, l) => n + l.unpaidDays, 0);
    return { p, b, unpaid };
  });

  const guard = async (fn: () => Promise<void>) => {
    setErr("");
    try {
      await fn();
      leaves.reload();
    } catch (e) {
      setErr(errMsg(e));
    }
  };

  // HR approves / rejects → save, then tell the staff member (not awaited: a failed alert never blocks this)
  const decide = (l: Leave, decision: "approved" | "rejected") =>
    guard(async () => {
      await decideLeave(l.id, decision, viewer.uid, viewer.name);
      void notifyLeaveDecision(
        decision,
        {
          uid: l.uid,
          name: l.name,
          date: l.date,
          typeLabel: LEAVE_LABELS[l.type],
          half: l.half,
        },
        { uid: viewer.uid, name: viewer.name }
      );
    });

  const openForm = (m: Mode) => {
    const today = dateKey();
    setForm({
      uid: m === "apply" ? viewer.uid : "",
      date: today.startsWith(month) ? today : `${month}-01`,
      type: "casual",
      half: false,
      note: "",
    });
    setErr("");
    setMode(m);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const person = people.find((p) => p.uid === (mode === "apply" ? viewer.uid : form.uid));
    if (!person) return setErr("Choose the staff member.");
    if (!form.date) return setErr("Choose the date.");
    if (mode === "apply" && !form.note.trim()) return setErr("Add a reason for the leave.");

    setSaving(true);
    await guard(async () => {
      const base = {
        uid: person.uid,
        name: person.name,
        date: form.date,
        type: form.type,
        half: form.half,
        note: form.note.trim(),
      };
      if (mode === "apply") {
        await applyLeave(base);
        // staff applied → tell the HR manager
        void notifyLeaveApplied({
          uid: person.uid,
          name: person.name,
          date: form.date,
          typeLabel: LEAVE_LABELS[form.type],
          half: form.half,
          note: form.note.trim(),
        });
      } else {
        await setLeave({ ...base, setBy: viewer.uid, setByName: viewer.name });
      }
      setMode(null);
    });
    setSaving(false);
  };

  // warn when the chosen leave type has less balance left than this leave needs
  const bal = form.uid ? balanceFor(leaves.data, form.uid, month) : null;
  const needed = form.half ? 0.5 : 1;
  const hint = !bal
    ? ""
    : form.type === "casual" && bal.casualLeft < needed
    ? "Not enough casual leave left this month. The extra day will be unpaid."
    : form.type === "medical" && bal.medicalLeft < needed
    ? "Not enough medical leave left in this 2-month period. The extra day will be unpaid."
    : form.type === "lop"
    ? "Loss of Pay. This leave will be unpaid."
    : "";

  const card = (l: Leave) => {
    const c = cls.get(l.id);
    const pay =
      l.status === "approved" && c ? (
        c.unpaidDays === 0 ? (
          <Badge tone="emerald">Paid</Badge>
        ) : c.paidDays === 0 ? (
          <Badge tone="red">Unpaid</Badge>
        ) : (
          <Badge tone="amber">Partly paid</Badge>
        )
      ) : null;

    return (
      <Card key={l.id} className="p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="break-words font-medium">
              {scope === "all" && `${l.name} · `}
              {l.date}
            </p>
            {l.note && <p className="mt-1 break-words text-sm text-zinc-400">{l.note}</p>}
            <p className="mt-1 text-xs text-zinc-500">
              {l.setBy === l.uid ? "Applied by staff" : `Marked by ${l.setByName}`}
              {l.decidedByName && l.decidedBy !== l.setBy && ` · Decided by ${l.decidedByName}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <Badge tone={TYPE_TONE[l.type]}>{LEAVE_LABELS[l.type]}</Badge>
            {l.half && <Badge tone="zinc">Half day</Badge>}
            {l.status === "pending" && <Badge tone="amber">Pending</Badge>}
            {l.status === "rejected" && <Badge tone="red">Rejected</Badge>}
            {pay}
          </div>
        </div>

        {canManage && (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <select
              value={l.type}
              onChange={(e) =>
                guard(() => changeLeaveType(l.id, e.target.value as LeaveType))
              }
              className={`${inputCls} sm:!w-auto sm:!py-1`}
            >
              {LEAVE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {LEAVE_LABELS[t]}
                </option>
              ))}
            </select>
            <div className="flex flex-wrap gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">
              {l.status !== "approved" && <Btn onClick={() => decide(l, "approved")}>Approve</Btn>}
              {l.status === "pending" && (
                <Btn variant="danger" onClick={() => decide(l, "rejected")}>
                  Reject
                </Btn>
              )}
              {l.status !== "pending" && (
                <Btn variant="ghost" onClick={() => guard(() => removeLeave(l.id))}>
                  Remove
                </Btn>
              )}
            </div>
          </div>
        )}

        {scope === "own" && l.status === "pending" && (
          <div className="mt-3">
            <Btn
              variant="ghost"
              className="w-full sm:w-auto"
              onClick={() => guard(() => removeLeave(l.id))}
            >
              Cancel request
            </Btn>
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <input
          type="month"
          value={month}
          onChange={(e) => e.target.value && changeMonth(e.target.value)}
          className={`${inputCls} sm:!w-auto`}
        />
        <div className="flex flex-col gap-2 sm:ml-auto sm:flex-row">
          {scope === "own" && (
            <Btn className="w-full sm:w-auto" onClick={() => openForm("apply")}>
              Apply leave
            </Btn>
          )}
          {canManage && (
            <Btn className="w-full sm:w-auto" onClick={() => openForm("manage")}>
              Mark leave
            </Btn>
          )}
        </div>
      </div>

      <p className="text-xs text-zinc-500">
        Policy: {CASUAL_PER_MONTH} casual leave per month and {MEDICAL_PER_PERIOD} medical leave every
        2 months. A half day uses 0.5. Extra days are Loss of Pay.
      </p>

      <Notice message={err || leaves.error || staff.error} />

      {/* requests waiting for HR / admin */}
      {canManage && pending.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-sky-200">
            {pending.length} leave request{pending.length > 1 ? "s" : ""} waiting for approval
          </p>
          {pendingView.rows.map(card)}
          <Pagination
            page={pendingView.current}
            total={pending.length}
            size={PENDING_PAGE_SIZE}
            onChange={setPendingPage}
          />
        </div>
      )}

      {/* balances: cards on phones, table from sm up */}
      <div className="space-y-3">
        <div className="space-y-3 sm:hidden">
          {balanceRows.map(({ p, b, unpaid }) => (
            <Card key={p.uid} className="p-3">
              <p className="break-words font-medium">{p.name}</p>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                <div>
                  <dt className="text-xs text-zinc-500">Casual</dt>
                  <dd>{fmtNum(b.casualLeft)} left</dd>
                  <dd className="text-xs text-zinc-500">{fmtNum(b.casualUsed)} used</dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">Medical</dt>
                  <dd>{fmtNum(b.medicalLeft)} left</dd>
                  <dd className="text-xs text-zinc-500">{fmtNum(b.medicalUsed)} used</dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">Unpaid</dt>
                  <dd>{fmtNum(unpaid)}</dd>
                </div>
              </dl>
            </Card>
          ))}
          {!people.length && (
            <Card className="p-6 text-center text-sm text-zinc-500">
              {staff.loading ? "Loading…" : "No staff."}
            </Card>
          )}
        </div>

        <Card className="hidden overflow-x-auto sm:block">
          <table className="w-full text-sm">
            <thead className="border-b border-white/5">
              <tr>
                <Th>Staff</Th>
                <Th>Casual (this month)</Th>
                <Th>Medical (this 2 months)</Th>
                <Th>Unpaid days</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {balanceRows.map(({ p, b, unpaid }) => (
                <tr key={p.uid}>
                  <td className="px-4 py-3">{p.name}</td>
                  <td className="px-4 py-3">
                    {fmtNum(b.casualLeft)} left{" "}
                    <span className="text-zinc-500">({fmtNum(b.casualUsed)} used)</span>
                  </td>
                  <td className="px-4 py-3">
                    {fmtNum(b.medicalLeft)} left{" "}
                    <span className="text-zinc-500">({fmtNum(b.medicalUsed)} used)</span>
                  </td>
                  <td className="px-4 py-3">{fmtNum(unpaid)}</td>
                </tr>
              ))}
              {!people.length && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-zinc-500">
                    {staff.loading ? "Loading…" : "No staff."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>

        <Pagination
          page={balanceView.current}
          total={people.length}
          size={BALANCE_PAGE_SIZE}
          onChange={setBalancePage}
        />
      </div>

      {/* this month's leave */}
      <div className="space-y-3">
        {entriesView.rows.map(card)}
        {!entries.length && (
          <Card className="p-8 text-center text-sm text-zinc-500">
            {leaves.loading ? "Loading…" : "No leave this month."}
          </Card>
        )}
        <Pagination
          page={entriesView.current}
          total={entries.length}
          size={LEAVE_PAGE_SIZE}
          onChange={setLeavePage}
        />
      </div>

      {mode && (
        <Modal title={mode === "apply" ? "Apply leave" : "Mark leave"} onClose={() => setMode(null)}>
          <form onSubmit={submit} className="space-y-4">
            {mode === "manage" && (
              <Label text="Staff">
                <select
                  className={inputCls}
                  value={form.uid}
                  onChange={(e) => setForm({ ...form, uid: e.target.value })}
                >
                  <option value="">Choose staff…</option>
                  {people.map((p) => (
                    <option key={p.uid} value={p.uid}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </Label>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Label text="Date">
                <input
                  type="date"
                  min={`${month}-01`}
                  max={lastDay(month)}
                  className={inputCls}
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </Label>
              <Label text="Day">
                <select
                  className={inputCls}
                  value={form.half ? "half" : "full"}
                  onChange={(e) => setForm({ ...form, half: e.target.value === "half" })}
                >
                  <option value="full">Full day</option>
                  <option value="half">Half day</option>
                </select>
              </Label>
            </div>

            <Label text="Leave type">
              <select
                className={inputCls}
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as LeaveType })}
              >
                {(mode === "apply" ? APPLY_TYPES : LEAVE_TYPES).map((t) => (
                  <option key={t} value={t}>
                    {LEAVE_LABELS[t]}
                  </option>
                ))}
              </select>
            </Label>

            <Label text={mode === "apply" ? "Reason" : "Note (optional)"}>
              <textarea
                rows={2}
                className={inputCls}
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </Label>

            {hint && <p className="text-sm text-amber-400">{hint}</p>}

            <Notice message={err} />
            <Btn type="submit" disabled={saving} className="w-full">
              {saving ? "Saving…" : mode === "apply" ? "Send request" : "Save leave"}
            </Btn>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default LeavePanel;