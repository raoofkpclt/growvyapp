import { useState } from "react";
import { SERVICE_OPTIONS, type Client } from "../../../utils/types/Types";
import { Modal, Field, TextAreaField } from "./Modal";
import AlertModal from "./AlertModal";
import { addClient } from "../../../service/clientService";
import { uploadFile } from "../../../utils/uploadFile";

interface Props {
  onClose: () => void;
  onSave: (client: Client) => void;
}

type AlertState = {
  type: "success" | "error" | "warning";
  title: string;
  message?: string;
} | null;

const AddClientModal = ({ onClose, onSave }: Props) => {
  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [portfolioFile, setPortfolioFile] = useState<File | null>(null);
  const [alert, setAlert] = useState<AlertState>(null);
  const [savedClient, setSavedClient] = useState<Client | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    mobile: "",
    address: "",
    requiredServices: [] as string[],
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

  const handleAddClient = async () => {
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

      const profileImage = logoFile ? await uploadFile(logoFile) : "";
      const portfolio = portfolioFile ? await uploadFile(portfolioFile) : "";

      const newClient: Client = {
        id: Date.now().toString(),
        name: form.name.trim(),
        email: form.email.trim(),
        mobile: form.mobile.trim(),
        address: form.address.trim(),
        profileImage,
        portfolio,
        requiredServices: form.requiredServices,
        status: "active",
        joinedDate: new Date().toISOString().slice(0, 10),
      };

      const firestoreId = await addClient(newClient);

      // keep the client until the user dismisses the success alert,
      // otherwise the parent would unmount this modal immediately
      setSavedClient({ ...newClient, firestoreId });
      setAlert({
        type: "success",
        title: "Client added",
        message: `${newClient.name} has been added successfully.`,
      });
    } catch (error) {
      console.log(error);
      setAlert({
        type: "error",
        title: "Something went wrong",
        message: "We couldn't save the client. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAlertClose = () => {
    const wasSuccess = alert?.type === "success";
    setAlert(null);

    if (wasSuccess && savedClient) {
      onSave(savedClient); // parent adds to list + closes modal
      onClose();
    }
  };

  return (
    <>
      <Modal title="Add New Client" onClose={onClose}>
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

          <div>
            <label className="text-sm text-zinc-400">Logo</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
              className="w-full mt-1"
            />
          </div>

          <div>
            <label className="text-sm text-zinc-400">Portfolio</label>
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
              className="flex-1 py-2 rounded-xl bg-violet-600 text-white disabled:opacity-60"
            >
              {loading ? "Saving..." : "Save Client"}
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

export default AddClientModal;