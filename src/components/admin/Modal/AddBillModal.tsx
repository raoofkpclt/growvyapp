import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Bill, BillItem, BillDocType, BillStatus } from "../../../utils/types/Types";
import type { Client } from "../../../utils/types/Types";
import { addBill } from "../../../service/billService";
import { getClients } from "../../../service/clientService";
import BillPreview, { calcTotals } from "./BillPreview";
import type { BillPreviewData } from "./BillPreview";
import { buildBillPdf, downloadBlob } from "../../../service/Billpdf";
import { uploadBillPdf } from "../../../service/Billstorage";
import { CURRENCIES, CURRENCY_CODES, formatMoney } from "../../../utils/currency";
import type { CurrencyCode } from "../../../utils/currency";

const SERVICE_OPTIONS = [
  "Branding & Design",
  "Social Media Service",
  "Web Development",
  "Video Production",
  "Poster / Creative",
  "Other",
];

const inputCls =
  "bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/60 transition-colors w-full";
const labelCls =
  "text-xs text-zinc-400 font-medium uppercase tracking-wider mb-1.5 block";

const PAPER_W = 794; // A4 width in px
const PAPER_H = 1123;
const PREVIEW_SCALE = 0.5;

interface Props {
  onClose: () => void;
  onSave: (bill: Bill) => void;
}

const AddBillModal: React.FC<Props> = ({ onClose, onSave }) => {
  const [docType, setDocType] = useState<BillDocType>("invoice");
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const pdfRef = useRef<HTMLDivElement>(null);

  // shared
  const [billNo, setBillNo] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [currency, setCurrency] = useState<CurrencyCode>("INR");
  const [clientName, setClientName] = useState("");
  const [clientAddress, setClientAddress] = useState(""); // PDF only
  const [clientPhone, setClientPhone] = useState(""); // PDF only
  const [projectRef, setProjectRef] = useState(""); // PDF only
  const [service, setService] = useState(SERVICE_OPTIONS[0]);

  // invoice-only
  const [dueDate, setDueDate] = useState("");
  const [invoiceKind, setInvoiceKind] = useState<"Advance" | "Balance" | "Full Payment">("Full Payment");
  const [items, setItems] = useState<BillItem[]>([{ id: "0001", description: "", qty: 1, rate: 0 }]);
  const [discount, setDiscount] = useState(0);
  const [gstPercent, setGstPercent] = useState(0);
  const [advanceReceived, setAdvanceReceived] = useState(0);

  // receipt-only
  const [receiptAmount, setReceiptAmount] = useState(0);
  const [paymentMode, setPaymentMode] = useState("UPI");
  const [receivedTowards, setReceivedTowards] = useState<"Advance" | "Balance Payment" | "Full Payment">("Advance");
  const [againstInvoiceNo, setAgainstInvoiceNo] = useState("");

  const symbol = CURRENCIES[currency].symbol;

  useEffect(() => {
    (async () => {
      try {
        setClients(await getClients());
      } catch (error) {
        console.log(error);
      }
    })();
  }, []);

  const addItem = () =>
    setItems((p) => [...p, { id: Date.now().toString(), description: "", qty: 1, rate: 0 }]);
  const removeItem = (id: string) =>
    setItems((p) => (p.length > 1 ? p.filter((i) => i.id !== id) : p));
  const updateItem = (id: string, patch: Partial<BillItem>) =>
    setItems((p) => p.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const { subtotal, total, balance: balanceDue } = calcTotals(items, discount, gstPercent, advanceReceived);

  const finalBillNo = useMemo(
    () => billNo || `GRW-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`,
    // keep generated number stable while the modal is open
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [billNo]
  );

  const previewData: BillPreviewData = {
    docType, billNo: finalBillNo, date, dueDate, invoiceKind, clientName, clientAddress,
    clientPhone, projectRef, service, items, discount, gstPercent, advanceReceived,
    receiptAmount, paymentMode, receivedTowards, againstInvoiceNo, currency,
  };

  const isValid = clientName.trim() && !(docType === "receipt" && receiptAmount <= 0);

  // render the preview to a PDF once; reused for download + S3 upload
  const makePdf = async () => {
    if (!pdfRef.current) throw new Error("Preview not ready");
    const blob = await buildBillPdf(pdfRef.current);
    const fileName = `${docType === "invoice" ? "Invoice" : "Receipt"}_${finalBillNo}.pdf`;
    return { blob, fileName };
  };

  const handleSave = async (alsoDownload = false) => {
    if (!isValid) return;

    const amount = docType === "invoice" ? total : receiptAmount;
    const status: BillStatus =
      docType === "receipt"
        ? "paid"
        : balanceDue <= 0
          ? "paid"
          : dueDate && new Date(dueDate) < new Date()
            ? "overdue"
            : "pending";

    const base = {
      billNo: finalBillNo,
      docType,
      clientName: clientName.trim(),
      service,
      date,
      status,
      amount,
      currency,
      createdAt: Date.now(),
    };

    const payload: Omit<Bill, "id" | "firestoreId"> =
      docType === "invoice"
        ? { ...base, dueDate, invoiceKind, items, discount, gstPercent, advanceReceived }
        : { ...base, paymentMode, receivedTowards, againstInvoiceNo };

    try {
      setSaving(true);
      const { blob, fileName } = await makePdf();

      // download BEFORE onSave, because onSave may close (unmount) the modal
      if (alsoDownload) downloadBlob(blob, fileName);

      // upload to S3; if it fails we still save the bill (without a pdf link)
      let pdf: { key: string; url: string } | undefined;
      try {
        pdf = await uploadBillPdf(blob, fileName);
      } catch (err) {
        console.log("S3 PDF upload failed:", err);
      }

      const saved = await addBill(
        pdf ? { ...payload, pdfUrl: pdf.url, pdfKey: pdf.key } : payload,
      );
      onSave(saved);
    } catch (error) {
      console.log(error);
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadOnly = async () => {
    if (!isValid) return;
    try {
      setSaving(true);
      const { blob, fileName } = await makePdf();
      downloadBlob(blob, fileName);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 py-8">
      <div className="bg-[#0f1117] border border-white/10 rounded-2xl w-full max-w-6xl shadow-2xl max-h-[92vh] flex flex-col animate-fade-in">
        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 flex-shrink-0">
          <h3 className="text-white font-semibold text-base">Add Bill</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors text-xl leading-none">
            ×
          </button>
        </div>

        <div className="flex-1 min-h-0 grid lg:grid-cols-[1fr_auto]">
          {/* ---------------- FORM ---------------- */}
          <div className="px-6 py-5 overflow-y-auto space-y-5 min-w-0">
            <div className="flex gap-2">
              {(["invoice", "receipt"] as BillDocType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setDocType(t)}
                  className={`flex-1 text-xs py-2 rounded-lg border transition-all font-medium ${
                    docType === t
                      ? "bg-violet-600 text-white border-violet-500"
                      : "border-white/10 text-zinc-400 hover:text-white hover:border-white/20"
                  }`}
                >
                  {t === "invoice" ? "Invoice" : "Cash Receipt"}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>{docType === "invoice" ? "Invoice No." : "Receipt No."}</label>
                <input className={inputCls} placeholder="Auto-generated if empty" value={billNo} onChange={(e) => setBillNo(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Date</label>
                <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Currency</label>
                <select
                  className={inputCls}
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                >
                  {CURRENCY_CODES.map((c) => (
                    <option key={c} value={c} className="bg-[#0f1117]">
                      {c} · {CURRENCIES[c].symbol}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {docType === "invoice" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Invoice Type</label>
                  <select className={inputCls} value={invoiceKind} onChange={(e) => setInvoiceKind(e.target.value as any)}>
                    <option className="bg-[#0f1117]">Advance</option>
                    <option className="bg-[#0f1117]">Balance</option>
                    <option className="bg-[#0f1117]">Full Payment</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Due Date</label>
                  <input type="date" className={inputCls} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>{docType === "invoice" ? "Client" : "Received From"}</label>
                <input
                  className={inputCls}
                  list="bill-client-list"
                  placeholder="e.g. Arjun Menon"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                />
                <datalist id="bill-client-list">
                  {clients.map((c) => (
                    <option key={c.id} value={c.name} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className={labelCls}>Service</label>
                <select className={inputCls} value={service} onChange={(e) => setService(e.target.value)}>
                  {SERVICE_OPTIONS.map((s) => (
                    <option key={s} className="bg-[#0f1117]">{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* extra details that only appear on the PDF */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Client Address</label>
                <textarea
                  rows={2}
                  className={inputCls + " resize-none"}
                  placeholder="Optional – shown on PDF"
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                />
              </div>
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>Phone</label>
                  <input className={inputCls} placeholder="Optional" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} />
                </div>
                {docType === "invoice" && (
                  <div>
                    <label className={labelCls}>Project / Ref</label>
                    <input className={inputCls} placeholder="Optional" value={projectRef} onChange={(e) => setProjectRef(e.target.value)} />
                  </div>
                )}
              </div>
            </div>

            {docType === "invoice" ? (
              <>
                <div>
                  <label className={labelCls}>Items</label>
                  <div className="grid grid-cols-[1fr_70px_90px_28px] gap-2 text-[10px] uppercase tracking-wider text-zinc-500 mb-1 px-1">
                    <span>Description</span><span>Qty</span><span>Rate ({symbol})</span><span />
                  </div>
                  <div className="space-y-2">
                    {items.map((it) => (
                      <div key={it.id} className="grid grid-cols-[1fr_70px_90px_28px] gap-2 items-center">
                        <input className={inputCls} placeholder="Description" value={it.description} onChange={(e) => updateItem(it.id, { description: e.target.value })} />
                        <input type="number" className={inputCls} value={it.qty} onChange={(e) => updateItem(it.id, { qty: parseFloat(e.target.value) || 0 })} />
                        <input type="number" className={inputCls} value={it.rate} onChange={(e) => updateItem(it.id, { rate: parseFloat(e.target.value) || 0 })} />
                        <button onClick={() => removeItem(it.id)} className="text-red-400 hover:bg-red-500/10 rounded-lg w-7 h-7 flex items-center justify-center flex-shrink-0">
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={addItem}
                    className="mt-2 w-full py-2 rounded-xl border border-dashed border-white/15 text-violet-300 text-xs font-semibold hover:border-violet-500/40 hover:bg-violet-500/5 transition-colors"
                  >
                    + Add line item
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={labelCls}>Discount ({symbol})</label>
                    <input type="number" className={inputCls} value={discount} onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)} />
                  </div>
                  <div>
                    <label className={labelCls}>GST (%)</label>
                    <input type="number" className={inputCls} value={gstPercent} onChange={(e) => setGstPercent(parseFloat(e.target.value) || 0)} />
                  </div>
                  <div>
                    <label className={labelCls}>Advance Received ({symbol})</label>
                    <input type="number" className={inputCls} value={advanceReceived} onChange={(e) => setAdvanceReceived(parseFloat(e.target.value) || 0)} />
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-1.5 text-sm">
                  <div className="flex justify-between text-zinc-400">
                    <span>Subtotal</span>
                    <span className="text-zinc-200">{formatMoney(subtotal, currency)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-white pt-1.5 border-t border-white/10">
                    <span>Total</span>
                    <span>{formatMoney(total, currency)}</span>
                  </div>
                  <div className="flex justify-between text-violet-300 font-semibold">
                    <span>Balance Due</span>
                    <span>{formatMoney(balanceDue, currency)}</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Amount Received ({symbol})</label>
                    <input type="number" className={inputCls} value={receiptAmount} onChange={(e) => setReceiptAmount(parseFloat(e.target.value) || 0)} />
                  </div>
                  <div>
                    <label className={labelCls}>Payment Mode</label>
                    <select className={inputCls} value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
                      {["Cash", "UPI", "Bank Transfer", "Cheque"].map((m) => (
                        <option key={m} className="bg-[#0f1117]">{m}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Received Towards</label>
                    <select className={inputCls} value={receivedTowards} onChange={(e) => setReceivedTowards(e.target.value as any)}>
                      <option className="bg-[#0f1117]">Advance</option>
                      <option className="bg-[#0f1117]">Balance Payment</option>
                      <option className="bg-[#0f1117]">Full Payment</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Against Invoice No.</label>
                    <input className={inputCls} placeholder="Optional" value={againstInvoiceNo} onChange={(e) => setAgainstInvoiceNo(e.target.value)} />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ---------------- LIVE PREVIEW (desktop) ---------------- */}
          <div className="hidden lg:flex flex-col border-l border-white/5 bg-black/20 px-5 py-5 overflow-y-auto">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">Live Preview</p>
            <div
              className="rounded-lg overflow-hidden shadow-xl bg-white flex-shrink-0"
              style={{ width: PAPER_W * PREVIEW_SCALE, height: PAPER_H * PREVIEW_SCALE }}
            >
              <div style={{ transform: `scale(${PREVIEW_SCALE})`, transformOrigin: "top left", width: PAPER_W }}>
                <BillPreview data={previewData} />
              </div>
            </div>
          </div>
        </div>

        {/* hidden full-size copy used only for PDF capture */}
        <div style={{ position: "fixed", left: -10000, top: 0, pointerEvents: "none" }} aria-hidden>
          <BillPreview ref={pdfRef} data={previewData} />
        </div>

        {/* footer */}
        <div className="flex flex-wrap gap-3 px-6 py-4 border-t border-white/5 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 min-w-[90px] py-2.5 rounded-xl text-sm text-zinc-400 border border-white/10 hover:text-white hover:border-white/20 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDownloadOnly}
            disabled={saving || !isValid}
            className="flex-1 min-w-[130px] py-2.5 rounded-xl text-sm border border-violet-500/40 text-violet-300 hover:bg-violet-500/10 disabled:opacity-40 font-medium transition-colors"
          >
            ⬇ Download PDF
          </button>
          <button
            onClick={() => handleSave(false)}
            disabled={saving || !isValid}
            className="flex-1 min-w-[110px] py-2.5 rounded-xl text-sm bg-white/10 hover:bg-white/15 disabled:opacity-40 text-white font-medium transition-colors"
          >
            {saving ? "Please wait..." : `Save ${docType === "invoice" ? "Invoice" : "Receipt"}`}
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving || !isValid}
            className="flex-1 min-w-[150px] py-2.5 rounded-xl text-sm bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-medium transition-colors"
          >
            Save & Download PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddBillModal;
