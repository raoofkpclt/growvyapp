import { useState } from "react";
import type { Client } from "../../../utils/types/Types";
import { Modal, Field, TextAreaField } from "./Modal";

import { editClient } from "../../../service/clientService";
import { uploadFile } from "../../../utils/uploadFile";

interface Props {
  client: Client;
  onClose: () => void;
  onSave: (client: Client) => void;
}

const EditClientModal = ({ client, onClose, onSave }: Props) => {
  const [loading, setLoading] = useState(false);

  const [profileFile, setProfileFile] = useState<File | null>(null);

  const [portfolioFile, setPortfolioFile] = useState<File | null>(null);

  const [form, setForm] = useState<Client>({
    ...client,
  });

  const handleEditClient = async () => {
    try {
      console.log(1);
      // if (!client.firestoreId) return;

      setLoading(true);
      console.log(2);
      let profileImage = form.profileImage;
      let portfolioImage = form.portfolioImage;

      // Upload new profile image
      if (profileFile) {
        profileImage = await uploadFile(profileFile);
      }
      console.log(1);
      // Upload new portfolio image
      if (portfolioFile) {
        portfolioImage = await uploadFile(portfolioFile);
      }
      console.log(1);
      const updatedClient = {
        id: form.id,
        name: form.name,
        email: form.email,
        phone: form.phone,
        description: form.description,
        profileImage,
        portfolioImage,
        status: form.status,
        joinedDate: form.joinedDate,
      };
      console.log(1);
      // Update in Firebase
      await editClient(updatedClient);

      onSave({
        ...updatedClient,
        firestoreId: client.firestoreId,
      });

      onClose();
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Edit Client" onClose={onClose}>
      <div className="space-y-4">
        {/* Name + Email */}
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

        {/* Phone */}
        <Field
          label="Phone Number"
          type="tel"
          value={form.phone || ""}
          onChange={(e) =>
            setForm((p) => ({
              ...p,
              phone: e.target.value,
            }))
          }
          placeholder="+91 9876543210"
        />

        {/* Description */}
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

        {/* Current Profile Image */}
        {form.profileImage && (
          <div>
            <label className="text-sm text-zinc-400">
              Current Profile Image
            </label>

            <img
              src={form.profileImage}
              alt="profile"
              className="w-full h-32 object-cover rounded-xl mt-2"
            />
          </div>
        )}

        {/* Upload New Profile Image */}
        <div>
          <label className="text-sm text-zinc-400">Change Profile Image</label>

          <input
            type="file"
            onChange={(e) => setProfileFile(e.target.files?.[0] || null)}
            className="w-full mt-1"
          />
        </div>

        {/* Current Portfolio Image */}
        {form.portfolioImage && (
          <div>
            <label className="text-sm text-zinc-400">
              Current Portfolio Image
            </label>

            <img
              src={form.portfolioImage}
              alt="portfolio"
              className="w-full h-40 object-cover rounded-xl mt-2"
            />
          </div>
        )}

        {/* Upload New Portfolio Image */}
        <div>
          <label className="text-sm text-zinc-400">
            Change Portfolio Image
          </label>

          <input
            type="file"
            onChange={(e) => setPortfolioFile(e.target.files?.[0] || null)}
            className="w-full mt-1"
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl border border-white/10"
          >
            Cancel
          </button>

          <button
            onClick={handleEditClient}
            disabled={loading}
            className="flex-1 py-2 rounded-xl bg-violet-600 text-white"
          >
            {loading ? "Updating..." : "Update Client"}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default EditClientModal;
