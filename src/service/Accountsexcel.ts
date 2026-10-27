import * as XLSX from "xlsx";
import type { AccountCategory, AccountTransaction } from "../utils/types/Types";
import { REGIONS } from "../service/Accounts";
import type { TxnWithBalance } from "../service/Accounts";

type NewTxn = Omit<AccountTransaction, "id" | "firestoreId">;

const pad = (n: number) => String(n).padStart(2, "0");

// Excel date cell (serial number) / Date / text -> "YYYY-MM-DD"
const toIsoDate = (v: unknown): string => {
  if (v instanceof Date) return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`;
  if (typeof v === "number") return new Date(Math.round((v - 25569) * 86400000)).toISOString().slice(0, 10);
  if (typeof v === "string" && v.trim()) {
    const s = v.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const d = new Date(s);
    if (!isNaN(d.getTime())) return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  return "";
};

const toNum = (v: unknown) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
};

const toText = (v: unknown) => String(v ?? "").trim();

/**
 * Reads the "Transactions" sheet of the accounts workbook.
 * Columns: A Date, B Voucher No., C Description, D Category, E Client/Service Category,
 * F Region, G Payment Mode, H Income, I Expense (J-L are formulas and are ignored).
 */
export const parseTransactionsXlsx = async (file: File, chart: AccountCategory[]) => {
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const ws = wb.Sheets["Transactions"] ?? wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null });

  const headerIdx = data.findIndex((r) => toText(r[0]).toLowerCase() === "date");
  const start = headerIdx >= 0 ? headerIdx + 1 : 4;

  const known = new Set(chart.map((c) => c.name));
  const unknownCategories = new Set<string>();
  const base = Date.now();
  const rows: NewTxn[] = [];
  let skipped = 0;

  data.slice(start).forEach((r) => {
    if (!r.some((v) => v !== null && v !== "")) return; // fully empty row

    const date = toIsoDate(r[0]);
    const income = toNum(r[7]);
    const expense = toNum(r[8]);
    if (!date || (income === 0 && expense === 0)) {
      skipped++;
      return;
    }

    const category = toText(r[3]);
    if (category && !known.has(category)) unknownCategories.add(category);
    const region = toText(r[5]).toLowerCase();

    rows.push({
      date,
      voucherNo: toText(r[1]),
      description: toText(r[2]),
      category,
      serviceCategory: toText(r[4]) || "Other / Not Applicable",
      region: REGIONS.find((x) => x.toLowerCase() === region) ?? "India",
      paymentMode: toText(r[6]) || "Bank Transfer",
      income,
      expense,
      createdAt: base + rows.length, // keeps the sheet order for rows on the same date
    });
  });

  return { rows, skipped, unknownCategories: [...unknownCategories] };
};

/** Writes the cash book in the same column layout as the Excel template. */
export const exportTransactionsXlsx = (rows: TxnWithBalance[], chart: AccountCategory[], fileName: string) => {
  const byName = new Map(chart.map((c) => [c.name, c]));
  const data: (string | number)[][] = [
    [
      "Date",
      "Voucher No.",
      "Description",
      "Category",
      "Client / Service Category",
      "Region",
      "Payment Mode",
      "Income",
      "Expense",
      "Balance",
      "Major Head",
      "Account Type",
    ],
    ...rows.map((t) => [
      t.date,
      t.voucherNo,
      t.description,
      t.category,
      t.serviceCategory,
      t.region,
      t.paymentMode,
      t.income || "",
      t.expense || "",
      t.balance,
      byName.get(t.category)?.majorHead ?? "",
      byName.get(t.category)?.type ?? "",
    ]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Transactions");
  XLSX.writeFile(wb, fileName);
};