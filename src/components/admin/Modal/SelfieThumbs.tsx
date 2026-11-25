import { useState } from "react";
import type { Attendance, Proof } from "../../../service/AttendanceService";

// Attendance may also carry the saved proofs (see the optional toRecord change)
type WithProof = Attendance & { checkInProof?: Proof | null; checkOutProof?: Proof | null };

type Shot = {
  kind: "Check-in" | "Check-out";
  url: string;
  at: Date | null;
  proof?: Proof | null;
};

const FACE_LABEL: Record<string, string> = {
  matched: "Face matched",
  mismatch: "Face did not match the profile photo",
  no_face: "No face found",
  multiple_faces: "More than one face",
  no_reference: "No profile photo to compare",
  error: "Face check unavailable",
};

const time = (d: Date | null) =>
  d ? d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : "";

/**
 * Check-in / check-out selfies of one attendance record.
 * Click a selfie to enlarge it with the face result and location.
 * Pass the staff's profile photo to compare side by side.
 */
const SelfieThumbs = ({
  record,
  profileUrl,
}: {
  record: Attendance;
  profileUrl?: string | null;
}) => {
  const r = record as WithProof;
  const [open, setOpen] = useState<Shot | null>(null);

  const shots: Shot[] = [];
  if (r.checkInSelfie)
    shots.push({ kind: "Check-in", url: r.checkInSelfie, at: r.checkIn, proof: r.checkInProof });
  if (r.checkOutSelfie)
    shots.push({ kind: "Check-out", url: r.checkOutSelfie, at: r.checkOut, proof: r.checkOutProof });

  if (!shots.length) return <p className="text-xs text-zinc-600">No selfie</p>;

  const p = open?.proof;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        {shots.map((s) => (
          <button
            key={s.kind}
            type="button"
            onClick={() => setOpen(s)}
            title="Click to enlarge"
            className="text-left"
          >
            <img
              src={s.url}
              alt={`${s.kind} selfie`}
              className="h-14 w-14 rounded-lg border border-white/10 object-cover"
            />
            <span className="mt-1 block text-[10px] text-zinc-500">
              {s.kind === "Check-in" ? "In" : "Out"} {time(s.at)}
            </span>
          </button>
        ))}

        {r.flagged && (
          <span className="rounded-full bg-amber-400/10 px-2 py-1 text-[11px] text-amber-300">
            Face check: please review
          </span>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-3 overflow-y-auto bg-black/90 p-4"
          onClick={() => setOpen(null)}
        >
          <div className="w-full max-w-md space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="relative">
              <img
                src={open.url}
                alt={`${open.kind} selfie`}
                className="max-h-[65vh] w-full rounded-xl object-contain"
              />
              {profileUrl && (
                <img
                  src={profileUrl}
                  alt="Profile photo"
                  title="Profile photo"
                  className="absolute right-2 top-2 h-16 w-16 rounded-lg border-2 border-white/70 object-cover"
                />
              )}
            </div>

            <div className="space-y-1 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-zinc-300">
              <p className="font-medium text-white">
                {open.kind} · {time(open.at)}
              </p>
              {p?.face && (
                <p className={p.face.state === "matched" ? "text-emerald-300" : "text-amber-300"}>
                  {FACE_LABEL[p.face.state] ?? p.face.state}
                  {p.face.distance !== null &&
                    ` (match score ${Math.round((1 - p.face.distance) * 100)}%)`}
                </p>
              )}
              {p && p.distance !== null && (
                <p>
                  {p.distance} m from office
                  {p.accuracy !== null && ` (±${p.accuracy} m)`}
                </p>
              )}
              {p?.capturedAt && (
                <p className="text-zinc-500">
                  Photo taken {new Date(p.capturedAt).toLocaleString("en-IN")}
                </p>
              )}
              {!p && (
                <p className="text-zinc-500">
                  Face and location details are not loaded for this record.
                </p>
              )}
            </div>

            <div className="flex justify-center gap-5 text-sm">
              <a
                href={open.url}
                target="_blank"
                rel="noreferrer"
                className="py-2 text-sky-300 hover:underline"
              >
                Open in new tab
              </a>
              <button
                type="button"
                onClick={() => setOpen(null)}
                className="py-2 text-zinc-300 hover:underline"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SelfieThumbs;