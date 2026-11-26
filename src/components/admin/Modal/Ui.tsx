import React, { useEffect, useRef, useState } from "react";
import { useLiveVersion } from "../../../utils/liveSync";

/** Whoever is looking at the panel: a staff member or the admin */
export type Viewer = { uid: string; name: string };

export const inputCls =
  "w-full px-3 py-2 rounded-lg text-sm text-white placeholder-zinc-600 bg-white/5 border border-white/10 outline-none focus:border-sky-500 [color-scheme:dark] [&>option]:bg-[#0d0f15]";

export const Card = ({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => (
  <div className={`rounded-2xl border border-white/5 bg-white/[0.02] ${className}`}>
    {children}
  </div>
);

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
};

export const Btn = ({ variant = "primary", className = "", ...props }: BtnProps) => {
  const styles = {
    primary: "bg-sky-500 hover:bg-sky-400 text-white",
    ghost: "bg-white/5 hover:bg-white/10 text-zinc-200",
    danger: "bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20",
  }[variant];
  return (
    <button
      {...props}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${styles} ${className}`}
    />
  );
};

const TONES = {
  zinc: "bg-white/5 text-zinc-300",
  sky: "bg-sky-500/10 text-sky-300",
  emerald: "bg-emerald-500/10 text-emerald-300",
  amber: "bg-amber-500/10 text-amber-300",
  red: "bg-red-500/10 text-red-300",
};

export const Badge = ({
  tone = "zinc",
  children,
}: {
  tone?: keyof typeof TONES;
  children: React.ReactNode;
}) => (
  <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap ${TONES[tone]}`}>
    {children}
  </span>
);

export const Label = ({ text, children }: { text: string; children: React.ReactNode }) => (
  <label className="block space-y-1">
    <span className="text-xs text-zinc-400">{text}</span>
    {children}
  </label>
);

export const Notice = ({ message }: { message?: string }) =>
  message ? <p className="mt-2 text-sm text-red-400">{message}</p> : null;

export const Modal = ({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
    onClick={onClose}
  >
    <div
      className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0d0f15] p-6"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold">{title}</h3>
        <button onClick={onClose} aria-label="Close" className="text-zinc-500 hover:text-white">
          ✕
        </button>
      </div>
      {children}
    </div>
  </div>
);

export const fmtTime = (d: Date | null) =>
  d ? d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—";

export const money = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);

export const errMsg = (e: unknown) =>
  e instanceof Error ? e.message : "Something went wrong";

/**
 * Runs an async loader whenever deps change; call reload() to refetch.
 * It also reloads by itself, quietly (no spinner), when live data changes
 * (see src/utils/liveSync.ts).
 */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[], initial: T) {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  const live = useLiveVersion();

  const fnRef = useRef(fn);
  fnRef.current = fn;
  const prevDeps = useRef<unknown[] | null>(null);

  useEffect(() => {
    const same =
      prevDeps.current !== null &&
      prevDeps.current.length === deps.length &&
      prevDeps.current.every((d, i) => Object.is(d, deps[i]));
    prevDeps.current = deps;
    if (!same) setLoading(true);

    let alive = true;
    fnRef
      .current()
      .then((result) => {
        if (!alive) return;
        setData(result);
        setError("");
      })
      .catch((e) => {
        if (alive) setError(errMsg(e));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick, live]);

  return { data, loading, error, reload: () => setTick((t) => t + 1) };
}