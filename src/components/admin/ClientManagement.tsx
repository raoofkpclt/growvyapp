import React, { useState, useEffect } from "react";
import type { Client } from "../../utils/types/Types";
import AddClientModal from "./Modal/AddClientModal";
import EditClientModal from "./Modal/EditClientModal";
import DeleteConfirmModal from "./Modal/DeleteConfirmModal";

import { getClients, deleteClient } from "../../service/clientService";

const ClientManagement: React.FC = () => {
  const [tab, setTab] = useState<"dashboard" | "clients" | "work">("clients");
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showAddClient, setShowAddClient] = useState(false);
  const [showEditClient, setShowEditClient] = useState<Client | null>(null);

  const [deleteClientId, setDeleteClientId] = useState<string | null>(null);

  const [deleteLoading, setDeleteLoading] = useState(false);

  const [workFilter, setWorkFilter] = useState<string>("all");

  
  useEffect(() => {
    console.log(tab,selectedClient)
    const loadClients = async () => {
      try {
        const data = await getClients();
        setClients(data);
      } catch (error) {
        console.log(error);
      }
    };

    loadClients();
  }, []);

  const handleDeleteClient = async () => {
    if (!deleteClientId) return;

    try {
      setDeleteLoading(true);

      await deleteClient(deleteClientId);

      setClients((prev) =>
        prev.filter((c) => c.firestoreId !== deleteClientId),
      );

      setDeleteClientId(null);
    } catch (error) {
      console.log(error);
    } finally {
      setDeleteLoading(false);
    }
  };
  return (
    <div>
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {(["all", "active", "inactive"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setWorkFilter(f)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all capitalize
      ${
        workFilter === f
          ? "bg-violet-600 text-white border-violet-500"
          : "border-white/10 text-zinc-400 hover:text-white hover:border-white/20"
      }`}
              >
                {f}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowAddClient(true)}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
          >
            <span className="text-base leading-none">+</span> Add Client
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {clients
            .filter((client) => {
              if (workFilter === "all") return true;
              return client.status === workFilter;
            })
            .map((client) => (
              <div
                key={client.id}
                className="bg-[#0f1117] border border-white/5 rounded-2xl overflow-hidden group hover:border-white/10 transition-all duration-300"
              >
                {/* Portfolio banner */}
                <div className="h-32 overflow-hidden relative">
                  <img
                    src={client.portfolioImage}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0f1117] via-transparent to-transparent" />
                  <span
                    className={`absolute top-3 right-3 text-[10px] font-semibold px-2 py-0.5 rounded-full ${client.status === "active" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-zinc-500/20 text-zinc-400 border border-zinc-500/30"}`}
                  >
                    {client.status}
                  </span>
                </div>

                {/* Profile */}
                <div className="px-5 pb-5 -mt-7 relative">
                  <img
                    src={client.profileImage}
                    alt={client.name}
                    className="w-12 h-12 rounded-xl border-2 border-[#0f1117] object-cover mb-3"
                  />
                  <h3 className="text-white font-semibold text-sm">
                    {client.name}
                  </h3>
                  <p className="text-xs text-zinc-500 mb-1">{client.email}</p>
                  <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2 mb-4">
                    {client.description}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedClient(client);
                        setTab("work");
                        setWorkFilter("by-client");
                      }}
                      className="flex-1 text-xs py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 transition-colors"
                    >
                      Work
                    </button>
                    <button
                      onClick={() => setShowEditClient({ ...client })}
                      className="flex-1 text-xs py-1.5 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 border border-violet-500/20 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() =>
                        setDeleteClientId(client.firestoreId || null)
                      }
                      className="px-3 text-xs py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))}

          {/* Add placeholder */}
          <button
            onClick={() => setShowAddClient(true)}
            className="border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-3 h-64 hover:border-violet-500/40 hover:bg-violet-500/5 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl border border-dashed border-white/20 flex items-center justify-center text-zinc-600 group-hover:text-violet-400 group-hover:border-violet-500/40 transition-colors text-xl">
              +
            </div>
            <span className="text-xs text-zinc-600 group-hover:text-zinc-400 transition-colors">
              Add New Client
            </span>
          </button>
        </div>
      </div>
      {showAddClient && (
        <AddClientModal
          onClose={() => setShowAddClient(false)}
          onSave={(newClient) => {
            setClients((prev) => [newClient, ...prev]);
            setShowAddClient(false);
          }}
        />
      )}
      {showEditClient && (
        <EditClientModal
          client={showEditClient}
          onClose={() => setShowEditClient(null)}
          onSave={(updatedClient) => {
            setClients((prev) =>
              prev.map((client) =>
                client.id === updatedClient.id ? updatedClient : client,
              ),
            );

            setShowEditClient(null);
          }}
        />
      )}

      {deleteClientId && (
        <DeleteConfirmModal
          loading={deleteLoading}
          onClose={() => setDeleteClientId(null)}
          onConfirm={handleDeleteClient}
        />
      )}
    </div>
  );
};

export default ClientManagement;
