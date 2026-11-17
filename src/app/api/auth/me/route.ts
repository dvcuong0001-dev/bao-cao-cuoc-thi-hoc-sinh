import { NextResponse } from "next/server";
import { clearSessionCookie, getSession, requireStudent, requireTeacher } from "@/lib/auth";
import { HttpError, handle, ok } from "@/lib/http";

export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  const s = getSession();
  if (!s) return ok({ user: null });
  try {
    const user = s.kind === "teacher" ? await requireTeacher() : await requireStudent();
    return ok({ user });
  } catch (err) {
    if (err instanceof HttpError && err.status === 401) {
      // Tài khoản bị khoá/xoá: xoá luôn cookie cũ
      const res = NextResponse.json({ user: null });
      clearSessionCookie(res);
      return res;
    }
    throw err;
  }
});
