import path from "path";
import { promises as fs } from "fs";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { hmac } from "./session";
import { HttpError } from "./http";

/**
 * Lưu ảnh minh chứng.
 * - Có đủ biến R2_* : lưu lên Cloudflare R2 (bucket private, xem qua đường dẫn ký có thời hạn)
 * - Không có R2 và KHÔNG phải production: lưu vào thư mục .local-uploads/ để chạy thử trên máy
 */
export const VIEW_URL_TTL_SECONDS = 60 * 60;

type Driver = "r2" | "local";

function r2Config() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) return null;
  return { accountId: R2_ACCOUNT_ID, accessKeyId: R2_ACCESS_KEY_ID, secret: R2_SECRET_ACCESS_KEY, bucket: R2_BUCKET };
}

export function storageDriver(): Driver | null {
  if (r2Config()) return "r2";
  if (process.env.NODE_ENV !== "production") return "local";
  return null;
}

function requireDriver(): Driver {
  const d = storageDriver();
  if (!d) throw new HttpError(503, "Hệ thống chưa cấu hình kho lưu ảnh Cloudflare R2. Vui lòng báo quản trị viên.");
  return d;
}

let client: S3Client | null = null;
function r2() {
  const cfg = r2Config()!;
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secret },
    });
  }
  return { client, bucket: cfg.bucket };
}

const LOCAL_ROOT = path.join(process.cwd(), ".local-uploads");
function localPath(key: string) {
  const full = path.join(LOCAL_ROOT, key);
  if (!full.startsWith(LOCAL_ROOT + path.sep)) throw new HttpError(400, "Đường dẫn file không hợp lệ");
  return full;
}

export async function putObject(key: string, body: Uint8Array, contentType: string) {
  if (requireDriver() === "r2") {
    const { client, bucket } = r2();
    await client.send(
      new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType })
    );
    return;
  }
  const file = localPath(key);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, body);
}

/** Xoá nhiều file; bỏ qua file không tồn tại */
export async function deleteObjects(keys: string[]) {
  const list = keys.filter(Boolean);
  if (list.length === 0) return;
  if (requireDriver() === "r2") {
    const { client, bucket } = r2();
    for (let i = 0; i < list.length; i += 1000) {
      const chunk = list.slice(i, i + 1000);
      await client.send(
        new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: chunk.map((Key) => ({ Key })), Quiet: true } })
      );
    }
    return;
  }
  await Promise.all(list.map((k) => fs.rm(localPath(k), { force: true })));
}

/** Đường dẫn xem ảnh có thời hạn */
export async function getViewUrl(key: string): Promise<string> {
  if (requireDriver() === "r2") {
    const { client, bucket } = r2();
    return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), {
      expiresIn: VIEW_URL_TTL_SECONDS,
    });
  }
  const exp = Date.now() + VIEW_URL_TTL_SECONDS * 1000;
  const sig = hmac(`${key}|${exp}`);
  return `/api/files?key=${encodeURIComponent(key)}&exp=${exp}&sig=${sig}`;
}

export async function readLocalObject(key: string): Promise<Buffer> {
  return fs.readFile(localPath(key));
}
