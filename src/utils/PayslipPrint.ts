import type { Payslip } from "../service/PayslipService";

/** Shown at the top of every payslip. Change to your company name. */
export const COMPANY_NAME = "Growvy Marketing LLP";

export const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);

export const monthLabel = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
};

export const dateLabel = (ms: number) =>
  new Date(ms).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

const num = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** The rows of the slip, used by both the on-screen view and the download */
export function slipLines(p: Payslip): [string, string][] {
  return [
    ["Monthly salary", inr(p.monthlySalary)],
    ["Working days in the month", String(p.workingDays)],
    ["Full days", num(p.fullDays)],
    ["Half days", num(p.halfDays)],
    ["Paid leave days", num(p.paidLeaveDays)],
    ["Loss of Pay days", num(p.lopDays)],
    ["Days counted for pay", num(p.payDays)],
    ["Hours worked", p.hours.toFixed(1)],
    ["Deduction for unpaid / absent days", inr(Math.max(0, p.monthlySalary - p.amount))],
  ];
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string
  );

/**
 * Opens the payslip in a clean page and starts printing.
 * Choose "Save as PDF" in the print window to download it.
 */
export function printPayslip(p: Payslip) {
  const w = window.open("", "_blank");
  if (!w) {
    alert("Please allow pop-ups to download the payslip.");
    return;
  }

  const rows = slipLines(p)
    .map(([k, v]) => `<tr><td>${esc(k)}</td><td class="r">${esc(v)}</td></tr>`)
    .join("");

  w.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Payslip-${esc(p.name)}-${esc(p.month)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; padding: 32px; }
  .slip { max-width: 680px; margin: 0 auto; border: 1px solid #ccc; padding: 28px; }
  h1 { margin: 0; font-size: 20px; }
  .sub { color: #555; font-size: 13px; margin-top: 4px; }
  .head { display: flex; justify-content: space-between; border-bottom: 2px solid #111; padding-bottom: 14px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 24px; margin: 20px 0; font-size: 13px; }
  .grid span { display: block; color: #666; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  td { padding: 8px 0; border-bottom: 1px solid #e5e5e5; }
  .r { text-align: right; }
  .net td { border-top: 2px solid #111; border-bottom: none; font-size: 16px; font-weight: bold; padding-top: 12px; }
  .foot { margin-top: 24px; color: #666; font-size: 11px; }
  @media print { body { padding: 0; } .slip { border: none; } }
</style>
</head>
<body>
  <div class="slip">
    <div class="head">
      <div>
        <h1>${esc(COMPANY_NAME)}</h1>
        <div class="sub">Payslip for ${esc(monthLabel(p.month))}</div>
      </div>
      <div class="sub" style="text-align:right">Slip no.<br /><b>${esc(p.slipNo)}</b></div>
    </div>

    <div class="grid">
      <div><span>Employee</span>${esc(p.name)}</div>
      <div><span>Role</span>${esc(p.roleLabel)}</div>
      <div><span>Email</span>${esc(p.email || "-")}</div>
      <div><span>Paid on</span>${esc(dateLabel(p.paidAt))}</div>
    </div>

    <table>
      ${rows}
      <tr class="net"><td>Net pay</td><td class="r">${esc(inr(p.amount))}</td></tr>
    </table>

    <div class="foot">
      Marked as paid by ${esc(p.paidByName || "HR")}. This is a computer-generated payslip.
    </div>
  </div>
</body>
</html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
}