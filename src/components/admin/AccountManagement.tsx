import React, { useEffect, useMemo, useRef, useState } from "react";
import type {
  AccountCategory,
  AccountTransaction,
  BalanceSheetData,
  MajorHead,
} from "../../utils/types/Types";
import TransactionModal from "./Modal/Transactionmodal";
import DeleteConfirmModal from "./Modal/DeleteConfirmModal";
import {
  addCategory,
  bulkAddTransactions,
  deleteCategory,
  deleteTransaction,
  getBalanceSheet,
  getChartOfAccounts,
  getTransactions,
  saveBalanceSheet,
  seedDefaultChart,
} from "../../service/Accountservice";
import {
  ACCOUNTS_CURRENCY,
  HEAD_TYPES,
  MAJOR_HEADS,
  MONTHS,
  REGIONS,
  balanceTotals,
  breakdownBy,
  fmtDate,
  fmtMonth,
  monthlySummary,
  periodStatement,
  sortChart,
  toIso,
  totals,
  txnKey,
  withRunningBalance,
} from "../../service/Accounts";
import type { BreakdownRow } from "../../service/Accounts";
import { exportTransactionsXlsx, parseTransactionsXlsx } from "../../service/Accountsexcel";
import { formatAmount, formatMoney } from "../../utils/currency";

/* ---------- shared bits ---------- */
type Tab = "cashbook" | "summary" | "statement" | "balance" | "chart";
const TABS: { id: Tab; label: string }[] = [
  { id: "cashbook", label: "Cash Book" },
  { id: "summary", label: "Monthly Summary" },
  { id: "statement", label: "Income & Expense" },
  { id: "balance", label: "Balance Sheet" },
  { id: "chart", label: "Chart of Accounts" },
];

const money = (n: number) => formatMoney(n, ACCOUNTS_CURRENCY);
const amt = (n: number) => (n === 0 ? "—" : formatAmount(n, ACCOUNTS_CURRENCY));

const card = "bg-[#0f1117] border border-white/5 rounded-2xl";
const inputCls =
  "bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/60 transition-colors";
const btnGhost =
  "text-xs px-3 py-1.5 rounded-lg border border-white/10 text-zinc-300 hover:text-white hover:border-white/20 disabled:opacity-40 transition-colors";
const btnPrimary =
  "flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors";
const th = "px-3 py-2.5 text-left text-[10px] uppercase tracking-wider text-zinc-500 font-medium whitespace-nowrap";
const thR = th + " text-right";
const td = "px-3 py-2.5 text-xs text-zinc-300 whitespace-nowrap";
const tdR = td + " text-right font-mono";

const StatCard: React.FC<{ label: string; value: string; tone?: "green" | "red" | "violet" }> = ({
  label,
  value,
  tone = "violet",
}) => (
  <div className={`${card} px-5 py-4`}>
    <p className="text-[11px] uppercase tracking-wider text-zinc-500 mb-1">{label}</p>
    <p
      className={`text-xl font-bold ${
        tone === "green" ? "text-emerald-400" : tone === "red" ? "text-red-400" : "text-white"
      }`}
    >
      {value}
    </p>
  </div>
);

/* =====================================================================
   Page
   ===================================================================== */
const AccountsManagement: React.FC = () => {
  const [tab, setTab] = useState<Tab>("cashbook");
  const [txns, setTxns] = useState<AccountTransaction[]>([]);
  const [chart, setChart] = useState<AccountCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [t, c] = await Promise.all([getTransactions(), getChartOfAccounts()]);
        setTxns(t);
        setChart(c);
      } catch (e) {
        console.log(e);
        setError("Could not load accounts data.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSeed = async () => {
    try {
      setSeeding(true);
      setChart(await seedDefaultChart());
    } catch (e) {
      console.log(e);
      setError("Could not load the default chart of accounts.");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex gap-2 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
              tab === t.id
                ? "bg-violet-600 text-white border-violet-500"
                : "border-white/10 text-zinc-400 hover:text-white hover:border-white/20"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
          <span>{error}</span>
          <button onClick={() => setError("")} className="text-red-300/70 hover:text-red-200 text-base leading-none">
            ×
          </button>
        </div>
      )}

      {!loading && chart.length === 0 && (
        <div className={`${card} p-5 flex items-center justify-between gap-4 flex-wrap`}>
          <p className="text-sm text-zinc-300">
            No chart of accounts yet. Load the {`53`} default categories from your Excel sheet to get started.
          </p>
          <button onClick={handleSeed} disabled={seeding} className={btnPrimary}>
            {seeding ? "Loading..." : "Load default chart"}
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-center text-sm text-zinc-500 py-10">Loading accounts…</p>
      ) : (
        <>
          {tab === "cashbook" && <CashBookTab txns={txns} setTxns={setTxns} chart={chart} />}
          {tab === "summary" && <MonthlySummaryTab txns={txns} chart={chart} />}
          {tab === "statement" && <StatementTab txns={txns} chart={chart} />}
          {tab === "balance" && <BalanceSheetTab txns={txns} chart={chart} />}
          {tab === "chart" && <ChartTab txns={txns} chart={chart} setChart={setChart} />}
        </>
      )}
    </div>
  );
};

/* =====================================================================
   1. Cash Book  (Transactions sheet)
   ===================================================================== */
const PAGE_SIZE = 50;

const CashBookTab: React.FC<{
  txns: AccountTransaction[];
  setTxns: React.Dispatch<React.SetStateAction<AccountTransaction[]>>;
  chart: AccountCategory[];
}> = ({ txns, setTxns, chart }) => {
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState("all");
  const [region, setRegion] = useState("all");
  const [flow, setFlow] = useState<"all" | "income" | "expense">("all");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<AccountTransaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AccountTransaction | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);


  useLockBodyScroll(adding || !!editing || !!deleteTarget);

  const byName = useMemo(() => new Map(chart.map((c) => [c.name, c])), [chart]);
  const rows = useMemo(() => withRunningBalance(txns), [txns]); // oldest -> newest, with running balance
  const months = useMemo(
    () => [...new Set(txns.map((t) => t.date.slice(0, 7)))].filter(Boolean).sort().reverse(),
    [txns],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((t) => {
        if (month !== "all" && !t.date.startsWith(month)) return false;
        if (region !== "all" && t.region !== region) return false;
        if (flow === "income" && t.income <= 0) return false;
        if (flow === "expense" && t.expense <= 0) return false;
        if (
          q &&
          !t.description.toLowerCase().includes(q) &&
          !t.category.toLowerCase().includes(q) &&
          !t.voucherNo.toLowerCase().includes(q)
        )
          return false;
        return true;
      })
      .reverse(); // newest first
  }, [rows, search, month, region, flow]);

  const tot = totals(filtered);

  /* ---------- pagination (50 per page) ---------- */
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(startIdx, startIdx + PAGE_SIZE);

  // go back to page 1 whenever a filter changes
  useEffect(() => {
    setPage(1);
  }, [search, month, region, flow]);

  // compact page list: 1 … 4 5 6 … 20
  const pageNumbers = useMemo(() => {
    const pages: (number | "...")[] = [];
    for (let p = 1; p <= totalPages; p++) {
      if (p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1) {
        pages.push(p);
      } else if (pages[pages.length - 1] !== "...") {
        pages.push("...");
      }
    }
    return pages;
  }, [totalPages, currentPage]);

  const goTo = (p: number) => {
    setPage(Math.min(Math.max(1, p), totalPages));
    tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleDelete = async () => {
    if (!deleteTarget?.firestoreId) return;
    try {
      setDeleting(true);
      await deleteTransaction(deleteTarget.firestoreId);
      setTxns((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e) {
      console.log(e);
    } finally {
      setDeleting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setImporting(true);
      setMessage("");
      const parsed = await parseTransactionsXlsx(file, chart);

      // skip rows that are already saved (same date + description + amounts)
      const existing = new Map<string, number>();
      txns.forEach((t) => existing.set(txnKey(t), (existing.get(txnKey(t)) ?? 0) + 1));
      const fresh = parsed.rows.filter((r) => {
        const k = txnKey(r);
        const n = existing.get(k) ?? 0;
        if (n > 0) {
          existing.set(k, n - 1);
          return false;
        }
        return true;
      });

      if (fresh.length === 0) {
        setMessage(`Nothing new to import. ${parsed.rows.length} rows are already saved.`);
        return;
      }
      const alreadySaved = parsed.rows.length - fresh.length;
      const note = parsed.unknownCategories.length
        ? `\n\nCategories not in your chart: ${parsed.unknownCategories.join(", ")}`
        : "";
      if (
        !window.confirm(
          `Import ${fresh.length} new transactions?\n(${alreadySaved} already saved, ${parsed.skipped} empty rows skipped)${note}`,
        )
      )
        return;

      const created = await bulkAddTransactions(fresh);
      setTxns((prev) => [...prev, ...created]);
      setMessage(`Imported ${created.length} transactions.`);
    } catch (err) {
      console.log(err);
      setMessage("Could not read that file. Use the Accounts workbook (.xlsx) with the Transactions sheet.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search description, category, voucher…"
            className={`${inputCls} w-64`}
          />
          <select className={inputCls} value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="all" className="bg-[#0f1117]">All months</option>
            {months.map((m) => (
              <option key={m} value={m} className="bg-[#0f1117]">{fmtMonth(m)}</option>
            ))}
          </select>
          <select className={inputCls} value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="all" className="bg-[#0f1117]">All regions</option>
            {REGIONS.map((r) => (
              <option key={r} value={r} className="bg-[#0f1117]">{r}</option>
            ))}
          </select>
          <select className={inputCls} value={flow} onChange={(e) => setFlow(e.target.value as "all" | "income" | "expense")}>
            <option value="all" className="bg-[#0f1117]">Income &amp; Expense</option>
            <option value="income" className="bg-[#0f1117]">Income only</option>
            <option value="expense" className="bg-[#0f1117]">Expense only</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
          <button className={btnGhost} disabled={importing} onClick={() => fileRef.current?.click()}>
            {importing ? "Importing…" : "Import Excel"}
          </button>
          <button
            className={btnGhost}
            disabled={filtered.length === 0}
            onClick={() => exportTransactionsXlsx([...filtered].reverse(), chart, "Growvy_Transactions.xlsx")}
          >
            Export Excel
          </button>
          <button onClick={() => setAdding(true)} className={btnPrimary}>
            <span className="text-base leading-none">+</span> Add Transaction
          </button>
        </div>
      </div>

      {message && (
        <div className="flex items-center justify-between gap-3 text-xs text-violet-200 bg-violet-500/10 border border-violet-500/20 rounded-xl px-4 py-2.5">
          <span>{message}</span>
          <button onClick={() => setMessage("")} className="text-violet-200/70 hover:text-white text-base leading-none">
            ×
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Income" value={money(tot.income)} tone="green" />
        <StatCard label="Total Expense" value={money(tot.expense)} tone="red" />
        <StatCard label="Net" value={money(tot.net)} tone={tot.net >= 0 ? "green" : "red"} />
      </div>

      <div ref={tableRef} className={`${card} overflow-hidden scroll-mt-4`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-white/5">
              <tr>
                <th className={th}>Date</th>
                <th className={th}>Voucher</th>
                <th className={th}>Description</th>
                <th className={th}>Category</th>
                <th className={th}>Service</th>
                <th className={th}>Region</th>
                <th className={th}>Mode</th>
                <th className={thR}>Income</th>
                <th className={thR}>Expense</th>
                <th className={thR}>Balance</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {pageRows.map((t) => {
                const c = byName.get(t.category);
                return (
                  <tr key={t.id} className="hover:bg-white/[0.02]">
                    <td className={td}>{fmtDate(t.date)}</td>
                    <td className={`${td} font-mono text-zinc-500`}>{t.voucherNo || "—"}</td>
                    <td className={`${td} max-w-[260px] truncate`} title={t.description}>
                      {t.description || "—"}
                    </td>
                    <td className={td}>
                      <div className="text-zinc-200">{t.category || "—"}</div>
                      {c && (
                        <div className="text-[10px] text-zinc-500">
                          {c.majorHead} · {c.type}
                        </div>
                      )}
                    </td>
                    <td className={td}>{t.serviceCategory}</td>
                    <td className={td}>{t.region}</td>
                    <td className={td}>{t.paymentMode}</td>
                    <td className={`${tdR} text-emerald-400`}>{amt(t.income)}</td>
                    <td className={`${tdR} text-red-400`}>{amt(t.expense)}</td>
                    <td className={`${tdR} ${t.balance < 0 ? "text-red-300" : "text-zinc-200"}`}>
                      {formatAmount(t.balance, ACCOUNTS_CURRENCY)}
                    </td>
                    <td className={`${td} text-right`}>
                      <button disabled onClick={() => setEditing(t)} className="text-violet-300 hover:text-violet-200 mr-3">
                        Edit
                      </button>
                      <button disabled onClick={() => setDeleteTarget(t)} className="text-red-400 hover:text-red-300">
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <p className="text-center text-sm text-zinc-600 py-8">No transactions match this view.</p>
        )}

        {filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between gap-3 flex-wrap px-4 py-3 border-t border-white/5">
            <p className="text-xs text-zinc-500">
              Showing {startIdx + 1}–{Math.min(startIdx + PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button className={btnGhost} disabled={currentPage === 1} onClick={() => goTo(1)}>
                «
              </button>
              <button className={btnGhost} disabled={currentPage === 1} onClick={() => goTo(currentPage - 1)}>
                Prev
              </button>

              {pageNumbers.map((p, i) =>
                p === "..." ? (
                  <span key={`dots-${i}`} className="px-1 text-xs text-zinc-600">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => goTo(p)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                      p === currentPage
                        ? "bg-violet-600 text-white border-violet-500"
                        : "border-white/10 text-zinc-300 hover:text-white hover:border-white/20"
                    }`}
                  >
                    {p}
                  </button>
                ),
              )}

              <button
                className={btnGhost}
                disabled={currentPage === totalPages}
                onClick={() => goTo(currentPage + 1)}
              >
                Next
              </button>
              <button className={btnGhost} disabled={currentPage === totalPages} onClick={() => goTo(totalPages)}>
                »
              </button>
            </div>
          </div>
        )}
      </div>

      {adding && (
        <TransactionModal
          chart={chart}
          onClose={() => setAdding(false)}
          onSave={(t) => {
            setTxns((prev) => [...prev, t]);
            setAdding(false);
          }}
        />
      )}
      {editing && (
        <TransactionModal
          transaction={editing}
          chart={chart}
          onClose={() => setEditing(null)}
          onSave={(t) => {
            setTxns((prev) => prev.map((x) => (x.id === t.id ? t : x)));
            setEditing(null);
          }}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmModal loading={deleting} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} />
      )}
    </div>
  );
};

/* =====================================================================
   2. Monthly Summary
   ===================================================================== */
const MonthlySummaryTab: React.FC<{ txns: AccountTransaction[]; chart: AccountCategory[] }> = ({
  txns,
  chart,
}) => {
  const thisYear = new Date().getFullYear();
  const years = useMemo(() => {
    const set = new Set<number>([thisYear]);
    txns.forEach((t) => t.date && set.add(Number(t.date.slice(0, 4))));
    return [...set].sort((a, b) => b - a);
  }, [txns, thisYear]);
  const [year, setYear] = useState(years[0] ?? thisYear);

  const s = useMemo(() => monthlySummary(txns, chart, year), [txns, chart, year]);
  const sumAll = (a: number[]) => a.reduce((x, y) => x + y, 0);

  const sectionRow = (label: string) => (
    <tr className="bg-white/[0.03]">
      <td colSpan={14} className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-orange-300">
        {label}
      </td>
    </tr>
  );

  const totalRow = (label: string, values: number[], tone = "text-white") => (
    <tr className="bg-orange-500/10">
      <td className={`${td} sticky left-0 bg-[#1a1410] font-semibold ${tone}`}>{label}</td>
      {values.map((v, i) => (
        <td key={i} className={`${tdR} font-semibold ${tone}`}>{amt(v)}</td>
      ))}
      <td className={`${tdR} font-semibold ${tone}`}>{amt(sumAll(values))}</td>
    </tr>
  );

  const lines = (rows: typeof s.income) =>
    rows.map((r) => (
      <tr key={r.code} className="hover:bg-white/[0.02]">
        <td className={`${td} sticky left-0 bg-[#0f1117]`}>{r.category}</td>
        {r.months.map((v, i) => (
          <td key={i} className={`${tdR} ${v === 0 ? "text-zinc-600" : ""}`}>{amt(v)}</td>
        ))}
        <td className={`${tdR} text-white`}>{amt(r.total)}</td>
      </tr>
    ));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-xs text-zinc-500">Year</label>
        <select className={inputCls} value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {years.map((y) => (
            <option key={y} value={y} className="bg-[#0f1117]">{y}</option>
          ))}
        </select>
      </div>

      <div className={`${card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-white/5">
              <tr>
                <th className={`${th} sticky left-0 bg-[#0f1117]`}>Category</th>
                {MONTHS.map((m) => (
                  <th key={m} className={thR}>{m}</th>
                ))}
                <th className={thR}>Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sectionRow("Income")}
              {lines(s.income)}
              {totalRow("Total Income", s.incomeByMonth, "text-emerald-300")}
              {sectionRow("Expense")}
              {lines(s.expense)}
              {totalRow("Total Expense", s.expenseByMonth, "text-red-300")}
              {totalRow("Net (Income − Expense)", s.netByMonth)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/* =====================================================================
   3. Income & Expense Statement (P&L)
   ===================================================================== */
const BreakdownTable: React.FC<{ title: string; rows: BreakdownRow[] }> = ({ title, rows }) => (
  <div className={`${card} overflow-hidden`}>
    <p className="px-4 pt-4 pb-2 text-xs font-semibold text-white">{title}</p>
    <table className="w-full">
      <thead className="border-b border-white/5">
        <tr>
          <th className={th}>Name</th>
          <th className={thR}>Income</th>
          <th className={thR}>Expense</th>
          <th className={thR}>Net</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white/5">
        {rows.map((r) => (
          <tr key={r.label}>
            <td className={td}>{r.label}</td>
            <td className={`${tdR} text-emerald-400`}>{amt(r.income)}</td>
            <td className={`${tdR} text-red-400`}>{amt(r.expense)}</td>
            <td className={`${tdR} ${r.net < 0 ? "text-red-300" : "text-zinc-200"}`}>{formatAmount(r.net, ACCOUNTS_CURRENCY)}</td>
          </tr>
        ))}
        {rows.length === 0 && (
          <tr>
            <td colSpan={4} className="text-center text-xs text-zinc-600 py-5">No data in this period.</td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

const StatementTab: React.FC<{ txns: AccountTransaction[]; chart: AccountCategory[] }> = ({ txns, chart }) => {
  const now = new Date();
  const [from, setFrom] = useState(toIso(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [to, setTo] = useState(toIso(new Date(now.getFullYear(), now.getMonth() + 1, 0)));

  const preset = (k: "month" | "last" | "fy") => {
    const y = now.getFullYear();
    const m = now.getMonth();
    if (k === "month") {
      setFrom(toIso(new Date(y, m, 1)));
      setTo(toIso(new Date(y, m + 1, 0)));
    } else if (k === "last") {
      setFrom(toIso(new Date(y, m - 1, 1)));
      setTo(toIso(new Date(y, m, 0)));
    } else {
      const sy = m >= 3 ? y : y - 1; // Indian financial year: Apr - Mar
      setFrom(`${sy}-04-01`);
      setTo(`${sy + 1}-03-31`);
    }
  };

  const st = useMemo(() => periodStatement(txns, chart, from, to), [txns, chart, from, to]);
  const byRegion = useMemo(() => breakdownBy(txns, chart, from, to, "region"), [txns, chart, from, to]);
  const byService = useMemo(() => breakdownBy(txns, chart, from, to, "serviceCategory"), [txns, chart, from, to]);

  const section = (label: string) => (
    <tr className="bg-white/[0.03]">
      <td colSpan={2} className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-orange-300">
        {label}
      </td>
    </tr>
  );
  const totalRow = (label: string, value: number, tone = "text-white") => (
    <tr className="bg-orange-500/10">
      <td className={`${td} px-4 font-semibold ${tone}`}>{label}</td>
      <td className={`${tdR} px-4 font-semibold ${tone}`}>{formatAmount(value, ACCOUNTS_CURRENCY)}</td>
    </tr>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-xs text-zinc-500">From</label>
        <input type="date" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} />
        <label className="text-xs text-zinc-500">To</label>
        <input type="date" className={inputCls} min={from} value={to} onChange={(e) => setTo(e.target.value)} />
        <button className={btnGhost} onClick={() => preset("month")}>This month</button>
        <button className={btnGhost} onClick={() => preset("last")}>Last month</button>
        <button className={btnGhost} onClick={() => preset("fy")}>This FY (Apr–Mar)</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Income" value={money(st.totalIncome)} tone="green" />
        <StatCard label="Total Expense" value={money(st.totalExpense)} tone="red" />
        <StatCard
          label={st.net >= 0 ? "Net Profit" : "Net Loss"}
          value={money(st.net)}
          tone={st.net >= 0 ? "green" : "red"}
        />
      </div>

      <div className={`${card} overflow-hidden`}>
        <table className="w-full">
          <thead className="border-b border-white/5">
            <tr>
              <th className={`${th} px-4`}>Category</th>
              <th className={`${thR} px-4`}>Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {section("Income")}
            {st.income.map((l) => (
              <tr key={l.code}>
                <td className={`${td} px-4`}>{l.category}</td>
                <td className={`${tdR} px-4 ${l.amount === 0 ? "text-zinc-600" : ""}`}>{amt(l.amount)}</td>
              </tr>
            ))}
            {totalRow("Total Income (A)", st.totalIncome, "text-emerald-300")}
            {section("Expense")}
            {st.expense.map((l) => (
              <tr key={l.code}>
                <td className={`${td} px-4`}>{l.category}</td>
                <td className={`${tdR} px-4 ${l.amount === 0 ? "text-zinc-600" : ""}`}>{amt(l.amount)}</td>
              </tr>
            ))}
            {totalRow("Total Expense (B)", st.totalExpense, "text-red-300")}
            {totalRow("NET PROFIT / (LOSS)  (A − B)", st.net, st.net >= 0 ? "text-emerald-300" : "text-red-300")}
          </tbody>
        </table>
      </div>

      {(st.otherIn > 0 || st.otherOut > 0) && (
        <p className="text-xs text-zinc-500">
          Not included above: Asset, Liability &amp; Equity entries in this period — money in{" "}
          <span className="text-zinc-300">{money(st.otherIn)}</span>, money out{" "}
          <span className="text-zinc-300">{money(st.otherOut)}</span>. Only categories with Major Head
          Income or Expenses feed this statement, same as the Excel sheet.
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <BreakdownTable title="By Region" rows={byRegion} />
        <BreakdownTable title="By Client / Service Category" rows={byService} />
      </div>
    </div>
  );
};

/* =====================================================================
   4. Balance Sheet (manual balances, like the Excel sheet)
   ===================================================================== */
const BalanceSheetTab: React.FC<{ txns: AccountTransaction[]; chart: AccountCategory[] }> = ({ txns, chart }) => {
  const [asOf, setAsOf] = useState(toIso(new Date()));
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  

  useEffect(() => {
    (async () => {
      try {
        const data: BalanceSheetData | null = await getBalanceSheet();
        if (data) {
          setAsOf(data.asOf);
          setDraft(Object.fromEntries(Object.entries(data.values).map(([k, v]) => [k, String(v)])));
        }
      } catch (e) {
        console.log(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const values = useMemo(
    () => Object.fromEntries(Object.entries(draft).map(([k, v]) => [k, parseFloat(v) || 0])) as Record<string, number>,
    [draft],
  );
  const t = balanceTotals(chart, values);
  const assets = chart.filter((c) => c.majorHead === "Assets");
  const le = chart.filter((c) => c.majorHead === "Liabilities" || c.majorHead === "Equity");

  // reference only: cash book net up to the chosen date
  const cashBookNet = useMemo(
    () => totals(txns.filter((x) => x.date <= asOf)).net,
    [txns, asOf],
  );

  const handleSave = async () => {
    try {
      setSaving(true);
      setMsg("");
      await saveBalanceSheet({ asOf, values });
      setMsg("Balance sheet saved.");
    } catch (e) {
      console.log(e);
      setMsg("Could not save the balance sheet.");
    } finally {
      setSaving(false);
    }
  };

  const field = (c: AccountCategory) => (
    <div key={c.code} className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-xs text-zinc-300">{c.name}</span>
      <input
        type="text"
        inputMode="decimal"
        value={draft[c.code] ?? ""}
        placeholder="0"
        onChange={(e) => setDraft((p) => ({ ...p, [c.code]: e.target.value }))}
        className={`${inputCls} w-36 text-right font-mono text-sky-300`}
      />
    </div>
  );

  if (loading) return <p className="text-center text-sm text-zinc-500 py-10">Loading balance sheet…</p>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <label className="text-xs text-zinc-500">As of</label>
          <input type="date" className={inputCls} value={asOf} onChange={(e) => setAsOf(e.target.value)} />
        </div>
        <button onClick={handleSave} disabled={saving} className={btnPrimary}>
          {saving ? "Saving..." : "Save Balance Sheet"}
        </button>
      </div>

      {msg && <p className="text-xs text-violet-300">{msg}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className={`${card} p-5`}>
          <p className="text-sm font-semibold text-white mb-2">Assets</p>
          {assets.map(field)}
          <div className="flex justify-between pt-3 mt-3 border-t border-white/10 text-sm font-semibold text-white">
            <span>Total Assets</span>
            <span className="font-mono">{money(t.assets)}</span>
          </div>
          <p className="mt-3 text-[11px] text-zinc-500">
            Reference: cash book net up to this date is {money(cashBookNet)}. Enter negative values for contra
            accounts like Accumulated Depreciation.
          </p>
        </div>

        <div className={`${card} p-5`}>
          <p className="text-sm font-semibold text-white mb-2">Liabilities &amp; Equity</p>
          {le.map(field)}
          <div className="flex justify-between pt-3 mt-3 border-t border-white/10 text-sm font-semibold text-white">
            <span>Total Liabilities &amp; Equity</span>
            <span className="font-mono">{money(t.liabilitiesEquity)}</span>
          </div>
        </div>
      </div>

      <div
        className={`rounded-xl px-4 py-3 text-sm border ${
          Math.abs(t.diff) < 0.005
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
            : "bg-red-500/10 border-red-500/20 text-red-300"
        }`}
      >
        Check (Assets − Liabilities &amp; Equity):{" "}
        <span className="font-mono font-semibold">{money(t.diff)}</span>
        {Math.abs(t.diff) < 0.005 ? " · Balanced" : " · Not balanced"}
      </div>
    </div>
  );
};

/* =====================================================================
   5. Chart of Accounts
   ===================================================================== */
const ChartTab: React.FC<{
  txns: AccountTransaction[];
  chart: AccountCategory[];
  setChart: React.Dispatch<React.SetStateAction<AccountCategory[]>>;
}> = ({ txns, chart, setChart }) => {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [majorHead, setMajorHead] = useState<MajorHead>("Expenses");
  const [type, setType] = useState(HEAD_TYPES.Expenses[0]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AccountCategory | null>(null);
  const [deleting, setDeleting] = useState(false);

  const usedNames = useMemo(() => new Set(txns.map((t) => t.category)), [txns]);

  const changeHead = (h: MajorHead) => {
    setMajorHead(h);
    setType(HEAD_TYPES[h][0]);
  };

  const handleAdd = async () => {
    const c = code.trim().toUpperCase();
    const n = name.trim();
    if (!c || !n) return;
    if (chart.some((x) => x.code === c || x.name.toLowerCase() === n.toLowerCase())) {
      setError("That code or name already exists.");
      return;
    }
    try {
      setSaving(true);
      setError("");
      const created = await addCategory({ code: c, name: n, majorHead, type, notes: notes.trim() });
      setChart((prev) => sortChart([...prev, created]));
      setCode("");
      setName("");
      setNotes("");
    } catch (e) {
      console.log(e);
      setError("Could not add the category.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget?.firestoreId) return;
    try {
      setDeleting(true);
      await deleteCategory(deleteTarget.firestoreId);
      setChart((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e) {
      console.log(e);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className={`${card} p-5`}>
        <p className="text-sm font-semibold text-white mb-3">Add category</p>
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          <input className={inputCls} placeholder="Code (EX19)" value={code} onChange={(e) => setCode(e.target.value)} />
          <input
            className={`${inputCls} col-span-2`}
            placeholder="Category name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <select className={inputCls} value={majorHead} onChange={(e) => changeHead(e.target.value as MajorHead)}>
            {MAJOR_HEADS.map((h) => (
              <option key={h} className="bg-[#0f1117]">{h}</option>
            ))}
          </select>
          <select className={inputCls} value={type} onChange={(e) => setType(e.target.value)}>
            {HEAD_TYPES[majorHead].map((x) => (
              <option key={x} className="bg-[#0f1117]">{x}</option>
            ))}
          </select>
          <input className={inputCls} placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div className="flex items-center gap-3 mt-3">
          <button onClick={handleAdd} disabled={saving || !code.trim() || !name.trim()} className={btnPrimary}>
            {saving ? "Adding..." : "Add Category"}
          </button>
          {error && <span className="text-xs text-red-400">{error}</span>}
        </div>
        <p className="mt-3 text-[11px] text-zinc-500">
          Categories with Major Head Income or Expenses appear automatically in the Monthly Summary and the
          Income &amp; Expense statement.
        </p>
      </div>

      <div className={`${card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-white/5">
              <tr>
                <th className={th}>Code</th>
                <th className={th}>Category</th>
                <th className={th}>Major Head</th>
                <th className={th}>Type</th>
                <th className={th}>Notes</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {chart.map((c) => {
                const used = usedNames.has(c.name);
                return (
                  <tr key={c.id} className="hover:bg-white/[0.02]">
                    <td className={`${td} font-mono text-zinc-500`}>{c.code}</td>
                    <td className={`${td} text-zinc-200`}>{c.name}</td>
                    <td className={td}>{c.majorHead}</td>
                    <td className={td}>{c.type}</td>
                    <td className={`${td} max-w-[320px] truncate text-zinc-500`} title={c.notes}>
                      {c.notes}
                    </td>
                    <td className={`${td} text-right`}>
                      <button
                        onClick={() => setDeleteTarget(c)}
                        disabled={used}
                        title={used ? "Used by transactions" : "Delete category"}
                        className="text-red-400 hover:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {deleteTarget && (
        <DeleteConfirmModal loading={deleting} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} />
      )}
    </div>
  );
};

export default AccountsManagement;



export const useLockBodyScroll = (locked: boolean) => {
  useEffect(() => {
    if (!locked) return;
    const prevOverflow = document.body.style.overflow;
    const prevPadding = document.body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`; // stops the page jumping sideways

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPadding;
    };
  }, [locked]);
};