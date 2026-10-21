/* Currency config + helpers shared by AddBillModal and BillPreview.
   Place next to BillPreview.tsx (…/Bills/currency.ts). */

export type CurrencyCode = "INR" | "SAR" | "AED" | "USD" | "QAR" | "KWD";

interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
  label: string; // for dropdowns
  major: string; // plural major unit, used in "amount in words"
  minor: string; // plural minor unit
  decimals: number; // KWD uses 3 (fils), the rest use 2
  locale: string; // number grouping
  system: "indian" | "international"; // Lakh/Crore vs Thousand/Million
}

export const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  INR: { code: "INR", symbol: "₹", label: "Indian Rupee", major: "Rupees", minor: "Paise", decimals: 2, locale: "en-IN", system: "indian" },
  SAR: { code: "SAR", symbol: "ر.س", label: "Saudi Riyal", major: "Saudi Riyals", minor: "Halalas", decimals: 2, locale: "en-US", system: "international" },
  AED: { code: "AED", symbol: "د.إ", label: "UAE Dirham", major: "UAE Dirhams", minor: "Fils", decimals: 2, locale: "en-US", system: "international" },
  USD: { code: "USD", symbol: "$", label: "US Dollar", major: "US Dollars", minor: "Cents", decimals: 2, locale: "en-US", system: "international" },
  QAR: { code: "QAR", symbol: "ر.ق", label: "Qatari Riyal", major: "Qatari Riyals", minor: "Dirhams", decimals: 2, locale: "en-US", system: "international" },
  KWD: { code: "KWD", symbol: "د.ك", label: "Kuwaiti Dinar", major: "Kuwaiti Dinars", minor: "Fils", decimals: 3, locale: "en-US", system: "international" },
};

export const CURRENCY_CODES = Object.keys(CURRENCIES) as CurrencyCode[];

/** Falls back to INR so bills saved before multi-currency still render. */
export const getCurrency = (code?: string): CurrencyInfo =>
  CURRENCIES[code as CurrencyCode] ?? CURRENCIES.INR;

/** 1234.5 -> "1,234.50" (or "1,234.500" for KWD) */
export const formatAmount = (n: number, code?: string): string => {
  const c = getCurrency(code);
  return (isFinite(n) ? n : 0).toLocaleString(c.locale, {
    minimumFractionDigits: c.decimals,
    maximumFractionDigits: c.decimals,
  });
};

/** 1234.5 -> "$ 1,234.50" */
export const formatMoney = (n: number, code?: string): string =>
  `${getCurrency(code).symbol} ${formatAmount(n, code)}`;

/* ---------------- amount in words ---------------- */

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

const below100 = (n: number) =>
  n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? " " + ONES[n % 10] : "");

const below1000 = (n: number) =>
  n >= 100
    ? ONES[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + below100(n % 100) : "")
    : below100(n);

const SCALES: Record<"indian" | "international", [number, string][]> = {
  indian: [[10_000_000, "Crore"], [100_000, "Lakh"], [1_000, "Thousand"]],
  international: [[1_000_000_000, "Billion"], [1_000_000, "Million"], [1_000, "Thousand"]],
};

const spell = (n: number, system: "indian" | "international"): string => {
  if (n === 0) return "Zero";
  const parts: string[] = [];
  let rest = n;
  for (const [value, label] of SCALES[system]) {
    const q = Math.floor(rest / value);
    if (q) {
      parts.push(`${spell(q, system)} ${label}`);
      rest %= value;
    }
  }
  if (rest) parts.push(below1000(rest));
  return parts.join(" ");
};

/** 1250.5, "USD" -> "One Thousand Two Hundred Fifty US Dollars and Fifty Cents Only" */
export const numToWords = (amount: number, code?: string): string => {
  const c = getCurrency(code);
  const value = isFinite(amount) ? amount : 0;
  const factor = 10 ** c.decimals;
  const total = Math.round(Math.abs(value) * factor); // integer minor units, avoids float drift
  const whole = Math.floor(total / factor);
  const minor = total % factor;

  let out = `${value < 0 && total ? "Minus " : ""}${spell(whole, c.system)} ${c.major}`;
  if (minor) out += ` and ${spell(minor, c.system)} ${c.minor}`;
  return out + " Only";
};