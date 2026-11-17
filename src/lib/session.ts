import crypto from "crypto";

export const SESSION_COOKIE = "hs_session";
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export type TeacherRole = "SUPER_ADMIN" | "ADMIN" | "TEACHER";

export type SessionPayload =
  | { kind: "teacher"; id: string; name: string; role: TeacherRole }
  | { kind: "student"; id: string; name: string; classId: string };

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("Thiếu SESSION_SECRET (tối thiểu 32 ký tự) trong biến môi trường");
  }
  return "dev-only-session-secret-not-for-production";
}

function sign(data: string): string {
  return crypto.createHmac("sha256", getSecret()).update(data).digest("base64url");
}

export function createSessionToken(payload: SessionPayload): string {
  const exp = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const data = Buffer.from(JSON.stringify({ ...payload, exp })).toString("base64url");
  return `${data}.${sign(data)}`;
}

export function readSessionToken(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const [data, signature] = token.split(".");
  if (!data || !signature) return null;
  const expected = Buffer.from(sign(data));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
    if (typeof parsed.exp !== "number" || Date.now() > parsed.exp) return null;
    delete parsed.exp;
    return parsed as SessionPayload;
  } catch {
    return null;
  }
}

/** Ký HMAC cho dữ liệu bất kỳ (dùng cho đường dẫn xem ảnh cục bộ) */
export function hmac(data: string): string {
  return sign(data);
}
