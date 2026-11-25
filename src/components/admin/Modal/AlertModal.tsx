import React, { useEffect } from "react";

export type AlertState = {
  type: "success" | "error" | "warning";
  title: string;
  message?: string;
} | null;

type AlertType = "success" | "error" | "warning";

interface AlertModalProps {
  type?: AlertType;
  title: string;
  message?: string;
  buttonText?: string;
  onClose: () => void;
}

const styles: Record<
  AlertType,
  { ring: string; icon: string; btn: string; glyph: React.ReactNode }
> = {
  success: {
    ring: "bg-emerald-500/10 border-emerald-500/20",
    icon: "text-emerald-400",
    btn: "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 shadow-emerald-900/30",
    glyph: <path d="m5 13 4 4L19 7" />,
  },
  error: {
    ring: "bg-red-500/10 border-red-500/20",
    icon: "text-red-400",
    btn: "bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 shadow-red-900/30",
    glyph: <path d="M6 6l12 12M18 6 6 18" />,
  },
  warning: {
    ring: "bg-amber-500/10 border-amber-500/20",
    icon: "text-amber-400",
    btn: "bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 shadow-violet-900/30",
    glyph: <path d="M12 8v5M12 17h.01" />,
  },
};

const AlertModal: React.FC<AlertModalProps> = ({
  type = "warning",
  title,
  message,
  buttonText = "OK",
  onClose,
}) => {
  const s = styles[type];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-[#0f1117] border border-white/5 rounded-2xl p-6 text-center shadow-2xl"
        role="alertdialog"
        aria-modal="true"
      >
        <div
          className={`mx-auto mb-4 w-14 h-14 rounded-full border flex items-center justify-center ${s.ring} ${s.icon}`}
        >
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {type === "warning" && <circle cx="12" cy="12" r="9" />}
            {s.glyph}
          </svg>
        </div>

        <h3 className="text-white font-semibold text-lg">{title}</h3>
        {message && <p className="text-sm text-zinc-400 mt-1.5">{message}</p>}

        <button
          autoFocus
          onClick={onClose}
          className={`mt-6 w-full py-2.5 rounded-xl text-white text-sm font-medium shadow-lg transition-all ${s.btn}`}
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
};

export default AlertModal;