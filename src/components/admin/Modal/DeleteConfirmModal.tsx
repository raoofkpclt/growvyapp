import React from "react";

interface Props {
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteConfirmModal: React.FC<Props> = ({ loading = false, onClose, onConfirm }) => (
  // items-start + pt-* = modal sits at the top centre of the screen
  <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm px-4 pt-6 sm:pt-10">
    <div className="bg-[#0f1117] border border-white/10 rounded-xl w-full max-w-sm shadow-2xl animate-fade-in">
      <div className="px-4 py-3 border-b border-white/5">
        <h3 className="text-white font-semibold text-sm">Delete this item?</h3>
      </div>
      <div className="px-4 py-3">
        <p className="text-xs text-zinc-400">This action cannot be undone.</p>
      </div>
      <div className="flex gap-2 px-4 py-3 border-t border-white/5">
        <button
          onClick={onClose}
          disabled={loading}
          className="flex-1 py-2 rounded-lg text-xs text-zinc-400 border border-white/10 hover:text-white hover:border-white/20 disabled:opacity-40 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 py-2 rounded-lg text-xs bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-medium transition-colors"
        >
          {loading ? "Deleting..." : "Delete"}
        </button>
      </div>
    </div>
  </div>
);

export default DeleteConfirmModal;