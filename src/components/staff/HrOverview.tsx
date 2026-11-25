import { useMemo } from "react";
import { collection, getDocs, query, where, type DocumentData } from "firebase/firestore";
import { db } from "../../config/firebase/firebase";
import { listStaff, type Staff } from "../../service/staffService";
import { dateKey, monthKey } from "../../service/AttendanceService";
import { listSpecialDays } from "../../service/HolidayService";
import {
  computeDay,
  toMs,
  type DayInput,
} from "../../utils/types/AttendanceRules";
import { ROLE_LABELS } from "../../utils/types/staffRoles";
import {
  isClosed,
  monthDates,
  toSpecialMap,
  workingDaysIn,
  type SpecialDay,
} from "../../utils/types/WorkCalendar";
import { Btn, Card, Notice, money, useLoad } from "../admin/Modal/Ui";
import { SectionHead, SegBar, StatCard } from "./DashboardParts";

/**
 * HR dashboard (for anyone with "payroll.manage"):
 *   staff counts · today's attendance · this month's attendance · leave counts · payroll
 *
 * Save as: src/components/staff/HrOverview.tsx
 *
 * ── CHECK THESE TWO LINES against your leave data ──
 * Leave counts read this Firestore collection and its `status` field.
 */
const LEAVE_COLLECTION = "leaves";
const LEAVE_STATUS_FIELD = "status"; // values: "pending" | "approved" | "rejected"

type Rec = { uid: string; date: string; hours: number; open: boolean; flagged: boolean };

const monthLabel = (m: string) => {
  const [y, mo] = m.split("-").map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
};

/** every attendance record this month, for everyone (doc id = uid_YYYY-MM-DD) */
const loadMonthRecords = async (month: string): Promise<Rec[]> => {
  const snap = await getDocs(
    query(
      collection(db, "attendance"),
      where("date", ">=", `${month}-01`),
      where("date", "<=", `${month}-31`)
    )
  );
  return snap.docs
    .map((d): Rec | null => {
      const raw = d.data() as DocumentData;
      const day: DayInput = {
        date: raw.date ?? "",
        checkIn: raw.checkIn,
        checkOut: raw.checkOut,
        fixedCheckOut: raw.fixedCheckOut,
        breaks: raw.breaks ?? [],
      };
      if (toMs(day.checkIn) === null) return null;
      const at = toMs(day.checkOut) ?? toMs(day.fixedCheckOut) ?? Date.now();
      return {
        uid: d.id.slice(0, d.id.length - 11), // strip "_YYYY-MM-DD"
        date: day.date as string,
        hours: computeDay(day, at).workedHours,
        open: toMs(day.checkOut) === null,
        flagged: !!raw.flagged,
      };
    })
    .filter((x): x is Rec => !!x);
};

type LeaveCounts = { pending: number; approved: number; rejected: number } | null;

const loadLeaveCounts = async (): Promise<LeaveCounts> => {
  try {
    const snap = await getDocs(collection(db, LEAVE_COLLECTION));
    const c = { pending: 0, approved: 0, rejected: 0 };
    snap.docs.forEach((d) => {
      const s = String(d.data()[LEAVE_STATUS_FIELD] ?? "").toLowerCase();
      if (s === "pending" || s === "approved" || s === "rejected") c[s]++;
    });
    return c;
  } catch {
    return null;
  }
};

const HrOverview = () => {
  const month = monthKey();
  const today = dateKey();

  const staff = useLoad(() => listStaff(), [], [] as Staff[]);
  const recs = useLoad(() => loadMonthRecords(month), [month], [] as Rec[]);
  const leave = useLoad(() => loadLeaveCounts(), [], null as LeaveCounts);
  const special = useLoad(
    () => listSpecialDays(`${month}-01`, `${month}-31`),
    [month],
    [] as SpecialDay[]
  );

  const reload = () => {
    staff.reload();
    recs.reload();
    leave.reload();
    special.reload();
  };

  const d = useMemo(() => {
    const specials = toSpecialMap(special.data);
    const active = staff.data.filter((s) => s.active);
    const activeIds = new Set(active.map((s) => s.uid));
    const mine = recs.data.filter((r) => activeIds.has(r.uid));

    const todayRecs = mine.filter((r) => r.date === today);
    const closedToday = isClosed(today, specials);
    const elapsed = monthDates(month).filter((x) => x <= today && !isClosed(x, specials)).length;

    // per person, this month
    const per = active
      .map((s) => {
        const r = mine.filter((x) => x.uid === s.uid);
        return {
          staff: s,
          days: r.length,
          hours: r.reduce((a, x) => a + x.hours, 0),
          flagged: r.filter((x) => x.flagged).length,
        };
      })
      .sort((a, b) => b.days - a.days || a.staff.name.localeCompare(b.staff.name));

    const roleCounts = Object.entries(ROLE_LABELS)
      .map(([role, label]) => ({
        label,
        n: active.filter((s) => s.role === role).length,
      }))
      .filter((x) => x.n > 0);

    const salaries = active.map((s) => s.salary || 0);
    const payrollTotal = salaries.reduce((a, b) => a + b, 0);

    return {
      active: active.length,
      inactive: staff.data.length - active.length,
      roleCounts,
      closedToday,
      presentToday: todayRecs.length,
      workingNow: todayRecs.filter((r) => r.open).length,
      doneToday: todayRecs.filter((r) => !r.open).length,
      notInToday: closedToday ? 0 : Math.max(0, active.length - todayRecs.length),
      flaggedToday: todayRecs.filter((r) => r.flagged).length,
      monthDays: mine.length,
      monthHours: mine.reduce((a, x) => a + x.hours, 0),
      monthFlagged: mine.filter((r) => r.flagged).length,
      rate: active.length && elapsed ? Math.round((mine.length / (active.length * elapsed)) * 100) : 0,
      workingDays: workingDaysIn(month, specials),
      per,
      payrollTotal,
      payrollAvg: active.length ? Math.round(payrollTotal / active.length) : 0,
      payrollMax: salaries.length ? Math.max(...salaries) : 0,
    };
  }, [staff.data, recs.data, special.data, month, today]);

  const loading = staff.loading || recs.loading;

  return (
    <section className="min-w-0 space-y-6 sm:space-y-8">
      <SectionHead
        title="HR overview"
        sub={`Staff, attendance, leave and payroll · ${monthLabel(month)}`}
        action={
          <Btn variant="ghost" onClick={reload} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </Btn>
        }
      />
      <Notice message={staff.error || recs.error} />

      {/* ───────── staff ───────── */}
      <div className="space-y-3">
        <SectionHead title="Staff" />
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
          <StatCard label="Active staff" value={d.active} tone="emerald" />
          <StatCard label="Disabled accounts" value={d.inactive} tone={d.inactive ? "amber" : "zinc"} />
          <StatCard label="Roles in use" value={d.roleCounts.length} tone="violet" />
          <StatCard label="Working days this month" value={d.workingDays} sub="Sundays, 2nd Saturdays and holidays excluded" tone="sky" />
        </div>
        <Card className="p-3 sm:p-4">
          <div className="flex flex-wrap gap-2">
            {d.roleCounts.map((r) => (
              <span
                key={r.label}
                className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs text-zinc-300 sm:px-3"
              >
                {r.label} · <span className="font-semibold text-white">{r.n}</span>
              </span>
            ))}
            {!d.roleCounts.length && <span className="text-sm text-zinc-500">No staff yet.</span>}
          </div>
        </Card>
      </div>

      {/* ───────── attendance today ───────── */}
      <div className="space-y-3">
        <SectionHead
          title="Attendance today"
          sub={d.closedToday ? "The office is closed today." : undefined}
        />
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
          <StatCard label="Checked in" value={d.presentToday} tone="emerald" />
          <StatCard label="Working now" value={d.workingNow} tone="sky" />
          <StatCard label="Checked out" value={d.doneToday} />
          <StatCard
            label="Not checked in"
            value={d.notInToday}
            sub="includes people on leave"
            tone={d.notInToday ? "amber" : "zinc"}
          />
          <StatCard label="Face check review" value={d.flaggedToday} tone={d.flaggedToday ? "red" : "zinc"} />
        </div>
        <Card className="p-3 sm:p-4">
          <SegBar
            parts={[
              { label: "Working now", value: d.workingNow, tone: "sky" },
              { label: "Checked out", value: d.doneToday, tone: "emerald" },
              { label: "Not checked in", value: d.notInToday, tone: "amber" },
            ]}
          />
        </Card>
      </div>

      {/* ───────── attendance this month ───────── */}
      <div className="space-y-3">
        <SectionHead title={`Attendance · ${monthLabel(month)}`} />
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
          <StatCard label="Attendance rate" value={`${d.rate}%`} sub="check-ins vs working days so far (before leave)" tone="emerald" />
          <StatCard label="Total check-ins" value={d.monthDays} />
          <StatCard label="Team hours worked" value={d.monthHours.toFixed(0)} sub="this month" tone="violet" />
          <StatCard label="Days flagged for review" value={d.monthFlagged} tone={d.monthFlagged ? "red" : "zinc"} />
        </div>

        {/* phones: one card per person */}
        <div className="space-y-2 md:hidden">
          {d.per.map((p) => (
            <Card key={p.staff.uid} className="p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{p.staff.name}</p>
                  <p className="truncate text-[11px] text-zinc-500">{ROLE_LABELS[p.staff.role] ?? ""}</p>
                </div>
                {p.flagged > 0 && (
                  <span className="shrink-0 rounded-full border border-red-500/30 bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-300">
                    {p.flagged} flagged
                  </span>
                )}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-white/[0.03] px-3 py-2">
                  <p className="text-zinc-500">Days present</p>
                  <p className="mt-0.5 text-sm font-semibold tabular-nums text-zinc-100">
                    {p.days}
                    <span className="font-normal text-zinc-600"> / {d.workingDays}</span>
                  </p>
                </div>
                <div className="rounded-lg bg-white/[0.03] px-3 py-2">
                  <p className="text-zinc-500">Hours</p>
                  <p className="mt-0.5 text-sm font-semibold tabular-nums text-zinc-100">
                    {p.hours.toFixed(1)}
                  </p>
                </div>
              </div>
            </Card>
          ))}
          {!d.per.length && (
            <Card className="p-6 text-center text-sm text-zinc-500">
              {loading ? "Loading…" : "No staff found."}
            </Card>
          )}
        </div>

        {/* tablets and desktops: table */}
        <Card className="hidden overflow-hidden md:block">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/5 text-[11px] uppercase tracking-wide text-zinc-500">
                  <th className="px-4 py-3 font-medium">Person</th>
                  <th className="px-3 py-3 text-center font-medium">Days present</th>
                  <th className="px-3 py-3 text-center font-medium">Hours</th>
                  <th className="px-4 py-3 text-center font-medium">Flagged</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {d.per.map((p) => (
                  <tr key={p.staff.uid} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{p.staff.name}</p>
                      <p className="text-[11px] text-zinc-500">{ROLE_LABELS[p.staff.role] ?? ""}</p>
                    </td>
                    <td className="px-3 py-3 text-center tabular-nums text-zinc-100">
                      {p.days}
                      <span className="text-zinc-600"> / {d.workingDays}</span>
                    </td>
                    <td className="px-3 py-3 text-center tabular-nums text-zinc-100">{p.hours.toFixed(1)}</td>
                    <td
                      className={`px-4 py-3 text-center tabular-nums ${
                        p.flagged ? "text-red-300" : "text-zinc-700"
                      }`}
                    >
                      {p.flagged}
                    </td>
                  </tr>
                ))}
                {!d.per.length && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-zinc-500">
                      {loading ? "Loading…" : "No staff found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* ───────── leave ───────── */}
      <div className="space-y-3">
        <SectionHead title="Leave requests" sub="All requests, by status." />
        {leave.data ? (
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
            <StatCard
              label="Waiting for approval"
              value={leave.data.pending}
              tone={leave.data.pending ? "amber" : "zinc"}
            />
            <StatCard label="Approved" value={leave.data.approved} tone="emerald" />
            <StatCard label="Rejected" value={leave.data.rejected} tone="red" />
            <StatCard
              label="Total requests"
              value={leave.data.pending + leave.data.approved + leave.data.rejected}
            />
          </div>
        ) : (
          <Card className="p-4 text-sm text-zinc-500">
            {leave.loading ? "Loading…" : "Leave counts could not be loaded."}
          </Card>
        )}
      </div>

      {/* ───────── payroll ───────── */}
      <div className="space-y-3">
        <SectionHead
          title="Payroll"
          sub="Based on the salary saved on each active staff profile."
        />
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
          <StatCard label="Monthly salary total" value={money(d.payrollTotal)} tone="violet" />
          <StatCard label="Staff on payroll" value={d.active} />
          <StatCard label="Average salary" value={money(d.payrollAvg)} />
          <StatCard label="Highest salary" value={money(d.payrollMax)} />
        </div>
      </div>
    </section>
  );
};

export default HrOverview;