"use client";

import imageCompression from "browser-image-compression";

/**
 * Nén ảnh ngay trên điện thoại trước khi gửi:
 * - Ảnh chính: cạnh dài tối đa 1280px, ~200KB, JPEG
 * - Ảnh thu nhỏ: 320px, ~20KB, để GVCN xem lưới ảnh nhanh
 */
export async function compressForUpload(file: File): Promise<{ image: File; thumb: File }> {
  if (!file.type.startsWith("image/")) throw new Error("Vui lòng chọn file ảnh");
  const [image, thumb] = await Promise.all([
    imageCompression(file, {
      maxWidthOrHeight: 1280,
      maxSizeMB: 0.25,
      initialQuality: 0.75,
      fileType: "image/jpeg",
      useWebWorker: true,
    }),
    imageCompression(file, {
      maxWidthOrHeight: 320,
      maxSizeMB: 0.03,
      initialQuality: 0.7,
      fileType: "image/jpeg",
      useWebWorker: true,
    }),
  ]);
  return {
    image: new File([image], "image.jpg", { type: "image/jpeg" }),
    thumb: new File([thumb], "thumb.jpg", { type: "image/jpeg" }),
  };
}

/** Gửi kèm tự thử lại khi rớt mạng (tối đa 3 lần) */
export async function uploadWithRetry(form: FormData, attempts = 3): Promise<Response> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fetch("/api/submissions", { method: "POST", body: form });
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Không gửi được ảnh");
}
