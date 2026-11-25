import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import type { User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../config/firebase/firebase";
import {
  AuthShell,
  Field,
  ErrorBanner,
  InfoBanner,
  ArrowButton,
  OrDivider,
  GoogleButton,
} from "../../components/staff/AuthShell";

// Flip to true once Google sign-in is enabled in Firebase Auth
const SHOW_GOOGLE = false;

type FormErrors = { email?: string; password?: string; general?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MESSAGES: Record<string, string> = {
  "auth/user-not-found": "No account found with this email.",
  "auth/wrong-password": "Incorrect password. Please try again.",
  "auth/invalid-credential": "Invalid email or password.",
  "auth/too-many-requests": "Too many attempts. Try again later.",
  "auth/user-disabled": "This account has been disabled.",
  "auth/network-request-failed": "Network error. Check your connection.",
  "auth/popup-closed-by-user": "Google sign-in was cancelled.",
  "auth/popup-blocked": "Your browser blocked the Google pop-up. Allow pop-ups and try again.",
  "auth/account-exists-with-different-credential":
    "An account with this email already exists. Sign in with your password.",
};

const StaffLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // checked = stay signed in on this device (same as the old behaviour)
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<FormErrors>({});
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const navigate = useNavigate();

  /** Only accounts registered as staff may enter the staff area */
  const enterIfStaff = async (user: User) => {
    const snap = await getDoc(doc(db, "staff", user.uid));
    if (!snap.exists()) {
      await signOut(auth);
      setErrors({ general: "This account is not registered as staff." });
      return;
    }
    navigate("/staff");
  };

  const persistence = () =>
    // "Remember me" off = signed out when the browser tab is closed
    setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInfo("");

    const next: FormErrors = {};
    if (!email) next.email = "Email is required";
    else if (!EMAIL_RE.test(email)) next.email = "Enter a valid email address";
    if (!password) next.password = "Password is required";
    if (next.email || next.password) return setErrors(next);

    setErrors({});
    setLoading(true);
    try {
      await persistence();
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      await enterIfStaff(user);
    } catch (err) {
      const code = (err as { code?: string }).code ?? "";
      setErrors({
        general: MESSAGES[code] ?? "Something went wrong. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setInfo("");
    setErrors({});
    setGoogleLoading(true);
    try {
      await persistence();
      const { user } = await signInWithPopup(auth, new GoogleAuthProvider());
      await enterIfStaff(user);
    } catch (err) {
      const code = (err as { code?: string }).code ?? "";
      setErrors({
        general: MESSAGES[code] ?? "Google sign-in failed. Please try again.",
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleForgot = async () => {
    setInfo("");
    if (!email) return setErrors({ email: "Enter your email first, then tap Forgot password" });
    if (!EMAIL_RE.test(email)) return setErrors({ email: "Enter a valid email address" });

    setErrors({});
    setResetting(true);
    try {
      await sendPasswordResetEmail(auth, email);
      // same message whether or not the account exists, so emails can't be guessed
      setInfo("If an account exists for this email, a password reset link has been sent.");
    } catch (err) {
      const code = (err as { code?: string }).code ?? "";
      setErrors({
        general: MESSAGES[code] ?? "Could not send the reset email. Please try again.",
      });
    } finally {
      setResetting(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your account"
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link
            to="/staff/login"
            className="font-semibold text-emerald-300 underline-offset-4 hover:text-emerald-200 hover:underline"
          >
            Sign up
          </Link>
        </>
      }
    >
      <ErrorBanner message={errors.general} />
      <InfoBanner message={info} />

      <form onSubmit={handleSubmit} className="space-y-3" noValidate>
        <Field
          id="email"
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          placeholder="you@growvy.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
        <Field
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          trailing={<ArrowButton loading={loading} label="Sign in" />}
        />

        {/* remember me + forgot password */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[13px]">
          <label className="flex min-h-11 cursor-pointer select-none items-center gap-2.5 text-white/55">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-[18px] w-[18px] cursor-pointer rounded border-white/20 bg-white/5 accent-emerald-400"
            />
            Remember me
          </label>
          <button
            type="button"
            onClick={handleForgot}
            disabled={resetting}
            className="min-h-11 text-white/55 transition hover:text-white disabled:opacity-50"
          >
            {resetting ? "Sending…" : "Forgot password?"}
          </button>
        </div>
      </form>

      {SHOW_GOOGLE && (
        <>
          <OrDivider />
          <GoogleButton onClick={handleGoogle} loading={googleLoading} />
        </>
      )}
    </AuthShell>
  );
};

export default StaffLogin;