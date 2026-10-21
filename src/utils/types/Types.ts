// ─── Types ───────────────────────────────────────────────────────────────────
export interface Client {
  firestoreId?: string;
  id: string;
  name: string;
  description: string;
  profileImage: string;
  portfolioImage: string;
  email: string;
  phone:string;
  status: "active" | "inactive";
  joinedDate: string;
}

export interface Creative {
  id: string;
  clientId: string;
  type: "poster" | "reel" | "website";
  title: string;

  imageUrl?: string;      // poster
  videoUrl?: string;
  thumbnailUrl?: string;  // reel
  logoUrl?: string;       // website

  instagramUrl?: string;
  websiteUrl?: string;

  uploadedAt: string;
}




export type BillDocType = "invoice" | "receipt";
export type BillStatus = "paid" | "pending" | "overdue";

export interface BillItem {
  id: string;
  description: string;
  qty: number;
  rate: number;
}

export interface Bill {
  firestoreId?: string;
  id: string;
  billNo: string;
  docType: BillDocType;
  clientName: string;
  service: string;
  date: string;
  status: BillStatus;
  amount: number;
  createdAt: number;

  // invoice-only
  dueDate?: string;
  invoiceKind?: "Advance" | "Balance" | "Full Payment";
  items?: BillItem[];
  discount?: number;
  gstPercent?: number;
  advanceReceived?: number;

  // receipt-only
  paymentMode?: string;
  receivedTowards?: "Advance" | "Balance Payment" | "Full Payment";
  againstInvoiceNo?: string;

  currency?: "INR" | "SAR" | "AED" | "USD" | "QAR" | "KWD";

  // optional extras, only if you want them stored with the bill
  clientAddress?: string;
  clientPhone?: string;
  projectRef?: string;
  pdfKey?: string;
  pdfUrl?: string;
}