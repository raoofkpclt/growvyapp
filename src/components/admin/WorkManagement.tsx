import React, { useCallback, useEffect, useMemo, useState } from "react";
import { getCreatives, deleteCreative } from "../../service/workService";
import type { Creative, Client } from "../../utils/types/Types";
import AddCreativeModal from "./Modal/AddCreativeModal";
import DeleteConfirmModal from "./Modal/DeleteConfirmModal"; // adjust path if your modal lives elsewhere
import ReelPreview from "../admin/Modal/ReelPreview";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../config/firebase/firebase";

/* ---------------------------------------------------------------------
   Style tokens
   --------------------------------------------------------------------- */
const TYPE_META: Record<string, { label: string; badge: string; dot: string }> = {
  poster: {
    label: "Poster",
    badge: "bg-violet-500/15 text-violet-300 border-violet-500/30",
    dot: "bg-violet-400",
  },
  reel: {
    label: "Reel",
    badge: "bg-pink-500/15 text-pink-300 border-pink-500/30",
    dot: "bg-pink-400",
  },
  website: {
    label: "Website",
    badge: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    dot: "bg-sky-400",
  },
};

const FILTERS = [
  { val: "all", label: "All" },
  { val: "poster", label: "Posters" },
  { val: "reel", label: "Reels" },
  { val: "website", label: "Websites" },
];

const inputCls =
  "bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/60 transition-colors";

/* ---------------------------------------------------------------------
   Lock page scroll while a layer is open
   --------------------------------------------------------------------- */
const useLockBodyScroll = (locked: boolean) => {
  useEffect(() => {
    if (!locked) return;
    const prevOverflow = document.body.style.overflow;
    const prevPadding = document.body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPadding;
    };
  }, [locked]);
};

/* ---------------------------------------------------------------------
   Work viewer (opens when you click a card)
   --------------------------------------------------------------------- */
const WorkViewer: React.FC<{
  creative: Creative;
  owner?: Client;
  index: number;
  total: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onDelete: () => void;
}> = ({ creative: c, owner, index, total, onClose, onPrev, onNext, onDelete }) => {
  const meta = TYPE_META[c.type] ?? TYPE_META.poster;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onPrev, onNext]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={c.title}
    >
      <div
        className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-[#0f1117] border border-white/10 rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-white/5">
          <div className="min-w-0 flex items-center gap-3">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${meta.badge}`}>
              {meta.label}
            </span>
            <p className="text-sm font-medium text-white truncate">{c.title}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-zinc-500 hidden sm:inline">
              {index + 1} / {total}
            </span>
            <button
              onClick={onPrev}
              disabled={total < 2}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-white/10 text-zinc-300 hover:text-white hover:border-white/20 disabled:opacity-30 transition-colors"
              aria-label="Previous work"
            >
              ←
            </button>
            <button
              onClick={onNext}
              disabled={total < 2}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-white/10 text-zinc-300 hover:text-white hover:border-white/20 disabled:opacity-30 transition-colors"
              aria-label="Next work"
            >
              →
            </button>
            <button
              onClick={onClose}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-white/10 text-zinc-300 hover:text-white hover:border-white/20 transition-colors"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Stage */}
        <div className="flex-1 min-h-0 overflow-y-auto bg-black/40 flex items-center justify-center">
          {c.type === "poster" &&
            (c.imageUrl ? (
              <img src={c.imageUrl} alt={c.title} className="max-w-full max-h-[70vh] object-contain" />
            ) : (
              <p className="text-sm text-zinc-500 py-24">No image was uploaded for this poster.</p>
            ))}

          {c.type === "reel" &&
            (c.videoUrl ? (
              <video
                key={c.videoUrl}
                src={c.videoUrl}
                controls
                autoPlay
                playsInline
                className="max-w-full max-h-[70vh] bg-black"
              />
            ) : (
              <div className="py-24 text-center px-6">
                <p className="text-sm text-zinc-400">No video file is attached to this reel.</p>
                {c.instagramUrl && (
                  <a
                    href={c.instagramUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block mt-4 text-xs px-4 py-2 rounded-xl bg-pink-500/15 text-pink-300 border border-pink-500/30 hover:bg-pink-500/25 transition-colors"
                  >
                    Open on Instagram
                  </a>
                )}
              </div>
            ))}

          {c.type === "website" &&
            (c.websiteUrl ? (
              <div className="w-full h-[70vh] flex flex-col">
                <iframe
                  key={c.websiteUrl}
                  src={c.websiteUrl}
                  title={c.title}
                  className="w-full flex-1 bg-white"
                  sandbox="allow-scripts allow-same-origin allow-popups"
                />
                <p className="text-[11px] text-zinc-500 px-4 py-2 border-t border-white/5 bg-[#0f1117]">
                  If the page stays blank, the site does not allow embedding. Use “Open site” instead.
                </p>
              </div>
            ) : (
              <p className="text-sm text-zinc-500 py-24">No website link was added.</p>
            ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 flex-wrap px-5 py-3.5 border-t border-white/5">
          <div className="flex items-center gap-2.5 min-w-0">
            {owner?.profileImage && <img src={owner.profileImage} alt="" className="w-6 h-6 rounded-full object-cover" />}
            <div className="min-w-0">
              <p className="text-xs text-zinc-300 truncate">{owner?.name ?? "No client"}</p>
              {c.uploadedAt && <p className="text-[11px] text-zinc-600">{c.uploadedAt}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {c.type === "reel" && c.instagramUrl && (
              <a
                href={c.instagramUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs px-3 py-1.5 rounded-lg border border-pink-500/30 text-pink-300 hover:bg-pink-500/10 transition-colors"
              >
                Instagram
              </a>
            )}
            {c.type === "website" && c.websiteUrl && (
              <a
                href={c.websiteUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs px-3 py-1.5 rounded-lg border border-sky-500/30 text-sky-300 hover:bg-sky-500/10 transition-colors"
              >
                Open site
              </a>
            )}
            {c.type === "poster" && c.imageUrl && (
              <a
                href={c.imageUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-zinc-300 hover:text-white hover:border-white/20 transition-colors"
              >
                Open full size
              </a>
            )}
            <button
              onClick={onDelete}
              className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ---------------------------------------------------------------------
   Page
   --------------------------------------------------------------------- */
const WorkManagement: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [typeFilter, setTypeFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [search, setSearch] = useState("");

  const [showAddCreative, setShowAddCreative] = useState(false);
  const [viewIndex, setViewIndex] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Creative | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* ---------- fetch ---------- */
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const snap = await getDocs(collection(db, "clients"));
        setClients(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Client[]);
      } catch (e) {
        console.log("Error fetching clients:", e);
        setError("Could not load clients.");
      }
    };

    const fetchCreatives = async () => {
      try {
        setCreatives(await getCreatives());
      } catch (e) {
        console.log("Error fetching works:", e);
        setError("Could not load works.");
      }
    };

    Promise.all([fetchClients(), fetchCreatives()]).finally(() => setLoading(false));
  }, []);

  /* ---------- derived ---------- */
  const clientById = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);

  const counts = useMemo(() => {
    const m: Record<string, number> = { all: creatives.length, poster: 0, reel: 0, website: 0 };
    creatives.forEach((c) => {
      m[c.type] = (m[c.type] ?? 0) + 1;
    });
    return m;
  }, [creatives]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return creatives.filter((c) => {
      if (typeFilter !== "all" && c.type !== typeFilter) return false;
      if (clientFilter !== "all" && c.clientId !== clientFilter) return false;
      if (q) {
        const owner = clientById.get(c.clientId)?.name ?? "";
        if (!c.title.toLowerCase().includes(q) && !owner.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [creatives, typeFilter, clientFilter, search, clientById]);

  /* ---------- viewer controls ---------- */
  const viewing = viewIndex !== null ? filtered[viewIndex] : undefined;
  const closeViewer = useCallback(() => setViewIndex(null), []);
  const prev = useCallback(
    () => setViewIndex((i) => (i === null || filtered.length === 0 ? i : (i - 1 + filtered.length) % filtered.length)),
    [filtered.length],
  );
  const next = useCallback(
    () => setViewIndex((i) => (i === null || filtered.length === 0 ? i : (i + 1) % filtered.length)),
    [filtered.length],
  );

  // close the viewer if its item disappears (filter change or delete)
  useEffect(() => {
    if (viewIndex !== null && !filtered[viewIndex]) setViewIndex(null);
  }, [filtered, viewIndex]);

  useLockBodyScroll(!!viewing || showAddCreative || !!deleteTarget);

  /* ---------- delete ---------- */
  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    try {
      setDeleting(true);
      setError("");
      await deleteCreative(deleteTarget.id);
      setCreatives((prevList) => prevList.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e) {
      console.log(e);
      setError("Failed to delete work. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center justify-between gap-3 text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
          <span>{error}</span>
          <button onClick={() => setError("")} className="text-red-300/70 hover:text-red-200 text-base leading-none">
            ×
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-white">Works</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {creatives.length} total · {counts.poster} posters · {counts.reel} reels · {counts.website} websites
          </p>
        </div>
        <button
          onClick={() => setShowAddCreative(true)}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
        >
          <span className="text-base leading-none">+</span> Upload Creative
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
          {FILTERS.map((f) => (
            <button
              key={f.val}
              onClick={() => setTypeFilter(f.val)}
              className={`text-xs px-3 py-1.5 rounded-lg transition-all ${
                typeFilter === f.val ? "bg-violet-600 text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              {f.label}
              <span className={`ml-1.5 ${typeFilter === f.val ? "text-violet-200" : "text-zinc-600"}`}>
                {counts[f.val] ?? 0}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title or client…"
            className={`${inputCls} w-56`}
          />
          <select className={inputCls} value={clientFilter} onChange={(e) => setClientFilter(e.target.value)}>
            <option value="all" className="bg-[#0f1117]">All clients</option>
            {clients.map((cl) => (
              <option key={cl.id} value={cl.id} className="bg-[#0f1117]">
                {cl.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-pulse">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-72 rounded-2xl bg-white/5" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((c, i) => {
            const owner = clientById.get(c.clientId);
            const meta = TYPE_META[c.type] ?? TYPE_META.poster;

            return (
              <div
                key={c.id}
                className="bg-[#0f1117] border border-white/5 rounded-2xl overflow-hidden group hover:border-white/15 transition-colors flex flex-col"
              >
                {/* Preview — click anywhere to view */}
                <div
                  className="h-48 bg-white/5 relative overflow-hidden cursor-pointer"
                  role="button"
                  tabIndex={0}
                  aria-label={`View ${c.title}`}
                  onClick={() => setViewIndex(i)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setViewIndex(i);
                    }
                  }}
                >
                  {c.type === "poster" &&
                    (c.imageUrl ? (
                      <img
                        src={c.imageUrl}
                        alt={c.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-zinc-600">No image</div>
                    ))}

                  {c.type === "reel" && <ReelPreview creative={c} />}

                  {c.type === "website" && (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-sky-900/30 to-cyan-900/30">
                      <div className="text-center px-4">
                        <div className="text-3xl mb-2">🌐</div>
                        <p className="text-xs text-zinc-400 truncate max-w-[200px]">
                          {c.websiteUrl?.replace(/^https?:\/\//, "") ?? "Website"}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* click layer + hover hint */}
                  <div className="absolute inset-0 z-[5] flex items-end justify-center pb-3 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <span className="text-xs font-medium text-white bg-white/15 backdrop-blur px-3 py-1.5 rounded-full">
                      View work
                    </span>
                  </div>

                  <span
                    className={`absolute top-2.5 left-2.5 z-10 text-[10px] font-semibold px-2 py-0.5 rounded-full border backdrop-blur ${meta.badge}`}
                  >
                    {meta.label}
                  </span>
                </div>

                {/* Details */}
                <div className="p-4 flex flex-col flex-1">
                  <p className="text-sm text-white font-medium truncate" title={c.title}>
                    {c.title}
                  </p>

                  <div className="flex items-center gap-2 mt-1.5">
                    {owner?.profileImage && (
                      <img src={owner.profileImage} alt="" className="w-4 h-4 rounded-full object-cover" />
                    )}
                    <p className="text-xs text-zinc-500 truncate">{owner?.name ?? "No client"}</p>
                  </div>

                  {c.uploadedAt && <p className="text-[11px] text-zinc-700 mt-1">{c.uploadedAt}</p>}

                  <div className="mt-auto pt-3 flex items-center gap-2">
                    <button
                      onClick={() => setViewIndex(i)}
                      className="flex-1 py-2 rounded-xl text-xs bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 transition-colors"
                    >
                      View
                    </button>
                    <button
                      onClick={() => setDeleteTarget(c)}
                      className="px-3 py-2 rounded-xl text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                      aria-label={`Delete ${c.title}`}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-zinc-600">
              <div className="text-4xl mb-3">◧</div>
              <p className="text-sm">
                {creatives.length === 0 ? "No works yet. Upload your first creative." : "No works match these filters."}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {viewing && (
        <WorkViewer
          creative={viewing}
          owner={clientById.get(viewing.clientId)}
          index={viewIndex ?? 0}
          total={filtered.length}
          onClose={closeViewer}
          onPrev={prev}
          onNext={next}
          onDelete={() => {
            setDeleteTarget(viewing);
            setViewIndex(null);
          }}
        />
      )}

      {showAddCreative && (
        <AddCreativeModal
          onClose={() => setShowAddCreative(false)}
          onSave={(newCreative) => {
            setCreatives((p) => [newCreative, ...p]);
            setShowAddCreative(false);
          }}
          clients={clients}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal loading={deleting} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} />
      )}
    </div>
  );
};

export default WorkManagement;