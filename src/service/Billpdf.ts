// service/billPdf.ts
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import type { Bill } from "../utils/types/Types";

/** Renders the A4 bill element to a PDF Blob (multi-page safe). */
export const buildBillPdf = async (el: HTMLElement): Promise<Blob> => {
  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
  });
  const img = canvas.toDataURL("image/jpeg", 0.95);

  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const imgH = (canvas.height * pageW) / canvas.width;

  pdf.addImage(img, "JPEG", 0, 0, pageW, imgH);
  let left = imgH - pageH;
  let y = 0;
  while (left > 1) {
    y -= pageH;
    pdf.addPage();
    pdf.addImage(img, "JPEG", 0, y, pageW, imgH);
    left -= pageH;
  }
  return pdf.output("blob");
};

/** Triggers a browser download for a Blob. */
export const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/** Opens the browser print dialog for a PDF Blob (no new tab). */
export const printBlob = (blob: Blob) => {
  const url = URL.createObjectURL(blob);
  const iframe = document.createElement("iframe");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  iframe.src = url;
  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 300);
    setTimeout(() => {
      iframe.remove();
      URL.revokeObjectURL(url);
    }, 120000);
  };
  document.body.appendChild(iframe);
};

export const pdfFileName = (bill: Bill) =>
  `${bill.docType === "invoice" ? "Invoice" : "Receipt"}_${bill.billNo}.pdf`;
