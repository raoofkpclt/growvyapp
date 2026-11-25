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

/* ---- extra data for the Overview tab ---- */
import {
  addDays,
  contentDue,
  ENDING_SOON_DAYS,
  listPlans,
  planState,
  type Plan,
  type PlanState,
} from "../../service/PlanService";
import { listAllTasks, STATUS_LABELS, type Task } from "../../service/TaskService";
import {
  dateKey,
  getAllMonth,
  hoursWorked,
  monthKey,
  type Attendance,
} from "../../service/AttendanceService";
import { getLeaves, LEAVE_LABELS, type Leave } from "../../service/LeaveService";
import { listStaff, type Staff } from "../../service/staffService";

/* =====================================================================
   Helpers
   Every number comes from Firestore through the same functions the
   other pages use, so the dashboard always matches them.
   ===================================================================== */
const money = (n: number) => formatMoney(n, ACCOUNTS_CURRENCY);
const amt = (n: number) => (n === 0 ? "—" : formatAmount(n, ACCOUNTS_CURRENCY));
const compact = (n: number) =>
  new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(n);
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

const timeOf = (v: unknown) => {
  if (!v) return "—";
  const d = new Date(v as string | number);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
};

/** the id plans and tasks use for a client */
const clientKeyOf = (c: Client) => c.firestoreId || c.id;

const card = "bg-[#0f1117] border border-white/5 rounded-2xl";

// text-base on mobile (16px) stops iOS Safari zooming into inputs
const inputCls =
  "bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 sm:py-2 text-base sm:text-xs text-white focus:outline-none focus:border-violet-500/60 transition-colors min-w-0";
const th = "px-3 py-2.5 text-left text-[10px] uppercase tracking-wider text-zinc-500 font-medium whitespace-nowrap";
const thR = th + " text-right";
const td = "px-3 py-2 text-xs text-zinc-300 whitespace-nowrap";
const tdR = td + " text-right font-mono";

// scrolls sideways on small screens without showing a scrollbar
const noScrollbar = "overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

// first column of the wide month tables (scrolls with the table, not sticky)
const catCol = "min-w-[140px] sm:min-w-[180px] whitespace-normal sm:whitespace-nowrap";

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
  <div className={`${card} p-4 sm:p-5 min-w-0`}>
    <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-zinc-500">{label}</p>
    <p className={`text-lg sm:text-2xl font-bold mt-1 sm:mt-1.5 tracking-tight truncate ${tone}`}>{value}</p>
    <div className="mt-1.5 sm:mt-2 text-[10px] sm:text-[11px] text-zinc-500 sm:min-h-[16px] break-words">{footer}</div>
  </div>
);

const SmallStat: React.FC<{ label: string; value: string; footer: React.ReactNode }> = ({ label, value, footer }) => (
  <div className={`${card} px-4 sm:px-5 py-3 sm:py-4 min-w-0`}>
    <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-zinc-500">{label}</p>
    <p className="text-lg sm:text-xl font-bold text-white mt-1">{value}</p>
    <div className="mt-1 text-[10px] sm:text-[11px] text-zinc-500 break-words">{footer}</div>
  </div>
);

const Panel: React.FC<{
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, subtitle, right, children }) => (
  <div className={`${card} p-4 sm:p-5 min-w-0`}>
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white">{title}</p>
        {subtitle && <p className="text-xs text-zinc-600 mt-0.5 break-words">{subtitle}</p>}
      </div>
      {right}
    </div>
    {children}
  </div>
);

const Empty: React.FC<{ text?: string }> = ({ text = "No data in this period" }) => (
  <div className="flex items-center justify-center h-32 text-xs text-zinc-600 text-center px-4">{text}</div>
);

type PillTone = "emerald" | "amber" | "red" | "sky" | "zinc" | "violet";
const PILL: Record<PillTone, string> = {
  emerald: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  amber: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  red: "bg-red-500/15 text-red-300 border-red-500/30",
  sky: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  zinc: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
  violet: "bg-violet-500/15 text-violet-300 border-violet-500/30",
};
const Pill: React.FC<{ tone: PillTone; children: React.ReactNode }> = ({ tone, children }) => (
  <span className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold ${PILL[tone]}`}>
    {children}
  </span>
);

const Row: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5">
    {children}
  </div>
);

const Avatar: React.FC<{ src?: string; name: string; size?: string }> = ({ src, name, size = "h-9 w-9" }) =>
  src ? (
    <img src={src} alt={name} className={`${size} shrink-0 rounded-full object-cover`} />
  ) : (
    <div
      className={`${size} flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 text-xs font-semibold text-white`}
    >
      {name?.charAt(0).toUpperCase()}
    </div>
  );

const CountBars: React.FC<{ rows: { label: string; value: number; color: string }[] }> = ({ rows }) => {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex justify-between gap-3 mb-1">
            <span className="text-xs text-zinc-300">{r.label}</span>
            <span className="text-xs text-zinc-400 font-mono">{r.value}</span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: r.color }} />
          </div>
        </div>
      ))}
    </div>
  );
};

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
      <div className="max-h-[380px] sm:max-h-[420px] overflow-y-auto pr-1 space-y-3">
        {rows.map((r) => (
          <div key={r.code}>
            <div className="flex justify-between gap-3 mb-1">
              <span className="text-xs text-zinc-300 min-w-0 break-words">{r.category}</span>
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
      <div className="flex justify-between gap-3 pt-3 mt-3 border-t border-white/10 text-sm font-semibold text-white">
        <span>{totalLabel}</span>
        <span className="font-mono">{money(total)}</span>
      </div>
    </div>
  );
};

/* ---------- Income vs Expense: grouped bars + net line ----------
   On phones the chart keeps a readable minimum width and scrolls sideways;
   tap a month to see its numbers (hover works on desktop). */
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
    <div>
      <p className="sm:hidden text-[11px] text-zinc-600 mb-2">Swipe sideways · tap a month for details</p>
      <div className="overflow-x-auto overscroll-x-contain">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full min-w-[600px] h-auto"
          onMouseLeave={() => setHover(null)}
        >
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
              {hover === i && (
                <rect x={padL + group * i} y={padT} width={group} height={innerH} fill="rgba(255,255,255,0.03)" />
              )}
              <rect
                x={cx(i) - bw - 1.5}
                y={y(d.income)}
                width={bw}
                height={Math.max(y(0) - y(d.income), 0)}
                rx="3"
                fill="#10b981"
              />
              <rect
                x={cx(i) + 1.5}
                y={y(d.expense)}
                width={bw}
                height={Math.max(y(0) - y(d.expense), 0)}
                rx="3"
                fill="#f87171"
              />
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
                onClick={() => setHover(i)}
              />
            </g>
          ))}

          <polyline points={netPts} fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinejoin="round" />
          {data.map((d, i) => (
            <circle
              key={d.label}
              cx={cx(i)}
              cy={y(d.net)}
              r={hover === i ? 4 : 2.5}
              fill="#0f1117"
              stroke="#8b5cf6"
              strokeWidth="2"
            />
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
      </div>
    </div>
  );
};

/* =====================================================================
   Dashboard
   ===================================================================== */
type Preset = "month" | "last" | "fy" | "all" | "custom";
type Basis = "fy" | "cal";
type View = "overview" | "accounts";

const PRESETS: { id: Exclude<Preset, "custom">; label: string }[] = [
  { id: "month", label: "This month" },
  { id: "last", label: "Last month" },
  { id: "fy", label: "This FY (Apr–Mar)" },
  { id: "all", label: "All time" },
];

const TASK_COLORS: Record<string, string> = {
  todo: "#71717a",
  in_progress: "#10b981",
  paused: "#f59e0b",
  review: "#0ea5e9",
  rework: "#f87171",
  done: "#34d399",
};

const WORK_META: Record<string, { label: string; tone: PillTone; color: string }> = {
  poster: { label: "Poster", tone: "violet", color: "#a78bfa" },
  reel: { label: "Reel", tone: "red", color: "#f472b6" },
  website: { label: "Website", tone: "sky", color: "#38bdf8" },
};

const Dashboard: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [txns, setTxns] = useState<AccountTransaction[]>([]);
  const [chart, setChart] = useState<AccountCategory[]>([]);
  const [balance, setBalance] = useState<BalanceSheetData | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [view, setView] = useState<View>("overview");

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
    const today = dateKey();
    const names = [
      "clients",
      "works",
      "transactions",
      "chart of accounts",
      "balance sheet",
      "plans",
      "tasks",
      "attendance",
      "leaves",
      "staff",
    ];
    const results = await Promise.allSettled([
      getClients(),
      getCreatives(),
      getTransactions(),
      getChartOfAccounts(),
      getBalanceSheet(),
      listPlans(),
      listAllTasks(),
      getAllMonth(monthKey()),
      getLeaves(`${monthKey()}-01`, addDays(today, 30)),
      listStaff(),
    ]);
    if (results[0].status === "fulfilled") setClients(results[0].value);
    if (results[1].status === "fulfilled") setCreatives(results[1].value);
    if (results[2].status === "fulfilled") setTxns(results[2].value);
    if (results[3].status === "fulfilled") setChart(results[3].value);
    if (results[4].status === "fulfilled") setBalance(results[4].value);
    if (results[5].status === "fulfilled") setPlans(results[5].value);
    if (results[6].status === "fulfilled") setTasks(results[6].value);
    if (results[7].status === "fulfilled") setAttendance(results[7].value);
    if (results[8].status === "fulfilled") setLeaves(results[8].value);
    if (results[9].status === "fulfilled") setStaff(results[9].value);

    const failed = names.filter((_, i) => results[i].status === "rejected");
    if (failed.length) setError(`Could not load: ${failed.join(", ")}. Showing what is available.`);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /* ---------- selected period (Accounts tab) ---------- */
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

  // fixed periods for the Overview tab
  const fyStmt = useMemo(() => {
    const sy = fyStartOf(new Date());
    return periodStatement(txns, chart, `${sy}-04-01`, `${sy + 1}-03-31`);
  }, [txns, chart]);
  const monthStmt = useMemo(() => {
    const now = new Date();
    return periodStatement(
      txns,
      chart,
      toIso(new Date(now.getFullYear(), now.getMonth(), 1)),
      toIso(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
    );
  }, [txns, chart]);

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

  /* ---------- Overview: attendance, tasks, plans, leaves ---------- */
  const today = dateKey();

  const ops = useMemo(() => {
    const clientName = new Map<string, Client>();
    clients.forEach((c) => {
      clientName.set(String(c.id), c);
      if (c.firestoreId) clientName.set(c.firestoreId, c);
    });

    // attendance today
    const staffActive = staff.filter((s) => s.active);
    const todayRecs = attendance
      .filter((a) => a.date === today && a.checkIn)
      .sort((a, b) => Number(b.checkIn) - Number(a.checkIn));
    const presentUids = new Set(todayRecs.map((a) => a.uid));
    const leaveToday = leaves.filter((l) => l.date === today && l.status === "approved");
    const leaveUids = new Set(leaveToday.map((l) => l.uid));
    const absent = staffActive.filter((s) => !presentUids.has(s.uid) && !leaveUids.has(s.uid));
    const working = todayRecs.filter((a) => !a.checkOut);

    // tasks
    const taskCounts: Record<string, number> = {};
    tasks.forEach((t) => {
      taskCounts[t.status] = (taskCounts[t.status] ?? 0) + 1;
    });
    const overdue = tasks.filter((t) => t.status !== "done" && !!t.dueDate && t.dueDate < today);
    const inReview = tasks.filter((t) => t.status === "review");
    const attention = [...overdue, ...inReview.filter((t) => !overdue.includes(t))].slice(0, 6);
    const openTasks = tasks.filter((t) => t.status !== "done").length;

    // plans (active clients only)
    const planBy = new Map(plans.map((p) => [p.clientId, p]));
    const rows = clients
      .filter((c) => c.status === "active")
      .map((client) => {
        const plan = planBy.get(clientKeyOf(client));
        return { client, plan, st: planState(plan) };
      });
    const byState: Record<PlanState, number> = { active: 0, ending: 0, ended: 0, paused: 0, no_plan: 0 };
    rows.forEach((r) => {
      byState[r.st.state]++;
    });
    const soon = rows
      .filter((r) => r.plan && (r.st.state === "ending" || r.st.state === "ended"))
      .sort((a, b) => a.st.daysLeft - b.st.daysLeft);
    const contentMissing = rows.filter((r) => r.plan && contentDue(r.plan)).length;

    // leaves
    const pendingLeaves = leaves.filter((l) => l.status === "pending").sort((a, b) => a.date.localeCompare(b.date));
    const weekEnd = addDays(today, 7);
    const upcoming = leaves
      .filter((l) => l.status === "approved" && l.date > today && l.date <= weekEnd)
      .sort((a, b) => a.date.localeCompare(b.date));

    // clients & works lists
    const recentClients = [...clients]
      .sort((a, b) => {
        const A = Number(a.id);
        const B = Number(b.id);
        if (!Number.isNaN(A) && !Number.isNaN(B) && A !== B) return B - A;
        return (b.joinedDate || "").localeCompare(a.joinedDate || "");
      })
      .slice(0, 5);
    const recentWorks = [...creatives]
      .sort((a, b) => (b.uploadedAt || "").localeCompare(a.uploadedAt || ""))
      .slice(0, 6)
      .map((c) => ({ creative: c, owner: clientName.get(String(c.clientId)) }));

    return {
      staffActive,
      todayRecs,
      absent,
      working,
      leaveToday,
      taskCounts,
      overdue,
      inReview,
      attention,
      openTasks,
      byState,
      soon,
      contentMissing,
      pendingLeaves,
      upcoming,
      recentClients,
      recentWorks,
    };
  }, [clients, creatives, plans, tasks, attendance, leaves, staff, today]);

  const periodLabel = preset === "all" ? "All time" : `${fmtDate(range.from)} – ${fmtDate(range.to)}`;

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-full sm:w-72 rounded-xl bg-white/5" />
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 sm:h-28 rounded-2xl bg-white/5" />
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
            <td className={`${td} ${catCol}`}>{r.category}</td>
            {r.months.map((v, i) => (
              <td key={i} className={`${tdR} ${v === 0 ? "text-zinc-700" : ""}`}>
                {amt(v)}
              </td>
            ))}
            <td className={`${tdR} text-white`}>{amt(r.total)}</td>
          </tr>
        ))}
        <tr className="bg-orange-500/10">
          <td className={`${td} ${catCol} font-semibold ${tone}`}>Total {label}</td>
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

  const planTone = (s: PlanState): PillTone => (s === "ended" ? "red" : s === "ending" ? "amber" : "emerald");

  return (
    <div className="space-y-5 sm:space-y-6 min-w-0">
      {/* Header + view switch */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Business Overview</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {view === "overview" ? (
              <>
                Today, {fmtDate(today)} ·{" "}
              </>
            ) : (
              <>
                Accounts for {periodLabel} ·{" "}
              </>
            )}
            <button onClick={load} className="text-violet-300 hover:text-violet-200 transition-colors">
              ↻ Refresh
            </button>
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
          <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10 w-fit">
            {(["overview", "accounts"] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`text-xs px-4 py-2 sm:py-1.5 rounded-lg transition-all capitalize ${
                  view === v ? "bg-violet-600 text-white" : "text-zinc-400 hover:text-white"
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          {view === "accounts" && (
            <>
              {/* presets: one swipeable row on mobile */}
              <div className={`flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10 max-w-full ${noScrollbar}`}>
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPreset(p.id)}
                    className={`text-xs px-3 py-2 sm:py-1.5 rounded-lg transition-all whitespace-nowrap flex-shrink-0 ${
                      preset === p.id ? "bg-violet-600 text-white" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* dates: side by side on mobile */}
              <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
                <input
                  type="date"
                  className={`${inputCls} w-full sm:w-auto`}
                  value={range.from}
                  onChange={(e) => pickFrom(e.target.value)}
                />
                <span className="hidden sm:inline text-xs text-zinc-600">to</span>
                <input
                  type="date"
                  className={`${inputCls} w-full sm:w-auto`}
                  min={range.from}
                  value={range.to}
                  onChange={(e) => pickTo(e.target.value)}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2.5">
          <span>{error}</span>
          <button
            onClick={() => setError("")}
            className="text-amber-300/70 hover:text-amber-200 text-xl leading-none px-1"
          >
            ×
          </button>
        </div>
      )}

      {/* ═══════════════════════ OVERVIEW ═══════════════════════ */}
      {view === "overview" && (
        <>
          {/* headline numbers */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
            <Kpi
              label="Present today"
              value={`${ops.todayRecs.length} / ${ops.staffActive.length}`}
              tone="text-emerald-400"
              footer={
                <>
                  {ops.working.length} working now · {ops.leaveToday.length} on leave
                </>
              }
            />
            <Kpi
              label="Open tasks"
              value={String(ops.openTasks)}
              tone="text-white"
              footer={
                <>
                  <span className={ops.overdue.length ? "text-red-400" : ""}>{ops.overdue.length} overdue</span> ·{" "}
                  {ops.inReview.length} to approve
                </>
              }
            />
            <Kpi
              label="Plans ending soon"
              value={String(ops.byState.ending + ops.byState.ended)}
              tone={ops.byState.ended ? "text-red-400" : "text-amber-300"}
              footer={
                <>
                  {ops.byState.ending} ending · {ops.byState.ended} ended
                </>
              }
            />
            <Kpi
              label="Leave requests"
              value={String(ops.pendingLeaves.length)}
              tone={ops.pendingLeaves.length ? "text-sky-300" : "text-white"}
              footer={<>waiting for approval</>}
            />
          </div>

          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
            <SmallStat
              label="Clients"
              value={String(clients.length)}
              footer={
                <>
                  <span className="text-emerald-400">{activeClients} active</span> · {clients.length - activeClients}{" "}
                  inactive
                </>
              }
            />
            <SmallStat
              label="Works"
              value={String(creatives.length)}
              footer={`${workCounts.poster ?? 0} posters · ${workCounts.reel ?? 0} reels · ${workCounts.website ?? 0} sites`}
            />
            <SmallStat
              label="Active plans"
              value={String(ops.byState.active + ops.byState.ending + ops.byState.paused)}
              footer={`${ops.byState.no_plan} active clients without a plan`}
            />
            <SmallStat
              label="Content plans due"
              value={String(ops.contentMissing)}
              footer="missing for this month"
            />
          </div>

          {/* accounts summary */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-white">Accounts</p>
              <button
                onClick={() => setView("accounts")}
                className="text-xs text-violet-300 hover:text-violet-200 transition-colors"
              >
                Full accounts →
              </button>
            </div>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
              <Kpi
                label="Revenue (this FY)"
                value={money(fyStmt.totalIncome)}
                tone="text-emerald-400"
                footer={<>This month: <span className="text-zinc-300">{money(monthStmt.totalIncome)}</span></>}
              />
              <Kpi
                label="Expenses (this FY)"
                value={money(fyStmt.totalExpense)}
                tone="text-red-400"
                footer={<>This month: <span className="text-zinc-300">{money(monthStmt.totalExpense)}</span></>}
              />
              <Kpi
                label={fyStmt.net >= 0 ? "Net profit (this FY)" : "Net loss (this FY)"}
                value={money(fyStmt.net)}
                tone={fyStmt.net >= 0 ? "text-white" : "text-red-300"}
                footer={<>This month: <span className="text-zinc-300">{money(monthStmt.net)}</span></>}
              />
              <Kpi
                label="Total assets"
                value={money(bsTotals.assets)}
                tone="text-sky-300"
                footer={balance ? <>As of {fmtDate(balance.asOf)}</> : <>Not entered in Balance Sheet</>}
              />
            </div>
          </div>

          {/* attendance + leaves */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel
              title="Attendance today"
              subtitle={`${ops.todayRecs.length} present · ${ops.absent.length} not checked in · ${ops.leaveToday.length} on leave`}
            >
              {ops.todayRecs.length === 0 ? (
                <Empty text="Nobody has checked in yet today." />
              ) : (
                <div className="max-h-[300px] overflow-y-auto pr-1 space-y-2">
                  {ops.todayRecs.map((a) => (
                    <Row key={a.id}>
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar
                          name={a.name}
                          src={ops.staffActive.find((s) => s.uid === a.uid)?.photoUrl}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm text-white">{a.name}</p>
                          <p className="text-[11px] text-zinc-500">
                            In {timeOf(a.checkIn)}
                            {a.checkOut ? ` · Out ${timeOf(a.checkOut)}` : ""}
                          </p>
                        </div>
                      </div>
                      {a.checkOut ? (
                        <Pill tone="zinc">{hoursWorked(a).toFixed(1)} h</Pill>
                      ) : (
                        <Pill tone="emerald">Working</Pill>
                      )}
                    </Row>
                  ))}
                </div>
              )}
              {ops.absent.length > 0 && (
                <p className="mt-3 text-xs text-zinc-500">
                  <span className="text-amber-300">Not checked in:</span>{" "}
                  {ops.absent
                    .slice(0, 8)
                    .map((s) => s.name)
                    .join(", ")}
                  {ops.absent.length > 8 && ` +${ops.absent.length - 8} more`}
                </p>
              )}
              <p className="mt-2 text-[11px] text-zinc-700">
                “Not checked in” excludes people on approved leave. Holidays and Sundays are not excluded.
              </p>
            </Panel>

            <Panel
              title="Leaves"
              subtitle={`${ops.pendingLeaves.length} pending · ${ops.leaveToday.length} on leave today · ${ops.upcoming.length} in the next 7 days`}
            >
              {ops.pendingLeaves.length === 0 && ops.leaveToday.length === 0 && ops.upcoming.length === 0 ? (
                <Empty text="No leave requests or upcoming leave." />
              ) : (
                <div className="max-h-[360px] overflow-y-auto pr-1 space-y-4">
                  {ops.pendingLeaves.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[11px] uppercase tracking-wider text-sky-300">Waiting for approval</p>
                      {ops.pendingLeaves.slice(0, 6).map((l) => (
                        <Row key={l.id}>
                          <div className="min-w-0">
                            <p className="truncate text-sm text-white">{l.name}</p>
                            <p className="truncate text-[11px] text-zinc-500">
                              {fmtDate(l.date)}
                              {l.note ? ` · ${l.note}` : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {l.half && <Pill tone="zinc">Half day</Pill>}
                            <Pill tone="sky">{LEAVE_LABELS[l.type]}</Pill>
                          </div>
                        </Row>
                      ))}
                      {ops.pendingLeaves.length > 6 && (
                        <p className="text-[11px] text-zinc-600">+{ops.pendingLeaves.length - 6} more in Leave</p>
                      )}
                    </div>
                  )}

                  {ops.leaveToday.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[11px] uppercase tracking-wider text-amber-300">On leave today</p>
                      {ops.leaveToday.map((l) => (
                        <Row key={l.id}>
                          <p className="truncate text-sm text-white">{l.name}</p>
                          <div className="flex items-center gap-1.5">
                            {l.half && <Pill tone="zinc">Half day</Pill>}
                            <Pill tone="amber">{LEAVE_LABELS[l.type]}</Pill>
                          </div>
                        </Row>
                      ))}
                    </div>
                  )}

                  {ops.upcoming.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[11px] uppercase tracking-wider text-zinc-500">Next 7 days</p>
                      {ops.upcoming.slice(0, 6).map((l) => (
                        <Row key={l.id}>
                          <div className="min-w-0">
                            <p className="truncate text-sm text-white">{l.name}</p>
                            <p className="text-[11px] text-zinc-500">{fmtDate(l.date)}</p>
                          </div>
                          <Pill tone="zinc">{LEAVE_LABELS[l.type]}</Pill>
                        </Row>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Panel>
          </div>

          {/* tasks + plans ending soon */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel
              title="Tasks"
              subtitle={`${tasks.length} total · ${ops.overdue.length} overdue · ${ops.inReview.length} waiting for approval`}
            >
              {tasks.length === 0 ? (
                <Empty text="No tasks yet." />
              ) : (
                <div className="space-y-5">
                  <CountBars
                    rows={Object.keys(STATUS_LABELS).map((k) => ({
                      label: STATUS_LABELS[k as keyof typeof STATUS_LABELS],
                      value: ops.taskCounts[k] ?? 0,
                      color: TASK_COLORS[k] ?? "#71717a",
                    }))}
                  />
                  {ops.attention.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[11px] uppercase tracking-wider text-zinc-500">Needs attention</p>
                      {ops.attention.map((t) => (
                        <Row key={t.id}>
                          <div className="min-w-0">
                            <p className="truncate text-sm text-white">{t.title}</p>
                            <p className="truncate text-[11px] text-zinc-500">
                              {t.assignedToName}
                              {t.clientName ? ` · ${t.clientName}` : ""}
                              {t.dueDate ? ` · Due ${fmtDate(t.dueDate)}` : ""}
                            </p>
                          </div>
                          {t.status === "review" ? (
                            <Pill tone="sky">To approve</Pill>
                          ) : (
                            <Pill tone="red">Overdue</Pill>
                          )}
                        </Row>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Panel>

            <Panel
              title="Plans ending soon"
              subtitle={`Active clients whose plan ends within ${ENDING_SOON_DAYS} days or has ended`}
            >
              {ops.soon.length === 0 ? (
                <Empty text="No plans are ending soon." />
              ) : (
                <div className="max-h-[420px] overflow-y-auto pr-1 space-y-2">
                  {ops.soon.map((r) => (
                    <Row key={r.client.firestoreId || r.client.id}>
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar name={r.client.name} src={r.client.profileImage || r.client.profileImage} />
                        <div className="min-w-0">
                          <p className="truncate text-sm text-white">{r.client.name}</p>
                          <p className="text-[11px] text-zinc-500">
                            Ends {fmtDate(r.plan!.endDate)}
                          </p>
                        </div>
                      </div>
                      <Pill tone={planTone(r.st.state)}>
                        {r.st.state === "ended"
                          ? `Ended ${plural(-r.st.daysLeft, "day")} ago`
                          : r.st.daysLeft === 0
                          ? "Ends today"
                          : `${plural(r.st.daysLeft, "day")} left`}
                      </Pill>
                    </Row>
                  ))}
                </div>
              )}
            </Panel>
          </div>

          {/* client plans + clients */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel title="Client plans" subtitle="Status of every active client's plan">
              <CountBars
                rows={[
                  { label: "Active", value: ops.byState.active, color: "#10b981" },
                  { label: "Ending soon", value: ops.byState.ending, color: "#f59e0b" },
                  { label: "Ended", value: ops.byState.ended, color: "#f87171" },
                  { label: "Paused", value: ops.byState.paused, color: "#38bdf8" },
                  { label: "No plan yet", value: ops.byState.no_plan, color: "#71717a" },
                ]}
              />
              <p className="mt-4 text-xs text-zinc-500">
                {ops.contentMissing > 0 ? (
                  <>
                    <span className="text-amber-300">{plural(ops.contentMissing, "client")}</span> still need the
                    content plan for this month.
                  </>
                ) : (
                  "All running plans have this month's content plan."
                )}
              </p>
            </Panel>

            <Panel
              title="Clients"
              subtitle={`${clients.length} total · ${activeClients} active · ${clients.length - activeClients} inactive`}
            >
              {ops.recentClients.length === 0 ? (
                <Empty text="No clients yet." />
              ) : (
                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-wider text-zinc-500">Recently added</p>
                  {ops.recentClients.map((c) => (
                    <Row key={c.firestoreId || c.id}>
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar name={c.name} src={c.profileImage || c.profileImage} />
                        <div className="min-w-0">
                          <p className="truncate text-sm text-white">{c.name}</p>
                          <p className="truncate text-[11px] text-zinc-500">
                            {[c.mobile, c.joinedDate ? `Joined ${c.joinedDate}` : ""].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                      </div>
                      <Pill tone={c.status === "active" ? "emerald" : "zinc"}>
                        {c.status === "active" ? "Active" : "Inactive"}
                      </Pill>
                    </Row>
                  ))}
                </div>
              )}
            </Panel>
          </div>

          {/* works */}
          <Panel
            title="Works"
            subtitle={`${creatives.length} total · ${workCounts.poster ?? 0} posters · ${workCounts.reel ?? 0} reels · ${workCounts.website ?? 0} websites`}
          >
            {creatives.length === 0 ? (
              <Empty text="No works uploaded yet." />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <CountBars
                  rows={Object.keys(WORK_META).map((k) => ({
                    label: WORK_META[k].label + "s",
                    value: workCounts[k] ?? 0,
                    color: WORK_META[k].color,
                  }))}
                />
                <div className="lg:col-span-2 space-y-2 min-w-0">
                  <p className="text-[11px] uppercase tracking-wider text-zinc-500">Latest uploads</p>
                  {ops.recentWorks.map(({ creative: c, owner }) => {
                    const meta = WORK_META[c.type] ?? WORK_META.poster;
                    return (
                      <Row key={c.id}>
                        <div className="flex min-w-0 items-center gap-3">
                          {c.type === "poster" && c.imageUrl ? (
                            <img src={c.imageUrl} alt={c.title} className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/5 text-sm">
                              {c.type === "reel" ? "▶" : "🌐"}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-sm text-white">{c.title}</p>
                            <p className="truncate text-[11px] text-zinc-500">
                              {owner?.name ?? "No client"}
                              {c.uploadedAt ? ` · ${c.uploadedAt}` : ""}
                            </p>
                          </div>
                        </div>
                        <Pill tone={meta.tone}>{meta.label}</Pill>
                      </Row>
                    );
                  })}
                </div>
              </div>
            )}
          </Panel>
        </>
      )}

      {/* ═══════════════════════ ACCOUNTS ═══════════════════════ */}
      {view === "accounts" && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
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

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
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
            <p className="text-xs text-zinc-500 -mt-2 sm:-mt-3">
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
                      className={`text-xs px-3 py-1.5 sm:py-1 rounded-lg transition-all whitespace-nowrap ${
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
            {/* legend for phones (the desktop legend is hidden there) */}
            <div className="sm:hidden flex items-center gap-4 text-[11px] text-zinc-500 mb-3">
              <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Income</span>
              <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-red-400" /> Expense</span>
              <span className="flex items-center gap-1.5"><i className="w-3 h-0.5 bg-violet-500" /> Net</span>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
              <div className="xl:col-span-2 min-w-0">
                <IncomeExpenseChart data={monthPoints} />
              </div>
              <div className="overflow-x-auto min-w-0">
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
                className="self-start text-xs px-3 py-2 sm:py-1.5 rounded-lg border border-white/10 text-zinc-300 hover:text-white hover:border-white/20 transition-colors"
              >
                {showMatrix ? "Hide" : "Show"}
              </button>
            }
          >
            {showMatrix && (
              <>
                <p className="sm:hidden text-[11px] text-zinc-600 mb-2">Swipe sideways to see all months →</p>
                <div className="overflow-x-auto overscroll-x-contain -mx-4 px-4 sm:-mx-5 sm:px-5">
                  <table className="w-full">
                    <thead className="border-b border-white/5">
                      <tr>
                        <th className={`${th} ${catCol}`}>Category</th>
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
                        <td className={`${td} ${catCol} font-semibold text-white`}>
                          Net (Income − Expense)
                        </td>
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
              </>
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
                <div className="lg:col-span-2 min-w-0">
                  <CategoryList rows={assetRows} total={bsTotals.assets} color="#0ea5e9" totalLabel="Total Assets" />
                </div>
                <div className="space-y-3 content-start">
                  <div className="rounded-xl bg-white/[0.03] border border-white/5 px-4 py-3">
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500">Liabilities &amp; Equity</p>
                    <p className="text-lg font-bold text-white mt-0.5 break-words">{money(bsTotals.liabilitiesEquity)}</p>
                  </div>
                  <div
                    className={`rounded-xl px-4 py-3 text-xs border break-words ${
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
        </>
      )}
    </div>
  );
};

export default Dashboard;








// import React, { useCallback, useEffect, useMemo, useState } from "react";
// import type {
//   AccountCategory,
//   AccountTransaction,
//   BalanceSheetData,
//   Client,
//   Creative,
// } from "../../utils/types/Types";
// import { getClients } from "../../service/clientService";
// import { getCreatives } from "../../service/workService";
// import { getBalanceSheet, getChartOfAccounts, getTransactions } from "../../service/Accountservice";
// import {
//   ACCOUNTS_CURRENCY,
//   MONTHS,
//   balanceTotals,
//   fmtDate,
//   monthlySummary,
//   periodStatement,
//   toIso,
// } from "../../service/Accounts";
// import { formatAmount, formatMoney } from "../../utils/currency";

// /* =====================================================================
//    Helpers
//    Every number comes from Firestore through the same functions the
//    Accounts page uses, so the dashboard always matches Accounts.
//    ===================================================================== */
// const money = (n: number) => formatMoney(n, ACCOUNTS_CURRENCY);
// const amt = (n: number) => (n === 0 ? "—" : formatAmount(n, ACCOUNTS_CURRENCY));
// const compact = (n: number) =>
//   new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(n);
// const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

// const card = "bg-[#0f1117] border border-white/5 rounded-2xl";

// // text-base on mobile (16px) stops iOS Safari zooming into inputs
// const inputCls =
//   "bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 sm:py-2 text-base sm:text-xs text-white focus:outline-none focus:border-violet-500/60 transition-colors min-w-0";
// const th = "px-3 py-2.5 text-left text-[10px] uppercase tracking-wider text-zinc-500 font-medium whitespace-nowrap";
// const thR = th + " text-right";
// const td = "px-3 py-2 text-xs text-zinc-300 whitespace-nowrap";
// const tdR = td + " text-right font-mono";

// // scrolls sideways on small screens without showing a scrollbar
// const noScrollbar = "overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

// // first column of the wide month tables (scrolls with the table, not sticky)
// const catCol = "min-w-[140px] sm:min-w-[180px] whitespace-normal sm:whitespace-nowrap";

// const niceMax = (v: number) => {
//   if (v <= 0) return 1;
//   const exp = Math.pow(10, Math.floor(Math.log10(v)));
//   const f = v / exp;
//   return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * exp;
// };

// type Line = { code: string; category: string; amount: number };
// type MonthRow = { code: string; category: string; months: number[]; total: number };
// type MonthPoint = { label: string; income: number; expense: number; net: number };

// const WIDE_FROM = "1900-01-01";
// const WIDE_TO = "2999-12-31";
// const ZEROS = Array.from({ length: 12 }, () => 0);
// const FY_MONTHS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

// /** Indian financial year start (April) for a given date */
// const fyStartOf = (d: Date) => (d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1);

// /** Apr–Dec from the first calendar year + Jan–Mar from the next one */
// const shiftToFy = (a: number[], b: number[]) => [...a.slice(3), ...b.slice(0, 3)];

// /* =====================================================================
//    Small UI pieces
//    ===================================================================== */
// const Kpi: React.FC<{ label: string; value: string; tone: string; footer: React.ReactNode }> = ({
//   label,
//   value,
//   tone,
//   footer,
// }) => (
//   <div className={`${card} p-4 sm:p-5 min-w-0`}>
//     <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-zinc-500">{label}</p>
//     <p className={`text-lg sm:text-2xl font-bold mt-1 sm:mt-1.5 tracking-tight truncate ${tone}`}>{value}</p>
//     <div className="mt-1.5 sm:mt-2 text-[10px] sm:text-[11px] text-zinc-500 sm:min-h-[16px] break-words">{footer}</div>
//   </div>
// );

// const SmallStat: React.FC<{ label: string; value: string; footer: React.ReactNode }> = ({ label, value, footer }) => (
//   <div className={`${card} px-4 sm:px-5 py-3 sm:py-4 min-w-0`}>
//     <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-zinc-500">{label}</p>
//     <p className="text-lg sm:text-xl font-bold text-white mt-1">{value}</p>
//     <div className="mt-1 text-[10px] sm:text-[11px] text-zinc-500 break-words">{footer}</div>
//   </div>
// );

// const Panel: React.FC<{
//   title: string;
//   subtitle?: string;
//   right?: React.ReactNode;
//   children: React.ReactNode;
// }> = ({ title, subtitle, right, children }) => (
//   <div className={`${card} p-4 sm:p-5 min-w-0`}>
//     <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
//       <div className="min-w-0">
//         <p className="text-sm font-semibold text-white">{title}</p>
//         {subtitle && <p className="text-xs text-zinc-600 mt-0.5 break-words">{subtitle}</p>}
//       </div>
//       {right}
//     </div>
//     {children}
//   </div>
// );

// const Empty: React.FC<{ text?: string }> = ({ text = "No data in this period" }) => (
//   <div className="flex items-center justify-center h-32 text-xs text-zinc-600 text-center px-4">{text}</div>
// );

// /** Every category of one kind, with a share bar */
// const CategoryList: React.FC<{ rows: Line[]; total: number; color: string; totalLabel: string }> = ({
//   rows,
//   total,
//   color,
//   totalLabel,
// }) => {
//   if (rows.length === 0) return <Empty />;
//   const max = Math.max(...rows.map((r) => Math.abs(r.amount))) || 1;
//   return (
//     <div>
//       <div className="max-h-[380px] sm:max-h-[420px] overflow-y-auto pr-1 space-y-3">
//         {rows.map((r) => (
//           <div key={r.code}>
//             <div className="flex justify-between gap-3 mb-1">
//               <span className="text-xs text-zinc-300 min-w-0 break-words">{r.category}</span>
//               <span className="text-xs text-zinc-400 font-mono whitespace-nowrap">
//                 {formatAmount(r.amount, ACCOUNTS_CURRENCY)}
//                 <span className="text-zinc-600 ml-2 inline-block w-9 text-right">
//                   {total > 0 ? ((r.amount / total) * 100).toFixed(0) : 0}%
//                 </span>
//               </span>
//             </div>
//             <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
//               <div
//                 className="h-full rounded-full"
//                 style={{ width: `${(Math.abs(r.amount) / max) * 100}%`, background: color }}
//               />
//             </div>
//           </div>
//         ))}
//       </div>
//       <div className="flex justify-between gap-3 pt-3 mt-3 border-t border-white/10 text-sm font-semibold text-white">
//         <span>{totalLabel}</span>
//         <span className="font-mono">{money(total)}</span>
//       </div>
//     </div>
//   );
// };

// /* ---------- Income vs Expense: grouped bars + net line ----------
//    On phones the chart keeps a readable minimum width and scrolls sideways;
//    tap a month to see its numbers (hover works on desktop). */
// const IncomeExpenseChart: React.FC<{ data: MonthPoint[] }> = ({ data }) => {
//   const [hover, setHover] = useState<number | null>(null);
//   const W = 720;
//   const H = 280;
//   const padL = 46;
//   const padR = 10;
//   const padT = 14;
//   const padB = 28;
//   const innerW = W - padL - padR;
//   const innerH = H - padT - padB;

//   if (data.every((d) => d.income === 0 && d.expense === 0)) return <Empty text="No income or expense in this year" />;

//   const maxV = niceMax(Math.max(...data.map((d) => Math.max(d.income, d.expense, d.net)), 0));
//   const minNet = Math.min(...data.map((d) => d.net), 0);
//   const minV = minNet < 0 ? -niceMax(-minNet) : 0;
//   const y = (v: number) => padT + innerH * (1 - (v - minV) / (maxV - minV || 1));
//   const ticks = Array.from({ length: 5 }, (_, i) => minV + ((maxV - minV) * i) / 4);

//   const group = innerW / data.length;
//   const bw = Math.min(group * 0.28, 22);
//   const cx = (i: number) => padL + group * i + group / 2;
//   const netPts = data.map((d, i) => `${cx(i)},${y(d.net)}`).join(" ");

//   const tipW = 142;
//   const tipX = hover === null ? 0 : Math.min(Math.max(cx(hover) - tipW / 2, padL), W - padR - tipW);

//   return (
//     <div>
//       <p className="sm:hidden text-[11px] text-zinc-600 mb-2">Swipe sideways · tap a month for details</p>
//       <div className="overflow-x-auto overscroll-x-contain">
//         <svg
//           viewBox={`0 0 ${W} ${H}`}
//           className="w-full min-w-[600px] h-auto"
//           onMouseLeave={() => setHover(null)}
//         >
//           {ticks.map((t) => (
//             <g key={t}>
//               <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="rgba(255,255,255,0.05)" />
//               <text x={padL - 8} y={y(t) + 3} textAnchor="end" fontSize="10" fill="#71717a">
//                 {compact(t)}
//               </text>
//             </g>
//           ))}
//           {minV < 0 && <line x1={padL} x2={W - padR} y1={y(0)} y2={y(0)} stroke="rgba(255,255,255,0.15)" />}

//           {data.map((d, i) => (
//             <g key={d.label}>
//               {hover === i && (
//                 <rect x={padL + group * i} y={padT} width={group} height={innerH} fill="rgba(255,255,255,0.03)" />
//               )}
//               <rect
//                 x={cx(i) - bw - 1.5}
//                 y={y(d.income)}
//                 width={bw}
//                 height={Math.max(y(0) - y(d.income), 0)}
//                 rx="3"
//                 fill="#10b981"
//               />
//               <rect
//                 x={cx(i) + 1.5}
//                 y={y(d.expense)}
//                 width={bw}
//                 height={Math.max(y(0) - y(d.expense), 0)}
//                 rx="3"
//                 fill="#f87171"
//               />
//               <text x={cx(i)} y={H - 9} textAnchor="middle" fontSize="10" fill="#71717a">
//                 {d.label}
//               </text>
//               <rect
//                 x={padL + group * i}
//                 y={padT}
//                 width={group}
//                 height={innerH + padB}
//                 fill="transparent"
//                 onMouseEnter={() => setHover(i)}
//                 onClick={() => setHover(i)}
//               />
//             </g>
//           ))}

//           <polyline points={netPts} fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinejoin="round" />
//           {data.map((d, i) => (
//             <circle
//               key={d.label}
//               cx={cx(i)}
//               cy={y(d.net)}
//               r={hover === i ? 4 : 2.5}
//               fill="#0f1117"
//               stroke="#8b5cf6"
//               strokeWidth="2"
//             />
//           ))}

//           {hover !== null && (
//             <g pointerEvents="none">
//               <rect x={tipX} y={padT} width={tipW} height={66} rx="8" fill="#171923" stroke="rgba(255,255,255,0.12)" />
//               <text x={tipX + 10} y={padT + 16} fontSize="10" fill="#a1a1aa" fontWeight="600">
//                 {data[hover].label}
//               </text>
//               <text x={tipX + 10} y={padT + 32} fontSize="10" fill="#34d399">
//                 Income  {compact(data[hover].income)}
//               </text>
//               <text x={tipX + 10} y={padT + 45} fontSize="10" fill="#f87171">
//                 Expense  {compact(data[hover].expense)}
//               </text>
//               <text x={tipX + 10} y={padT + 58} fontSize="10" fill="#a78bfa">
//                 Net  {compact(data[hover].net)}
//               </text>
//             </g>
//           )}
//         </svg>
//       </div>
//     </div>
//   );
// };

// /* =====================================================================
//    Dashboard
//    ===================================================================== */
// type Preset = "month" | "last" | "fy" | "all" | "custom";
// type Basis = "fy" | "cal";

// const PRESETS: { id: Exclude<Preset, "custom">; label: string }[] = [
//   { id: "month", label: "This month" },
//   { id: "last", label: "Last month" },
//   { id: "fy", label: "This FY (Apr–Mar)" },
//   { id: "all", label: "All time" },
// ];

// const Dashboard: React.FC = () => {
//   const [clients, setClients] = useState<Client[]>([]);
//   const [creatives, setCreatives] = useState<Creative[]>([]);
//   const [txns, setTxns] = useState<AccountTransaction[]>([]);
//   const [chart, setChart] = useState<AccountCategory[]>([]);
//   const [balance, setBalance] = useState<BalanceSheetData | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");

//   const [preset, setPreset] = useState<Preset>("fy");
//   const [customFrom, setCustomFrom] = useState("");
//   const [customTo, setCustomTo] = useState("");

//   const [basis, setBasis] = useState<Basis>("fy");
//   const [year, setYear] = useState(fyStartOf(new Date()));
//   const [showMatrix, setShowMatrix] = useState(true);

//   /* ---------- fetch everything from Firestore ---------- */
//   const load = useCallback(async () => {
//     setLoading(true);
//     setError("");
//     const names = ["clients", "works", "transactions", "chart of accounts", "balance sheet"];
//     const results = await Promise.allSettled([
//       getClients(),
//       getCreatives(),
//       getTransactions(),
//       getChartOfAccounts(),
//       getBalanceSheet(),
//     ]);
//     if (results[0].status === "fulfilled") setClients(results[0].value);
//     if (results[1].status === "fulfilled") setCreatives(results[1].value);
//     if (results[2].status === "fulfilled") setTxns(results[2].value);
//     if (results[3].status === "fulfilled") setChart(results[3].value);
//     if (results[4].status === "fulfilled") setBalance(results[4].value);

//     const failed = names.filter((_, i) => results[i].status === "rejected");
//     if (failed.length) setError(`Could not load: ${failed.join(", ")}. Showing what is available.`);
//     setLoading(false);
//   }, []);

//   useEffect(() => {
//     load();
//   }, [load]);

//   /* ---------- selected period ---------- */
//   const range = useMemo(() => {
//     const now = new Date();
//     const y = now.getFullYear();
//     const m = now.getMonth();
//     if (preset === "month") return { from: toIso(new Date(y, m, 1)), to: toIso(new Date(y, m + 1, 0)) };
//     if (preset === "last") return { from: toIso(new Date(y, m - 1, 1)), to: toIso(new Date(y, m, 0)) };
//     if (preset === "fy") {
//       const sy = fyStartOf(now);
//       return { from: `${sy}-04-01`, to: `${sy + 1}-03-31` };
//     }
//     if (preset === "all") {
//       const dates = txns.map((t) => t.date).filter(Boolean).sort();
//       const today = toIso(now);
//       const last = dates[dates.length - 1] ?? today;
//       return { from: dates[0] ?? today, to: last > today ? last : today };
//     }
//     return { from: customFrom, to: customTo };
//   }, [preset, customFrom, customTo, txns]);

//   const pickFrom = (v: string) => {
//     setCustomFrom(v);
//     setCustomTo(range.to);
//     setPreset("custom");
//   };
//   const pickTo = (v: string) => {
//     setCustomTo(v);
//     setCustomFrom(range.from);
//     setPreset("custom");
//   };

//   /* ---------- accounting totals ---------- */
//   const st = useMemo(() => periodStatement(txns, chart, range.from, range.to), [txns, chart, range]);
//   const lifetime = useMemo(() => periodStatement(txns, chart, WIDE_FROM, WIDE_TO), [txns, chart]);

//   const incomeRows = useMemo(
//     () => ([...st.income] as Line[]).filter((l) => l.amount !== 0).sort((a, b) => b.amount - a.amount),
//     [st],
//   );
//   const expenseRows = useMemo(
//     () => ([...st.expense] as Line[]).filter((l) => l.amount !== 0).sort((a, b) => b.amount - a.amount),
//     [st],
//   );

//   /* ---------- monthly view (financial year or calendar year) ---------- */
//   const yearOptions = useMemo(() => {
//     const set = new Set<number>([fyStartOf(new Date()), new Date().getFullYear()]);
//     txns.forEach((t) => {
//       if (!t.date) return;
//       const d = new Date(t.date);
//       if (Number.isNaN(d.getTime())) return;
//       set.add(basis === "fy" ? fyStartOf(d) : d.getFullYear());
//     });
//     return [...set].sort((a, b) => b - a);
//   }, [txns, basis]);

//   const switchBasis = (b: Basis) => {
//     setBasis(b);
//     setYear(b === "fy" ? fyStartOf(new Date()) : new Date().getFullYear());
//   };

//   const monthly = useMemo(() => {
//     const a = monthlySummary(txns, chart, year);
//     if (basis === "cal") {
//       return {
//         labels: MONTHS as string[],
//         income: a.income as MonthRow[],
//         expense: a.expense as MonthRow[],
//         incomeByMonth: a.incomeByMonth as number[],
//         expenseByMonth: a.expenseByMonth as number[],
//         netByMonth: a.netByMonth as number[],
//       };
//     }
//     const b = monthlySummary(txns, chart, year + 1);
//     const merge = (A: MonthRow[], B: MonthRow[]): MonthRow[] =>
//       A.map((r) => {
//         const o = B.find((x) => x.code === r.code);
//         const months = shiftToFy(r.months, o?.months ?? ZEROS);
//         return { code: r.code, category: r.category, months, total: sum(months) };
//       });
//     return {
//       labels: FY_MONTHS,
//       income: merge(a.income as MonthRow[], b.income as MonthRow[]),
//       expense: merge(a.expense as MonthRow[], b.expense as MonthRow[]),
//       incomeByMonth: shiftToFy(a.incomeByMonth, b.incomeByMonth),
//       expenseByMonth: shiftToFy(a.expenseByMonth, b.expenseByMonth),
//       netByMonth: shiftToFy(a.netByMonth, b.netByMonth),
//     };
//   }, [txns, chart, year, basis]);

//   const monthPoints: MonthPoint[] = useMemo(
//     () =>
//       monthly.labels.map((label, i) => ({
//         label,
//         income: monthly.incomeByMonth[i] ?? 0,
//         expense: monthly.expenseByMonth[i] ?? 0,
//         net: monthly.netByMonth[i] ?? 0,
//       })),
//     [monthly],
//   );
//   const yearIncome = sum(monthly.incomeByMonth);
//   const yearExpense = sum(monthly.expenseByMonth);
//   const yearLabel = basis === "fy" ? `FY ${year}–${String(year + 1).slice(2)}` : `Calendar year ${year}`;

//   /* ---------- assets (saved Balance Sheet) ---------- */
//   const bsValues = useMemo(() => (balance?.values ?? {}) as Record<string, number>, [balance]);
//   const bsTotals = useMemo(() => balanceTotals(chart, bsValues), [chart, bsValues]);
//   const assetRows: Line[] = useMemo(
//     () =>
//       chart
//         .filter((c) => c.majorHead === "Assets")
//         .map((c) => ({ code: c.code, category: c.name, amount: bsValues[c.code] ?? 0 }))
//         .filter((r) => r.amount !== 0)
//         .sort((a, b) => b.amount - a.amount),
//     [chart, bsValues],
//   );

//   /* ---------- clients & works ---------- */
//   const activeClients = clients.filter((c) => c.status === "active").length;
//   const workCounts = useMemo(() => {
//     const m: Record<string, number> = { poster: 0, reel: 0, website: 0 };
//     creatives.forEach((c) => {
//       m[c.type] = (m[c.type] ?? 0) + 1;
//     });
//     return m;
//   }, [creatives]);

//   const periodLabel = preset === "all" ? "All time" : `${fmtDate(range.from)} – ${fmtDate(range.to)}`;

//   if (loading) {
//     return (
//       <div className="space-y-6 animate-pulse">
//         <div className="h-10 w-full sm:w-72 rounded-xl bg-white/5" />
//         <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
//           {Array.from({ length: 4 }).map((_, i) => (
//             <div key={i} className="h-24 sm:h-28 rounded-2xl bg-white/5" />
//           ))}
//         </div>
//         <div className="h-80 rounded-2xl bg-white/5" />
//       </div>
//     );
//   }

//   const renderMatrix = (label: string, rows: MonthRow[], byMonth: number[], tone: string) => {
//     const visible = rows.filter((r) => r.total !== 0);
//     return (
//       <>
//         <tr className="bg-white/[0.03]">
//           <td colSpan={14} className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-orange-300">
//             {label}
//           </td>
//         </tr>
//         {visible.length === 0 && (
//           <tr>
//             <td colSpan={14} className="px-3 py-3 text-xs text-zinc-600">
//               No {label.toLowerCase()} entries in this period.
//             </td>
//           </tr>
//         )}
//         {visible.map((r) => (
//           <tr key={r.code} className="hover:bg-white/[0.02]">
//             <td className={`${td} ${catCol}`}>{r.category}</td>
//             {r.months.map((v, i) => (
//               <td key={i} className={`${tdR} ${v === 0 ? "text-zinc-700" : ""}`}>
//                 {amt(v)}
//               </td>
//             ))}
//             <td className={`${tdR} text-white`}>{amt(r.total)}</td>
//           </tr>
//         ))}
//         <tr className="bg-orange-500/10">
//           <td className={`${td} ${catCol} font-semibold ${tone}`}>Total {label}</td>
//           {byMonth.map((v, i) => (
//             <td key={i} className={`${tdR} font-semibold ${tone}`}>
//               {amt(v)}
//             </td>
//           ))}
//           <td className={`${tdR} font-semibold ${tone}`}>{amt(sum(byMonth))}</td>
//         </tr>
//       </>
//     );
//   };

//   return (
//     <div className="space-y-5 sm:space-y-6 min-w-0">
//       {/* Header + period */}
//       <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
//         <div>
//           <h2 className="text-lg font-semibold text-white">Business Overview</h2>
//           <p className="text-xs text-zinc-500 mt-0.5">
//             Accounts for {periodLabel} ·{" "}
//             <button onClick={load} className="text-violet-300 hover:text-violet-200 transition-colors">
//               ↻ Refresh
//             </button>
//           </p>
//         </div>

//         <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
//           {/* presets: one swipeable row on mobile */}
//           <div className={`flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10 max-w-full ${noScrollbar}`}>
//             {PRESETS.map((p) => (
//               <button
//                 key={p.id}
//                 onClick={() => setPreset(p.id)}
//                 className={`text-xs px-3 py-2 sm:py-1.5 rounded-lg transition-all whitespace-nowrap flex-shrink-0 ${
//                   preset === p.id ? "bg-violet-600 text-white" : "text-zinc-400 hover:text-white"
//                 }`}
//               >
//                 {p.label}
//               </button>
//             ))}
//           </div>

//           {/* dates: side by side on mobile */}
//           <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
//             <input
//               type="date"
//               className={`${inputCls} w-full sm:w-auto`}
//               value={range.from}
//               onChange={(e) => pickFrom(e.target.value)}
//             />
//             <span className="hidden sm:inline text-xs text-zinc-600">to</span>
//             <input
//               type="date"
//               className={`${inputCls} w-full sm:w-auto`}
//               min={range.from}
//               value={range.to}
//               onChange={(e) => pickTo(e.target.value)}
//             />
//           </div>
//         </div>
//       </div>

//       {error && (
//         <div className="flex items-center justify-between gap-3 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2.5">
//           <span>{error}</span>
//           <button
//             onClick={() => setError("")}
//             className="text-amber-300/70 hover:text-amber-200 text-xl leading-none px-1"
//           >
//             ×
//           </button>
//         </div>
//       )}

//       {/* KPIs */}
//       <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
//         <Kpi
//           label="Total Revenue"
//           value={money(st.totalIncome)}
//           tone="text-emerald-400"
//           footer={<>All time: <span className="text-zinc-300">{money(lifetime.totalIncome)}</span></>}
//         />
//         <Kpi
//           label="Total Expenses"
//           value={money(st.totalExpense)}
//           tone="text-red-400"
//           footer={<>All time: <span className="text-zinc-300">{money(lifetime.totalExpense)}</span></>}
//         />
//         <Kpi
//           label={st.net >= 0 ? "Net Profit" : "Net Loss"}
//           value={money(st.net)}
//           tone={st.net >= 0 ? "text-white" : "text-red-300"}
//           footer={
//             <>
//               Margin {st.totalIncome > 0 ? ((st.net / st.totalIncome) * 100).toFixed(1) : "0.0"}% · All time:{" "}
//               <span className="text-zinc-300">{money(lifetime.net)}</span>
//             </>
//           }
//         />
//         <Kpi
//           label="Total Assets"
//           value={money(bsTotals.assets)}
//           tone="text-sky-300"
//           footer={balance ? <>As of {fmtDate(balance.asOf)} (Balance Sheet)</> : <>Not entered yet in Accounts → Balance Sheet</>}
//         />
//       </div>

//       <div className="grid grid-cols-2 gap-3 sm:gap-4">
//         <SmallStat
//           label="Total Clients"
//           value={String(clients.length)}
//           footer={
//             <>
//               <span className="text-emerald-400">{activeClients} active</span> · {clients.length - activeClients} inactive
//             </>
//           }
//         />
//         <SmallStat
//           label="Total Works"
//           value={String(creatives.length)}
//           footer={`${workCounts.poster ?? 0} posters · ${workCounts.reel ?? 0} reels · ${workCounts.website ?? 0} websites`}
//         />
//       </div>

//       {/* Category-wise income & expense for the selected period */}
//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
//         <Panel title="Income by Category" subtitle={`${incomeRows.length} categories · ${periodLabel}`}>
//           <CategoryList rows={incomeRows} total={st.totalIncome} color="#10b981" totalLabel="Total Income" />
//         </Panel>
//         <Panel title="Expenses by Category" subtitle={`${expenseRows.length} categories · ${periodLabel}`}>
//           <CategoryList rows={expenseRows} total={st.totalExpense} color="#f87171" totalLabel="Total Expense" />
//         </Panel>
//       </div>

//       {(st.otherIn > 0 || st.otherOut > 0) && (
//         <p className="text-xs text-zinc-500 -mt-2 sm:-mt-3">
//           Not counted above: asset, liability &amp; equity entries in this period — money in{" "}
//           <span className="text-zinc-300">{money(st.otherIn)}</span>, money out{" "}
//           <span className="text-zinc-300">{money(st.otherOut)}</span>.
//         </p>
//       )}

//       {/* Monthly */}
//       <Panel
//         title="Monthly Income & Expense"
//         subtitle={`${yearLabel} · income ${money(yearIncome)} · expense ${money(yearExpense)}`}
//         right={
//           <div className="flex items-center gap-2 flex-wrap">
//             <div className="hidden sm:flex items-center gap-3 text-[11px] text-zinc-500 mr-1">
//               <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Income</span>
//               <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-red-400" /> Expense</span>
//               <span className="flex items-center gap-1.5"><i className="w-3 h-0.5 bg-violet-500" /> Net</span>
//             </div>
//             <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
//               {(["fy", "cal"] as Basis[]).map((b) => (
//                 <button
//                   key={b}
//                   onClick={() => switchBasis(b)}
//                   className={`text-xs px-3 py-1.5 sm:py-1 rounded-lg transition-all whitespace-nowrap ${
//                     basis === b ? "bg-violet-600 text-white" : "text-zinc-400 hover:text-white"
//                   }`}
//                 >
//                   {b === "fy" ? "Financial year" : "Calendar year"}
//                 </button>
//               ))}
//             </div>
//             <select className={inputCls} value={year} onChange={(e) => setYear(Number(e.target.value))}>
//               {yearOptions.map((y) => (
//                 <option key={y} value={y} className="bg-[#0f1117]">
//                   {basis === "fy" ? `${y}–${String(y + 1).slice(2)}` : y}
//                 </option>
//               ))}
//             </select>
//           </div>
//         }
//       >
//         {/* legend for phones (the desktop legend is hidden there) */}
//         <div className="sm:hidden flex items-center gap-4 text-[11px] text-zinc-500 mb-3">
//           <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Income</span>
//           <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-red-400" /> Expense</span>
//           <span className="flex items-center gap-1.5"><i className="w-3 h-0.5 bg-violet-500" /> Net</span>
//         </div>

//         <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
//           <div className="xl:col-span-2 min-w-0">
//             <IncomeExpenseChart data={monthPoints} />
//           </div>
//           <div className="overflow-x-auto min-w-0">
//             <table className="w-full">
//               <thead className="border-b border-white/5">
//                 <tr>
//                   <th className={th}>Month</th>
//                   <th className={thR}>Income</th>
//                   <th className={thR}>Expense</th>
//                   <th className={thR}>Net</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-white/5">
//                 {monthPoints.map((m) => (
//                   <tr key={m.label}>
//                     <td className={td}>{m.label}</td>
//                     <td className={`${tdR} text-emerald-400`}>{amt(m.income)}</td>
//                     <td className={`${tdR} text-red-400`}>{amt(m.expense)}</td>
//                     <td className={`${tdR} ${m.net < 0 ? "text-red-300" : "text-zinc-200"}`}>{amt(m.net)}</td>
//                   </tr>
//                 ))}
//                 <tr className="bg-orange-500/10">
//                   <td className={`${td} font-semibold text-white`}>Total</td>
//                   <td className={`${tdR} font-semibold text-emerald-300`}>{amt(yearIncome)}</td>
//                   <td className={`${tdR} font-semibold text-red-300`}>{amt(yearExpense)}</td>
//                   <td className={`${tdR} font-semibold ${yearIncome - yearExpense < 0 ? "text-red-300" : "text-white"}`}>
//                     {amt(yearIncome - yearExpense)}
//                   </td>
//                 </tr>
//               </tbody>
//             </table>
//           </div>
//         </div>
//       </Panel>

//       {/* Category x month */}
//       <Panel
//         title="Category-wise Monthly Detail"
//         subtitle={`Income and expense categories by month · ${yearLabel}`}
//         right={
//           <button
//             onClick={() => setShowMatrix((v) => !v)}
//             className="self-start text-xs px-3 py-2 sm:py-1.5 rounded-lg border border-white/10 text-zinc-300 hover:text-white hover:border-white/20 transition-colors"
//           >
//             {showMatrix ? "Hide" : "Show"}
//           </button>
//         }
//       >
//         {showMatrix && (
//           <>
//             <p className="sm:hidden text-[11px] text-zinc-600 mb-2">Swipe sideways to see all months →</p>
//             <div className="overflow-x-auto overscroll-x-contain -mx-4 px-4 sm:-mx-5 sm:px-5">
//               <table className="w-full">
//                 <thead className="border-b border-white/5">
//                   <tr>
//                     <th className={`${th} ${catCol}`}>Category</th>
//                     {monthly.labels.map((m) => (
//                       <th key={m} className={thR}>
//                         {m}
//                       </th>
//                     ))}
//                     <th className={thR}>Total</th>
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y divide-white/5">
//                   {renderMatrix("Income", monthly.income, monthly.incomeByMonth, "text-emerald-300")}
//                   {renderMatrix("Expense", monthly.expense, monthly.expenseByMonth, "text-red-300")}
//                   <tr className="bg-white/[0.04]">
//                     <td className={`${td} ${catCol} font-semibold text-white`}>
//                       Net (Income − Expense)
//                     </td>
//                     {monthly.netByMonth.map((v, i) => (
//                       <td key={i} className={`${tdR} font-semibold ${v < 0 ? "text-red-300" : "text-white"}`}>
//                         {amt(v)}
//                       </td>
//                     ))}
//                     <td className={`${tdR} font-semibold text-white`}>{amt(sum(monthly.netByMonth))}</td>
//                   </tr>
//                 </tbody>
//               </table>
//             </div>
//           </>
//         )}
//       </Panel>

//       {/* Assets */}
//       <Panel
//         title="Assets"
//         subtitle={balance ? `From the saved Balance Sheet · as of ${fmtDate(balance.asOf)}` : "From the Balance Sheet"}
//       >
//         {!balance || assetRows.length === 0 ? (
//           <Empty text="No asset balances saved yet. Enter them in Accounts → Balance Sheet and they will appear here." />
//         ) : (
//           <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
//             <div className="lg:col-span-2 min-w-0">
//               <CategoryList rows={assetRows} total={bsTotals.assets} color="#0ea5e9" totalLabel="Total Assets" />
//             </div>
//             <div className="space-y-3 content-start">
//               <div className="rounded-xl bg-white/[0.03] border border-white/5 px-4 py-3">
//                 <p className="text-[10px] uppercase tracking-wider text-zinc-500">Liabilities &amp; Equity</p>
//                 <p className="text-lg font-bold text-white mt-0.5 break-words">{money(bsTotals.liabilitiesEquity)}</p>
//               </div>
//               <div
//                 className={`rounded-xl px-4 py-3 text-xs border break-words ${
//                   Math.abs(bsTotals.diff) < 0.005
//                     ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
//                     : "bg-red-500/10 border-red-500/20 text-red-300"
//                 }`}
//               >
//                 Assets − Liabilities &amp; Equity: <span className="font-mono font-semibold">{money(bsTotals.diff)}</span>
//                 {Math.abs(bsTotals.diff) < 0.005 ? " · Balanced" : " · Not balanced"}
//               </div>
//             </div>
//           </div>
//         )}
//       </Panel>
//     </div>
//   );
// };

// export default Dashboard;