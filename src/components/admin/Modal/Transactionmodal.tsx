import React, { useState } from "react";
import type { AccountCategory, AccountRegion, AccountTransaction } from "../../../utils/types/Types";
import { addTransaction, updateTransaction } from "../../../service/Accountservice";
import { MAJOR_HEADS, PAYMENT_MODES, REGIONS, SERVICE_CATEGORIES, toIso } from "../../../service/Accounts";

const inputCls =
  "bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/60 transition-colors w-full";
const labelCls = "text-[11px] text-zinc-400 font-medium uppercase tracking-wider mb-1 block";

interface Props {
  transaction?: AccountTransaction; // present = edit mode
  chart: AccountCategory[];
  onClose: () => void;
  onSave: (t: AccountTransaction) => void;
}

const TransactionModal: React.FC<Props> = ({ transaction, chart, onClose, onSave }) => {
  const [date, setDate] = useState(transaction?.date ?? toIso(new Date()));
  const [voucherNo, setVoucherNo] = useState(transaction?.voucherNo ?? "");
  const [description, setDescription] = useState(transaction?.description ?? "");
  const [flow, setFlow] = useState<"income" | "expense">(
    transaction && transaction.income > 0 ? "income" : "expense",
  );
  const [amount, setAmount] = useState(transaction ? transaction.income || transaction.expense : 0);
  const [category, setCategory] = useState(transaction?.category ?? "");
  const [serviceCategory, setServiceCategory] = useState(
    transaction?.serviceCategory ?? SERVICE_CATEGORIES[SERVICE_CATEGORIES.length - 1],
  );
  const [region, setRegion] = useState<AccountRegion>(transaction?.region ?? "India");
  const [paymentMode, setPaymentMode] = useState(transaction?.paymentMode ?? "Bank Transfer");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selected = chart.find((c) => c.name === category);
  const isValid = !!date && amount > 0 && !!category;

  // Income / Expense categories pick the matching side automatically
  const handleCategory = (name: string) => {
    setCategory(name);
    const c = chart.find((x) => x.name === name);
    if (c?.majorHead === "Income") setFlow("income");
    if (c?.majorHead === "Expenses") setFlow("expense");
  };

  const handleSave = async () => {
    if (!isValid) return;
    const payload = {
      date,
      voucherNo: voucherNo.trim(),
      description: description.trim(),
      category,
      serviceCategory,
      region,
      paymentMode,
      income: flow === "income" ? amount : 0,
      expense: flow === "expense" ? amount : 0,
      createdAt: transaction?.createdAt ?? Date.now(),
    };
    try {
      setSaving(true);
      setError("");
      const saved = transaction
        ? await updateTransaction({ ...payload, id: transaction.id, firestoreId: transaction.firestoreId })
        : await addTransaction(payload);
      onSave(saved);
    } catch (e) {
      console.log(e);
      setError("Could not save the transaction. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    // items-start + pt-* = modal sits at the top centre of the screen
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm px-4 pt-6 sm:pt-10 overflow-y-auto">
      <div className="bg-[#0f1117] border border-white/10 rounded-xl w-full max-w-lg shadow-2xl max-h-[85vh] flex flex-col animate-fade-in">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 flex-shrink-0">
          <h3 className="text-white font-semibold text-sm">
            {transaction ? "Edit Transaction" : "Add Transaction"}
          </h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors text-xl leading-none">
            ×
          </button>
        </div>

        <div className="px-4 py-3 overflow-y-auto space-y-3">
          {/* Income / Expense */}
          <div className="flex gap-2">
            {(["income", "expense"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFlow(f)}
                className={`flex-1 text-xs py-1.5 rounded-lg border transition-all font-medium ${
                  flow === f
                    ? f === "income"
                      ? "bg-emerald-600/20 text-emerald-300 border-emerald-500/50"
                      : "bg-red-600/20 text-red-300 border-red-500/50"
                    : "border-white/10 text-zinc-400 hover:text-white hover:border-white/20"
                }`}
              >
                {f === "income" ? "Income / Receipt" : "Expense / Payment"}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className={labelCls}>Date</label>
              <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Voucher No.</label>
              <input className={inputCls} placeholder="Optional" value={voucherNo} onChange={(e) => setVoucherNo(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Amount</label>
              <input
                type="number"
                className={inputCls}
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Description</label>
            <input
              className={inputCls}
              placeholder="e.g. manha sofa mall social media service charge"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className={labelCls}>Category</label>
            <select className={inputCls} value={category} onChange={(e) => handleCategory(e.target.value)}>
              <option value="" className="bg-[#0f1117]">Select category…</option>
              {category && !selected && (
                <option value={category} className="bg-[#0f1117]">{category} (not in chart)</option>
              )}
              {MAJOR_HEADS.map((h) => (
                <optgroup key={h} label={h} className="bg-[#0f1117]">
                  {chart
                    .filter((c) => c.majorHead === h)
                    .map((c) => (
                      <option key={c.id} value={c.name} className="bg-[#0f1117]">
                        {c.name}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
            {selected && (
              <p className="mt-1 text-[11px] text-zinc-500">
                Major Head: <span className="text-violet-300">{selected.majorHead}</span> · Account Type:{" "}
                <span className="text-violet-300">{selected.type}</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className={labelCls}>Client / Service</label>
              <select className={inputCls} value={serviceCategory} onChange={(e) => setServiceCategory(e.target.value)}>
                {SERVICE_CATEGORIES.map((s) => (
                  <option key={s} className="bg-[#0f1117]">{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Region</label>
              <select className={inputCls} value={region} onChange={(e) => setRegion(e.target.value as AccountRegion)}>
                {REGIONS.map((r) => (
                  <option key={r} className="bg-[#0f1117]">{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Payment Mode</label>
              <select className={inputCls} value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
                {PAYMENT_MODES.map((m) => (
                  <option key={m} className="bg-[#0f1117]">{m}</option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        <div className="flex gap-2 px-4 py-3 border-t border-white/5 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg text-xs text-zinc-400 border border-white/10 hover:text-white hover:border-white/20 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !isValid}
            className="flex-1 py-2 rounded-lg text-xs bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-medium transition-colors"
          >
            {saving ? "Saving..." : transaction ? "Save Changes" : "Add Transaction"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionModal;