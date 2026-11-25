import { useState } from "react";
import { monthKey } from "../../service/AttendanceService";
import { listMyPayslips, listPayslips, type Payslip } from "../../service/PayslipService";
import {
  COMPANY_NAME,
  dateLabel,
  inr,
  monthLabel,
  printPayslip,
  slipLines,
} from "../../utils/PayslipPrint";
import { Btn, Card, Modal, Notice, inputCls, useLoad, type Viewer } from "../admin/Modal/Ui";

// payslips shown per page
const PAGE_SIZE = 10;

type Props = {
  viewer: Viewer;
  /** "all" = every staff's payslips for a month (HR / admin), "own" = my payslips */
  scope: "all" | "own";
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

/* ───────────── one payslip, on screen ───────────── */
const PayslipView = ({ slip: p, onClose }: { slip: Payslip; onClose: () => void }) => (
  <Modal title={`Payslip · ${monthLabel(p.month)}`} onClose={onClose}>
    <div className="space-y-4">
      {/* paper */}
      <div className="rounded-xl bg-white p-3 text-zinc-900 sm:p-5">
        <div className="flex flex-col gap-2 border-b-2 border-zinc-900 pb-3 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <div className="min-w-0">
            <p className="break-words text-base font-bold">{COMPANY_NAME}</p>
            <p className="text-xs text-zinc-500">Payslip for {monthLabel(p.month)}</p>
          </div>
          <div className="text-xs text-zinc-500 sm:text-right">
            Slip no.
            <p className="break-all font-bold text-zinc-900">{p.slipNo}</p>
          </div>
        </div>

        <div className="my-4 grid grid-cols-1 gap-3 text-sm min-[420px]:grid-cols-2">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wide text-zinc-500">Employee</p>
            <p className="break-words">{p.name}</p>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wide text-zinc-500">Role</p>
            <p className="break-words">{p.roleLabel}</p>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wide text-zinc-500">Email</p>
            <p className="break-all">{p.email || "-"}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-zinc-500">Paid on</p>
            {dateLabel(p.paidAt)}
          </div>
        </div>

        <table className="w-full text-sm">
          <tbody>
            {slipLines(p).map(([k, v]) => (
              <tr key={k} className="border-b border-zinc-200">
                <td className="py-2 pr-3">{k}</td>
                <td className="py-2 text-right">{v}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-zinc-900 text-base font-bold">
              <td className="pt-3">Net pay</td>
              <td className="pt-3 text-right">{inr(p.amount)}</td>
            </tr>
          </tbody>
        </table>

        <p className="mt-4 text-[11px] text-zinc-500">
          Marked as paid by {p.paidByName || "HR"}. This is a computer-generated payslip.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Btn variant="ghost" onClick={onClose}>
          Close
        </Btn>
        <Btn onClick={() => printPayslip(p)}>Download PDF</Btn>
      </div>
      <p className="text-center text-xs text-zinc-500">
        In the print window choose “Save as PDF”.
      </p>
    </div>
  </Modal>
);

/* ───────────── list ───────────── */
const PayslipsPanel = ({ viewer, scope }: Props) => {
  const [month, setMonth] = useState(monthKey());
  const [open, setOpen] = useState<Payslip | null>(null);
  const [page, setPage] = useState(1);

  const slips = useLoad(
    () => (scope === "own" ? listMyPayslips(viewer.uid) : listPayslips(month)),
    [scope, viewer.uid, month],
    [] as Payslip[]
  );

  const list =
    scope === "own"
      ? slips.data
      : [...slips.data].sort((a, b) => a.name.localeCompare(b.name));

  // paginate; the page is clamped so it stays valid when the list changes
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const pageRows = list.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  return (
    <div className="space-y-4 sm:space-y-5">
      {scope === "all" && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
          <p className="text-sm text-zinc-400 sm:ml-auto">
            {list.length} payslip{list.length === 1 ? "" : "s"} sent for {monthLabel(month)}
          </p>
        </div>
      )}

      <Notice message={slips.error} />

      <div className="space-y-3">
        {pageRows.map((p) => (
          <Card key={p.id} className="p-3 sm:p-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <div className="min-w-0">
                <p className="break-words font-medium text-white">
                  {scope === "own" ? monthLabel(p.month) : p.name}
                </p>
                <p className="mt-0.5 break-words text-xs text-zinc-500">
                  {scope === "all" && `${p.roleLabel} · `}
                  Paid {dateLabel(p.paidAt)} · {p.slipNo}
                </p>
              </div>
              <p className="text-lg font-semibold text-emerald-400">{inr(p.amount)}</p>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:flex">
              <Btn variant="ghost" onClick={() => setOpen(p)}>
                View
              </Btn>
              <Btn variant="ghost" onClick={() => printPayslip(p)}>
                Download
              </Btn>
            </div>
          </Card>
        ))}

        {!list.length && (
          <Card className="p-8 text-center text-sm text-zinc-500">
            {slips.loading
              ? "Loading…"
              : scope === "own"
              ? "No payslips yet. Your payslip appears here once your salary is marked as paid."
              : "No payslips for this month yet."}
          </Card>
        )}

        <Pagination
          page={current}
          pages={pages}
          total={list.length}
          size={PAGE_SIZE}
          onChange={setPage}
        />
      </div>

      {open && <PayslipView slip={open} onClose={() => setOpen(null)} />}
    </div>
  );
};

export default PayslipsPanel;