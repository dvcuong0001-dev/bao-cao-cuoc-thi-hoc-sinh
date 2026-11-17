"use client";

/** Gọi API JSON, ném Error với thông báo tiếng Việt từ server khi lỗi */
export async function api<T = unknown>(
  url: string,
  opts: { method?: string; json?: unknown; body?: BodyInit } = {}
): Promise<T> {
  const init: RequestInit = { method: opts.method || (opts.json || opts.body ? "POST" : "GET"), cache: "no-store" };
  if (opts.json !== undefined) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(opts.json);
  } else if (opts.body) {
    init.body = opts.body;
  }
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new Error("Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Lỗi ${res.status}`);
  return data as T;
}

export function storageGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function storageSet(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* bỏ qua: trình duyệt chặn lưu trữ */
  }
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
