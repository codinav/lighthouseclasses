"use client";

/**
 * Video uploads to Hostinger.
 *
 * Admins can upload a lesson video straight from their device; it is POSTed
 * to a small PHP script on the Hostinger hosting (public_html/api/upload.php),
 * which stores the file in public_html/videos and returns a public URL on the
 * site's own domain (https://<site>/videos/<file>.mp4). We use a raw XHR so we
 * get real upload-progress events.
 *
 * The PHP script + raised PHP upload limits are bundled into the Hostinger zip
 * by scripts/build-hostinger.sh — see hostinger-extras/api/upload.php.
 */

import { HOSTINGER_UPLOAD_TOKEN, HOSTINGER_UPLOAD_URL, hostingerUploadConfigured } from "./config";

/** Client-side cap. The server (and your hosting plan) may allow less. */
export const MAX_VIDEO_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB

export interface UploadResult {
  ok: boolean;
  url?: string;
  error?: string;
}

/** Client-side cap for images. */
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB

/** True for a URL that points at an uploaded video on the site's /videos folder. */
export function isUploadedVideo(url: string): boolean {
  return /\/videos\/[^/]+\.(mp4|webm|mov|mkv|ogv|mpg|mpeg)(\?|$)/i.test(url);
}

/** True for a URL that points at an uploaded image on the site's /videos folder. */
export function isUploadedImage(url: string): boolean {
  return /\/videos\/[^/]+\.(jpg|jpeg|png|webp|gif|avif)(\?|$)/i.test(url);
}

/**
 * Upload any file (image or video) to Hostinger, reporting 0–100 progress.
 * The server validates the type; we just POST the bytes.
 */
export function uploadFile(file: File, onProgress: (pct: number) => void): Promise<UploadResult> {
  return new Promise((resolve) => {
    if (!hostingerUploadConfigured()) {
      resolve({ ok: false, error: "Uploads aren't configured. Paste a link instead." });
      return;
    }
    const form = new FormData();
    form.append("file", file, file.name);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", HOSTINGER_UPLOAD_URL);
    xhr.setRequestHeader("X-Upload-Token", HOSTINGER_UPLOAD_TOKEN);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let payload: { url?: string; error?: string } = {};
      try {
        payload = JSON.parse(xhr.responseText || "{}");
      } catch {}
      if (xhr.status >= 200 && xhr.status < 300 && payload.url) {
        onProgress(100);
        resolve({ ok: true, url: payload.url });
        return;
      }
      let message = payload.error || `Upload failed (${xhr.status}).`;
      if (xhr.status === 0) message = "Couldn't reach the upload server. Deploy the latest site (with /api/upload.php) to Hostinger.";
      else if (xhr.status === 404) message = "Upload script not found on the server. Deploy the latest Hostinger zip, then try again.";
      else if (xhr.status === 401) message = "Upload was rejected (token mismatch). Rebuild and redeploy.";
      resolve({ ok: false, error: message });
    };
    xhr.onerror = () => resolve({ ok: false, error: "Network error during upload. Check your connection and that the site is deployed." });
    xhr.send(form);
  });
}

/** Upload an image file (course thumbnail). */
export function uploadImageFile(file: File, onProgress: (pct: number) => void): Promise<UploadResult> {
  if (!file.type.startsWith("image/")) {
    return Promise.resolve({ ok: false, error: "Please choose an image (JPG, PNG, or WebP)." });
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return Promise.resolve({ ok: false, error: "That image is over 8 MB. Please pick a smaller one." });
  }
  return uploadFile(file, onProgress);
}

/**
 * Upload a video File to Hostinger, reporting 0–100 progress.
 * Resolves with the public URL on your domain on success.
 */
export function uploadVideoFile(file: File, onProgress: (pct: number) => void): Promise<UploadResult> {
  return new Promise((resolve) => {
    if (!hostingerUploadConfigured()) {
      resolve({ ok: false, error: "Video upload isn't configured. Paste a video link instead." });
      return;
    }

    const form = new FormData();
    form.append("file", file, file.name);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", HOSTINGER_UPLOAD_URL);
    xhr.setRequestHeader("X-Upload-Token", HOSTINGER_UPLOAD_TOKEN);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let payload: { url?: string; error?: string } = {};
      try {
        payload = JSON.parse(xhr.responseText || "{}");
      } catch {
        /* non-JSON response handled below */
      }
      if (xhr.status >= 200 && xhr.status < 300 && payload.url) {
        onProgress(100);
        resolve({ ok: true, url: payload.url });
        return;
      }
      let message = payload.error || `Upload failed (${xhr.status}).`;
      if (xhr.status === 0) {
        message = "Couldn't reach the upload server. Make sure the latest site (with /api/upload.php) is deployed to Hostinger.";
      } else if (xhr.status === 404) {
        message = "Upload script not found on the server. Deploy the latest Hostinger zip (it includes /api/upload.php), then try again.";
      } else if (xhr.status === 413) {
        message = payload.error || "That video is larger than the server's upload limit. Raise the PHP upload limit in hPanel, or paste a hosting link for very large files.";
      } else if (xhr.status === 401) {
        message = "Upload was rejected (token mismatch). Rebuild and redeploy so the site and upload.php share the same token.";
      }
      resolve({ ok: false, error: message });
    };
    xhr.onerror = () =>
      resolve({ ok: false, error: "Network error during upload. Check your connection, and that the site is deployed to Hostinger, then try again." });
    xhr.send(form);
  });
}
