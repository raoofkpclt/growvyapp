import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

/**
 * Captures a DOM element (the A4 bill) and saves it as an A4 PDF.
 * Handles content taller than one page by splitting across pages.
 */
export const downloadBillPdf = async (element: HTMLElement, fileName: string) => {
  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
  });

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  const imgW = pageW;
  const imgH = (canvas.height * imgW) / canvas.width;
  const img = canvas.toDataURL("image/png");

  let heightLeft = imgH;
  let y = 0;

  pdf.addImage(img, "PNG", 0, y, imgW, imgH);
  heightLeft -= pageH;

  while (heightLeft > 0) {
    y -= pageH;
    pdf.addPage();
    pdf.addImage(img, "PNG", 0, y, imgW, imgH);
    heightLeft -= pageH;
  }

  pdf.save(`${fileName.replace(/[^\w.-]+/g, "_")}.pdf`);
};
