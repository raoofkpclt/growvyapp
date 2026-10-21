import React, { useState } from "react";
import type { Bill, BillItem, BillStatus } from "../../../utils/types/Types";
import { updateBill } from "../../../service/billService";
import { CURRENCIES, CURRENCY_CODES, formatMoney } from "../../../utils/currency";
import type { CurrencyCode } from "../../../utils/currency";

const SERVICE_OPTIONS = [
  "Branding & Design",
  "Social Media",
  "Web Development",
  "Reels & Content",
  "Poster / Creative",
  "Other",
];

const STATUS_OPTIONS: BillStatus[] = ["paid", "pending", "overdue"];

const inputCls =
  "bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/60 transition-colors w-full";
const labelCls =
  "text-xs text-zinc-400 font-medium uppercase tracking-wider mb-1.5 block";

interface Props {
  bill: Bill;
  onClose: () => void;
  onSave: (bill: Bill) => void;
}

const EditBillModal: React.FC<Props> = ({ bill, onClose, onSave }) => {
  const [saving, setSaving] = useState(false);

  const [billNo, setBillNo] = useState(bill.billNo);
  const [date, setDate] = useState(bill.date);
  const [currency, setCurrency] = useState<CurrencyCode>(
    (bill.currency as CurrencyCode) ?? "INR",
  );
  const [clientName, setClientName] = useState(bill.clientName);
  const [service, setService] = useState(bill.service);
  const [status, setStatus] = useState<BillStatus>(bill.status);

  // invoice-only
  const [dueDate, setDueDate] = useState(bill.dueDate || "");
  const [items, setItems] = useState<BillItem[]>(
    bill.items && bill.items.length
      ? bill.items
      : [{ id: "0001", description: "", qty: 1, rate: 0 }],
  );
  const [discount, setDiscount] = useState(bill.discount || 0);
  const [gstPercent, setGstPercent] = useState(bill.gstPercent || 0);
  const [advanceReceived, setAdvanceReceived] = useState(
    bill.advanceReceived || 0,
  );

  // receipt-only
  const [receiptAmount, setReceiptAmount] = useState(
    bill.docType === "receipt" ? bill.amount : 0,
  );
  const [paymentMode, setPaymentMode] = useState(bill.paymentMode || "UPI");

  const symbol = CURRENCIES[currency].symbol;

  const addItem = () =>
    setItems((p) => [
      ...p,
      { id: Date.now().toString(), description: "", qty: 1, rate: 0 },
    ]);
  const removeItem = (id: string) =>
    setItems((p) => (p.length > 1 ? p.filter((i) => i.id !== id) : p));
  const updateItem = (id: string, patch: Partial<BillItem>) =>
    setItems((p) => p.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const subtotal = items.reduce((s, i) => s + i.qty * i.rate, 0);
  const gstAmt = (subtotal - discount) * (gstPercent / 100);
  const total = subtotal - discount + gstAmt;
  const balanceDue = total - advanceReceived;

  const handleSave = async () => {
    if (!clientName.trim()) return;
    if (!bill.firestoreId) return;

    const amount = bill.docType === "invoice" ? total : receiptAmount;

    const updates: Partial<Bill> =
      bill.docType === "invoice"
        ? {
            billNo,
            date,
            dueDate,
            clientName: clientName.trim(),
            service,
            status,
            amount,
            currency,
            items,
            discount,
            gstPercent,
            advanceReceived,
          }
        : {
            billNo,
            date,
            clientName: clientName.trim(),
            service,
            status,
            amount,
            currency,
            paymentMode,
          };

    try {
      setSaving(true);
      await updateBill(bill.firestoreId, updates);
      onSave({ ...bill, ...updates });
    } catch (error) {
      console.log(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 py-8">
      <div className="bg-[#0f1117] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col animate-fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 flex-shrink-0">
          <h3 className="text-white font-semibold text-base">
            Edit {bill.docType === "invoice" ? "Invoice" : "Receipt"}
          </h3>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>
                {bill.docType === "invoice" ? "Invoice No." : "Receipt No."}
              </label>
              <input
                className={inputCls}
                value={billNo}
                onChange={(e) => setBillNo(e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>Date</label>
              <input
                type="date"
                className={inputCls}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>
                {bill.docType === "invoice" ? "Client" : "Received From"}
              </label>
              <input
                className={inputCls}
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>Service</label>
              <select
                className={inputCls}
                value={service}
                onChange={(e) => setService(e.target.value)}
              >
                {SERVICE_OPTIONS.map((s) => (
                  <option key={s} className="bg-[#0f1117]">
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {bill.docType === "invoice" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Due Date</label>
                <input
                  type="date"
                  className={inputCls}
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>Status</label>
                <select
                  className={inputCls}
                  value={status}
                  onChange={(e) => setStatus(e.target.value as BillStatus)}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} className="bg-[#0f1117] capitalize">
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {bill.docType === "invoice" ? (
            <>
              <div>
                <label className={labelCls}>Items</label>
                <div className="grid grid-cols-[1fr_70px_90px_28px] gap-2 text-[10px] uppercase tracking-wider text-zinc-500 mb-1 px-1">
                  <span>Description</span>
                  <span>Qty</span>
                  <span>Rate ({symbol})</span>
                  <span />
                </div>
                <div className="space-y-2">
                  {items.map((it) => (
                    <div
                      key={it.id}
                      className="grid grid-cols-[1fr_70px_90px_28px] gap-2 items-center"
                    >
                      <input
                        className={inputCls}
                        placeholder="Description"
                        value={it.description}
                        onChange={(e) =>
                          updateItem(it.id, { description: e.target.value })
                        }
                      />
                      <input
                        type="number"
                        className={inputCls}
                        value={it.qty}
                        onChange={(e) =>
                          updateItem(it.id, {
                            qty: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                      <input
                        type="number"
                        className={inputCls}
                        value={it.rate}
                        onChange={(e) =>
                          updateItem(it.id, {
                            rate: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                      <button
                        onClick={() => removeItem(it.id)}
                        className="text-red-400 hover:bg-red-500/10 rounded-lg w-7 h-7 flex items-center justify-center flex-shrink-0"
                      >
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
                  <input
                    type="number"
                    className={inputCls}
                    value={discount}
                    onChange={(e) =>
                      setDiscount(parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
                <div>
                  <label className={labelCls}>GST (%)</label>
                  <input
                    type="number"
                    className={inputCls}
                    value={gstPercent}
                    onChange={(e) =>
                      setGstPercent(parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
                <div>
                  <label className={labelCls}>Advance Received ({symbol})</label>
                  <input
                    type="number"
                    className={inputCls}
                    value={advanceReceived}
                    onChange={(e) =>
                      setAdvanceReceived(parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-1.5 text-sm">
                <div className="flex justify-between text-zinc-400">
                  <span>Subtotal</span>
                  <span className="text-zinc-200">
                    {formatMoney(subtotal, currency)}
                  </span>
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Amount Received ({symbol})</label>
                <input
                  type="number"
                  className={inputCls}
                  value={receiptAmount}
                  onChange={(e) =>
                    setReceiptAmount(parseFloat(e.target.value) || 0)
                  }
                />
              </div>
              <div>
                <label className={labelCls}>Payment Mode</label>
                <select
                  className={inputCls}
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                >
                  {["Cash", "UPI", "Bank Transfer", "Cheque"].map((m) => (
                    <option key={m} className="bg-[#0f1117]">
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-white/5 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm text-zinc-400 border border-white/10 hover:text-white hover:border-white/20 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-medium transition-colors"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditBillModal;
