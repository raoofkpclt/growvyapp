import React, { useCallback, useEffect, useMemo, useState } from "react";
import type {
  AccountCategory,
  AccountTransaction,
  BalanceSheetData,
  Client,
  Creative,
} from "../../utils/types/Types";
import { getClients } from "../../service/clientService";
import { getCreatives } from "../../service/workService";
import { getBalanceSheet, getChartOfAccounts, getTransactions } from "../../service/Accountservice";
import {
  ACCOUNTS_CURRENCY,
  MONTHS,
  balanceTotals,
  fmtDate,
  monthlySummary,
  periodStatement,
  toIso,
} from "../../service/Accounts";
import { formatAmount, formatMoney } from "../../utils/currency";

/* =====================================================================
   Helpers
   Every number comes from Firestore through the same functions the
   Accounts page uses, so the dashboard always matches Accounts.
   ===================================================================== */
const money = (n: number) => formatMoney(n, ACCOUNTS_CURRENCY);
const amt = (n: number) => (n === 0 ? "—" : formatAmount(n, ACCOUNTS_CURRENCY));
const compact = (n: number) =>
  new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(n);
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

const card = "bg-[#0f1117] border border-white/5 rounded-2xl";
const inputCls =
  "bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500/60 transition-colors";
const th = "px-3 py-2.5 text-left text-[10px] uppercase tracking-wider text-zinc-500 font-medium whitespace-nowrap";
const thR = th + " text-right";
const td = "px-3 py-2 text-xs text-zinc-300 whitespace-nowrap";
const tdR = td + " text-right font-mono";

const niceMax = (v: number) => {
  if (v <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / exp;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * exp;
};

type Line = { code: string; category: string; amount: number };
type MonthRow = { code: string; category: string; months: number[]; total: number };
type MonthPoint = { label: string; income: number; expense: number; net: number };

const WIDE_FROM = "1900-01-01";
const WIDE_TO = "2999-12-31";
const ZEROS = Array.from({ length: 12 }, () => 0);
const FY_MONTHS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

/** Indian financial year start (April) for a given date */
const fyStartOf = (d: Date) => (d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1);

/** Apr–Dec from the first calendar year + Jan–Mar from the next one */
const shiftToFy = (a: number[], b: number[]) => [...a.slice(3), ...b.slice(0, 3)];

/* =====================================================================
   Small UI pieces
   ===================================================================== */
const Kpi: React.FC<{ label: string; value: string; tone: string; footer: React.ReactNode }> = ({
  label,
  value,
  tone,
  footer,
}) => (
  <div className={`${card} p-5`}>
    <p className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</p>
    <p className={`text-2xl font-bold mt-1.5 tracking-tight ${tone}`}>{value}</p>
    <div className="mt-2 text-[11px] text-zinc-500 min-h-[16px]">{footer}</div>
  </div>
);

const SmallStat: React.FC<{ label: string; value: string; footer: React.ReactNode }> = ({ label, value, footer }) => (
  <div className={`${card} px-5 py-4`}>
    <p className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</p>
    <p className="text-xl font-bold text-white mt-1">{value}</p>
    <div className="mt-1 text-[11px] text-zinc-500">{footer}</div>
  </div>
);

const Panel: React.FC<{
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, subtitle, right, children }) => (
  <div className={`${card} p-5`}>
    <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        {subtitle && <p className="text-xs text-zinc-600 mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
    {children}
  </div>
);

const Empty: React.FC<{ text?: string }> = ({ text = "No data in this period" }) => (
  <div className="flex items-center justify-center h-32 text-xs text-zinc-600 text-center px-4">{text}</div>
);

/** Every category of one kind, with a share bar */
const CategoryList: React.FC<{ rows: Line[]; total: number; color: string; totalLabel: string }> = ({
  rows,
  total,
  color,
  totalLabel,
}) => {
  if (rows.length === 0) return <Empty />;
  const max = Math.max(...rows.map((r) => Math.abs(r.amount))) || 1;
  return (
    <div>
      <div className="max-h-[420px] overflow-y-auto pr-1 space-y-3">
        {rows.map((r) => (
          <div key={r.code}>
            <div className="flex justify-between gap-3 mb-1">
              <span className="text-xs text-zinc-300 truncate">{r.category}</span>
              <span className="text-xs text-zinc-400 font-mono whitespace-nowrap">
                {formatAmount(r.amount, ACCOUNTS_CURRENCY)}
                <span className="text-zinc-600 ml-2 inline-block w-9 text-right">
                  {total > 0 ? ((r.amount / total) * 100).toFixed(0) : 0}%
                </span>
              </span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${(Math.abs(r.amount) / max) * 100}%`, background: color }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between pt-3 mt-3 border-t border-white/10 text-sm font-semibold text-white">
        <span>{totalLabel}</span>
        <span className="font-mono">{money(total)}</span>
      </div>
    </div>
  );
};

/* ---------- Income vs Expense: grouped bars + net line ---------- */
const IncomeExpenseChart: React.FC<{ data: MonthPoint[] }> = ({ data }) => {
  const [hover, setHover] = useState<number | null>(null);
  const W = 720;
  const H = 280;
  const padL = 46;
  const padR = 10;
  const padT = 14;
  const padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  if (data.every((d) => d.income === 0 && d.expense === 0)) return <Empty text="No income or expense in this year" />;

  const maxV = niceMax(Math.max(...data.map((d) => Math.max(d.income, d.expense, d.net)), 0));
  const minNet = Math.min(...data.map((d) => d.net), 0);
  const minV = minNet < 0 ? -niceMax(-minNet) : 0;
  const y = (v: number) => padT + innerH * (1 - (v - minV) / (maxV - minV || 1));
  const ticks = Array.from({ length: 5 }, (_, i) => minV + ((maxV - minV) * i) / 4);

  const group = innerW / data.length;
  const bw = Math.min(group * 0.28, 22);
  const cx = (i: number) => padL + group * i + group / 2;
  const netPts = data.map((d, i) => `${cx(i)},${y(d.net)}`).join(" ");

  const tipW = 142;
  const tipX = hover === null ? 0 : Math.min(Math.max(cx(hover) - tipW / 2, padL), W - padR - tipW);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" onMouseLeave={() => setHover(null)}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="rgba(255,255,255,0.05)" />
          <text x={padL - 8} y={y(t) + 3} textAnchor="end" fontSize="10" fill="#71717a">
            {compact(t)}
          </text>
        </g>
      ))}
      {minV < 0 && <line x1={padL} x2={W - padR} y1={y(0)} y2={y(0)} stroke="rgba(255,255,255,0.15)" />}

      {data.map((d, i) => (
        <g key={d.label}>
          {hover === i && <rect x={padL + group * i} y={padT} width={group} height={innerH} fill="rgba(255,255,255,0.03)" />}
          <rect x={cx(i) - bw - 1.5} y={y(d.income)} width={bw} height={Math.max(y(0) - y(d.income), 0)} rx="3" fill="#10b981" />
          <rect x={cx(i) + 1.5} y={y(d.expense)} width={bw} height={Math.max(y(0) - y(d.expense), 0)} rx="3" fill="#f87171" />
          <text x={cx(i)} y={H - 9} textAnchor="middle" fontSize="10" fill="#71717a">
            {d.label}
          </text>
          <rect
            x={padL + group * i}
            y={padT}
            width={group}
            height={innerH + padB}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          />
        </g>
      ))}

      <polyline points={netPts} fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinejoin="round" />
      {data.map((d, i) => (
        <circle key={d.label} cx={cx(i)} cy={y(d.net)} r={hover === i ? 4 : 2.5} fill="#0f1117" stroke="#8b5cf6" strokeWidth="2" />
      ))}

      {hover !== null && (
        <g pointerEvents="none">
          <rect x={tipX} y={padT} width={tipW} height={66} rx="8" fill="#171923" stroke="rgba(255,255,255,0.12)" />
          <text x={tipX + 10} y={padT + 16} fontSize="10" fill="#a1a1aa" fontWeight="600">
            {data[hover].label}
          </text>
          <text x={tipX + 10} y={padT + 32} fontSize="10" fill="#34d399">
            Income  {compact(data[hover].income)}
          </text>
          <text x={tipX + 10} y={padT + 45} fontSize="10" fill="#f87171">
            Expense  {compact(data[hover].expense)}
          </text>
          <text x={tipX + 10} y={padT + 58} fontSize="10" fill="#a78bfa">
            Net  {compact(data[hover].net)}
          </text>
        </g>
      )}
    </svg>
  );
};

/* =====================================================================
   Dashboard
   ===================================================================== */
type Preset = "month" | "last" | "fy" | "all" | "custom";
type Basis = "fy" | "cal";

const PRESETS: { id: Exclude<Preset, "custom">; label: string }[] = [
  { id: "month", label: "This month" },
  { id: "last", label: "Last month" },
  { id: "fy", label: "This FY (Apr–Mar)" },
  { id: "all", label: "All time" },
];

const Dashboard: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [txns, setTxns] = useState<AccountTransaction[]>([]);
  const [chart, setChart] = useState<AccountCategory[]>([]);
  const [balance, setBalance] = useState<BalanceSheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [preset, setPreset] = useState<Preset>("fy");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const [basis, setBasis] = useState<Basis>("fy");
  const [year, setYear] = useState(fyStartOf(new Date()));
  const [showMatrix, setShowMatrix] = useState(true);

  /* ---------- fetch everything from Firestore ---------- */
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const names = ["clients", "works", "transactions", "chart of accounts", "balance sheet"];
    const results = await Promise.allSettled([
      getClients(),
      getCreatives(),
      getTransactions(),
      getChartOfAccounts(),
      getBalanceSheet(),
    ]);
    if (results[0].status === "fulfilled") setClients(results[0].value);
    if (results[1].status === "fulfilled") setCreatives(results[1].value);
    if (results[2].status === "fulfilled") setTxns(results[2].value);
    if (results[3].status === "fulfilled") setChart(results[3].value);
    if (results[4].status === "fulfilled") setBalance(results[4].value);

    const failed = names.filter((_, i) => results[i].status === "rejected");
    if (failed.length) setError(`Could not load: ${failed.join(", ")}. Showing what is available.`);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /* ---------- selected period ---------- */
  const range = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    if (preset === "month") return { from: toIso(new Date(y, m, 1)), to: toIso(new Date(y, m + 1, 0)) };
    if (preset === "last") return { from: toIso(new Date(y, m - 1, 1)), to: toIso(new Date(y, m, 0)) };
    if (preset === "fy") {
      const sy = fyStartOf(now);
      return { from: `${sy}-04-01`, to: `${sy + 1}-03-31` };
    }
    if (preset === "all") {
      const dates = txns.map((t) => t.date).filter(Boolean).sort();
      const today = toIso(now);
      const last = dates[dates.length - 1] ?? today;
      return { from: dates[0] ?? today, to: last > today ? last : today };
    }
    return { from: customFrom, to: customTo };
  }, [preset, customFrom, customTo, txns]);

  const pickFrom = (v: string) => {
    setCustomFrom(v);
    setCustomTo(range.to);
    setPreset("custom");
  };
  const pickTo = (v: string) => {
    setCustomTo(v);
    setCustomFrom(range.from);
    setPreset("custom");
  };

  /* ---------- accounting totals ---------- */
  const st = useMemo(() => periodStatement(txns, chart, range.from, range.to), [txns, chart, range]);
  const lifetime = useMemo(() => periodStatement(txns, chart, WIDE_FROM, WIDE_TO), [txns, chart]);

  const incomeRows = useMemo(
    () => ([...st.income] as Line[]).filter((l) => l.amount !== 0).sort((a, b) => b.amount - a.amount),
    [st],
  );
  const expenseRows = useMemo(
    () => ([...st.expense] as Line[]).filter((l) => l.amount !== 0).sort((a, b) => b.amount - a.amount),
    [st],
  );

  /* ---------- monthly view (financial year or calendar year) ---------- */
  const yearOptions = useMemo(() => {
    const set = new Set<number>([fyStartOf(new Date()), new Date().getFullYear()]);
    txns.forEach((t) => {
      if (!t.date) return;
      const d = new Date(t.date);
      if (Number.isNaN(d.getTime())) return;
      set.add(basis === "fy" ? fyStartOf(d) : d.getFullYear());
    });
    return [...set].sort((a, b) => b - a);
  }, [txns, basis]);

  const switchBasis = (b: Basis) => {
    setBasis(b);
    setYear(b === "fy" ? fyStartOf(new Date()) : new Date().getFullYear());
  };

  const monthly = useMemo(() => {
    const a = monthlySummary(txns, chart, year);
    if (basis === "cal") {
      return {
        labels: MONTHS as string[],
        income: a.income as MonthRow[],
        expense: a.expense as MonthRow[],
        incomeByMonth: a.incomeByMonth as number[],
        expenseByMonth: a.expenseByMonth as number[],
        netByMonth: a.netByMonth as number[],
      };
    }
    const b = monthlySummary(txns, chart, year + 1);
    const merge = (A: MonthRow[], B: MonthRow[]): MonthRow[] =>
      A.map((r) => {
        const o = B.find((x) => x.code === r.code);
        const months = shiftToFy(r.months, o?.months ?? ZEROS);
        return { code: r.code, category: r.category, months, total: sum(months) };
      });
    return {
      labels: FY_MONTHS,
      income: merge(a.income as MonthRow[], b.income as MonthRow[]),
      expense: merge(a.expense as MonthRow[], b.expense as MonthRow[]),
      incomeByMonth: shiftToFy(a.incomeByMonth, b.incomeByMonth),
      expenseByMonth: shiftToFy(a.expenseByMonth, b.expenseByMonth),
      netByMonth: shiftToFy(a.netByMonth, b.netByMonth),
    };
  }, [txns, chart, year, basis]);

  const monthPoints: MonthPoint[] = useMemo(
    () =>
      monthly.labels.map((label, i) => ({
        label,
        income: monthly.incomeByMonth[i] ?? 0,
        expense: monthly.expenseByMonth[i] ?? 0,
        net: monthly.netByMonth[i] ?? 0,
      })),
    [monthly],
  );
  const yearIncome = sum(monthly.incomeByMonth);
  const yearExpense = sum(monthly.expenseByMonth);
  const yearLabel = basis === "fy" ? `FY ${year}–${String(year + 1).slice(2)}` : `Calendar year ${year}`;

  /* ---------- assets (saved Balance Sheet) ---------- */
  const bsValues = useMemo(() => (balance?.values ?? {}) as Record<string, number>, [balance]);
  const bsTotals = useMemo(() => balanceTotals(chart, bsValues), [chart, bsValues]);
  const assetRows: Line[] = useMemo(
    () =>
      chart
        .filter((c) => c.majorHead === "Assets")
        .map((c) => ({ code: c.code, category: c.name, amount: bsValues[c.code] ?? 0 }))
        .filter((r) => r.amount !== 0)
        .sort((a, b) => b.amount - a.amount),
    [chart, bsValues],
  );

  /* ---------- clients & works ---------- */
  const activeClients = clients.filter((c) => c.status === "active").length;
  const workCounts = useMemo(() => {
    const m: Record<string, number> = { poster: 0, reel: 0, website: 0 };
    creatives.forEach((c) => {
      m[c.type] = (m[c.type] ?? 0) + 1;
    });
    return m;
  }, [creatives]);

  const periodLabel = preset === "all" ? "All time" : `${fmtDate(range.from)} – ${fmtDate(range.to)}`;

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-72 rounded-xl bg-white/5" />
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-white/5" />
          ))}
        </div>
        <div className="h-80 rounded-2xl bg-white/5" />
      </div>
    );
  }

  const renderMatrix = (label: string, rows: MonthRow[], byMonth: number[], tone: string) => {
    const visible = rows.filter((r) => r.total !== 0);
    return (
      <>
        <tr className="bg-white/[0.03]">
          <td colSpan={14} className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-orange-300">
            {label}
          </td>
        </tr>
        {visible.length === 0 && (
          <tr>
            <td colSpan={14} className="px-3 py-3 text-xs text-zinc-600">
              No {label.toLowerCase()} entries in this period.
            </td>
          </tr>
        )}
        {visible.map((r) => (
          <tr key={r.code} className="hover:bg-white/[0.02]">
            <td className={`${td} sticky left-0 bg-[#0f1117]`}>{r.category}</td>
            {r.months.map((v, i) => (
              <td key={i} className={`${tdR} ${v === 0 ? "text-zinc-700" : ""}`}>
                {amt(v)}
              </td>
            ))}
            <td className={`${tdR} text-white`}>{amt(r.total)}</td>
          </tr>
        ))}
        <tr className="bg-orange-500/10">
          <td className={`${td} sticky left-0 bg-[#1a1410] font-semibold ${tone}`}>Total {label}</td>
          {byMonth.map((v, i) => (
            <td key={i} className={`${tdR} font-semibold ${tone}`}>
              {amt(v)}
            </td>
          ))}
          <td className={`${tdR} font-semibold ${tone}`}>{amt(sum(byMonth))}</td>
        </tr>
      </>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header + period */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-white">Business Overview</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Accounts for {periodLabel}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPreset(p.id)}
                className={`text-xs px-3 py-1.5 rounded-lg transition-all ${
                  preset === p.id ? "bg-violet-600 text-white" : "text-zinc-400 hover:text-white"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <input type="date" className={inputCls} value={range.from} onChange={(e) => pickFrom(e.target.value)} />
          <span className="text-xs text-zinc-600">to</span>
          <input type="date" className={inputCls} min={range.from} value={range.to} onChange={(e) => pickTo(e.target.value)} />
          <button
            onClick={load}
            className="text-xs px-3 py-2 rounded-xl border border-white/10 text-zinc-300 hover:text-white hover:border-white/20 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2.5">
          <span>{error}</span>
          <button onClick={() => setError("")} className="text-amber-300/70 hover:text-amber-200 text-base leading-none">
            ×
          </button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <Kpi
          label="Total Revenue"
          value={money(st.totalIncome)}
          tone="text-emerald-400"
          footer={<>All time: <span className="text-zinc-300">{money(lifetime.totalIncome)}</span></>}
        />
        <Kpi
          label="Total Expenses"
          value={money(st.totalExpense)}
          tone="text-red-400"
          footer={<>All time: <span className="text-zinc-300">{money(lifetime.totalExpense)}</span></>}
        />
        <Kpi
          label={st.net >= 0 ? "Net Profit" : "Net Loss"}
          value={money(st.net)}
          tone={st.net >= 0 ? "text-white" : "text-red-300"}
          footer={
            <>
              Margin {st.totalIncome > 0 ? ((st.net / st.totalIncome) * 100).toFixed(1) : "0.0"}% · All time:{" "}
              <span className="text-zinc-300">{money(lifetime.net)}</span>
            </>
          }
        />
        <Kpi
          label="Total Assets"
          value={money(bsTotals.assets)}
          tone="text-sky-300"
          footer={balance ? <>As of {fmtDate(balance.asOf)} (Balance Sheet)</> : <>Not entered yet in Accounts → Balance Sheet</>}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <SmallStat
          label="Total Clients"
          value={String(clients.length)}
          footer={
            <>
              <span className="text-emerald-400">{activeClients} active</span> · {clients.length - activeClients} inactive
            </>
          }
        />
        <SmallStat
          label="Total Works"
          value={String(creatives.length)}
          footer={`${workCounts.poster ?? 0} posters · ${workCounts.reel ?? 0} reels · ${workCounts.website ?? 0} websites`}
        />
      </div>

      {/* Category-wise income & expense for the selected period */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Income by Category" subtitle={`${incomeRows.length} categories · ${periodLabel}`}>
          <CategoryList rows={incomeRows} total={st.totalIncome} color="#10b981" totalLabel="Total Income" />
        </Panel>
        <Panel title="Expenses by Category" subtitle={`${expenseRows.length} categories · ${periodLabel}`}>
          <CategoryList rows={expenseRows} total={st.totalExpense} color="#f87171" totalLabel="Total Expense" />
        </Panel>
      </div>

      {(st.otherIn > 0 || st.otherOut > 0) && (
        <p className="text-xs text-zinc-500 -mt-3">
          Not counted above: asset, liability &amp; equity entries in this period — money in{" "}
          <span className="text-zinc-300">{money(st.otherIn)}</span>, money out{" "}
          <span className="text-zinc-300">{money(st.otherOut)}</span>.
        </p>
      )}

      {/* Monthly */}
      <Panel
        title="Monthly Income & Expense"
        subtitle={`${yearLabel} · income ${money(yearIncome)} · expense ${money(yearExpense)}`}
        right={
          <div className="flex items-center gap-2 flex-wrap">
            <div className="hidden sm:flex items-center gap-3 text-[11px] text-zinc-500 mr-1">
              <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Income</span>
              <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-red-400" /> Expense</span>
              <span className="flex items-center gap-1.5"><i className="w-3 h-0.5 bg-violet-500" /> Net</span>
            </div>
            <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
              {(["fy", "cal"] as Basis[]).map((b) => (
                <button
                  key={b}
                  onClick={() => switchBasis(b)}
                  className={`text-xs px-3 py-1 rounded-lg transition-all ${
                    basis === b ? "bg-violet-600 text-white" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {b === "fy" ? "Financial year" : "Calendar year"}
                </button>
              ))}
            </div>
            <select className={inputCls} value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {yearOptions.map((y) => (
                <option key={y} value={y} className="bg-[#0f1117]">
                  {basis === "fy" ? `${y}–${String(y + 1).slice(2)}` : y}
                </option>
              ))}
            </select>
          </div>
        }
      >
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="xl:col-span-2">
            <IncomeExpenseChart data={monthPoints} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-white/5">
                <tr>
                  <th className={th}>Month</th>
                  <th className={thR}>Income</th>
                  <th className={thR}>Expense</th>
                  <th className={thR}>Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {monthPoints.map((m) => (
                  <tr key={m.label}>
                    <td className={td}>{m.label}</td>
                    <td className={`${tdR} text-emerald-400`}>{amt(m.income)}</td>
                    <td className={`${tdR} text-red-400`}>{amt(m.expense)}</td>
                    <td className={`${tdR} ${m.net < 0 ? "text-red-300" : "text-zinc-200"}`}>{amt(m.net)}</td>
                  </tr>
                ))}
                <tr className="bg-orange-500/10">
                  <td className={`${td} font-semibold text-white`}>Total</td>
                  <td className={`${tdR} font-semibold text-emerald-300`}>{amt(yearIncome)}</td>
                  <td className={`${tdR} font-semibold text-red-300`}>{amt(yearExpense)}</td>
                  <td className={`${tdR} font-semibold ${yearIncome - yearExpense < 0 ? "text-red-300" : "text-white"}`}>
                    {amt(yearIncome - yearExpense)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </Panel>

      {/* Category x month */}
      <Panel
        title="Category-wise Monthly Detail"
        subtitle={`Income and expense categories by month · ${yearLabel}`}
        right={
          <button
            onClick={() => setShowMatrix((v) => !v)}
            className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-zinc-300 hover:text-white hover:border-white/20 transition-colors"
          >
            {showMatrix ? "Hide" : "Show"}
          </button>
        }
      >
        {showMatrix && (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full">
              <thead className="border-b border-white/5">
                <tr>
                  <th className={`${th} sticky left-0 bg-[#0f1117]`}>Category</th>
                  {monthly.labels.map((m) => (
                    <th key={m} className={thR}>
                      {m}
                    </th>
                  ))}
                  <th className={thR}>Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {renderMatrix("Income", monthly.income, monthly.incomeByMonth, "text-emerald-300")}
                {renderMatrix("Expense", monthly.expense, monthly.expenseByMonth, "text-red-300")}
                <tr className="bg-white/[0.04]">
                  <td className={`${td} sticky left-0 bg-[#15171f] font-semibold text-white`}>Net (Income − Expense)</td>
                  {monthly.netByMonth.map((v, i) => (
                    <td key={i} className={`${tdR} font-semibold ${v < 0 ? "text-red-300" : "text-white"}`}>
                      {amt(v)}
                    </td>
                  ))}
                  <td className={`${tdR} font-semibold text-white`}>{amt(sum(monthly.netByMonth))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Assets */}
      <Panel
        title="Assets"
        subtitle={balance ? `From the saved Balance Sheet · as of ${fmtDate(balance.asOf)}` : "From the Balance Sheet"}
      >
        {!balance || assetRows.length === 0 ? (
          <Empty text="No asset balances saved yet. Enter them in Accounts → Balance Sheet and they will appear here." />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2">
              <CategoryList rows={assetRows} total={bsTotals.assets} color="#0ea5e9" totalLabel="Total Assets" />
            </div>
            <div className="space-y-3 content-start">
              <div className="rounded-xl bg-white/[0.03] border border-white/5 px-4 py-3">
                <p className="text-[10px] uppercase tracking-wider text-zinc-500">Liabilities &amp; Equity</p>
                <p className="text-lg font-bold text-white mt-0.5">{money(bsTotals.liabilitiesEquity)}</p>
              </div>
              <div
                className={`rounded-xl px-4 py-3 text-xs border ${
                  Math.abs(bsTotals.diff) < 0.005
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                    : "bg-red-500/10 border-red-500/20 text-red-300"
                }`}
              >
                Assets − Liabilities &amp; Equity: <span className="font-mono font-semibold">{money(bsTotals.diff)}</span>
                {Math.abs(bsTotals.diff) < 0.005 ? " · Balanced" : " · Not balanced"}
              </div>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
};

export default Dashboard;