import { useEffect, useState } from "react";
import {
  createStaff,
  deleteStaff,
  listStaff,
  sendStaffPasswordReset,
  setStaffActive,
  updateStaff,
  type Staff,
} from "../../service/staffService";
import {
  ALL_PERMISSIONS,
  BASIC_ACCESS,
  DASHBOARD_OPTIONS,
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
  ROLES,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
  hasPermission,
  permissionsFor,
  summarizeAccess,
  togglePermission,
  type Permission,
  type Role,
} from "../../utils/types/staffRoles";
import {
  Badge,
  Btn,
  Card,
  Label,
  Modal,
  Notice,
  errMsg,
  inputCls,
  money,
  useLoad,
} from "../admin/Modal/Ui";
import DeleteConfirmModal from "./Modal/DeleteConfirmModal";
import StaffView from "./Modal/StaffView";

import { uploadFile } from "../../utils/uploadFile";
import {
  ID_PROOF_LABELS,
  ID_PROOF_TYPES,
  maskId,
  validateIdNumber,
  type IdProofType,
} from "../../utils/types/staffId";

const Th = ({ children }: { children?: React.ReactNode }) => (
  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500">
    {children}
  </th>
);

const isValidRole = (role: unknown): role is Role =>
  typeof role === "string" && role in ROLE_PERMISSIONS;

const sameSet = (a: Permission[], b: Permission[]) =>
  a.length === b.length && a.every((x) => b.includes(x));

const MAX_MB = 5;

/** 16px text on phones stops iOS Safari zooming into a field when it is tapped */
const fieldCls = `${inputCls} !text-base sm:!text-sm`;

/* ───────────── File picker with preview ───────────── */
const FilePick = ({
  label,
  existingUrl,
  file,
  onChange,
  onError,
}: {
  label: string;
  existingUrl?: string;
  file: File | null;
  onChange: (f: File | null) => void;
  onError: (m: string) => void;
}) => {
  const [preview, setPreview] = useState("");

  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const shown = preview || existingUrl || "";
  const isPdf =
    file?.type === "application/pdf" ||
    (!file && !!existingUrl && existingUrl.toLowerCase().endsWith(".pdf"));

  return (
    <div className="space-y-2">
      <p className="text-xs text-zinc-400">{label}</p>
      <div className="flex items-center gap-3">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/5 flex items-center justify-center text-[10px] text-zinc-500">
          {shown && !isPdf ? (
            <img
              src={shown}
              alt={label}
              className="h-full w-full object-cover"
            />
          ) : isPdf ? (
            "PDF"
          ) : (
            "None"
          )}
        </div>
        {/* min-w-0 lets the file name shrink instead of pushing the form wider than the screen */}
        <input
          type="file"
          aria-label={label}
          accept="image/*,application/pdf"
          className="min-w-0 flex-1 text-xs text-zinc-300 file:mr-3 file:min-h-10 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-xs file:text-white sm:file:min-h-0"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            if (
              f &&
              !(f.type.startsWith("image/") || f.type === "application/pdf")
            ) {
              e.target.value = "";
              return onError("Only images or PDF files are allowed.");
            }
            if (f && f.size > MAX_MB * 1024 * 1024) {
              e.target.value = "";
              return onError(`File must be under ${MAX_MB} MB.`);
            }
            onChange(f);
          }}
        />
      </div>
    </div>
  );
};

/* ───────────── Add / Edit modal ───────────── */
const StaffModal = ({
  staff,
  canSetAccess,
  onClose,
  onSaved,
}: {
  staff?: Staff; // present = edit mode
  canSetAccess: boolean; // false = access sections hidden, role default is used
  onClose: () => void;
  onSaved: (msg: string) => void;
}) => {
  const editing = !!staff;
  const startRole: Role =
    staff && isValidRole(staff.role) ? staff.role : "designer";

  const [form, setForm] = useState({
    name: staff?.name ?? "",
    email: staff?.email ?? "",
    phone: staff?.phone ?? "",
    role: startRole,
    salary: staff ? String(staff.salary) : "",
    password: "",
    idProofType: (staff?.idProofType || "aadhaar") as IdProofType,
    idProofNumber: staff?.idProofNumber ?? "",
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);

  const [custom, setCustom] = useState(!!staff?.permissions);
  const [perms, setPerms] = useState<Permission[]>(
    staff?.permissions ?? ROLE_PERMISSIONS[startRole],
  );
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [err, setErr] = useState("");

  // what this person will actually get right now
  const effective = custom ? perms : ROLE_PERMISSIONS[form.role];

  const toggleCustom = (on: boolean) => {
    setCustom(on);
    if (on) setPerms(permissionsFor(form.role, null));
  };

  // ticking "manage" also ticks "view"; unticking "view" also unticks "manage"
  const togglePerm = (p: Permission) =>
    setPerms((cur) => togglePermission(cur, p));

  // tick / untick a whole module
  const setGroup = (items: Permission[], on: boolean) =>
    setPerms((cur) =>
      on
        ? Array.from(new Set([...cur, ...items]))
        : cur.filter((x) => !items.includes(x)),
    );

  // dashboard cards: switch one on or off. If the result matches the role's
  // default, stay on defaults; otherwise this person gets custom access.
  const toggleDashboard = (p: Permission) => {
    const next = togglePermission(effective, p);
    setPerms(next);
    setCustom(!sameSet(next, ROLE_PERMISSIONS[form.role]));
  };

  // step 1: validate, then ask for confirmation
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!form.name.trim()) return setErr("Name is required.");
    if (!editing) {
      if (!form.email.trim()) return setErr("Email is required.");
      if (form.password.length < 6)
        return setErr("Password must be at least 6 characters.");
    }
    if (!form.phone.trim()) return setErr("Phone number is required.");

    const idErr = validateIdNumber(form.idProofType, form.idProofNumber);
    if (idErr) return setErr(idErr);
    if (!frontFile && !staff?.idProofFrontUrl)
      return setErr("Upload the front side of the ID proof.");

    setConfirmOpen(true);
  };

  // step 2: runs only after the person confirms
  const doSave = async () => {
    const permissions = canSetAccess && custom ? perms : null;
    setSaving(true);
    try {
      const photoUrl = photoFile
        ? await uploadFile(photoFile)
        : (staff?.photoUrl ?? "");
      const idProofFrontUrl = frontFile
        ? await uploadFile(frontFile)
        : (staff?.idProofFrontUrl ?? "");
      const idProofBackUrl = backFile
        ? await uploadFile(backFile)
        : (staff?.idProofBackUrl ?? "");

      const extras = {
        photoUrl,
        idProofType: form.idProofType,
        idProofNumber: form.idProofNumber.replace(/\s+/g, ""),
        idProofFrontUrl,
        idProofBackUrl,
      };

      if (editing) {
        await updateStaff(staff!.uid, {
          name: form.name,
          phone: form.phone,
          role: form.role,
          salary: Number(form.salary) || 0,
          permissions,
          ...extras,
        });
        onSaved("Staff updated.");
      } else {
        await createStaff({
          ...form,
          salary: Number(form.salary) || 0,
          permissions,
          ...extras,
        });
        onSaved("Staff account created.");
      }
      onClose();
    } catch (e2: any) {
      setErr(
        e2?.code === "auth/email-already-in-use"
          ? "An account with this email already exists."
          : errMsg(e2),
      );
      setConfirmOpen(false); // go back to the form so the error is visible
    } finally {
      setSaving(false);
    }
  };

  const presets: { label: string; list: Permission[] }[] = [
    { label: "Basic staff", list: BASIC_ACCESS },
    {
      label: `${ROLE_LABELS[form.role]} default`,
      list: ROLE_PERMISSIONS[form.role],
    },
    { label: "Full access", list: ALL_PERMISSIONS },
    { label: "Clear all", list: [] },
  ];

  // checkbox rows: a comfortable tap height on phones
  const checkRow = "flex min-h-9 cursor-pointer items-center gap-2.5 sm:min-h-0";
  const checkBox = "h-[18px] w-[18px] shrink-0 accent-violet-500 sm:h-4 sm:w-4";

  return (
    <>
      <Modal title={editing ? "Edit staff" : "Add staff"} onClose={onClose}>
        <form onSubmit={submit} className="min-w-0 space-y-4">
          <FilePick
            label="Staff photo"
            existingUrl={staff?.photoUrl}
            file={photoFile}
            onChange={setPhotoFile}
            onError={setErr}
          />

          <Label text="Full name">
            <input
              className={fieldCls}
              autoComplete="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Label>

          <Label text="Email (login)">
            <input
              type="email"
              inputMode="email"
              autoCapitalize="none"
              className={`${fieldCls} ${editing ? "opacity-60" : ""}`}
              value={form.email}
              disabled={editing}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Label>

          <Label text="Phone">
            <input
              type="tel"
              inputMode="tel"
              className={fieldCls}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Label text="Role">
              <select
                className={fieldCls}
                value={form.role}
                onChange={(e) =>
                  setForm({ ...form, role: e.target.value as Role })
                }
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </Label>
            <Label text="Monthly salary (₹)">
              <input
                type="number"
                inputMode="decimal"
                min={0}
                className={fieldCls}
                value={form.salary}
                onChange={(e) => setForm({ ...form, salary: e.target.value })}
              />
            </Label>
          </div>

          {!editing && (
            <Label text="Temporary password">
              <input
                type="text"
                autoCapitalize="none"
                className={fieldCls}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </Label>
          )}

          {/* ── ID proof ── */}
          <div className="space-y-3 rounded-xl border border-white/10 p-3 sm:p-4">
            <p className="text-sm font-medium">ID proof</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Label text="Proof type">
                <select
                  className={fieldCls}
                  value={form.idProofType}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      idProofType: e.target.value as IdProofType,
                    })
                  }
                >
                  {ID_PROOF_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {ID_PROOF_LABELS[t]}
                    </option>
                  ))}
                </select>
              </Label>
              <Label text="ID number">
                <input
                  className={fieldCls}
                  autoCapitalize="characters"
                  value={form.idProofNumber}
                  onChange={(e) =>
                    setForm({ ...form, idProofNumber: e.target.value })
                  }
                />
              </Label>
            </div>
            <FilePick
              label="Proof – front"
              existingUrl={staff?.idProofFrontUrl}
              file={frontFile}
              onChange={setFrontFile}
              onError={setErr}
            />
            <FilePick
              label="Proof – back (optional)"
              existingUrl={staff?.idProofBackUrl}
              file={backFile}
              onChange={setBackFile}
              onError={setErr}
            />
          </div>

          {/* ── Dashboard access (only people who can manage staff) ── */}
          {canSetAccess && (
            <div className="space-y-3 rounded-xl border border-white/10 p-3 sm:p-4">
              <div>
                <p className="text-sm font-medium">Dashboard access</p>
                <p className="text-xs text-zinc-500">
                  Which dashboard should this person see? Everyone gets the
                  standard staff dashboard (check in, own work, own
                  attendance). A management dashboard replaces the personal
                  work and attendance cards.
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                {DASHBOARD_OPTIONS.map((o) => {
                  const on = effective.includes(o.perm);
                  return (
                    <button
                      key={o.perm}
                      type="button"
                      onClick={() => toggleDashboard(o.perm)}
                      aria-pressed={on}
                      className={`min-h-14 rounded-xl border p-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 ${
                        on
                          ? "border-violet-500/60 bg-violet-500/10"
                          : "border-white/10 hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`text-sm font-medium ${
                            on ? "text-violet-200" : "text-zinc-200"
                          }`}
                        >
                          {o.title}
                        </p>
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
                            on
                              ? "border-violet-400 bg-violet-500 text-white"
                              : "border-white/20 text-transparent"
                          }`}
                        >
                          ✓
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] leading-snug text-zinc-500">
                        {o.desc}
                      </p>
                    </button>
                  );
                })}
              </div>

              {!DASHBOARD_OPTIONS.some((o) => effective.includes(o.perm)) && (
                <p className="text-[11px] text-zinc-500">
                  None selected: this person sees the standard staff dashboard.
                </p>
              )}
            </div>
          )}

          {/* ── Access (only people who can manage staff) ── */}
          {canSetAccess && (
            <div className="space-y-3 rounded-xl border border-white/10 p-3 sm:p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Access</p>
                  <p className="text-xs text-zinc-500">
                    {custom
                      ? "Custom access for this person"
                      : "Using the role's default access"}
                  </p>
                </div>
                <label className="flex min-h-10 shrink-0 cursor-pointer items-center gap-2 text-xs text-zinc-300">
                  <input
                    type="checkbox"
                    className={checkBox}
                    checked={custom}
                    onChange={(e) => toggleCustom(e.target.checked)}
                  />
                  Customize
                </label>
              </div>

              {custom ? (
                <div className="space-y-3">
                  {/* presets */}
                  <div className="flex flex-wrap gap-2 text-xs">
                    {presets.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        className="min-h-10 rounded-md border border-white/10 px-3 text-zinc-300 transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 sm:min-h-0 sm:px-2.5 sm:py-1"
                        onClick={() => setPerms([...p.list])}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  {/* grouped by module */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    {PERMISSION_GROUPS.map((g) => {
                      const allOn = g.items.every((i) => perms.includes(i));
                      return (
                        <div
                          key={g.id}
                          className="space-y-0.5 rounded-lg border border-white/10 p-3 sm:space-y-1.5"
                        >
                          <label
                            className={`${checkRow} text-sm font-medium`}
                          >
                            <input
                              type="checkbox"
                              className={checkBox}
                              checked={allOn}
                              onChange={(e) =>
                                setGroup(g.items, e.target.checked)
                              }
                            />
                            {g.label}
                          </label>
                          {g.items.map((p) => (
                            <label
                              key={p}
                              className={`${checkRow} pl-5 text-xs text-zinc-300`}
                            >
                              <input
                                type="checkbox"
                                className={checkBox}
                                checked={perms.includes(p)}
                                onChange={() => togglePerm(p)}
                              />
                              {PERMISSION_LABELS[p]}
                            </label>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {summarizeAccess(ROLE_PERMISSIONS[form.role]).map((x) => (
                    <Badge key={x.id} tone="sky">
                      {x.label}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          <Notice message={err} />
          <Btn type="submit" disabled={saving} className="min-h-11 w-full">
            {editing ? "Save changes" : "Create account"}
          </Btn>
        </form>
      </Modal>

      {confirmOpen && (
        <DeleteConfirmModal
          variant="primary"
          title={editing ? "Save changes?" : "Create this staff account?"}
          message={
            editing
              ? `The details for ${form.name.trim()} will be updated.`
              : `A login account will be created for ${form.email.trim()}.`
          }
          confirmLabel={editing ? "Yes, save" : "Yes, create"}
          loadingLabel={editing ? "Saving..." : "Creating..."}
          loading={saving}
          onClose={() => setConfirmOpen(false)}
          onConfirm={doSave}
        />
      )}
    </>
  );
};

/* ───────────── Page ───────────── */
type Me = { role?: Role; permissions?: Permission[] | null } | null;

/**
 * me: the logged-in user's staff profile.
 *  - undefined (not passed) = admin, full access
 *  - null = not loaded / no profile, no access
 */
const StaffManagement = ({ me }: { me?: Me }) => {
  const allow = (p: Permission) => me === undefined || hasPermission(me, p);
  const canManage = allow("staff.manage"); // edit, delete, enable/disable, reset, set access
  const canCreate = allow("staff.create") || canManage;

  const staff = useLoad(() => listStaff(), [], [] as Staff[]);
  const [modal, setModal] = useState<{ staff?: Staff } | null>(null);
  const [viewUid, setViewUid] = useState<string | null>(null); // set = full staff page is open
  const [deleteTarget, setDeleteTarget] = useState<Staff | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  // always the latest copy, so the page refreshes after an edit
  const viewed = viewUid
    ? (staff.data.find((s) => s.uid === viewUid) ?? null)
    : null;

  const guard = async (fn: () => Promise<void>, ok = "") => {
    setErr("");
    setInfo("");
    try {
      await fn();
      if (ok) setInfo(ok);
      staff.reload();
    } catch (e) {
      setErr(errMsg(e));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await guard(
      () => deleteStaff(deleteTarget.uid),
      `${deleteTarget.name} deleted.`,
    );
    setDeleting(false);
    setDeleteTarget(null);
  };

  /* pieces shared by the phone cards and the desktop table */

  const avatar = (s: Staff) =>
    s.photoUrl ? (
      <img
        src={s.photoUrl}
        alt={s.name}
        className="h-10 w-10 shrink-0 rounded-full object-cover sm:h-9 sm:w-9"
      />
    ) : (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs sm:h-9 sm:w-9">
        {s.name.charAt(0).toUpperCase()}
      </div>
    );

  const accessBadges = (s: Staff, perms: Permission[]) => (
    <div className="flex max-w-[280px] flex-wrap gap-1 lg:max-w-[280px]">
      {s.permissions && <Badge tone="amber">Custom</Badge>}
      {summarizeAccess(perms).map((x) => (
        <span
          key={x.id}
          title={x.on.map((p) => PERMISSION_LABELS[p]).join(", ")}
        >
          <Badge tone="sky">
            {x.label} {x.on.length}/{x.total}
          </Badge>
        </span>
      ))}
      {!perms.length && (
        <span className="text-xs text-zinc-500">No access</span>
      )}
    </div>
  );

  const idProof = (s: Staff) =>
    s.idProofType ? (
      <>
        <p>{ID_PROOF_LABELS[s.idProofType]}</p>
        <p className="text-zinc-500">{maskId(s.idProofNumber)}</p>
        {s.idProofFrontUrl && (
          <a
            href={s.idProofFrontUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-block py-1 text-sky-300 hover:underline"
          >
            View
          </a>
        )}
      </>
    ) : (
      <span className="text-zinc-500">—</span>
    );

  return (
    <div className="min-w-0 space-y-4 sm:space-y-5">
      {viewed ? (
        /* ── full staff page ── */
        <StaffView
          staff={viewed}
          onBack={() => setViewUid(null)}
          onEdit={() => canManage && setModal({ staff: viewed })}
        />
      ) : (
        /* ── staff list ── */
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-white sm:text-xl">
                Staff Management
              </h2>
              <p className="text-xs text-zinc-500 sm:text-sm">
                {staff.data.length} staff members
              </p>
            </div>
            {canCreate && (
              <Btn
                className="min-h-11 w-full sm:min-h-0 sm:w-auto"
                onClick={() => setModal({})}
              >
                Add staff
              </Btn>
            )}
          </div>

          <Notice message={err || staff.error} />
          {info && (
            <p role="status" className="break-words text-sm text-emerald-400">
              {info}
            </p>
          )}

          {/* ── phones and tablets: one card per person ── */}
          <div className="space-y-3 lg:hidden">
            {staff.data.map((s) => {
              const validRole = isValidRole(s.role);
              const perms = permissionsFor(
                validRole ? s.role : undefined,
                s.permissions,
              );

              return (
                <Card
                  key={s.uid}
                  className={`min-w-0 space-y-3 p-4 ${s.active ? "" : "opacity-60"}`}
                >
                  <div className="flex items-start gap-3">
                    {avatar(s)}
                    <div className="min-w-0 flex-1">
                      <p className="break-words font-medium text-white">
                        {s.name}
                      </p>
                      <p className="break-all text-xs text-zinc-500">
                        {s.email}
                      </p>
                      <p className="text-xs text-zinc-500">{s.phone}</p>
                    </div>
                    <span className="shrink-0">
                      <Badge tone={s.active ? "emerald" : "red"}>
                        {s.active ? "Active" : "Disabled"}
                      </Badge>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 border-t border-white/5 pt-3 text-sm">
                    <div className="min-w-0">
                      <p className="text-[11px] text-zinc-500">Role</p>
                      <div className="mt-0.5 break-words text-zinc-200">
                        {validRole ? (
                          ROLE_LABELS[s.role]
                        ) : (
                          <Badge tone="red">No valid role</Badge>
                        )}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-zinc-500">Salary</p>
                      <p className="mt-0.5 break-words text-zinc-200">
                        {money(s.salary)}
                      </p>
                    </div>
                    <div className="col-span-2 min-w-0 text-xs">
                      <p className="mb-0.5 text-[11px] text-zinc-500">
                        ID proof
                      </p>
                      {idProof(s)}
                    </div>
                    <div className="col-span-2 min-w-0">
                      <p className="mb-1 text-[11px] text-zinc-500">Access</p>
                      {accessBadges(s, perms)}
                    </div>
                  </div>

                  {/* big, easy-to-tap buttons, two per row */}
                  <div className="grid grid-cols-2 gap-2 border-t border-white/5 pt-3">
                    <Btn
                      variant="ghost"
                      className={`min-h-11 w-full ${canManage ? "" : "col-span-2"}`}
                      onClick={() => setViewUid(s.uid)}
                    >
                      View
                    </Btn>
                    {canManage && (
                      <>
                        <Btn
                          variant="ghost"
                          className="min-h-11 w-full"
                          onClick={() => setModal({ staff: s })}
                        >
                          Edit
                        </Btn>
                        <Btn
                          variant="ghost"
                          className="min-h-11 w-full"
                          onClick={() =>
                            guard(
                              () => sendStaffPasswordReset(s.email),
                              `Reset email sent to ${s.email}`,
                            )
                          }
                        >
                          Reset password
                        </Btn>
                        <Btn
                          variant={s.active ? "danger" : "ghost"}
                          className="min-h-11 w-full"
                          onClick={() =>
                            guard(() => setStaffActive(s.uid, !s.active))
                          }
                        >
                          {s.active ? "Disable" : "Enable"}
                        </Btn>
                        <Btn
                          variant="danger"
                          className="col-span-2 min-h-11 w-full"
                          onClick={() => setDeleteTarget(s)}
                        >
                          Delete
                        </Btn>
                      </>
                    )}
                  </div>
                </Card>
              );
            })}

            {!staff.data.length && (
              <Card className="p-6 text-center text-sm text-zinc-500">
                {staff.loading ? "Loading…" : "No staff yet."}
              </Card>
            )}
          </div>

          {/* ── large screens: the table ── */}
          <Card className="hidden overflow-x-auto lg:block">
            <table className="w-full text-sm">
              <thead className="border-b border-white/5">
                <tr>
                  <Th>Name</Th>
                  <Th>Role</Th>
                  <Th>ID proof</Th>
                  <Th>Access</Th>
                  <Th>Salary</Th>
                  <Th>Status</Th>
                  <Th />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {staff.data.map((s) => {
                  const validRole = isValidRole(s.role);
                  const perms = permissionsFor(
                    validRole ? s.role : undefined,
                    s.permissions,
                  );

                  return (
                    <tr key={s.uid} className={s.active ? "" : "opacity-50"}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {avatar(s)}
                          <div>
                            <p className="font-medium">{s.name}</p>
                            <p className="text-xs text-zinc-500">{s.email}</p>
                            <p className="text-xs text-zinc-500">{s.phone}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {validRole ? (
                          ROLE_LABELS[s.role]
                        ) : (
                          <Badge tone="red">No valid role</Badge>
                        )}
                      </td>

                      <td className="px-4 py-3 text-xs">{idProof(s)}</td>

                      <td className="px-4 py-3">{accessBadges(s, perms)}</td>

                      <td className="px-4 py-3">{money(s.salary)}</td>

                      <td className="px-4 py-3">
                        <Badge tone={s.active ? "emerald" : "red"}>
                          {s.active ? "Active" : "Disabled"}
                        </Badge>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Btn
                            variant="ghost"
                            onClick={() => setViewUid(s.uid)}
                          >
                            View
                          </Btn>
                          {canManage && (
                            <>
                              <Btn
                                variant="ghost"
                                onClick={() => setModal({ staff: s })}
                              >
                                Edit
                              </Btn>
                              <Btn
                                variant="ghost"
                                onClick={() =>
                                  guard(
                                    () => sendStaffPasswordReset(s.email),
                                    `Reset email sent to ${s.email}`,
                                  )
                                }
                              >
                                Reset password
                              </Btn>
                              <Btn
                                variant={s.active ? "danger" : "ghost"}
                                onClick={() =>
                                  guard(() => setStaffActive(s.uid, !s.active))
                                }
                              >
                                {s.active ? "Disable" : "Enable"}
                              </Btn>
                              <Btn
                                variant="danger"
                                onClick={() => setDeleteTarget(s)}
                              >
                                Delete
                              </Btn>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {!staff.data.length && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-6 text-center text-zinc-500"
                    >
                      {staff.loading ? "Loading…" : "No staff yet."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {/* edit works from both the list and the full staff page */}
      {modal && (
        <StaffModal
          key={modal.staff?.uid ?? "new"}
          staff={modal.staff}
          canSetAccess={canManage}
          onClose={() => setModal(null)}
          onSaved={(msg) => {
            setInfo(msg);
            staff.reload();
          }}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          title="Delete this staff member?"
          message={`${deleteTarget.name} will lose their staff profile and access. This action cannot be undone.`}
          loading={deleting}
          onClose={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
};

export default StaffManagement;