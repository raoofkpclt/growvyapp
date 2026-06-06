import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../config/firebase/firebase.ts";
import logo from "../../assets/logo/logo-1.png";
import { useNavigate } from "react-router-dom";

type FormErrors = {
  email?: string;
  password?: string;
  general?: string;
};

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  const validateEmail = (value: string) => {
    if (!value) return "Email is required";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) return "Enter a valid email address";
    return "";
  };

  const validatePassword = (value: string) => {
    if (!value) return "Password is required";
    if (value.length < 6) return "Password must be at least 6 characters";
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);
    if (emailErr || passwordErr) {
      setErrors({ email: emailErr, password: passwordErr });
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // On success — redirect or handle as needed
      navigate("/admin");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      const messages: Record<string, string> = {
        "auth/user-not-found": "No account found with this email.",
        "auth/wrong-password": "Incorrect password. Please try again.",
        "auth/invalid-credential": "Invalid email or password.",
        "auth/too-many-requests": "Too many attempts. Try again later.",
        "auth/user-disabled": "This account has been disabled.",
        "auth/network-request-failed": "Network error. Check your connection.",
      };
      setErrors({
        general:
          messages[code ?? ""] ?? "Something went wrong. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const iconClass = (hasError: boolean) =>
    `w-5 h-5 transition-colors duration-200 ${hasError ? "text-red-400" : "text-white/30 group-focus-within:text-blue-400"}`;

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#0a0f1e]">
      {/* ── Animated Background ── */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d1b3e] via-[#0a0f1e] to-[#050810]" />
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-blue-600/20 blur-[120px] animate-pulse" />
        <div
          className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-orange-500/15 blur-[100px] animate-pulse"
          style={{ animationDelay: "1s" }}
        />
        <div
          className="absolute top-[40%] right-[10%] w-[300px] h-[300px] rounded-full bg-yellow-400/10 blur-[80px] animate-pulse"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(90deg, #3b82f6 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* ── Card ── */}
      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Glow ring */}
        <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-br from-blue-500 via-yellow-400/40 to-orange-500/60 opacity-60 blur-sm" />

        <div className="relative rounded-3xl bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl overflow-hidden">
          {/* Top gradient bar */}
          <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-yellow-400 to-orange-500" />

          <div className="px-8 pt-10 pb-0">
            {/* ── Brand ── */}
            <div className="flex flex-col items-center mb-10">
              <div className="relative w-16 h-16 mb-4">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/40" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <img
                    src={logo}
                    alt="Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

              <p className="mt-1 text-sm text-white/40 font-medium tracking-widest uppercase">
                Admin Portal
              </p>
            </div>

            {/* ── Error Banner ── */}
            {errors.general && (
              <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                <svg
                  className="w-5 h-5 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                  />
                </svg>
                <span>{errors.general}</span>
              </div>
            )}

            {/* ── Form ── */}
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {/* Email */}
              <div className="space-y-1">
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold text-white/60 uppercase tracking-widest"
                >
                  Email Address
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <svg
                      className={iconClass(!!errors.email)}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email)
                        setErrors((prev) => ({
                          ...prev,
                          email: validateEmail(e.target.value),
                        }));
                    }}
                    placeholder="admin@growvy.com"
                    className={[
                      "w-full pl-11 pr-4 py-3 rounded-xl text-sm text-white placeholder-white/25",
                      "bg-white/5 border transition-all duration-200 outline-none",
                      "focus:ring-2 focus:ring-offset-0",
                      errors.email
                        ? "border-red-500/60 focus:border-red-500 focus:ring-red-500/20"
                        : "border-white/10 focus:border-blue-500 focus:ring-blue-500/20 hover:border-white/20",
                    ].join(" ")}
                  />
                </div>
                {errors.email && (
                  <p className="flex items-center gap-1 text-xs text-red-400 pl-1 mt-1">
                    <svg
                      className="w-3 h-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-white/60 uppercase tracking-widest"
                >
                  Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <svg
                      className={iconClass(!!errors.password)}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password)
                        setErrors((prev) => ({
                          ...prev,
                          password: validatePassword(e.target.value),
                        }));
                    }}
                    placeholder="Enter your password"
                    className={[
                      "w-full pl-11 pr-12 py-3 rounded-xl text-sm text-white placeholder-white/25",
                      "bg-white/5 border transition-all duration-200 outline-none",
                      "focus:ring-2 focus:ring-offset-0",
                      errors.password
                        ? "border-red-500/60 focus:border-red-500 focus:ring-red-500/20"
                        : "border-white/10 focus:border-blue-500 focus:ring-blue-500/20 hover:border-white/20",
                    ].join(" ")}
                  />
                  <button
                    type="button"
                    id="toggle-password"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute inset-y-0 right-4 flex items-center text-white/30 hover:text-white/70 transition-colors duration-150"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="flex items-center gap-1 text-xs text-red-400 pl-1 mt-1">
                    <svg
                      className="w-3 h-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Forgot password */}
              <div className="flex justify-end">
                <button
                  id="forgot-password"
                  type="button"
                  className="text-xs text-blue-400 hover:text-yellow-400 transition-colors duration-150 font-medium"
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit */}
              <button
                id="login-submit"
                type="submit"
                disabled={loading}
                className={[
                  "relative w-full py-3 rounded-xl font-bold text-sm tracking-wide",
                  "overflow-hidden transition-all duration-200 group",
                  loading
                    ? "opacity-70 cursor-not-allowed"
                    : "hover:-translate-y-0.5 active:translate-y-0",
                ].join(" ")}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600" />
                {!loading && (
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background:
                        "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)",
                    }}
                  />
                )}
                <span className="relative flex items-center justify-center gap-2 text-white">
                  {loading ? (
                    <>
                      <svg
                        className="w-4 h-4 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Signing In...
                    </>
                  ) : (
                    <>
                      Sign In
                      <svg
                        className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-150"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M13 7l5 5m0 0l-5 5m5-5H6"
                        />
                      </svg>
                    </>
                  )}
                </span>
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="px-8 py-4 border-t border-white/5 bg-white/[0.02] flex items-center justify-center">
            <p className="text-xs text-white/20 text-center">
              {"\u00A9"} {new Date().getFullYear()} Growvy. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
