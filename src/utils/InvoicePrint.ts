import type { Invoice } from "../service/InvoiceService";

/** Your company details, shown at the top of every invoice. Change these. */
export const INVOICE_COMPANY = {
  name: "Your Company",
  address: "Company address, City, State, PIN",
  gstin: "", // optional, e.g. "29ABCDE1234F1Z5"
  email: "",
  phone: "",
};

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const fmt = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string
  );

/** Opens the invoice in a clean page and starts printing. Choose "Save as PDF" to download. */
export function printInvoice(inv: Invoice) {
  const w = window.open("", "_blank");
  if (!w) {
    alert("Please allow pop-ups to download the invoice.");
    return;
  }

  const c = INVOICE_COMPANY;
  const rows = inv.lines
    .map(
      (l) => `<tr>
        <td>${esc(l.description)}</td>
        <td class="r">${l.qty}</td>
        <td class="r">${esc(inr(l.rate))}</td>
        <td class="r">${esc(inr(l.qty * l.rate))}</td>
      </tr>`
    )
    .join("");

  w.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Invoice-${esc(inv.number)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; padding: 32px; }
  .doc { max-width: 720px; margin: 0 auto; border: 1px solid #ccc; padding: 28px; }
  h1 { margin: 0; font-size: 22px; letter-spacing: .04em; }
  .muted { color: #666; font-size: 12px; line-height: 1.5; }
  .head { display: flex; justify-content: space-between; gap: 20px; border-bottom: 2px solid #111; padding-bottom: 14px; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; margin: 20px 0; font-size: 13px; }
  .meta span { display: block; color: #666; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; border-bottom: 1px solid #111; padding: 8px 0; font-size: 11px; text-transform: uppercase; color: #555; }
  td { padding: 9px 0; border-bottom: 1px solid #e5e5e5; vertical-align: top; }
  .r { text-align: right; }
  .tot { margin-top: 12px; margin-left: auto; width: 260px; font-size: 13px; }
  .tot div { display: flex; justify-content: space-between; padding: 5px 0; }
  .tot .grand { border-top: 2px solid #111; font-size: 16px; font-weight: bold; padding-top: 10px; margin-top: 4px; }
  .foot { margin-top: 28px; font-size: 12px; color: #555; white-space: pre-wrap; }
  @media print { body { padding: 0; } .doc { border: none; } }
</style>
</head>
<body>
  <div class="doc">
    <div class="head">
      <div>
        <h1>INVOICE</h1>
        <div class="muted">${esc(inv.number)}</div>
      </div>
      <div class="muted" style="text-align:right">
        <b style="color:#111;font-size:14px">${esc(c.name)}</b><br />
        ${esc(c.address)}<br />
        ${c.gstin ? `GSTIN: ${esc(c.gstin)}<br />` : ""}
        ${[c.email, c.phone].filter(Boolean).map(esc).join(" · ")}
      </div>
    </div>

    <div class="meta">
      <div><span>Billed to</span>${esc(inv.clientName)}</div>
      <div><span>Status</span>${inv.status === "paid" ? "Paid" : "Unpaid"}</div>
      <div><span>Invoice date</span>${esc(fmt(inv.issueDate))}</div>
      <div><span>Due date</span>${esc(fmt(inv.dueDate))}</div>
    </div>

    <table>
      <thead>
        <tr><th>Description</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Amount</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="tot">
      <div><span>Subtotal</span><span>${esc(inr(inv.subtotal))}</span></div>
      ${inv.gstPercent ? `<div><span>GST (${inv.gstPercent}%)</span><span>${esc(inr(inv.tax))}</span></div>` : ""}
      <div class="grand"><span>Total</span><span>${esc(inr(inv.total))}</span></div>
    </div>

    ${inv.notes ? `<div class="foot">${esc(inv.notes)}</div>` : ""}
  </div>
</body>
</html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
}