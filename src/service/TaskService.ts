// // // // import {
// // // //   addDoc,
// // // //   arrayUnion,
// // // //   collection,
// // // //   doc,
// // // //   getDocs,
// // // //   orderBy,
// // // //   query,
// // // //   serverTimestamp,
// // // //   updateDoc,
// // // //   where,
// // // //   type DocumentData,
// // // // } from "firebase/firestore";
// // // // import { db } from "../config/firebase/firebase";

// // // // export type TaskStatus = "todo" | "in_progress" | "review" | "done";
// // // // export type Priority = "low" | "medium" | "high";

// // // // export type Feedback = { by: string; byName: string; text: string; at: number };

// // // // export type Task = {
// // // //   id: string;
// // // //   title: string;
// // // //   description: string;
// // // //   assignedTo: string;
// // // //   assignedToName: string;
// // // //   assignedBy: string;
// // // //   assignedByName: string;
// // // //   priority: Priority;
// // // //   status: TaskStatus;
// // // //   dueDate: string; // YYYY-MM-DD or ""
// // // //   createdAt: number;
// // // //   feedback: Feedback[];
// // // // };

// // // // export type NewTask = Pick<
// // // //   Task,
// // // //   | "title"
// // // //   | "description"
// // // //   | "assignedTo"
// // // //   | "assignedToName"
// // // //   | "assignedBy"
// // // //   | "assignedByName"
// // // //   | "priority"
// // // //   | "dueDate"
// // // // >;

// // // // // Named "staffTasks" so it doesn't clash with your client "works" collection
// // // // const COL = "staffTasks";

// // // // export const STATUS_LABELS: Record<TaskStatus, string> = {
// // // //   todo: "To do",
// // // //   in_progress: "In progress",
// // // //   review: "In review",
// // // //   done: "Done",
// // // // };

// // // // const toTask = (id: string, d: DocumentData): Task => ({
// // // //   id,
// // // //   title: d.title,
// // // //   description: d.description ?? "",
// // // //   assignedTo: d.assignedTo,
// // // //   assignedToName: d.assignedToName,
// // // //   assignedBy: d.assignedBy,
// // // //   assignedByName: d.assignedByName,
// // // //   priority: d.priority,
// // // //   status: d.status,
// // // //   dueDate: d.dueDate ?? "",
// // // //   createdAt: d.createdAt?.toMillis?.() ?? Date.now(),
// // // //   feedback: d.feedback ?? [],
// // // // });

// // // // export async function createTask(input: NewTask) {
// // // //   await addDoc(collection(db, COL), {
// // // //     ...input,
// // // //     status: "todo",
// // // //     feedback: [],
// // // //     createdAt: serverTimestamp(),
// // // //   });
// // // // }

// // // // /** Tasks assigned to one person */
// // // // export async function listMyTasks(uid: string) {
// // // //   const snap = await getDocs(
// // // //     query(collection(db, COL), where("assignedTo", "==", uid))
// // // //   );
// // // //   return snap.docs
// // // //     .map((d) => toTask(d.id, d.data()))
// // // //     .sort((a, b) => b.createdAt - a.createdAt);
// // // // }

// // // // /** Every task: all-work tracking for Operation Manager, HR, Admin */
// // // // export async function listAllTasks() {
// // // //   const snap = await getDocs(
// // // //     query(collection(db, COL), orderBy("createdAt", "desc"))
// // // //   );
// // // //   return snap.docs.map((d) => toTask(d.id, d.data()));
// // // // }

// // // // export const setTaskStatus = (id: string, status: TaskStatus) =>
// // // //   updateDoc(doc(db, COL, id), { status });

// // // // export const addFeedback = (
// // // //   id: string,
// // // //   fb: Pick<Feedback, "by" | "byName" | "text">
// // // // ) =>
// // // //   updateDoc(doc(db, COL, id), {
// // // //     feedback: arrayUnion({ ...fb, at: Date.now() }),
// // // //   });


// // // import {
// // //   addDoc,
// // //   collection,
// // //   doc,
// // //   getDocs,
// // //   orderBy,
// // //   query,
// // //   runTransaction,
// // //   serverTimestamp,
// // //   where,
// // //   type DocumentData,
// // // } from "firebase/firestore";
// // // import { db } from "../config/firebase/firebase";

// // // /**
// // //  * Flow:
// // //  * todo → (Start) in_progress ⇄ (Pause / Resume) paused
// // //  * in_progress | paused → (Complete) review
// // //  * review → (Approve) done   or   (Reject) rework → (Resume) in_progress …
// // //  */
// // // export type TaskStatus = "todo" | "in_progress" | "paused" | "review" | "rework" | "done";
// // // export type Priority = "low" | "medium" | "high";

// // // export type Feedback = { by: string; byName: string; text: string; at: number };

// // // export type Task = {
// // //   id: string;
// // //   title: string;
// // //   description: string;
// // //   clientName: string;
// // //   assignedTo: string;
// // //   assignedToName: string;
// // //   assignedBy: string;
// // //   assignedByName: string;
// // //   priority: Priority;
// // //   status: TaskStatus;
// // //   dueDate: string; // deadline, YYYY-MM-DD or ""
// // //   createdAt: number;
// // //   feedback: Feedback[];

// // //   // timer
// // //   workedMs: number; // time banked from finished work sessions
// // //   timerStartedAt: number | null; // set only while the timer is running
// // //   startedAt: number | null; // first time work was started
// // //   completedAt: number | null; // when it was sent for approval

// // //   // approval
// // //   approvedBy: string;
// // //   approvedByName: string;
// // //   approvedAt: number | null;
// // // };

// // // export type NewTask = Pick<
// // //   Task,
// // //   | "title"
// // //   | "description"
// // //   | "clientName"
// // //   | "assignedTo"
// // //   | "assignedToName"
// // //   | "assignedBy"
// // //   | "assignedByName"
// // //   | "priority"
// // //   | "dueDate"
// // // >;

// // // // Named "staffTasks" so it doesn't clash with your client "works" collection
// // // const COL = "staffTasks";

// // // export const STATUS_LABELS: Record<TaskStatus, string> = {
// // //   todo: "To do",
// // //   in_progress: "In progress",
// // //   paused: "Paused",
// // //   review: "Waiting for approval",
// // //   rework: "Needs rework",
// // //   done: "Approved",
// // // };

// // // const toTask = (id: string, d: DocumentData): Task => ({
// // //   id,
// // //   title: d.title,
// // //   description: d.description ?? "",
// // //   clientName: d.clientName ?? "",
// // //   assignedTo: d.assignedTo,
// // //   assignedToName: d.assignedToName,
// // //   assignedBy: d.assignedBy,
// // //   assignedByName: d.assignedByName,
// // //   priority: d.priority,
// // //   status: d.status,
// // //   dueDate: d.dueDate ?? "",
// // //   createdAt: d.createdAt?.toMillis?.() ?? Date.now(),
// // //   feedback: d.feedback ?? [],
// // //   workedMs: d.workedMs ?? 0,
// // //   timerStartedAt: d.timerStartedAt ?? null,
// // //   startedAt: d.startedAt ?? null,
// // //   completedAt: d.completedAt ?? null,
// // //   approvedBy: d.approvedBy ?? "",
// // //   approvedByName: d.approvedByName ?? "",
// // //   approvedAt: d.approvedAt ?? null,
// // // });

// // // export async function createTask(input: NewTask) {
// // //   await addDoc(collection(db, COL), {
// // //     ...input,
// // //     status: "todo",
// // //     feedback: [],
// // //     workedMs: 0,
// // //     timerStartedAt: null,
// // //     startedAt: null,
// // //     completedAt: null,
// // //     approvedBy: "",
// // //     approvedByName: "",
// // //     approvedAt: null,
// // //     createdAt: serverTimestamp(),
// // //   });
// // // }

// // // /** Tasks assigned to one person */
// // // export async function listMyTasks(uid: string) {
// // //   const snap = await getDocs(
// // //     query(collection(db, COL), where("assignedTo", "==", uid))
// // //   );
// // //   return snap.docs
// // //     .map((d) => toTask(d.id, d.data()))
// // //     .sort((a, b) => b.createdAt - a.createdAt);
// // // }

// // // /** Every task: all-work tracking for Operation Manager, HR, Admin */
// // // export async function listAllTasks() {
// // //   const snap = await getDocs(
// // //     query(collection(db, COL), orderBy("createdAt", "desc"))
// // //   );
// // //   return snap.docs.map((d) => toTask(d.id, d.data()));
// // // }

// // // /* ───────────── workflow ───────────── */

// // // // Reads the latest copy inside a transaction, so a double click or two
// // // // devices can never start/stop the timer twice.
// // // const transition = (
// // //   id: string,
// // //   fn: (d: DocumentData, now: number) => Record<string, unknown>
// // // ) =>
// // //   runTransaction(db, async (tx) => {
// // //     const ref = doc(db, COL, id);
// // //     const snap = await tx.get(ref);
// // //     if (!snap.exists()) throw new Error("Task not found.");
// // //     tx.update(ref, fn(snap.data(), Date.now()));
// // //   });

// // // // time worked so far, including the session that is currently running
// // // const banked = (d: DocumentData, now: number) =>
// // //   (d.workedMs ?? 0) + (d.timerStartedAt ? now - d.timerStartedAt : 0);

// // // /** Start, or resume after a pause / rework: starts the timer */
// // // export const startTask = (id: string) =>
// // //   transition(id, (d, now) => {
// // //     if (d.status === "in_progress") throw new Error("This task is already running.");
// // //     if (!["todo", "paused", "rework"].includes(d.status))
// // //       throw new Error("This task can't be started now.");
// // //     return {
// // //       status: "in_progress",
// // //       timerStartedAt: now,
// // //       startedAt: d.startedAt ?? now,
// // //     };
// // //   });

// // // /** Pause: stops the timer and keeps the time worked */
// // // export const pauseTask = (id: string) =>
// // //   transition(id, (d, now) => {
// // //     if (d.status !== "in_progress") throw new Error("Only a running task can be paused.");
// // //     return { status: "paused", workedMs: banked(d, now), timerStartedAt: null };
// // //   });

// // // /** Complete: stops the timer and sends the work for approval */
// // // export const completeTask = (id: string) =>
// // //   transition(id, (d, now) => {
// // //     if (!["in_progress", "paused"].includes(d.status))
// // //       throw new Error("Start the work before completing it.");
// // //     return {
// // //       status: "review",
// // //       workedMs: banked(d, now),
// // //       timerStartedAt: null,
// // //       completedAt: now,
// // //     };
// // //   });

// // // /** Approve (assigning operation staff or admin) */
// // // export const approveTask = (id: string, by: string, byName: string) =>
// // //   transition(id, (d, now) => {
// // //     if (d.status !== "review") throw new Error("This task is not waiting for approval.");
// // //     return { status: "done", approvedBy: by, approvedByName: byName, approvedAt: now };
// // //   });

// // // /** Reject: sends it back to the staff with a reason */
// // // export const rejectTask = (
// // //   id: string,
// // //   by: string,
// // //   byName: string,
// // //   reason: string
// // // ) =>
// // //   transition(id, (d, now) => {
// // //     if (d.status !== "review") throw new Error("This task is not waiting for approval.");
// // //     return {
// // //       status: "rework",
// // //       completedAt: null,
// // //       feedback: [
// // //         ...(d.feedback ?? []),
// // //         { by, byName, text: `Sent back for rework: ${reason}`, at: now },
// // //       ],
// // //     };
// // //   });

// // // /** Feedback comment */
// // // export const addFeedback = (
// // //   id: string,
// // //   fb: Pick<Feedback, "by" | "byName" | "text">
// // // ) =>
// // //   transition(id, (d, now) => ({
// // //     feedback: [...(d.feedback ?? []), { ...fb, at: now }],
// // //   }));

// // import {
// //   addDoc,
// //   collection,
// //   doc,
// //   getDocs,
// //   orderBy,
// //   query,
// //   runTransaction,
// //   serverTimestamp,
// //   where,
// //   type DocumentData,
// // } from "firebase/firestore";
// // import { db } from "../config/firebase/firebase";

// // /**
// //  * Flow:
// //  * todo → (Start) in_progress ⇄ (Pause / Resume) paused
// //  * in_progress | paused → (Complete) review
// //  * review → (Approve) done   or   (Reject) rework → (Resume) in_progress …
// //  */
// // export type TaskStatus = "todo" | "in_progress" | "paused" | "review" | "rework" | "done";
// // export type Priority = "low" | "medium" | "high";

// // export type Feedback = { by: string; byName: string; text: string; at: number };

// // export type Task = {
// //   id: string;
// //   title: string;
// //   description: string;
// //   clientId: string;
// //   clientName: string;
// //   assignedTo: string;
// //   assignedToName: string;
// //   assignedBy: string;
// //   assignedByName: string;
// //   priority: Priority;
// //   status: TaskStatus;
// //   dueDate: string; // deadline, YYYY-MM-DD or ""
// //   createdAt: number;
// //   feedback: Feedback[];

// //   // timer
// //   workedMs: number; // time banked from finished work sessions
// //   timerStartedAt: number | null; // set only while the timer is running
// //   startedAt: number | null; // first time work was started
// //   completedAt: number | null; // when it was sent for approval

// //   // approval
// //   approvedBy: string;
// //   approvedByName: string;
// //   approvedAt: number | null;
// // };

// // export type NewTask = Pick<
// //   Task,
// //   | "title"
// //   | "description"
// //   | "clientId"
// //   | "clientName"
// //   | "assignedTo"
// //   | "assignedToName"
// //   | "assignedBy"
// //   | "assignedByName"
// //   | "priority"
// //   | "dueDate"
// // >;

// // // Named "staffTasks" so it doesn't clash with your client "works" collection
// // const COL = "staffTasks";

// // export const STATUS_LABELS: Record<TaskStatus, string> = {
// //   todo: "To do",
// //   in_progress: "In progress",
// //   paused: "Paused",
// //   review: "Waiting for approval",
// //   rework: "Needs rework",
// //   done: "Approved",
// // };

// // const toTask = (id: string, d: DocumentData): Task => ({
// //   id,
// //   title: d.title,
// //   description: d.description ?? "",
// //   clientId: d.clientId ?? "",
// //   clientName: d.clientName ?? "",
// //   assignedTo: d.assignedTo,
// //   assignedToName: d.assignedToName,
// //   assignedBy: d.assignedBy,
// //   assignedByName: d.assignedByName,
// //   priority: d.priority,
// //   status: d.status,
// //   dueDate: d.dueDate ?? "",
// //   createdAt: d.createdAt?.toMillis?.() ?? Date.now(),
// //   feedback: d.feedback ?? [],
// //   workedMs: d.workedMs ?? 0,
// //   timerStartedAt: d.timerStartedAt ?? null,
// //   startedAt: d.startedAt ?? null,
// //   completedAt: d.completedAt ?? null,
// //   approvedBy: d.approvedBy ?? "",
// //   approvedByName: d.approvedByName ?? "",
// //   approvedAt: d.approvedAt ?? null,
// // });

// // export async function createTask(input: NewTask) {
// //   await addDoc(collection(db, COL), {
// //     ...input,
// //     status: "todo",
// //     feedback: [],
// //     workedMs: 0,
// //     timerStartedAt: null,
// //     startedAt: null,
// //     completedAt: null,
// //     approvedBy: "",
// //     approvedByName: "",
// //     approvedAt: null,
// //     createdAt: serverTimestamp(),
// //   });
// // }

// // /** Tasks assigned to one person */
// // export async function listMyTasks(uid: string) {
// //   const snap = await getDocs(
// //     query(collection(db, COL), where("assignedTo", "==", uid))
// //   );
// //   return snap.docs
// //     .map((d) => toTask(d.id, d.data()))
// //     .sort((a, b) => b.createdAt - a.createdAt);
// // }

// // /** Every task: all-work tracking for Operation Manager, HR, Admin */
// // export async function listAllTasks() {
// //   const snap = await getDocs(
// //     query(collection(db, COL), orderBy("createdAt", "desc"))
// //   );
// //   return snap.docs.map((d) => toTask(d.id, d.data()));
// // }

// // /* ───────────── workflow ───────────── */

// // // Reads the latest copy inside a transaction, so a double click or two
// // // devices can never start/stop the timer twice.
// // const transition = (
// //   id: string,
// //   fn: (d: DocumentData, now: number) => Record<string, unknown>
// // ) =>
// //   runTransaction(db, async (tx) => {
// //     const ref = doc(db, COL, id);
// //     const snap = await tx.get(ref);
// //     if (!snap.exists()) throw new Error("Task not found.");
// //     tx.update(ref, fn(snap.data(), Date.now()));
// //   });

// // // time worked so far, including the session that is currently running
// // const banked = (d: DocumentData, now: number) =>
// //   (d.workedMs ?? 0) + (d.timerStartedAt ? now - d.timerStartedAt : 0);

// // /** Start, or resume after a pause / rework: starts the timer */
// // export const startTask = (id: string) =>
// //   transition(id, (d, now) => {
// //     if (d.status === "in_progress") throw new Error("This task is already running.");
// //     if (!["todo", "paused", "rework"].includes(d.status))
// //       throw new Error("This task can't be started now.");
// //     return {
// //       status: "in_progress",
// //       timerStartedAt: now,
// //       startedAt: d.startedAt ?? now,
// //     };
// //   });

// // /** Pause: stops the timer and keeps the time worked */
// // export const pauseTask = (id: string) =>
// //   transition(id, (d, now) => {
// //     if (d.status !== "in_progress") throw new Error("Only a running task can be paused.");
// //     return { status: "paused", workedMs: banked(d, now), timerStartedAt: null };
// //   });

// // /** Complete: stops the timer and sends the work for approval */
// // export const completeTask = (id: string) =>
// //   transition(id, (d, now) => {
// //     if (!["in_progress", "paused"].includes(d.status))
// //       throw new Error("Start the work before completing it.");
// //     return {
// //       status: "review",
// //       workedMs: banked(d, now),
// //       timerStartedAt: null,
// //       completedAt: now,
// //     };
// //   });

// // /** Approve (assigning operation staff or admin) */
// // export const approveTask = (id: string, by: string, byName: string) =>
// //   transition(id, (d, now) => {
// //     if (d.status !== "review") throw new Error("This task is not waiting for approval.");
// //     return { status: "done", approvedBy: by, approvedByName: byName, approvedAt: now };
// //   });

// // /** Reject: sends it back to the staff with a reason */
// // export const rejectTask = (
// //   id: string,
// //   by: string,
// //   byName: string,
// //   reason: string
// // ) =>
// //   transition(id, (d, now) => {
// //     if (d.status !== "review") throw new Error("This task is not waiting for approval.");
// //     return {
// //       status: "rework",
// //       completedAt: null,
// //       feedback: [
// //         ...(d.feedback ?? []),
// //         { by, byName, text: `Sent back for rework: ${reason}`, at: now },
// //       ],
// //     };
// //   });

// // /** Feedback comment */
// // export const addFeedback = (
// //   id: string,
// //   fb: Pick<Feedback, "by" | "byName" | "text">
// // ) =>
// //   transition(id, (d, now) => ({
// //     feedback: [...(d.feedback ?? []), { ...fb, at: now }],
// //   }));


// import {
//   addDoc,
//   collection,
//   doc,
//   getDocs,
//   orderBy,
//   query,
//   runTransaction,
//   serverTimestamp,
//   where,
//   type DocumentData,
// } from "firebase/firestore";
// import { db } from "../config/firebase/firebase";
// import { isCheckedIn } from "./attendanceGate";

// /**
//  * Flow:
//  * (check in required) todo → Start → in_progress ⇄ Pause / Resume ⇄ paused
//  * in_progress | paused → Complete → review
//  * review → Approve → done   or   Reject → rework → Resume → in_progress …
//  * Check-out, or running past the cutoff, auto-pauses.
//  */
// export type TaskStatus = "todo" | "in_progress" | "paused" | "review" | "rework" | "done";
// export type Priority = "low" | "medium" | "high";
// export type PauseReason = "manual" | "checkout" | "auto";

// export type Feedback = { by: string; byName: string; text: string; at: number };

// export type Task = {
//   id: string;
//   title: string;
//   description: string;
//   clientId: string;
//   clientName: string;
//   assignedTo: string;
//   assignedToName: string;
//   assignedBy: string;
//   assignedByName: string;
//   priority: Priority;
//   status: TaskStatus;
//   dueDate: string;
//   createdAt: number;
//   feedback: Feedback[];

//   workedMs: number;
//   timerStartedAt: number | null;
//   startedAt: number | null;
//   completedAt: number | null;
//   pauseReason: PauseReason | null;

//   approvedBy: string;
//   approvedByName: string;
//   approvedAt: number | null;
// };

// export type NewTask = Pick<
//   Task,
//   | "title"
//   | "description"
//   | "clientId"
//   | "clientName"
//   | "assignedTo"
//   | "assignedToName"
//   | "assignedBy"
//   | "assignedByName"
//   | "priority"
//   | "dueDate"
// >;

// const COL = "staffTasks";

// /* ───────────── work hours (edit these) ───────────── */
// export const WORK_END = "19:00"; // end of work day, 24h "HH:mm"
// export const AUTO_PAUSE_GRACE_MIN = 30; // running tasks auto-pause at WORK_END + this

// /** Auto-pause moment for the calendar day of the given timestamp */
// export const cutoffFor = (ms: number) => {
//   const d = new Date(ms);
//   const [h, m] = WORK_END.split(":").map(Number);
//   d.setHours(h, m + AUTO_PAUSE_GRACE_MIN, 0, 0);
//   return d.getTime();
// };

// export const STATUS_LABELS: Record<TaskStatus, string> = {
//   todo: "To do",
//   in_progress: "In progress",
//   paused: "Paused",
//   review: "Waiting for approval",
//   rework: "Needs rework",
//   done: "Approved",
// };

// export const PAUSE_LABELS: Record<PauseReason, string> = {
//   manual: "Paused",
//   checkout: "Paused (checked out)",
//   auto: "Auto-paused (no check-out)",
// };

// const toTask = (id: string, d: DocumentData): Task => ({
//   id,
//   title: d.title,
//   description: d.description ?? "",
//   clientId: d.clientId ?? "",
//   clientName: d.clientName ?? "",
//   assignedTo: d.assignedTo,
//   assignedToName: d.assignedToName,
//   assignedBy: d.assignedBy,
//   assignedByName: d.assignedByName,
//   priority: d.priority,
//   status: d.status,
//   dueDate: d.dueDate ?? "",
//   createdAt: d.createdAt?.toMillis?.() ?? Date.now(),
//   feedback: d.feedback ?? [],
//   workedMs: d.workedMs ?? 0,
//   timerStartedAt: d.timerStartedAt ?? null,
//   startedAt: d.startedAt ?? null,
//   completedAt: d.completedAt ?? null,
//   pauseReason: d.pauseReason ?? null,
//   approvedBy: d.approvedBy ?? "",
//   approvedByName: d.approvedByName ?? "",
//   approvedAt: d.approvedAt ?? null,
// });

// export async function createTask(input: NewTask) {
//   await addDoc(collection(db, COL), {
//     ...input,
//     status: "todo",
//     feedback: [],
//     workedMs: 0,
//     timerStartedAt: null,
//     startedAt: null,
//     completedAt: null,
//     pauseReason: null,
//     approvedBy: "",
//     approvedByName: "",
//     approvedAt: null,
//     createdAt: serverTimestamp(),
//   });
// }

// export async function listMyTasks(uid: string) {
//   const snap = await getDocs(query(collection(db, COL), where("assignedTo", "==", uid)));
//   return snap.docs
//     .map((d) => toTask(d.id, d.data()))
//     .sort((a, b) => b.createdAt - a.createdAt);
// }

// export async function listAllTasks() {
//   const snap = await getDocs(query(collection(db, COL), orderBy("createdAt", "desc")));
//   return snap.docs.map((d) => toTask(d.id, d.data()));
// }

// /* ───────────── workflow ───────────── */

// // Return null from fn to skip the update (nothing to do).
// const transition = (
//   id: string,
//   fn: (d: DocumentData, now: number) => Record<string, unknown> | null
// ) =>
//   runTransaction(db, async (tx) => {
//     const ref = doc(db, COL, id);
//     const snap = await tx.get(ref);
//     if (!snap.exists()) throw new Error("Task not found.");
//     const update = fn(snap.data(), Date.now());
//     if (update) tx.update(ref, update);
//   });

// // time worked so far, counting the running session up to `until`
// const bankedUntil = (d: DocumentData, until: number) =>
//   (d.workedMs ?? 0) +
//   (d.timerStartedAt ? Math.max(0, until - d.timerStartedAt) : 0);

// /** Start / resume. Needs an open check-in and must be before the cutoff. */
// export async function startTask(id: string, uid: string) {
//   if (!(await isCheckedIn(uid)))
//     throw new Error("Check in first, then you can start work.");
//   if (Date.now() > cutoffFor(Date.now()))
//     throw new Error("Work hours are over. You can start again tomorrow.");

//   return transition(id, (d, now) => {
//     if (d.status === "in_progress") throw new Error("This task is already running.");
//     if (!["todo", "paused", "rework"].includes(d.status))
//       throw new Error("This task can't be started now.");
//     return {
//       status: "in_progress",
//       timerStartedAt: now,
//       startedAt: d.startedAt ?? now,
//       pauseReason: null,
//     };
//   });
// }

// /**
//  * Pause and bank the time.
//  * reason "auto": time is capped at the cutoff of the day the timer started,
//  * and nothing happens if that cutoff hasn't passed yet.
//  */
// export const pauseTask = (id: string, reason: PauseReason = "manual") =>
//   transition(id, (d, now) => {
//     if (d.status !== "in_progress") {
//       if (reason === "manual") throw new Error("Only a running task can be paused.");
//       return null; // already paused: fine for automatic pauses
//     }
//     let until = now;
//     if (reason === "auto") {
//       const cutoff = cutoffFor(d.timerStartedAt ?? now);
//       if (now <= cutoff) return null;
//       until = cutoff;
//     }
//     return {
//       status: "paused",
//       workedMs: bankedUntil(d, until),
//       timerStartedAt: null,
//       pauseReason: reason,
//     };
//   });

// /** Called on check-out: pauses everything this person is running */
// export async function pauseAllRunningForStaff(uid: string) {
//   const snap = await getDocs(
//     query(
//       collection(db, COL),
//       where("assignedTo", "==", uid),
//       where("status", "==", "in_progress")
//     )
//   );
//   await Promise.allSettled(snap.docs.map((s) => pauseTask(s.id, "checkout")));
//   return snap.size;
// }

// /**
//  * Safety net for forgotten check-outs: pauses every running task past its cutoff.
//  * Pass a uid for a staff member's own tasks, or nothing for all (admin / HR).
//  * Returns how many tasks were changed.
//  */
// export async function autoPauseExpired(uid?: string) {
//   const constraints = [where("status", "==", "in_progress")];
//   if (uid) constraints.push(where("assignedTo", "==", uid));

//   const snap = await getDocs(query(collection(db, COL), ...constraints));
//   const now = Date.now();
//   const due = snap.docs.filter((s) => {
//     const t = s.data().timerStartedAt;
//     return t && now > cutoffFor(t);
//   });

//   await Promise.allSettled(due.map((s) => pauseTask(s.id, "auto")));
//   return due.length;
// }

// /** Complete: stops the timer and sends the work for approval */
// export const completeTask = (id: string) =>
//   transition(id, (d, now) => {
//     if (!["in_progress", "paused"].includes(d.status))
//       throw new Error("Start the work before completing it.");
//     return {
//       status: "review",
//       workedMs: bankedUntil(d, now),
//       timerStartedAt: null,
//       completedAt: now,
//       pauseReason: null,
//     };
//   });

// export const approveTask = (id: string, by: string, byName: string) =>
//   transition(id, (d, now) => {
//     if (d.status !== "review") throw new Error("This task is not waiting for approval.");
//     return { status: "done", approvedBy: by, approvedByName: byName, approvedAt: now };
//   });

// export const rejectTask = (id: string, by: string, byName: string, reason: string) =>
//   transition(id, (d, now) => {
//     if (d.status !== "review") throw new Error("This task is not waiting for approval.");
//     return {
//       status: "rework",
//       completedAt: null,
//       feedback: [
//         ...(d.feedback ?? []),
//         { by, byName, text: `Sent back for rework: ${reason}`, at: now },
//       ],
//     };
//   });

// export const addFeedback = (
//   id: string,
//   fb: Pick<Feedback, "by" | "byName" | "text">
// ) =>
//   transition(id, (d, now) => ({
//     feedback: [...(d.feedback ?? []), { ...fb, at: now }],
//   }));


import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
  type DocumentData,
} from "firebase/firestore";

import { db } from "../config/firebase/firebase"; // adjust to your path
import { isCheckedIn } from "./attendanceGate"; // adjust to where isCheckedIn lives

export type TaskStatus = "todo" | "in_progress" | "paused" | "review" | "rework" | "done";
export type Priority = "low" | "medium" | "high";
export type PauseReason = "manual" | "checkout" | "auto";
/** Only used for tasks staff add for themselves. Empty (null) = normal task / already approved. */
export type SelfApproval = "pending" | "approved" | "rejected";

export type Feedback = { by: string; byName: string; text: string; at: number };

export type Task = {
  id: string;
  title: string;
  description: string;
  clientId: string;
  clientName: string;
  assignedTo: string;
  assignedToName: string;
  assignedBy: string;
  assignedByName: string;
  priority: Priority;
  status: TaskStatus;
  dueDate: string;
  createdAt: number;
  feedback: Feedback[];

  workedMs: number;
  timerStartedAt: number | null;
  startedAt: number | null;
  completedAt: number | null;
  pauseReason: PauseReason | null;
   pauseNote: string;

  approvedBy: string;
  approvedByName: string;
  approvedAt: number | null;

  // approval of a task the staff member added for themselves
  selfApproval: SelfApproval | null;
  selfApprovedByName: string;
  selfRejectReason: string;
};

export type NewTask = Pick<
  Task,
  | "title"
  | "description"
  | "clientId"
  | "clientName"
  | "assignedTo"
  | "assignedToName"
  | "assignedBy"
  | "assignedByName"
  | "priority"
  | "dueDate"
> & {
  /** set to "pending" when staff add a task for themselves */
  selfApproval?: SelfApproval;
};

const COL = "staffTasks";

/* ───────────── work hours (edit these) ───────────── */
export const WORK_END = "19:00"; // end of work day, 24h "HH:mm"
export const AUTO_PAUSE_GRACE_MIN = 30; // running tasks auto-pause at WORK_END + this

/** Auto-pause moment for the calendar day of the given timestamp */
export const cutoffFor = (ms: number) => {
  const d = new Date(ms);
  const [h, m] = WORK_END.split(":").map(Number);
  d.setHours(h, m + AUTO_PAUSE_GRACE_MIN, 0, 0);
  return d.getTime();
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  paused: "Paused",
  review: "Waiting for approval",
  rework: "Needs rework",
  done: "Approved",
};

export const PAUSE_LABELS: Record<PauseReason, string> = {
  manual: "Paused",
  checkout: "Paused (checked out)",
  auto: "Auto-paused (no check-out)",
};

const toTask = (id: string, d: DocumentData): Task => ({
  id,
  title: d.title,
  description: d.description ?? "",
  clientId: d.clientId ?? "",
  clientName: d.clientName ?? "",
  assignedTo: d.assignedTo,
  assignedToName: d.assignedToName,
  assignedBy: d.assignedBy,
  assignedByName: d.assignedByName,
  priority: d.priority,
  status: d.status,
  dueDate: d.dueDate ?? "",
  createdAt: d.createdAt?.toMillis?.() ?? Date.now(),
  feedback: d.feedback ?? [],
  workedMs: d.workedMs ?? 0,
  timerStartedAt: d.timerStartedAt ?? null,
  startedAt: d.startedAt ?? null,
  completedAt: d.completedAt ?? null,
  pauseReason: d.pauseReason ?? null,
  pauseNote: d.pauseNote ?? "",
  approvedBy: d.approvedBy ?? "",
  approvedByName: d.approvedByName ?? "",
  approvedAt: d.approvedAt ?? null,
  selfApproval: d.selfApproval ?? null,
  selfApprovedByName: d.selfApprovedByName ?? "",
  selfRejectReason: d.selfRejectReason ?? "",
});

/** Creates the task and returns its id */
export async function createTask(input: NewTask) {
  const { selfApproval, ...rest } = input;
  const ref = await addDoc(collection(db, COL), {
    ...rest,
    selfApproval: selfApproval ?? null,
    selfApprovedBy: "",
    selfApprovedByName: "",
    selfApprovedAt: null,
    selfRejectReason: "",
    status: "todo",
    feedback: [],
    workedMs: 0,
    timerStartedAt: null,
    startedAt: null,
    completedAt: null,
    pauseReason: null,
    approvedBy: "",
    approvedByName: "",
    approvedAt: null,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function listMyTasks(uid: string) {
  const snap = await getDocs(query(collection(db, COL), where("assignedTo", "==", uid)));
  return snap.docs
    .map((d) => toTask(d.id, d.data()))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function listAllTasks() {
  const snap = await getDocs(query(collection(db, COL), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => toTask(d.id, d.data()));
}

/** Live version of listMyTasks. Returns the unsubscribe function. */
export function listenMyTasks(
  uid: string,
  onData: (tasks: Task[]) => void,
  onError?: (e: unknown) => void
) {
  return onSnapshot(
    query(collection(db, COL), where("assignedTo", "==", uid)),
    (snap) =>
      onData(
        snap.docs.map((d) => toTask(d.id, d.data())).sort((a, b) => b.createdAt - a.createdAt)
      ),
    (e) => onError?.(e)
  );
}

/** Live version of listAllTasks. Returns the unsubscribe function. */
export function listenAllTasks(
  onData: (tasks: Task[]) => void,
  onError?: (e: unknown) => void
) {
  return onSnapshot(
    query(collection(db, COL), orderBy("createdAt", "desc")),
    (snap) => onData(snap.docs.map((d) => toTask(d.id, d.data()))),
    (e) => onError?.(e)
  );
}

/* ───────────── workflow ───────────── */

// Return null from fn to skip the update (nothing to do).
const transition = (
  id: string,
  fn: (d: DocumentData, now: number) => Record<string, unknown> | null
) =>
  runTransaction(db, async (tx) => {
    const ref = doc(db, COL, id);
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("Task not found.");
    const update = fn(snap.data(), Date.now());
    if (update) tx.update(ref, update);
  });

// time worked so far, counting the running session up to `until`
const bankedUntil = (d: DocumentData, until: number) =>
  (d.workedMs ?? 0) +
  (d.timerStartedAt ? Math.max(0, until - d.timerStartedAt) : 0);

/** Start / resume. Needs an open check-in and must be before the cutoff. */
export async function startTask(id: string, uid: string) {
  if (!(await isCheckedIn(uid)))
    throw new Error("Check in first, then you can start work.");
  if (Date.now() > cutoffFor(Date.now()))
    throw new Error("Work hours are over. You can start again tomorrow.");

  return transition(id, (d, now) => {
    // a task staff added for themselves must be approved before any work starts
    if (d.assignedBy === d.assignedTo) {
      if (d.selfApproval === "pending")
        throw new Error("This task is waiting for the operation manager's approval.");
      if (d.selfApproval === "rejected")
        throw new Error("This task was not approved, so it can't be started.");
    }
    if (d.status === "in_progress") throw new Error("This task is already running.");
    if (!["todo", "paused", "rework"].includes(d.status))
      throw new Error("This task can't be started now.");
        return {
      status: "in_progress",
      timerStartedAt: now,
      startedAt: d.startedAt ?? now,
      pauseReason: null,
      pauseNote: "",
    };
  });
}

/** Operation manager / admin accepts a task that staff added for themselves */
export const approveSelfTask = (id: string, by: string, byName: string) =>
  transition(id, (d, now) => {
    if (d.assignedBy !== d.assignedTo || d.selfApproval !== "pending")
      throw new Error("This task is not waiting for approval.");
    if (by === d.assignedTo) throw new Error("You can't approve your own task.");
    return {
      selfApproval: "approved",
      selfApprovedBy: by,
      selfApprovedByName: byName,
      selfApprovedAt: now,
      selfRejectReason: "",
    };
  });

/** Operation manager / admin turns down a task that staff added for themselves */
export const rejectSelfTask = (id: string, by: string, byName: string, reason: string) =>
  transition(id, (d, now) => {
    if (d.assignedBy !== d.assignedTo || d.selfApproval !== "pending")
      throw new Error("This task is not waiting for approval.");
    if (by === d.assignedTo) throw new Error("You can't reject your own task.");
    return {
      selfApproval: "rejected",
      selfApprovedBy: by,
      selfApprovedByName: byName,
      selfApprovedAt: now,
      selfRejectReason: reason,
      feedback: [
        ...(d.feedback ?? []),
        { by, byName, text: `Task not approved: ${reason}`, at: now },
      ],
    };
  });

/**
 * Pause and bank the time.
 * reason "auto": time is capped at the cutoff of the day the timer started,
 * and nothing happens if that cutoff hasn't passed yet.
 */
// export const pauseTask = (id: string, reason: PauseReason = "manual") =>
//   transition(id, (d, now) => {
//     if (d.status !== "in_progress") {
//       if (reason === "manual") throw new Error("Only a running task can be paused.");
//       return null; // already paused: fine for automatic pauses
//     }
//     let until = now;
//     if (reason === "auto") {
//       const cutoff = cutoffFor(d.timerStartedAt ?? now);
//       if (now <= cutoff) return null;
//       until = cutoff;
//     }
//     return {
//       status: "paused",
//       workedMs: bankedUntil(d, until),
//       timerStartedAt: null,
//       pauseReason: reason,
//     };
//   });

/**
 * Pause and bank the time.
 * A manual pause needs a written reason (note.text); it is saved on the task and
 * added to the feedback list so the manager can see it.
 * reason "auto": time is capped at the cutoff of the day the timer started,
 * and nothing happens if that cutoff hasn't passed yet.
 */
export const pauseTask = (
  id: string,
  reason: PauseReason = "manual",
  note?: { text: string; by: string; byName: string }
) =>
  transition(id, (d, now) => {
    if (d.status !== "in_progress") {
      if (reason === "manual") throw new Error("Only a running task can be paused.");
      return null; // already paused: fine for automatic pauses
    }
    if (reason === "manual" && !note?.text.trim())
      throw new Error("Add a reason for pausing.");

    let until = now;
    if (reason === "auto") {
      const cutoff = cutoffFor(d.timerStartedAt ?? now);
      if (now <= cutoff) return null;
      until = cutoff;
    }
    return {
      status: "paused",
      workedMs: bankedUntil(d, until),
      timerStartedAt: null,
      pauseReason: reason,
      pauseNote: note?.text.trim() ?? "",
      ...(reason === "manual" && note
        ? {
            feedback: [
              ...(d.feedback ?? []),
              { by: note.by, byName: note.byName, text: `Paused: ${note.text.trim()}`, at: now },
            ],
          }
        : {}),
    };
  });

/** Called on check-out: pauses everything this person is running */
export async function pauseAllRunningForStaff(uid: string) {
  const snap = await getDocs(
    query(
      collection(db, COL),
      where("assignedTo", "==", uid),
      where("status", "==", "in_progress")
    )
  );
  await Promise.allSettled(snap.docs.map((s) => pauseTask(s.id, "checkout")));
  return snap.size;
}

/**
 * Safety net for forgotten check-outs: pauses every running task past its cutoff.
 * Pass a uid for a staff member's own tasks, or nothing for all (admin / HR).
 * Returns how many tasks were changed.
 */
export async function autoPauseExpired(uid?: string) {
  const constraints = [where("status", "==", "in_progress")];
  if (uid) constraints.push(where("assignedTo", "==", uid));

  const snap = await getDocs(query(collection(db, COL), ...constraints));
  const now = Date.now();
  const due = snap.docs.filter((s) => {
    const t = s.data().timerStartedAt;
    return t && now > cutoffFor(t);
  });

  await Promise.allSettled(due.map((s) => pauseTask(s.id, "auto")));
  return due.length;
}

/** Complete: stops the timer and sends the work for approval */
export const completeTask = (id: string) =>
  transition(id, (d, now) => {
    if (!["in_progress", "paused"].includes(d.status))
      throw new Error("Start the work before completing it.");
    return {
      status: "review",
      workedMs: bankedUntil(d, now),
      timerStartedAt: null,
      completedAt: now,
      pauseReason: null,
    };
  });

export const approveTask = (id: string, by: string, byName: string) =>
  transition(id, (d, now) => {
    if (d.status !== "review") throw new Error("This task is not waiting for approval.");
    return { status: "done", approvedBy: by, approvedByName: byName, approvedAt: now };
  });

export const rejectTask = (id: string, by: string, byName: string, reason: string) =>
  transition(id, (d, now) => {
    if (d.status !== "review") throw new Error("This task is not waiting for approval.");
    return {
      status: "rework",
      completedAt: null,
      feedback: [
        ...(d.feedback ?? []),
        { by, byName, text: `Sent back for rework: ${reason}`, at: now },
      ],
    };
  });

export const addFeedback = (
  id: string,
  fb: Pick<Feedback, "by" | "byName" | "text">
) =>
  transition(id, (d, now) => ({
    feedback: [...(d.feedback ?? []), { ...fb, at: now }],
  }));