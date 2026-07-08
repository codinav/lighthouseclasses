"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Link2, Loader2, Upload, X } from "lucide-react";
import { MAX_VIDEO_BYTES, isUploadedVideo, uploadVideoFile } from "@/lib/storage";
import { cn } from "@/lib/utils";

/**
 * Dual-mode video field for the course editor: paste an external link OR
 * upload a file straight from the device (stored in Supabase Storage).
 */
export function VideoInput({
  value,
  onChange,
  label = "Lesson video",
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}) {
  const uploaded = isUploadedVideo(value);
  const [mode, setMode] = useState<"link" | "upload">(uploaded ? "upload" : "link");
  const [progress, setProgress] = useState<number | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError("");
    if (!file.type.startsWith("video/")) {
      setError("Please choose a video file (mp4, webm, mov…).");
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setError("That video is very large (over 2 GB). Paste a hosting link (YouTube/Vimeo/CDN) for files this size.");
      return;
    }
    setFileName(file.name);
    setProgress(0);
    const res = await uploadVideoFile(file, setProgress);
    setProgress(null);
    if (res.ok && res.url) {
      onChange(res.url);
    } else {
      setError(res.error ?? "Upload failed.");
    }
  };

  const clear = () => {
    onChange("");
    setFileName("");
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const uploading = progress !== null;

  return (
    <div className="rounded-xl border border-dashed p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-2xs font-bold uppercase tracking-widest muted">{label}</span>
        <div className="ml-auto inline-flex rounded-full bg-navy-900/[0.06] p-0.5 dark:bg-white/[0.06]">
          <button
            type="button"
            onClick={() => { setMode("link"); setError(""); }}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-2xs font-bold transition-colors",
              mode === "link" ? "bg-[var(--lh-card)] text-[var(--lh-ink)] shadow-soft" : "muted"
            )}
          >
            <Link2 className="h-3 w-3" aria-hidden /> Link
          </button>
          <button
            type="button"
            onClick={() => { setMode("upload"); setError(""); }}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-2xs font-bold transition-colors",
              mode === "upload" ? "bg-[var(--lh-card)] text-[var(--lh-ink)] shadow-soft" : "muted"
            )}
          >
            <Upload className="h-3 w-3" aria-hidden /> Upload
          </button>
        </div>
      </div>

      {/* Link mode */}
      {mode === "link" && (
        <input
          value={uploaded ? "" : value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://… (mp4, or a YouTube/Vimeo link)"
          className="input-lh !py-2"
          aria-label="Video URL"
        />
      )}

      {/* Upload mode */}
      {mode === "upload" && (
        <div>
          {uploading ? (
            <div className="rounded-lg bg-navy-900/[0.03] p-3 dark:bg-white/[0.03]">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <Loader2 className="h-4 w-4 animate-spin text-ocean-600 dark:text-gold-400" aria-hidden />
                Uploading {fileName}… {progress}%
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-navy-900/10 dark:bg-white/10">
                <div className="h-full rounded-full bg-ocean-600 transition-all dark:bg-gold-400" style={{ width: `${progress}%` }} />
              </div>
            </div>
          ) : uploaded ? (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2.5 text-sm">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
              <span className="min-w-0 flex-1 truncate font-semibold text-emerald-700 dark:text-emerald-400">
                {fileName || "Video uploaded"}
              </span>
              <button type="button" onClick={clear} className="btn-ghost h-7 w-7 shrink-0 rounded-full !p-0 text-rose-500" aria-label="Remove uploaded video">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed py-4 text-center transition-colors hover:bg-navy-900/[0.03] dark:hover:bg-white/[0.03]">
              <Upload className="h-5 w-5 muted" aria-hidden />
              <span className="text-xs font-semibold">Choose a video from this device</span>
              <span className="text-2xs muted">mp4, webm or mov · stored on your Hostinger hosting</span>
              <input
                ref={inputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFile(f);
                }}
              />
            </label>
          )}
        </div>
      )}

      {error && <p className="mt-2 text-2xs font-medium text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  );
}
