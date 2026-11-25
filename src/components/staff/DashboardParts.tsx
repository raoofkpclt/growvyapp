import type { ReactNode } from "react";

/**
 * Small shared pieces for the staff dashboards.
 * Save as: src/components/staff/DashboardParts.tsx
 */
export type Tone = "violet" | "emerald" | "amber" | "red" | "sky" | "zinc";

const TONES: Record<Tone, { dot: string; text: string; bar: string }> = {
  violet: { dot: "bg-violet-400", text: "text-violet-300", bar: "bg-violet-400" },
  emerald: { dot: "bg-emerald-400", text: "text-emerald-300", bar: "bg-emerald-400" },
  amber: { dot: "bg-amber-400", text: "text-amber-300", bar: "bg-amber-400" },
  red: { dot: "bg-red-400", text: "text-red-300", bar: "bg-red-400" },
  sky: { dot: "bg-sky-400", text: "text-sky-300", bar: "bg-sky-400" },
  zinc: { dot: "bg-zinc-500", text: "text-white", bar: "bg-zinc-500" },
};

/** colours handed out in order to task statuses */
export const TONE_CYCLE: Tone[] = ["sky", "amber", "violet", "emerald", "red", "zinc"];

/**
 * Long values (money like ₹12,45,000) get a smaller font so they never
 * overflow a narrow card on a phone. Short numbers stay big.
 */
const valueSize = (value: string | number) => {
  const len = String(value).length;
  if (len > 11) return "text-base sm:text-xl lg:text-2xl";
  if (len > 8) return "text-lg sm:text-2xl lg:text-3xl";
  return "text-2xl sm:text-3xl";
};

export const StatCard = ({
  label,
  value,
  sub,
  tone = "zinc",
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: Tone;
}) => (
  <div className="min-w-0 rounded-2xl border border-white/5 bg-white/[0.03] p-3 transition-colors hover:bg-white/[0.05] sm:p-4">
    <div className="flex items-center gap-2">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONES[tone].dot}`} />
      <p className="min-w-0 text-xs leading-tight text-zinc-500">{label}</p>
    </div>
    <p
      className={`mt-1.5 break-words font-semibold tabular-nums leading-tight sm:mt-2 ${valueSize(
        value
      )} ${TONES[tone].text}`}
    >
      {value}
    </p>
    {sub && <p className="mt-1 text-[11px] leading-snug text-zinc-500">{sub}</p>}
  </div>
);

export const SectionHead = ({
  title,
  sub,
  action,
}: {
  title: string;
  sub?: string;
  action?: ReactNode;
}) => (
  <div className="flex items-end justify-between gap-3">
    <div className="min-w-0">
      <h3 className="text-sm font-semibold text-zinc-200">{title}</h3>
      {sub && <p className="mt-0.5 text-xs text-zinc-500">{sub}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

/** one bar split into coloured parts, with a legend underneath */
export const SegBar = ({ parts }: { parts: { label: string; value: number; tone: Tone }[] }) => {
  const total = parts.reduce((s, p) => s + p.value, 0);
  return (
    <div className="min-w-0 space-y-3">
      <div className="flex h-2.5 overflow-hidden rounded-full bg-white/5">
        {total > 0 &&
          parts
            .filter((p) => p.value > 0)
            .map((p) => (
              <div
                key={p.label}
                className={TONES[p.tone].bar}
                style={{ width: `${(p.value / total) * 100}%` }}
                title={`${p.label}: ${p.value}`}
              />
            ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {parts.map((p) => (
          <span key={p.label} className="flex items-center gap-1.5 text-[11px] text-zinc-400">
            <span className={`h-2 w-2 shrink-0 rounded-full ${TONES[p.tone].dot}`} />
            {p.label} · {p.value}
          </span>
        ))}
      </div>
    </div>
  );
};