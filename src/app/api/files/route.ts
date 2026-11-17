import crypto from "crypto";
import { hmac } from "@/lib/session";
import { readLocalObject, storageDriver } from "@/lib/storage";

export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

/** Chỉ dùng khi chạy thử trên máy (chưa có R2): phục vụ ảnh từ thư mục .local-uploads/ */
export async function GET(req: Request) {
  if (storageDriver() !== "local") return new Response("Not found", { status: 404 });
  const url = new URL(req.url);
  const key = url.searchParams.get("key") || "";
  const exp = Number(url.searchParams.get("exp") || 0);
  const sig = url.searchParams.get("sig") || "";
  const expected = Buffer.from(hmac(`${key}|${exp}`));
  const actual = Buffer.from(sig);
  if (!key || Date.now() > exp || expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
    return new Response("Liên kết đã hết hạn", { status: 403 });
  }
  try {
    const body = await readLocalObject(key);
    const ext = key.split(".").pop() || "";
    return new Response(new Uint8Array(body), {
      headers: { "Content-Type": TYPES[ext] || "application/octet-stream", "Cache-Control": "private, max-age=600" },
    });
  } catch {
    return new Response("Không tìm thấy ảnh", { status: 404 });
  }
}
