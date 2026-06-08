import React, { useEffect, useState } from "react";
import { getCreatives, deleteCreative } from "../../service/workService";
import type { Creative, Client } from "../../utils/types/Types";
import AddCreativeModal from "./Modal/AddCreativeModal";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../config/firebase/firebase";

const WorkManagement: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient] = useState<Client | null>(null);
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [showAddCreative, setShowAddCreative] = useState(false);
  const [workFilter, setWorkFilter] = useState<string>("all");
  const [loadingClients, setLoadingClients] = useState(true);

  const filteredCreatives =
    workFilter === "all"
      ? creatives
      : workFilter === "by-client"
        ? selectedClient
          ? creatives.filter((c) => c.clientId === selectedClient.id)
          : creatives
        : creatives.filter((c) => c.type === workFilter);

  useEffect(() => {
    console.log(loadingClients,)
    const fetchClients = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "clients"));

        const clientsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Client[];

        setClients(clientsData);
      } catch (error) {
        console.log("Error fetching clients:", error);
      } finally {
        setLoadingClients(false);
      }
    };

    const fetchCreatives = async () => {
      const data = await getCreatives();

      setCreatives(data);
    };

    fetchCreatives();
    fetchClients();
  }, []);

  const handleDelete = async (id: string) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this work?",
    );

    if (!confirmDelete) return;

    try {
      await deleteCreative(id);

      setCreatives((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.log(error);
      alert("Failed to delete work");
    }
  };

  return (
    <div>
      <div className="animate-fade-in space-y-6">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex gap-2 flex-wrap">
            {[
              { val: "all", label: "All" },
              { val: "poster", label: "Posters" },
              { val: "reel", label: "Reels" },
              { val: "website", label: "Websites" },
              {
                val: "by-client",
                label: selectedClient ? `${selectedClient.name}` : "By Client",
              },
            ].map((f) => (
              <button
                key={f.val}
                onClick={() => setWorkFilter(f.val)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${workFilter === f.val ? "bg-violet-500/15 border-violet-500/30 text-violet-300" : "border-white/10 text-zinc-400 hover:text-white hover:border-white/20"}`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowAddCreative(true)}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
          >
            <span className="text-base leading-none">+</span> Upload Creative
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCreatives.map((c) => {
            const owner = clients.find((cl) => cl.id === c.clientId);
            return (
              <div
                key={c.id}
                className="bg-[#0f1117] border border-white/5 rounded-2xl overflow-hidden group hover:border-white/10 transition-all"
              >
                {/* Preview */}
                <div className="h-40 bg-white/5 relative overflow-hidden">
                  {c.type === "poster" && c.imageUrl && (
                    <img
                      src={c.imageUrl}
                      alt={c.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  )}
                  {c.type === "reel" && (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-900/30 to-fuchsia-900/30">
                      <div className="text-center">
                        <div className="text-3xl mb-2">▶</div>
                        <p className="text-xs text-zinc-400">Instagram Reel</p>
                      </div>
                    </div>
                  )}
                  {c.type === "website" && (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-sky-900/30 to-cyan-900/30">
                      <div className="text-center">
                        <div className="text-3xl mb-2">🌐</div>
                        <p className="text-xs text-zinc-400">Website</p>
                      </div>
                    </div>
                  )}
                  <span
                    className={`absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded-full border
                          ${c.type === "poster" ? "bg-violet-500/20 text-violet-300 border-violet-500/30" : ""}
                          ${c.type === "reel" ? "bg-pink-500/20 text-pink-300 border-pink-500/30" : ""}
                          ${c.type === "website" ? "bg-sky-500/20 text-sky-300 border-sky-500/30" : ""}
                        `}
                  >
                    {c.type}
                  </span>
                </div>

                <div className="p-4">
                  <p className="text-sm text-white font-medium truncate">
                    {c.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    {owner && (
                      <img
                        src={owner.profileImage}
                        alt=""
                        className="w-4 h-4 rounded-full"
                      />
                    )}
                    <p className="text-xs text-zinc-500 truncate">
                      {owner?.name}
                    </p>
                    <button
                      onClick={() => handleDelete(c.id!)}
                      className="
    flex
    items-center
    justify-center
    gap-2
    w-full
    py-2
    rounded-xl
    bg-red-500/10
    text-red-400
    hover:bg-red-500/20
    transition-all
  "
                    >
                      🗑 Delete
                    </button>
                  </div>
                  <p className="text-xs text-zinc-700 mt-1">{c.uploadedAt}</p>
                  <div className="mt-3 flex gap-2">
                    {c.type === "reel" && c.instagramUrl && (
                      <a
                        href={c.instagramUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-pink-400 hover:text-pink-300 underline truncate"
                      >
                        View on Instagram
                      </a>
                    )}
                    {c.type === "website" && c.websiteUrl && (
                      <a
                        href={c.websiteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-sky-400 hover:text-sky-300 underline truncate"
                      >
                        Visit Site
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {filteredCreatives.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-zinc-600">
              <div className="text-4xl mb-3">◧</div>
              <p className="text-sm">No creatives found</p>
            </div>
          )}
        </div>
      </div>
      {showAddCreative && (
        <AddCreativeModal
          onClose={() => setShowAddCreative(false)}
          onSave={(newCreative) => {
            setCreatives((prev) => [newCreative, ...prev]);

            setShowAddCreative(false);
          }}
          clients={clients}
        />
      )}
    </div>
  );
};

export default WorkManagement;
