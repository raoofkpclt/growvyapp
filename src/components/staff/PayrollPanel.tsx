import { useState } from "react";
import { getAllMonth, hoursWorked, monthKey, type Attendance } from "../../service/AttendanceService";
import { listExtras, type Extras } from "../../service/AttendanceExtrasService";
import { listSpecialDays } from "../../service/HolidayService";
import {
  classifyLeaves,
  getLeaves,
  periodEnd,
  periodStart,
  type Leave,
} from "../../service/LeaveService";
import { issuePayslip, listPayslips, type Payslip } from "../../service/PayslipService";
import { listStaff, type Staff } from "../../service/staffService";
import { istDate } from "../../utils/types/AttendanceRules";
import { ROLE_LABELS } from "../../utils/types/staffRoles";
import {
  dayInfo,
  monthDates,
  toSpecialMap,
  type SpecialDay,
} from "../../utils/types/WorkCalendar";
import { dayCredit, fmtNum, markCredit } from "../../utils/types/WorkRules";
import { Badge, Btn, Card, Modal, Notice, errMsg, inputCls, money, useLoad, type Viewer } from "../admin/Modal/Ui";

/**
 * HOW PAY IS WORKED OUT
 *   - The monthly salary is paid in full.
 *   - Sundays, 2nd Saturdays and holidays are paid. Nothing is cut for them.
 *   - Only working days that were lost are cut: absent, Loss of Pay, unpaid extra leave,
 *     and half days (half a day is cut).
 *   - Approved paid leave is not cut.
 *   - One day's pay = monthly salary ÷ days in the month (28 to 31).
 *     To use a fixed 30 instead, set `const perDayDivisor = 30` below.
 *   - Days that have not happened yet (and today, until the person has worked) are not cut.
 *
 * LAYOUT
 *   - Phones and tablets (below `lg`): one card per person.
 *   - Desktop (`lg` and up): the full table.
 *   - Both are paginated (PAGE_SIZE per page). The totals at the top cover everyone, not just
 *     the visible page.
 */

// staff shown per page
const PAGE_SIZE = 10;

const Th = ({ children }: { children?: React.ReactNode }) => (
  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium text-zinc-500">{children}</th>
);

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
                    ? "bg-violet-500/20 font-medium text-violet-200"
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

/** one small labelled number on the phone cards */
const Stat = ({ label, value, tone = "" }: { label: string; value: React.ReactNode; tone?: string }) => (
  <div>
    <dt className="text-[11px] text-zinc-500">{label}</dt>
    <dd className={`text-sm ${tone}`}>{value}</dd>
  </div>
);

type Props = {
  viewer?: Viewer;
  /** HR and admin can mark a month as paid (this also sends the payslip) */
  canManage?: boolean;
};

const PayrollPanel = ({ viewer, canManage = false }: Props) => {
  const [month, setMonth] = useState(monthKey());
  const [page, setPage] = useState(1);
  const [err, setErr] = useState("");
  const [payUid, setPayUid] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const staff = useLoad(() => listStaff(), [], [] as Staff[]);
  const att = useLoad(() => getAllMonth(month), [month], [] as Attendance[]);
  const extras = useLoad(() => listExtras(month), [month], [] as Extras[]);
  // the whole 2-month period, so the medical leave quota is applied correctly
  const leaves = useLoad(
    () => getLeaves(periodStart(month), periodEnd(month)),
    [month],
    [] as Leave[]
  );
  const paid = useLoad(() => listPayslips(month), [month], [] as Payslip[]);
  // holidays and working-day marks for this month
  const special = useLoad(
    () => listSpecialDays(`${month}-01`, `${month}-31`),
    [month],
    [] as SpecialDay[]
  );

  // pay must not be marked while numbers are still loading
  const loadingAny =
    staff.loading || att.loading || extras.loading || leaves.loading || paid.loading || special.loading;

  const classified = classifyLeaves(leaves.data);
  const paidBy = new Map(paid.data.map((p) => [p.uid, p]));

  const specialMap = toSpecialMap(special.data);
  const dates = monthDates(month);
  const daysInMonth = dates.length;
  const perDayDivisor = daysInMonth; // set to 30 for a fixed 30-day month
  const workingDates = dates.filter((d) => !dayInfo(d, specialMap).closed);
  const closedCount = daysInMonth - workingDates.length;
  const today = istDate(Date.now());

  const rows = staff.data
    .filter((s) => s.active)
    .map((s) => {
      const mine = att.data.filter((r) => r.uid === s.uid && r.checkIn);
      const hours = mine.reduce((sum, r) => sum + hoursWorked(r), 0);

      // credit per day: 1 full, 0.5 half, 0 not counted
      const credit = new Map<string, number>();
      mine.forEach((r) => credit.set(r.date, dayCredit(hoursWorked(r))));
      // HR / admin marks replace the automatic result
      extras.data
        .filter((x) => x.uid === s.uid && x.mark)
        .forEach((x) => credit.set(x.date, markCredit(x.mark!)));

      // approved leave on working days only (closed days are paid anyway)
      const myLeaves = classified.filter(
        (l) => l.uid === s.uid && l.month === month && !dayInfo(l.date, specialMap).closed
      );
      // paid leave adds to the day (a day never counts more than 1)
      myLeaves.forEach((l) => {
        if (l.paidDays > 0)
          credit.set(l.date, Math.min(1, (credit.get(l.date) ?? 0) + l.paidDays));
      });

      // go through the working days that have happened and add up what was lost
      let deducted = 0;
      let absent = 0;
      let fullDays = 0;
      let halfDays = 0;
      for (const d of workingDates) {
        const c = credit.get(d) ?? 0;
        if (d > today) continue; // not happened yet
        if (d === today && c === 0) continue; // today, nothing worked yet
        deducted += 1 - c;
        if (c >= 1) fullDays += 1;
        else if (c > 0) halfDays += 1;
        else if (!myLeaves.some((l) => l.date === d)) absent += 1;
      }

      const paidLeave = myLeaves.reduce((n, l) => n + l.paidDays, 0);
      const lop = myLeaves.reduce((n, l) => n + l.unpaidDays, 0);

      const perDay = s.salary / perDayDivisor;
      const payable = Math.max(0, s.salary - perDay * deducted);
      const payDays = Math.max(0, perDayDivisor - deducted);
      return {
        ...s,
        fullDays,
        halfDays,
        paidLeave,
        lop,
        absent,
        payDays,
        hours,
        deduction: s.salary - payable,
        payable,
      };
    });

  // totals cover everyone, not only the visible page
  const total = rows.reduce((sum, r) => sum + r.payable, 0);
  const paidTotal = rows.reduce((sum, r) => sum + (paidBy.get(r.uid)?.amount ?? 0), 0);
  const pendingTotal = rows.reduce(
    (sum, r) => sum + (paidBy.has(r.uid) ? 0 : r.payable),
    0
  );

  // paginate; the page is clamped so it stays valid if the staff list changes
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const pageRows = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const payRow = rows.find((r) => r.uid === payUid);

  // runs after HR confirms: marks the month as paid and sends the payslip
  const payNow = async () => {
    if (!payRow) return;
    setErr("");
    setSaving(true);
    try {
      await issuePayslip({
        uid: payRow.uid,
        name: payRow.name,
        email: payRow.email ?? "",
        roleLabel: ROLE_LABELS[payRow.role] ?? "",
        month,
        monthlySalary: payRow.salary,
        workingDays: perDayDivisor,
        fullDays: payRow.fullDays,
        halfDays: payRow.halfDays,
        paidLeaveDays: payRow.paidLeave,
        lopDays: payRow.lop + payRow.absent,
        payDays: payRow.payDays,
        hours: payRow.hours,
        amount: payRow.payable,
        paidBy: viewer?.uid ?? "",
        paidByName: viewer?.name ?? "",
      });
      paid.reload();
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setSaving(false);
      setPayUid(null);
    }
  };

  const emptyText = loadingAny ? "Loading…" : "No staff.";

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* month + totals */}
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
        <input
          type="month"
          value={month}
          onChange={(e) => {
            if (e.target.value) {
              setMonth(e.target.value);
              setPage(1);
            }
          }}
          className={`${inputCls} lg:!w-auto`}
        />
        <div className="grid grid-cols-3 gap-2 text-sm text-zinc-400 lg:ml-auto lg:flex lg:gap-x-5">
          <p className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5 lg:border-0 lg:bg-transparent lg:p-0">
            <span className="block text-[11px] lg:inline lg:text-sm">Total payable</span>
            <span className="block break-words font-bold text-white lg:ml-1 lg:inline">{money(total)}</span>
          </p>
          <p className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5 lg:border-0 lg:bg-transparent lg:p-0">
            <span className="block text-[11px] lg:inline lg:text-sm">Paid</span>
            <span className="block break-words font-bold text-emerald-400 lg:ml-1 lg:inline">
              {money(paidTotal)}
            </span>
          </p>
          <p className="rounded-xl border border-white/5 bg-white/[0.02] p-2.5 lg:border-0 lg:bg-transparent lg:p-0">
            <span className="block text-[11px] lg:inline lg:text-sm">Not paid</span>
            <span className="block break-words font-bold text-amber-400 lg:ml-1 lg:inline">
              {money(pendingTotal)}
            </span>
          </p>
        </div>
      </div>

      <Notice
        message={
          err ||
          staff.error ||
          att.error ||
          extras.error ||
          leaves.error ||
          paid.error ||
          special.error
        }
      />

      {/* phones and tablets: one card per person */}
      <div className="space-y-3 lg:hidden">
        {pageRows.map((r) => {
          const p = paidBy.get(r.uid);
          return (
            <Card key={r.uid} className="p-3 sm:p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words font-medium">{r.name}</p>
                  <p className="text-xs text-zinc-500">{ROLE_LABELS[r.role]}</p>
                </div>
                {p ? <Badge tone="emerald">Paid</Badge> : <Badge tone="amber">Not paid</Badge>}
              </div>

              <dl className="mt-3 grid grid-cols-3 gap-x-3 gap-y-3 sm:grid-cols-6">
                <Stat label="Full days" value={r.fullDays} />
                <Stat label="Half days" value={r.halfDays} />
                <Stat label="Paid leave" value={fmtNum(r.paidLeave)} />
                <Stat label="Loss of Pay" value={fmtNum(r.lop)} tone={r.lop ? "text-red-400" : ""} />
                <Stat label="Absent" value={r.absent} tone={r.absent ? "text-red-400" : ""} />
                <Stat label="Hours" value={r.hours.toFixed(1)} />
              </dl>

              <dl className="mt-3 grid grid-cols-3 gap-3 border-t border-white/5 pt-3">
                <Stat label="Salary" value={money(r.salary)} />
                <Stat
                  label="Deduction"
                  value={r.deduction > 0 ? `− ${money(r.deduction)}` : "—"}
                  tone={r.deduction > 0 ? "text-red-400" : "text-zinc-500"}
                />
                <Stat label="Payable" value={<span className="font-semibold">{money(r.payable)}</span>} />
              </dl>

              {p && (
                <div className="mt-3 space-y-0.5 text-xs text-zinc-500">
                  <p>
                    {money(p.amount)} · {new Date(p.paidAt).toLocaleDateString("en-IN")} · Payslip sent
                  </p>
                  {Math.round(r.payable) !== p.amount && (
                    <p className="text-amber-400">Payable changed since payment</p>
                  )}
                </div>
              )}

              {canManage && (
                <div className="mt-3">
                  <Btn
                    className="w-full sm:w-auto"
                    disabled={!!p || loadingAny}
                    onClick={() => setPayUid(r.uid)}
                  >
                    {p ? "Paid" : "Mark paid"}
                  </Btn>
                </div>
              )}
            </Card>
          );
        })}
        {!rows.length && (
          <Card className="p-8 text-center text-sm text-zinc-500">{emptyText}</Card>
        )}
      </div>

      {/* desktop: the full table */}
      <Card className="hidden overflow-x-auto lg:block">
        <table className="w-full text-sm">
          <thead className="border-b border-white/5">
            <tr>
              <Th>Staff</Th>
              <Th>Role</Th>
              <Th>Monthly salary</Th>
              <Th>Full days</Th>
              <Th>Half days</Th>
              <Th>Paid leave</Th>
              <Th>Loss of Pay</Th>
              <Th>Absent</Th>
              <Th>Hours</Th>
              <Th>Deduction</Th>
              <Th>Payable</Th>
              <Th>Status</Th>
              {canManage && <Th />}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {pageRows.map((r) => {
              const p = paidBy.get(r.uid);
              return (
                <tr key={r.uid}>
                  <td className="px-4 py-3">{r.name}</td>
                  <td className="px-4 py-3 text-zinc-400">{ROLE_LABELS[r.role]}</td>
                  <td className="px-4 py-3">{money(r.salary)}</td>
                  <td className="px-4 py-3">{r.fullDays}</td>
                  <td className="px-4 py-3">{r.halfDays}</td>
                  <td className="px-4 py-3">{fmtNum(r.paidLeave)}</td>
                  <td className={`px-4 py-3 ${r.lop ? "text-red-400" : ""}`}>{fmtNum(r.lop)}</td>
                  <td className={`px-4 py-3 ${r.absent ? "text-red-400" : ""}`}>{r.absent}</td>
                  <td className="px-4 py-3">{r.hours.toFixed(1)}</td>
                  <td className={`px-4 py-3 ${r.deduction > 0 ? "text-red-400" : "text-zinc-500"}`}>
                    {r.deduction > 0 ? `− ${money(r.deduction)}` : "—"}
                  </td>
                  <td className="px-4 py-3 font-medium">{money(r.payable)}</td>
                  <td className="px-4 py-3">
                    {p ? (
                      <div className="space-y-1">
                        <Badge tone="emerald">Paid</Badge>
                        <p className="text-xs text-zinc-500">
                          {money(p.amount)} · {new Date(p.paidAt).toLocaleDateString("en-IN")}
                        </p>
                        <p className="text-xs text-zinc-500">Payslip sent</p>
                        {Math.round(r.payable) !== p.amount && (
                          <p className="text-xs text-amber-400">
                            Payable changed since payment
                          </p>
                        )}
                      </div>
                    ) : (
                      <Badge tone="amber">Not paid</Badge>
                    )}
                  </td>
                  {canManage && (
                    <td className="px-4 py-3">
                      <Btn disabled={!!p || loadingAny} onClick={() => setPayUid(r.uid)}>
                        {p ? "Paid" : "Mark paid"}
                      </Btn>
                    </td>
                  )}
                </tr>
              );
            })}
            {!rows.length && (
              <tr>
                <td colSpan={canManage ? 13 : 12} className="px-4 py-6 text-center text-zinc-500">
                  {emptyText}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <Pagination
        page={current}
        pages={pages}
        total={rows.length}
        size={PAGE_SIZE}
        onChange={setPage}
      />

      <p className="text-xs text-zinc-600">
        The monthly salary is paid in full. Sundays, 2nd Saturdays and holidays ({closedCount} closed
        days this month) are paid and never cut. Each working day that is lost (absent, Loss of Pay
        or extra leave) cuts one day's pay (monthly salary ÷ {perDayDivisor}), and a half day cuts
        half. A day with 9+ hours (breaks included) is a full day and 4.5 to 9 hours is a half day,
        unless HR or admin adjusted it. Approved paid leave is not cut.
      </p>

      {payRow && (
        <Modal title="Mark as paid?" onClose={() => !saving && setPayUid(null)}>
          <div className="space-y-5">
            <p className="text-sm text-zinc-300">
              Mark <span className="font-medium text-white">{payRow.name}</span> as paid{" "}
              <span className="font-medium text-white">{money(payRow.payable)}</span> for {month}?
            </p>
            {payRow.deduction > 0 && (
              <p className="text-xs text-amber-300">
                {money(payRow.deduction)} is cut from {money(payRow.salary)} for lost working days.
              </p>
            )}
            <p className="text-xs text-zinc-500">
              A payslip will be sent to {payRow.name}, who can view and download it. Once marked as
              paid, it can't be changed from here.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Btn variant="ghost" disabled={saving} onClick={() => setPayUid(null)}>
                Cancel
              </Btn>
              <Btn disabled={saving} onClick={payNow}>
                {saving ? "Sending…" : "Yes, mark paid"}
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default PayrollPanel;