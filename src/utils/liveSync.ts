/**
 * Live sync: makes every page that loads data with useLoad() update by itself.
 *
 * How it works
 *  - startLiveSync() listens (Firestore onSnapshot) to the collections listed in LIVE.
 *  - When anything in them changes (a task is assigned, paused or completed, a leave
 *    is requested or approved, someone checks in...), a counter goes up.
 *  - useLoad() watches that counter and quietly loads its data again.
 *    No spinner, no page refresh, and form fields people are typing in are not reset.
 *  - Coming back to the browser tab also refreshes everything once.
 *
 * Save as: src/utils/liveSync.ts
 */
import { useSyncExternalStore } from "react";
import { collection, onSnapshot, query, where, Timestamp } from "firebase/firestore";
import { db } from "../config/firebase/firebase";

/**
 * !! Use YOUR real collection names here. Search the project for  collection(db, "
 * to see them. Remove names that don't exist.
 *
 * `since` (optional, cheaper): the name of an "updatedAt" timestamp field that your
 * writes set with serverTimestamp(). The listener then reads ZERO existing documents
 * and only reports changes made after the page opened. Without `since`, the listener
 * reads the whole collection once when it starts.
 */
const LIVE: { name: string; since?: string }[] = [
  { name: "tasks" },
  { name: "leaves" },
  { name: "attendance" },
  { name: "notifications" },
  { name: "staff" },
  { name: "clients" },
  { name: "plans" },
  { name: "works" },
];

/** wait this long after a change before reloading, so a burst of changes = one reload */
const DEBOUNCE_MS = 400;

/* ───────────── the counter that useLoad() watches ───────────── */

let version = 0;
const subscribers = new Set<() => void>();
let timer: ReturnType<typeof setTimeout> | null = null;

export const bumpLiveVersion = () => {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    version += 1;
    subscribers.forEach((fn) => fn());
  }, DEBOUNCE_MS);
};

/** a number that changes whenever live data changed */
export const useLiveVersion = () =>
  useSyncExternalStore(
    (cb) => {
      subscribers.add(cb);
      return () => {
        subscribers.delete(cb);
      };
    },
    () => version,
    () => 0
  );

/* ───────────── the listeners ───────────── */

let stops: (() => void)[] = [];
let users = 0;

/**
 * Call once when a signed-in area opens (staff home, admin home).
 * Returns a function that stops the listeners. Safe to call from React effects:
 * listeners start once and stop when the last caller leaves.
 */
export const startLiveSync = () => {
  users += 1;

  if (users === 1) {
    const startedAt = Timestamp.now();

    LIVE.forEach(({ name, since }) => {
      let first = true;
      const source = since
        ? query(collection(db, name), where(since, ">=", startedAt))
        : collection(db, name);

      const stop = onSnapshot(
        source,
        () => {
          // the first callback is just the data that was already there
          if (first) {
            first = false;
            return;
          }
          bumpLiveVersion();
        },
        // no permission for this collection (or offline): skip it quietly
        () => {}
      );
      stops.push(stop);
    });

    const onVisible = () => {
      if (document.visibilityState === "visible") bumpLiveVersion();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", bumpLiveVersion);
    window.addEventListener("online", bumpLiveVersion);
    stops.push(() => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", bumpLiveVersion);
      window.removeEventListener("online", bumpLiveVersion);
    });
  }

  return () => {
    users = Math.max(0, users - 1);
    if (users === 0) {
      stops.forEach((s) => s());
      stops = [];
    }
  };
};