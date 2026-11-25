import { useEffect, useRef, useState } from "react";
import {
  OFFICE,
  getCurrentFix,
  type LocationFix,
} from "../../utils/types/OfficeLocation";
import {
  compareFace,
  loadFaceApi,
  loadReference,
  type FaceResult,
} from "../../utils/types/faceMatch";
import { fmtIST, istDate } from "../../utils/types/AttendanceRules";

export type CaptureResult = {
  blob: Blob;
  fix: LocationFix | null;
  face: FaceResult;
  capturedAt: number;
};

type Props = {
  title: string;
  name: string;
  /** staff profile photo (Staff.photoUrl) to compare with */
  photoUrl?: string | null;
  /** must be inside the office radius */
  requireOffice: boolean;
  /** strict: the photo is only taken when the face matches the profile photo */
  requireMatch: boolean;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: (r: CaptureResult) => Promise<void>;
};

type RefState = {
  state: "loading" | "ready" | "none" | "error";
  descriptor: Float32Array | null;
  msg?: string;
};

type Shot = CaptureResult & { url: string };

const FRAMES = 3; // frames checked per attempt
const FRAME_GAP_MS = 300;

const FACE_TEXT: Record<string, string> = {
  matched: "Face confirmed against your profile photo.",
  mismatch: "Face not confirmed: it does not match your profile photo. No photo was taken.",
  no_face: "No face found. Look straight at the camera in good light. No photo was taken.",
  multiple_faces: "More than one face found. Only you should be in view. No photo was taken.",
  no_reference:
    "Your profile photo has no usable face, so your face can't be confirmed. Ask HR to upload a clear, front-facing photo.",
  error: "Face check is unavailable right now. Try again.",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// better = matched, then lowest distance; mismatch beats no_face beats multiple/error
const rank = (f: FaceResult) =>
  f.state === "matched"
    ? 0 + (f.distance ?? 1)
    : f.state === "mismatch"
    ? 10 + (f.distance ?? 1)
    : f.state === "multiple_faces"
    ? 20
    : f.state === "no_face"
    ? 30
    : 40;

const stamp = (ctx: CanvasRenderingContext2D, w: number, h: number, lines: string[]) => {
  const pad = 8;
  const lh = 16;
  const bh = lines.length * lh + pad * 2;
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, h - bh, w, bh);
  ctx.fillStyle = "#fff";
  ctx.font = "12px monospace";
  lines.forEach((l, i) => ctx.fillText(l, pad, h - bh + pad + lh * (i + 1) - 4));
};

const grab = (v: HTMLVideoElement) => {
  const scale = Math.min(1, 640 / v.videoWidth);
  const c = document.createElement("canvas");
  c.width = Math.round(v.videoWidth * scale);
  c.height = Math.round(v.videoHeight * scale);
  // willReadFrequently: the face check reads this canvas several times
  c.getContext("2d", { willReadFrequently: true })!.drawImage(v, 0, 0, c.width, c.height);
  return c;
};

const SelfieCapture = ({
  title,
  name,
  photoUrl,
  requireOffice,
  requireMatch,
  confirmLabel,
  onClose,
  onConfirm,
}: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [camErr, setCamErr] = useState("");
  const [camReady, setCamReady] = useState(false);
  const [fix, setFix] = useState<LocationFix | null>(null);
  const [fixErr, setFixErr] = useState("");
  const [locating, setLocating] = useState(true);
  const [ref, setRef] = useState<RefState>({ state: "loading", descriptor: null });
  const [shot, setShot] = useState<Shot | null>(null);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  /* keep the page behind the sheet from scrolling while it is open */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  /* camera: started once; the <video> stays mounted so Retake keeps the stream */
  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamErr("This browser can't open the camera. Use HTTPS and a modern browser.");
      return;
    }
    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        const v = videoRef.current;
        if (v) {
          v.srcObject = s;
          v.play().then(() => setCamReady(true)).catch(() => {});
        }
      })
      .catch(() =>
        setCamErr("Camera is blocked. Allow camera access for this site and reopen.")
      );
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  /* location */
  const locate = () => {
    setLocating(true);
    setFixErr("");
    getCurrentFix()
      .then(setFix)
      .catch((e) => setFixErr(e instanceof Error ? e.message : "No location."))
      .finally(() => setLocating(false));
  };
  useEffect(locate, []);

  /* models + the staff profile photo */
  useEffect(() => {
    let off = false;
    (async () => {
      try {
        await loadFaceApi();
        if (!photoUrl) {
          if (!off)
            setRef({
              state: "none",
              descriptor: null,
              msg: "No profile photo is saved for your account.",
            });
          return;
        }
        const d = await loadReference(photoUrl);
        if (!off)
          setRef(
            d
              ? { state: "ready", descriptor: d }
              : {
                  state: "none",
                  descriptor: null,
                  msg: "No clear face found in your profile photo.",
                }
          );
      } catch (e) {
        if (!off)
          setRef({
            state: "error",
            descriptor: null,
            msg: e instanceof Error ? e.message : "Face check unavailable.",
          });
      }
    })();
    return () => {
      off = true;
    };
  }, [photoUrl]);

  useEffect(() => () => {
    if (shot) URL.revokeObjectURL(shot.url);
  }, [shot]);

  const locProblem = (f: LocationFix | null) =>
    !requireOffice
      ? ""
      : !f
      ? "Your location is needed to mark attendance."
      : f.accuracy > OFFICE.maxAccuracyMeters
      ? `Location is not accurate enough (±${f.accuracy} m). Turn on GPS and retry.`
      : f.distance > OFFICE.radiusMeters
      ? `You are ${f.distance} m from ${OFFICE.name}. Allowed: ${OFFICE.radiusMeters} m.`
      : "";

  // strict mode: without a usable profile photo the face can never be confirmed
  const refBlocked = requireMatch && (ref.state === "none" || ref.state === "error");

  const capture = async () => {
    const v = videoRef.current;
    if (!v) return;
    if (!v.videoWidth) {
      setErr("The camera is not ready yet. Wait a moment and try again.");
      return;
    }
    setErr("");
    setChecking(true);
    try {
      const latest = await getCurrentFix().catch(() => fix);
      setFix(latest);

      // 1) location first: outside the office, nothing is taken
      const lp = locProblem(latest);
      if (lp) {
        setErr(`${lp} No photo was taken.`);
        return;
      }

      // 2) check a few frames, keep the best one. Nothing is kept unless confirmed.
      let best: { canvas: HTMLCanvasElement; face: FaceResult } | null = null;
      for (let i = 0; i < FRAMES; i++) {
        const canvas = grab(v);
        let face: FaceResult;
        try {
          face = await compareFace(canvas, ref.descriptor);
        } catch {
          face = { state: "error", distance: null };
        }
        if (!best || rank(face) < rank(best.face)) best = { canvas, face };
        if (face.state === "matched") break; // good enough, stop early
        if (i < FRAMES - 1) await sleep(FRAME_GAP_MS);
      }
      if (!best) throw new Error("Could not read the camera. Try again.");

      if (requireMatch && best.face.state !== "matched") {
        setErr(FACE_TEXT[best.face.state]); // frames are discarded: no image, no check-in
        return;
      }

      // 3) confirmed: stamp time + location on the matching frame and keep it
      const { canvas: c, face } = best;
      const capturedAt = Date.now();
      stamp(c.getContext("2d")!, c.width, c.height, [
        name,
        `${istDate(capturedAt)} ${fmtIST(capturedAt)} IST`,
        latest
          ? `${latest.lat.toFixed(5)}, ${latest.lng.toFixed(5)} ±${latest.accuracy}m · ${latest.distance}m from office`
          : "Location unavailable",
      ]);

      const blob = await new Promise<Blob | null>((res) => c.toBlob(res, "image/jpeg", 0.82));
      if (!blob) throw new Error("Could not save the photo. Try again.");
      setShot({ blob, fix: latest, face, capturedAt, url: URL.createObjectURL(blob) });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not take the photo.");
    } finally {
      setChecking(false);
    }
  };

  const retake = () => {
    if (shot) URL.revokeObjectURL(shot.url);
    setShot(null);
    setErr("");
    // the video was only hidden, so the camera is still connected: make sure it is playing
    videoRef.current?.play().catch(() => {});
  };

  const confirm = async () => {
    if (!shot || busy) return;
    setBusy(true);
    setErr("");
    try {
      await onConfirm({
        blob: shot.blob,
        fix: shot.fix,
        face: shot.face,
        capturedAt: shot.capturedAt,
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save attendance. Try again.");
      setBusy(false);
    }
  };

  const liveProblem = locProblem(fix);

  return (
    // phones: a bottom sheet that fills the width; sm and up: a centred card
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center sm:p-4">
      <div className="max-h-[100dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-2xl border border-white/10 bg-[#0f1117] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:rounded-2xl sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="min-w-0 break-words text-base font-semibold text-white">{title}</h3>
          <button
            onClick={onClose}
            disabled={busy}
            className="-mr-2 shrink-0 rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-white/5 hover:text-white disabled:opacity-40"
          >
            Close
          </button>
        </div>

        {/* camera / preview: height is capped so the buttons stay on screen on small phones */}
        <div className="relative overflow-hidden rounded-xl bg-black">
          {/* the video stays mounted so Retake keeps the camera connected */}
          <video
            ref={videoRef}
            playsInline
            muted
            className={shot ? "hidden" : "mx-auto max-h-[50dvh] w-full object-cover"}
            style={{ transform: "scaleX(-1)" }}
          />
          {shot && (
            <img
              src={shot.url}
              alt="Selfie"
              className="mx-auto max-h-[50dvh] w-full object-contain"
            />
          )}

          {!shot && !camReady && !camErr && (
            <p className="absolute inset-0 flex items-center justify-center text-xs text-zinc-400">
              Starting camera…
            </p>
          )}

          {/* the profile photo being matched against */}
          {photoUrl && (
            <img
              src={photoUrl}
              alt="Profile"
              className="absolute right-2 top-2 h-14 w-14 rounded-lg border-2 border-white/70 object-cover sm:h-16 sm:w-16"
              title="Your profile photo"
            />
          )}
        </div>
        {camErr && <p className="mt-2 break-words text-xs text-red-300">{camErr}</p>}

        {/* live status */}
        {!shot && (
          <div className="mt-3 space-y-1 text-xs">
            <p
              className={`break-words ${liveProblem && !locating ? "text-amber-300" : "text-zinc-400"}`}
            >
              {locating
                ? "Getting your location…"
                : fix
                ? `Location: ${fix.distance} m from office (±${fix.accuracy} m)`
                : fixErr}
              {!locating && (
                <button onClick={locate} className="ml-2 py-1 text-sky-300 hover:underline">
                  Refresh
                </button>
              )}
            </p>
            {liveProblem && !locating && fix && (
              <p className="break-words text-amber-300">{liveProblem}</p>
            )}
            <p className={`break-words ${refBlocked ? "text-red-300" : "text-zinc-500"}`}>
              {ref.state === "loading"
                ? "Loading your profile photo and face check…"
                : ref.state === "ready"
                ? "Matching with your profile photo (top right). Look straight at the camera."
                : refBlocked
                ? `${ref.msg ?? "Face check unavailable."} Your face can't be confirmed, so check-in is not possible.`
                : ref.msg ?? "Face check unavailable."}
            </p>
          </div>
        )}

        {/* after the photo (only reached when the face is confirmed) */}
        {shot && (
          <div className="mt-3 space-y-1 text-xs">
            <p className="break-words text-emerald-300">
              {FACE_TEXT.matched}
              {shot.face.distance !== null &&
                ` (match score ${Math.round((1 - shot.face.distance) * 100)}%)`}
            </p>
            {shot.fix && (
              <p className="break-words text-zinc-400">
                Location OK · {shot.fix.distance} m from office · {fmtIST(shot.capturedAt)}
              </p>
            )}
          </div>
        )}

        {err && (
          <p role="alert" className="mt-2 break-words text-xs text-red-300">
            {err}
          </p>
        )}

        <div className="mt-4 flex gap-3">
          {shot ? (
            <>
              <button
                onClick={retake}
                disabled={busy}
                className="min-h-11 flex-1 rounded-xl border border-white/10 py-3 text-sm text-zinc-300 hover:bg-white/5 disabled:opacity-40"
              >
                Retake
              </button>
              <button
                onClick={confirm}
                disabled={busy}
                className="min-h-11 flex-1 rounded-xl bg-violet-600 py-3 text-sm font-medium text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy ? "Saving…" : confirmLabel}
              </button>
            </>
          ) : (
            <button
              onClick={capture}
              disabled={!camReady || checking || ref.state === "loading" || refBlocked}
              className="min-h-11 w-full rounded-xl bg-violet-600 py-3 text-sm font-medium text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {checking ? "Confirming face…" : "Confirm face and take photo"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SelfieCapture;