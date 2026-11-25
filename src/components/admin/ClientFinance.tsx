import React, { useEffect, useMemo, useState } from "react";
import type { AccountCategory, AccountTransaction, Client } from "../../utils/types/Types";
import TransactionModal from "./Modal/Transactionmodal";
import DeleteConfirmModal from "./Modal/DeleteConfirmModal";
import { deleteTransaction, getChartOfAccounts, getTransactions } from "../../service/Accountservice";
import { ACCOUNTS_CURRENCY, fmtDate } from "../../service/Accounts";
import { formatAmount, formatMoney } from "../../utils/currency";

const card = "bg-[#0f1117] border border-white/5 rounded-2xl";
type Flow = "all" | "income" | "expense";

/** Income and expense of one client, from the Accounts cash book. Used as a tab in the Client details page. */
const ClientFinance: React.FC<{ client: Client; clientId: string }> = ({ client, clientId }) => {
  const [txns, setTxns] = useState<AccountTransaction[]>([]);
  const [chart, setChart] = useState<AccountCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [flow, setFlow] = useState<Flow>("all");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<AccountTransaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AccountTransaction | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([getTransactions(), getChartOfAccounts()])
      .then(([t, c]) => {
        if (!alive) return;
        setTxns(t);
        setChart(c);
      })
      .catch((e) => {
        console.log(e);
        if (alive) setError("Could not load income and expense.");
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [clientId]);

  const mine = useMemo(
    () =>
      txns
        .filter((t) => t.clientId === clientId)
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt),
    [txns, clientId],
  );

  const income = mine.reduce((s, t) => s + t.income, 0);
  const expense = mine.reduce((s, t) => s + t.expense, 0);
  const net = income - expense;

  const visible = mine.filter(
    (t) => flow === "all" || (flow === "income" ? t.income > 0 : t.expense > 0),
  );

  const handleDelete = async () => {
    if (!deleteTarget?.firestoreId) return;
    try {
      setDeleting(true);
      await deleteTransaction(deleteTarget.firestoreId);
      setTxns((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e) {
      console.log(e);
      setError("Could not delete the transaction.");
    } finally {
      setDeleting(false);
    }
  };

  const stat = (label: string, value: number, tone: string, className = "") => {
    const text = formatMoney(value, ACCOUNTS_CURRENCY);
    return (
      <div className={`${card} min-w-0 px-4 py-3 ${className}`}>
        <p className="mb-1 text-[11px] uppercase tracking-wider text-zinc-500">{label}</p>
        <p title={text} className={`truncate text-lg font-bold sm:text-xl ${tone}`}>
          {text}
        </p>
      </div>
    );
  };

  return (
    <div className="min-w-0 space-y-4 sm:space-y-5">
      {error && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-xl border border-red-500/20 bg-red-500/10 py-2 pl-4 pr-2 text-xs text-red-300"
        >
          <span className="break-words py-1.5">{error}</span>
          <button
            onClick={() => setError("")}
            aria-label="Dismiss"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base leading-none text-red-300/70 hover:bg-white/5 hover:text-red-200"
          >
            ×
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-white">Income &amp; Expense</h3>
          <p className="mt-0.5 break-words text-xs text-zinc-500">
            {mine.length} transactions for {client.name}
          </p>
        </div>
        <button
          onClick={() => setAdding(true)}
          disabled={loading}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-medium text-white transition-colors hover:bg-violet-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 disabled:opacity-40 sm:w-auto"
        >
          <span className="text-base leading-none">+</span> Add Transaction
        </button>
      </div>

      {/* income + expense side by side on phones, net underneath across the full width */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
        {stat("Total income", income, "text-emerald-400")}
        {stat("Total expense", expense, "text-red-400")}
        {stat(
          net >= 0 ? "Net profit" : "Net loss",
          net,
          net >= 0 ? "text-emerald-300" : "text-red-400",
          "col-span-2 sm:col-span-1",
        )}
      </div>

      {/* filter: three equal segments on phones */}
      <div
        role="tablist"
        aria-label="Transaction type"
        className="grid w-full grid-cols-3 gap-1 rounded-xl border border-white/10 bg-white/5 p-1 sm:inline-grid sm:w-fit"
      >
        {(["all", "income", "expense"] as const).map((f) => (
          <button
            key={f}
            role="tab"
            aria-selected={flow === f}
            onClick={() => setFlow(f)}
            className={`min-h-10 whitespace-nowrap rounded-lg px-4 text-xs capitalize transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 ${
              flow === f ? "bg-violet-600 text-white" : "text-zinc-400 hover:text-white"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="animate-pulse space-y-2 motion-reduce:animate-none">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-white/5" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-4 py-12 text-center text-zinc-600 sm:py-16">
          <div className="mb-3 text-4xl">💰</div>
          <p className="break-words text-sm">
            {mine.length === 0
              ? `No income or expense for ${client.name} yet. Add the first transaction.`
              : "No transactions in this type."}
          </p>
        </div>
      ) : (
        <div className={`${card} overflow-hidden`}>
          {visible.map((t, i) => {
            const isIncome = t.income > 0;
            return (
              /* phones: icon, details and amount on the first line, Edit / Delete on the second.
                 sm and up: everything on one line */
              <div
                key={t.id}
                className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2.5 px-3 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] sm:px-4 ${
                  i > 0 ? "border-t border-white/5" : ""
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base font-semibold ${
                    isIncome ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"
                  }`}
                  aria-hidden="true"
                >
                  {isIncome ? "↓" : "↑"}
                </span>

                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{t.category || "—"}</p>
                  <p className="line-clamp-2 break-words text-xs text-zinc-500 sm:line-clamp-1">
                    {fmtDate(t.date)}
                    {t.description ? ` · ${t.description}` : ""}
                  </p>
                </div>

                <p
                  className={`whitespace-nowrap text-right font-mono text-[13px] font-semibold sm:text-sm ${
                    isIncome ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  <span className="sr-only">{isIncome ? "Income " : "Expense "}</span>
                  {isIncome ? "+" : "−"} {formatAmount(isIncome ? t.income : t.expense, ACCOUNTS_CURRENCY)}
                </p>

                <div className="col-span-3 flex justify-end gap-2 sm:col-span-1">
                  <button
                    onClick={() => setEditing(t)}
                    className="min-h-9 rounded-lg bg-white/5 px-3.5 text-xs text-zinc-300 transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteTarget(t)}
                    className="min-h-9 rounded-lg bg-red-500/10 px-3.5 text-xs text-red-300 transition hover:bg-red-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {adding && (
        <TransactionModal
          chart={chart}
          clients={[client]}
          defaultClientId={clientId}
          lockClient
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
          clients={[client]}
          lockClient
          onClose={() => setEditing(null)}
          onSave={(t) => {
            setTxns((prev) => prev.map((x) => (x.id === t.id ? t : x)));
            setEditing(null);
          }}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          loading={deleting}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
};

export default ClientFinance;