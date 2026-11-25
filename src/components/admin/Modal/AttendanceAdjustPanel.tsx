import { useState } from "react";
import { getAllMonth, monthKey, type Attendance } from "../../../service/AttendanceService";
import { listStaff, type Staff } from "../../../service/staffService";
import {
  clearDayMark,
  listExtras,
  setDayMark,
  type Extras,
} from "../../../service/AttendanceExtrasService";
import {
  creditLabel,
  MARK_LABELS,
  markCredit,
  type DayMark,
} from "../../../utils/types/WorkRules";
import {
  computeDay,
  fmtHHMM,
  RULES,
  toMs,
  type BreakEntry,
  type DayResult,
} from "../../../utils/types/AttendanceRules";
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
import SelfieThumbs from "./SelfieThumbs"; // save next to this file

type Entry = {
  uid: string;
  date: string;
  day: DayResult; // result of the attendance rules (9:30 start, 10:10 half-day, missed checkout…)
  checkIn?: number;
  checkOut?: number;
  extras?: Extras;
  rec?: Attendance; // the attendance record, for the selfies
};

const MARKS: DayMark[] = ["full", "half", "absent"];
const CREDIT_TONE = (c: number) => (c >= 1 ? "emerald" : c > 0 ? "amber" : "red");

// days shown per page
const PAGE_SIZE = 10;

const time = (ms?: number) =>
  ms ? new Date(ms).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : "";

const lastDay = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
};

// lunch / tea times saved by the break buttons -> the shape the rules expect
const breaksOf = (x?: Extras): BreakEntry[] => [
  ...(x?.lunchStart ? [{ type: "lunch" as const, start: x.lunchStart, end: x.lunchEnd }] : []),
  ...(x?.teaStart ? [{ type: "tea" as const, start: x.teaStart, end: x.teaEnd }] : []),
];

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
  pages,
  total,
  size,
  onChange,
}: {
  page: number;
  pages: number;
  total: number;
  size: number;
  onChange: (p: number) => void;
}) => {
  if (total <= size) return null;
  const from = (page - 1) * size + 1;
  const to = Math.min(page * size, total);

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
      <p className="text-xs text-zinc-500">
        Showing {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-1.5">
        <Btn variant="ghost" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Prev
        </Btn>
        {/* numbered buttons need room, so phones only get "Page x of y" */}
        <div className="hidden items-center gap-1 sm:flex">
          {pageList(page, pages).map((n, i) =>
            n === "gap" ? (
              <span key={`gap-${i}`} className="px-1 text-zinc-500">
                …
              </span>
            ) : (
              <button
                key={n}
                type="button"
                onClick={() => onChange(n)}
                aria-current={n === page ? "page" : undefined}
                className={`h-8 min-w-8 rounded-md px-2 text-xs transition ${
                  n === page
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
          Page {page} of {pages}
        </span>
        <Btn variant="ghost" disabled={page >= pages} onClick={() => onChange(page + 1)}>
          Next
        </Btn>
      </div>
    </div>
  );
};

/** HR / admin: review each day (with selfies) and mark full or half day with a reason. */
const AttendanceAdjustPanel = ({ viewer }: { viewer: Viewer }) => {
  const [month, setMonth] = useState(monthKey());
  const [who, setWho] = useState("all");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<{
    uid: string;
    date: string;
    mark: DayMark;
    reason: string;
    existing: boolean;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const staff = useLoad(() => listStaff(), [], [] as Staff[]);
  const att = useLoad(() => getAllMonth(month), [month], [] as Attendance[]);
  const extras = useLoad(() => listExtras(month), [month], [] as Extras[]);

  const nameOf = (uid: string) => staff.data.find((s) => s.uid === uid)?.name ?? "Unknown";

  // one entry per person per day: attendance records plus days HR added by hand
  const extrasById = new Map(extras.data.map((x) => [x.id, x]));
  const map = new Map<string, Entry>();

  att.data
    .filter((r) => r.checkIn)
    .forEach((r) => {
      const key = `${r.uid}_${r.date}`;
      const x = extrasById.get(key);
      map.set(key, {
        uid: r.uid,
        date: r.date,
        extras: x,
        rec: r,
        checkIn: toMs(r.checkIn) ?? undefined,
        checkOut: toMs(r.checkOut) ?? undefined,
        day: computeDay({ date: r.date, checkIn: r.checkIn, checkOut: r.checkOut, breaks: breaksOf(x) }),
      });
    });

  extras.data.forEach((x) => {
    if (!map.has(x.id) && x.mark)
      map.set(x.id, { uid: x.uid, date: x.date, extras: x, day: computeDay({ date: x.date }) });
  });

  const flaggedCount = [...map.values()].filter((e) => e.rec?.flagged).length;

  const entries = [...map.values()]
    .filter((e) => who === "all" || e.uid === who)
    .filter((e) => !flaggedOnly || e.rec?.flagged)
    .sort((a, b) => b.date.localeCompare(a.date) || nameOf(a.uid).localeCompare(nameOf(b.uid)));

  // paginate; the page is clamped so it stays valid after filters or data change
  const pages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const pageRows = entries.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  // missed-checkout days nobody has resolved yet (across all pages)
  const toReview = entries.filter((e) => e.day.needsReview && !e.extras?.mark).length;

  const reloadAll = () => {
    att.reload();
    extras.reload();
  };

  const openFor = (e: Entry) => {
    const auto = e.day.credit;
    const current = e.extras?.mark ?? (auto >= 1 ? "full" : auto > 0 ? "half" : "absent");
    setErr("");
    setForm({
      uid: e.uid,
      date: e.date,
      mark: current,
      reason: e.extras?.markReason ?? "",
      existing: !!e.extras?.mark,
    });
  };

  const openNew = () => {
    setErr("");
    setForm({ uid: "", date: `${month}-01`, mark: "full", reason: "", existing: false });
  };

  const run = async (fn: () => Promise<void>) => {
    setErr("");
    setSaving(true);
    try {
      await fn();
      reloadAll();
      setForm(null);
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    if (!form.uid) return setErr("Choose the staff member.");
    if (!form.date) return setErr("Choose the date.");
    if (!form.reason.trim()) return setErr("Add a reason for the change.");
    run(() =>
      setDayMark({
        uid: form.uid,
        date: form.date,
        mark: form.mark,
        reason: form.reason.trim(),
        by: viewer.uid,
        byName: viewer.name,
      })
    );
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <input
          type="month"
          value={month}
          onChange={(e) => {
            if (e.target.value) {
              setMonth(e.target.value);
              setPage(1);
            }
          }}
          className={`${inputCls} sm:!w-auto`}
        />
        <select
          value={who}
          onChange={(e) => {
            setWho(e.target.value);
            setPage(1);
          }}
          className={`${inputCls} sm:!w-auto`}
        >
          <option value="all">Everyone</option>
          {staff.data
            .filter((s) => s.active)
            .map((s) => (
              <option key={s.uid} value={s.uid}>
                {s.name}
              </option>
            ))}
        </select>
        <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={flaggedOnly}
            onChange={(e) => {
              setFlaggedOnly(e.target.checked);
              setPage(1);
            }}
          />
          Only face-check flagged ({flaggedCount})
        </label>
        <Btn className="w-full sm:ml-auto sm:w-auto" onClick={openNew}>
          Mark a day
        </Btn>
      </div>

      {/* the rules are long, so they fold away to save screen space */}
      <details className="group rounded-xl border border-white/5 px-3 py-2 sm:px-4">
        <summary className="cursor-pointer list-none text-xs font-medium text-zinc-400 hover:text-zinc-200">
          How attendance is counted
          <span className="ml-1 text-zinc-600 group-open:hidden">(tap to show)</span>
        </summary>
        <p className="mt-2 text-xs leading-relaxed text-zinc-500">
          Flexible timing: arrive between {fmtHHMM(RULES.shiftStart)} and {fmtHHMM(RULES.flexStart)} and work{" "}
          {RULES.shiftHours} hours ({fmtHHMM(RULES.shiftStart)} to 6:30 PM up to {fmtHHMM(RULES.flexStart)} to
          7:00 PM). Check-in before {fmtHHMM(RULES.shiftStart)} counts from {fmtHHMM(RULES.shiftStart)}. After{" "}
          {fmtHHMM(RULES.flexStart)} is Late, and after {fmtHHMM(RULES.halfDayAfter)} is a half day. Leaving
          before the end time is a half day. {RULES.fullDayHours} hours or more is a full day and{" "}
          {RULES.halfDayHours} to under {RULES.fullDayHours} hours is a half day (allowed breaks included). A
          day with no check-out is not counted until you adjust it. Use Adjust to change a day with a reason.
        </p>
      </details>

      {toReview > 0 && (
        <p className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          {toReview} day{toReview === 1 ? "" : "s"} with a missed check-out need your review. They count as
          0 until you adjust them.
        </p>
      )}

      <Notice message={err || staff.error || att.error || extras.error} />

      <div className="space-y-3">
        {pageRows.map((e) => {
          const auto = e.day.credit;
          const marked = e.extras?.mark;
          const final = marked ? markCredit(marked) : auto;
          const x = e.extras;
          const d = e.day;
          const needsReview = d.needsReview && !marked;

          return (
            <Card key={`${e.uid}_${e.date}`} className="p-3 sm:p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="break-words font-medium">
                    {nameOf(e.uid)} · {e.date}
                  </p>
                  <p className="mt-1 break-words text-xs leading-relaxed text-zinc-500">
                    {e.checkIn ? `In ${time(e.checkIn)}` : "No check-in"}
                    {d.earlyMinutesIgnored > 0 && ` (counted from ${RULES.shiftStart})`}
                    {e.checkOut && ` · Out ${time(e.checkOut)}`}
                    {e.checkIn && d.requiredEnd && ` · Day ends ${time(d.requiredEnd)}`}
                    {e.checkIn && d.status !== "missed_checkout" && ` · ${d.workedHours.toFixed(1)} hours`}
                    {x?.lunchStart && ` · Lunch ${time(x.lunchStart)}–${time(x.lunchEnd) || "…"}`}
                    {x?.teaStart && ` · Tea ${time(x.teaStart)}–${time(x.teaEnd) || "…"}`}
                    {d.excessBreakMinutes > 0 && ` · ${d.excessBreakMinutes} min extra break deducted`}
                    {d.earlyLeaveMinutes > 0 && ` · left ${d.earlyLeaveMinutes} min early`}
                    {d.overtimeMinutes > 0 && ` · ${d.overtimeMinutes} min after the end time (not counted)`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  {d.status === "in_progress" && !marked ? (
                    <Badge tone="sky">In progress</Badge>
                  ) : (
                    <Badge tone={CREDIT_TONE(final)}>{creditLabel(final)}</Badge>
                  )}
                  {d.status === "missed_checkout" && <Badge tone="red">Missed check-out</Badge>}
                  {d.late && !d.lateHalfDay && <Badge tone="amber">Late</Badge>}
                  {d.lateHalfDay && <Badge tone="amber">Late: half day</Badge>}
                  {d.earlyLeave && <Badge tone="amber">Early leave: half day</Badge>}
                  {e.rec?.flagged && <Badge tone="amber">Check face</Badge>}
                  {marked && <Badge tone="sky">Adjusted</Badge>}
                </div>
              </div>

              {/* check-in / check-out selfies, with the profile photo to compare */}
              {e.rec && (
                <div className="mt-3 overflow-x-auto">
                  <SelfieThumbs
                    record={e.rec}
                    profileUrl={staff.data.find((s) => s.uid === e.uid)?.photoUrl}
                  />
                </div>
              )}

              {needsReview && (
                <p className="mt-2 text-sm text-amber-300">
                  Forgot to check out. This day counts as 0 until you adjust it.
                </p>
              )}

              {marked && (
                <p className="mt-2 break-words text-sm text-zinc-400">
                  Automatic: {creditLabel(auto)}. {x?.markByName} changed it to{" "}
                  {MARK_LABELS[marked]}: {x?.markReason}
                </p>
              )}

              <div className="mt-3">
                <Btn variant="ghost" className="w-full sm:w-auto" onClick={() => openFor(e)}>
                  {needsReview ? "Review & adjust" : "Adjust"}
                </Btn>
              </div>
            </Card>
          );
        })}

        {!entries.length && (
          <Card className="p-8 text-center text-sm text-zinc-500">
            {att.loading || extras.loading ? "Loading…" : "No attendance this month."}
          </Card>
        )}

        <Pagination
          page={current}
          pages={pages}
          total={entries.length}
          size={PAGE_SIZE}
          onChange={setPage}
        />
      </div>

      {form && (
        <Modal title="Adjust attendance" onClose={() => setForm(null)}>
          <form onSubmit={submit} className="space-y-4">
            <Label text="Staff">
              <select
                className={inputCls}
                value={form.uid}
                disabled={form.existing || map.has(`${form.uid}_${form.date}`)}
                onChange={(e) => setForm({ ...form, uid: e.target.value })}
              >
                <option value="">Choose staff…</option>
                {staff.data
                  .filter((s) => s.active)
                  .map((s) => (
                    <option key={s.uid} value={s.uid}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </Label>

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
              <Label text="Mark as">
                <select
                  className={inputCls}
                  value={form.mark}
                  onChange={(e) => setForm({ ...form, mark: e.target.value as DayMark })}
                >
                  {MARKS.map((m) => (
                    <option key={m} value={m}>
                      {MARK_LABELS[m]}
                    </option>
                  ))}
                </select>
              </Label>
            </div>

            <Label text="Reason">
              <textarea
                rows={3}
                className={inputCls}
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
              />
            </Label>

            <Notice message={err} />
            <Btn type="submit" disabled={saving} className="w-full">
              {saving ? "Saving…" : "Save"}
            </Btn>
            {form.existing && (
              <Btn
                type="button"
                variant="ghost"
                disabled={saving}
                className="w-full"
                onClick={() => run(() => clearDayMark(form.uid, form.date))}
              >
                Remove adjustment (use automatic)
              </Btn>
            )}
          </form>
        </Modal>
      )}
    </div>
  );
};

export default AttendanceAdjustPanel;