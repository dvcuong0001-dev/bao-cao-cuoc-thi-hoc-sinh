import { NextResponse } from "next/server";
import { db } from "./db";
import { fail } from "./http";
import { isLocked, nextFailState, verifyPin } from "./pin";
import { setSessionCookie } from "./auth";
import type { SessionPayload } from "./session";

type Account = {
  pinHash: string;
  failedAttempts: number;
  lockedUntil: Date | null;
  mustChangePin: boolean;
};

/**
 * Kiểm tra PIN dùng chung cho học sinh và giáo viên:
 * khoá 15 phút sau 5 lần sai, lưu trong DB nên hoạt động đúng trên Vercel (nhiều instance).
 */
export async function attemptLogin(
  kind: "student" | "teacher",
  id: string,
  account: Account,
  pin: string,
  session: SessionPayload
) {
  const wait = isLocked(account.lockedUntil);
  if (wait) {
    return fail(429, `Tài khoản tạm khoá do nhập sai nhiều lần. Thử lại sau ${wait} phút${kind === "student" ? " hoặc nhờ GVCN mở khoá" : ""}.`);
  }

  const update = (data: { failedAttempts: number; lockedUntil: Date | null }) =>
    kind === "student"
      ? db.student.update({ where: { id }, data })
      : db.teacher.update({ where: { id }, data });

  if (!(await verifyPin(pin.trim(), account.pinHash))) {
    const next = nextFailState(account.failedAttempts);
    await update({ failedAttempts: next.failedAttempts, lockedUntil: next.lockedUntil });
    return fail(
      401,
      next.locked ? "Sai mã PIN quá 5 lần, tài khoản bị khoá 15 phút." : `Mã PIN không đúng. Còn ${next.remaining} lần thử.`
    );
  }

  if (account.failedAttempts || account.lockedUntil) {
    await update({ failedAttempts: 0, lockedUntil: null });
  }
  const res = NextResponse.json({ ok: true, mustChangePin: account.mustChangePin });
  setSessionCookie(res, session);
  return res;
}
