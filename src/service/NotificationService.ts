import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../config/firebase/firebase";
import { listStaff } from "./staffService";
import { hasPermission } from "../utils/types/staffRoles";

/**
 * In-app notifications (one Firestore document per notification, addressed to one person).
 *
 * Save as: src/service/NotificationService.ts
 *
 * Document shape (collection "notifications"):
 *   userId     who receives it
 *   type       see NotificationType
 *   title      short heading
 *   message    one line of detail
 *   taskId?    the task it is about (when known)
 *   actorUid   who caused it
 *   actorName  their name
 *   createdAt  ms
 *   read       false until the person opens / marks it
 */
const COL = "notifications";

export type NotificationType =
  | "task_assigned"
  | "task_started"
  | "task_resumed"
  | "task_paused"
  | "task_review"
  | "task_approved"
  | "task_rejected"
  | "task_feedback"
  | "attendance_in"
  | "attendance_break"
  | "attendance_back"
  | "attendance_out"
  | "leave_applied"
  | "leave_approved"
  | "leave_rejected";

export type AppNotification = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  taskId?: string;
  actorUid: string;
  actorName: string;
  createdAt: number;
  read: boolean;
};

export type Tone = "violet" | "emerald" | "amber" | "sky" | "red" | "zinc";

export const TYPE_META: Record<NotificationType, { label: string; tone: Tone }> = {
  task_assigned: { label: "New task", tone: "violet" },
  task_started: { label: "Started", tone: "emerald" },
  task_resumed: { label: "Resumed", tone: "emerald" },
  task_paused: { label: "Paused", tone: "amber" },
  task_review: { label: "Needs approval", tone: "sky" },
  task_approved: { label: "Approved", tone: "emerald" },
  task_rejected: { label: "Sent back", tone: "red" },
  task_feedback: { label: "Feedback", tone: "zinc" },
  attendance_in: { label: "Checked in", tone: "emerald" },
  attendance_break: { label: "On break", tone: "amber" },
  attendance_back: { label: "Back from break", tone: "sky" },
  attendance_out: { label: "Checked out", tone: "zinc" },
  leave_applied: { label: "Leave request", tone: "amber" },
  leave_approved: { label: "Leave approved", tone: "emerald" },
  leave_rejected: { label: "Leave rejected", tone: "red" },
};

/* ───────────── create ───────────── */
type NotifyInput = {
  toUid: string;
  type: NotificationType;
  title: string;
  message: string;
  taskId?: string;
  actorUid: string;
  actorName: string;
};

/** Never throws, never notifies yourself. Safe to call without await. */
export async function notify(input: NotifyInput): Promise<void> {
  try {
    if (!input.toUid || input.toUid === input.actorUid) return;
    await addDoc(collection(db, COL), {
      userId: input.toUid,
      type: input.type,
      title: input.title,
      message: input.message,
      ...(input.taskId ? { taskId: input.taskId } : {}),
      actorUid: input.actorUid,
      actorName: input.actorName,
      createdAt: Date.now(),
      read: false,
    });
  } catch {
    /* a failed notification must never break the task action */
  }
}

type Actor = { uid: string; name: string };

/** Operation manager / admin assigned a task → tell the person responsible */
export const notifyTaskAssigned = (p: {
  toUid: string;
  taskTitle: string;
  clientName?: string;
  actor: Actor;
  taskId?: string;
}) =>
  notify({
    toUid: p.toUid,
    type: "task_assigned",
    title: "New task assigned",
    message: `${p.actor.name} assigned you “${p.taskTitle}”${p.clientName ? ` for ${p.clientName}` : ""}.`,
    taskId: p.taskId,
    actorUid: p.actor.uid,
    actorName: p.actor.name,
  });

type TaskRef = {
  id: string;
  title: string;
  assignedBy: string;
  assignedTo: string;
};

export type TaskEvent = "started" | "resumed" | "paused" | "review" | "approved" | "rejected" | "feedback";

/**
 * A task changed → tell the other side.
 *   staff events (started / resumed / paused / review) → whoever assigned the task
 *   manager events (approved / rejected)               → the person responsible
 *   feedback                                           → the other person
 */
export const notifyTaskEvent = (event: TaskEvent, task: TaskRef, actor: Actor, extra = "") => {
  const q = `“${task.title}”`;
  const base = { taskId: task.id, actorUid: actor.uid, actorName: actor.name };

  switch (event) {
    case "started":
      return notify({ ...base, toUid: task.assignedBy, type: "task_started", title: "Work started", message: `${actor.name} started ${q}.` });
    case "resumed":
      return notify({ ...base, toUid: task.assignedBy, type: "task_resumed", title: "Work resumed", message: `${actor.name} resumed ${q}.` });
    case "paused":
      return notify({
        ...base,
        toUid: task.assignedBy,
        type: "task_paused",
        title: "Work paused",
        message: `${actor.name} paused ${q}${extra ? `: ${extra}` : "."}`,
      });
    case "review":
      return notify({ ...base, toUid: task.assignedBy, type: "task_review", title: "Sent for approval", message: `${actor.name} finished ${q} and sent it for your approval.` });
    case "approved":
      return notify({ ...base, toUid: task.assignedTo, type: "task_approved", title: "Task approved", message: `${actor.name} approved ${q}.` });
    case "rejected":
      return notify({ ...base, toUid: task.assignedTo, type: "task_rejected", title: "Sent back for rework", message: `${actor.name} sent ${q} back${extra ? `: ${extra}` : "."}` });
    case "feedback":
      return notify({
        ...base,
        toUid: actor.uid === task.assignedTo ? task.assignedBy : task.assignedTo,
        type: "task_feedback",
        title: "New feedback",
        message: `${actor.name} on ${q}: ${extra}`,
      });
  }
};

/* ───────────── attendance → HR manager ───────────── */
export type AttendanceEvent = "check_in" | "break" | "back" | "check_out";

const ATTENDANCE_COPY: Record<
  AttendanceEvent,
  { type: NotificationType; title: (n: string) => string; message: (n: string, t: string) => string }
> = {
  check_in: {
    type: "attendance_in",
    title: (n) => `${n} checked in`,
    message: (n, t) => `${n} marked attendance at ${t}.`,
  },
  break: {
    type: "attendance_break",
    title: (n) => `${n} is on a break`,
    message: (n, t) => `${n} went on a break at ${t}.`,
  },
  back: {
    type: "attendance_back",
    title: (n) => `${n} checked in again`,
    message: (n, t) => `${n} checked in again at ${t}.`,
  },
  check_out: {
    type: "attendance_out",
    title: (n) => `${n} checked out`,
    message: (n, t) => `${n} checked out at ${t}.`,
  },
};

/** Every active HR manager (anyone with the "dashboard.hr" permission), except the actor */
const hrRecipients = async (actorUid: string) => {
  const people = await listStaff();
  return people.filter((s) => s.active && s.uid !== actorUid && hasPermission(s, "dashboard.hr"));
};

/**
 * Someone marked attendance or took a break → tell every active HR manager.
 * Never throws and never notifies the person themselves. Safe to call without await.
 */
export async function notifyAttendanceEvent(event: AttendanceEvent, actor: Actor): Promise<void> {
  try {
    const hr = await hrRecipients(actor.uid);
    const time = new Date().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
    const copy = ATTENDANCE_COPY[event];

    await Promise.allSettled(
      hr.map((s) =>
        notify({
          toUid: s.uid,
          type: copy.type,
          title: copy.title(actor.name),
          message: copy.message(actor.name, time),
          actorUid: actor.uid,
          actorName: actor.name,
        })
      )
    );
  } catch {
    /* attendance must never fail because a notification failed */
  }
}

/* ───────────── leave ───────────── */
type LeaveRef = {
  uid: string; // the staff member the leave belongs to
  name: string;
  date: string;
  typeLabel: string; // e.g. "Casual leave"
  half?: boolean;
  note?: string;
};

/** Staff applied for leave → tell every active HR manager */
export async function notifyLeaveApplied(leave: LeaveRef): Promise<void> {
  try {
    const hr = await hrRecipients(leave.uid);
    const when = `${leave.date}${leave.half ? " (half day)" : ""}`;
    const reason = leave.note ? ` Reason: ${leave.note}` : "";

    await Promise.allSettled(
      hr.map((s) =>
        notify({
          toUid: s.uid,
          type: "leave_applied",
          title: `${leave.name} applied for leave`,
          message: `${leave.name} applied for ${leave.typeLabel.toLowerCase()} on ${when}.${reason}`,
          actorUid: leave.uid,
          actorName: leave.name,
        })
      )
    );
  } catch {
    /* applying for leave must never fail because a notification failed */
  }
}

/** HR approved / rejected a leave → tell the staff member */
export async function notifyLeaveDecision(
  decision: "approved" | "rejected",
  leave: LeaveRef,
  actor: Actor
): Promise<void> {
  const when = `${leave.date}${leave.half ? " (half day)" : ""}`;
  const ok = decision === "approved";

  await notify({
    toUid: leave.uid,
    type: ok ? "leave_approved" : "leave_rejected",
    title: ok ? "Leave approved" : "Leave rejected",
    message: `${actor.name} ${ok ? "approved" : "rejected"} your ${leave.typeLabel.toLowerCase()} on ${when}.`,
    actorUid: actor.uid,
    actorName: actor.name,
  });
}

/* ───────────── live list ───────────── */
/**
 * Calls `cb` with the person's notifications (newest first) and, after the first
 * load, the ones that just arrived (so the UI can play a sound / show a toast).
 */
export function subscribeNotifications(
  uid: string,
  cb: (list: AppNotification[], fresh: AppNotification[]) => void
) {
  let first = true;
  return onSnapshot(
    query(collection(db, COL), where("userId", "==", uid)),
    (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<AppNotification, "id">) }))
        .sort((a, b) => b.createdAt - a.createdAt);

      const fresh = first
        ? []
        : snap
            .docChanges()
            .filter((c) => c.type === "added" && !c.doc.metadata.hasPendingWrites)
            .map((c) => ({ id: c.doc.id, ...(c.doc.data() as Omit<AppNotification, "id">) }));

      first = false;
      cb(list, fresh);
    },
    () => cb([], [])
  );
}

/* ───────────── read / clear ───────────── */
export const markRead = (id: string) => updateDoc(doc(db, COL, id), { read: true });

export const deleteNotification = (id: string) => deleteDoc(doc(db, COL, id));

// Firestore batches hold at most 500 writes
const chunked = async (ids: string[], run: (batchIds: string[]) => Promise<void>) => {
  for (let i = 0; i < ids.length; i += 400) await run(ids.slice(i, i + 400));
};

export async function markAllRead(uid: string) {
  const snap = await getDocs(
    query(collection(db, COL), where("userId", "==", uid), where("read", "==", false))
  );
  await chunked(
    snap.docs.map((d) => d.id),
    async (part) => {
      const b = writeBatch(db);
      part.forEach((id) => b.update(doc(db, COL, id), { read: true }));
      await b.commit();
    }
  );
}

export async function clearAll(uid: string) {
  const snap = await getDocs(query(collection(db, COL), where("userId", "==", uid)));
  await chunked(
    snap.docs.map((d) => d.id),
    async (part) => {
      const b = writeBatch(db);
      part.forEach((id) => b.delete(doc(db, COL, id)));
      await b.commit();
    }
  );
}

/* ───────────── sound ───────────── */
// Put the file at: public/sounds/notification.wav
// Browsers only allow audio after one click / key press on the page,
// so the first interaction "unlocks" it (see NotificationBell).
let audio: HTMLAudioElement | null = null;

const getAudio = () => {
  if (!audio && typeof Audio !== "undefined") {
    audio = new Audio("/sounds/notification.wav");
    audio.preload = "auto";
    audio.volume = 0.7;
  }
  return audio;
};

export function unlockSound() {
  const a = getAudio();
  if (!a) return;
  a.muted = true;
  a.play()
    .then(() => {
      a.pause();
      a.currentTime = 0;
      a.muted = false;
    })
    .catch(() => {
      a.muted = false;
    });
}

export function playNotificationSound() {
  const a = getAudio();
  if (!a) return;
  a.muted = false;
  a.currentTime = 0;
  void a.play().catch(() => {
    /* blocked until the person interacts with the page */
  });
}