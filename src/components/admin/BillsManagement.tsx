import React, { useState, useEffect } from "react";
import type { Bill } from "../../utils/types/Types";
import AddBillModal from "./Modal/AddBillModal";
import EditBillModal from "./Modal/EditBillModal";
import DeleteConfirmModal from "./Modal/DeleteConfirmModal";
import BillPdfPreviewModal from "./Modal/BillPdfPrivewModal";

import { getBills, deleteBill } from "../../service/billService";
import { fetchBillPdfBlob } from "../../service/Billstorage";
import { downloadBlob, printBlob, pdfFileName } from "../../service/Billpdf";
import { formatMoney } from "../../utils/currency";

const STATUS_STYLES: Record<string, string> = {
  paid: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  overdue: "bg-red-500/20 text-red-400 border-red-500/30",
};

const fmtDate = (d: string) => {
  if (!d) return "—";
  const dt = new Date(d + "T00:00:00");
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const hasPdf = (b: Bill) => !!(b.pdfKey || b.pdfUrl);

// billing period only exists on monthly / custom invoices (older bills have none)
const getPeriod = (b: Bill) =>
  b.docType === "invoice" ? b.billingPeriod : undefined;

const BillsManagement: React.FC = () => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [showAddBill, setShowAddBill] = useState(false);
  const [showEditBill, setShowEditBill] = useState<Bill | null>(null);
  const [previewBill, setPreviewBill] = useState<Bill | null>(null);

  const [deleteBillId, setDeleteBillId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [busy, setBusy] = useState<string | null>(null); // "<billId>:<action>"
  const [pdfError, setPdfError] = useState("");

  const [docFilter, setDocFilter] = useState<"all" | "invoice" | "receipt">(
    "all",
  );
  const [search, setSearch] = useState("");

  useEffect(() => {
    const loadBills = async () => {
      try {
        const data = await getBills();
        setBills(data);
      } catch (error) {
        console.log(error);
      }
    };

    loadBills();
  }, []);

  const handleDeleteBill = async () => {
    if (!deleteBillId) return;

    try {
      setDeleteLoading(true);

      await deleteBill(deleteBillId);

      setBills((prev) => prev.filter((b) => b.firestoreId !== deleteBillId));

      setDeleteBillId(null);
    } catch (error) {
      console.log(error);
    } finally {
      setDeleteLoading(false);
    }
  };

  // download / print the PDF saved in S3
  const handlePdfAction = async (bill: Bill, action: "download" | "print") => {
    try {
      setBusy(`${bill.id}:${action}`);
      setPdfError("");
      const blob = await fetchBillPdfBlob(bill);
      if (action === "download") downloadBlob(blob, pdfFileName(bill));
      else printBlob(blob);
    } catch (error) {
      console.log(error);
      setPdfError(
        error instanceof Error ? error.message : "Could not load the PDF.",
      );
    } finally {
      setBusy(null);
    }
  };

  const visibleBills = bills
    .filter((bill) => {
      if (docFilter !== "all" && bill.docType !== docFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const periodText = getPeriod(bill)?.label.toLowerCase() ?? "";
        if (
          !bill.clientName.toLowerCase().includes(q) &&
          !bill.billNo.toLowerCase().includes(q) &&
          !periodText.includes(q) // search by "october 2026" etc.
        )
          return false;
      }
      return true;
    })
    .sort((a, b) => b.createdAt - a.createdAt); // last entered first

  const actionBtn =
    "flex-1 text-xs py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <div>
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex gap-2">
            {(["all", "invoice", "receipt"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setDocFilter(f)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all capitalize
      ${
        docFilter === f
          ? "bg-violet-600 text-white border-violet-500"
          : "border-white/10 text-zinc-400 hover:text-white hover:border-white/20"
      }`}
              >
                {f === "receipt"
                  ? "Cash Receipts"
                  : f === "invoice"
                    ? "Invoices"
                    : "All"}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search bill no., client or period…"
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/60 transition-colors w-56"
            />
            <button
              onClick={() => setShowAddBill(true)}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
            >
              <span className="text-base leading-none">+</span> Add Bill
            </button>
          </div>
        </div>

        {pdfError && (
          <div className="flex items-center justify-between gap-3 text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
            <span>{pdfError}</span>
            <button
              onClick={() => setPdfError("")}
              className="text-red-300/70 hover:text-red-200 text-base leading-none"
            >
              ×
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {visibleBills.map((bill) => {
            const pdfReady = hasPdf(bill);
            const period = getPeriod(bill);
            return (
              <div
                key={bill.id}
                className="bg-[#0f1117] border border-white/5 rounded-2xl overflow-hidden group hover:border-white/10 transition-all duration-300"
              >
                {/* Header strip */}
                <div
                  className={`h-20 relative overflow-hidden flex items-center gap-2 px-5 ${
                    bill.docType === "invoice"
                      ? "bg-gradient-to-br from-violet-600/25 to-violet-900/5"
                      : "bg-gradient-to-br from-sky-600/25 to-sky-900/5"
                  }`}
                >
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      bill.docType === "invoice"
                        ? "bg-violet-500/20 text-violet-300 border-violet-500/30"
                        : "bg-sky-500/20 text-sky-300 border-sky-500/30"
                    }`}
                  >
                    {bill.docType === "invoice" ? "Invoice" : "Cash Receipt"}
                  </span>

                  {/* Monthly / Custom period tag */}
                  {period && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-amber-500/15 text-amber-300 border-amber-500/30">
                      {period.type === "monthly" ? "Monthly" : "Period"}
                    </span>
                  )}

                  <span
                    className={`absolute top-3 right-3 text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${
                      STATUS_STYLES[bill.status] ||
                      "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
                    }`}
                  >
                    {bill.status}
                  </span>
                </div>

                {/* Body */}
                <div className="px-5 pb-5 pt-4">
                  <p className="text-[11px] font-mono text-zinc-500 mb-1">
                    {bill.billNo}
                  </p>
                  <h3 className="text-white font-semibold text-sm">
                    {bill.clientName}
                  </h3>
                  <p className="text-xs text-zinc-500 mb-1">
                    {bill.service} &middot; {fmtDate(bill.date)}
                  </p>

                  {/* Billing period (monthly / custom invoices only) */}
                  {period ? (
                    <p className="text-xs text-violet-300 mb-3">
                      <span className="text-zinc-500">Period: </span>
                      {period.label}
                    </p>
                  ) : (
                    <div className="mb-2" />
                  )}

                  <p className="text-2xl font-bold text-white mb-4">
                    {formatMoney(bill.amount, bill.currency)}
                  </p>

                  {/* PDF actions (from S3) */}
                  <div className="flex gap-2 mb-2">
                    <button
                      onClick={() => setPreviewBill(bill)}
                      disabled={!pdfReady}
                      title={pdfReady ? "Preview PDF" : "No saved PDF for this bill"}
                      className={actionBtn}
                    >
                      Preview
                    </button>
                    <button
                      onClick={() => handlePdfAction(bill, "download")}
                      disabled={!pdfReady || busy === `${bill.id}:download`}
                      title={pdfReady ? "Download PDF" : "No saved PDF for this bill"}
                      className={actionBtn}
                    >
                      {busy === `${bill.id}:download` ? "…" : "Download"}
                    </button>
                    <button
                      onClick={() => handlePdfAction(bill, "print")}
                      disabled={!pdfReady || busy === `${bill.id}:print`}
                      title={pdfReady ? "Print PDF" : "No saved PDF for this bill"}
                      className={actionBtn}
                    >
                      {busy === `${bill.id}:print` ? "…" : "Print"}
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowEditBill({ ...bill })}
                      className="flex-1 text-xs py-1.5 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 border border-violet-500/20 transition-colors "
                      disabled
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteBillId(bill.firestoreId || null)}
                      disabled
                      className="px-3 text-xs py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors"
                    >
                      Delete 
                    </button>
                  </div>

                  {!pdfReady && (
                    <p className="text-[10px] text-zinc-600 mt-2">
                      No PDF saved for this bill.
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          {/* Add placeholder */}
          <button
            onClick={() => setShowAddBill(true)}
            className="border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-3 h-64 hover:border-violet-500/40 hover:bg-violet-500/5 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl border border-dashed border-white/20 flex items-center justify-center text-zinc-600 group-hover:text-violet-400 group-hover:border-violet-500/40 transition-colors text-xl">
              +
            </div>
            <span className="text-xs text-zinc-600 group-hover:text-zinc-400 transition-colors">
              Add New Bill
            </span>
          </button>
        </div>

        {visibleBills.length === 0 && (
          <p className="text-center text-sm text-zinc-600 py-6">
            No bills match this view yet.
          </p>
        )}
      </div>

      {showAddBill && (
        <AddBillModal
          onClose={() => setShowAddBill(false)}
          onSave={(newBill: Bill) => {
            setBills((prev) => [newBill, ...prev]);
            setShowAddBill(false);
          }}
        />
      )}

      {showEditBill && (
        <EditBillModal
          bill={showEditBill}
          onClose={() => setShowEditBill(null)}
          onSave={(updatedBill) => {
            setBills((prev) =>
              prev.map((bill) =>
                bill.id === updatedBill.id ? updatedBill : bill,
              ),
            );
            setShowEditBill(null);
          }}
        />
      )}

      {previewBill && (
        <BillPdfPreviewModal
          bill={previewBill}
          onClose={() => setPreviewBill(null)}
        />
      )}

      {deleteBillId && (
        <DeleteConfirmModal
          loading={deleteLoading}
          onClose={() => setDeleteBillId(null)}
          onConfirm={handleDeleteBill}
        />
      )}
    </div>
  );
};

export default BillsManagement;