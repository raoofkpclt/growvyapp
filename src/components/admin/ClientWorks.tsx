import React, { useCallback, useEffect, useMemo, useState } from "react";
import { getCreatives, deleteCreative } from "../../service/workService";
import type { Creative, Client } from "../../utils/types/Types";
import AddCreativeModal from "./Modal/AddCreativeModal";
import DeleteConfirmModal from "./Modal/DeleteConfirmModal";
import ReelPreview from "../admin/Modal/ReelPreview";
import { TYPE_META, WorkViewer, useLockBodyScroll } from "./WorkManagement";

const FILTERS = [
  { val: "all", label: "All" },
  { val: "poster", label: "Posters" },
  { val: "reel", label: "Reels" },
  { val: "website", label: "Websites" },
];

/** Works of one client. Used as a tab in the Client details page. */
const ClientWorks: React.FC<{ client: Client; clientId: string }> = ({ client, clientId }) => {
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [typeFilter, setTypeFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [viewIndex, setViewIndex] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Creative | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* ---------- fetch, then keep only this client's works ---------- */
  useEffect(() => {
    let alive = true;
    setLoading(true);
    getCreatives()
      .then((all) => {
        if (!alive) return;
        // works may store either the client's own id or the Firestore doc id
        const mine = all.filter((c) => c.clientId === client.id || c.clientId === clientId);
        setCreatives(mine);
      })
      .catch((e) => {
        console.log("Error fetching works:", e);
        if (alive) setError("Could not load works.");
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [client.id, clientId]);

  /* ---------- derived ---------- */
  const counts = useMemo(() => {
    const m: Record<string, number> = { all: creatives.length, poster: 0, reel: 0, website: 0 };
    creatives.forEach((c) => {
      m[c.type] = (m[c.type] ?? 0) + 1;
    });
    return m;
  }, [creatives]);

  const filtered = useMemo(
    () => creatives.filter((c) => typeFilter === "all" || c.type === typeFilter),
    [creatives, typeFilter]
  );

  /* ---------- viewer controls ---------- */
  const viewing = viewIndex !== null ? filtered[viewIndex] : undefined;
  const closeViewer = useCallback(() => setViewIndex(null), []);
  const prev = useCallback(
    () => setViewIndex((i) => (i === null || !filtered.length ? i : (i - 1 + filtered.length) % filtered.length)),
    [filtered.length]
  );
  const next = useCallback(
    () => setViewIndex((i) => (i === null || !filtered.length ? i : (i + 1) % filtered.length)),
    [filtered.length]
  );

  useEffect(() => {
    if (viewIndex !== null && !filtered[viewIndex]) setViewIndex(null);
  }, [filtered, viewIndex]);

  useLockBodyScroll(!!viewing || showAdd || !!deleteTarget);

  /* ---------- delete ---------- */
  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    try {
      setDeleting(true);
      setError("");
      await deleteCreative(deleteTarget.id);
      setCreatives((list) => list.filter((x) => x.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e) {
      console.log(e);
      setError("Failed to delete work. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-w-0 space-y-4 sm:space-y-5">
      {error && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-xl border border-red-500/20 bg-red-500/10 py-2 pl-4 pr-2 text-xs text-red-300"
        >
          <span className="break-words py-1.5">{error}</span>
          <button
            onClick={() => setError("")}
            aria-label="Dismiss"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base leading-none text-red-300/70 hover:bg-white/5 hover:text-red-200"
          >
            ×
          </button>
        </div>
      )}

      {/* header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-white">Works</h3>
          <p className="mt-0.5 text-xs text-zinc-500">
            {counts.all} total · {counts.poster} posters · {counts.reel} reels · {counts.website} websites
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-medium text-white transition-colors hover:bg-violet-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 sm:w-auto"
        >
          <span className="text-base leading-none">+</span> Upload Creative
        </button>
      </div>

      {/* filters: scroll sideways instead of overflowing on narrow screens */}
      <div
        role="tablist"
        aria-label="Work type"
        className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-xl border border-white/10 bg-white/5 p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {FILTERS.map((f) => (
          <button
            key={f.val}
            role="tab"
            aria-selected={typeFilter === f.val}
            onClick={() => setTypeFilter(f.val)}
            className={`min-h-10 shrink-0 whitespace-nowrap rounded-lg px-3.5 text-xs transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 ${
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

      {/* grid */}
      {loading ? (
        <div className="grid animate-pulse grid-cols-1 gap-3 motion-reduce:animate-none sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 rounded-2xl bg-white/5 sm:h-72" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
          {filtered.map((c, i) => {
            const meta = TYPE_META[c.type] ?? TYPE_META.poster;
            return (
              <div
                key={c.id}
                className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-white/5 bg-[#0f1117] transition-colors hover:border-white/15"
              >
                {/* a little taller on phones where the card is full width */}
                <div
                  className="relative h-52 cursor-pointer overflow-hidden bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-400/70 sm:h-48"
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
                        className="h-full w-full object-cover transition-transform duration-500 motion-reduce:transition-none [@media(hover:hover)]:group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-zinc-600">
                        No image
                      </div>
                    ))}

                  {c.type === "reel" && <ReelPreview creative={c} />}

                  {c.type === "website" && (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-900/30 to-cyan-900/30">
                      <div className="min-w-0 px-4 text-center">
                        <div className="mb-2 text-3xl">🌐</div>
                        <p className="max-w-[200px] truncate text-xs text-zinc-400">
                          {c.websiteUrl?.replace(/^https?:\/\//, "") ?? "Website"}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* hover hint, only on devices that can hover */}
                  <div className="pointer-events-none absolute inset-0 z-[5] hidden items-end justify-center bg-gradient-to-t from-black/60 via-transparent to-transparent pb-3 opacity-0 transition-opacity group-hover:opacity-100 [@media(hover:hover)]:flex">
                    <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">
                      View work
                    </span>
                  </div>

                  <span
                    className={`absolute left-2.5 top-2.5 z-10 rounded-full border px-2 py-0.5 text-[10px] font-semibold backdrop-blur ${meta.badge}`}
                  >
                    {meta.label}
                  </span>
                </div>

                <div className="flex flex-1 flex-col p-3.5 sm:p-4">
                  <p className="truncate text-sm font-medium text-white" title={c.title}>
                    {c.title}
                  </p>
                  {c.uploadedAt && <p className="mt-1 text-[11px] text-zinc-600">{c.uploadedAt}</p>}

                  <div className="mt-auto flex items-center gap-2 pt-3">
                    <button
                      onClick={() => setViewIndex(i)}
                      className="min-h-10 flex-1 rounded-xl bg-violet-500/10 text-xs text-violet-300 transition-colors hover:bg-violet-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60"
                    >
                      View
                    </button>
                    <button
                      onClick={() => setDeleteTarget(c)}
                      className="min-h-10 rounded-xl bg-red-500/10 px-4 text-xs text-red-400 transition-colors hover:bg-red-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"
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
            <div className="col-span-full flex flex-col items-center justify-center px-4 py-12 text-center text-zinc-600 sm:py-16">
              <div className="mb-3 text-4xl">◧</div>
              <p className="break-words text-sm">
                {creatives.length === 0
                  ? `No works for ${client.name} yet. Upload the first creative.`
                  : "No works in this type."}
              </p>
            </div>
          )}
        </div>
      )}

      {/* modals */}
      {viewing && (
        <WorkViewer
          creative={viewing}
          owner={client}
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

      {showAdd && (
        <AddCreativeModal
          onClose={() => setShowAdd(false)}
          onSave={(created) => {
            // only keep it if it was saved for this client
            if (created.clientId === client.id || created.clientId === clientId) {
              setCreatives((p) => [created, ...p]);
            }
            setShowAdd(false);
          }}
          clients={[client]}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal loading={deleting} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} />
      )}
    </div>
  );
};

export default ClientWorks;