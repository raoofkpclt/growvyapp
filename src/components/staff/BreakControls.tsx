import { useEffect, useState } from "react";
import { dateKey } from "../../service/AttendanceService";
import {
  endBreak,
  getExtras,
  startBreak,
  type BreakKind,
  type Extras,
} from "../../service/AttendanceExtrasService";
import { SCHEDULE } from "../../utils/types/WorkRules";
import { Btn, Notice, errMsg } from "../admin/Modal/Ui";

const time = (ms?: number) =>
  ms ? new Date(ms).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : "";

const stamp = (e: Extras | null, kind: BreakKind, which: "Start" | "End") =>
  e ? ((e as any)[`${kind}${which}`] as number | undefined) : undefined;

const BREAKS: {
  kind: BreakKind;
  title: string;
  take: string;
  window: { label: string; from: number; to: number };
}[] = [
  { kind: "lunch", title: "Lunch time", take: "Take a break", window: SCHEDULE.lunch },
  { kind: "tea", title: "Tea time", take: "Take a tea", window: SCHEDULE.tea },
];

/**
 * Shows "Take a break" at lunch (1:00–2:00 PM) and "Take a tea" at tea time
 * (4:00–4:15 PM). Nothing is shown outside those windows.
 * `enabled` = the person has checked in today and not checked out yet.
 */
const BreakControls = ({ uid, enabled = true }: { uid: string; enabled?: boolean }) => {
  const date = dateKey();
  const [extras, setExtras] = useState<Extras | null>(null);
  const [now, setNow] = useState(new Date());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    getExtras(uid, date).then(setExtras).catch((e) => setErr(errMsg(e)));
  }, [uid, date]);

  // keeps the buttons in step with the clock
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 20_000);
    return () => clearInterval(id);
  }, []);

  const mins = now.getHours() * 60 + now.getMinutes();

  const run = async (fn: () => Promise<void>) => {
    setErr("");
    setBusy(true);
    try {
      await fn();
      setExtras(await getExtras(uid, date));
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  // on phones the text sits above a full-width button; from sm up they share a row
  const rowCls = "flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between";
  const btnCls = "w-full sm:w-auto sm:shrink-0";

  const items = BREAKS.map((b) => {
    const start = stamp(extras, b.kind, "Start");
    const end = stamp(extras, b.kind, "End");
    const inWindow = mins >= b.window.from && mins < b.window.to;

    // on a break now: always show the way back
    if (start && !end) {
      return (
        <div key={b.kind} className={`${rowCls} border-amber-400/30 bg-amber-400/10`}>
          <p className="min-w-0 break-words text-sm text-amber-200">
            You are on your {b.kind === "lunch" ? "lunch break" : "tea break"} since {time(start)}
          </p>
          <Btn
            className={btnCls}
            disabled={busy}
            onClick={() => run(() => endBreak(uid, date, b.kind))}
          >
            Back to work
          </Btn>
        </div>
      );
    }

    if (start && end) {
      return (
        <p key={b.kind} className="text-xs text-zinc-500">
          {b.kind === "lunch" ? "Lunch break" : "Tea break"}: {time(start)} – {time(end)}
        </p>
      );
    }

    if (inWindow && enabled) {
      return (
        <div key={b.kind} className={`${rowCls} border-white/10 bg-white/[0.03]`}>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white">{b.title}</p>
            <p className="text-xs text-zinc-500">{b.window.label}</p>
          </div>
          <Btn
            className={btnCls}
            disabled={busy}
            onClick={() => run(() => startBreak(uid, date, b.kind))}
          >
            {b.take}
          </Btn>
        </div>
      );
    }

    return null;
  }).filter(Boolean);

  if (!items.length && !err) return null;

  return (
    <div className="space-y-2">
      {items}
      <Notice message={err} />
    </div>
  );
};

export default BreakControls;