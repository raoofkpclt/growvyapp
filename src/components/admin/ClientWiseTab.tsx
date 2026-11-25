import React, { useMemo, useState } from "react";
import type { AccountTransaction } from "../../utils/types/Types";
import { ACCOUNTS_CURRENCY } from "../../service/Accounts";
import { formatAmount } from "../../utils/currency";

const card = "bg-[#0f1117] border border-white/5 rounded-2xl";
const inputCls =
  "bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 sm:py-2 text-base sm:text-xs text-white focus:outline-none focus:border-violet-500/60 transition-colors min-w-0";
const th = "px-3 py-2.5 text-left text-[10px] uppercase tracking-wider text-zinc-500 font-medium whitespace-nowrap";
const thR = th + " text-right";
const td = "px-3 py-2.5 text-xs text-zinc-300";
const tdR = td + " text-right font-mono whitespace-nowrap";

const amt = (n: number) => (n === 0 ? "—" : formatAmount(n, ACCOUNTS_CURRENCY));

/** Small "label / value" cell used inside the phone cards. */
const Mini: React.FC<{ label: string; value: string; tone?: string }> = ({ label, value, tone = "text-zinc-300" }) => (
  <div className="min-w-0">
    <p className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</p>
    <p className={`mt-0.5 break-words font-mono text-xs ${tone}`}>{value}</p>
  </div>
);

/** Income and expense grouped by client (transactions with no client are grouped as "No client"). */
const ClientWiseTab: React.FC<{ txns: AccountTransaction[] }> = ({ txns }) => {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const rows = useMemo(() => {
    const m = new Map<string, { name: string; income: number; expense: number; count: number }>();
    txns.forEach((t) => {
      if (from && t.date < from) return;
      if (to && t.date > to) return;
      const key = t.clientId || "";
      const r = m.get(key) ?? { name: key ? t.clientName || "Unnamed client" : "No client", income: 0, expense: 0, count: 0 };
      r.income += t.income;
      r.expense += t.expense;
      r.count += 1;
      m.set(key, r);
    });
    return [...m.entries()]
      .map(([key, r]) => ({ key, ...r, net: r.income - r.expense }))
      .sort((a, b) => (a.key === "" ? 1 : b.key === "" ? -1 : b.income + b.expense - (a.income + a.expense)));
  }, [txns, from, to]);

  const sum = rows.reduce(
    (a, r) => ({ income: a.income + r.income, expense: a.expense + r.expense }),
    { income: 0, expense: 0 },
  );
  const sumNet = sum.income - sum.expense;

  return (
    <div className="min-w-0 space-y-4">
      {/* date filter: labels above the fields on phones, inline from sm */}
      <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
        <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
          <label htmlFor="cw-from" className="text-[11px] text-zinc-500 sm:text-xs">
            From
          </label>
          <input
            id="cw-from"
            type="date"
            className={`${inputCls} w-full`}
            value={from}
            max={to || undefined}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
          <label htmlFor="cw-to" className="text-[11px] text-zinc-500 sm:text-xs">
            To
          </label>
          <input
            id="cw-to"
            type="date"
            className={`${inputCls} w-full`}
            min={from}
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        {(from || to) && (
          <button
            onClick={() => {
              setFrom("");
              setTo("");
            }}
            className="col-span-2 min-h-10 rounded-lg border border-white/10 px-3 text-xs text-zinc-300 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 sm:col-span-1 sm:min-h-0 sm:py-1.5"
          >
            All time
          </button>
        )}
      </div>

      {/* phones: one card per client */}
      <div className="space-y-2.5 md:hidden">
        {rows.length === 0 ? (
          <div className={`${card} px-4 py-8 text-center text-xs text-zinc-600`}>No transactions in this period.</div>
        ) : (
          <>
            {rows.map((r) => (
              <div key={r.key || "none"} className={`${card} p-3.5`}>
                <div className="flex items-start justify-between gap-3">
                  <p className={`min-w-0 break-words text-sm font-medium ${r.key ? "text-zinc-100" : "text-zinc-500"}`}>
                    {r.name}
                  </p>
                  <p
                    className={`shrink-0 whitespace-nowrap font-mono text-sm font-semibold ${
                      r.net < 0 ? "text-red-300" : "text-zinc-100"
                    }`}
                  >
                    <span className="sr-only">Net </span>
                    {formatAmount(r.net, ACCOUNTS_CURRENCY)}
                  </p>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3 border-t border-white/5 pt-3">
                  <Mini label="Income" value={amt(r.income)} tone="text-emerald-400" />
                  <Mini label="Expense" value={amt(r.expense)} tone="text-red-400" />
                  <Mini label="Entries" value={String(r.count)} tone="text-zinc-400" />
                </div>
              </div>
            ))}

            <div className="rounded-2xl border border-orange-500/20 bg-orange-500/10 p-3.5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-white">Total</p>
                <p
                  className={`whitespace-nowrap font-mono text-sm font-semibold ${
                    sumNet < 0 ? "text-red-300" : "text-white"
                  }`}
                >
                  {formatAmount(sumNet, ACCOUNTS_CURRENCY)}
                </p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 border-t border-orange-500/15 pt-3">
                <Mini label="Income" value={amt(sum.income)} tone="text-emerald-300" />
                <Mini label="Expense" value={amt(sum.expense)} tone="text-red-300" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* tablets and desktop: the table */}
      <div className={`${card} hidden overflow-hidden md:block`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-white/5">
              <tr>
                <th scope="col" className={th}>Client</th>
                <th scope="col" className={thR}>Entries</th>
                <th scope="col" className={thR}>Income</th>
                <th scope="col" className={thR}>Expense</th>
                <th scope="col" className={thR}>Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((r) => (
                <tr key={r.key || "none"} className="hover:bg-white/[0.02]">
                  <td className={`${td} ${r.key ? "text-zinc-100" : "text-zinc-500"}`}>{r.name}</td>
                  <td className={`${tdR} text-zinc-500`}>{r.count}</td>
                  <td className={`${tdR} text-emerald-400`}>{amt(r.income)}</td>
                  <td className={`${tdR} text-red-400`}>{amt(r.expense)}</td>
                  <td className={`${tdR} ${r.net < 0 ? "text-red-300" : "text-zinc-200"}`}>
                    {formatAmount(r.net, ACCOUNTS_CURRENCY)}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-zinc-600">
                    No transactions in this period.
                  </td>
                </tr>
              )}
              {rows.length > 0 && (
                <tr className="bg-orange-500/10">
                  <td className={`${td} font-semibold text-white`}>Total</td>
                  <td className={tdR} />
                  <td className={`${tdR} font-semibold text-emerald-300`}>{amt(sum.income)}</td>
                  <td className={`${tdR} font-semibold text-red-300`}>{amt(sum.expense)}</td>
                  <td className={`${tdR} font-semibold ${sumNet < 0 ? "text-red-300" : "text-white"}`}>
                    {formatAmount(sumNet, ACCOUNTS_CURRENCY)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ClientWiseTab;