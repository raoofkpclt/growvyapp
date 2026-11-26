import { useEffect, useState } from "react";
import {
  getAllMonth,
  getMyMonth,
  getToday,
  hoursWorked,
  markCheckIn,
  markCheckOut,
  monthKey,
  sweepAllScheduledBreaks,
  type Attendance,
} from "../../service/AttendanceService";
import { Btn, Card, Notice, errMsg, fmtTime, inputCls, useLoad, type Viewer } from "./Modal/Ui";

/** Check in / check out for today. Used on the dashboard and attendance tab. */
export const CheckInCard = ({
  viewer,
  onChange,
}: {
  viewer: Viewer;
  onChange?: () => void;
}) => {
  const today = useLoad(() => getToday(viewer.uid), [viewer.uid], null as Attendance | null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const rec = today.data;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setErr("");
    try {
      await fn();
      today.reload();
      onChange?.();
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:p-5">
      <div className="min-w-0">
        <p className="text-xs text-zinc-500">
          {new Date().toLocaleDateString("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
        <p className="mt-1 text-lg font-bold">
          {!rec
            ? "Not checked in"
            : rec.checkOut
            ? `Done for today · ${hoursWorked(rec).toFixed(1)} h`
            : `Checked in at ${fmtTime(rec.checkIn)}`}
        </p>
        <Notice message={err || today.error} />
      </div>

      {!rec && (
        <Btn
          className="w-full sm:w-auto"
          disabled={busy || today.loading}
          onClick={() => run(() => markCheckIn(viewer.uid, viewer.name))}
        >
          Check in
        </Btn>
      )}
      {rec && !rec.checkOut && (
        <Btn
          variant="ghost"
          className="w-full sm:w-auto"
          disabled={busy}
          onClick={() => run(() => markCheckOut(viewer.uid))}
        >
          Check out
        </Btn>
      )}
    </Card>
  );
};

const Th = ({ children, center }: { children?: React.ReactNode; center?: boolean }) => (
  <th
    className={`px-4 py-3 text-xs font-medium text-zinc-500 ${center ? "text-center" : "text-left"}`}
  >
    {children}
  </th>
);

/* ───────────── pagination ───────────── */

const PAGE_SIZES = [10, 25, 50];

/** page state for one list. Goes back to page 1 when `resetKey` or the page size changes. */
const usePager = (total: number, resetKey: string, initialSize = 10) => {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(initialSize);

  useEffect(() => {
    setPage(1);
  }, [resetKey, size]);

  const pages = Math.max(1, Math.ceil(total / size));
  const current = Math.min(page, pages);
  const start = (current - 1) * size;
  const end = Math.min(total, start + size);

  return { page: current, pages, size, setPage, setSize, start, end, total };
};

type Pager = ReturnType<typeof usePager>;

const Pager = ({ p }: { p: Pager }) => {
  if (p.total <= PAGE_SIZES[0]) return null; // everything fits on one page

  return (
    <div className="flex flex-col gap-3 border-t border-white/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center justify-between gap-3 sm:justify-start">
        <p className="text-xs text-zinc-500">
          {p.start + 1}–{p.end} of {p.total}
        </p>
        <label className="flex items-center gap-2 text-xs text-zinc-500">
          Rows
          <select
            value={p.size}
            onChange={(e) => p.setSize(Number(e.target.value))}
            className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white focus:outline-none"
          >
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n} className="bg-[#0f1117]">
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <Btn
          variant="ghost"
          className="flex-1 sm:flex-none"
          disabled={p.page <= 1}
          onClick={() => p.setPage(p.page - 1)}
        >
          ← Prev
        </Btn>
        <span className="shrink-0 px-2 text-xs tabular-nums text-zinc-400">
          Page {p.page} / {p.pages}
        </span>
        <Btn
          variant="ghost"
          className="flex-1 sm:flex-none"
          disabled={p.page >= p.pages}
          onClick={() => p.setPage(p.page + 1)}
        >
          Next →
        </Btn>
      </div>
    </div>
  );
};

/**
 * scope "own": my monthly history
 * scope "all": every staff member's attendance (HR, Operation Manager, Admin)
 */
const AttendancePanel = ({ viewer, scope }: { viewer: Viewer; scope: "own" | "all" }) => {
  const [month, setMonth] = useState(monthKey());
  const [who, setWho] = useState("all");

  const data = useLoad(
    () => (scope === "own" ? getMyMonth(viewer.uid, month) : getAllMonth(month)),
    [scope, viewer.uid, month],
    [] as Attendance[]
  );

  // lunch / tea auto check-out for everyone who is still checked in
  useEffect(() => {
    if (scope !== "all") return;
    const run = () => void sweepAllScheduledBreaks().catch(() => {});
    run();
    const id = setInterval(run, 60_000);
    return () => clearInterval(id);
  }, [scope]);

  const rows = scope === "all" && who !== "all" ? data.data.filter((r) => r.uid === who) : data.data;
  const people = [...new Map(data.data.map((r) => [r.uid, r.name])).entries()];

  const summary = people.map(([uid, name]) => {
    const mine = data.data.filter((r) => r.uid === uid);
    return {
      uid,
      name,
      days: mine.filter((r) => r.checkIn).length,
      hours: mine.reduce((sum, r) => sum + hoursWorked(r), 0),
    };
  });

  // one pager for each list, both reset when the month or person changes
  const resetKey = `${scope}|${month}|${who}`;
  const sumPager = usePager(summary.length, resetKey);
  const rowPager = usePager(rows.length, resetKey);

  const pagedSummary = summary.slice(sumPager.start, sumPager.end);
  const pagedRows = rows.slice(rowPager.start, rowPager.end);

  const emptyText = (text: string) => (data.loading ? "Loading…" : text);

  return (
    <div className="min-w-0 space-y-4 sm:space-y-5">
      {/* filters: full width on phones */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
        <input
          type="month"
          value={month}
          onChange={(e) => e.target.value && setMonth(e.target.value)}
          className={`${inputCls} sm:!w-auto`}
        />
        {scope === "all" && (
          <select
            value={who}
            onChange={(e) => setWho(e.target.value)}
            className={`${inputCls} sm:!w-auto`}
          >
            <option value="all">All staff</option>
            {people.map(([uid, name]) => (
              <option key={uid} value={uid}>
                {name}
              </option>
            ))}
          </select>
        )}
      </div>

      <Notice message={data.error} />

      {/* ───────── summary per person (all staff view) ───────── */}
      {scope === "all" && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-zinc-200">Summary</h3>

          {/* phones: cards */}
          <div className="space-y-2 md:hidden">
            {pagedSummary.map((s) => (
              <Card key={s.uid} className="p-3">
                <p className="truncate text-sm font-medium text-white">{s.name}</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-white/[0.03] px-3 py-2">
                    <p className="text-zinc-500">Days present</p>
                    <p className="mt-0.5 text-sm font-semibold tabular-nums text-zinc-100">{s.days}</p>
                  </div>
                  <div className="rounded-lg bg-white/[0.03] px-3 py-2">
                    <p className="text-zinc-500">Total hours</p>
                    <p className="mt-0.5 text-sm font-semibold tabular-nums text-zinc-100">
                      {s.hours.toFixed(1)}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
            {!summary.length && (
              <Card className="p-6 text-center text-sm text-zinc-500">
                {emptyText("No attendance this month.")}
              </Card>
            )}
            <Card>
              <Pager p={sumPager} />
            </Card>
          </div>

          {/* tablets and desktops: table */}
          <Card className="hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-white/5">
                  <tr>
                    <Th>Staff</Th>
                    <Th>Days present</Th>
                    <Th>Total hours</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {pagedSummary.map((s) => (
                    <tr key={s.uid}>
                      <td className="px-4 py-3">{s.name}</td>
                      <td className="px-4 py-3">{s.days}</td>
                      <td className="px-4 py-3">{s.hours.toFixed(1)}</td>
                    </tr>
                  ))}
                  {!summary.length && (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-zinc-500">
                        {emptyText("No attendance this month.")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pager p={sumPager} />
          </Card>
        </div>
      )}

      {/* ───────── daily records ───────── */}
      <div className="space-y-2">
        {scope === "all" && <h3 className="text-sm font-semibold text-zinc-200">Daily records</h3>}

        {/* phones: cards */}
        <div className="space-y-2 md:hidden">
          {pagedRows.map((r) => (
            <Card key={r.id} className="p-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-white">{r.date}</p>
                {scope === "all" && (
                  <p className="min-w-0 truncate text-xs text-zinc-400">{r.name}</p>
                )}
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-lg bg-white/[0.03] px-2.5 py-2">
                  <p className="text-zinc-500">In</p>
                  <p className="mt-0.5 text-sm font-semibold tabular-nums text-zinc-100">
                    {fmtTime(r.checkIn)}
                  </p>
                </div>
                <div className="rounded-lg bg-white/[0.03] px-2.5 py-2">
                  <p className="text-zinc-500">Out</p>
                  <p className="mt-0.5 text-sm font-semibold tabular-nums text-zinc-100">
                    {fmtTime(r.checkOut)}
                  </p>
                </div>
                <div className="rounded-lg bg-white/[0.03] px-2.5 py-2">
                  <p className="text-zinc-500">Hours</p>
                  <p className="mt-0.5 text-sm font-semibold tabular-nums text-zinc-100">
                    {r.checkOut ? hoursWorked(r).toFixed(1) : "—"}
                  </p>
                </div>
              </div>
            </Card>
          ))}
          {!rows.length && (
            <Card className="p-6 text-center text-sm text-zinc-500">{emptyText("No records.")}</Card>
          )}
          <Card>
            <Pager p={rowPager} />
          </Card>
        </div>

        {/* tablets and desktops: table */}
        <Card className="hidden overflow-hidden md:block">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-white/5">
                <tr>
                  <Th>Date</Th>
                  {scope === "all" && <Th>Staff</Th>}
                  <Th>In</Th>
                  <Th>Out</Th>
                  <Th>Hours</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {pagedRows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3">{r.date}</td>
                    {scope === "all" && <td className="px-4 py-3">{r.name}</td>}
                    <td className="px-4 py-3">{fmtTime(r.checkIn)}</td>
                    <td className="px-4 py-3">{fmtTime(r.checkOut)}</td>
                    <td className="px-4 py-3">{r.checkOut ? hoursWorked(r).toFixed(1) : "—"}</td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td colSpan={scope === "all" ? 5 : 4} className="px-4 py-6 text-center text-zinc-500">
                      {emptyText("No records.")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pager p={rowPager} />
        </Card>
      </div>
    </div>
  );
};

export default AttendancePanel;