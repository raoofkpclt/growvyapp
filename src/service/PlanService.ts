// // import {
// //   arrayUnion,
// //   collection,
// //   doc,
// //   getDocs,
// //   runTransaction,
// //   updateDoc,
// //   type DocumentData,
// // } from "firebase/firestore";
// // import { db } from "../config/firebase/firebase";
// // import { dateKey, monthKey } from "./AttendanceService";

// // /** One plan per client. The plan id is the client id. */
// // export type PlanItem = { name: string; count: number };

// // export type PlanEvent = {
// //   type: "created" | "updated" | "paused" | "resumed" | "extended" | "content";
// //   at: number;
// //   by: string;
// //   byName: string;
// //   note: string;
// // };

// // /** The content plan of one month. Earlier months are kept and can't be changed. */
// // export type ContentPlan = {
// //   month: string; // YYYY-MM
// //   content: string;
// //   updatedAt: number;
// //   updatedBy: string;
// //   updatedByName: string;
// // };

// // export type Plan = {
// //   id: string; // = clientId
// //   clientId: string;
// //   clientName: string;
// //   startDate: string; // YYYY-MM-DD
// //   endDate: string; // YYYY-MM-DD
// //   amount: number; // plan amount for the whole period
// //   services: string[]; // required services
// //   posters: number;
// //   videos: number;
// //   extraItems: PlanItem[]; // brochures, company profile, show reel ...
// //   notes: string;
// //   status: "active" | "paused";
// //   pausedOn: string; // date the plan was paused, "" when running
// //   pauseReason: string;
// //   contentPlans: ContentPlan[];
// //   history: PlanEvent[];
// // };

// // export type PlanInput = Pick<
// //   Plan,
// //   | "clientId"
// //   | "clientName"
// //   | "startDate"
// //   | "endDate"
// //   | "amount"
// //   | "services"
// //   | "posters"
// //   | "videos"
// //   | "extraItems"
// //   | "notes"
// // >;

// // const COL = "clientPlans";

// // /** A plan counts as "ending soon" when this many days (or fewer) are left */
// // export const ENDING_SOON_DAYS = 5;

// // /* ───────────── dates ───────────── */
// // const parse = (s: string) => {
// //   const [y, m, d] = s.split("-").map(Number);
// //   return new Date(y, m - 1, d);
// // };

// // export const addDays = (s: string, n: number) => {
// //   const d = parse(s);
// //   return dateKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
// // };

// // /** Whole days from a to b (negative when b is before a) */
// // export const daysBetween = (a: string, b: string) =>
// //   Math.round((parse(b).getTime() - parse(a).getTime()) / 86_400_000);

// // export const fmtDate = (s: string) =>
// //   s ? parse(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

// // /* ───────────── state of a plan ───────────── */
// // export type PlanState = "no_plan" | "paused" | "ended" | "ending" | "active";

// // export function planState(p?: Plan | null, today = dateKey()): { state: PlanState; daysLeft: number } {
// //   if (!p) return { state: "no_plan", daysLeft: 0 };
// //   const daysLeft = daysBetween(today, p.endDate);
// //   if (p.status === "paused") return { state: "paused", daysLeft };
// //   if (daysLeft < 0) return { state: "ended", daysLeft };
// //   if (daysLeft <= ENDING_SOON_DAYS) return { state: "ending", daysLeft };
// //   return { state: "active", daysLeft };
// // }

// // /** Running plan with no content plan saved for the current month yet */
// // export const contentDue = (p: Plan) => {
// //   const { state } = planState(p);
// //   return (state === "active" || state === "ending") && !p.contentPlans.some((c) => c.month === monthKey());
// // };

// // /* ───────────── read ───────────── */
// // const toPlan = (id: string, d: DocumentData): Plan => ({
// //   id,
// //   clientId: d.clientId ?? id,
// //   clientName: d.clientName ?? "",
// //   startDate: d.startDate ?? "",
// //   endDate: d.endDate ?? "",
// //   amount: d.amount ?? 0,
// //   services: d.services ?? [],
// //   posters: d.posters ?? 0,
// //   videos: d.videos ?? 0,
// //   extraItems: d.extraItems ?? [],
// //   notes: d.notes ?? "",
// //   status: d.status === "paused" ? "paused" : "active",
// //   pausedOn: d.pausedOn ?? "",
// //   pauseReason: d.pauseReason ?? "",
// //   contentPlans: d.contentPlans ?? [],
// //   history: d.history ?? [],
// // });

// // export async function listPlans(): Promise<Plan[]> {
// //   const snap = await getDocs(collection(db, COL));
// //   return snap.docs.map((d) => toPlan(d.id, d.data()));
// // }

// // /* ───────────── write ───────────── */
// // const event = (type: PlanEvent["type"], by: string, byName: string, note: string): PlanEvent => ({
// //   type,
// //   at: Date.now(),
// //   by,
// //   byName,
// //   note,
// // });

// // export async function createPlan(input: PlanInput, by: string, byName: string) {
// //   const ref = doc(db, COL, input.clientId);
// //   await runTransaction(db, async (tx) => {
// //     if ((await tx.get(ref)).exists()) throw new Error("This client already has a plan.");
// //     tx.set(ref, {
// //       ...input,
// //       status: "active",
// //       pausedOn: "",
// //       pauseReason: "",
// //       contentPlans: [],
// //       history: [event("created", by, byName, "Plan created")],
// //     });
// //   });
// // }

// // export const updatePlan = (input: PlanInput, by: string, byName: string) =>
// //   updateDoc(doc(db, COL, input.clientId), {
// //     ...input,
// //     history: arrayUnion(event("updated", by, byName, "Plan details updated")),
// //   });

// // // reads the latest copy inside a transaction, so a double click can't apply twice
// // const edit = (id: string, fn: (d: DocumentData) => Record<string, unknown>) =>
// //   runTransaction(db, async (tx) => {
// //     const ref = doc(db, COL, id);
// //     const snap = await tx.get(ref);
// //     if (!snap.exists()) throw new Error("Plan not found.");
// //     tx.update(ref, fn(snap.data()));
// //   });

// // /** Pause the plan dates (client delayed payment, shoot issue ...) */
// // export const pausePlan = (id: string, reason: string, by: string, byName: string) =>
// //   edit(id, (d) => {
// //     if (d.status === "paused") throw new Error("This plan is already paused.");
// //     return {
// //       status: "paused",
// //       pausedOn: dateKey(),
// //       pauseReason: reason,
// //       history: [...(d.history ?? []), event("paused", by, byName, reason)],
// //     };
// //   });

// // /** Resume: the end date moves forward by the number of days it was paused */
// // export const resumePlan = (id: string, by: string, byName: string) =>
// //   edit(id, (d) => {
// //     if (d.status !== "paused") throw new Error("This plan is not paused.");
// //     const days = Math.max(0, daysBetween(d.pausedOn, dateKey()));
// //     const newEnd = addDays(d.endDate, days);
// //     return {
// //       status: "active",
// //       endDate: newEnd,
// //       pausedOn: "",
// //       pauseReason: "",
// //       history: [
// //         ...(d.history ?? []),
// //         event(
// //           "resumed",
// //           by,
// //           byName,
// //           `Resumed after ${days} day${days === 1 ? "" : "s"}. End date moved from ${fmtDate(d.endDate)} to ${fmtDate(newEnd)}.`
// //         ),
// //       ],
// //     };
// //   });

// // /** Extend the end date */
// // export const extendPlan = (id: string, newEnd: string, reason: string, by: string, byName: string) =>
// //   edit(id, (d) => {
// //     if (newEnd <= d.endDate) throw new Error("The new end date must be after the current end date.");
// //     return {
// //       endDate: newEnd,
// //       history: [
// //         ...(d.history ?? []),
// //         event("extended", by, byName, `Extended from ${fmtDate(d.endDate)} to ${fmtDate(newEnd)}: ${reason}`),
// //       ],
// //     };
// //   });

// // /** Save the content plan of a month. Earlier months are kept and can't be changed. */
// // export const saveContentPlan = (
// //   id: string,
// //   month: string,
// //   content: string,
// //   by: string,
// //   byName: string
// // ) =>
// //   edit(id, (d) => {
// //     if (month < monthKey()) throw new Error("Earlier months are kept as they were and can't be changed.");
// //     const others = ((d.contentPlans ?? []) as ContentPlan[]).filter((c) => c.month !== month);
// //     const entry: ContentPlan = { month, content, updatedAt: Date.now(), updatedBy: by, updatedByName: byName };
// //     return {
// //       contentPlans: [...others, entry],
// //       history: [...(d.history ?? []), event("content", by, byName, `Content plan updated for ${month}`)],
// //     };
// //   });

  
// import {
//   arrayUnion,
//   collection,
//   doc,
//   getDocs,
//   runTransaction,
//   updateDoc,
//   type DocumentData,
// } from "firebase/firestore";
// import { db } from "../config/firebase/firebase";
// import { dateKey, monthKey } from "./AttendanceService";

// /** One plan per client. The plan id is the client id. */
// export type PlanItem = { name: string; count: number };

// export type PlanEvent = {
//   type: "created" | "updated" | "paused" | "resumed" | "extended" | "content" | "posted";
//   at: number;
//   by: string;
//   byName: string;
//   note: string;
// };

// /** The content plan of one month. Earlier months are kept and can't be changed. */
// export type ContentPlan = {
//   month: string; // YYYY-MM
//   content: string;
//   updatedAt: number;
//   updatedBy: string;
//   updatedByName: string;
// };

// /** How many outputs are already posted */
// export type Posted = {
//   posters: number;
//   videos: number;
//   extra: Record<string, number>; // keyed by item name, e.g. { Brochure: 1 }
// };

// export type Plan = {
//   id: string; // = clientId
//   clientId: string;
//   clientName: string;
//   startDate: string; // YYYY-MM-DD
//   endDate: string; // YYYY-MM-DD
//   amount: number; // plan amount for the whole period
//   services: string[]; // required services
//   posters: number;
//   videos: number;
//   extraItems: PlanItem[]; // brochures, company profile, show reel ...
//   posted: Posted; // posting progress
//   notes: string;
//   status: "active" | "paused";
//   pausedOn: string; // date the plan was paused, "" when running
//   pauseReason: string;
//   contentPlans: ContentPlan[];
//   history: PlanEvent[];
// };

// export type PlanInput = Pick<
//   Plan,
//   | "clientId"
//   | "clientName"
//   | "startDate"
//   | "endDate"
//   | "amount"
//   | "services"
//   | "posters"
//   | "videos"
//   | "extraItems"
//   | "notes"
// >;

// const COL = "clientPlans";

// /** A plan counts as "ending soon" when this many days (or fewer) are left */
// export const ENDING_SOON_DAYS = 5;

// /* ───────────── dates ───────────── */
// const parse = (s: string) => {
//   const [y, m, d] = s.split("-").map(Number);
//   return new Date(y, m - 1, d);
// };

// export const addDays = (s: string, n: number) => {
//   const d = parse(s);
//   return dateKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
// };

// /** Whole days from a to b (negative when b is before a) */
// export const daysBetween = (a: string, b: string) =>
//   Math.round((parse(b).getTime() - parse(a).getTime()) / 86_400_000);

// export const fmtDate = (s: string) =>
//   s ? parse(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

// /* ───────────── state of a plan ───────────── */
// export type PlanState = "no_plan" | "paused" | "ended" | "ending" | "active";

// export function planState(p?: Plan | null, today = dateKey()): { state: PlanState; daysLeft: number } {
//   if (!p) return { state: "no_plan", daysLeft: 0 };
//   const daysLeft = daysBetween(today, p.endDate);
//   if (p.status === "paused") return { state: "paused", daysLeft };
//   if (daysLeft < 0) return { state: "ended", daysLeft };
//   if (daysLeft <= ENDING_SOON_DAYS) return { state: "ending", daysLeft };
//   return { state: "active", daysLeft };
// }

// /** Running plan with no content plan saved for the current month yet */
// export const contentDue = (p: Plan) => {
//   const { state } = planState(p);
//   return (state === "active" || state === "ending") && !p.contentPlans.some((c) => c.month === monthKey());
// };

// /* ───────────── read ───────────── */
// const toPlan = (id: string, d: DocumentData): Plan => ({
//   id,
//   clientId: d.clientId ?? id,
//   clientName: d.clientName ?? "",
//   startDate: d.startDate ?? "",
//   endDate: d.endDate ?? "",
//   amount: d.amount ?? 0,
//   services: d.services ?? [],
//   posters: d.posters ?? 0,
//   videos: d.videos ?? 0,
//   extraItems: d.extraItems ?? [],
//   posted: {
//     posters: d.posted?.posters ?? 0,
//     videos: d.posted?.videos ?? 0,
//     extra: d.posted?.extra ?? {},
//   },
//   notes: d.notes ?? "",
//   status: d.status === "paused" ? "paused" : "active",
//   pausedOn: d.pausedOn ?? "",
//   pauseReason: d.pauseReason ?? "",
//   contentPlans: d.contentPlans ?? [],
//   history: d.history ?? [],
// });

// export async function listPlans(): Promise<Plan[]> {
//   const snap = await getDocs(collection(db, COL));
//   return snap.docs.map((d) => toPlan(d.id, d.data()));
// }

// /* ───────────── write ───────────── */
// const event = (type: PlanEvent["type"], by: string, byName: string, note: string): PlanEvent => ({
//   type,
//   at: Date.now(),
//   by,
//   byName,
//   note,
// });

// export async function createPlan(input: PlanInput, by: string, byName: string) {
//   const ref = doc(db, COL, input.clientId);
//   await runTransaction(db, async (tx) => {
//     if ((await tx.get(ref)).exists()) throw new Error("This client already has a plan.");
//     tx.set(ref, {
//       ...input,
//       posted: { posters: 0, videos: 0, extra: {} },
//       status: "active",
//       pausedOn: "",
//       pauseReason: "",
//       contentPlans: [],
//       history: [event("created", by, byName, "Plan created")],
//     });
//   });
// }

// export const updatePlan = (input: PlanInput, by: string, byName: string) =>
//   updateDoc(doc(db, COL, input.clientId), {
//     ...input,
//     history: arrayUnion(event("updated", by, byName, "Plan details updated")),
//   });

// // reads the latest copy inside a transaction, so a double click can't apply twice
// const edit = (id: string, fn: (d: DocumentData) => Record<string, unknown>) =>
//   runTransaction(db, async (tx) => {
//     const ref = doc(db, COL, id);
//     const snap = await tx.get(ref);
//     if (!snap.exists()) throw new Error("Plan not found.");
//     tx.update(ref, fn(snap.data()));
//   });

// /** Pause the plan dates (client delayed payment, shoot issue ...) */
// export const pausePlan = (id: string, reason: string, by: string, byName: string) =>
//   edit(id, (d) => {
//     if (d.status === "paused") throw new Error("This plan is already paused.");
//     return {
//       status: "paused",
//       pausedOn: dateKey(),
//       pauseReason: reason,
//       history: [...(d.history ?? []), event("paused", by, byName, reason)],
//     };
//   });

// /** Resume: the end date moves forward by the number of days it was paused */
// export const resumePlan = (id: string, by: string, byName: string) =>
//   edit(id, (d) => {
//     if (d.status !== "paused") throw new Error("This plan is not paused.");
//     const days = Math.max(0, daysBetween(d.pausedOn, dateKey()));
//     const newEnd = addDays(d.endDate, days);
//     return {
//       status: "active",
//       endDate: newEnd,
//       pausedOn: "",
//       pauseReason: "",
//       history: [
//         ...(d.history ?? []),
//         event(
//           "resumed",
//           by,
//           byName,
//           `Resumed after ${days} day${days === 1 ? "" : "s"}. End date moved from ${fmtDate(d.endDate)} to ${fmtDate(newEnd)}.`
//         ),
//       ],
//     };
//   });

// /** Extend the end date */
// export const extendPlan = (id: string, newEnd: string, reason: string, by: string, byName: string) =>
//   edit(id, (d) => {
//     if (newEnd <= d.endDate) throw new Error("The new end date must be after the current end date.");
//     return {
//       endDate: newEnd,
//       history: [
//         ...(d.history ?? []),
//         event("extended", by, byName, `Extended from ${fmtDate(d.endDate)} to ${fmtDate(newEnd)}: ${reason}`),
//       ],
//     };
//   });

// /** Save the content plan of a month. Earlier months are kept and can't be changed. */
// export const saveContentPlan = (
//   id: string,
//   month: string,
//   content: string,
//   by: string,
//   byName: string
// ) =>
//   edit(id, (d) => {
//     if (month < monthKey()) throw new Error("Earlier months are kept as they were and can't be changed.");
//     const others = ((d.contentPlans ?? []) as ContentPlan[]).filter((c) => c.month !== month);
//     const entry: ContentPlan = { month, content, updatedAt: Date.now(), updatedBy: by, updatedByName: byName };
//     return {
//       contentPlans: [...others, entry],
//       history: [...(d.history ?? []), event("content", by, byName, `Content plan updated for ${month}`)],
//     };
//   });

// /** Save how many posters / videos / items are posted (never above the plan totals) */
// export const savePosted = (id: string, posted: Posted, note: string, by: string, byName: string) =>
//   edit(id, (d) => {
//     const clamp = (n: number, max: number) => Math.min(max, Math.max(0, Math.floor(Number(n) || 0)));
//     const extra: Record<string, number> = {};
//     ((d.extraItems ?? []) as PlanItem[]).forEach((i) => {
//       extra[i.name] = clamp(posted.extra?.[i.name] ?? 0, i.count);
//     });
//     return {
//       posted: {
//         posters: clamp(posted.posters, d.posters ?? 0),
//         videos: clamp(posted.videos, d.videos ?? 0),
//         extra,
//       },
//       history: [...(d.history ?? []), event("posted", by, byName, note)],
//     };
//   });









  import {
  arrayUnion,
  collection,
  doc,
  getDocs,
  runTransaction,
  updateDoc,
  type DocumentData,
} from "firebase/firestore";
import { db } from "../config/firebase/firebase";
import { dateKey, monthKey } from "./AttendanceService";

/** One plan per client. The plan id is the client id. */
export type PlanItem = { name: string; count: number };

export type PlanEvent = {
  type: "created" | "updated" | "paused" | "resumed" | "extended" | "content" | "posted";
  at: number;
  by: string;
  byName: string;
  note: string;
};

/** The content plan of one month. Earlier months are kept and can't be changed. */
export type ContentPlan = {
  month: string; // YYYY-MM
  content: string;
  updatedAt: number;
  updatedBy: string;
  updatedByName: string;
};

/** How many outputs are already posted */
export type Posted = {
  posters: number;
  videos: number;
  extra: Record<string, number>; // keyed by item name, e.g. { Brochure: 1 }
};

export type Plan = {
  id: string; // = clientId
  clientId: string;
  clientName: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  amount: number; // plan amount for the whole period
  services: string[]; // required services
  posters: number;
  videos: number;
  extraItems: PlanItem[]; // brochures, company profile, show reel ...
  posted: Posted; // posting progress
  notes: string;
  status: "active" | "paused";
  pausedOn: string; // date the plan was paused, "" when running
  pauseReason: string;
  contentPlans: ContentPlan[];
  history: PlanEvent[];
};

export type PlanInput = Pick<
  Plan,
  | "clientId"
  | "clientName"
  | "startDate"
  | "endDate"
  | "amount"
  | "services"
  | "posters"
  | "videos"
  | "extraItems"
  | "notes"
>;

const COL = "clientPlans";

/** A plan counts as "ending soon" when this many days (or fewer) are left */
export const ENDING_SOON_DAYS = 5;

/* ───────────── dates ───────────── */
const parse = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (s: string, n: number) => {
  const d = parse(s);
  return dateKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n));
};

/** Whole days from a to b (negative when b is before a) */
export const daysBetween = (a: string, b: string) =>
  Math.round((parse(b).getTime() - parse(a).getTime()) / 86_400_000);

export const fmtDate = (s: string) =>
  s ? parse(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

/* ───────────── state of a plan ───────────── */
export type PlanState = "no_plan" | "paused" | "ended" | "ending" | "active";

export function planState(p?: Plan | null, today = dateKey()): { state: PlanState; daysLeft: number } {
  if (!p) return { state: "no_plan", daysLeft: 0 };
  const daysLeft = daysBetween(today, p.endDate);
  if (p.status === "paused") return { state: "paused", daysLeft };
  if (daysLeft < 0) return { state: "ended", daysLeft };
  if (daysLeft <= ENDING_SOON_DAYS) return { state: "ending", daysLeft };
  return { state: "active", daysLeft };
}

/** Running plan with no content plan saved for the current month yet */
export const contentDue = (p: Plan) => {
  const { state } = planState(p);
  return (state === "active" || state === "ending") && !p.contentPlans.some((c) => c.month === monthKey());
};

/* ───────────── read ───────────── */
const toPlan = (id: string, d: DocumentData): Plan => ({
  id,
  clientId: d.clientId ?? id,
  clientName: d.clientName ?? "",
  startDate: d.startDate ?? "",
  endDate: d.endDate ?? "",
  amount: d.amount ?? 0,
  services: d.services ?? [],
  posters: d.posters ?? 0,
  videos: d.videos ?? 0,
  extraItems: d.extraItems ?? [],
  posted: {
    posters: d.posted?.posters ?? 0,
    videos: d.posted?.videos ?? 0,
    extra: d.posted?.extra ?? {},
  },
  notes: d.notes ?? "",
  status: d.status === "paused" ? "paused" : "active",
  pausedOn: d.pausedOn ?? "",
  pauseReason: d.pauseReason ?? "",
  contentPlans: d.contentPlans ?? [],
  history: d.history ?? [],
});

export async function listPlans(): Promise<Plan[]> {
  const snap = await getDocs(collection(db, COL));
  return snap.docs.map((d) => toPlan(d.id, d.data()));
}

/* ───────────── write ───────────── */
const event = (type: PlanEvent["type"], by: string, byName: string, note: string): PlanEvent => ({
  type,
  at: Date.now(),
  by,
  byName,
  note,
});

export async function createPlan(input: PlanInput, by: string, byName: string) {
  const ref = doc(db, COL, input.clientId);
  await runTransaction(db, async (tx) => {
    if ((await tx.get(ref)).exists()) throw new Error("This client already has a plan.");
    tx.set(ref, {
      ...input,
      posted: { posters: 0, videos: 0, extra: {} },
      status: "active",
      pausedOn: "",
      pauseReason: "",
      contentPlans: [],
      history: [event("created", by, byName, "Plan created")],
    });
  });
}

export const updatePlan = (input: PlanInput, by: string, byName: string) =>
  updateDoc(doc(db, COL, input.clientId), {
    ...input,
    history: arrayUnion(event("updated", by, byName, "Plan details updated")),
  });

// reads the latest copy inside a transaction, so a double click can't apply twice
const edit = (id: string, fn: (d: DocumentData) => Record<string, unknown>) =>
  runTransaction(db, async (tx) => {
    const ref = doc(db, COL, id);
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("Plan not found.");
    tx.update(ref, fn(snap.data()));
  });

/** Pause the plan dates (client delayed payment, shoot issue ...) */
export const pausePlan = (id: string, reason: string, by: string, byName: string) =>
  edit(id, (d) => {
    if (d.status === "paused") throw new Error("This plan is already paused.");
    return {
      status: "paused",
      pausedOn: dateKey(),
      pauseReason: reason,
      history: [...(d.history ?? []), event("paused", by, byName, reason)],
    };
  });

/** Resume: the end date moves forward by the number of days it was paused */
export const resumePlan = (id: string, by: string, byName: string) =>
  edit(id, (d) => {
    if (d.status !== "paused") throw new Error("This plan is not paused.");
    const days = Math.max(0, daysBetween(d.pausedOn, dateKey()));
    const newEnd = addDays(d.endDate, days);
    return {
      status: "active",
      endDate: newEnd,
      pausedOn: "",
      pauseReason: "",
      history: [
        ...(d.history ?? []),
        event(
          "resumed",
          by,
          byName,
          `Resumed after ${days} day${days === 1 ? "" : "s"}. End date moved from ${fmtDate(d.endDate)} to ${fmtDate(newEnd)}.`
        ),
      ],
    };
  });

/** Extend the end date */
export const extendPlan = (id: string, newEnd: string, reason: string, by: string, byName: string) =>
  edit(id, (d) => {
    if (newEnd <= d.endDate) throw new Error("The new end date must be after the current end date.");
    return {
      endDate: newEnd,
      history: [
        ...(d.history ?? []),
        event("extended", by, byName, `Extended from ${fmtDate(d.endDate)} to ${fmtDate(newEnd)}: ${reason}`),
      ],
    };
  });

/** Save the content plan of a month. Earlier months are kept and can't be changed. */
export const saveContentPlan = (
  id: string,
  month: string,
  content: string,
  by: string,
  byName: string
) =>
  edit(id, (d) => {
    if (month < monthKey()) throw new Error("Earlier months are kept as they were and can't be changed.");
    const others = ((d.contentPlans ?? []) as ContentPlan[]).filter((c) => c.month !== month);
    const entry: ContentPlan = { month, content, updatedAt: Date.now(), updatedBy: by, updatedByName: byName };
    return {
      contentPlans: [...others, entry],
      history: [...(d.history ?? []), event("content", by, byName, `Content plan updated for ${month}`)],
    };
  });

/** Save how many posters / videos / items are posted (never above the plan totals) */
export const savePosted = (id: string, posted: Posted, note: string, by: string, byName: string) =>
  edit(id, (d) => {
    const clamp = (n: number, max: number) => Math.min(max, Math.max(0, Math.floor(Number(n) || 0)));
    const extra: Record<string, number> = {};
    ((d.extraItems ?? []) as PlanItem[]).forEach((i) => {
      extra[i.name] = clamp(posted.extra?.[i.name] ?? 0, i.count);
    });
    return {
      posted: {
        posters: clamp(posted.posters, d.posters ?? 0),
        videos: clamp(posted.videos, d.videos ?? 0),
        extra,
      },
      history: [...(d.history ?? []), event("posted", by, byName, note)],
    };
  });