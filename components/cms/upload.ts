"use client";

import { apiFetch } from "@/lib/client-api";
import type { CmsMedia } from "./hooks";

const MAX_SIDE = 1920;
const TARGET_BYTES = 3_500_000; // The API accepts 4 MB; multipart overhead needs some room.
const QUALITIES = [0.82, 0.72, 0.6, 0.5];

const encode = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

/**
 * Shrinks a photo in the browser before upload: longest side 1920px, WebP
 * (JPEG where the browser cannot write WebP). Animated GIFs stay untouched,
 * and the original is kept whenever it is already the smaller file.
 */
export async function compressImage(file: File): Promise<File> {
  if (file.type === "image/gif") return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file; // Not decodable here: let the server validate it.
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  const probe = await encode(canvas, "image/webp", QUALITIES[0]!);
  const type = probe?.type === "image/webp" ? "image/webp" : "image/jpeg";
  if (type === "image/jpeg") {
    // JPEG has no transparency: without this, transparent areas turn black.
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  let blob: Blob | null = null;
  for (const quality of QUALITIES) {
    blob = await encode(canvas, type, quality);
    if (blob && blob.size <= TARGET_BYTES) break;
  }
  if (!blob || (scale === 1 && blob.size >= file.size)) return file;
  const name = `${file.name.replace(/\.[^.]+$/, "")}.${type === "image/webp" ? "webp" : "jpg"}`;
  return new File([blob], name, { type });
}

/** Compresses and uploads an image; alt text can be completed later in the story or the library. */
export async function uploadImage(file: File, meta: { alt_bn?: string; alt_en?: string } = {}): Promise<CmsMedia> {
  const form = new FormData();
  form.set("file", await compressImage(file));
  for (const [key, value] of Object.entries(meta)) if (value) form.set(key, value);
  const res = await apiFetch<{ data: CmsMedia }>("/admin/media", { method: "POST", form });
  return res.data;
}
