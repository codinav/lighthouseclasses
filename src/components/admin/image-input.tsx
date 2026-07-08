"use client";

import { useRef, useState } from "react";
import { ImagePlus, Link2, Loader2, Upload, X } from "lucide-react";
import { isUploadedImage, uploadImageFile } from "@/lib/storage";
import { cn } from "@/lib/utils";

/**
 * Dual-mode image field: paste a link OR upload from device. Shows a live
 * preview. Used for the course thumbnail in the admin editor.
 */
export function ImageInput({
  value,
  onChange,
  label = "Cover image",
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}) {
  const uploaded = isUploadedImage(value);
  const [mode, setMode] = useState<"link" | "upload">(uploaded ? "upload" : "link");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError("");
    setProgress(0);
    const res = await uploadImageFile(file, setProgress);
    setProgress(null);
    if (res.ok && res.url) onChange(res.url);
    else setError(res.error ?? "Upload failed.");
  };

  const uploading = progress !== null;

  return (
    <div className="rounded-2xl border border-dashed p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-2xs font-bold uppercase tracking-widest muted">{label}</span>
        <div className="ml-auto inline-flex rounded-full bg-navy-900/[0.06] p-0.5 dark:bg-white/[0.06]">
          {(["link", "upload"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setError(""); }}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-2xs font-bold capitalize transition-colors",
                mode === m ? "bg-[var(--lh-card)] text-[var(--lh-ink)] shadow-soft" : "muted"
              )}
            >
              {m === "link" ? <Link2 className="h-3 w-3" aria-hidden /> : <Upload className="h-3 w-3" aria-hidden />} {m}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-3">
        {/* Preview */}
        <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-xl border bg-navy-900/[0.04] dark:bg-white/[0.06]">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="Cover preview" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center">
              <ImagePlus className="h-6 w-6 muted" aria-hidden />
            </span>
          )}
          {value && (
            <button
              type="button"
              onClick={() => { onChange(""); if (inputRef.current) inputRef.current.value = ""; }}
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-navy-950/70 text-white"
              aria-label="Remove image"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="min-w-0 flex-1">
          {mode === "link" ? (
            <input
              type="url"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="https://…/cover.jpg"
              className="input-lh"
            />
          ) : (
            <>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="btn-ghost btn-sm w-full"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Upload className="h-4 w-4" aria-hidden />}
                {uploading ? `Uploading… ${progress}%` : "Choose image from device"}
              </button>
              <p className="mt-1.5 text-2xs muted">JPG, PNG, or WebP · up to 8 MB · uploaded to your own site.</p>
            </>
          )}
          {error && <p className="mt-1.5 text-2xs font-medium text-rose-500">{error}</p>}
        </div>
      </div>
    </div>
  );
}
