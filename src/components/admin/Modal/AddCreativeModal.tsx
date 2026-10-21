import { useEffect, useMemo, useState } from "react";
import { Modal, Field } from "./Modal";
import type { Client, Creative } from "../../../utils/types/Types";
import { addCreative } from "../../../service/workService";

interface Props {
  onClose: () => void;
  onSave: (creative: Creative) => void;
  clients: Client[];
}

const AddCreativeModal = ({ onClose, onSave, clients }: Props) => {
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [websiteLogo, setWebsiteLogo] = useState<File | null>(null);
  const [reelThumbnail, setReelThumbnail] = useState<File | null>(null);

  const [creativeForm, setCreativeForm] = useState({
    clientId: "",
    type: "poster" as Creative["type"],
    title: "",
    imageUrl: "",
    thumbnailUrl: "",
    instagramUrl: "",
    websiteUrl: "",
  });
  const [reelVideo, setReelVideo] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  // local preview of the selected video
  const videoPreview = useMemo(
    () => (reelVideo ? URL.createObjectURL(reelVideo) : ""),
    [reelVideo],
  );
  useEffect(() => {
    return () => {
      if (videoPreview) URL.revokeObjectURL(videoPreview);
    };
  }, [videoPreview]);

  const handleAddCreative = async () => {
    try {
      if (!creativeForm.title || !creativeForm.clientId) {
        alert("Please fill required fields");
        return;
      }

      // =========================
      // CREATE CREATIVE OBJECT
      // =========================
      const creativeData: Creative = {
        id: Date.now().toString(),

        clientId: creativeForm.clientId,

        type: creativeForm.type,

        title: creativeForm.title,

        imageUrl: "",

        instagramUrl: creativeForm.instagramUrl,
        thumbnailUrl: "",
        websiteUrl: creativeForm.websiteUrl,

        uploadedAt: new Date().toISOString().slice(0, 10),
      };

      let savedCreative;

      // =========================
      // POSTER
      // =========================
      if (creativeForm.type === "poster") {
        if (!posterFile) {
          alert("Select poster image");
          return;
        }

        savedCreative = await addCreative(creativeData, posterFile);
      }

      // =========================
      // REEL
      // =========================
      // else if (creativeForm.type === "reel") {
      //   if (!reelThumbnail) {
      //     alert("Select reel thumbnail");
      //     return;
      //   }

      //   savedCreative = await addCreative(creativeData, reelThumbnail);
      //   setReelThumbnail(null);
      // }
      else if (creativeForm.type === "reel") {
        if (!reelVideo && !creativeForm.instagramUrl) {
          alert("Upload a reel video or add an Instagram URL");
          return;
        }

        if (reelVideo && !reelVideo.type.startsWith("video/")) {
          alert("Please select a valid video file");
          return;
        }

        setUploading(true);
        setUploadProgress(0);

        savedCreative = await addCreative(creativeData, reelThumbnail, {
          video: reelVideo,
          onProgress: setUploadProgress,
        });
      }

      // =========================
      // WEBSITE
      // =========================
      else if (creativeForm.type === "website") {
        savedCreative = await addCreative(creativeData, websiteLogo);
      }

      // =========================
      // UPDATE UI
      // =========================
      if (savedCreative) {
        onSave(savedCreative);
      }

      // =========================
      // RESET
      // =========================
      setCreativeForm({
        clientId: "",
        type: "poster",
        title: "",
        imageUrl: "",
        thumbnailUrl: "",
        instagramUrl: "",
        websiteUrl: "",
      });

      setPosterFile(null);
      setWebsiteLogo(null);
      setReelThumbnail(null);
      setReelVideo(null);
      setUploadProgress(0);

      alert("Creative Added");

      onClose();
    } catch (error) {
      console.log(error);

      alert("Failed to save creative");
    }
  };

  return (
    <Modal title="Upload Creative" onClose={onClose}>
      <div className="space-y-4">
        {/* Client Select */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-zinc-400 font-medium uppercase tracking-wider">
            Client
          </label>

          <select
            value={creativeForm.clientId}
            onChange={(e) =>
              setCreativeForm((p) => ({
                ...p,
                clientId: e.target.value,
              }))
            }
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/60 transition-colors"
          >
            <option value="" className="bg-[#0f1117]">
              Select client…
            </option>

            {clients.map((c) => (
              <option key={c.id} value={c.id} className="bg-[#0f1117]">
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Type Selection */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-zinc-400 font-medium uppercase tracking-wider">
            Type
          </label>

          <div className="flex gap-2">
            {(["poster", "reel", "website"] as const).map((t) => (
              <button
                type="button"
                key={t}
                onClick={() =>
                  setCreativeForm((p) => ({
                    ...p,
                    type: t,
                  }))
                }
                className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-all capitalize ${
                  creativeForm.type === t
                    ? "bg-violet-500/15 border-violet-500/30 text-violet-300"
                    : "border-white/10 text-zinc-400 hover:text-white"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <Field
          label="Title"
          value={creativeForm.title}
          onChange={(e) =>
            setCreativeForm((p) => ({
              ...p,
              title: e.target.value,
            }))
          }
          placeholder="e.g. Summer Campaign Poster"
        />

        {/* Poster Upload */}
        {creativeForm.type === "poster" && (
          <div>
            <label className="text-xs text-zinc-400 font-medium uppercase tracking-wider">
              Poster Image
            </label>

            <input
              type="file"
              onChange={(e) => setPosterFile(e.target.files?.[0] || null)}
              className="w-full mt-2"
            />
          </div>
        )}

        {/* Reel URL */}
        {/* {creativeForm.type === "reel" && (
          <Field
            label="Instagram Reel URL"
            value={creativeForm.instagramUrl}
            onChange={(e) =>
              setCreativeForm((p) => ({
                ...p,
                instagramUrl: e.target.value,
              }))
            }
            placeholder="https://www.instagram.com/reel/..."
          />
        )}

        {creativeForm.type === "reel" && (
          <div className="space-y-4">
            <Field
              label="Instagram Reel URL"
              value={creativeForm.instagramUrl}
              onChange={(e) =>
                setCreativeForm((p) => ({
                  ...p,
                  instagramUrl: e.target.value,
                }))
              }
              placeholder="https://www.instagram.com/reel/..."
            />

            <div>
              <label className="text-xs text-zinc-400 font-medium uppercase tracking-wider">
                Reel Thumbnail
              </label>

              <input
                type="file"
                accept="image/*"
                onChange={(e) => setReelThumbnail(e.target.files?.[0] || null)}
                className="w-full mt-2"
              />

              {reelThumbnail && (
                <p className="text-xs text-zinc-500 mt-1">
                  Selected: {reelThumbnail.name}
                </p>
              )}
            </div>
          </div>
        )} */}

        {creativeForm.type === "reel" && (
  <div className="space-y-4">
    <Field
      label="Instagram Reel URL"
      value={creativeForm.instagramUrl}
      onChange={(e) =>
        setCreativeForm((p) => ({ ...p, instagramUrl: e.target.value }))
      }
      placeholder="https://www.instagram.com/reel/..."
    />

    {/* Video upload */}
    <div>
      <label className="text-xs text-zinc-400 font-medium uppercase tracking-wider">
        Reel Video
      </label>
      <input
        type="file"
        accept="video/*"
        disabled={uploading}
        onChange={(e) => setReelVideo(e.target.files?.[0] || null)}
        className="w-full mt-2"
      />

      {reelVideo && (
        <p className="text-xs text-zinc-500 mt-1">
          {reelVideo.name} · {(reelVideo.size / (1024 * 1024)).toFixed(1)} MB
        </p>
      )}

      {videoPreview && (
        <video
          src={videoPreview}
          controls
          preload="metadata"
          className="mt-3 w-full max-h-64 rounded-xl bg-black"
        />
      )}

      {uploading && (
        <div className="mt-3">
          <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-violet-500 transition-all"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-xs text-zinc-500 mt-1">{uploadProgress}% uploaded</p>
        </div>
      )}
    </div>

    {/* Thumbnail */}
    <div>
      <label className="text-xs text-zinc-400 font-medium uppercase tracking-wider">
        Reel Thumbnail (optional)
      </label>
      <input
        type="file"
        accept="image/*"
        disabled={uploading}
        onChange={(e) => setReelThumbnail(e.target.files?.[0] || null)}
        className="w-full mt-2"
      />
      {reelThumbnail && (
        <p className="text-xs text-zinc-500 mt-1">Selected: {reelThumbnail.name}</p>
      )}
    </div>
  </div>
)}

        {/* Website Section */}
        {creativeForm.type === "website" && (
          <div className="space-y-4">
            <Field
              label="Website URL"
              value={creativeForm.websiteUrl}
              onChange={(e) =>
                setCreativeForm((p) => ({
                  ...p,
                  websiteUrl: e.target.value,
                }))
              }
              placeholder="https://..."
            />

            <div>
              <label className="text-xs text-zinc-400 font-medium uppercase tracking-wider">
                Website Logo
              </label>

              <input
                type="file"
                accept="image/*"
                onChange={(e) => setWebsiteLogo(e.target.files?.[0] || null)}
                className="w-full mt-2"
              />

              {websiteLogo && (
                <p className="text-xs text-zinc-500 mt-1">
                  Selected: {websiteLogo.name}
                </p>
              )}
            </div>
          </div>
        )}
        <p className="text-xs text-zinc-600">
          Images are uploaded to S3; metadata is written to Firestore.
        </p>

        {/* Buttons */}
        <div className="flex gap-3 pt-1">
          {/* <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm text-zinc-400 border border-white/10 hover:text-white hover:border-white/20 transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleAddCreative}
            className="flex-1 py-2.5 rounded-xl text-sm bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors"
          >
            Save Creative
          </button> */}

          <button
            onClick={onClose}
            disabled={uploading}
            className="... disabled:opacity-40"
          >
            Cancel
          </button>

          <button
            onClick={handleAddCreative}
            disabled={uploading}
            className="flex-1 py-2.5 rounded-xl text-sm bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors disabled:opacity-50"
          >
            {uploading ? `Uploading… ${uploadProgress}%` : "Save Creative"}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AddCreativeModal;
