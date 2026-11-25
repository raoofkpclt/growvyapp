// import React from "react";
// import ModalShell, { modalBtn } from "./Modalshell";

// interface Props {
//   loading?: boolean;
//   title?: string;
//   message?: string;
//   confirmLabel?: string;
//   onClose: () => void;
//   onConfirm: () => void;
// }

// const DeleteConfirmModal: React.FC<Props> = ({
//   loading = false,
//   title = "Delete this item?",
//   message = "This action cannot be undone.",
//   confirmLabel = "Delete",
//   onClose,
//   onConfirm,
// }) => (
//   <ModalShell
//     title={title}
//     size="sm"
//     busy={loading}
//     onClose={onClose}
//     footer={
//       <>
//         <button onClick={onClose} disabled={loading} className={modalBtn.ghost}>
//           Cancel
//         </button>
//         <button onClick={onConfirm} disabled={loading} className={modalBtn.danger}>
//           {loading ? "Deleting..." : confirmLabel}
//         </button>
//       </>
//     }
//   >
//     <div className="flex items-start gap-3">
//       <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 flex-shrink-0">
//         <svg
//           viewBox="0 0 24 24"
//           className="w-5 h-5"
//           fill="none"
//           stroke="currentColor"
//           strokeWidth={1.8}
//           strokeLinecap="round"
//           strokeLinejoin="round"
//           aria-hidden="true"
//         >
//           <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v5M14 11v5" />
//         </svg>
//       </div>
//       <p className="text-sm text-zinc-400 leading-relaxed pt-2">{message}</p>
//     </div>
//   </ModalShell>
// );

// export default DeleteConfirmModal;


import React from "react";
import ModalShell, { modalBtn } from "./Modalshell";

interface Props {
  loading?: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  loadingLabel?: string;
  variant?: "danger" | "primary";
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteConfirmModal: React.FC<Props> = ({
  loading = false,
  title = "Delete this item?",
  message = "This action cannot be undone.",
  confirmLabel = "Delete",
  loadingLabel,
  variant = "danger",
  onClose,
  onConfirm,
}) => {
  const danger = variant === "danger";

  return (
    <ModalShell
      title={title}
      size="sm"
      busy={loading}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} disabled={loading} className={modalBtn.ghost}>
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={
              danger
                ? modalBtn.danger
                : "px-4 py-2 rounded-xl text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-60"
            }
          >
            {loading ? loadingLabel ?? (danger ? "Deleting..." : "Saving...") : confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-full border flex items-center justify-center flex-shrink-0 ${
            danger
              ? "bg-red-500/10 border-red-500/20 text-red-400"
              : "bg-violet-500/10 border-violet-500/20 text-violet-300"
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {danger ? (
              <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v5M14 11v5" />
            ) : (
              <path d="M5 13l4 4L19 7" />
            )}
          </svg>
        </div>
        <p className="text-sm text-zinc-400 leading-relaxed pt-2">{message}</p>
      </div>
    </ModalShell>
  );
};

export default DeleteConfirmModal;