import { useState } from "react";
import { SERVICE_OPTIONS, type Client } from "../../../utils/types/Types";
import { Modal, Field, TextAreaField } from "./Modal";
import AlertModal, { type AlertState } from "./AlertModal";

import { editClient } from "../../../service/clientService";
import { uploadFile } from "../../../utils/uploadFile";

interface Props {
  client: Client;
  onClose: () => void;
  onSave: (client: Client) => void;
}

const EditClientModal = ({ client, onClose, onSave }: Props) => {
  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [portfolioFile, setPortfolioFile] = useState<File | null>(null);
  const [alert, setAlert] = useState<AlertState>(null);
  const [savedClient, setSavedClient] = useState<Client | null>(null);

  const [form, setForm] = useState({
    name: client.name || "",
    email: client.email || "",
    mobile: client.mobile || "",
    address: client.address || "",
    requiredServices: client.requiredServices ?? [],
  });

  const setField = (key: keyof typeof form, value: string) =>
    setForm((p) => ({ ...p, [key]: value }));

  const toggleService = (service: string) =>
    setForm((p) => ({
      ...p,
      requiredServices: p.requiredServices.includes(service)
        ? p.requiredServices.filter((s) => s !== service)
        : [...p.requiredServices, service],
    }));

  const handleEditClient = async () => {
    if (!form.name.trim()) {
      setAlert({
        type: "warning",
        title: "Client name required",
        message: "Please enter the client's name before saving.",
      });
      return;
    }

    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      setAlert({
        type: "warning",
        title: "Invalid email",
        message: "Please enter a valid email address.",
      });
      return;
    }

    try {
      setLoading(true);

      // Upload only if a new file was picked, otherwise keep the old URL
      const profileImage = logoFile ? await uploadFile(logoFile) : client.profileImage || "";
      const portfolio = portfolioFile
        ? await uploadFile(portfolioFile)
        : client.portfolio || "";

      const updatedClient: Client = {
        id: client.id,
        name: form.name.trim(),
        email: form.email.trim(),
        mobile: form.mobile.trim(),
        address: form.address.trim(),
        profileImage,
        portfolio,
        requiredServices: form.requiredServices,
        status: client.status,
        joinedDate: client.joinedDate,
      };

      await editClient(updatedClient);

      // keep the result until the user dismisses the success alert
      setSavedClient({ ...updatedClient, firestoreId: client.firestoreId });
      setAlert({
        type: "success",
        title: "Client updated",
        message: `${updatedClient.name} has been updated successfully.`,
      });
    } catch (error) {
      console.log(error);
      setAlert({
        type: "error",
        title: "Something went wrong",
        message: "We couldn't update the client. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAlertClose = () => {
    const wasSuccess = alert?.type === "success";
    setAlert(null);

    if (wasSuccess && savedClient) {
      onSave(savedClient);
      onClose();
    }
  };

  return (
    <>
      <Modal title="Edit Client" onClose={onClose}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Client Name"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="Arjun Menon"
            />
            <Field
              label="Email ID"
              type="email"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              placeholder="arjun@example.com"
            />
          </div>

          <Field
            label="Mobile Number"
            type="tel"
            value={form.mobile}
            onChange={(e) => setField("mobile", e.target.value)}
            placeholder="+91 9876543210"
          />

          <TextAreaField
            label="Address"
            value={form.address}
            onChange={(e) => setField("address", e.target.value)}
            placeholder="Street, City, State, PIN"
          />

          {client.profileImage && !logoFile && (
            <div>
              <label className="text-sm text-zinc-400">Current Logo</label>
              <img
                src={client.profileImage}
                alt="logo"
                className="w-20 h-20 object-cover rounded-xl mt-2"
              />
            </div>
          )}
          <div>
            <label className="text-sm text-zinc-400">Change Logo</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
              className="w-full mt-1"
            />
          </div>

          {client.portfolio && !portfolioFile && (
            <div>
              <label className="text-sm text-zinc-400">Current Portfolio</label>
              <img
                src={client.portfolio}
                alt="portfolio"
                className="w-full h-40 object-cover rounded-xl mt-2"
              />
            </div>
          )}
          <div>
            <label className="text-sm text-zinc-400">Change Portfolio</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPortfolioFile(e.target.files?.[0] || null)}
              className="w-full mt-1"
            />
          </div>

          <div>
            <label className="text-sm text-zinc-400">Required Services</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {SERVICE_OPTIONS.map((service) => {
                const active = form.requiredServices.includes(service);
                return (
                  <button
                    type="button"
                    key={service}
                    onClick={() => toggleService(service)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                      active
                        ? "bg-violet-600 text-white border-violet-500"
                        : "border-white/10 text-zinc-400 hover:text-white"
                    }`}
                  >
                    {service}
                  </button>
                );
              })}
            </div>
          </div>

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
              className="flex-1 py-2 rounded-xl bg-violet-600 text-white disabled:opacity-60"
            >
              {loading ? "Updating..." : "Update Client"}
            </button>
          </div>
        </div>
      </Modal>

      {alert && (
        <AlertModal
          type={alert.type}
          title={alert.title}
          message={alert.message}
          onClose={handleAlertClose}
        />
      )}
    </>
  );
};

export default EditClientModal;