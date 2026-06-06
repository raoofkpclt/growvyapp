import { useState } from "react";
import type { Client } from "../../../utils/types/Types";
import { Modal, Field, TextAreaField } from "./Modal";

import { addClient } from "../../../service/clientService";
import { uploadFile } from "../../../utils/uploadFile";

const AddClientModal = ({ onClose, onSave }: any) => {
  const [loading, setLoading] = useState(false);

  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [portfolioFile, setPortfolioFile] = useState<File | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "", 
    description: "",
  });

  const handleAddClient = async () => {
    try {
      setLoading(true);

      if (!form.name) return;

      let profileImage = "";
      let portfolioImage = "";

      // Upload Profile Image
      if (profileFile) {
        profileImage = await uploadFile(profileFile);
      }

      // Upload Portfolio Image
      if (portfolioFile) {
        portfolioImage = await uploadFile(portfolioFile);
      }

      const newClient: Client = {
        id: Date.now().toString(),
        name: form.name,
        email: form.email,
        phone: form.phone, // SAVE PHONE
        description: form.description,
        profileImage,
        portfolioImage,
        status: "active",
        joinedDate: new Date().toISOString().slice(0, 10),
      };

      // Save to Firebase
      await addClient(newClient);

      onSave(newClient);

      onClose();
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Add New Client" onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Full Name"
            value={form.name}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                name: e.target.value,
              }))
            }
            placeholder="Arjun Menon"
          />

          <Field
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                email: e.target.value,
              }))
            }
            placeholder="arjun@example.com"
          />
        </div>

        {/* PHONE INPUT */}
        <Field
          label="Phone Number"
          type="tel"
          value={form.phone}
          onChange={(e) =>
            setForm((p) => ({
              ...p,
              phone: e.target.value,
            }))
          }
          placeholder="+91 9876543210"
        />

        <TextAreaField
          label="Description"
          value={form.description}
          onChange={(e) =>
            setForm((p) => ({
              ...p,
              description: e.target.value,
            }))
          }
          placeholder="Short bio..."
        />

        {/* Profile Image */}
        <div>
          <label className="text-sm text-zinc-400">Profile Image</label>

          <input
            type="file"
            onChange={(e) => setProfileFile(e.target.files?.[0] || null)}
            className="w-full mt-1"
          />
        </div>

        {/* Portfolio Image */}
        <div>
          <label className="text-sm text-zinc-400">Portfolio Image</label>

          <input
            type="file"
            onChange={(e) => setPortfolioFile(e.target.files?.[0] || null)}
            className="w-full mt-1"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl border border-white/10"
          >
            Cancel
          </button>

          <button
            onClick={handleAddClient}
            disabled={loading}
            className="flex-1 py-2 rounded-xl bg-violet-600 text-white"
          >
            {loading ? "Saving..." : "Save Client"}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AddClientModal;
