import React, { useState } from "react";
import logo from "../../../public/img/logo-1.png";

type ShellProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

/**
 * Shared layout used by StaffLogin and StaffRegister.
 * Near-black page with a soft spotlight, and a frosted glass card with a
 * green/blue glow on its top-left edge. Works from 320px phones up to desktop.
 */
export const AuthShell: React.FC<ShellProps> = ({
  title,
  subtitle,
  children,
  footer,
}) => (
  <div className="relative flex min-h-screen min-h-[100dvh] overflow-x-hidden bg-[#0a0b0f] pb-[max(1.5rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(1.5rem,env(safe-area-inset-top))] sm:pb-12 sm:pt-12">
    {/* background: a soft spotlight falling from the top */}
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(255,255,255,0.10),transparent_70%)]" />
      <div className="absolute left-1/2 top-0 h-[60vmin] w-[2px] -translate-x-1/2 bg-gradient-to-b from-white/20 to-transparent blur-sm" />
    </div>

    {/* card */}
    <div className="relative z-10 m-auto w-full max-w-[420px]">
      {/* edge: bright at the top left, fading out towards the bottom */}
      <div className="rounded-[28px] bg-gradient-to-br from-white/45 via-white/10 to-white/[0.02] p-px shadow-2xl shadow-black/70">
        <div className="relative overflow-hidden rounded-[27px] bg-gradient-to-b from-[#16181d]/95 via-[#101217]/90 to-[#0c0d11]/80 backdrop-blur-2xl">
          {/* coloured glow in the top-left corner */}
          <div className="pointer-events-none absolute -left-8 -top-10 h-28 w-52 rounded-full bg-gradient-to-r from-blue-400/50 via-emerald-400/40 to-transparent blur-2xl" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-white/60 via-white/10 to-transparent" />

          <div className="relative px-4 pb-6 pt-8 min-[380px]:px-6 sm:px-8 sm:pb-9 sm:pt-11">
            <div className="mb-6 flex flex-col sm:mb-8 items-center text-center">
              <img
                src={logo}
                alt="Logo"
                className="mb-3 h-9 w-9 object-contain sm:mb-4 sm:h-11 sm:w-11"
              />
              <h1 className="break-words bg-gradient-to-b from-white to-white/65 bg-clip-text text-2xl font-semibold tracking-tight text-transparent min-[380px]:text-3xl sm:text-[34px]">
                {title}
              </h1>
              <p className="mt-2 text-sm text-white/40">{subtitle}</p>
            </div>

            {children}

            {footer && (
              <div className="mt-6 text-center text-[13px] text-white/45 sm:mt-8">
                {footer}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
);

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  /** Optional element on the right inside the field, e.g. the round arrow button */
  trailing?: React.ReactNode;
};

/** Label sits inside the field. Password fields get a Show / Hide toggle. */
export const Field: React.FC<FieldProps> = ({
  label,
  error,
  id,
  type,
  trailing,
  ...props
}) => {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";

  return (
    <div className="space-y-1.5">
      <div
        className={[
          "flex min-h-[60px] items-center gap-1.5 rounded-[20px] border bg-white/[0.035] py-2 pl-3.5 pr-2.5 sm:min-h-[62px] sm:gap-2 sm:rounded-[22px] sm:pl-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-200 focus-within:ring-2",
          error
            ? "border-red-500/60 focus-within:border-red-500 focus-within:ring-red-500/20"
            : "border-white/10 hover:border-white/20 focus-within:border-emerald-300/60 focus-within:ring-emerald-300/15",
        ].join(" ")}
      >
        <div className="min-w-0 flex-1">
          <label htmlFor={id} className="block text-[11px] font-medium text-white/40">
            {label}
          </label>
          {/* text-base on phones stops iOS Safari zooming the page on focus */}
          <input
            id={id}
            type={isPassword && show ? "text" : type}
            aria-invalid={error ? true : undefined}
            aria-describedby={error && id ? `${id}-error` : undefined}
            {...props}
            className="w-full bg-transparent text-base text-white caret-emerald-300 outline-none placeholder:text-white/25 sm:text-sm"
          />
        </div>

        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
            aria-pressed={show}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/50 transition hover:bg-white/5 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-[18px] w-[18px]"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {show ? (
                <>
                  <path d="M3 3l18 18" />
                  <path d="M10.6 5.1A10.7 10.7 0 0 1 12 5c6 0 9.5 7 9.5 7a15.6 15.6 0 0 1-3.2 3.9M6.6 6.6A15.5 15.5 0 0 0 2.5 12S6 19 12 19a9.8 9.8 0 0 0 4.3-1" />
                  <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
                </>
              ) : (
                <>
                  <path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7S2.5 12 2.5 12z" />
                  <circle cx="12" cy="12" r="3" />
                </>
              )}
            </svg>
          </button>
        )}

        {trailing}
      </div>

      {error && (
        <p id={id ? `${id}-error` : undefined} className="pl-1 text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
};

export const ErrorBanner: React.FC<{ message?: string }> = ({ message }) =>
  message ? (
    <div
      role="alert"
      className="mb-5 break-words rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
    >
      {message}
    </div>
  ) : null;

/** Green confirmation message, e.g. "reset link sent". */
export const InfoBanner: React.FC<{ message?: string }> = ({ message }) =>
  message ? (
    <div
      role="status"
      className="mb-5 break-words rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
    >
      {message}
    </div>
  ) : null;

const ArrowIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className="h-4 w-4"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.25}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

const Spinner = () => (
  <span
    className="h-4 w-4 animate-spin motion-reduce:animate-none rounded-full border-2 border-zinc-900/30 border-t-zinc-900"
    aria-hidden="true"
  />
);

/** Round green-teal submit button that sits inside a Field (the main action). */
export const ArrowButton: React.FC<{ loading: boolean; label: string }> = ({
  loading,
  label,
}) => (
  <button
    type="submit"
    disabled={loading}
    aria-label={label}
    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-300 to-cyan-400 text-zinc-900 shadow-[0_0_22px_rgba(52,211,153,0.45)] transition hover:brightness-110 active:scale-95
    focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1116]
    disabled:cursor-not-allowed disabled:opacity-70 disabled:active:scale-100"
  >
    {loading ? <Spinner /> : <ArrowIcon />}
  </button>
);

/** Full-width variant, used by the register form. */
export const SubmitButton: React.FC<{
  loading: boolean;
  label: string;
  loadingLabel: string;
}> = ({ loading, label, loadingLabel }) => (
  <button
    type="submit"
    disabled={loading}
    className="group flex min-h-[56px] w-full items-center justify-center gap-2 rounded-[20px] sm:rounded-[22px] bg-gradient-to-r from-emerald-300 to-cyan-400 px-6 py-3 text-sm font-semibold text-zinc-900
    shadow-[0_0_30px_rgba(52,211,153,0.25)] transition-all duration-200 hover:brightness-110 active:scale-[0.99]
    focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1116]
    disabled:cursor-not-allowed disabled:opacity-70 disabled:active:scale-100"
  >
    {loading ? (
      <>
        <Spinner />
        {loadingLabel}
      </>
    ) : (
      <>
        {label}
        <span className="transition-transform group-hover:translate-x-0.5">
          <ArrowIcon />
        </span>
      </>
    )}
  </button>
);

/** "OR" line between the form and the social buttons. */
export const OrDivider: React.FC = () => (
  <div className="my-4 flex items-center gap-4 sm:my-5" role="separator" aria-label="or">
    <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/15" />
    <span className="text-[11px] font-medium text-white/35" aria-hidden="true">
      OR
    </span>
    <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/15" />
  </div>
);

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.94H1.28v3.1A12 12 0 0 0 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.29 14.3A7.2 7.2 0 0 1 4.91 12c0-.8.14-1.57.38-2.3v-3.1H1.28A12 12 0 0 0 0 12c0 1.94.46 3.77 1.28 5.4l4.01-3.1z"
    />
    <path
      fill="#EA4335"
      d="M12 4.76c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.6l4.01 3.1C6.23 6.87 8.88 4.76 12 4.76z"
    />
  </svg>
);

/** "Continue with Google" row with a round arrow on the right. */
export const GoogleButton: React.FC<{
  onClick: () => void;
  loading?: boolean;
}> = ({ onClick, loading }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={loading}
    className="group flex min-h-[56px] w-full items-center gap-3 rounded-[20px] sm:rounded-[22px] border border-white/10 bg-white/[0.03] px-4 text-left text-sm text-white/70 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white
    focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60 disabled:cursor-not-allowed disabled:opacity-60"
  >
    <GoogleIcon />
    <span className="flex-1">{loading ? "Opening Google…" : "Continue with Google"}</span>
    <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/50 transition group-hover:text-white">
      <ArrowIcon />
    </span>
  </button>
);