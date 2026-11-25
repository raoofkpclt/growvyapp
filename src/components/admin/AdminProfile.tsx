import { useEffect, useState, type ReactNode } from "react";
import { FirebaseError } from "firebase/app";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  updateProfile,
  verifyBeforeUpdateEmail,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../../config/firebase/firebase";
import { uploadFile } from "../../utils/uploadFile";

type Msg = { type: "ok" | "err"; text: string } | null;

type Profile = {
  name: string;
  mobile: string;
  role: string;
  photo: string;
  proof: string;
  proofName: string;
};

const EMPTY: Profile = { name: "", mobile: "", role: "Main Admin", photo: "", proof: "", proofName: "" };
const ROLES = ["Main Admin", "Owner", "Director", "Manager"];
const ACCESS = ["Dashboard", "Clients", "Work", "Bills", "Staff", "Payroll", "Tasks", "Accounts"];

const errText = (e: unknown) => {
  const code = e instanceof FirebaseError ? e.code : "";
  switch (code) {
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Current password is wrong.";
    case "auth/email-already-in-use":
      return "That email is already used by another account.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/weak-password":
      return "New password is too weak (minimum 6 characters).";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a few minutes and try again.";
    case "auth/requires-recent-login":
      return "Please log out, log in again, and retry.";
    case "auth/operation-not-allowed":
      return "Email change is not enabled for this project. Check Firebase Auth settings.";
    case "permission-denied":
      return "No permission to save. Check your Firestore rules for adminProfiles.";
    default:
      return "Something went wrong. Please try again.";
  }
};

const inputCls =
  "w-full mt-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-zinc-600 outline-none focus:border-violet-500 transition-colors";
const btnCls =
  "px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-500 disabled:opacity-50 transition-colors";
const ghostBtn =
  "px-5 py-2.5 rounded-xl border border-white/10 text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/5 disabled:opacity-50 transition-colors";

const Card = ({
  title,
  text,
  action,
  children,
}: {
  title: string;
  text?: string;
  action?: ReactNode;
  children: ReactNode;
}) => (
  <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 space-y-4">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="text-base font-semibold text-white">{title}</h3>
        {text && <p className="text-sm text-zinc-500">{text}</p>}
      </div>
      {action}
    </div>
    {children}
  </div>
);

const Notice = ({ msg }: { msg: Msg }) =>
  msg ? (
    <p className={`text-sm ${msg.type === "ok" ? "text-emerald-400" : "text-red-400"}`}>{msg.text}</p>
  ) : null;

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div>
    <p className="text-xs text-zinc-500">{label}</p>
    <div className="mt-1 text-sm text-white break-words">{children}</div>
  </div>
);

// Firebase needs a fresh login before changing email / password
const reauth = async (currentPassword: string) => {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error("Not logged in");
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, currentPassword));
  return user;
};

const checkFile = (file: File, kind: "photo" | "proof"): string | null => {
  const maxMb = kind === "photo" ? 3 : 5;
  if (file.size > maxMb * 1024 * 1024) return `File is too large (max ${maxMb} MB).`;
  const okImage = file.type.startsWith("image/");
  if (kind === "photo" && !okImage) return "Profile image must be an image file.";
  if (kind === "proof" && !okImage && file.type !== "application/pdf") return "Proof must be an image or a PDF.";
  return null;
};

type Props = {
  /** optional: lets the page header show the new name / photo right after saving */
  onProfileChange?: (p: { name: string; photo: string }) => void;
};

const AdminProfile = ({ onProfileChange }: Props) => {
  const user = auth.currentUser;

  // ── details (name, mobile, role, photo, proof) ──
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile>(EMPTY);
  const [draft, setDraft] = useState<Profile>(EMPTY);
  const [editing, setEditing] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [detailsMsg, setDetailsMsg] = useState<Msg>(null);

  // ── email / password ──
  const [newEmail, setNewEmail] = useState("");
  const [emailPass, setEmailPass] = useState("");
  const [emailMsg, setEmailMsg] = useState<Msg>(null);

  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [passMsg, setPassMsg] = useState<Msg>(null);

  const [busy, setBusy] = useState<"" | "details" | "email" | "pass">("");

  // load saved profile
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, "adminProfiles", user.uid));
        const d = snap.exists() ? snap.data() : {};
        const p: Profile = {
          name: d.name ?? user.displayName ?? "",
          mobile: d.mobile ?? "",
          role: d.role ?? "Main Admin",
          photo: d.photo ?? "",
          proof: d.proof ?? "",
          proofName: d.proofName ?? "",
        };
        if (alive) {
          setProfile(p);
          setDraft(p);
          onProfileChange?.({ name: p.name, photo: p.photo });
        }
      } catch (err) {
        if (alive) setDetailsMsg({ type: "err", text: errText(err) });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  // preview for a newly picked photo
  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview("");
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  const startEdit = () => {
    setDraft(profile);
    setPhotoFile(null);
    setProofFile(null);
    setDetailsMsg(null);
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraft(profile);
    setPhotoFile(null);
    setProofFile(null);
    setDetailsMsg(null);
    setEditing(false);
  };

  const pickFile = (kind: "photo" | "proof", file: File | null) => {
    if (!file) return;
    const problem = checkFile(file, kind);
    if (problem) return setDetailsMsg({ type: "err", text: problem });
    setDetailsMsg(null);
    kind === "photo" ? setPhotoFile(file) : setProofFile(file);
  };

  const saveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const name = draft.name.trim();
    const mobile = draft.mobile.trim();
    if (!name) return setDetailsMsg({ type: "err", text: "Name is required." });
    if (mobile && !/^\+?[0-9\s-]{7,15}$/.test(mobile))
      return setDetailsMsg({ type: "err", text: "Enter a valid mobile number." });

    setBusy("details");
    setDetailsMsg(null);
    try {
      const photo = photoFile ? await uploadFile(photoFile) : draft.photo;
      const proof = proofFile ? await uploadFile(proofFile) : draft.proof;
      const proofName = proofFile ? proofFile.name : proof ? draft.proofName : "";

      const next: Profile = { name, mobile, role: draft.role, photo, proof, proofName };

      await setDoc(
        doc(db, "adminProfiles", user.uid),
        { ...next, email: user.email, updatedAt: serverTimestamp() },
        { merge: true }
      );
      if (name !== user.displayName) await updateProfile(user, { displayName: name });

      setProfile(next);
      setDraft(next);
      setPhotoFile(null);
      setProofFile(null);
      setEditing(false);
      setDetailsMsg({ type: "ok", text: "Profile saved." });
      onProfileChange?.({ name, photo });
    } catch (err) {
      setDetailsMsg({ type: "err", text: errText(err) });
    } finally {
      setBusy("");
    }
  };

  const saveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = newEmail.trim();
    if (email.toLowerCase() === user?.email?.toLowerCase()) {
      setEmailMsg({ type: "err", text: "That is already your login email." });
      return;
    }
    setBusy("email");
    setEmailMsg(null);
    try {
      const u = await reauth(emailPass);
      await verifyBeforeUpdateEmail(u, email);
      setEmailMsg({
        type: "ok",
        text: `Verification link sent to ${email}. Open it to finish the change, then log in with the new email.`,
      });
      setNewEmail("");
      setEmailPass("");
    } catch (err) {
      setEmailMsg({ type: "err", text: errText(err) });
    } finally {
      setBusy("");
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass.length < 6) return setPassMsg({ type: "err", text: "New password must be at least 6 characters." });
    if (newPass !== confirmPass) return setPassMsg({ type: "err", text: "New passwords do not match." });
    if (newPass === oldPass) return setPassMsg({ type: "err", text: "New password must be different from the current one." });

    setBusy("pass");
    setPassMsg(null);
    try {
      const u = await reauth(oldPass);
      await updatePassword(u, newPass);
      setPassMsg({ type: "ok", text: "Password changed. Use the new password next time you log in." });
      setOldPass("");
      setNewPass("");
      setConfirmPass("");
    } catch (err) {
      setPassMsg({ type: "err", text: errText(err) });
    } finally {
      setBusy("");
    }
  };

  const shownPhoto = editing ? photoPreview || draft.photo : profile.photo;
  const initial = (profile.name || user?.displayName || user?.email || "A").charAt(0).toUpperCase();
  const roleOptions = ROLES.includes(draft.role) ? ROLES : [draft.role, ...ROLES];

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-semibold text-white">Admin profile</h2>
        <p className="text-sm text-zinc-500">Manage your details, login email and password.</p>
      </div>

      {/* summary */}
      <div className="flex items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-6">
        {shownPhoto ? (
          <img src={shownPhoto} alt="Profile" className="w-16 h-16 rounded-full object-cover border border-white/10" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-violet-600 flex items-center justify-center text-2xl font-semibold text-white">
            {initial}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-medium text-white truncate">{profile.name || "Admin"}</p>
          <p className="text-sm text-zinc-400 truncate">{user?.email}</p>
          <span className="inline-block mt-1.5 text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            {profile.role} · Full access
          </span>
        </div>
      </div>

      {/* details */}
      <Card
        title="Profile details"
        text={editing ? "Edit your details, then save." : undefined}
        action={
          !editing && !loading ? (
            <button onClick={startEdit} className={ghostBtn}>
              Edit profile
            </button>
          ) : undefined
        }
      >
        {loading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : !editing ? (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Row label="Name">{profile.name || "—"}</Row>
              <Row label="Role">{profile.role}</Row>
              <Row label="Login email">{user?.email || "—"}</Row>
              <Row label="Mobile number">{profile.mobile || "—"}</Row>
            </div>
            <Row label="Proof">
              {profile.proof ? (
                <a
                  href={profile.proof}
                  target="_blank"
                  rel="noreferrer"
                  className="text-violet-300 hover:text-violet-200 underline underline-offset-2"
                >
                  {profile.proofName || "View proof"}
                </a>
              ) : (
                "No proof uploaded"
              )}
            </Row>
            <Notice msg={detailsMsg} />
          </div>
        ) : (
          <form onSubmit={saveDetails} className="space-y-4">
            {/* photo */}
            <div className="flex items-center gap-4">
              {shownPhoto ? (
                <img src={shownPhoto} alt="Profile" className="w-16 h-16 rounded-full object-cover border border-white/10" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-violet-600 flex items-center justify-center text-2xl font-semibold text-white">
                  {initial}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <label className={`${ghostBtn} cursor-pointer`}>
                  {shownPhoto ? "Change image" : "Upload image"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      pickFile("photo", e.target.files?.[0] ?? null);
                      e.target.value = "";
                    }}
                  />
                </label>
                {shownPhoto && (
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoFile(null);
                      setDraft((p) => ({ ...p, photo: "" }));
                    }}
                    className={ghostBtn}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-zinc-400">Name</label>
                <input
                  className={inputCls}
                  value={draft.name}
                  onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Admin name"
                />
              </div>
              <div>
                <label className="text-sm text-zinc-400">Role</label>
                <select
                  className={inputCls}
                  value={draft.role}
                  onChange={(e) => setDraft((p) => ({ ...p, role: e.target.value }))}
                >
                  {roleOptions.map((r) => (
                    <option key={r} value={r} className="bg-[#0d0f15]">
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm text-zinc-400">Mobile number</label>
              <input
                type="tel"
                className={inputCls}
                value={draft.mobile}
                onChange={(e) => setDraft((p) => ({ ...p, mobile: e.target.value }))}
                placeholder="+91 9876543210"
              />
            </div>

            {/* proof */}
            <div>
              <label className="text-sm text-zinc-400">Proof (ID card, image or PDF, max 5 MB)</label>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <label className={`${ghostBtn} cursor-pointer`}>
                  {draft.proof || proofFile ? "Replace proof" : "Upload proof"}
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      pickFile("proof", e.target.files?.[0] ?? null);
                      e.target.value = "";
                    }}
                  />
                </label>
                {(draft.proof || proofFile) && (
                  <button
                    type="button"
                    onClick={() => {
                      setProofFile(null);
                      setDraft((p) => ({ ...p, proof: "", proofName: "" }));
                    }}
                    className={ghostBtn}
                  >
                    Remove
                  </button>
                )}
                <span className="text-sm text-zinc-400 truncate">
                  {proofFile ? proofFile.name : draft.proof ? draft.proofName || "Proof uploaded" : "No file chosen"}
                </span>
              </div>
            </div>

            <Notice msg={detailsMsg} />
            <div className="flex gap-3">
              <button type="button" onClick={cancelEdit} disabled={busy !== ""} className={ghostBtn}>
                Cancel
              </button>
              <button disabled={busy !== ""} className={btnCls}>
                {busy === "details" ? "Saving..." : "Save profile"}
              </button>
            </div>
          </form>
        )}
      </Card>

      {/* access */}
      <Card title="Access" text="The admin account has full access to every section.">
        <div className="flex flex-wrap gap-2">
          {ACCESS.map((a) => (
            <span key={a} className="text-xs px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-300">
              {a}
            </span>
          ))}
        </div>
      </Card>

      {/* email */}
      <Card title="Login email" text="We send a verification link to the new address. The email changes after you open it.">
        <form onSubmit={saveEmail} className="space-y-3">
          <input
            required
            type="email"
            className={inputCls}
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="New email address"
            autoComplete="email"
          />
          <input
            required
            type="password"
            className={inputCls}
            value={emailPass}
            onChange={(e) => setEmailPass(e.target.value)}
            placeholder="Current password"
            autoComplete="current-password"
          />
          <Notice msg={emailMsg} />
          <button disabled={busy !== ""} className={btnCls}>
            {busy === "email" ? "Sending..." : "Change email"}
          </button>
        </form>
      </Card>

      {/* password */}
      <Card title="Password" text="Use at least 6 characters. Longer is safer.">
        <form onSubmit={savePassword} className="space-y-3">
          <input
            required
            type="password"
            className={inputCls}
            value={oldPass}
            onChange={(e) => setOldPass(e.target.value)}
            placeholder="Current password"
            autoComplete="current-password"
          />
          <input
            required
            type="password"
            className={inputCls}
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            placeholder="New password"
            autoComplete="new-password"
          />
          <input
            required
            type="password"
            className={inputCls}
            value={confirmPass}
            onChange={(e) => setConfirmPass(e.target.value)}
            placeholder="Confirm new password"
            autoComplete="new-password"
          />
          <Notice msg={passMsg} />
          <button disabled={busy !== ""} className={btnCls}>
            {busy === "pass" ? "Updating..." : "Change password"}
          </button>
        </form>
      </Card>
    </div>
  );
};

export default AdminProfile;