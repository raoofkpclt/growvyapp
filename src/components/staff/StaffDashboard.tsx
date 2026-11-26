import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  documentId,
  getDocs,
  onSnapshot,
  query,
  where,
  type DocumentData,
} from "firebase/firestore";
import { auth, db } from "../../config/firebase/firebase";
import { getStaff } from "../../service/staffService";
import {
  checkInWithProof,
  checkOutWithProof,
  dateKey,
  monthKey,
  reCheckInWithProof,
  sweepScheduledBreaks,
  type Proof,
} from "../../service/AttendanceService";
import { notifyAttendanceEvent } from "../../service/NotificationService";
import { uploadSelfie } from "../../utils/uploadFile";
import {
  BREAK_LABELS,
  RULES,
  canCheckIn,
  canReCheckIn,
  computeDay,
  fmtHHMM,
  fmtIST,
  istDate,
  openBreak,
  toMs,
  type DayInput,
} from "../../utils/types/AttendanceRules";
import { OFFICE } from "../../utils/types/OfficeLocation";
// adjust this path to wherever your Role / Permission file lives
import { hasPermission } from "../../utils/types/staffRoles";
import SelfieCapture, { type CaptureResult } from "./SelfieCapture";
import Dashboard from "../admin/Dashboard";
import AttendancePanel from "../admin/AttendancePanel";
import LeavePanel from "../admin/Modal/LeavePanel";
import TasksPanel from "../admin/TasksPanel";
import { Badge, Card, useLoad } from "../admin/Modal/Ui";
import TeamWorkOverview from "./TeamWorkOverview";
import HrOverview from "./HrOverview";
import {
  listMyTasks,
  STATUS_LABELS,
  type Task,
} from "../../service/TaskService";
import { listSpecialDays } from "../../service/HolidayService";
import { addDays, fmtDate } from "../../service/PlanService";
import {
  isClosed,
  monthDates,
  toSpecialMap,
  workingDaysIn,
  type SpecialDay,
} from "../../utils/types/WorkCalendar";

type Action = "in" | "out" | "again";

const fmtClock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((n) => String(n).padStart(2, "0")).join(":");
};

const fmtLeft = (ms: number) => {
  const m = Math.max(0, Math.round(ms / 60000));
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
};

const TITLES: Record<Action, string> = {
  in: "Check in",
  out: "Check out",
  again: "Check in again",
};

/* ───────────── work timer + selfie check in / out / in again ───────────── */
export const WorkHoursCard = ({ uid, name }: { uid: string; name: string }) => {
  const [day, setDay] = useState<
    (DayInput & { selfie?: string; flagged?: boolean }) | null
  >(null);
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [modal, setModal] = useState<Action | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  // the real staff name, used in the alerts HR receives
  const [realName, setRealName] = useState(name);

  // profile photo (Staff.photoUrl) used for face matching, plus the staff name for alerts
  useEffect(() => {
    getStaff(uid)
      .then((s) => {
        setPhotoUrl(s?.photoUrl || null);
        if (s?.name) setRealName(s.name);
      })
      .catch(() => setPhotoUrl(null));
  }, [uid]);

  // live record for today (same document id as AttendanceService)
  useEffect(() => {
    return onSnapshot(
      doc(db, "attendance", `${uid}_${dateKey()}`),
      (snap) => {
        if (!snap.exists()) {
          setDay(null);
        } else {
          const raw = snap.data();
          setDay({
            date: raw.date ?? istDate(Date.now()),
            checkIn: raw.checkIn,
            checkOut: raw.checkOut,
            fixedCheckOut: raw.fixedCheckOut,
            breaks: raw.breaks ?? [],
            autoOut: raw.autoOut ?? null,
            autoBreaksDone: raw.autoBreaksDone ?? [],
            selfie: raw.checkInProof?.selfieUrl,
            flagged: !!raw.flagged,
          });
        }
        setLoaded(true);
      },
      () => {
        setDay(null);
        setLoaded(true);
      },
    );
  }, [uid]);

  const checkedIn = !!day && toMs(day.checkIn) !== null;
  const checkedOut = !!day && toMs(day.checkOut) !== null;
  const running = checkedIn && !checkedOut;

  // the timer ticks only while checked in
  useEffect(() => {
    if (!running) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);

  // lunch (1:00 PM) and tea (4:00 PM): check out automatically, and tell HR
  useEffect(() => {
    const run = () =>
      sweepScheduledBreaks(uid)
        .then((kind) => {
          if (kind)
            void notifyAttendanceEvent("break", {
              uid,
              name: realName || name,
            });
        })
        .catch(() => {});
    run();
    const id = setInterval(run, 30_000);
    return () => clearInterval(id);
  }, [uid, name, realName]);

  if (!loaded) {
    return (
      <div className="h-40 animate-pulse rounded-2xl border border-white/5 bg-white/[0.03]" />
    );
  }

  /* upload the selfie, build the proof, save, then tell the HR manager */
  const submit = async (action: Action, r: CaptureResult) => {
    const selfieUrl = await uploadSelfie(r.blob, uid, action);
    const proof: Proof = {
      selfieUrl,
      lat: r.fix?.lat ?? null,
      lng: r.fix?.lng ?? null,
      accuracy: r.fix?.accuracy ?? null,
      distance: r.fix?.distance ?? null,
      capturedAt: r.capturedAt,
      face: r.face,
    };

    // not awaited: a failed notification must never block attendance
    const actor = { uid, name: realName || name };
    if (action === "in") {
      await checkInWithProof(uid, name, proof);
      void notifyAttendanceEvent("check_in", actor);
    } else if (action === "out") {
      await checkOutWithProof(uid, proof);
      void notifyAttendanceEvent("check_out", actor);
    } else {
      await reCheckInWithProof(uid, proof);
      void notifyAttendanceEvent("back", actor);
    }
    setModal(null);
  };

  const Modal = modal && (
    <SelfieCapture
      title={TITLES[modal]}
      name={name}
      photoUrl={photoUrl}
      // check-in and check-in again: at the office, face confirmed.
      // Check-out is always allowed (so nobody is stuck), but is recorded.
      requireOffice={modal !== "out"}
      requireMatch={modal !== "out"}
      confirmLabel={`Confirm ${TITLES[modal].toLowerCase()}`}
      onClose={() => setModal(null)}
      onConfirm={(r) => submit(modal, r)}
    />
  );

  const again = day && checkedOut ? canReCheckIn(day) : null;
  const againHint = !checkedIn
    ? "Check in first"
    : !checkedOut
      ? "Available after you check out"
      : again && !again.ok
        ? again.reason
        : "";

  const ReCheckInButton = (
    <div className="flex min-w-0 flex-col gap-1 sm:items-end">
      <button
        onClick={() => setModal("again")}
        disabled={!again?.ok}
        className="w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:px-5 sm:py-2.5"
      >
        Check in again
      </button>
      {againHint && (
        <p className="text-[11px] text-zinc-500 sm:max-w-[220px] sm:text-right">
          {againHint}
        </p>
      )}
    </div>
  );

  const Note = (
    <p className="text-[11px] leading-relaxed text-zinc-500">
      Check in needs your face to match your profile photo, taken at the office
      (within {OFFICE.radiusMeters} m). Allow camera and location access when
      asked.
    </p>
  );

  /* ── not checked in yet ── */
  if (!day || !checkedIn) {
    const can = canCheckIn(istDate(Date.now()));
    return (
      <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-200">
              You have not checked in today
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Confirm your face at the office to start your work timer.
            </p>
            {!can.ok && (
              <p className="mt-2 text-xs text-amber-300">{can.reason}</p>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-start md:flex md:flex-wrap md:justify-end">
            <button
              onClick={() => setModal("in")}
              disabled={!can.ok}
              className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40 sm:px-5 sm:py-2.5 md:w-auto"
            >
              Check in
            </button>
            {ReCheckInButton}
          </div>
        </div>
        <div className="mt-3">{Note}</div>
        {Modal}
      </div>
    );
  }

  /* ── timer values ── */
  const calcAt = checkedOut ? toMs(day.checkOut)! : now;
  const r = computeDay(day, calcAt);
  const workedMs = r.workedHours * 3_600_000;
  const target = RULES.fullDayHours * 3_600_000;
  const pct = Math.min(100, Math.round((workedMs / target) * 100));
  const onBreak = running ? openBreak(day) : undefined;
  const left = r.requiredEnd ? r.requiredEnd - now : 0;

  return (
    <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/5 p-4 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        {/* timer */}
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          {day.selfie && (
            <img
              src={day.selfie}
              alt="Check-in selfie"
              className="h-14 w-14 shrink-0 rounded-xl border border-white/10 object-cover sm:h-16 sm:w-16"
            />
          )}
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-zinc-500">
              Work hours today
            </p>
            <div className="mt-1 flex items-center gap-3">
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                  running && !onBreak
                    ? "animate-pulse bg-emerald-400"
                    : onBreak
                      ? "animate-pulse bg-amber-400"
                      : "bg-zinc-600"
                }`}
              />
              <span
                className={`font-mono text-3xl font-semibold tabular-nums sm:text-4xl ${
                  running ? "text-white" : "text-zinc-300"
                }`}
              >
                {fmtClock(workedMs)}
              </span>
            </div>
            <p className="mt-2 text-xs text-zinc-400">
              {checkedOut
                ? `Timer paused · checked out at ${fmtIST(toMs(day.checkOut)!)}`
                : onBreak
                  ? `On ${BREAK_LABELS[onBreak.type].toLowerCase()} break`
                  : `Timer running since ${fmtIST(r.countedStart ?? toMs(day.checkIn)!)}`}
            </p>
            {day.flagged && (
              <p className="mt-1 text-[11px] text-amber-300">
                Face check needs HR review for today.
              </p>
            )}
          </div>
        </div>

        {/* buttons + shift info */}
        <div className="flex min-w-0 flex-col gap-3 text-xs text-zinc-400 lg:items-end lg:text-right">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-start lg:flex lg:flex-wrap lg:justify-end">
            <button
              onClick={() => setModal("out")}
              disabled={!running}
              className="w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40 sm:px-5 sm:py-2.5 lg:w-auto"
            >
              Check out
            </button>
            {ReCheckInButton}
          </div>

          {r.requiredEnd && (
            <div>
              <p>Shift ends {fmtIST(r.requiredEnd)}</p>
              {running && (
                <p className="mt-1 text-zinc-300">
                  {left > 0
                    ? `${fmtLeft(left)} left`
                    : "Shift over, please check out"}
                </p>
              )}
            </div>
          )}

          {r.breakMinutes > 0 && <p>Breaks / time out: {r.breakMinutes} min</p>}
          {r.compensationMinutes > 0 && (
            <p className="text-amber-300">
              Make up {r.compensationMinutes} min: shift ends{" "}
              {r.requiredEnd ? fmtIST(r.requiredEnd) : ""}
            </p>
          )}
        </div>
      </div>

      {/* {checkedOut && day.autoOut && (
        <p className="mt-3 rounded-lg border border-sky-400/20 bg-sky-400/10 px-3 py-2 text-xs text-sky-200">
          {day.autoOut === "lunch"
            ? `Checked out automatically for lunch (${fmtHHMM(RULES.lunchStart)} to ${fmtHHMM(
                RULES.lunchEnd
              )}). Check in again when you are back. Before ${fmtHHMM(
                RULES.lunchEnd
              )} it counts as ${fmtHHMM(
                RULES.lunchEnd
              )}; time after that is made up at the end of your shift.`
            : `Checked out automatically for tea (${fmtHHMM(RULES.teaStart)} to ${fmtHHMM(
                RULES.teaEnd
              )}). Check in again any time. After ${fmtHHMM(
                RULES.teaEnd
              )} the extra time is made up at the end of your shift.`}
        </p>
      )} */}

      {checkedOut && day.autoOut === "lunch" && (
        <p className="mt-3 rounded-lg border border-sky-400/20 bg-sky-400/10 px-3 py-2 text-xs text-sky-200">
          {`Checked out automatically for lunch (${fmtHHMM(RULES.lunchStart)} to ${fmtHHMM(
            RULES.lunchEnd,
          )}). Check in again when you are back. Before ${fmtHHMM(
            RULES.lunchEnd,
          )} it counts as ${fmtHHMM(
            RULES.lunchEnd,
          )}; time after that is made up at the end of your shift.`}
        </p>
      )}

      <div className="mt-4">
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-zinc-500">
          {pct}% of a full day ({RULES.fullDayHours}h)
        </p>
      </div>

      <div className="mt-3">{Note}</div>
      {Modal}
    </div>
  );
};

/* ───────────── page ───────────── */
type StaffRecord = Awaited<ReturnType<typeof getStaff>>;
type TabId = "overview" | "attendance" | "leave" | "work";

/** this month's attendance documents for one person (doc id = uid_YYYY-MM-DD) */
const loadMonth = async (
  uid: string,
  month: string,
): Promise<DocumentData[]> => {
  const snap = await getDocs(
    query(
      collection(db, "attendance"),
      where(documentId(), ">=", `${uid}_${month}-01`),
      where(documentId(), "<=", `${uid}_${month}-31`),
    ),
  );
  return snap.docs.map((d) => d.data());
};

const monthLabel = (m: string) => {
  const [y, mo] = m.split("-").map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
};

const Tile = ({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) => (
  <div className="min-w-0 rounded-xl border border-white/5 bg-white/[0.03] p-3 sm:p-4">
    <p className="truncate text-xs text-zinc-500">{label}</p>
    <p className="mt-1 text-xl font-bold text-white sm:text-2xl">{value}</p>
    {sub && (
      <p className="mt-0.5 text-[11px] leading-snug text-zinc-500">{sub}</p>
    )}
  </div>
);

const StaffDashboard = ({ name: nameProp }: { name?: string }) => {
  const user = auth.currentUser;
  const uid = user?.uid ?? "";

  const [staff, setStaff] = useState<StaffRecord | null>(null);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<TabId>("overview");

  useEffect(() => {
    if (!user) {
      setReady(true);
      return;
    }
    getStaff(user.uid)
      .then((s) => setStaff(s))
      .catch(() => setStaff(null))
      .finally(() => setReady(true));
  }, [user?.uid]);

  const name = nameProp ?? staff?.name ?? user?.displayName ?? "there";
  const viewer = {
    uid,
    name:
      staff?.name ?? nameProp ?? user?.displayName ?? user?.email ?? "Staff",
  };

  const month = monthKey();
  const today = dateKey();

  const tasks = useLoad(
    () => (uid ? listMyTasks(uid) : Promise.resolve([] as Task[])),
    [uid],
    [] as Task[],
  );
  const att = useLoad(
    () => (uid ? loadMonth(uid, month) : Promise.resolve([] as DocumentData[])),
    [uid, month],
    [] as DocumentData[],
  );
  const special = useLoad(
    () => listSpecialDays(`${month}-01`, addDays(today, 60)),
    [month, today],
    [] as SpecialDay[],
  );

  const specials = useMemo(() => toSpecialMap(special.data), [special.data]);

  /* this month, worked out from the attendance records */
  const stats = useMemo(() => {
    const rows = att.data
      .map((raw) => {
        const dayInput: DayInput = {
          date: raw.date ?? "",
          checkIn: raw.checkIn,
          checkOut: raw.checkOut,
          fixedCheckOut: raw.fixedCheckOut,
          breaks: raw.breaks ?? [],
        };
        if (toMs(dayInput.checkIn) === null) return null;
        const at =
          toMs(dayInput.checkOut) ?? toMs(dayInput.fixedCheckOut) ?? Date.now();
        const r = computeDay(dayInput, at);
        return {
          date: dayInput.date as string,
          inMs: toMs(dayInput.checkIn)!,
          outMs: toMs(dayInput.checkOut),
          hours: r.workedHours,
          flagged: !!raw.flagged,
        };
      })
      .filter((x): x is NonNullable<typeof x> => !!x)
      .sort((a, b) => b.date.localeCompare(a.date));

    const totalHours = rows.reduce((s, r) => s + r.hours, 0);
    const openDaysBeforeToday = monthDates(month).filter(
      (d) => d < today && !isClosed(d, specials),
    );
    const presentBeforeToday = rows.filter((r) => r.date < today).length;

    return {
      rows,
      present: rows.length,
      totalHours,
      avgHours: rows.length ? totalHours / rows.length : 0,
      workingDays: workingDaysIn(month, specials),
      missed: Math.max(0, openDaysBeforeToday.length - presentBeforeToday),
      flagged: rows.filter((r) => r.flagged).length,
    };
  }, [att.data, specials, month, today]);

  const upcoming = special.data.filter((s) => s.date >= today).slice(0, 5);

  const taskCount = (s: string) =>
    tasks.data.filter((t) => t.status === s).length;

  // board members (and anyone given "dashboard.admin") see the admin dashboard
  const canAdminDash = hasPermission(staff, "dashboard.admin");

  // dashboards switched on for this person (set when adding / editing staff)
  const canTeam = hasPermission(staff, "dashboard.operations");
  const canHr = hasPermission(staff, "dashboard.hr");

  // people with a management dashboard don't see the regular staff cards
  // (their own todo counts and attendance numbers)
  const hasMgmtDash = canTeam || canHr || canAdminDash;

  return (
    <div className="animate-fade-in min-w-0 space-y-5 sm:space-y-6">
      <div>
        <h2 className="text-xl font-bold sm:text-2xl">Welcome back, {name}</h2>
        <p className="mt-1.5 text-sm text-zinc-500 sm:mt-2">
          Your attendance, leave and assigned work in one place.
        </p>
      </div>

      {/* the sub-pages below have no tab bar, so give a way back to the overview */}
      {tab !== "overview" && (
        <button
          onClick={() => setTab("overview")}
          className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
        >
          ← Back to overview
        </button>
      )}

      {user && hasPermission(staff, "attendance.own") && (
        <WorkHoursCard
          uid={user.uid}
          name={staff?.name ?? user.displayName ?? user.email ?? ""}
        />
      )}

      {/* ───────── overview ───────── */}
      {tab === "overview" && (
        <div className="space-y-5 sm:space-y-6">
          {!hasMgmtDash && (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-zinc-200">
                  Assigned work
                </h3>
                <button
                  onClick={() => setTab("work")}
                  className="shrink-0 text-xs text-violet-300 hover:text-violet-200"
                >
                  Open tasks →
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
                {Object.entries(STATUS_LABELS).map(([k, label]) => (
                  <Tile key={k} label={label} value={taskCount(k)} />
                ))}
              </div>
            </section>
          )}

          {/* operation manager / HR / board: team work counts only */}
          {canTeam && <TeamWorkOverview />}

          {/* HR manager: staff, attendance, leave and payroll counts */}
          {canHr && <HrOverview />}

          {!hasMgmtDash && (
            <>
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-zinc-200">
                  Attendance · {monthLabel(month)}
                </h3>
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
                  <Tile
                    label="Days present"
                    value={stats.present}
                    sub={`of ${stats.workingDays} working days`}
                  />
                  <Tile
                    label="Hours worked"
                    value={stats.totalHours.toFixed(1)}
                    sub="this month"
                  />
                  <Tile
                    label="Average per day"
                    value={`${stats.avgHours.toFixed(1)}h`}
                  />
                  <Tile
                    label="No check-in"
                    value={stats.missed}
                    sub="past working days (includes approved leave)"
                  />
                </div>
                {stats.flagged > 0 && (
                  <p className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
                    {stats.flagged}{" "}
                    {stats.flagged === 1 ? "day has" : "days have"} a face check
                    waiting for HR review.
                  </p>
                )}
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-zinc-200">
                    Recent days
                  </h3>
                  <button
                    onClick={() => setTab("attendance")}
                    className="shrink-0 text-xs text-violet-300 hover:text-violet-200"
                  >
                    Full history →
                  </button>
                </div>
                <Card className="divide-y divide-white/5 overflow-hidden">
                  {stats.rows.slice(0, 5).map((r) => (
                    <div
                      key={r.date}
                      className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                    >
                      <p className="text-sm text-white">{fmtDate(r.date)}</p>
                      <p className="text-xs text-zinc-400">
                        In {fmtIST(r.inMs)} ·{" "}
                        {r.outMs ? `Out ${fmtIST(r.outMs)}` : "Not checked out"}{" "}
                        ·{" "}
                        <span className="text-zinc-200">
                          {r.hours.toFixed(1)}h
                        </span>
                      </p>
                    </div>
                  ))}
                  {!stats.rows.length && (
                    <p className="px-4 py-6 text-center text-sm text-zinc-500">
                      {att.loading
                        ? "Loading…"
                        : "No attendance yet this month."}
                    </p>
                  )}
                </Card>
              </section>
            </>
          )}

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-zinc-200">
              Upcoming holidays and special days
            </h3>
            <Card className="divide-y divide-white/5 overflow-hidden">
              {upcoming.map((s) => (
                <div
                  key={s.date}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-white">{s.name}</p>
                    <p className="text-xs text-zinc-500">{fmtDate(s.date)}</p>
                  </div>
                  <span className="shrink-0">
                    <Badge tone={s.type === "holiday" ? "amber" : "emerald"}>
                      {s.type === "holiday" ? "Holiday" : "Working day"}
                    </Badge>
                  </span>
                </div>
              ))}
              {!upcoming.length && (
                <p className="px-4 py-6 text-center text-sm text-zinc-500">
                  {special.loading
                    ? "Loading…"
                    : "Nothing marked in the next 60 days. Sundays and 2nd Saturdays are closed."}
                </p>
              )}
            </Card>
          </section>

          {!ready && (
            <div className="h-40 animate-pulse rounded-2xl border border-white/5 bg-white/[0.03]" />
          )}

          {ready && canAdminDash && (
            <section className="min-w-0 space-y-3">
              <div>
                <h3 className="text-lg font-semibold">Admin dashboard</h3>
                <p className="text-xs text-zinc-500">View only</p>
              </div>
              <div className="min-w-0">
                <Dashboard />
              </div>
            </section>
          )}
        </div>
      )}

      {/* ───────── full attendance history ───────── */}
      {tab === "attendance" && uid && (
        <div className="min-w-0">
          <AttendancePanel viewer={viewer} scope="own" />
        </div>
      )}

      {/* ───────── leave: apply and see status ───────── */}
      {tab === "leave" && uid && (
        <div className="min-w-0">
          <LeavePanel viewer={viewer} scope="own" />
        </div>
      )}

      {/* ───────── assigned work: start, pause, complete ───────── */}
      {tab === "work" && uid && (
        <div className="min-w-0 space-y-4">
          <p className="text-sm text-zinc-500">
            Start the timer when you begin, pause when you stop, and complete to
            send it for approval.
          </p>
          <TasksPanel
            viewer={viewer}
            scope="own"
            canAssign={hasPermission(staff, "tasks.assign")}
            canFeedback={hasPermission(staff, "tasks.feedback")}
          />
        </div>
      )}
    </div>
  );
};

export default StaffDashboard;
