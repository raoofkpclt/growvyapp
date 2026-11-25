import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  clearAll,
  deleteNotification,
  markAllRead,
  markRead,
  playNotificationSound,
  subscribeNotifications,
  TYPE_META,
  unlockSound,
  type AppNotification,
  type Tone,
} from "../../service/NotificationService";
import ConfirmModal from "../admin/Modal/ConfirmModal"; // adjust path to where ConfirmModal lives

/**
 * Bell + notification dropdown (opens right below the bell).
 *   - live: a new notification plays a sound, shows a pop-up and updates the tab title
 *   - when the tab is in the background, a desktop notification is shown (if allowed)
 *   - the dropdown keeps the history: mark read, delete one, clear all (with a confirm modal)
 *   - the history is paginated (PAGE_SIZE per page)
 *   - close it with the ✕ button, the Escape key, the bell again, or by clicking outside
 *
 * Put it in the top bar:
 *   <NotificationBell uid={uid} onOpen={() => setTab("task")} onViewAll={() => setTab("notifications")} />
 *
 * Save as: src/components/staff/NotificationBell.tsx
 */
const SOUND_KEY = "growvy-notification-sound";

// notifications shown per page in the dropdown
const PAGE_SIZE = 8;

const readSound = () => {
  try {
    return localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
};

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

const BellIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.7}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0" />
  </svg>
);

const NotificationBell = ({
  uid,
  onOpen,
  onViewAll,
}: {
  uid: string;
  /** called when a notification is clicked (e.g. jump to the Tasks page) */
  onOpen?: (n: AppNotification) => void;
  /** opens the full Notifications page */
  onViewAll?: () => void;
}) => {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [page, setPage] = useState(1);
  const [toasts, setToasts] = useState<AppNotification[]>([]);
  const [soundOn, setSoundOn] = useState(readSound);
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">(
    typeof Notification === "undefined" ? "unsupported" : Notification.permission
  );
  const [busy, setBusy] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const soundRef = useRef(soundOn);
  soundRef.current = soundOn;
  const baseTitle = useRef(typeof document !== "undefined" ? document.title : "");
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const unread = items.filter((n) => !n.read).length;

  /* sound needs one click / key press on the page before the browser allows it */
  useEffect(() => {
    const unlock = () => unlockSound();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  /* close the dropdown: Escape key, or a click anywhere outside it.
     While the confirm modal is showing, the dropdown stays open behind it. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !confirmClear) setOpen(false);
    };
    const onDown = (e: PointerEvent) => {
      if (confirmClear) return;
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open, confirmClear]);

  /* live notifications */
  useEffect(() => {
    if (!uid) return;
    return subscribeNotifications(uid, (list, fresh) => {
      setItems(list);
      if (!fresh.length) return;

      if (soundRef.current) playNotificationSound();

      setToasts((prev) => [...fresh, ...prev].slice(0, 3));
      fresh.forEach((n) =>
        setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== n.id)), 7000)
      );

      // tab in the background → desktop notification
      if (
        typeof Notification !== "undefined" &&
        Notification.permission === "granted" &&
        document.hidden
      ) {
        fresh.forEach((n) => {
          try {
            new Notification(n.title, { body: n.message, tag: n.id });
          } catch {
            /* some browsers only allow this from a service worker */
          }
        });
      }
    });
  }, [uid]);

  /* unread count in the browser tab title */
  useEffect(() => {
    const base = baseTitle.current;
    document.title = unread ? `(${unread}) ${base}` : base;
    return () => {
      document.title = base;
    };
  }, [unread]);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    try {
      localStorage.setItem(SOUND_KEY, next ? "on" : "off");
    } catch {
      /* ignore */
    }
    if (next) playNotificationSound(); // so they hear what it sounds like
  };

  const askDesktop = async () => {
    if (typeof Notification === "undefined") return;
    setPerm(await Notification.requestPermission());
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
    setOpen(false);
  };

  const changeFilter = (f: "all" | "unread") => {
    setFilter(f);
    setPage(1);
  };

  const toggleOpen = () => {
    setOpen((o) => {
      if (!o) setPage(1); // always start on the newest page
      return !o;
    });
  };

  const goTo = (p: number) => {
    setPage(p);
    listRef.current?.scrollTo({ top: 0 });
  };

  // filter → paginate → group the current page by day
  const { total, pages, current, groups } = useMemo(() => {
    const shown = filter === "unread" ? items.filter((n) => !n.read) : items;
    const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
    const current = Math.min(page, pages); // stays valid when items are deleted or marked read
    const slice = shown.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

    const map = new Map<string, AppNotification[]>();
    slice.forEach((n) => {
      const k = dayLabel(n.createdAt);
      map.set(k, [...(map.get(k) ?? []), n]);
    });
    return { total: shown.length, pages, current, groups: [...map.entries()] };
  }, [items, filter, page]);

  return (
    <div ref={wrapRef} className="relative">
      {/* bell */}
      <button
        onClick={toggleOpen}
        title="Notifications"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`relative flex h-10 w-10 items-center justify-center rounded-full border text-zinc-300 transition-colors hover:bg-white/5 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 sm:h-9 sm:w-9 ${
          open ? "border-violet-400/40 bg-white/5 text-white" : "border-white/10"
        }`}
      >
        <BellIcon />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {/* pop-ups for new notifications */}
      <div className="pointer-events-none fixed left-3 right-3 top-[72px] z-[60] flex flex-col gap-2 sm:left-auto sm:w-[340px]">
        {toasts.map((n) => {
          const meta = TYPE_META[n.type] ?? { label: "Update", tone: "zinc" as Tone };
          const dismiss = () => setToasts((p) => p.filter((x) => x.id !== n.id));
          return (
            <div
              key={n.id}
              className="pointer-events-auto animate-fade-in relative rounded-xl border border-white/10 bg-[#12141b] shadow-xl shadow-black/40"
            >
              <button
                onClick={() => {
                  dismiss();
                  openItem(n);
                }}
                className="block w-full rounded-xl p-3 pr-10 text-left"
              >
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${DOT[meta.tone]}`} />
                  <p className={`text-[11px] font-medium uppercase tracking-wide ${TEXT[meta.tone]}`}>
                    {meta.label}
                  </p>
                </div>
                <p className="mt-1 break-words text-sm font-medium text-white">{n.title}</p>
                <p className="mt-0.5 line-clamp-2 break-words text-xs text-zinc-400">{n.message}</p>
              </button>
              <button
                onClick={dismiss}
                aria-label="Dismiss"
                className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>

      {/* dropdown right below the bell (full-width sheet under the top bar on phones) */}
      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="animate-fade-in fixed left-3 right-3 top-[68px] z-50 flex max-h-[calc(100dvh-84px)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0d0f15] shadow-2xl shadow-black/60 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:max-h-[75vh] sm:w-[420px]"
        >
          {/* header */}
          <div className="flex items-start justify-between gap-3 border-b border-white/5 px-4 py-3">
            <div className="min-w-0">
              <h3 className="font-display text-base font-bold text-white">Notifications</h3>
              <p className="mt-0.5 text-xs text-zinc-500">
                {unread ? `${unread} unread` : "You're all caught up"} · {items.length} in history
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close notifications"
              title="Close (Esc)"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            >
              ✕
            </button>
          </div>

          {/* actions */}
          <div className="flex flex-wrap items-center gap-2 border-b border-white/5 px-4 py-2.5 text-xs">
            <div className="flex rounded-lg border border-white/10 p-0.5">
              {(["all", "unread"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => changeFilter(f)}
                  className={`rounded-md px-3 py-1.5 capitalize transition-colors ${
                    filter === f ? "bg-violet-500/15 text-violet-300" : "text-zinc-500 hover:text-white"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <button
              disabled={busy || !unread}
              onClick={() => run(() => markAllRead(uid))}
              className="rounded-lg border border-white/10 px-3 py-2 text-zinc-300 hover:bg-white/5 disabled:opacity-40"
            >
              Mark all read
            </button>
            <button
              disabled={busy || !items.length}
              onClick={() => setConfirmClear(true)}
              className="rounded-lg border border-red-500/20 px-3 py-2 text-red-300 hover:bg-red-500/10 disabled:opacity-40"
            >
              Clear all
            </button>

            <button
              onClick={toggleSound}
              className="rounded-lg border border-white/10 px-3 py-2 text-zinc-300 hover:bg-white/5 sm:ml-auto"
            >
              Sound: {soundOn ? "On" : "Off"}
            </button>
          </div>

          {perm === "default" && (
            <div className="flex flex-col gap-2 border-b border-white/5 bg-violet-500/5 px-4 py-2.5 text-xs text-zinc-300 sm:flex-row sm:items-center sm:justify-between">
              <span>Get an alert even when this tab is in the background.</span>
              <button
                onClick={askDesktop}
                className="rounded-lg bg-violet-600 px-3 py-2 font-medium text-white hover:bg-violet-500"
              >
                Turn on desktop alerts
              </button>
            </div>
          )}
          {perm === "denied" && (
            <p className="border-b border-white/5 px-4 py-2.5 text-[11px] text-zinc-500">
              Desktop alerts are blocked in this browser. Allow notifications for this site in the
              browser settings to get them.
            </p>
          )}

          {/* list */}
          <div ref={listRef} className="min-h-[120px] flex-1 overflow-y-auto overscroll-contain">
            {groups.map(([day, list]) => (
              <div key={day}>
                <p className="sticky top-0 bg-[#0d0f15]/95 px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-zinc-500 backdrop-blur">
                  {day}
                </p>
                <ul className="divide-y divide-white/5">
                  {list.map((n) => {
                    const meta = TYPE_META[n.type] ?? { label: "Update", tone: "zinc" as Tone };
                    return (
                      <li
                        key={n.id}
                        className={`group flex items-start gap-3 px-4 py-3 ${n.read ? "" : "bg-white/[0.03]"}`}
                      >
                        <span
                          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                            n.read ? "bg-zinc-700" : DOT[meta.tone]
                          }`}
                        />
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
                          <p className="mt-0.5 break-words text-xs leading-snug text-zinc-400">{n.message}</p>
                          <p className="mt-1 text-[11px] text-zinc-600">{timeLabel(n.createdAt)}</p>
                        </button>

                        <div className="flex shrink-0 items-center gap-1 opacity-100 sm:opacity-0 sm:transition-opacity sm:focus-within:opacity-100 sm:group-hover:opacity-100">
                          {!n.read && (
                            <button
                              onClick={() => void markRead(n.id)}
                              title="Mark as read"
                              className="min-h-8 rounded-md px-2 py-1 text-[11px] text-zinc-400 hover:bg-white/5 hover:text-white"
                            >
                              Read
                            </button>
                          )}
                          <button
                            onClick={() => void deleteNotification(n.id)}
                            title="Delete"
                            aria-label="Delete notification"
                            className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 hover:bg-red-500/10 hover:text-red-300"
                          >
                            ✕
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}

            {!total && (
              <div className="px-5 py-12 text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-zinc-500">
                  <BellIcon />
                </div>
                <p className="text-sm text-zinc-300">
                  {filter === "unread" ? "No unread notifications" : "No notifications yet"}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  New tasks and status changes will show up here.
                </p>
              </div>
            )}
          </div>

          {/* pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between gap-2 border-t border-white/5 px-4 py-2 text-xs">
              <button
                disabled={current <= 1}
                onClick={() => goTo(current - 1)}
                className="rounded-lg border border-white/10 px-3 py-2 text-zinc-300 hover:bg-white/5 disabled:opacity-40"
              >
                ‹ Newer
              </button>
              <span className="text-center text-zinc-500">
                Page {current} of {pages}
                <span className="hidden sm:inline"> · {total} total</span>
              </span>
              <button
                disabled={current >= pages}
                onClick={() => goTo(current + 1)}
                className="rounded-lg border border-white/10 px-3 py-2 text-zinc-300 hover:bg-white/5 disabled:opacity-40"
              >
                Older ›
              </button>
            </div>
          )}

          {/* footer */}
          <div className="flex items-center justify-between gap-2 border-t border-white/5 px-4 py-2.5">
            {onViewAll ? (
              <button
                onClick={() => {
                  setOpen(false);
                  onViewAll();
                }}
                className="py-1.5 text-xs font-medium text-violet-300 hover:text-violet-200"
              >
                View all notifications
              </button>
            ) : (
              <span />
            )}
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* confirm "Clear all" — rendered on document.body so the sticky, blurred
          header can't trap it (backdrop-filter makes `fixed` relative to the header) */}
      {confirmClear &&
        createPortal(
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
          />,
          document.body
        )}
    </div>
  );
};

export default NotificationBell;