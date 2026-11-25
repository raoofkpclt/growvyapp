import { useState } from "react";
import { auth } from "../../config/firebase/firebase";
import { listPlans, type Plan } from "../../service/PlanService";
import type { Client } from "../../utils/types/Types";
import { Card, Notice, useLoad } from "./Modal/Ui";
import { PlanDetail, clientKey } from "./PlanManagement";
import ClientWorks from "./ClientWorks";
import ClientBills from "./ClientBills";
import ClientFinance from "./ClientFinance";
import TasksPanel from "../admin/TasksPanel";

type TabId = "plans" | "works" | "tasks" | "invoices" | "finance";

const TABS: { id: TabId; label: string }[] = [
  { id: "plans", label: "Plans" },
  { id: "works", label: "Works" },
  { id: "tasks", label: "Tasks" },
  { id: "invoices", label: "Invoices" },
  { id: "finance", label: "Income & Expense" },
];

/* ───────────────────────── page ───────────────────────── */

const ClientDetails = ({ client, onBack }: { client: Client; onBack: () => void }) => {
  const [tab, setTab] = useState<TabId>("plans");
  const [flash, setFlash] = useState("");

  const me = auth.currentUser;
  const viewer = { uid: me?.uid ?? "admin", name: me?.displayName ?? me?.email ?? "Admin" };

  const clientId = clientKey(client);
  const photo = client.profileImage;
  const plans = useLoad(() => listPlans(), [], [] as Plan[]);
  const plan = plans.data.find((p) => p.clientId === clientId);

  const changed = (msg: string) => {
    plans.reload();
    setFlash(msg);
    setTimeout(() => setFlash(""), 4000);
  };

  return (
    <div className="animate-fade-in min-w-0 space-y-4 motion-reduce:animate-none sm:space-y-5">
      {/* back */}
      <button
        onClick={onBack}
        className="inline-flex min-h-10 items-center rounded-lg border border-white/10 px-3 text-sm text-zinc-400 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60"
      >
        ← Clients
      </button>

      {/* header */}
      <div className="flex items-center gap-3 sm:gap-4">
        {photo ? (
          <img
            src={photo}
            alt={client.name}
            className="h-12 w-12 shrink-0 rounded-2xl border border-white/10 object-cover sm:h-16 sm:w-16"
          />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-lg font-semibold text-white sm:h-16 sm:w-16 sm:text-xl">
            {client.name?.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h2 className="min-w-0 break-words text-lg font-semibold leading-tight text-white sm:truncate sm:text-xl">
              {client.name}
            </h2>
            <span
              className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${
                client.status === "active"
                  ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-300"
                  : "border-zinc-500/30 bg-zinc-500/20 text-zinc-300"
              }`}
            >
              {client.status}
            </span>
          </div>
          {/* each on its own line on phones so long emails never get cut off */}
          <div className="mt-0.5 flex flex-col text-xs text-zinc-500 sm:flex-row sm:flex-wrap sm:gap-x-2">
            {client.mobile && <span className="break-all">{client.mobile}</span>}
            {client.mobile && client.email && (
              <span className="hidden sm:inline" aria-hidden="true">
                ·
              </span>
            )}
            {client.email && <span className="break-all">{client.email}</span>}
          </div>
          {client.address && (
            <p className="mt-0.5 line-clamp-2 break-words text-xs text-zinc-600">{client.address}</p>
          )}
        </div>
      </div>

      {/* tabs: swipe sideways on small screens, tapping one centres it */}
      <div
        role="tablist"
        aria-label="Client sections"
        className="-mx-1 flex snap-x gap-1 overflow-x-auto rounded-xl border border-white/5 bg-white/[0.03] p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={(e) => {
              setTab(t.id);
              e.currentTarget.scrollIntoView({
                behavior: "smooth",
                inline: "center",
                block: "nearest",
              });
            }}
            className={`min-h-10 shrink-0 snap-center whitespace-nowrap rounded-lg px-3.5 text-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 sm:px-4 ${
              tab === t.id ? "bg-violet-600 text-white shadow" : "text-zinc-400 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Notice message={plans.error} />
      {flash && (
        <p
          role="status"
          className="break-words rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
        >
          {flash}
        </p>
      )}

      {/* content: min-w-0 lets wide tables scroll inside their own box instead of the page */}
      <div className="min-w-0">
        {tab === "plans" &&
          (plans.loading && !plan ? (
            <Card className="p-8 text-center text-sm text-zinc-500">Loading…</Card>
          ) : (
            <PlanDetail
              key={`${clientId}-plan`}
              view="plan"
              client={client}
              clientId={clientId}
              plan={plan}
              viewer={viewer}
              onChanged={changed}
            />
          ))}

        {tab === "invoices" && (
          <div className="space-y-6 sm:space-y-8">
            {/* invoices (with saved PDFs) */}
            <ClientBills key={clientId} client={client} clientId={clientId} />

            {/* invoices created from the client's plan (remove this block if you don't use them) */}
            {plan && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-zinc-300">Plan invoices</h3>
                <PlanDetail
                  key={`${clientId}-invoices`}
                  view="invoices"
                  client={client}
                  clientId={clientId}
                  plan={plan}
                  viewer={viewer}
                  onChanged={changed}
                />
              </div>
            )}
          </div>
        )}

        {tab === "finance" && <ClientFinance key={clientId} client={client} clientId={clientId} />}
        {tab === "works" && <ClientWorks key={clientId} client={client} clientId={clientId} />}
        {tab === "tasks" && (
          <TasksPanel
            key={clientId}
            viewer={viewer}
            scope="all"
            canAssign
            canFeedback
            isAdmin
            clientId={clientId}
            clientName={client.name}
          />
        )}
      </div>
    </div>
  );
};

export default ClientDetails;