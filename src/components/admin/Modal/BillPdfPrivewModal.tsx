// pages/.../Modal/BillPdfPreviewModal.tsx
import React, { useEffect, useState } from "react";
import type { Bill } from "../../../utils/types/Types";
import { fetchBillPdfBlob } from "../../../service/Billstorage";
import { downloadBlob, printBlob, pdfFileName } from "../../../service/Billpdf";

interface Props {
  bill: Bill;
  onClose: () => void;
}

const BillPdfPreviewModal: React.FC<Props> = ({ bill, onClose }) => {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let objectUrl = "";
    let cancelled = false;
    (async () => {
      try {
        const b = await fetchBillPdfBlob(bill);
        if (cancelled) return;
        objectUrl = URL.createObjectURL(b);
        setBlob(b);
        setUrl(objectUrl);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load PDF.");
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [bill]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const btn =
    "text-xs px-3 py-1.5 rounded-lg border border-white/10 text-zinc-300 hover:text-white hover:border-white/20 disabled:opacity-40 transition-colors";

  // billing period label (monthly / custom invoices only; older bills have none)
  const periodLabel = bill.docType === "invoice" ? bill.billingPeriod?.label : undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4 py-6"
      onClick={onClose}
    >
      <div
        className="bg-[#0f1117] border border-white/10 rounded-2xl w-full max-w-4xl h-[90vh] shadow-2xl flex flex-col animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-white/5 flex-shrink-0">
          <div className="min-w-0">
            <h3 className="text-white font-semibold text-sm truncate">
              {bill.docType === "invoice" ? "Invoice" : "Receipt"} · {bill.billNo}
            </h3>
            <p className="text-xs text-zinc-500 truncate">
              {bill.clientName}
              {periodLabel && <span className="text-violet-300"> · {periodLabel}</span>}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button className={btn} disabled={!blob} onClick={() => blob && downloadBlob(blob, pdfFileName(bill))}>
              ⬇ Download
            </button>
            <button className={btn} disabled={!blob} onClick={() => blob && printBlob(blob)}>
              Print
            </button>
            {url && (
              <a className={btn} href={url} target="_blank" rel="noreferrer">
                Open in tab
              </a>
            )}
            <button onClick={onClose} className="text-zinc-500 hover:text-white text-xl leading-none px-1">
              ×
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 bg-black/30 rounded-b-2xl overflow-hidden">
          {error ? (
            <div className="h-full flex items-center justify-center text-sm text-red-400 px-6 text-center">
              {error}
            </div>
          ) : !url ? (
            <div className="h-full flex items-center justify-center text-sm text-zinc-500">
              Loading PDF…
            </div>
          ) : (
            <iframe src={url} title="Bill PDF" className="w-full h-full border-0 bg-white" />
          )}
        </div>
      </div>
    </div>
  );
};

export default BillPdfPreviewModal;