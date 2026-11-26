import { useEffect, useRef, useState } from "react";
import {
  addFeedback,
  approveSelfTask,
  approveTask,
  autoPauseExpired,
  completeTask,
  createTask,
  listenAllTasks,
  listenMyTasks,
  pauseTask,
  PAUSE_LABELS,
  rejectSelfTask,
  rejectTask,
  startTask,
  STATUS_LABELS,
  type Priority,
  type Task,
  type TaskStatus,
} from "../../service/TaskService";
import {
  notifyTaskAssigned,
  notifyTaskEvent,
  type TaskEvent,
} from "../../service/NotificationService";
import { subscribeCheckedIn } from "../../service/attendanceGate";
import { listStaff, type Staff } from "../../service/staffService";
import { dateKey } from "../../service/AttendanceService";
import { getClients } from "../../service/clientService"; // adjust to your file name
import type { Client } from "../../utils/types/Types";
import ConfirmModal from "./Modal/ConfirmModal"; // adjust path to where ConfirmModal lives
import {
  Badge,
  Btn,
  Card,
  Label,
  Modal,
  Notice,
  errMsg,
  inputCls,
  useLoad,
  type Viewer,
} from "./Modal/Ui";

type Props = {
  viewer: Viewer;
  /** "own" = tasks assigned to me, "all" = every task (work tracking) */
  scope: "own" | "all";
  canAssign?: boolean;
  canFeedback?: boolean;
  /** staff can add a task for themselves (needs approval before it can start) */
  canAddOwn?: boolean;
  /** can approve / reject tasks that staff added for themselves */
  canApproveSelfAdded?: boolean;
  /** admin can approve any task; otherwise only the person who assigned it can */
  isAdmin?: boolean;
  /** Set both to show only one client's tasks (Client details page). */
  clientId?: string;
  clientName?: string;
};

const STATUSES = Object.keys(STATUS_LABELS) as TaskStatus[];
const PRIORITY_TONE = { low: "zinc", medium: "amber", high: "red" } as const;
const STATUS_TONE = {
  todo: "zinc",
  in_progress: "emerald",
  paused: "amber",
  review: "sky",
  rework: "red",
  done: "emerald",
} as const;

// Firestore doc id of a client (falls back to your custom id)
const clientKey = (c: Client) => c.firestoreId ?? String(c.id);

const isOverdue = (t: Task) => t.status !== "done" && !!t.dueDate && t.dueDate < dateKey();
const fmtDate = (ms: number) => new Date(ms).toLocaleDateString("en-IN");

// a task the staff member created for themselves (assigned by = assigned to)
const isSelfAdded = (t: Task) => t.assignedBy === t.assignedTo;
// self-added task still waiting for the operation manager to accept it
const isPendingSelf = (t: Task) => isSelfAdded(t) && t.selfApproval === "pending";
// self-added task the operation manager turned down
const isRejectedSelf = (t: Task) => isSelfAdded(t) && t.selfApproval === "rejected";

/* ───────────── live tasks ───────────── */
// Listens to Firestore, so new / changed tasks appear on screen straight away
// without any reload. Replaces the old one-time load.
const useLiveTasks = (scope: "own" | "all", uid: string) => {
  const [state, setState] = useState({ data: [] as Task[], loading: true, error: "" });

  useEffect(() => {
    setState((s) => ({ ...s, loading: true }));
    const onData = (data: Task[]) => setState({ data, loading: false, error: "" });
    const onError = (e: unknown) =>
      setState((s) => ({ ...s, loading: false, error: errMsg(e) }));

    return scope === "own"
      ? listenMyTasks(uid, onData, onError)
      : listenAllTasks(onData, onError);
  }, [scope, uid]);

  return state;
};

/* ───────────── live timer ───────────── */
const fmtDuration = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((n) => String(n).padStart(2, "0")).join(":");
};

const Timer = ({ task }: { task: Task }) => {
  const running = task.status === "in_progress" && !!task.timerStartedAt;
  const [, tick] = useState(0);

  // re-render every second, only while the timer is running
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  const ms = task.workedMs + (running && task.timerStartedAt ? Date.now() - task.timerStartedAt : 0);

  return (
    <div className="flex items-center gap-2">
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${running ? "animate-pulse bg-emerald-400" : "bg-zinc-600"}`}
      />
      <span
        className={`font-mono text-base tabular-nums ${running ? "text-emerald-400" : "text-zinc-300"}`}
      >
        {fmtDuration(ms)}
      </span>
    </div>
  );
};

/* ───────────── feedback ───────────── */
const FeedbackBox = ({ onSend }: { onSend: (text: string) => Promise<void> }) => {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await onSend(text.trim());
      setText("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 flex gap-2">
      <input
        className={`${inputCls} min-w-0`}
        placeholder="Add feedback…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && send()}
      />
      <Btn variant="ghost" className="shrink-0" disabled={busy} onClick={send}>
        Send
      </Btn>
    </div>
  );
};

/* ───────────── reject reason (used for rework and for declining a self-added task) ───────────── */
const RejectModal = ({
  task,
  onClose,
  onConfirm,
  title = "Send back for rework",
  intro,
  button = "Send back",
}: {
  task: Task;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  title?: string;
  intro?: string;
  button?: string;
}) => {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return setErr("Tell the staff what needs to change.");
    setBusy(true);
    await onConfirm(reason.trim());
    setBusy(false);
  };

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-zinc-400">
          {intro ??
            `“${task.title}” goes back to ${task.assignedToName}. They can resume the timer after fixing it.`}
        </p>
        <Label text="What needs to change?">
          <textarea
            rows={3}
            className={inputCls}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Label>
        <Notice message={err} />
        <Btn type="submit" variant="danger" disabled={busy} className="w-full">
          {busy ? "Sending…" : button}
        </Btn>
      </form>
    </Modal>
  );
};

/* ───────────── pause reason ───────────── */
const PAUSE_QUICK = ["Break", "Waiting for client", "Meeting", "Blocked / need help"];

const PauseModal = ({
  task,
  onClose,
  onConfirm,
}: {
  task: Task;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}) => {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return setErr("Add a reason for pausing.");
    setBusy(true);
    await onConfirm(reason.trim());
    setBusy(false);
  };

  return (
    <Modal title="Pause task" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-zinc-400">
          “{task.title}” will be paused and the timer stops. Tell us why.
        </p>

        <div className="flex flex-wrap gap-2">
          {PAUSE_QUICK.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setReason(q)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                reason === q
                  ? "border-violet-400/60 bg-violet-500/20 text-violet-200"
                  : "border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {q}
            </button>
          ))}
        </div>

        <Label text="Reason for pausing">
          <textarea
            rows={3}
            className={inputCls}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Type a reason…"
          />
        </Label>
        <Notice message={err} />
        <Btn type="submit" disabled={busy} className="w-full">
          {busy ? "Pausing…" : "Pause task"}
        </Btn>
      </form>
    </Modal>
  );
};

const EMPTY_FORM = {
  title: "",
  description: "",
  clientId: "",
  assignedTo: "",
  priority: "medium" as Priority,
  dueDate: "",
};

// self-added tasks have no "assigned to" field: it is always the viewer
const EMPTY_OWN_FORM = {
  title: "",
  description: "",
  clientId: "",
  priority: "medium" as Priority,
  dueDate: "",
};

const TasksPanel = ({
  viewer,
  scope,
  canAssign = false,
  canFeedback = false,
  canAddOwn = false,
  canApproveSelfAdded = false,
  isAdmin = false,
  clientId,
  clientName,
}: Props) => {
  // live: updates by itself whenever any task changes
  const tasks = useLiveTasks(scope, viewer.uid);

  const staff = useLoad(
    () => (canAssign ? listStaff() : Promise.resolve([] as Staff[])),
    [canAssign],
    [] as Staff[]
  );

  // when the panel is locked to one client there is no need to load the client list
  const clients = useLoad(
    () =>
      (canAssign || canAddOwn) && !clientId ? getClients() : Promise.resolve([] as Client[]),
    [canAssign, canAddOwn, clientId],
    [] as Client[]
  );

  const [status, setStatus] = useState<"all" | TaskStatus>("all");
  const [assignee, setAssignee] = useState("all");
  const [onlyPending, setOnlyPending] = useState(false); // show only self-added tasks waiting for approval
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [ownOpen, setOwnOpen] = useState(false);
  const [ownForm, setOwnForm] = useState(EMPTY_OWN_FORM);
  const [ownSaving, setOwnSaving] = useState(false);
  const [rejecting, setRejecting] = useState<Task | null>(null);
  const [declining, setDeclining] = useState<Task | null>(null); // self-added task being turned down
  const [pausing, setPausing] = useState<Task | null>(null); // task waiting for a pause reason
  const [completing, setCompleting] = useState<Task | null>(null); // task waiting for "Complete" confirmation
  const [completeBusy, setCompleteBusy] = useState(false);
  const [err, setErr] = useState("");

  /* ───────────── attendance gate ───────────── */
  // Only the staff view ("own") is gated. Admin / HR views are not.
  const [checkedIn, setCheckedIn] = useState(scope !== "own");

  // Live check-in state. Tasks paused by check-out arrive through the live
  // task listener, so no manual refresh is needed here.
  useEffect(() => {
    if (scope !== "own") {
      setCheckedIn(true);
      return;
    }
    return subscribeCheckedIn(viewer.uid, (v) => setCheckedIn(v));
  }, [scope, viewer.uid]);

  // Forgotten check-out: sweep now, then every minute while the page is open.
  // (Any task it pauses shows up through the live listener.)
  const sweeping = useRef(false);
  useEffect(() => {
    const run = () => {
      if (sweeping.current) return;
      sweeping.current = true;
      autoPauseExpired(scope === "own" ? viewer.uid : undefined)
        .catch(() => {})
        .finally(() => {
          sweeping.current = false;
        });
    };
    run();
    const id = setInterval(run, 60_000);
    return () => clearInterval(id);
  }, [scope, viewer.uid]);

  // tasks of this client only (or everything when no client is given)
  const list = clientId ? tasks.data.filter((t) => t.clientId === clientId) : tasks.data;

  // Who can accept / decline a self-added task when it is first added:
  // an admin, or someone with canApproveSelfAdded (never the person who added it)
  const canApproveSelf = (t: Task) =>
    isSelfAdded(t) && (isAdmin || (canApproveSelfAdded && t.assignedTo !== viewer.uid));
  const pendingForMe = list.filter((t) => isPendingSelf(t) && canApproveSelf(t));

  const people = [...new Map(list.map((t) => [t.assignedTo, t.assignedToName])).entries()];
  const shown = list.filter(
    (t) =>
      (status === "all" || t.status === status) &&
      (assignee === "all" || t.assignedTo === assignee) &&
      (!onlyPending || isPendingSelf(t))
  );

  // Who can approve finished work:
  //  - self-added task: same people as above
  //  - normal task: admin, or the person who assigned it
  const canApprove = (t: Task) => {
    if (isSelfAdded(t)) return canApproveSelf(t);
    return isAdmin || t.assignedBy === viewer.uid;
  };
  const toApprove = list.filter((t) => t.status === "review" && canApprove(t));

  // one running task at a time per person (checked across ALL clients, not just this one)
  const myRunning = tasks.data.find(
    (t) => t.assignedTo === viewer.uid && t.status === "in_progress"
  );

  // runs an action and shows any error. No manual reload: the live listener updates the list.
  const guard = async (fn: () => Promise<void>) => {
    setErr("");
    try {
      await fn();
    } catch (e) {
      setErr(errMsg(e));
    }
  };

  /* ───────────── notifications ───────────── */
  const me = { uid: viewer.uid, name: viewer.name };

  // tell the other side that a task changed.
  // Self-added tasks have no "other side" (assigned by = assigned to), so nothing is sent.
  const tell = (event: TaskEvent, t: Task, extra = "") => {
    if (isSelfAdded(t)) return;
    return notifyTaskEvent(
      event,
      { id: t.id, title: t.title, assignedBy: t.assignedBy, assignedTo: t.assignedTo },
      me,
      extra
    );
  };

  // staff finished the work → approval request goes to whoever assigned it
  const complete = (t: Task) =>
    guard(async () => {
      await completeTask(t.id);
      tell("review", t);
    });

  // confirmed in the modal
  const confirmComplete = async () => {
    if (!completing) return;
    setCompleteBusy(true);
    try {
      await complete(completing);
    } finally {
      setCompleteBusy(false);
      setCompleting(null);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const person = staff.data.find((s) => s.uid === form.assignedTo);

    let client: { id: string; name: string } | null = null;
    if (clientId) {
      client = { id: clientId, name: clientName ?? "" };
    } else {
      const c = clients.data.find((x) => clientKey(x) === form.clientId);
      if (c) client = { id: clientKey(c), name: c.name }; // change if your Client field is named differently
    }

    if (!form.title.trim() || !client || !person)
      return setErr(
        clientId
          ? "Add a title and choose who it's for."
          : "Add a title, select the client, and choose who it's for."
      );

    setSaving(true);
    await guard(async () => {
      const taskId: unknown = await createTask({
        title: form.title.trim(),
        description: form.description.trim(),
        clientId: client!.id,
        clientName: client!.name,
        assignedTo: person.uid,
        assignedToName: person.name,
        assignedBy: viewer.uid,
        assignedByName: viewer.name,
        priority: form.priority,
        dueDate: form.dueDate,
      });

      // tell the person responsible (their bell plays the sound)
      notifyTaskAssigned({
        toUid: person.uid,
        taskTitle: form.title.trim(),
        clientName: client!.name,
        actor: me,
        taskId: typeof taskId === "string" ? taskId : undefined,
      });

      setForm(EMPTY_FORM);
      setOpen(false);
    });
    setSaving(false);
  };

  // staff adds a task for themselves (assigned by = assigned to = the viewer).
  // It waits for approval, unless the person adding it is an approver themselves.
  const submitOwn = async (e: React.FormEvent) => {
    e.preventDefault();

    let client: { id: string; name: string } | null = null;
    if (clientId) {
      client = { id: clientId, name: clientName ?? "" };
    } else {
      const c = clients.data.find((x) => clientKey(x) === ownForm.clientId);
      if (c) client = { id: clientKey(c), name: c.name };
    }

    if (!ownForm.title.trim() || !client)
      return setErr(clientId ? "Add a title." : "Add a title and select the client.");

    setOwnSaving(true);
    await guard(async () => {
      await createTask({
        title: ownForm.title.trim(),
        description: ownForm.description.trim(),
        clientId: client!.id,
        clientName: client!.name,
        assignedTo: viewer.uid,
        assignedToName: viewer.name,
        assignedBy: viewer.uid,
        assignedByName: viewer.name,
        priority: ownForm.priority,
        dueDate: ownForm.dueDate,
        selfApproval: canApproveSelfAdded || isAdmin ? "approved" : "pending",
      });

      setOwnForm(EMPTY_OWN_FORM);
      setOwnOpen(false);
    });
    setOwnSaving(false);
  };

  /* buttons shown to the assigned staff (each grows to share the row on phones) */
  const BTN = "flex-1 sm:flex-none";

  const staffActions = (t: Task) => {
    // self-added task that has not been accepted yet: no work can start
    if (isPendingSelf(t)) {
      return (
        <span className="text-xs text-amber-300">
          Waiting for operation manager approval before you can start
        </span>
      );
    }
    if (isRejectedSelf(t)) {
      return (
        <span className="text-xs text-red-300">
          Not approved{t.selfRejectReason ? `: ${t.selfRejectReason}` : ""}
        </span>
      );
    }

    const startLabel = t.status === "todo" ? "Start work" : "Resume";
    const otherRunning = !!myRunning && myRunning.id !== t.id;
    const startDisabled = !checkedIn || otherRunning;
    const startTitle = !checkedIn
      ? "Check in first to start work"
      : otherRunning
      ? "Pause your running task first"
      : undefined;

    if (t.status === "todo" || t.status === "paused" || t.status === "rework") {
      return (
        <>
          <Btn
            className={BTN}
            disabled={startDisabled}
            title={startTitle}
            onClick={() =>
              guard(async () => {
                await startTask(t.id, viewer.uid);
                tell(t.status === "todo" ? "started" : "resumed", t);
              })
            }
          >
            {startLabel}
          </Btn>
          {t.status === "paused" && (
            <Btn variant="ghost" className={BTN} onClick={() => setCompleting(t)}>
              Complete
            </Btn>
          )}
        </>
      );
    }

    if (t.status === "in_progress") {
      return (
        <>
          {/* pausing asks for a reason first */}
          <Btn variant="ghost" className={BTN} onClick={() => setPausing(t)}>
            Pause
          </Btn>
          <Btn className={BTN} onClick={() => setCompleting(t)}>
            Complete
          </Btn>
        </>
      );
    }

    return null;
  };

  return (
    <div className="min-w-0 space-y-4 sm:space-y-5">
      {/* filters: stacked and full width on phones */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as "all" | TaskStatus)}
          className={`${inputCls} sm:!w-auto`}
        >
          <option value="all">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>

        {scope === "all" && (
          <select
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            className={`${inputCls} sm:!w-auto`}
          >
            <option value="all">Everyone</option>
            {people.map(([uid, name]) => (
              <option key={uid} value={uid}>
                {name}
              </option>
            ))}
          </select>
        )}

        {(canAddOwn || canAssign) && (
          <div className="flex flex-col gap-2.5 sm:ml-auto sm:flex-row sm:gap-3">
            {canAddOwn && (
              <Btn
                variant={canAssign ? "ghost" : undefined}
                className="w-full sm:w-auto"
                onClick={() => setOwnOpen(true)}
              >
                Add my task
              </Btn>
            )}
            {canAssign && (
              <Btn className="w-full sm:w-auto" onClick={() => setOpen(true)}>
                Assign task
              </Btn>
            )}
          </div>
        )}
      </div>

      {/* check-in reminder for staff */}
      {scope === "own" && !checkedIn && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          You are not checked in. Check in from Attendance to start your work. Your running
          tasks pause automatically when you check out.
        </div>
      )}

      {/* self-added tasks waiting for this person to accept them */}
      {pendingForMe.length > 0 && (
        <button
          type="button"
          onClick={() => {
            setStatus("all");
            setOnlyPending((p) => !p);
          }}
          className="w-full rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-left text-sm text-amber-200"
        >
          {pendingForMe.length} self-added task{pendingForMe.length > 1 ? "s" : ""} waiting for
          your approval — {onlyPending ? "tap to show all tasks" : "tap to review"}
        </button>
      )}

      {toApprove.length > 0 && (
        <button
          type="button"
          onClick={() => {
            setOnlyPending(false);
            setStatus("review");
          }}
          className="w-full rounded-xl border border-sky-400/30 bg-sky-400/10 px-4 py-3 text-left text-sm text-sky-200"
        >
          {toApprove.length} task{toApprove.length > 1 ? "s" : ""} waiting for your approval — tap to
          review
        </button>
      )}

      <Notice message={err || tasks.error} />

      {shown.map((t) => (
        <Card key={t.id} className="min-w-0 p-3.5 sm:p-5">
          {/* title + badges: badges drop under the title on phones */}
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
            <div className="min-w-0">
              <p className="break-words font-semibold">{t.title}</p>
              {!clientId && t.clientName && (
                <p className="mt-0.5 break-words text-xs text-zinc-300">Client: {t.clientName}</p>
              )}
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                {scope === "all" && `${t.assignedToName} · `}
                {isSelfAdded(t) ? "Added by self" : `Assigned by ${t.assignedByName}`}
                {t.dueDate && ` · Deadline ${t.dueDate}`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
              {isPendingSelf(t) && <Badge tone="amber">Pending approval</Badge>}
              {isRejectedSelf(t) && <Badge tone="red">Not approved</Badge>}
              {isSelfAdded(t) && !isPendingSelf(t) && !isRejectedSelf(t) && (
                <Badge tone="sky">Self-added</Badge>
              )}
              <Badge tone={PRIORITY_TONE[t.priority]}>{t.priority}</Badge>
              {isOverdue(t) && <Badge tone="red">Overdue</Badge>}
              <Badge tone={STATUS_TONE[t.status]}>
                {t.status === "paused" && t.pauseReason
                  ? PAUSE_LABELS[t.pauseReason]
                  : STATUS_LABELS[t.status]}
              </Badge>
            </div>
          </div>

          {t.description && (
            <p className="mt-3 whitespace-pre-wrap break-words text-sm text-zinc-400">
              {t.description}
            </p>
          )}

          {/* why the task is paused (typed by the staff) */}
          {t.status === "paused" && t.pauseNote && (
            <p className="mt-3 break-words rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-sm text-amber-200">
              <span className="font-medium">Paused reason:</span> {t.pauseNote}
            </p>
          )}

          {/* timer + actions: stacked on phones, side by side from sm up */}
          <div className="mt-4 flex flex-col gap-3 rounded-xl bg-white/[0.03] p-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-zinc-500">Time spent</p>
              <Timer task={t} />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {t.assignedTo === viewer.uid && staffActions(t)}

              {/* accept / decline a self-added task before any work starts */}
              {isPendingSelf(t) && canApproveSelf(t) && (
                <>
                  <Btn
                    className={BTN}
                    onClick={() =>
                      guard(async () => {
                        await approveSelfTask(t.id, viewer.uid, viewer.name);
                      })
                    }
                  >
                    Approve task
                  </Btn>
                  <Btn variant="danger" className={BTN} onClick={() => setDeclining(t)}>
                    Reject
                  </Btn>
                </>
              )}

              {isPendingSelf(t) && !canApproveSelf(t) && t.assignedTo !== viewer.uid && (
                <span className="text-xs text-zinc-500">Waiting for the operation manager</span>
              )}

              {t.status === "review" && canApprove(t) && (
                <>
                  <Btn
                    className={BTN}
                    onClick={() =>
                      guard(async () => {
                        await approveTask(t.id, viewer.uid, viewer.name);
                        tell("approved", t);
                      })
                    }
                  >
                    Approve
                  </Btn>
                  <Btn variant="danger" className={BTN} onClick={() => setRejecting(t)}>
                    Reject
                  </Btn>
                </>
              )}

              {t.status === "review" && !canApprove(t) && (
                <span className="text-xs text-zinc-500">
                  {isSelfAdded(t)
                    ? "Waiting for the operation manager or an admin"
                    : `Waiting for ${t.assignedByName} or an admin`}
                </span>
              )}

              {t.status === "done" && t.approvedAt && (
                <span className="text-xs text-emerald-400">
                  Approved by {t.approvedByName} · {fmtDate(t.approvedAt)}
                </span>
              )}
            </div>
          </div>

          {t.feedback.length > 0 && (
            <div className="mt-3 space-y-2">
              {t.feedback.map((f, i) => (
                <div key={i} className="rounded-lg bg-white/5 px-3 py-2 text-sm">
                  <span className="font-medium text-sky-300">{f.byName}</span>
                  <span className="ml-2 text-xs text-zinc-500">{fmtDate(f.at)}</span>
                  <p className="mt-0.5 break-words text-zinc-300">{f.text}</p>
                </div>
              ))}
            </div>
          )}

          {canFeedback && (
            <FeedbackBox
              onSend={(text) =>
                guard(async () => {
                  await addFeedback(t.id, { by: viewer.uid, byName: viewer.name, text });
                  tell("feedback", t, text);
                })
              }
            />
          )}
        </Card>
      ))}

      {!shown.length && (
        <Card className="p-8 text-center text-sm text-zinc-500">
          {tasks.loading
            ? "Loading…"
            : onlyPending
            ? "No self-added tasks waiting for approval."
            : clientId
            ? `No tasks for ${clientName ?? "this client"} yet.`
            : scope === "own"
            ? "No work assigned to you yet."
            : "No tasks found."}
        </Card>
      )}

      {/* ask why before pausing */}
      {pausing && (
        <PauseModal
          task={pausing}
          onClose={() => setPausing(null)}
          onConfirm={async (reason) => {
            await guard(async () => {
              await pauseTask(pausing.id, "manual", {
                text: reason,
                by: viewer.uid,
                byName: viewer.name,
              });
              tell("paused", pausing, reason);
            });
            setPausing(null);
          }}
        />
      )}

      {/* confirm before sending the task for approval */}
      {completing && (
        <ConfirmModal
          title="Complete this task?"
          message={
            isSelfAdded(completing)
              ? `“${completing.title}” will be marked as complete and sent for approval. The timer stops.`
              : `“${completing.title}” will be marked as complete and sent to ${completing.assignedByName} for approval. The timer stops.`
          }
          confirmText="Complete"
          loading={completeBusy}
          onClose={() => setCompleting(null)}
          onConfirm={confirmComplete}
        />
      )}

      {/* send finished work back for rework */}
      {rejecting && (
        <RejectModal
          task={rejecting}
          onClose={() => setRejecting(null)}
          onConfirm={async (reason) => {
            await guard(async () => {
              await rejectTask(rejecting.id, viewer.uid, viewer.name, reason);
              tell("rejected", rejecting, reason);
            });
            setRejecting(null);
          }}
        />
      )}

      {/* turn down a self-added task */}
      {declining && (
        <RejectModal
          task={declining}
          title="Reject this task"
          intro={`“${declining.title}” was added by ${declining.assignedToName}. They won't be able to start it.`}
          button="Reject task"
          onClose={() => setDeclining(null)}
          onConfirm={async (reason) => {
            await guard(async () => {
              await rejectSelfTask(declining.id, viewer.uid, viewer.name, reason);
            });
            setDeclining(null);
          }}
        />
      )}

      {/* staff adds a task for themselves */}
      {ownOpen && (
        <Modal title="Add my task" onClose={() => setOwnOpen(false)}>
          <form onSubmit={submitOwn} className="space-y-4">
            <Label text="Title">
              <input
                className={inputCls}
                value={ownForm.title}
                onChange={(e) => setOwnForm({ ...ownForm, title: e.target.value })}
              />
            </Label>
            <Label text="Description">
              <textarea
                rows={3}
                className={inputCls}
                value={ownForm.description}
                onChange={(e) => setOwnForm({ ...ownForm, description: e.target.value })}
              />
            </Label>

            {clientId ? (
              <div>
                <p className="mb-1 text-sm text-zinc-400">Client</p>
                <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
                  {clientName}
                </p>
              </div>
            ) : (
              <Label text="Client">
                <select
                  className={inputCls}
                  value={ownForm.clientId}
                  onChange={(e) => setOwnForm({ ...ownForm, clientId: e.target.value })}
                >
                  <option value="">
                    {clients.loading ? "Loading clients…" : "Select client…"}
                  </option>
                  {clients.data.map((c) => (
                    <option key={clientKey(c)} value={clientKey(c)}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Label>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Label text="Priority">
                <select
                  className={inputCls}
                  value={ownForm.priority}
                  onChange={(e) =>
                    setOwnForm({ ...ownForm, priority: e.target.value as Priority })
                  }
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </Label>
              <Label text="Deadline">
                <input
                  type="date"
                  min={dateKey()}
                  className={inputCls}
                  value={ownForm.dueDate}
                  onChange={(e) => setOwnForm({ ...ownForm, dueDate: e.target.value })}
                />
              </Label>
            </div>

            <p className="text-xs text-zinc-500">
              {canApproveSelfAdded || isAdmin
                ? "This task is assigned to you and is approved automatically."
                : "This task needs the operation manager's approval before you can start it."}
            </p>
            <Notice message={err} />
            <Btn type="submit" disabled={ownSaving} className="w-full">
              {ownSaving ? "Adding…" : canApproveSelfAdded || isAdmin ? "Add task" : "Send for approval"}
            </Btn>
          </form>
        </Modal>
      )}

      {open && (
        <Modal title="Assign task" onClose={() => setOpen(false)}>
          <form onSubmit={submit} className="space-y-4">
            <Label text="Title">
              <input
                className={inputCls}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </Label>
            <Label text="Description">
              <textarea
                rows={3}
                className={inputCls}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Label>

            {clientId ? (
              <div>
                <p className="mb-1 text-sm text-zinc-400">Client</p>
                <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
                  {clientName}
                </p>
              </div>
            ) : (
              <Label text="Client">
                <select
                  className={inputCls}
                  value={form.clientId}
                  onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                >
                  <option value="">
                    {clients.loading ? "Loading clients…" : "Select client…"}
                  </option>
                  {clients.data.map((c) => (
                    <option key={clientKey(c)} value={clientKey(c)}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Label>
            )}

            <Label text="Assign to">
              <select
                className={inputCls}
                value={form.assignedTo}
                onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
              >
                <option value="">Choose staff…</option>
                {staff.data
                  .filter((s) => s.active)
                  .map((s) => (
                    <option key={s.uid} value={s.uid}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </Label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Label text="Priority">
                <select
                  className={inputCls}
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </Label>
              <Label text="Deadline">
                <input
                  type="date"
                  min={dateKey()}
                  className={inputCls}
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                />
              </Label>
            </div>
            <Notice message={err} />
            <Btn type="submit" disabled={saving} className="w-full">
              {saving ? "Assigning…" : "Assign task"}
            </Btn>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default TasksPanel;