import type { AccountCategory, AccountRegion, AccountTransaction, MajorHead } from "./types/Types";

/* ---------- dropdown lists (same as the Excel validations) ---------- */
export const REGIONS: AccountRegion[] = ["India", "Saudi Arabia"];
export const PAYMENT_MODES = ["Cash", "Bank Transfer", "Bank", "Cheque", "Card", "UPI", "Other"];
export const SERVICE_CATEGORIES = [
  "SEO",
  "Social Media Management",
  "PPC / Ad Management",
  "Content Creation",
  "Web Design & Development",
  "Branding & Strategy",
  "Video Production",
  "Other / Not Applicable",
];

export const MAJOR_HEADS: MajorHead[] = ["Assets", "Liabilities", "Equity", "Income", "Expenses"];
export const HEAD_TYPES: Record<MajorHead, string[]> = {
  Assets: ["Current Asset", "Fixed Asset"],
  Liabilities: ["Current Liability", "Long-term Liability"],
  Equity: ["Capital/Equity"],
  Income: ["Income"],
  Expenses: ["Expense"],
};
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// The workbook has no currency; amounts are shown in INR.
export const ACCOUNTS_CURRENCY = "INR" as const;

export type NewCategory = Omit<AccountCategory, "id" | "firestoreId">;

/* ---------- default Chart of Accounts (copied from the Excel sheet) ---------- */
export const DEFAULT_CHART: NewCategory[] = [
  { code: "CA01", name: "Cash in Hand", majorHead: "Assets", type: "Current Asset", notes: "Petty cash on hand" },
  { code: "CA02", name: "Bank Balance", majorHead: "Assets", type: "Current Asset", notes: "Current/savings account balance" },
  { code: "CA03", name: "Accounts Receivable (Trade Debtors)", majorHead: "Assets", type: "Current Asset", notes: "Amounts owed by clients" },
  { code: "CA04", name: "Prepaid Expenses", majorHead: "Assets", type: "Current Asset", notes: "Expenses paid in advance (rent, subscriptions)" },
  { code: "CA05", name: "Advance to Suppliers / Vendors", majorHead: "Assets", type: "Current Asset", notes: "Advances paid to freelancers/vendors" },
  { code: "CA06", name: "GST / Input Tax Credit Receivable", majorHead: "Assets", type: "Current Asset", notes: "Input tax credit recoverable" },
  { code: "CA07", name: "Short-term Investments", majorHead: "Assets", type: "Current Asset", notes: "Fixed deposits, liquid funds etc." },
  { code: "FA01", name: "Computers & Equipment", majorHead: "Assets", type: "Fixed Asset", notes: "Laptops, servers, peripherals" },
  { code: "FA02", name: "Furniture & Fixtures", majorHead: "Assets", type: "Fixed Asset", notes: "Office furniture" },
  { code: "FA03", name: "Office Equipment", majorHead: "Assets", type: "Fixed Asset", notes: "Printers, cameras, other equipment" },
  { code: "FA04", name: "Software (Capitalized)", majorHead: "Assets", type: "Fixed Asset", notes: "Software licenses capitalised, not expensed" },
  { code: "FA05", name: "Vehicles", majorHead: "Assets", type: "Fixed Asset", notes: "Company-owned vehicles" },
  { code: "FA06", name: "Accumulated Depreciation", majorHead: "Assets", type: "Fixed Asset", notes: "Contra-asset: accumulated depreciation on fixed assets" },
  { code: "CL01", name: "Accounts Payable (Trade Creditors)", majorHead: "Liabilities", type: "Current Liability", notes: "Amounts owed to vendors/freelancers" },
  { code: "CL02", name: "Accrued Expenses Payable", majorHead: "Liabilities", type: "Current Liability", notes: "Expenses incurred but not yet paid" },
  { code: "CL03", name: "GST / Output Tax Payable", majorHead: "Liabilities", type: "Current Liability", notes: "Output tax collected, payable to authorities" },
  { code: "CL04", name: "TDS Payable", majorHead: "Liabilities", type: "Current Liability", notes: "Tax deducted at source, payable" },
  { code: "CL05", name: "Short-term Loans", majorHead: "Liabilities", type: "Current Liability", notes: "Loans/overdraft repayable within a year" },
  { code: "CL06", name: "Advance from Clients (Unearned Revenue)", majorHead: "Liabilities", type: "Current Liability", notes: "Client payments received before work is done" },
  { code: "LL01", name: "Long-term Loans", majorHead: "Liabilities", type: "Long-term Liability", notes: "Loans repayable beyond a year" },
  { code: "LL02", name: "Lease Liabilities", majorHead: "Liabilities", type: "Long-term Liability", notes: "Long-term lease obligations" },
  { code: "EQ01", name: "Owner's Capital Introduced", majorHead: "Equity", type: "Capital/Equity", notes: "Capital brought in by owner(s)/partners" },
  { code: "EQ02", name: "Owner's Drawings", majorHead: "Equity", type: "Capital/Equity", notes: "Withdrawals by owner(s) for personal use" },
  { code: "EQ03", name: "Retained Earnings", majorHead: "Equity", type: "Capital/Equity", notes: "Accumulated profits retained in the business" },
  { code: "IN01", name: "SEO Services Income", majorHead: "Income", type: "Income", notes: "Retainer/project revenue from SEO work" },
  { code: "IN02", name: "Social Media Management Income", majorHead: "Income", type: "Income", notes: "Revenue from social media retainers" },
  { code: "IN03", name: "PPC / Ad Management Income", majorHead: "Income", type: "Income", notes: "Fees for managing paid ad campaigns (Google, Meta, etc.)" },
  { code: "IN04", name: "Content Creation Income", majorHead: "Income", type: "Income", notes: "Revenue from content writing, video, design" },
  { code: "IN05", name: "Web Design & Development Income", majorHead: "Income", type: "Income", notes: "Revenue from website/landing page builds" },
  { code: "IN06", name: "Branding & Strategy Income", majorHead: "Income", type: "Income", notes: "Revenue from branding/strategy consulting" },
  { code: "IN07", name: "Video Production Income", majorHead: "Income", type: "Income", notes: "Revenue from video shoots, editing, production projects" },
  { code: "IN08", name: "Retainer Income - Other", majorHead: "Income", type: "Income", notes: "Other recurring client retainers" },
  { code: "IN09", name: "Affiliate / Commission Income", majorHead: "Income", type: "Income", notes: "Affiliate or referral commissions earned" },
  { code: "IN10", name: "Interest Income", majorHead: "Income", type: "Income", notes: "Bank / investment interest" },
  { code: "IN11", name: "Other Income", majorHead: "Income", type: "Income", notes: "Miscellaneous income" },
  { code: "EX01", name: "Ad Spend (Client Pass-through)", majorHead: "Expenses", type: "Expense", notes: "Client ad budget paid to platforms (Google, Meta, LinkedIn, etc.)" },
  { code: "EX02", name: "Software & Tools Subscriptions", majorHead: "Expenses", type: "Expense", notes: "SEO, analytics, design, scheduling, project mgmt tools" },
  { code: "EX03", name: "Salaries & Wages", majorHead: "Expenses", type: "Expense", notes: "In-house staff payroll" },
  { code: "EX04", name: "Freelancer / Contractor Fees", majorHead: "Expenses", type: "Expense", notes: "Outsourced writers, designers, developers" },
  { code: "EX05", name: "Office Rent", majorHead: "Expenses", type: "Expense", notes: "Office space rent" },
  { code: "EX06", name: "Utilities & Internet", majorHead: "Expenses", type: "Expense", notes: "Electricity, internet, phone" },
  { code: "EX07", name: "Office Supplies", majorHead: "Expenses", type: "Expense", notes: "Stationery, consumables" },
  { code: "EX08", name: "Marketing & Business Development", majorHead: "Expenses", type: "Expense", notes: "Promoting the agency's own services" },
  { code: "EX09", name: "Stock Media / Licensing", majorHead: "Expenses", type: "Expense", notes: "Stock photos, fonts, music, templates" },
  { code: "EX10", name: "Video & Photography Equipment Rental", majorHead: "Expenses", type: "Expense", notes: "Camera, lighting, drone, studio rental for shoots" },
  { code: "EX11", name: "Video Production Crew & Talent Fees", majorHead: "Expenses", type: "Expense", notes: "Videographers, editors, actors, voiceover artists" },
  { code: "EX12", name: "Travel & Conveyance", majorHead: "Expenses", type: "Expense", notes: "Client visits, travel expenses" },
  { code: "EX13", name: "Insurance", majorHead: "Expenses", type: "Expense", notes: "Business/professional indemnity insurance" },
  { code: "EX14", name: "Bank Charges & Payment Gateway Fees", majorHead: "Expenses", type: "Expense", notes: "Bank fees, Stripe/PayPal/Razorpay charges" },
  { code: "EX15", name: "Professional Fees", majorHead: "Expenses", type: "Expense", notes: "Legal, accounting, consulting" },
  { code: "EX16", name: "Training & Certifications", majorHead: "Expenses", type: "Expense", notes: "Courses, certifications for the team" },
  { code: "EX17", name: "Equipment & Repairs", majorHead: "Expenses", type: "Expense", notes: "Laptops, equipment upkeep" },
  { code: "EX18", name: "Miscellaneous Expense", majorHead: "Expenses", type: "Expense", notes: "Anything not listed above" },
];

/* ---------- date helpers ---------- */
const pad = (n: number) => String(n).padStart(2, "0");

/** Date -> "YYYY-MM-DD" using local time (no UTC shift) */
export const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const fmtDate = (iso: string) => {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  return isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

/** "2026-09" -> "Sep 2026" */
export const fmtMonth = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
};

/* ---------- chart helpers ---------- */
export const sortChart = (chart: AccountCategory[]) =>
  [...chart].sort(
    (a, b) =>
      MAJOR_HEADS.indexOf(a.majorHead) - MAJOR_HEADS.indexOf(b.majorHead) || a.code.localeCompare(b.code),
  );

/* ---------- transactions: cash book ---------- */
export type TxnWithBalance = AccountTransaction & { balance: number };

export const sortAsc = (txns: AccountTransaction[]) =>
  [...txns].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);

/** Same as the Excel "Balance" column: running total of Income - Expense */
export const withRunningBalance = (txns: AccountTransaction[]): TxnWithBalance[] => {
  let bal = 0;
  return sortAsc(txns).map((t) => {
    bal += t.income - t.expense;
    return { ...t, balance: bal };
  });
};

export const totals = (txns: AccountTransaction[]) => {
  const income = txns.reduce((s, t) => s + t.income, 0);
  const expense = txns.reduce((s, t) => s + t.expense, 0);
  return { income, expense, net: income - expense };
};

/** Used to skip rows that were already imported */
export const txnKey = (t: { date: string; description: string; income: number; expense: number }) =>
  `${t.date}|${t.description.trim().toLowerCase()}|${t.income}|${t.expense}`;

const sum = (a: number[]) => a.reduce((s, n) => s + n, 0);

/* ---------- Monthly Summary sheet ---------- */
export interface CategoryRow {
  category: string;
  code: string;
  months: number[];
  total: number;
}
export interface MonthlySummary {
  income: CategoryRow[];
  expense: CategoryRow[];
  incomeByMonth: number[];
  expenseByMonth: number[];
  netByMonth: number[];
}

export const monthlySummary = (
  txns: AccountTransaction[],
  chart: AccountCategory[],
  year: number,
): MonthlySummary => {
  const prefix = `${year}-`;
  const build = (head: MajorHead, field: "income" | "expense"): CategoryRow[] =>
    chart
      .filter((c) => c.majorHead === head)
      .map((c) => {
        const months = Array<number>(12).fill(0);
        for (const t of txns) {
          if (t.category !== c.name || !t.date.startsWith(prefix)) continue;
          months[Number(t.date.slice(5, 7)) - 1] += t[field];
        }
        return { category: c.name, code: c.code, months, total: sum(months) };
      });

  const income = build("Income", "income");
  const expense = build("Expenses", "expense");
  const byMonth = (rows: CategoryRow[]) => MONTHS.map((_, i) => sum(rows.map((r) => r.months[i])));
  const incomeByMonth = byMonth(income);
  const expenseByMonth = byMonth(expense);
  return {
    income,
    expense,
    incomeByMonth,
    expenseByMonth,
    netByMonth: incomeByMonth.map((v, i) => v - expenseByMonth[i]),
  };
};

/* ---------- Income & Expense Statement (P&L) sheet ---------- */
export interface StatementLine {
  category: string;
  code: string;
  amount: number;
}
export interface Statement {
  income: StatementLine[];
  expense: StatementLine[];
  totalIncome: number;
  totalExpense: number;
  net: number;
  /** cash in / out in the period for Asset, Liability & Equity entries (not part of the P&L) */
  otherIn: number;
  otherOut: number;
}

export const periodStatement = (
  txns: AccountTransaction[],
  chart: AccountCategory[],
  from: string,
  to: string,
): Statement => {
  const inRange = txns.filter((t) => t.date >= from && t.date <= to);
  const headOf = new Map(chart.map((c) => [c.name, c.majorHead]));
  const lines = (head: MajorHead, field: "income" | "expense"): StatementLine[] =>
    chart
      .filter((c) => c.majorHead === head)
      .map((c) => ({
        category: c.name,
        code: c.code,
        amount: inRange.filter((t) => t.category === c.name).reduce((s, t) => s + t[field], 0),
      }));

  const income = lines("Income", "income");
  const expense = lines("Expenses", "expense");
  const totalIncome = sum(income.map((l) => l.amount));
  const totalExpense = sum(expense.map((l) => l.amount));
  const other = inRange.filter((t) => {
    const h = headOf.get(t.category);
    return h !== "Income" && h !== "Expenses";
  });

  return {
    income,
    expense,
    totalIncome,
    totalExpense,
    net: totalIncome - totalExpense,
    otherIn: sum(other.map((t) => t.income)),
    otherOut: sum(other.map((t) => t.expense)),
  };
};

/** Income / expense split by Region or Client-Service category (P&L categories only) */
export interface BreakdownRow {
  label: string;
  income: number;
  expense: number;
  net: number;
}

export const breakdownBy = (
  txns: AccountTransaction[],
  chart: AccountCategory[],
  from: string,
  to: string,
  key: "region" | "serviceCategory",
): BreakdownRow[] => {
  const headOf = new Map(chart.map((c) => [c.name, c.majorHead]));
  const map = new Map<string, { income: number; expense: number }>();
  for (const t of txns) {
    if (t.date < from || t.date > to) continue;
    const h = headOf.get(t.category);
    const income = h === "Income" ? t.income : 0;
    const expense = h === "Expenses" ? t.expense : 0;
    if (!income && !expense) continue;
    const cur = map.get(t[key]) ?? { income: 0, expense: 0 };
    map.set(t[key], { income: cur.income + income, expense: cur.expense + expense });
  }
  return [...map.entries()]
    .map(([label, v]) => ({ label, income: v.income, expense: v.expense, net: v.income - v.expense }))
    .sort((a, b) => b.income - a.income);
};

/* ---------- Balance Sheet sheet ---------- */
export const balanceTotals = (chart: AccountCategory[], values: Record<string, number>) => {
  const val = (c: AccountCategory) => values[c.code] || 0;
  const assets = sum(chart.filter((c) => c.majorHead === "Assets").map(val));
  const liabilitiesEquity = sum(
    chart.filter((c) => c.majorHead === "Liabilities" || c.majorHead === "Equity").map(val),
  );
  return { assets, liabilitiesEquity, diff: assets - liabilitiesEquity };
};