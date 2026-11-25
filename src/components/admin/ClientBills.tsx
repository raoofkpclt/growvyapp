import React, { useEffect, useMemo, useState } from "react";
import type { Bill, Client } from "../../utils/types/Types";
import AddBillModal from "./Modal/AddBillModal";
import EditBillModal from "./Modal/EditBillModal";
import BillPdfPreviewModal from "./Modal/BillPdfPrivewModal";

import { getBills } from "../../service/billService";
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
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const hasPdf = (b: Bill) => !!(b.pdfKey || b.pdfUrl);

// billing period only exists on monthly / custom invoices (older bills have none)
const getPeriod = (b: Bill) => (b.docType === "invoice" ? b.billingPeriod : undefined);

type DocFilter = "all" | "invoice" | "receipt";

const actionBtn =
  "flex-1 text-xs py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

/** Bills (invoices + cash receipts) of one client. Used as a tab in the Client details page. */
const ClientBills: React.FC<{ client: Client; clientId: string }> = ({ client, clientId }) => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const [docFilter, setDocFilter] = useState<DocFilter>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState<Bill | null>(null);
  const [preview, setPreview] = useState<Bill | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // "<billId>:<action>"

  /* does this bill belong to this client?
     uses the bill's clientId when it has one, otherwise the client's name */
  const isMine = useMemo(() => {
    const name = (client.name ?? "").trim().toLowerCase();
    return (b: Bill) => {
      const bid = (b as Bill & { clientId?: string }).clientId;
      if (bid) return bid === clientId || bid === String(client.id);
      return (b.clientName ?? "").trim().toLowerCase() === name;
    };
  }, [client.id, client.name, clientId]);

  /* ---------- fetch, then keep only this client's bills ---------- */
  useEffect(() => {
    let alive = true;
    setLoading(true);
    getBills()
      .then((all) => {
        if (alive) setBills(all.filter(isMine));
      })
      .catch((e) => {
        console.log("Error fetching bills:", e);
        if (alive) setError("Could not load bills.");
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [isMine]);

  /* ---------- totals, per currency ---------- */
  // const totals = useMemo(() => {
  //   const m = new Map<string, { total: number; paid: number; due: number }>();
  //   bills.forEach((b) => {
  //     const cur = b.currency;
  //     const t = m.get(cur) ?? { total: 0, paid: 0, due: 0 };
  //     t.total += b.amount;
  //     if (b.status === "paid") t.paid += b.amount;
  //     else t.due += b.amount;
  //     m.set(cur, t);
  //   });
  //   return [...m.entries()];
  // }, [bills]);

  const totals = useMemo(() => {
  const m = new Map<string, { total: number; paid: number; due: number }>();
  bills.forEach((b) => {
    const cur = b.currency ?? "INR";
    const t = m.get(cur) ?? { total: 0, paid: 0, due: 0 };
    t.total += b.amount;
    if (b.status === "paid") t.paid += b.amount;
    else t.due += b.amount;
    m.set(cur, t);
  });
  return [...m.entries()];
}, [bills]);

  const counts = useMemo(
    () => ({
      all: bills.length,
      invoice: bills.filter((b) => b.docType === "invoice").length,
      receipt: bills.filter((b) => b.docType === "receipt").length,
    }),
    [bills]
  );

  const visible = useMemo(
    () =>
      bills
        .filter((b) => docFilter === "all" || b.docType === docFilter)
        .sort((a, b) => b.createdAt - a.createdAt), // last entered first
    [bills, docFilter]
  );

  /* ---------- download / print the PDF saved in S3 ---------- */
  const handlePdfAction = async (bill: Bill, action: "download" | "print") => {
    try {
      setBusy(`${bill.id}:${action}`);
      setError("");
      const blob = await fetchBillPdfBlob(bill);
      if (action === "download") downloadBlob(blob, pdfFileName(bill));
      else printBlob(blob);
    } catch (e) {
      console.log(e);
      setError(e instanceof Error ? e.message : "Could not load the PDF.");
    } finally {
      setBusy(null);
    }
  };

  const money = (cur: string, n: number) => formatMoney(n, cur as Bill["currency"]);

  return (
    <div className="space-y-5">
      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-xs text-red-300">
          <span>{error}</span>
          <button onClick={() => setError("")} className="text-base leading-none text-red-300/70 hover:text-red-200">
            ×
          </button>
        </div>
      )}
      {info && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-300">
          <span>{info}</span>
          <button onClick={() => setInfo("")} className="text-base leading-none text-amber-300/70 hover:text-amber-200">
            ×
          </button>
        </div>
      )}

      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Bills</h3>
          <p className="mt-0.5 text-xs text-zinc-500">
            {counts.all} total · {counts.invoice} invoices · {counts.receipt} cash receipts
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500"
        >
          <span className="text-base leading-none">+</span> Add Bill
        </button>
      </div>

      {/* totals */}
      {totals.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { label: "Total billed", key: "total" as const, tone: "text-white" },
            { label: "Paid", key: "paid" as const, tone: "text-emerald-400" },
            { label: "Outstanding", key: "due" as const, tone: "text-amber-300" },
          ].map((s) => (
            <div key={s.key} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <p className="text-xs text-zinc-500">{s.label}</p>
              {totals.map(([cur, t]) => (
                <p key={cur} className={`mt-1 text-xl font-semibold ${s.tone}`}>
                  {money(cur, t[s.key])}
                </p>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* filter */}
      <div className="flex w-fit gap-1 overflow-x-auto rounded-xl border border-white/10 bg-white/5 p-1">
        {(["all", "invoice", "receipt"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setDocFilter(f)}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs transition-all ${
              docFilter === f ? "bg-violet-600 text-white" : "text-zinc-400 hover:text-white"
            }`}
          >
            {f === "receipt" ? "Cash Receipts" : f === "invoice" ? "Invoices" : "All"}
            <span className={`ml-1.5 ${docFilter === f ? "text-violet-200" : "text-zinc-600"}`}>{counts[f]}</span>
          </button>
        ))}
      </div>

      {/* grid */}
      {loading ? (
        <div className="grid animate-pulse grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-64 rounded-2xl bg-white/5" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((bill) => {
            const pdfReady = hasPdf(bill);
            const period = getPeriod(bill);
            return (
              <div
                key={bill.id}
                className="overflow-hidden rounded-2xl border border-white/5 bg-[#0f1117] transition-all duration-300 hover:border-white/10"
              >
                {/* header strip */}
                <div
                  className={`relative flex h-16 items-center gap-2 overflow-hidden px-5 ${
                    bill.docType === "invoice"
                      ? "bg-gradient-to-br from-violet-600/25 to-violet-900/5"
                      : "bg-gradient-to-br from-sky-600/25 to-sky-900/5"
                  }`}
                >
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                      bill.docType === "invoice"
                        ? "border-violet-500/30 bg-violet-500/20 text-violet-300"
                        : "border-sky-500/30 bg-sky-500/20 text-sky-300"
                    }`}
                  >
                    {bill.docType === "invoice" ? "Invoice" : "Cash Receipt"}
                  </span>

                  {period && (
                    <span className="rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                      {period.type === "monthly" ? "Monthly" : "Period"}
                    </span>
                  )}

                  <span
                    className={`absolute right-3 top-3 rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${
                      STATUS_STYLES[bill.status] || "border-zinc-500/30 bg-zinc-500/20 text-zinc-400"
                    }`}
                  >
                    {bill.status}
                  </span>
                </div>

                {/* body */}
                <div className="px-5 pb-5 pt-4">
                  <p className="mb-1 font-mono text-[11px] text-zinc-500">{bill.billNo}</p>
                  <p className="mb-1 text-xs text-zinc-500">
                    {bill.service} &middot; {fmtDate(bill.date)}
                  </p>

                  {period ? (
                    <p className="mb-3 text-xs text-violet-300">
                      <span className="text-zinc-500">Period: </span>
                      {period.label}
                    </p>
                  ) : (
                    <div className="mb-2" />
                  )}

                  <p className="mb-4 text-2xl font-bold text-white">{formatMoney(bill.amount, bill.currency)}</p>

                  <div className="mb-2 flex gap-2">
                    <button
                      onClick={() => setPreview(bill)}
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

                  <button
                    onClick={() => setShowEdit({ ...bill })}
                    className="w-full rounded-lg border border-violet-500/20 bg-violet-500/10 py-1.5 text-xs text-violet-300 transition-colors hover:bg-violet-500/20"
                  >
                    Edit
                  </button>

                  {!pdfReady && <p className="mt-2 text-[10px] text-zinc-600">No PDF saved for this bill.</p>}
                </div>
              </div>
            );
          })}

          {visible.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-zinc-600">
              <div className="mb-3 text-4xl">🧾</div>
              <p className="text-sm">
                {bills.length === 0
                  ? `No bills for ${client.name} yet. Add the first one.`
                  : "No bills in this type."}
              </p>
            </div>
          )}
        </div>
      )}

      {/* modals */}
      {showAdd && (
        <AddBillModal
          onClose={() => setShowAdd(false)}
          onSave={(newBill: Bill) => {
            if (isMine(newBill)) {
              setBills((prev) => [newBill, ...prev]);
              setInfo("");
            } else {
              setInfo(
                `That bill was saved for "${newBill.clientName}", so it isn't listed here. Choose ${client.name} as the client when you add a bill.`
              );
            }
            setShowAdd(false);
          }}
        />
      )}

      {showEdit && (
        <EditBillModal
          bill={showEdit}
          onClose={() => setShowEdit(null)}
          onSave={(updated) => {
            // keep it only if it still belongs to this client
            setBills((prev) =>
              isMine(updated) ? prev.map((b) => (b.id === updated.id ? updated : b)) : prev.filter((b) => b.id !== updated.id)
            );
            setShowEdit(null);
          }}
        />
      )}

      {preview && <BillPdfPreviewModal bill={preview} onClose={() => setPreview(null)} />}
    </div>
  );
};

export default ClientBills;