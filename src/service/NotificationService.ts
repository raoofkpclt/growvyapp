// import {
//   addDoc,
//   collection,
//   deleteDoc,
//   doc,
//   getDocs,
//   onSnapshot,
//   query,
//   updateDoc,
//   where,
//   writeBatch,
// } from "firebase/firestore";
// import { db } from "../config/firebase/firebase";

// /**
//  * In-app notifications (one Firestore document per notification, addressed to one person).
//  *
//  * Save as: src/service/NotificationService.ts
//  *
//  * Document shape (collection "notifications"):
//  *   userId     who receives it
//  *   type       see NotificationType
//  *   title      short heading
//  *   message    one line of detail
//  *   taskId?    the task it is about (when known)
//  *   actorUid   who caused it
//  *   actorName  their name
//  *   createdAt  ms
//  *   read       false until the person opens / marks it
//  */
// const COL = "notifications";

// export type NotificationType =
//   | "task_assigned"
//   | "task_started"
//   | "task_resumed"
//   | "task_paused"
//   | "task_review"
//   | "task_approved"
//   | "task_rejected"
//   | "task_feedback";

// export type AppNotification = {
//   id: string;
//   userId: string;
//   type: NotificationType;
//   title: string;
//   message: string;
//   taskId?: string;
//   actorUid: string;
//   actorName: string;
//   createdAt: number;
//   read: boolean;
// };

// export type Tone = "violet" | "emerald" | "amber" | "sky" | "red" | "zinc";

// export const TYPE_META: Record<NotificationType, { label: string; tone: Tone }> = {
//   task_assigned: { label: "New task", tone: "violet" },
//   task_started: { label: "Started", tone: "emerald" },
//   task_resumed: { label: "Resumed", tone: "emerald" },
//   task_paused: { label: "Paused", tone: "amber" },
//   task_review: { label: "Needs approval", tone: "sky" },
//   task_approved: { label: "Approved", tone: "emerald" },
//   task_rejected: { label: "Sent back", tone: "red" },
//   task_feedback: { label: "Feedback", tone: "zinc" },
// };

// /* ───────────── create ───────────── */
// type NotifyInput = {
//   toUid: string;
//   type: NotificationType;
//   title: string;
//   message: string;
//   taskId?: string;
//   actorUid: string;
//   actorName: string;
// };

// /** Never throws, never notifies yourself. Safe to call without await. */
// export async function notify(input: NotifyInput): Promise<void> {
//   try {
//     if (!input.toUid || input.toUid === input.actorUid) return;
//     await addDoc(collection(db, COL), {
//       userId: input.toUid,
//       type: input.type,
//       title: input.title,
//       message: input.message,
//       ...(input.taskId ? { taskId: input.taskId } : {}),
//       actorUid: input.actorUid,
//       actorName: input.actorName,
//       createdAt: Date.now(),
//       read: false,
//     });
//   } catch {
//     /* a failed notification must never break the task action */
//   }
// }

// type Actor = { uid: string; name: string };

// /** Operation manager / admin assigned a task → tell the person responsible */
// export const notifyTaskAssigned = (p: {
//   toUid: string;
//   taskTitle: string;
//   clientName?: string;
//   actor: Actor;
//   taskId?: string;
// }) =>
//   notify({
//     toUid: p.toUid,
//     type: "task_assigned",
//     title: "New task assigned",
//     message: `${p.actor.name} assigned you “${p.taskTitle}”${p.clientName ? ` for ${p.clientName}` : ""}.`,
//     taskId: p.taskId,
//     actorUid: p.actor.uid,
//     actorName: p.actor.name,
//   });

// type TaskRef = {
//   id: string;
//   title: string;
//   assignedBy: string;
//   assignedTo: string;
// };

// export type TaskEvent = "started" | "resumed" | "paused" | "review" | "approved" | "rejected" | "feedback";

// /**
//  * A task changed → tell the other side.
//  *   staff events (started / resumed / paused / review) → whoever assigned the task
//  *   manager events (approved / rejected)               → the person responsible
//  *   feedback                                           → the other person
//  */
// export const notifyTaskEvent = (event: TaskEvent, task: TaskRef, actor: Actor, extra = "") => {
//   const q = `“${task.title}”`;
//   const base = { taskId: task.id, actorUid: actor.uid, actorName: actor.name };

//   switch (event) {
//     case "started":
//       return notify({ ...base, toUid: task.assignedBy, type: "task_started", title: "Work started", message: `${actor.name} started ${q}.` });
//     case "resumed":
//       return notify({ ...base, toUid: task.assignedBy, type: "task_resumed", title: "Work resumed", message: `${actor.name} resumed ${q}.` });
//     case "paused":
//       return notify({ ...base, toUid: task.assignedBy, type: "task_paused", title: "Work paused", message: `${actor.name} paused ${q}.` });
//     case "review":
//       return notify({ ...base, toUid: task.assignedBy, type: "task_review", title: "Sent for approval", message: `${actor.name} finished ${q} and sent it for your approval.` });
//     case "approved":
//       return notify({ ...base, toUid: task.assignedTo, type: "task_approved", title: "Task approved", message: `${actor.name} approved ${q}.` });
//     case "rejected":
//       return notify({ ...base, toUid: task.assignedTo, type: "task_rejected", title: "Sent back for rework", message: `${actor.name} sent ${q} back${extra ? `: ${extra}` : "."}` });
//     case "feedback":
//       return notify({
//         ...base,
//         toUid: actor.uid === task.assignedTo ? task.assignedBy : task.assignedTo,
//         type: "task_feedback",
//         title: "New feedback",
//         message: `${actor.name} on ${q}: ${extra}`,
//       });
//   }
// };

// /* ───────────── live list ───────────── */
// /**
//  * Calls `cb` with the person's notifications (newest first) and, after the first
//  * load, the ones that just arrived (so the UI can play a sound / show a toast).
//  */
// export function subscribeNotifications(
//   uid: string,
//   cb: (list: AppNotification[], fresh: AppNotification[]) => void
// ) {
//   let first = true;
//   return onSnapshot(
//     query(collection(db, COL), where("userId", "==", uid)),
//     (snap) => {
//       const list = snap.docs
//         .map((d) => ({ id: d.id, ...(d.data() as Omit<AppNotification, "id">) }))
//         .sort((a, b) => b.createdAt - a.createdAt);

//       const fresh = first
//         ? []
//         : snap
//             .docChanges()
//             .filter((c) => c.type === "added" && !c.doc.metadata.hasPendingWrites)
//             .map((c) => ({ id: c.doc.id, ...(c.doc.data() as Omit<AppNotification, "id">) }));

//       first = false;
//       cb(list, fresh);
//     },
//     () => cb([], [])
//   );
// }

// /* ───────────── read / clear ───────────── */
// export const markRead = (id: string) => updateDoc(doc(db, COL, id), { read: true });

// export const deleteNotification = (id: string) => deleteDoc(doc(db, COL, id));

// // Firestore batches hold at most 500 writes
// const chunked = async (ids: string[], run: (batchIds: string[]) => Promise<void>) => {
//   for (let i = 0; i < ids.length; i += 400) await run(ids.slice(i, i + 400));
// };

// export async function markAllRead(uid: string) {
//   const snap = await getDocs(
//     query(collection(db, COL), where("userId", "==", uid), where("read", "==", false))
//   );
//   await chunked(
//     snap.docs.map((d) => d.id),
//     async (part) => {
//       const b = writeBatch(db);
//       part.forEach((id) => b.update(doc(db, COL, id), { read: true }));
//       await b.commit();
//     }
//   );
// }

// export async function clearAll(uid: string) {
//   const snap = await getDocs(query(collection(db, COL), where("userId", "==", uid)));
//   await chunked(
//     snap.docs.map((d) => d.id),
//     async (part) => {
//       const b = writeBatch(db);
//       part.forEach((id) => b.delete(doc(db, COL, id)));
//       await b.commit();
//     }
//   );
// }

// /* ───────────── sound ───────────── */
// // Browsers only allow sound after the person has clicked or typed on the page once,
// // so the audio is unlocked on the first interaction (see NotificationBell).
// let ctx: AudioContext | null = null;

// export function unlockSound() {
//   try {
//     const AC =
//       window.AudioContext ||
//       (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
//     if (!AC) return;
//     ctx ??= new AC();
//     if (ctx.state === "suspended") void ctx.resume();
//   } catch {
//     /* no sound available */
//   }
// }

// /** a short two-note chime, no audio file needed */
// export function playNotificationSound() {
//   unlockSound();
//   if (!ctx || ctx.state !== "running") return;
//   const t0 = ctx.currentTime;
//   [
//     { f: 880, at: 0 },
//     { f: 1318.5, at: 0.16 },
//   ].forEach(({ f, at }) => {
//     const osc = ctx!.createOscillator();
//     const gain = ctx!.createGain();
//     osc.type = "sine";
//     osc.frequency.value = f;
//     gain.gain.setValueAtTime(0.0001, t0 + at);
//     gain.gain.exponentialRampToValueAtTime(0.25, t0 + at + 0.02);
//     gain.gain.exponentialRampToValueAtTime(0.0001, t0 + at + 0.45);
//     osc.connect(gain).connect(ctx!.destination);
//     osc.start(t0 + at);
//     osc.stop(t0 + at + 0.5);
//   });
// }

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
  | "task_feedback";

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
      return notify({ ...base, toUid: task.assignedBy, type: "task_paused", title: "Work paused", message: `${actor.name} paused ${q}.` });
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