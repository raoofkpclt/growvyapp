import { useState } from "react";
import { listStaff, type Staff } from "../../service/staffService";
import { listMyTasks, STATUS_LABELS, type Task } from "../../service/TaskService";
import { ROLE_LABELS } from "../../utils/types/staffRoles";
import { Btn, Card, Notice, useLoad } from "../admin/Modal/Ui";
import { SectionHead, SegBar, StatCard, TONE_CYCLE } from "./DashboardParts";

/**
 * Team work: counts only (no task cards).
 *   - how many tasks the team has in each status
 *   - how many each person has, split by status
 * For the operation manager, HR and board (anyone with "tasks.all").
 *
 * Layout: cards per person on phones, a table from `md` up. Both are paginated
 * (PAGE_SIZE per page); the totals at the top cover everyone.
 *
 * Save as: src/components/staff/TeamWorkOverview.tsx
 */
type Row = { staff: Staff; tasks: Task[] };

// people shown per page
const PAGE_SIZE = 10;

const STATUS_KEYS = Object.keys(STATUS_LABELS);
const toneOf = (key: string) => TONE_CYCLE[STATUS_KEYS.indexOf(key) % TONE_CYCLE.length];
const countOf = (tasks: Task[], status: string) => tasks.filter((t) => t.status === status).length;

/** page numbers with "…" gaps, e.g. 1 … 4 5 6 … 12 */
const pageList = (current: number, pages: number): (number | "gap")[] => {
  const keep = new Set([1, pages, current - 1, current, current + 1]);
  const nums = [...keep].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  nums.forEach((n, i) => {
    if (i > 0 && n - nums[i - 1] > 1) out.push("gap");
    out.push(n);
  });
  return out;
};

const Pagination = ({
  page,
  pages,
  total,
  size,
  onChange,
}: {
  page: number;
  pages: number;
  total: number;
  size: number;
  onChange: (p: number) => void;
}) => {
  if (total <= size) return null;
  const from = (page - 1) * size + 1;
  const to = Math.min(page * size, total);

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
      <p className="text-xs text-zinc-500">
        Showing {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-1.5">
        <Btn variant="ghost" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Prev
        </Btn>
        {/* numbered buttons need room, so phones only get "Page x of y" */}
        <div className="hidden items-center gap-1 sm:flex">
          {pageList(page, pages).map((n, i) =>
            n === "gap" ? (
              <span key={`gap-${i}`} className="px-1 text-zinc-500">
                …
              </span>
            ) : (
              <button
                key={n}
                type="button"
                onClick={() => onChange(n)}
                aria-current={n === page ? "page" : undefined}
                className={`h-8 min-w-8 rounded-md px-2 text-xs transition ${
                  n === page
                    ? "bg-violet-500/20 font-medium text-violet-200"
                    : "text-zinc-400 hover:bg-white/5"
                }`}
              >
                {n}
              </button>
            )
          )}
        </div>
        <span className="px-2 text-xs text-zinc-400 sm:hidden">
          Page {page} of {pages}
        </span>
        <Btn variant="ghost" disabled={page >= pages} onClick={() => onChange(page + 1)}>
          Next
        </Btn>
      </div>
    </div>
  );
};

const TeamWorkOverview = () => {
  const [page, setPage] = useState(1);

  const rows = useLoad(
    async () => {
      const active = (await listStaff()).filter((s) => s.active);
      return Promise.all(
        active.map(async (s) => ({
          staff: s,
          tasks: await listMyTasks(s.uid).catch(() => [] as Task[]),
        }))
      );
    },
    [],
    [] as Row[]
  );

  const totals = STATUS_KEYS.map((k) => ({
    key: k,
    label: STATUS_LABELS[k as keyof typeof STATUS_LABELS] as string,
    value: rows.data.reduce((s, r) => s + countOf(r.tasks, k), 0),
  }));
  const grandTotal = totals.reduce((s, t) => s + t.value, 0);

  const people = [...rows.data].sort((a, b) => b.tasks.length - a.tasks.length);
  const withWork = rows.data.filter((r) => r.tasks.length > 0).length;

  // paginate; the page is clamped so it stays valid after a refresh
  const pages = Math.max(1, Math.ceil(people.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const pageRows = people.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const emptyText = rows.loading ? "Loading…" : "No staff found.";

  return (
    <section className="w-full min-w-0 space-y-4">
      <SectionHead
        title="Team work"
        sub="Tasks assigned across the team, by status and by person."
        action={
          <Btn variant="ghost" onClick={rows.reload} disabled={rows.loading}>
            {rows.loading ? "Loading…" : "Refresh"}
          </Btn>
        }
      />

      <Notice message={rows.error} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total assigned" value={grandTotal} sub={`across ${withWork} people`} tone="violet" />
        {totals.map((t) => (
          <StatCard key={t.key} label={t.label} value={t.value} tone={toneOf(t.key)} />
        ))}
      </div>

      <Card className="p-3 sm:p-4">
        <SegBar
          parts={totals.map((t) => ({ label: t.label, value: t.value, tone: toneOf(t.key) }))}
        />
      </Card>

      {/* phones: one card per person */}
      <div className="space-y-3 md:hidden">
        {pageRows.map((r) => (
          <Card key={r.staff.uid} className="p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words font-medium text-white">{r.staff.name}</p>
                <p className="text-[11px] text-zinc-500">{ROLE_LABELS[r.staff.role] ?? ""}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-lg font-semibold tabular-nums text-white">{r.tasks.length}</p>
                <p className="text-[11px] text-zinc-500">total</p>
              </div>
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-white/5 pt-3 min-[420px]:grid-cols-3">
              {totals.map((t) => {
                const n = countOf(r.tasks, t.key);
                return (
                  <div key={t.key} className="min-w-0">
                    <dt className="truncate text-[11px] text-zinc-500">{t.label}</dt>
                    <dd className={`text-sm tabular-nums ${n ? "text-zinc-100" : "text-zinc-700"}`}>
                      {n}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </Card>
        ))}
        {!people.length && (
          <Card className="p-8 text-center text-sm text-zinc-500">{emptyText}</Card>
        )}
      </div>

      {/* md and up: the table */}
      <Card className="hidden overflow-hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/5 text-[11px] uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3 font-medium">Person</th>
                {totals.map((t) => (
                  <th key={t.key} className="px-3 py-3 text-center font-medium">
                    {t.label}
                  </th>
                ))}
                <th className="px-4 py-3 text-center font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {pageRows.map((r) => (
                <tr key={r.staff.uid} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{r.staff.name}</p>
                    <p className="text-[11px] text-zinc-500">{ROLE_LABELS[r.staff.role] ?? ""}</p>
                  </td>
                  {totals.map((t) => {
                    const n = countOf(r.tasks, t.key);
                    return (
                      <td
                        key={t.key}
                        className={`px-3 py-3 text-center tabular-nums ${
                          n ? "text-zinc-100" : "text-zinc-700"
                        }`}
                      >
                        {n}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-center font-semibold tabular-nums text-white">
                    {r.tasks.length}
                  </td>
                </tr>
              ))}
              {!people.length && (
                <tr>
                  <td colSpan={totals.length + 2} className="px-4 py-8 text-center text-sm text-zinc-500">
                    {emptyText}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Pagination
        page={current}
        pages={pages}
        total={people.length}
        size={PAGE_SIZE}
        onChange={setPage}
      />
    </section>
  );
};

export default TeamWorkOverview;