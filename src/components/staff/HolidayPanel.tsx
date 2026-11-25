import { useRef, useState } from "react";
import {
  listSpecialDays,
  removeSpecialDay,
  saveSpecialDay,
} from "../../service/HolidayService";
import {
  dayInfo,
  isWeeklyOff,
  monthDates,
  toSpecialMap,
  weekdayOf,
  workingDaysIn,
  type SpecialDay,
} from "../../utils/types/WorkCalendar";
import { Badge, Btn, Card, Label, Notice, errMsg, inputCls, useLoad } from "../admin/Modal/Ui";

/**
 * Month calendar showing closed days.
 *   grey   = Sunday / 2nd Saturday (closed automatically)
 *   amber  = special holiday marked by HR / admin
 *   green  = a normally closed day marked as a working day
 * Everyone can view it. Only `canManage` (HR manager / admin) can add or remove special days.
 *
 * Save as: src/components/staff/HolidayPanel.tsx
 */
const WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// special days shown per page in the list
const PAGE_SIZE = 5;

const thisMonth = () => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 7);

const prettyDate = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

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
    <div className="flex flex-col items-center gap-3 border-t border-white/5 px-4 py-3 sm:flex-row sm:justify-between">
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

const HolidayPanel = ({
  viewer,
  canManage = false,
}: {
  viewer: { uid: string; name: string };
  canManage?: boolean;
}) => {
  const [month, setMonth] = useState(thisMonth());
  const [selected, setSelected] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [page, setPage] = useState(1);
  const editRef = useRef<HTMLDivElement>(null);

  const days = useLoad(
    () => listSpecialDays(`${month}-01`, `${month}-31`),
    [month],
    [] as SpecialDay[]
  );

  const specials = toSpecialMap(days.data);
  const dates = monthDates(month);
  const blanks = weekdayOf(dates[0]);
  const workingDays = workingDaysIn(month, specials);

  // paginate the list; the page is clamped so it stays valid after removing items
  const sorted = [...days.data].sort((a, b) => a.date.localeCompare(b.date));
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const rows = sorted.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const pick = (date: string) => {
    if (!canManage) return;
    setErr("");
    setInfo("");
    setSelected(date);
    setName(specials[date]?.name ?? "");
    // on phones the edit card is below the calendar, so bring it into view
    setTimeout(() => editRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
  };

  // a normally open day can be made a holiday; a normally closed day can be made a working day
  const selectedWeeklyOff = selected ? isWeeklyOff(selected) : false;
  const selectedSpecial = selected ? specials[selected] : undefined;

  const save = async () => {
    if (!selected) return;
    if (!name.trim()) return setErr("Enter a name for this day.");
    setErr("");
    setBusy(true);
    try {
      await saveSpecialDay({
        date: selected,
        name,
        type: selectedWeeklyOff ? "working" : "holiday",
        by: viewer.uid,
        byName: viewer.name,
      });
      setInfo(`${prettyDate(selected)} saved.`);
      setSelected(null);
      days.reload();
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (date: string) => {
    setErr("");
    setBusy(true);
    try {
      await removeSpecialDay(date);
      setInfo(`${prettyDate(date)} removed.`);
      if (selected === date) setSelected(null);
      days.reload();
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-white">Holidays and closed days</p>
          <p className="text-xs text-zinc-500">
            Sundays and the 2nd Saturday are closed. {workingDays} working days this month.
          </p>
        </div>
        <input
          type="month"
          className={`${inputCls} sm:!w-auto`}
          value={month}
          onChange={(e) => {
            if (e.target.value) {
              setMonth(e.target.value);
              setSelected(null);
              setPage(1);
            }
          }}
        />
      </div>

      <Notice message={err || days.error} />
      {info && <p className="text-sm text-emerald-400">{info}</p>}

      <Card className="p-2 sm:p-4">
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-zinc-500 sm:text-[11px]">
          {WEEK.map((w) => (
            <div key={w} className="py-1">
              <span className="sm:hidden">{w.charAt(0)}</span>
              <span className="hidden sm:inline">{w}</span>
            </div>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1">
          {Array.from({ length: blanks }).map((_, i) => (
            <div key={`b${i}`} />
          ))}

          {dates.map((date) => {
            const d = dayInfo(date, specials);
            const tone =
              d.kind === "holiday"
                ? "border-amber-500/30 bg-amber-500/15 text-amber-300"
                : d.kind === "working"
                ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
                : d.kind === "weekly"
                ? "border-white/5 bg-white/5 text-zinc-500"
                : "border-transparent text-zinc-200";

            return (
              <button
                key={date}
                type="button"
                disabled={!canManage}
                onClick={() => pick(date)}
                title={d.reason || undefined}
                aria-label={d.reason ? `${prettyDate(date)}, ${d.reason}` : prettyDate(date)}
                className={`flex h-11 min-w-0 flex-col items-center justify-center rounded-lg border text-xs transition-colors sm:h-14 sm:text-sm ${tone} ${
                  canManage ? "hover:border-violet-500/50" : "cursor-default"
                } ${selected === date ? "ring-2 ring-violet-500/60" : ""}`}
              >
                <span>{Number(date.slice(8, 10))}</span>
                {d.reason && (
                  <>
                    {/* phones: a dot (names are in the list below); larger screens: the name */}
                    <span className="mt-0.5 h-1 w-1 rounded-full bg-current sm:hidden" />
                    <span className="mt-0.5 hidden max-w-full truncate px-1 text-[9px] leading-none sm:block">
                      {d.reason}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-500">
          <span className="flex items-center gap-1.5">
            <i className="h-2.5 w-2.5 rounded-sm bg-white/10" /> Closed
          </span>
          <span className="flex items-center gap-1.5">
            <i className="h-2.5 w-2.5 rounded-sm bg-amber-500/40" /> Holiday
          </span>
          <span className="flex items-center gap-1.5">
            <i className="h-2.5 w-2.5 rounded-sm bg-emerald-500/40" /> Working day
          </span>
        </div>
      </Card>

      {/* add / edit the selected day */}
      {canManage && selected && (
        <div ref={editRef}>
          <Card className="space-y-3 p-3 sm:p-4">
            <p className="text-sm font-medium text-white">{prettyDate(selected)}</p>
            <p className="text-xs text-zinc-500">
              {selectedWeeklyOff
                ? "This day is normally closed. Save it to make it a working day."
                : "Save it to close the office on this day (leave can't be marked on it)."}
            </p>

            <Label text={selectedWeeklyOff ? "Reason (e.g. Working Saturday)" : "Holiday name (e.g. Onam)"}>
              <input
                className={inputCls}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={selectedWeeklyOff ? "Working Saturday" : "Holiday name"}
              />
            </Label>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Btn onClick={save} disabled={busy} className="w-full sm:w-auto">
                {busy ? "Saving…" : selectedWeeklyOff ? "Mark as working day" : "Mark as holiday"}
              </Btn>
              {selectedSpecial && (
                <Btn
                  variant="danger"
                  onClick={() => remove(selected)}
                  disabled={busy}
                  className="w-full sm:w-auto"
                >
                  Remove
                </Btn>
              )}
              <Btn variant="ghost" onClick={() => setSelected(null)} className="w-full sm:w-auto">
                Cancel
              </Btn>
            </div>
          </Card>
        </div>
      )}

      {/* list of this month's special days */}
      <Card className="overflow-hidden">
        <div className="divide-y divide-white/5">
          {rows.map((s) => (
            <div
              key={s.date}
              className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4"
            >
              <div className="min-w-0">
                <p className="break-words text-sm text-white">{s.name}</p>
                <p className="text-xs text-zinc-500">{prettyDate(s.date)}</p>
              </div>
              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <Badge tone={s.type === "holiday" ? "amber" : "emerald"}>
                  {s.type === "holiday" ? "Holiday" : "Working day"}
                </Badge>
                {canManage && (
                  <Btn variant="danger" onClick={() => remove(s.date)} disabled={busy}>
                    Remove
                  </Btn>
                )}
              </div>
            </div>
          ))}

          {!sorted.length && (
            <p className="px-4 py-6 text-center text-sm text-zinc-500">
              {days.loading ? "Loading…" : "No special days this month."}
            </p>
          )}
        </div>

        <Pagination
          page={current}
          pages={pages}
          total={sorted.length}
          size={PAGE_SIZE}
          onChange={setPage}
        />
      </Card>
    </div>
  );
};

export default HolidayPanel;