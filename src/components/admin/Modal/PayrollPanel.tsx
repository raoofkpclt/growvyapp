import { useState } from "react";
import { getAllMonth, hoursWorked, monthKey, type Attendance } from "../../../service/AttendanceService";
import { listExtras, type Extras } from "../../../service/AttendanceExtrasService";
import {
  classifyLeaves,
  getLeaves,
  periodEnd,
  periodStart,
  type Leave,
} from "../../../service/LeaveService";
import {
  listPayStatus,
  markPaid,
  markUnpaid,
  type PayStatus,
} from "../../../service/PayrollService";
import { listStaff, type Staff } from "../../../service/staffService";
import { ROLE_LABELS } from "../../../utils/types/staffRoles";
import { dayCredit, fmtNum, markCredit } from "../../../utils/types/WorkRules";
import { Badge, Btn, Card, Notice, errMsg, inputCls, money, useLoad, type Viewer } from "./Ui";

const WORKING_DAYS = 26; // payable days per month

const Th = ({ children }: { children?: React.ReactNode }) => (
  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">{children}</th>
);

type Props = {
  viewer?: Viewer;
  /** HR and admin can mark a month as paid / not paid */
  canManage?: boolean;
};

const PayrollPanel = ({ viewer, canManage = false }: Props) => {
  const [month, setMonth] = useState(monthKey());
  const [err, setErr] = useState("");

  const staff = useLoad(() => listStaff(), [], [] as Staff[]);
  const att = useLoad(() => getAllMonth(month), [month], [] as Attendance[]);
  const extras = useLoad(() => listExtras(month), [month], [] as Extras[]);
  // the whole 2-month period, so the medical leave quota is applied correctly
  const leaves = useLoad(
    () => getLeaves(periodStart(month), periodEnd(month)),
    [month],
    [] as Leave[]
  );
  const paid = useLoad(() => listPayStatus(month), [month], [] as PayStatus[]);

  const classified = classifyLeaves(leaves.data);
  const paidBy = new Map(paid.data.map((p) => [p.uid, p]));

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

      // paid leave adds to the day (a day never counts more than 1)
      const myLeaves = classified.filter((l) => l.uid === s.uid && l.month === month);
      myLeaves.forEach((l) => {
        if (l.paidDays > 0)
          credit.set(l.date, Math.min(1, (credit.get(l.date) ?? 0) + l.paidDays));
      });

      const values = [...credit.values()];
      const fullDays = values.filter((c) => c >= 1).length;
      const halfDays = values.filter((c) => c > 0 && c < 1).length;
      const paidLeave = myLeaves.reduce((n, l) => n + l.paidDays, 0);
      const lop = myLeaves.reduce((n, l) => n + l.unpaidDays, 0);

      const payDays = Math.min(WORKING_DAYS, values.reduce((a, b) => a + b, 0));
      const payable = Math.min(s.salary, (s.salary / WORKING_DAYS) * payDays);
      return { ...s, fullDays, halfDays, paidLeave, lop, hours, payable };
    });

  const total = rows.reduce((sum, r) => sum + r.payable, 0);
  const paidTotal = rows.reduce((sum, r) => sum + (paidBy.get(r.uid)?.amount ?? 0), 0);
  const pendingTotal = rows.reduce(
    (sum, r) => sum + (paidBy.has(r.uid) ? 0 : r.payable),
    0
  );

  const change = async (fn: () => Promise<void>) => {
    setErr("");
    try {
      await fn();
      paid.reload();
    } catch (e) {
      setErr(errMsg(e));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <input
          type="month"
          value={month}
          onChange={(e) => e.target.value && setMonth(e.target.value)}
          className={`${inputCls} sm:!w-auto`}
        />
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-zinc-400 sm:ml-auto">
          <p>
            Total payable: <span className="font-bold text-white">{money(total)}</span>
          </p>
          <p>
            Paid: <span className="font-bold text-emerald-400">{money(paidTotal)}</span>
          </p>
          <p>
            Not paid: <span className="font-bold text-amber-400">{money(pendingTotal)}</span>
          </p>
        </div>
      </div>

      <Notice message={err || staff.error || att.error || extras.error || leaves.error || paid.error} />

      <Card className="overflow-x-auto">
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
              <Th>Hours</Th>
              <Th>Payable</Th>
              <Th>Status</Th>
              {canManage && <Th />}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((r) => {
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
                  <td className="px-4 py-3">{r.hours.toFixed(1)}</td>
                  <td className="px-4 py-3 font-medium">{money(r.payable)}</td>
                  <td className="px-4 py-3">
                    {p ? (
                      <div className="space-y-1">
                        <Badge tone="emerald">Paid</Badge>
                        <p className="text-xs text-zinc-500">
                          {money(p.amount)} · {new Date(p.paidAt).toLocaleDateString("en-IN")}
                        </p>
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
                      {p ? (
                        <Btn variant="ghost" onClick={() => change(() => markUnpaid(r.uid, month))}>
                          Mark not paid
                        </Btn>
                      ) : (
                        <Btn
                          onClick={() => {
                            if (
                              window.confirm(
                                `Mark ${r.name} as paid ${money(r.payable)} for ${month}?`
                              )
                            )
                              change(() =>
                                markPaid({
                                  uid: r.uid,
                                  name: r.name,
                                  month,
                                  amount: r.payable,
                                  paidBy: viewer?.uid ?? "",
                                  paidByName: viewer?.name ?? "",
                                })
                              );
                          }}
                        >
                          Mark paid
                        </Btn>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
            {!rows.length && (
              <tr>
                <td colSpan={canManage ? 11 : 10} className="px-4 py-6 text-center text-zinc-500">
                  {staff.loading || att.loading ? "Loading…" : "No staff."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
      <p className="text-xs text-zinc-600">
        Payable = monthly salary ÷ {WORKING_DAYS} × counted days, capped at the salary. A day with 8+
        hours (breaks included) is a full day and 4.5 to 8 hours is a half day, unless HR or admin
        adjusted it. Paid leave adds to the day; Loss of Pay and extra leave days are unpaid.
      </p>
    </div>
  );
};

export default PayrollPanel;