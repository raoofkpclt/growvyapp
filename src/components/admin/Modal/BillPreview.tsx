import React, { forwardRef } from "react";
import type { BillItem, BillDocType } from "../../../utils/types/Types";
// TODO: point this to your real logo file (png/svg in src/assets)
import logo from "../../../assets/Logo-2.png";
import { formatAmount, formatMoney, numToWords } from "../../../utils/currency";
import type { CurrencyCode } from "../../../utils/currency";

// const logo = "/img/logo-2.png";

// keep old imports working (if any file imports numToWords from here)
export { numToWords };

/* ---------- Company details (edit as needed) ---------- */
export const COMPANY = {
  name: "GROWVY MARKETING LLP",
  addr: ["LA Marshal Chambers, Adv Ratna Singh Road,", "Nadakkavu, Kozhikode - 673011, Kerala, India"],
  phone: "9037444085",
  llpin: "ACU-4752",
  pan: "ABEFG1062B",
};
export const PAYMENT = {
  accName: "Danish Mirsha O",
  bank: "Canara Bank",
  accNo: "1734101032478",
  ifsc: "CNRB0001734",
  upi: "9207045840",
};

export interface BillPreviewData {
  docType: BillDocType;
  billNo: string;
  date: string;
  dueDate?: string;
  invoiceKind?: string;
  clientName: string;
  clientAddress?: string;
  clientPhone?: string;
  projectRef?: string;
  service?: string;
  items: BillItem[];
  discount: number;
  gstPercent: number;
  advanceReceived: number;
  receiptAmount: number;
  paymentMode: string;
  receivedTowards: string;
  againstInvoiceNo?: string;
  currency: CurrencyCode;
  // billing period (invoices only)
  periodType?: "none" | "monthly" | "custom";
  periodLabel?: string; // e.g. "October 2026" or "01 Oct 2026 – 31 Dec 2026"
}

/* ---------- helpers ---------- */
export const calcTotals = (
  items: BillItem[],
  discount: number,
  gstPercent: number,
  advance: number
) => {
  const subtotal = items.reduce((s, i) => s + i.qty * i.rate, 0);
  const gstAmt = (subtotal - discount) * (gstPercent / 100);
  const total = subtotal - discount + gstAmt;
  return { subtotal, gstAmt, total, balance: total - advance };
};

const fmtDate = (s?: string) => {
  if (!s) return "—";
  const d = new Date(s + "T00:00:00");
  return isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

/* ---------- colours ---------- */
const C = {
  blue: "#1F3B8C",
  orange: "#E8720C",
  yellow: "#F6C000",
  ink: "#1A1F2B",
  soft: "#5B6472",
  line: "#E9ECF1",
  line2: "#D8DCE3",
  ok: "#1E824C",
  okBg: "#E7F5EC",
};

const label: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, textTransform: "uppercase",
  letterSpacing: "0.06em", color: C.orange, marginBottom: 6,
};
const mono = "'JetBrains Mono', ui-monospace, Menlo, monospace";

const Row = ({ l, v, strong }: { l: string; v: string; strong?: boolean }) => (
  <div style={{
    display: "flex", justifyContent: "space-between", padding: "6px 0",
    color: C.soft, fontWeight: strong ? 700 : 400,
  }}>
    <span>{l}</span>
    <span style={{ fontFamily: mono, color: C.ink }}>{v}</span>
  </div>
);

/* ---------- component (A4 @ 96dpi = 794px wide) ---------- */
const BillPreview = forwardRef<HTMLDivElement, { data: BillPreviewData }>(({ data }, ref) => {
  const isInvoice = data.docType === "invoice";
  const t = calcTotals(data.items, data.discount, data.gstPercent, data.advanceReceived);
  const money = (n: number) => formatMoney(n, data.currency);
  const amt = (n: number) => formatAmount(n, data.currency);
  const kindColor =
    data.invoiceKind === "Advance" ? C.yellow : data.invoiceKind === "Balance" ? C.orange : C.ok;
  const words = numToWords(isInvoice ? t.balance : data.receiptAmount, data.currency);
  const showPeriod = isInvoice && data.periodType !== "none" && !!data.periodLabel;

  return (
    <div
      ref={ref}
      style={{
        width: 794, minHeight: 1123, background: "#fff", color: C.ink, boxSizing: "border-box",
        padding: "46px 50px 40px", position: "relative",
        fontFamily: "'Inter', Arial, sans-serif", fontSize: 13,
      }}
    >
      {/* gradient bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 6,
        background: `linear-gradient(90deg, ${C.blue}, ${C.orange})`,
      }} />

      {/* header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <img src={logo} alt="logo" style={{ height: 40, marginBottom: 8, display: "block" }} />
          <div style={{ fontSize: 11.5, color: C.soft, lineHeight: 1.6 }}>
            {COMPANY.addr.map((l) => <div key={l}>{l}</div>)}
            Phone: {COMPANY.phone} | LLPIN: {COMPANY.llpin} | PAN: {COMPANY.pan}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 1 }}>
            {isInvoice ? "INVOICE" : "RECEIPT"}
          </div>
          <div style={{
            display: "inline-block", marginTop: 6, padding: "3px 10px", borderRadius: 20,
            fontSize: 10.5, fontWeight: 700, textTransform: "uppercase",
            background: (isInvoice ? kindColor : C.ok) + "22", color: isInvoice ? kindColor : C.ok,
          }}>
            {isInvoice ? data.invoiceKind : data.receivedTowards}
          </div>
          <div style={{ marginTop: 10, fontFamily: mono, fontSize: 11.5, color: C.soft, lineHeight: 1.8 }}>
            <div><b style={{ color: C.ink }}>No:</b> {data.billNo || "—"}</div>
            <div><b style={{ color: C.ink }}>Date:</b> {fmtDate(data.date)}</div>
            {isInvoice && <div><b style={{ color: C.ink }}>Due:</b> {fmtDate(data.dueDate)}</div>}
            <div><b style={{ color: C.ink }}>Currency:</b> {data.currency}</div>
          </div>
        </div>
      </div>

      <hr style={{ border: "none", borderTop: `1px solid ${C.line}`, margin: "20px 0" }} />

      {/* bill to */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: showPeriod ? 14 : 22 }}>
        <div>
          <div style={label}>{isInvoice ? "Bill To" : "Received From"}</div>
          <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 3 }}>
            {data.clientName || "Client name"}
          </div>
          <div style={{ fontSize: 12, color: C.soft, lineHeight: 1.6, whiteSpace: "pre-line" }}>
            {data.clientAddress}
            {data.clientPhone ? `\n${data.clientPhone}` : ""}
          </div>
        </div>
        <div>
          <div style={label}>{isInvoice ? "Service / Reference" : "Payment Info"}</div>
          <div style={{ fontSize: 12, color: C.soft, lineHeight: 1.6 }}>
            {isInvoice ? (
              <>
                {data.service}
                <br />
                {data.projectRef || ""}
              </>
            ) : (
              <>
                Mode: {data.paymentMode}<br />
                Against Invoice: {data.againstInvoiceNo || "—"}<br />
                Service: {data.service}
              </>
            )}
          </div>
        </div>
      </div>

      {/* billing period (monthly / custom invoices only) */}
      {showPeriod && (
        <div
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 22, padding: "9px 12px", background: "#F7F8FA",
            borderLeft: `3px solid ${C.blue}`, borderRadius: "0 6px 6px 0",
          }}
        >
          <div style={{ ...label, marginBottom: 0, color: C.blue }}>
            {data.periodType === "monthly" ? "Monthly Invoice" : "Billing Period"}
          </div>
          <div style={{ fontFamily: mono, fontSize: 12.5, fontWeight: 700, color: C.ink }}>
            {data.periodLabel}
          </div>
        </div>
      )}

      {isInvoice ? (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Description", "Qty", "Rate", "Amount"].map((h, i) => (
                  <th key={h} style={{
                    background: C.blue, color: "#fff", fontSize: 11, textTransform: "uppercase",
                    letterSpacing: "0.04em", padding: "9px 10px", fontWeight: 700,
                    textAlign: i === 0 ? "left" : "right",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.items.map((it) => (
                <tr key={it.id}>
                  <td style={{ padding: "9px 10px", borderBottom: `1px solid ${C.line}` }}>{it.description || "—"}</td>
                  <td style={{ padding: "9px 10px", borderBottom: `1px solid ${C.line}`, textAlign: "right", fontFamily: mono, fontSize: 12.5 }}>{it.qty}</td>
                  <td style={{ padding: "9px 10px", borderBottom: `1px solid ${C.line}`, textAlign: "right", fontFamily: mono, fontSize: 12.5 }}>{amt(it.rate)}</td>
                  <td style={{ padding: "9px 10px", borderBottom: `1px solid ${C.line}`, textAlign: "right", fontFamily: mono, fontSize: 12.5 }}>{amt(it.qty * it.rate)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
            <div style={{ width: 290, fontSize: 13 }}>
              <Row l="Subtotal" v={money(t.subtotal)} />
              <Row l="Discount" v={`− ${money(data.discount)}`} />
              <Row l={`GST (${data.gstPercent}%)`} v={`+ ${money(t.gstAmt)}`} />
              <div style={{ borderTop: `2px solid ${C.blue}`, marginTop: 4 }}>
                <Row l="Total" v={money(t.total)} strong />
              </div>
              <Row l="Advance received" v={`− ${money(data.advanceReceived)}`} />
              <div style={{
                background: C.blue, color: "#fff", borderRadius: 6, padding: "9px 10px",
                marginTop: 8, display: "flex", justifyContent: "space-between", fontWeight: 700,
              }}>
                <span>Balance Due</span>
                <span style={{ fontFamily: mono }}>{money(t.balance)}</span>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div style={{ textAlign: "center", margin: "22px 0", padding: 18, background: C.okBg, borderRadius: 8 }}>
          <div style={{ fontSize: 11, color: C.ok, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Amount Received
          </div>
          <div style={{ fontFamily: mono, fontSize: 32, fontWeight: 700, color: C.ok, marginTop: 4 }}>
            {money(data.receiptAmount)}
          </div>
        </div>
      )}

      {/* words */}
      <div style={{
        marginTop: 18, padding: "10px 12px", background: "#F7F8FA",
        borderLeft: `3px solid ${C.orange}`, borderRadius: "0 6px 6px 0", fontSize: 12,
      }}>
        <div style={{ color: C.soft, textTransform: "uppercase", fontSize: 10, letterSpacing: "0.04em", marginBottom: 3, fontWeight: 700 }}>
          Amount in Words
        </div>
        {words}
      </div>

      {/* payment details */}
      {isInvoice && (
        <div style={{ marginTop: 22, fontSize: 11.5, color: C.soft, lineHeight: 1.8 }}>
          <b style={{ color: C.ink }}>Payment Details:</b><br />
          A/C Name: {PAYMENT.accName} | Bank: {PAYMENT.bank} | A/C No: {PAYMENT.accNo}<br />
          IFSC: {PAYMENT.ifsc} | UPI: {PAYMENT.upi}
        </div>
      )}

      {/* signature */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 44 }}>
        <div style={{ fontSize: 10.5, color: C.soft, maxWidth: 340, lineHeight: 1.6 }}>
          {isInvoice
            ? "Payment due within 7 days. This is a computer-generated invoice."
            : "This receipt confirms payment received as above. Kept for accounting records."}
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, marginBottom: 38 }}>For {COMPANY.name}</div>
          <div style={{ width: 170, borderTop: `1px solid ${C.soft}`, marginBottom: 5 }} />
          <div style={{ fontSize: 11, color: C.soft }}>Authorized Signatory</div>
        </div>
      </div>

      <div style={{ marginTop: 26, textAlign: "center", fontSize: 10, color: "#9AA2AF" }}>
        {COMPANY.name} · LLPIN {COMPANY.llpin} · This is a system-generated document.
      </div>
    </div>
  );
});

export default BillPreview;