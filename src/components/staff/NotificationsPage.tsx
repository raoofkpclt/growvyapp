import { useEffect, useMemo, useState } from "react";
import {
  clearAll,
  deleteNotification,
  markAllRead,
  markRead,
  subscribeNotifications,
  TYPE_META,
  type AppNotification,
  type NotificationType,
  type Tone,
} from "../../service/NotificationService";
import ConfirmModal from "../admin/Modal/ConfirmModal"; // adjust path to where ConfirmModal lives

/**
 * Full-page notification history (same data as the bell).
 * The bell in the top bar still plays the sound and shows the pop-ups.
 * The history is paginated (PAGE_SIZE per page).
 *
 * Save as: src/components/staff/NotificationsPage.tsx
 */

// notifications shown per page
const PAGE_SIZE = 15;

const DOT: Record<Tone, string> = {
  violet: "bg-violet-400",
  emerald: "bg-emerald-400",
  amber: "bg-amber-400",
  sky: "bg-sky-400",
  red: "bg-red-400",
  zinc: "bg-zinc-400",
};

const TEXT: Record<Tone, string> = {
  violet: "text-violet-300",
  emerald: "text-emerald-300",
  amber: "text-amber-300",
  sky: "text-sky-300",
  red: "text-red-300",
  zinc: "text-zinc-300",
};

const timeLabel = (ms: number) =>
  new Date(ms).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

const dayLabel = (ms: number) => {
  const d = new Date(ms);
  const today = new Date();
  const y = new Date();
  y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

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
      <div className="flex items-center gap-1.5 text-sm">
        <button
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="rounded-lg border border-white/10 px-3 py-2 text-zinc-300 hover:bg-white/5 disabled:opacity-40"
        >
          Prev
        </button>
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
                onClick={() => onChange(n)}
                aria-current={n === page ? "page" : undefined}
                className={`h-9 min-w-9 rounded-lg px-2 text-xs transition-colors ${
                  n === page
                    ? "bg-violet-500/15 font-medium text-violet-300"
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
        <button
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
          className="rounded-lg border border-white/10 px-3 py-2 text-zinc-300 hover:bg-white/5 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
};

const NotificationsPage = ({
  uid,
  onOpen,
}: {
  uid: string;
  /** called when a notification is clicked (e.g. jump to the Tasks page) */
  onOpen?: (n: AppNotification) => void;
}) => {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [type, setType] = useState<"all" | NotificationType>("all");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    if (!uid) return;
    return subscribeNotifications(uid, (list) => {
      setItems(list);
      setLoading(false);
    });
  }, [uid]);

  const unread = items.filter((n) => !n.read).length;

  // filter → paginate → group the current page by day
  const { total, pages, current, groups } = useMemo(() => {
    const shown = items.filter(
      (n) => (filter === "all" || !n.read) && (type === "all" || n.type === type)
    );
    const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
    const current = Math.min(page, pages); // stays valid when items are deleted or marked read
    const slice = shown.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

    const map = new Map<string, AppNotification[]>();
    slice.forEach((n) => {
      const k = dayLabel(n.createdAt);
      map.set(k, [...(map.get(k) ?? []), n]);
    });
    return { total: shown.length, pages, current, groups: [...map.entries()] };
  }, [items, filter, type, page]);

  const changeFilter = (f: "all" | "unread") => {
    setFilter(f);
    setPage(1);
  };

  const changeType = (t: "all" | NotificationType) => {
    setType(t);
    setPage(1);
  };

  const goTo = (p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  const openItem = (n: AppNotification) => {
    if (!n.read) void markRead(n.id);
    onOpen?.(n);
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* summary + actions */}
      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#0d0f15] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <h2 className="font-display text-lg font-bold text-white sm:text-xl">Notifications</h2>
          <p className="mt-1 text-sm text-zinc-500">
            {unread ? `${unread} unread` : "You're all caught up"} · {items.length} in history
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm sm:flex sm:flex-wrap">
          <button
            disabled={busy || !unread}
            onClick={() => run(() => markAllRead(uid))}
            className="rounded-xl border border-white/10 px-4 py-2.5 text-zinc-200 hover:bg-white/5 disabled:opacity-40"
          >
            Mark all read
          </button>
          <button
            disabled={busy || !items.length}
            onClick={() => setConfirmClear(true)}
            className="rounded-xl border border-red-500/20 px-4 py-2.5 text-red-300 hover:bg-red-500/10 disabled:opacity-40"
          >
            Clear all
          </button>
        </div>
      </div>

      {/* filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="grid grid-cols-2 rounded-xl border border-white/10 p-0.5 text-sm sm:flex sm:w-fit">
          {(["all", "unread"] as const).map((f) => (
            <button
              key={f}
              onClick={() => changeFilter(f)}
              className={`rounded-lg px-4 py-2 capitalize transition-colors sm:py-1.5 ${
                filter === f ? "bg-violet-500/15 text-violet-300" : "text-zinc-500 hover:text-white"
              }`}
            >
              {f}
              {f === "unread" && unread > 0 ? ` (${unread})` : ""}
            </button>
          ))}
        </div>

        <select
          value={type}
          onChange={(e) => changeType(e.target.value as "all" | NotificationType)}
          className="w-full rounded-xl border border-white/10 bg-[#0d0f15] px-3 py-2.5 text-base text-zinc-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 sm:w-auto sm:py-2 sm:text-sm"
        >
          <option value="all">All types</option>
          {(Object.keys(TYPE_META) as NotificationType[]).map((t) => (
            <option key={t} value={t}>
              {TYPE_META[t].label}
            </option>
          ))}
        </select>
      </div>

      {/* list */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d0f15]">
        {groups.map(([day, list]) => (
          <div key={day}>
            <p className="border-b border-white/5 bg-white/[0.02] px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-zinc-500 sm:px-5">
              {day}
            </p>
            <ul className="divide-y divide-white/5">
              {list.map((n) => {
                const meta = TYPE_META[n.type] ?? { label: "Update", tone: "zinc" as Tone };
                return (
                  <li
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-3.5 sm:px-5 sm:py-4 ${
                      n.read ? "" : "bg-white/[0.03]"
                    }`}
                  >
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        n.read ? "bg-zinc-700" : DOT[meta.tone]
                      }`}
                    />

                    {/* phones: text on top, actions underneath; larger screens: side by side */}
                    <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
                      <button onClick={() => openItem(n)} className="min-w-0 flex-1 text-left">
                        <div className="flex flex-wrap items-center gap-x-2">
                          <p
                            className={`break-words text-sm ${
                              n.read ? "text-zinc-300" : "font-semibold text-white"
                            }`}
                          >
                            {n.title}
                          </p>
                          <span className={`text-[10px] font-medium uppercase tracking-wide ${TEXT[meta.tone]}`}>
                            {meta.label}
                          </span>
                        </div>
                        <p className="mt-0.5 break-words text-sm leading-snug text-zinc-400">{n.message}</p>
                        <p className="mt-1 text-[11px] text-zinc-600">{timeLabel(n.createdAt)}</p>
                      </button>

                      <div className="flex shrink-0 items-center gap-1 sm:justify-end">
                        {!n.read && (
                          <button
                            onClick={() => void markRead(n.id)}
                            className="min-h-9 rounded-md px-2.5 py-1 text-xs text-zinc-400 hover:bg-white/5 hover:text-white"
                          >
                            Mark read
                          </button>
                        )}
                        <button
                          onClick={() => void deleteNotification(n.id)}
                          aria-label="Delete notification"
                          title="Delete"
                          className="flex h-9 w-9 items-center justify-center rounded-md text-zinc-500 hover:bg-red-500/10 hover:text-red-300"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {!total && (
          <div className="px-5 py-12 text-center sm:py-16">
            <p className="text-sm text-zinc-300">
              {loading
                ? "Loading…"
                : filter === "unread"
                ? "No unread notifications"
                : type !== "all"
                ? "No notifications of this type"
                : "No notifications yet"}
            </p>
            {!loading && (
              <p className="mt-1 text-xs text-zinc-500">
                New tasks and status changes will show up here.
              </p>
            )}
          </div>
        )}
      </div>

      <Pagination page={current} pages={pages} total={total} size={PAGE_SIZE} onChange={goTo} />

      {confirmClear && (
        <ConfirmModal
          title="Clear all notifications?"
          message="This removes your whole notification history."
          confirmText="Clear all"
          loading={busy}
          onClose={() => setConfirmClear(false)}
          onConfirm={async () => {
            await run(() => clearAll(uid));
            setConfirmClear(false);
          }}
        />
      )}
    </div>
  );
};

export default NotificationsPage;