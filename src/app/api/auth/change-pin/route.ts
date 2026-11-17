import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { handle, parseBody, fail, ok } from "@/lib/http";
import { changePinSchema } from "@/lib/validations";
import { hashPin, isWeakPin, verifyPin } from "@/lib/pin";

export const POST = handle(async (req: Request) => {
  const s = getSession();
  if (!s) return fail(401, "Vui lòng đăng nhập");
  const { currentPin, newPin } = await parseBody(req, changePinSchema);
  if (isWeakPin(newPin)) return fail(400, "PIN quá dễ đoán (ví dụ 111111, 123456). Vui lòng chọn PIN khác.");
  if (currentPin === newPin) return fail(400, "PIN mới phải khác PIN hiện tại");

  const current =
    s.kind === "teacher"
      ? await db.teacher.findUnique({ where: { id: s.id }, select: { pinHash: true, isActive: true } })
      : await db.student.findUnique({ where: { id: s.id }, select: { pinHash: true, isActive: true } });
  if (!current || !current.isActive) return fail(401, "Tài khoản không còn hoạt động");
  if (!(await verifyPin(currentPin, current.pinHash))) return fail(400, "PIN hiện tại không đúng");

  const data = { pinHash: await hashPin(newPin), mustChangePin: false };
  if (s.kind === "teacher") await db.teacher.update({ where: { id: s.id }, data });
  else await db.student.update({ where: { id: s.id }, data });
  return ok({ ok: true });
});
