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

// billing period for invoices: one-time (none), a whole month, or a custom date range
export type BillingPeriodType = "none" | "monthly" | "custom";

export interface BillingPeriod {
  type: "monthly" | "custom";
  from: string;   // YYYY-MM-DD
  to: string;     // YYYY-MM-DD
  label: string;  // "October 2026" or "01 Oct 2026 – 31 Dec 2026"
}

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
  billingPeriod?: BillingPeriod; // monthly / custom invoices only

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



export type MajorHead = "Assets" | "Liabilities" | "Equity" | "Income" | "Expenses";
export type AccountRegion = "India" | "Saudi Arabia";
 
// One row of the "Chart of Accounts" sheet
export interface AccountCategory {
  firestoreId?: string;
  id: string;
  code: string; // CA01, EX05 ...
  name: string;
  majorHead: MajorHead;
  type: string; // Current Asset, Fixed Asset, Expense ...
  notes: string;
}
 
// One row of the "Transactions" (cash book) sheet
export interface AccountTransaction {
  firestoreId?: string;
  id: string;
  date: string; // YYYY-MM-DD
  voucherNo: string;
  description: string;
  category: string; // category name from the chart of accounts
  serviceCategory: string; // "Client / Service Category" column
  region: AccountRegion;
  paymentMode: string;
  income: number;
  expense: number;
  createdAt: number;
}
 
// "Balance Sheet" sheet: manual balances keyed by category code
export interface BalanceSheetData {
  asOf: string; // YYYY-MM-DD
  values: Record<string, number>;
}
 