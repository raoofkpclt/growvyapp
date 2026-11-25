import React, { useState, useEffect, useMemo } from "react";
import type { Client } from "../../utils/types/Types";
import AddClientModal from "./Modal/AddClientModal";
import EditClientModal from "./Modal/EditClientModal";
import DeleteConfirmModal from "./Modal/DeleteConfirmModal";
import ClientDetails from "./ClientDetails";

import {
  getClients,
  deleteClient,
  editClient,
} from "../../service/clientService";

type Filter = "all" | "active" | "inactive";

type ClientManagementProps = {
  /** false = read only (no add / edit / delete / status change) */
  canManage?: boolean;
};

/* ---------- tiny inline icons (no extra dependency) ---------- */
const iconProps = {
  width: 14,
  height: 14,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const MailIcon = () => (
  <svg {...iconProps}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </svg>
);
const PhoneIcon = () => (
  <svg {...iconProps}>
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" />
  </svg>
);
const PinIcon = () => (
  <svg {...iconProps}>
    <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);
const SearchIcon = () => (
  <svg {...iconProps} width={16} height={16}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);
const TrashIcon = () => (
  <svg {...iconProps}>
    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
  </svg>
);

/* ---------- newest first ---------- */
const sortNewestFirst = (list: Client[]) =>
  [...list].sort((a, b) => {
    // id was created with Date.now(), so a bigger number = added later
    const aId = Number(a.id);
    const bId = Number(b.id);
    if (!Number.isNaN(aId) && !Number.isNaN(bId) && aId !== bId) {
      return bId - aId;
    }
    // fallback: joined date
    return (b.joinedDate || "").localeCompare(a.joinedDate || "");
  });

const ClientManagement: React.FC<ClientManagementProps> = ({
  canManage = true,
}) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [detailClient, setDetailClient] = useState<Client | null>(null);
  const [showAddClient, setShowAddClient] = useState(false);
  const [showEditClient, setShowEditClient] = useState<Client | null>(null);
  const [deleteClientId, setDeleteClientId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [statusLoadingId, setStatusLoadingId] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const loadClients = async () => {
      try {
        const data = await getClients();
        setClients(data);
      } catch (error) {
        console.log(error);
      } finally {
        setPageLoading(false);
      }
    };
    loadClients();
  }, []);

  const handleDeleteClient = async () => {
    if (!canManage || !deleteClientId) return;
    try {
      setDeleteLoading(true);
      await deleteClient(deleteClientId);
      setClients((prev) => prev.filter((c) => c.firestoreId !== deleteClientId));
      setDeleteClientId(null);
    } catch (error) {
      console.log(error);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleToggleStatus = async (client: Client) => {
    if (!canManage) return;
    const newStatus: Client["status"] =
      client.status === "active" ? "inactive" : "active";

    try {
      setStatusLoadingId(client.id);

      // editClient only overwrites the fields you send
      await editClient({ id: client.id, status: newStatus });

      setClients((prev) =>
        prev.map((c) => (c.id === client.id ? { ...c, status: newStatus } : c)),
      );
    } catch (error) {
      console.log(error);
    } finally {
      setStatusLoadingId(null);
    }
  };

  const counts = useMemo(
    () => ({
      all: clients.length,
      active: clients.filter((c) => c.status === "active").length,
      inactive: clients.filter((c) => c.status === "inactive").length,
    }),
    [clients],
  );

  const visibleClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sortNewestFirst(clients).filter((c) => {
      const statusOk = statusFilter === "all" || c.status === statusFilter;
      const searchOk =
        !q ||
        c.name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.mobile?.toLowerCase().includes(q) ||
        c.requiredServices?.some((s) => s.toLowerCase().includes(q));
      return statusOk && searchOk;
    });
  }, [clients, statusFilter, search]);

  /* ---------- client details page ---------- */
  if (detailClient) {
    return (
      <ClientDetails
        client={detailClient}
        onBack={() => setDetailClient(null)}
      />
    );
  }

  /* ---------- client list ---------- */
  return (
    <div>
      <div className="animate-fade-in space-y-6">
        {/* ---------- Header ---------- */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Clients</h2>
            <p className="text-sm text-zinc-500">
              {counts.all} total · {counts.active} active
            </p>
          </div>
          {canManage && (
            <button
              onClick={() => setShowAddClient(true)}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg shadow-violet-900/30 transition-all"
            >
              <span className="text-base leading-none">+</span> Add Client
            </button>
          )}
        </div>

        {/* ---------- Toolbar ---------- */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex p-1 rounded-xl bg-white/[0.03] border border-white/5 w-fit">
            {(["all", "active", "inactive"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`flex items-center gap-2 text-xs capitalize px-3.5 py-1.5 rounded-lg transition-all ${
                  statusFilter === f
                    ? "bg-violet-600 text-white shadow"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {f}
                <span
                  className={`text-[10px] px-1.5 rounded-full ${
                    statusFilter === f
                      ? "bg-white/20"
                      : "bg-white/5 text-zinc-500"
                  }`}
                >
                  {counts[f]}
                </span>
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
              <SearchIcon />
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, service..."
              className="w-full bg-white/[0.03] border border-white/5 focus:border-violet-500/50 focus:outline-none rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder:text-zinc-600 transition-colors"
            />
          </div>
        </div>

        {/* ---------- Grid ---------- */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* Loading skeleton */}
          {pageLoading &&
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-80 rounded-2xl bg-white/[0.03] border border-white/5 animate-pulse"
              />
            ))}

          {!pageLoading &&
            visibleClients.map((client, index) => (
              <div
                key={client.firestoreId || client.id}
                onClick={() => setDetailClient(client)}
                className="group relative flex flex-col cursor-pointer bg-[#0f1117] border border-white/5 rounded-2xl overflow-hidden hover:-translate-y-1 hover:border-violet-500/30 hover:shadow-xl hover:shadow-violet-900/20 transition-all duration-300"
              >
                {/* Banner */}
                <div className="h-32 relative overflow-hidden bg-gradient-to-br from-violet-900/40 via-[#151826] to-fuchsia-900/30">
                  {client.portfolio && (
                    <img
                      src={client.portfolio}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0f1117] via-[#0f1117]/20 to-transparent" />

                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    {index === 0 && !search && statusFilter === "all" ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-500/80 text-white backdrop-blur">
                        Latest
                      </span>
                    ) : (
                      <span />
                    )}
                    <span
                      className={`flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full backdrop-blur capitalize ${
                        client.status === "active"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-zinc-500/20 text-zinc-300 border border-zinc-500/30"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          client.status === "active"
                            ? "bg-emerald-400"
                            : "bg-zinc-400"
                        }`}
                      />
                      {client.status}
                    </span>
                  </div>
                </div>

                {/* Body */}
                <div className="px-5 pb-5 -mt-8 relative flex flex-col flex-1">
                  {client.profileImage || client.profileImage ? (
                    <img
                      src={client.profileImage || client.profileImage}
                      alt={client.name}
                      className="w-14 h-14 rounded-2xl border-4 border-[#0f1117] object-cover bg-[#0f1117] shadow-lg mb-3"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl border-4 border-[#0f1117] bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white flex items-center justify-center text-lg font-semibold shadow-lg mb-3">
                      {client.name?.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <h3 className="text-white font-semibold text-base leading-tight">
                    {client.name}
                  </h3>
                  {client.joinedDate && (
                    <p className="text-[11px] text-zinc-600 mt-0.5 mb-3">
                      Joined {client.joinedDate}
                    </p>
                  )}

                  {/* Contact info */}
                  <div className="space-y-1.5 mb-4 text-xs text-zinc-400">
                    {client.email && (
                      <p className="flex items-center gap-2 truncate">
                        <span className="text-zinc-600">
                          <MailIcon />
                        </span>
                        <span className="truncate">{client.email}</span>
                      </p>
                    )}
                    {client.mobile && (
                      <p className="flex items-center gap-2">
                        <span className="text-zinc-600">
                          <PhoneIcon />
                        </span>
                        {client.mobile}
                      </p>
                    )}
                    {client.address && (
                      <p className="flex items-start gap-2">
                        <span className="text-zinc-600 mt-0.5">
                          <PinIcon />
                        </span>
                        <span className="line-clamp-2">{client.address}</span>
                      </p>
                    )}
                  </div>

                  {/* Services */}
                  {(client.requiredServices ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {client.requiredServices.map((s) => (
                        <span
                          key={s}
                          className="text-[10px] px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Status (toggle only when the person can manage) */}
                  <div className="flex items-center justify-between mt-auto mb-4 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/5">
                    <span className="text-xs text-zinc-400">
                      Status:{" "}
                      <span
                        className={
                          client.status === "active"
                            ? "text-emerald-400"
                            : "text-zinc-500"
                        }
                      >
                        {client.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </span>

                    {canManage && (
                      <button
                        type="button"
                        role="switch"
                        aria-checked={client.status === "active"}
                        disabled={statusLoadingId === client.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleStatus(client);
                        }}
                        title={
                          client.status === "active"
                            ? "Mark as inactive"
                            : "Mark as active"
                        }
                        className={`relative w-10 h-5 rounded-full transition-colors disabled:opacity-50 ${
                          client.status === "active"
                            ? "bg-emerald-500"
                            : "bg-zinc-600"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                            client.status === "active"
                              ? "translate-x-5"
                              : "translate-x-0"
                          }`}
                        />
                      </button>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t border-white/5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetailClient(client);
                      }}
                      className="flex-1 text-xs py-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 transition-colors"
                    >
                      Details
                    </button>
                    {canManage && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowEditClient({ ...client });
                          }}
                          className="flex-1 text-xs py-2 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 border border-violet-500/20 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteClientId(client.firestoreId || null);
                          }}
                          title="Delete client"
                          className="px-3 flex items-center justify-center rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors"
                        >
                          <TrashIcon />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}

          {/* Add placeholder (only when not searching, and only if the person can add) */}
          {canManage && !pageLoading && !search && (
            <button
              onClick={() => setShowAddClient(true)}
              className="border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-3 min-h-[20rem] hover:border-violet-500/40 hover:bg-violet-500/5 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl border border-dashed border-white/20 flex items-center justify-center text-zinc-600 group-hover:text-violet-400 group-hover:border-violet-500/40 transition-colors text-2xl">
                +
              </div>
              <span className="text-xs text-zinc-600 group-hover:text-zinc-400 transition-colors">
                Add New Client
              </span>
            </button>
          )}
        </div>

        {/* Empty state */}
        {!pageLoading &&
          visibleClients.length === 0 &&
          (search || clients.length > 0) && (
            <div className="text-center py-16 border border-dashed border-white/10 rounded-2xl">
              <p className="text-zinc-300 text-sm font-medium">
                No clients found
              </p>
              <p className="text-zinc-600 text-xs mt-1">
                Try a different search or filter.
              </p>
            </div>
          )}
      </div>

      {canManage && showAddClient && (
        <AddClientModal
          onClose={() => setShowAddClient(false)}
          onSave={(newClient: Client) => {
            setClients((prev) => [newClient, ...prev]);
            setShowAddClient(false);
          }}
        />
      )}

      {canManage && showEditClient && (
        <EditClientModal
          client={showEditClient}
          onClose={() => setShowEditClient(null)}
          onSave={(updatedClient: Client) => {
            setClients((prev) =>
              prev.map((c) => (c.id === updatedClient.id ? updatedClient : c)),
            );
            setShowEditClient(null);
          }}
        />
      )}

      {canManage && deleteClientId && (
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