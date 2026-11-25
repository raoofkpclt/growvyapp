import { useEffect, useState } from "react";

const MAX_MB = 5;

export const FilePick = ({
  label, existingUrl, file, onChange, onError,
}: {
  label: string;
  existingUrl?: string;
  file: File | null;
  onChange: (f: File | null) => void;
  onError: (m: string) => void;
}) => {
  const [preview, setPreview] = useState("");

  useEffect(() => {
    if (!file) return setPreview("");
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const shown = preview || existingUrl || "";
  const isPdf = file?.type === "application/pdf" || (!file && existingUrl?.toLowerCase().endsWith(".pdf"));

  return (
    <div className="space-y-2">
      <p className="text-xs text-zinc-400">{label}</p>
      <div className="flex items-center gap-3">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/5 flex items-center justify-center text-[10px] text-zinc-500">
          {shown && !isPdf ? (
            <img src={shown} alt={label} className="h-full w-full object-cover" />
          ) : isPdf ? "PDF" : "None"}
        </div>
        <input
          type="file"
          accept="image/*,application/pdf"
          className="text-xs text-zinc-300 file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-xs file:text-white"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            if (f && !(f.type.startsWith("image/") || f.type === "application/pdf"))
              return onError("Only images or PDF files are allowed.");
            if (f && f.size > MAX_MB * 1024 * 1024)
              return onError(`File must be under ${MAX_MB} MB.`);
            onChange(f);
          }}
        />
      </div>
    </div>
  );
};