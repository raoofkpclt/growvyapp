import React from "react";
import { Modal } from "./Modal";

interface Props {
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

const DeleteConfirmModal = ({
  onClose,
  onConfirm,
  loading,
}: Props) => {
  return (
    <Modal title="Delete Client" onClose={onClose}>
      <div className="space-y-5">
        <div>
          <h3 className="text-white text-sm font-medium">
            Are you sure?
          </h3>

          <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
            This action will permanently delete this
            client. This cannot be undone.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl border border-white/10 text-zinc-300 hover:bg-white/5 transition"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white transition"
          >
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default DeleteConfirmModal;