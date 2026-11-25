import { useState } from "react";
import { sendStaffPasswordReset, type Staff } from "../../service/staffService";
import {
  PERMISSION_LABELS,
  ROLE_LABELS,
  permissionsFor,
} from "../../utils/types/staffRoles";
import { ID_PROOF_LABELS, maskId } from "../../utils/types/staffId";
import { Badge, Btn, Notice, errMsg } from "../admin/Modal/Ui";

/**
 * Read-only profile for the logged-in staff member.
 * Details can only be changed by HR / admin (Staff Management).
 * The only action here is sending a password reset email to their own address.
 *
 * Save as: src/components/staff/StaffProfile.tsx
 */
const isPdf = (url: string) => url.split("?")[0].toLowerCase().endsWith(".pdf");

// phones: label above the value (long emails wrap instead of being cut off);
// sm and up: label left, value right
const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1 px-4 py-3.5 sm:flex-row sm:justify-between sm:gap-4 sm:px-5 sm:py-4">
    <dt className="text-xs text-zinc-500 sm:text-sm">{label}</dt>
    <dd className="min-w-0 break-words text-sm text-white sm:text-right">{children}</dd>
  </div>
);

const ProofTile = ({
  label,
  url,
  onOpen,
}: {
  label: string;
  url: string;
  onOpen: (url: string) => void;
}) => (
  <div className="space-y-2">
    <p className="text-xs text-zinc-400">{label}</p>

    {!url ? (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-white/10 text-xs text-zinc-500 sm:h-44">
        Not uploaded
      </div>
    ) : isPdf(url) ? (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="flex h-40 flex-col items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/5 text-sm text-sky-300 hover:bg-white/10 sm:h-44"
      >
        <span className="text-2xl">📄</span>
        Open PDF
      </a>
    ) : (
      <>
        <button
          type="button"
          onClick={() => onOpen(url)}
          className="block h-40 w-full overflow-hidden rounded-lg border border-white/10 bg-white/5 sm:h-44"
          title="Tap to enlarge"
        >
          <img src={url} alt={label} className="h-full w-full object-contain" />
        </button>
        <div className="flex gap-4 text-xs">
          <button
            type="button"
            onClick={() => onOpen(url)}
            className="py-1 text-sky-300 hover:underline"
          >
            Enlarge
          </button>
          <a href={url} target="_blank" rel="noreferrer" className="py-1 text-sky-300 hover:underline">
            Open in new tab
          </a>
        </div>
      </>
    )}
  </div>
);

const StaffProfile = ({ staff }: { staff: Staff }) => {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [showId, setShowId] = useState(false);
  const [lightbox, setLightbox] = useState("");

  const perms = permissionsFor(staff.role, staff.permissions);
  const hasProof = !!(staff.idProofType || staff.idProofFrontUrl || staff.idProofBackUrl);

  const resetPassword = async () => {
    setErr("");
    setMsg("");
    setBusy(true);
    try {
      await sendStaffPasswordReset(staff.email);
      setMsg(`A password reset link was sent to ${staff.email}. Check your inbox and spam folder.`);
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="animate-fade-in w-full min-w-0 max-w-2xl space-y-4 sm:space-y-6">
      {/* header: photo above the name on very narrow screens */}
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-center min-[420px]:flex-row min-[420px]:gap-4 min-[420px]:text-left sm:p-5">
        {staff.photoUrl ? (
          <button
            type="button"
            onClick={() => setLightbox(staff.photoUrl)}
            title="Tap to enlarge"
            className="shrink-0"
          >
            <img
              src={staff.photoUrl}
              alt={staff.name}
              className="h-20 w-20 rounded-2xl border border-white/10 object-cover"
            />
          </button>
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-2xl font-bold">
            {staff.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 space-y-1">
          <h2 className="break-words text-lg font-semibold text-white sm:text-xl">{staff.name}</h2>
          <p className="text-sm text-zinc-400">{ROLE_LABELS[staff.role] ?? "No role"}</p>
          <Badge tone={staff.active ? "emerald" : "red"}>
            {staff.active ? "Active" : "Disabled"}
          </Badge>
        </div>
      </div>

      {/* details */}
      <dl className="divide-y divide-white/5 rounded-2xl border border-white/5 bg-white/[0.02]">
        <Row label="Full name">{staff.name || "—"}</Row>
        <Row label="Email (login)">{staff.email || "—"}</Row>
        <Row label="Phone">{staff.phone || "—"}</Row>
        <Row label="Role">{ROLE_LABELS[staff.role] ?? "—"}</Row>
      </dl>

      {/* ID proof */}
      <div className="space-y-4 rounded-2xl border border-white/5 bg-white/[0.02] p-4 sm:p-5">
        <p className="text-sm font-medium text-white">ID proof</p>

        {hasProof ? (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-zinc-500">Proof type</p>
                <p className="mt-0.5 break-words text-sm text-white">
                  {staff.idProofType ? ID_PROOF_LABELS[staff.idProofType] : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">ID number</p>
                {staff.idProofNumber ? (
                  <div className="mt-0.5 flex flex-wrap items-center gap-3">
                    <span className="break-all font-mono text-sm tracking-wide text-white">
                      {showId ? staff.idProofNumber : maskId(staff.idProofNumber)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowId((v) => !v)}
                      className="py-1 text-xs text-sky-300 hover:underline"
                    >
                      {showId ? "Hide" : "Show"}
                    </button>
                  </div>
                ) : (
                  <p className="mt-0.5 text-sm text-white">—</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ProofTile label="Proof – front" url={staff.idProofFrontUrl} onOpen={setLightbox} />
              <ProofTile label="Proof – back" url={staff.idProofBackUrl} onOpen={setLightbox} />
            </div>
          </>
        ) : (
          <p className="text-sm text-zinc-500">No ID proof on file. Please contact HR.</p>
        )}
      </div>

      {/* access */}
      <div className="space-y-3 rounded-2xl border border-white/5 bg-white/[0.02] p-4 sm:p-5">
        <p className="text-sm font-medium text-white">Your access</p>
        <div className="flex flex-wrap gap-1">
          {perms.map((p) => (
            <Badge key={p} tone="sky">
              {PERMISSION_LABELS[p]}
            </Badge>
          ))}
          {!perms.length && <span className="text-xs text-zinc-500">No access</span>}
        </div>
      </div>

      {/* security */}
      <div className="space-y-3 rounded-2xl border border-white/5 bg-white/[0.02] p-4 sm:p-5">
        <div>
          <p className="text-sm font-medium text-white">Password</p>
          <p className="mt-1 break-words text-xs text-zinc-500">
            We will email a reset link to {staff.email}. Use it to set a new password.
          </p>
        </div>

        <Notice message={err} />
        {msg && <p className="break-words text-sm text-emerald-400">{msg}</p>}

        <Btn className="w-full sm:w-auto" onClick={resetPassword} disabled={busy}>
          {busy ? "Sending…" : "Send password reset email"}
        </Btn>
      </div>

      <p className="text-xs text-zinc-500">
        To change your name, phone, role or ID details, please contact HR.
      </p>

      {/* image lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-3 bg-black/90 p-4"
          onClick={() => setLightbox("")}
        >
          <img
            src={lightbox}
            alt="Preview"
            className="max-h-[80dvh] max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="flex gap-3 text-sm" onClick={(e) => e.stopPropagation()}>
            <a
              href={lightbox}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg px-4 py-2.5 text-sky-300 hover:bg-white/10"
            >
              Open in new tab
            </a>
            <button
              type="button"
              onClick={() => setLightbox("")}
              className="rounded-lg px-4 py-2.5 text-zinc-200 hover:bg-white/10"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffProfile;