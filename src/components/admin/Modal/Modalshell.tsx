import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

/* =====================================================================
   Body scroll lock (ref-counted, so stacked modals work too)
   Use it directly in any older modal:  useBodyScrollLock(true);
   ===================================================================== */
let lockCount = 0;
let saved = { overflow: "", paddingRight: "" };

export const useBodyScrollLock = (active = true) => {
  useEffect(() => {
    if (!active) return;
    const body = document.body;

    if (lockCount === 0) {
      saved = {
        overflow: body.style.overflow,
        paddingRight: body.style.paddingRight,
      };
      const scrollbar =
        window.innerWidth - document.documentElement.clientWidth;
      body.style.overflow = "hidden";
      // stops the page jumping sideways when the scrollbar disappears
      if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
    }
    lockCount += 1;

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        body.style.overflow = saved.overflow;
        body.style.paddingRight = saved.paddingRight;
      }
    };
  }, [active]);
};

/* =====================================================================
   Shared footer button styles (full width on mobile, auto on desktop)
   ===================================================================== */
const btnBase =
  "w-full sm:w-auto px-5 py-2.5 sm:py-2 rounded-xl text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

export const modalBtn = {
  ghost: `${btnBase} text-zinc-300 border border-white/10 hover:text-white hover:border-white/20`,
  primary: `${btnBase} font-medium text-white bg-violet-600 hover:bg-violet-500`,
  danger: `${btnBase} font-medium text-white bg-red-600 hover:bg-red-500`,
};

/* =====================================================================
   Modal
   ===================================================================== */
type Size = "sm" | "md" | "lg" | "xl" | "2xl" | "4xl" | "6xl";

const SIZE: Record<Size, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-xl",
  "2xl": "sm:max-w-2xl",
  "4xl": "sm:max-w-4xl",
  "6xl": "sm:max-w-6xl",
};

interface ModalShellProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: Size;
  /** true while saving / deleting: blocks Esc, backdrop click and the X button */
  busy?: boolean;
  /** forms should pass false so a stray tap outside doesn't lose the data */
  closeOnBackdrop?: boolean;
}

let idCounter = 0;

const ModalShell: React.FC<ModalShellProps> = ({
  title,
  subtitle,
  onClose,
  children,
  footer,
  size = "lg",
  busy = false,
  closeOnBackdrop = true,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useRef(`modal-title-${++idCounter}`).current;

  // always read the latest values inside the key handler
  const onCloseRef = useRef(onClose);
  const busyRef = useRef(busy);
  onCloseRef.current = onClose;
  busyRef.current = busy;

  useBodyScrollLock(true);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    // move focus into the dialog (unless a field inside already has it)
    if (!dialogRef.current?.contains(document.activeElement)) {
      dialogRef.current?.focus();
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busyRef.current) onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
      previouslyFocused?.focus?.();
    };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6"
      role="presentation"
    >
      <style>{`
        @keyframes modal-backdrop-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modal-panel-in {
          from { opacity: 0; transform: translateY(14px) scale(0.98); }
          to   { opacity: 1; transform: none; }
        }
        .modal-backdrop { animation: modal-backdrop-in 0.18s ease; }
        .modal-panel { animation: modal-panel-in 0.22s cubic-bezier(0.16, 1, 0.3, 1); }
        @media (prefers-reduced-motion: reduce) {
          .modal-backdrop, .modal-panel { animation: none; }
        }
      `}</style>

      {/* backdrop */}
      <div
        className="modal-backdrop absolute inset-0 bg-black/70 backdrop-blur-sm"
        onMouseDown={(e) => {
          if (closeOnBackdrop && !busy && e.target === e.currentTarget) {
            onClose();
          }
        }}
      />

      {/* panel */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`modal-panel relative flex flex-col w-full ${SIZE[size]} max-h-full bg-[#0f1117] border border-white/10 rounded-2xl shadow-2xl shadow-black/60 outline-none overflow-hidden`}
      >
        {/* header */}
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-white/5 flex-shrink-0">
          <div className="min-w-0">
            <h3
              id={titleId}
              className="text-white font-semibold text-base leading-tight"
            >
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-zinc-500 mt-1">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="-mr-1.5 -mt-1 w-9 h-9 flex items-center justify-center rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-40 flex-shrink-0"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* body (scrolls inside the modal, never the page) */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4">
          {children}
        </div>

        {/* footer */}
        {footer && (
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 px-5 py-3.5 border-t border-white/5 bg-white/[0.02] flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};

export default ModalShell;