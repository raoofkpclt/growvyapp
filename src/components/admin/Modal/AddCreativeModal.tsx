import { useEffect, useMemo, useState } from "react";
import { Modal, Field } from "./Modal";
import AlertModal, { type AlertState } from "./AlertModal";
import type { Client, Creative } from "../../../utils/types/Types";
import { addCreative } from "../../../service/workService";

interface Props {
  onClose: () => void;
  onSave: (creative: Creative) => void;
  clients: Client[];
}

const labelCls = "text-xs text-zinc-400 font-medium uppercase tracking-wider";

const AddCreativeModal = ({ onClose, onSave, clients }: Props) => {
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [websiteLogo, setWebsiteLogo] = useState<File | null>(null);
  const [reelThumbnail, setReelThumbnail] = useState<File | null>(null);
  const [reelVideo, setReelVideo] = useState<File | null>(null);

  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const [alert, setAlert] = useState<AlertState>(null);
  const [savedCreative, setSavedCreative] = useState<Creative | null>(null);

  const [creativeForm, setCreativeForm] = useState({
    clientId: "",
    type: "poster" as Creative["type"],
    title: "",
    imageUrl: "",
    thumbnailUrl: "",
    instagramUrl: "",
    websiteUrl: "",
  });

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

  const warn = (title: string, message?: string) =>
    setAlert({ type: "warning", title, message });

  const handleAddCreative = async () => {
    // ---------- validation ----------
    if (!creativeForm.clientId) {
      return warn("Select a client", "Choose which client this creative belongs to.");
    }
    if (!creativeForm.title.trim()) {
      return warn("Title required", "Please give this creative a title.");
    }
    if (creativeForm.type === "poster" && !posterFile) {
      return warn("Poster image required", "Please select a poster image to upload.");
    }
    if (creativeForm.type === "reel") {
      if (!reelVideo && !creativeForm.instagramUrl.trim()) {
        return warn(
          "Reel source required",
          "Upload a reel video or add an Instagram URL.",
        );
      }
      if (reelVideo && !reelVideo.type.startsWith("video/")) {
        return warn("Invalid file", "Please select a valid video file.");
      }
    }

    try {
      const creativeData: Creative = {
        id: Date.now().toString(),
        clientId: creativeForm.clientId,
        type: creativeForm.type,
        title: creativeForm.title.trim(),
        imageUrl: "",
        instagramUrl: creativeForm.instagramUrl.trim(),
        thumbnailUrl: "",
        websiteUrl: creativeForm.websiteUrl.trim(),
        uploadedAt: new Date().toISOString().slice(0, 10),
      };

      let result: Creative | undefined;

      if (creativeForm.type === "poster") {
        setUploading(true);
        result = await addCreative(creativeData, posterFile);
      } else if (creativeForm.type === "reel") {
        setUploading(true);
        setUploadProgress(0);
        result = await addCreative(creativeData, reelThumbnail, {
          video: reelVideo,
          onProgress: setUploadProgress,
        });
      } else if (creativeForm.type === "website") {
        setUploading(true);
        result = await addCreative(creativeData, websiteLogo);
      }

      if (result) {
        // hold the creative until the user dismisses the success alert,
        // otherwise the parent would unmount this modal immediately
        setSavedCreative(result);
        setAlert({
          type: "success",
          title: "Creative added",
          message: `"${creativeData.title}" has been uploaded successfully.`,
        });
      }
    } catch (error) {
      console.log(error);
      setAlert({
        type: "error",
        title: "Failed to save creative",
        message: "Something went wrong while uploading. Please try again.",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleAlertClose = () => {
    const wasSuccess = alert?.type === "success";
    setAlert(null);

    if (wasSuccess && savedCreative) {
      onSave(savedCreative);
      onClose();
    }
  };

  return (
    <>
      <Modal title="Upload Creative" onClose={onClose}>
        <div className="space-y-4">
          {/* Client Select */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>Client</label>
            <select
              value={creativeForm.clientId}
              onChange={(e) =>
                setCreativeForm((p) => ({ ...p, clientId: e.target.value }))
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
            <label className={labelCls}>Type</label>
            <div className="flex gap-2">
              {(["poster", "reel", "website"] as const).map((t) => (
                <button
                  type="button"
                  key={t}
                  disabled={uploading}
                  onClick={() => setCreativeForm((p) => ({ ...p, type: t }))}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-all capitalize disabled:opacity-50 ${
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
              setCreativeForm((p) => ({ ...p, title: e.target.value }))
            }
            placeholder="e.g. Summer Campaign Poster"
          />

          {/* Poster */}
          {creativeForm.type === "poster" && (
            <div>
              <label className={labelCls}>Poster Image</label>
              <input
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={(e) => setPosterFile(e.target.files?.[0] || null)}
                className="w-full mt-2"
              />
              {posterFile && (
                <p className="text-xs text-zinc-500 mt-1">
                  Selected: {posterFile.name}
                </p>
              )}
            </div>
          )}

          {/* Reel */}
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

              <div>
                <label className={labelCls}>Reel Video</label>
                <input
                  type="file"
                  accept="video/*"
                  disabled={uploading}
                  onChange={(e) => setReelVideo(e.target.files?.[0] || null)}
                  className="w-full mt-2"
                />

                {reelVideo && (
                  <p className="text-xs text-zinc-500 mt-1">
                    {reelVideo.name} ·{" "}
                    {(reelVideo.size / (1024 * 1024)).toFixed(1)} MB
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
                    <p className="text-xs text-zinc-500 mt-1">
                      {uploadProgress}% uploaded
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className={labelCls}>Reel Thumbnail (optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploading}
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
          )}

          {/* Website */}
          {creativeForm.type === "website" && (
            <div className="space-y-4">
              <Field
                label="Website URL"
                value={creativeForm.websiteUrl}
                onChange={(e) =>
                  setCreativeForm((p) => ({ ...p, websiteUrl: e.target.value }))
                }
                placeholder="https://..."
              />

              <div>
                <label className={labelCls}>Website Logo</label>
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploading}
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
            <button
              onClick={onClose}
              disabled={uploading}
              className="flex-1 py-2.5 rounded-xl text-sm text-zinc-400 border border-white/10 hover:text-white hover:border-white/20 transition-colors disabled:opacity-40"
            >
              Cancel
            </button>

            <button
              onClick={handleAddCreative}
              disabled={uploading}
              className="flex-1 py-2.5 rounded-xl text-sm bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors disabled:opacity-50"
            >
              {uploading
                ? creativeForm.type === "reel" && reelVideo
                  ? `Uploading… ${uploadProgress}%`
                  : "Saving…"
                : "Save Creative"}
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

export default AddCreativeModal;